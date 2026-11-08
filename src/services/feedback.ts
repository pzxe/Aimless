/**
 * In-app feedback. Sends a bug report or feature request to the project's GitHub issues.
 *
 * Creating a GitHub issue needs a token, and a token inside an app is public, so the app never holds one. It posts
 * to a small proxy that keeps the token server-side (source and deploy steps: docs/feedback-worker). The proxy URL is
 * set at build time with `VITE_FEEDBACK_ENDPOINT`. Without it, submitting opens a pre-filled "New issue" page instead.
 */
export const FEEDBACK_ENDPOINT: string = String(import.meta.env?.VITE_FEEDBACK_ENDPOINT ?? '').trim()
export const ISSUES_URL = 'https://github.com/pzxe/Aimless/issues'
export const FEEDBACK_TIMEOUT_MS = 12_000

export type FeedbackType = 'bug' | 'feature' | 'other'
export const FEEDBACK_TYPES: readonly FeedbackType[] = ['bug', 'feature', 'other']
export const FEEDBACK_LIMITS = { titleMin: 3, titleMax: 120, bodyMin: 10, bodyMax: 2000 } as const

export interface FeedbackInput {
  type: FeedbackType
  title: string
  body: string
}
export interface FeedbackMeta {
  version: string
  platform: string
  language: string
}

export type FeedbackIssue = 'title_short' | 'title_long' | 'body_short' | 'body_long'

/** What is wrong with the text, or null when it can be sent. */
export function validateFeedback(i: FeedbackInput): FeedbackIssue | null {
  const title = i.title.trim()
  const body = i.body.trim()
  if (title.length < FEEDBACK_LIMITS.titleMin) return 'title_short'
  if (title.length > FEEDBACK_LIMITS.titleMax) return 'title_long'
  if (body.length < FEEDBACK_LIMITS.bodyMin) return 'body_short'
  if (body.length > FEEDBACK_LIMITS.bodyMax) return 'body_long'
  return null
}

/** The JSON the proxy expects. `meta` is only included when the user ticked the box. */
export function buildPayload(i: FeedbackInput, meta: FeedbackMeta | null) {
  return { type: i.type, title: i.title.trim(), body: i.body.trim(), ...(meta ? { meta } : {}) }
}

const LABEL: Record<FeedbackType, string> = { bug: 'bug', feature: 'enhancement', other: 'question' }
/** GitHub's "new issue" form refuses very long links, so the body is cut to fit. */
const MAX_URL = 7000

/** A pre-filled GitHub "New issue" page for the same feedback (used when no proxy is configured). */
export function prefilledIssueUrl(i: FeedbackInput, meta: FeedbackMeta | null): string {
  const info = meta ? `\n\n---\nApp version: ${meta.version}\nSystem: ${meta.platform}\nLanguage: ${meta.language}` : ''
  let body = `${i.body.trim()}${info}`
  const make = (b: string) => `${ISSUES_URL}/new?title=${encodeURIComponent(i.title.trim())}&labels=${encodeURIComponent(`feedback,${LABEL[i.type]}`)}&body=${encodeURIComponent(b)}`
  let url = make(body)
  while (url.length > MAX_URL && body.length > 20) {
    body = body.slice(0, Math.floor(body.length * 0.85))
    url = make(body)
  }
  return url
}

export type FeedbackError = 'invalid' | 'network' | 'timeout' | 'rate-limited' | 'rejected'
export type FeedbackResult =
  | { ok: true; mode: 'direct'; number?: number; url?: string }
  | { ok: true; mode: 'github-page'; url: string }
  | { ok: false; error: FeedbackError }

/** True when feedback is sent straight to GitHub (through the proxy) rather than via a pre-filled page. */
export const isDirectFeedback = (endpoint: string = FEEDBACK_ENDPOINT) => /^https:\/\//i.test(endpoint)

export async function submitFeedback(
  input: FeedbackInput,
  meta: FeedbackMeta | null,
  opts: { endpoint?: string; fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<FeedbackResult> {
  if (validateFeedback(input) !== null) return { ok: false, error: 'invalid' }
  const endpoint = opts.endpoint ?? FEEDBACK_ENDPOINT
  if (!isDirectFeedback(endpoint)) return { ok: true, mode: 'github-page', url: prefilledIssueUrl(input, meta) }

  const doFetch = opts.fetchImpl ?? (typeof fetch === 'undefined' ? undefined : fetch)
  if (!doFetch) return { ok: false, error: 'network' }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? FEEDBACK_TIMEOUT_MS)
  try {
    const res = await doFetch(endpoint, {
      method: 'POST',
      // text/plain keeps this a "simple" request, so browsers skip the CORS preflight; the proxy parses it as JSON
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify(buildPayload(input, meta)),
      signal: ctrl.signal,
    })
    if (res.status === 429) return { ok: false, error: 'rate-limited' }
    if (!res.ok) return { ok: false, error: 'rejected' }
    const data = (await res.json().catch(() => ({}))) as { number?: unknown; url?: unknown }
    return {
      ok: true,
      mode: 'direct',
      number: typeof data.number === 'number' ? data.number : undefined,
      url: typeof data.url === 'string' && /^https:\/\/github\.com\//.test(data.url) ? data.url : undefined,
    }
  } catch (e) {
    return { ok: false, error: ctrl.signal.aborted || (e as { name?: string })?.name === 'AbortError' ? 'timeout' : 'network' }
  } finally {
    clearTimeout(timer)
  }
}
