// Minimal X API v2 client for posting tweets (POST /2/tweets). No dependencies.
// Auth: OAuth 1.0a user context (4 keys) or an OAuth 2.0 user-context access token.
import { createHmac, randomBytes } from 'node:crypto'

const pct = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)

/** OAuth 1.0a Authorization header. A JSON body is not part of the signature base string. */
export function oauth1Header(method, url, creds, { nonce = randomBytes(16).toString('hex'), timestamp = String(Math.floor(Date.now() / 1000)) } = {}) {
  const oauth = {
    oauth_consumer_key: creds.apiKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: creds.accessToken,
    oauth_version: '1.0',
  }
  const u = new URL(url)
  const params = [...Object.entries(oauth), ...u.searchParams.entries()].map(([k, v]) => [pct(k), pct(v)]).sort(([a, av], [b, bv]) => (a === b ? (av < bv ? -1 : 1) : a < b ? -1 : 1))
  const base = [method.toUpperCase(), pct(`${u.origin}${u.pathname}`), pct(params.map(([k, v]) => `${k}=${v}`).join('&'))].join('&')
  const signature = createHmac('sha1', `${pct(creds.apiSecret)}&${pct(creds.accessSecret)}`).update(base).digest('base64')
  const header = { ...oauth, oauth_signature: signature }
  return 'OAuth ' + Object.entries(header).map(([k, v]) => `${pct(k)}="${pct(v)}"`).join(', ')
}

/** Reads credentials from the environment. Returns null when none are complete. */
export function credentialsFromEnv(env = process.env) {
  if (env.X_USER_ACCESS_TOKEN) return { kind: 'oauth2', token: env.X_USER_ACCESS_TOKEN }
  const { X_API_KEY: apiKey, X_API_SECRET: apiSecret, X_ACCESS_TOKEN: accessToken, X_ACCESS_SECRET: accessSecret } = env
  return apiKey && apiSecret && accessToken && accessSecret ? { kind: 'oauth1', apiKey, apiSecret, accessToken, accessSecret } : null
}

/** Posts one tweet. Returns { id, url }. Throws with X's error detail on failure. */
export async function postTweet(text, creds, handle = '87lx') {
  const url = 'https://api.x.com/2/tweets'
  const Authorization = creds.kind === 'oauth2' ? `Bearer ${creds.token}` : oauth1Header('POST', url, creds)
  const res = await fetch(url, { method: 'POST', headers: { Authorization, 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) })
  const body = await res.json().catch(() => ({}))
  if (!res.ok || !body.data?.id) throw new Error(`X API ${res.status}: ${body.detail || body.title || JSON.stringify(body)}`)
  return { id: body.data.id, url: `https://x.com/${handle}/status/${body.data.id}` }
}
