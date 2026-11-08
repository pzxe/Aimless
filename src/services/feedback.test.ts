import { beforeEach, describe, expect, it } from 'vitest'
import { allow, buildIssue, handle, neutralize, resetRateLimit, validate } from '../../docs/feedback-worker/worker.mjs'
import { buildPayload, FEEDBACK_LIMITS, isDirectFeedback, prefilledIssueUrl, submitFeedback, validateFeedback, type FeedbackInput } from './feedback'

const input: FeedbackInput = { type: 'bug', title: 'Calibrator reads wrong', body: 'The measured width is off by a few centimeters at 1600 DPI.' }
const meta = { version: '2.5.3', platform: 'Win32', language: 'en' }
const respond = (status: number, json?: unknown) => (async () => ({ status, ok: status >= 200 && status < 300, json: async () => json })) as unknown as typeof fetch
const ENDPOINT = 'https://aimless-feedback.example.workers.dev'

describe('feedback validation', () => {
  it('accepts a normal report', () => expect(validateFeedback(input)).toBeNull())
  it('rejects short and long titles and bodies, ignoring surrounding spaces', () => {
    expect(validateFeedback({ ...input, title: '  ab  ' })).toBe('title_short')
    expect(validateFeedback({ ...input, title: 'x'.repeat(FEEDBACK_LIMITS.titleMax + 1) })).toBe('title_long')
    expect(validateFeedback({ ...input, body: '   short   ' })).toBe('body_short')
    expect(validateFeedback({ ...input, body: 'y'.repeat(FEEDBACK_LIMITS.bodyMax + 1) })).toBe('body_long')
    expect(validateFeedback({ ...input, title: 'x'.repeat(FEEDBACK_LIMITS.titleMax) })).toBeNull()
  })
})

describe('feedback payload and prefilled page', () => {
  it('trims the text and only includes the system info when asked', () => {
    expect(buildPayload({ ...input, title: ' T title ' }, null)).toEqual({ type: 'bug', title: 'T title', body: input.body })
    expect(buildPayload(input, meta)).toMatchObject({ meta })
  })
  it('builds a GitHub new-issue link with the title, labels and body encoded', () => {
    const url = new URL(prefilledIssueUrl({ type: 'feature', title: 'Add "X" & Y', body: 'Line one\nLine two #1 @someone' }, meta))
    expect(url.origin + url.pathname).toBe('https://github.com/pzxe/Aimless/issues/new')
    expect(url.searchParams.get('title')).toBe('Add "X" & Y')
    expect(url.searchParams.get('labels')).toBe('feedback,enhancement')
    expect(url.searchParams.get('body')).toContain('Line one\nLine two')
    expect(url.searchParams.get('body')).toContain('App version: 2.5.3')
  })
  it('keeps the link short enough for GitHub even for a maximum-length body', () => {
    const url = prefilledIssueUrl({ type: 'bug', title: 'T'.repeat(120), body: 'é "quoted" & more '.repeat(150) }, meta)
    expect(url.length).toBeLessThanOrEqual(7000)
  })
})

