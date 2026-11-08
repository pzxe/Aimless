// Aimless feedback proxy (Cloudflare Worker). The desktop and web apps cannot hold a GitHub token (anyone could
// extract it from the app), so they POST feedback here and this worker, which keeps the token as a secret, creates
// the issue. Deploy steps are in README.md next to this file.
//
// Env: GITHUB_TOKEN (secret, a fine-grained token limited to Issues: write on the one repository),
//      GITHUB_REPO (optional, default "pzxe/Aimless").

export const LIMITS = { titleMin: 3, titleMax: 120, bodyMin: 10, bodyMax: 2000, requestMax: 8192 }
export const TYPES = ['bug', 'feature', 'other']
const LABELS = { bug: 'bug', feature: 'enhancement', other: 'question' }
export const RATE = { perMinute: 3, perHour: 12 }

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
}
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

/** Stops a message from pinging people or linking other issues: "@name" and "#123" become inert text. */
export function neutralize(text) {
  return String(text)
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .replace(/@(?=[A-Za-z0-9_-])/g, '@​')
    .replace(/(^|[^\w&])#(?=\d)/g, '$1#​')
}

/** Checks a payload from the app. Returns null when valid, otherwise a short error code. */
export function validate(p) {
  if (!p || typeof p !== 'object') return 'invalid_payload'
  if (!TYPES.includes(p.type)) return 'invalid_type'
  if (typeof p.title !== 'string' || typeof p.body !== 'string') return 'invalid_payload'
  const title = p.title.trim()
  const body = p.body.trim()
  if (title.length < LIMITS.titleMin) return 'title_short'
  if (title.length > LIMITS.titleMax) return 'title_long'
  if (body.length < LIMITS.bodyMin) return 'body_short'
  if (body.length > LIMITS.bodyMax) return 'body_long'
  if (p.website) return 'spam' // honeypot field: real users never fill it
  return null
}

/** The GitHub issue for a valid payload. */
export function buildIssue(p) {
  const meta = p.meta && typeof p.meta === 'object' ? p.meta : null
  const line = (k, v) => (typeof v === 'string' && v.trim() ? `- ${k}: ${neutralize(v.trim().slice(0, 60)).replace(/[`*_<>[\]]/g, '')}` : null)
  const info = meta ? [line('App version', meta.version), line('System', meta.platform), line('Language', meta.language)].filter(Boolean) : []
  const body = [neutralize(p.body.trim()), '', '---', '_Sent from inside Aimless (in-app feedback)._', ...info].join('\n')
  return { title: neutralize(p.title.trim()).replace(/\n+/g, ' '), body, labels: ['feedback', LABELS[p.type]] }
}

const hits = new Map()
/** Tiny in-memory limiter per client (per worker instance). Add a Cloudflare rate-limiting rule for a hard limit. */
export function allow(ip, now = Date.now()) {
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 3_600_000)
  const lastMinute = list.filter((t) => now - t < 60_000).length
  if (lastMinute >= RATE.perMinute || list.length >= RATE.perHour) {
    hits.set(ip, list)
    return false
  }
  list.push(now)
  hits.set(ip, list)
  if (hits.size > 5000) hits.clear()
  return true
}
export const resetRateLimit = () => hits.clear()

export async function handle(request, env, fetchImpl = fetch) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' })
  const text = await request.text()
  if (text.length > LIMITS.requestMax) return json(413, { error: 'too_large' })
  let payload
  try {
    payload = JSON.parse(text)
  } catch {
    return json(400, { error: 'invalid_json' })
  }
  const bad = validate(payload)
  if (bad) return json(400, { error: bad })
  if (!allow(request.headers.get('cf-connecting-ip') ?? 'unknown')) return json(429, { error: 'rate_limited' })
  if (!env?.GITHUB_TOKEN) return json(500, { error: 'not_configured' })
  const repo = env.GITHUB_REPO || 'pzxe/Aimless'
  let res
  try {
    res = await fetchImpl(`https://api.github.com/repos/${repo}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'aimless-feedback-proxy',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify(buildIssue(payload)),
    })
  } catch {
    return json(502, { error: 'github_unreachable' })
  }
  if (!res.ok) return json(502, { error: 'github_rejected', status: res.status })
  const issue = await res.json().catch(() => ({}))
  return json(201, { number: issue.number, url: issue.html_url })
}

export default { fetch: (request, env) => handle(request, env) }