describe('submitFeedback', () => {
  it('without a proxy it returns a pre-filled issue page (nothing is sent)', async () => {
    let called = false
    const r = await submitFeedback(input, meta, { endpoint: '', fetchImpl: (async () => { called = true; return {} }) as unknown as typeof fetch })
    expect(r).toMatchObject({ ok: true, mode: 'github-page' })
    expect(called).toBe(false)
    expect(isDirectFeedback('')).toBe(false)
    expect(isDirectFeedback('http://insecure.example')).toBe(false)
    expect(isDirectFeedback(ENDPOINT)).toBe(true)
  })
  it('posts JSON as text/plain to the proxy and returns the created issue', async () => {
    let seen: { url: string; init: RequestInit } | null = null
    const fetchImpl = (async (url: string, init: RequestInit) => {
      seen = { url, init }
      return { status: 201, ok: true, json: async () => ({ number: 42, url: 'https://github.com/pzxe/Aimless/issues/42' }) }
    }) as unknown as typeof fetch
    const r = await submitFeedback(input, meta, { endpoint: ENDPOINT, fetchImpl })
    expect(r).toEqual({ ok: true, mode: 'direct', number: 42, url: 'https://github.com/pzxe/Aimless/issues/42' })
    expect(seen!.url).toBe(ENDPOINT)
    expect(seen!.init.method).toBe('POST')
    expect((seen!.init.headers as Record<string, string>)['Content-Type']).toMatch(/^text\/plain/)
    expect(JSON.parse(String(seen!.init.body))).toEqual({ type: 'bug', title: input.title, body: input.body, meta })
  })
  it('never carries a token or credentials', async () => {
    let init: RequestInit | undefined
    await submitFeedback(input, null, { endpoint: ENDPOINT, fetchImpl: (async (_u: string, i: RequestInit) => { init = i; return { status: 201, ok: true, json: async () => ({}) } }) as unknown as typeof fetch })
    expect(JSON.stringify(init)).not.toMatch(/authorization|bearer|token|ghp_|github_pat/i)
    expect(init!.credentials).toBeUndefined()
  })
  it('ignores a response link that is not on github.com', async () => {
    const r = await submitFeedback(input, null, { endpoint: ENDPOINT, fetchImpl: respond(201, { number: 7, url: 'https://evil.example/x' }) })
    expect(r).toMatchObject({ ok: true, mode: 'direct', number: 7, url: undefined })
  })
  it('maps failures to clear errors', async () => {
    expect(await submitFeedback(input, null, { endpoint: ENDPOINT, fetchImpl: respond(429) })).toEqual({ ok: false, error: 'rate-limited' })
    expect(await submitFeedback(input, null, { endpoint: ENDPOINT, fetchImpl: respond(502) })).toEqual({ ok: false, error: 'rejected' })
    expect(await submitFeedback(input, null, { endpoint: ENDPOINT, fetchImpl: respond(400) })).toEqual({ ok: false, error: 'rejected' })
    const offline = (async () => { throw new TypeError('Failed to fetch') }) as unknown as typeof fetch
    expect(await submitFeedback(input, null, { endpoint: ENDPOINT, fetchImpl: offline })).toEqual({ ok: false, error: 'network' })
  })
  it('times out instead of hanging', async () => {
    const hang = ((_u: string, init: RequestInit) => new Promise((_, reject) => init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))))) as unknown as typeof fetch
    expect(await submitFeedback(input, null, { endpoint: ENDPOINT, fetchImpl: hang, timeoutMs: 30 })).toEqual({ ok: false, error: 'timeout' })
  })
  it('refuses invalid text before any request', async () => {
    let called = false
    const r = await submitFeedback({ ...input, title: 'a' }, null, { endpoint: ENDPOINT, fetchImpl: (async () => { called = true; return {} }) as unknown as typeof fetch })
    expect(r).toEqual({ ok: false, error: 'invalid' })
    expect(called).toBe(false)
  })
})

// ---------------------------------------------------------------------------------------- the proxy (docs/feedback-worker)
describe('feedback proxy', () => {
  beforeEach(() => resetRateLimit())
  const post = (body: unknown, headers: Record<string, string> = {}) =>
    new Request('https://worker.test/', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers: { 'cf-connecting-ip': '1.2.3.4', ...headers } })
  const payload = { type: 'bug', title: 'Calibrator reads wrong', body: 'The measured width is off by a few centimeters.', meta: { version: '2.5.3', platform: 'Win32', language: 'en' } }
  const env = { GITHUB_TOKEN: 'secret-token' }
  const github = (status = 201, body: unknown = { number: 9, html_url: 'https://github.com/pzxe/Aimless/issues/9' }) => {
    const calls: { url: string; init: RequestInit }[] = []
    const fn = (async (url: string, init: RequestInit) => {
      calls.push({ url, init })
      return { ok: status < 300, status, json: async () => body }
    }) as unknown as typeof fetch
    return { fn, calls }
  }

  it('creates the issue with the token, the right repo and labels, and answers with the issue link', async () => {
    const gh = github()
    const res = await handle(post(payload), env, gh.fn)
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ number: 9, url: 'https://github.com/pzxe/Aimless/issues/9' })
    expect(gh.calls).toHaveLength(1)
    expect(gh.calls[0]!.url).toBe('https://api.github.com/repos/pzxe/Aimless/issues')
    expect((gh.calls[0]!.init.headers as Record<string, string>).Authorization).toBe('Bearer secret-token')
    const sent = JSON.parse(String(gh.calls[0]!.init.body))
    expect(sent.labels).toEqual(['feedback', 'bug'])
    expect(sent.body).toContain('Sent from inside Aimless')
    expect(sent.body).toContain('App version: 2.5.3')
    expect(res.headers.get('access-control-allow-origin')).toBe('*')
  })
  it('never echoes the token back', async () => {
    const res = await handle(post(payload), env, github().fn)
    expect(await res.text()).not.toContain('secret-token')
  })
  it('answers the browser preflight and rejects other methods', async () => {
    expect((await handle(new Request('https://w.test/', { method: 'OPTIONS' }), env)).status).toBe(204)
    expect((await handle(new Request('https://w.test/', { method: 'GET' }), env)).status).toBe(405)
  })
  it('rejects bad JSON, bad payloads, honeypot spam and oversized requests without calling GitHub', async () => {
    const gh = github()
    expect((await handle(post('{nope'), env, gh.fn)).status).toBe(400)
    expect((await handle(post({ ...payload, type: 'x' }), env, gh.fn)).status).toBe(400)
    expect((await handle(post({ ...payload, title: 'a' }), env, gh.fn)).status).toBe(400)
    expect((await handle(post({ ...payload, body: 'z'.repeat(2001) }), env, gh.fn)).status).toBe(400)
    expect((await handle(post({ ...payload, website: 'http://spam' }), env, gh.fn)).status).toBe(400)
    expect((await handle(post('x'.repeat(9000)), env, gh.fn)).status).toBe(413)
    expect(gh.calls).toHaveLength(0)
  })
  it('rate limits a client and tells it so', async () => {
    const gh = github()
    for (let i = 0; i < 3; i++) expect((await handle(post(payload), env, gh.fn)).status).toBe(201)
    expect((await handle(post(payload), env, gh.fn)).status).toBe(429)
    expect((await handle(post(payload, { 'cf-connecting-ip': '9.9.9.9' }), env, gh.fn)).status).toBe(201)
    expect(allow('fresh', 0)).toBe(true)
  })
  it('reports a missing token or a GitHub failure as a server error', async () => {
    expect((await handle(post(payload), {}, github().fn)).status).toBe(500)
    resetRateLimit()
    expect((await handle(post(payload), env, github(403, {}).fn)).status).toBe(502)
    resetRateLimit()
    const down = (async () => { throw new TypeError('x') }) as unknown as typeof fetch
    expect((await handle(post(payload), env, down)).status).toBe(502)
  })
  it('makes @mentions and issue references inert and keeps the labels fixed', () => {
    expect(neutralize('hi @octocat see #12 and a&#39;b')).toBe('hi @​octocat see #​12 and a&#39;b')
    const issue = buildIssue({ type: 'feature', title: 'Ping @someone\nnow', body: 'Fix #5, thanks @team' })
    expect(issue.title).not.toMatch(/@s/)
    expect(issue.body).not.toMatch(/@t|#5/)
    expect(issue.labels).toEqual(['feedback', 'enhancement'])
    expect(validate({ type: 'other', title: 'abc', body: '1234567890' })).toBeNull()
  })
})
