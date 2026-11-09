/**
 * Telemetry for the BROWSER version of Aimless only (1usl.one/aimless).
 *
 * The desktop app is a different product: private, offline-first, zero telemetry. Nothing in this file runs there:
 * `startTelemetry()` returns immediately when the app runs inside Electron, and it also stays idle unless a collector
 * URL was provided at build time (VITE_TELEMETRY_URL). It respects Do Not Track, Global Privacy Control and the
 * in-app opt-out.
 *
 * What it sends: pageviews, tool usage (e.g. which two games were converted), clicks on named interface controls,
 * a heartbeat while the tab is visible, a first-party visitor cookie and a per-session id. Opting out deletes the cookie
 * and asks the server to erase the visitor's stored data. What it never sends:
 * anything the user typed, tournament names, share / editor links (they contain keys), profile names or accounts.
 */
import { dictionaries, type TranslationKey } from '@/i18n'
import { useSettings } from '@/store/settingsStore'
import { isDesktopApp } from '@/utils/platform'

const ENDPOINT = (import.meta.env.VITE_TELEMETRY_URL ?? '').trim()

export const VISITOR_COOKIE = 'aa_vid'
export const OPTOUT_COOKIE = 'aa_optout'
const VISITOR_DAYS = 395 // the longest a browser keeps a cookie
const SESSION_IDLE_MS = 30 * 60_000
const HEARTBEAT_MS = 30_000
const KEY_MAX = 40
const APP_PREFIX = '/aimless'

// ------------------------------------------------------------------------------------------------ pure helpers

/** Is telemetry allowed at all in this environment? Every condition must hold. */
export function trackingAllowed(env: { configured: boolean; desktop: boolean; dnt: boolean; gpc: boolean; optOut: boolean }): boolean {
  return env.configured && !env.desktop && !env.dnt && !env.gpc && !env.optOut
}

/**
 * Router path -> the path we report. Share links carry secrets (a tournament editor link contains a private key), so
 * every route that has an id is reduced to a fixed, id-free name. Nothing after the first segment of those is kept.
 */
export function routeToPath(pathname: string): string {
  const clean = (pathname.split(/[?#]/, 1)[0] || '/').replace(/\/+$/, '') || '/'
  const [, first = '', second] = clean.split('/')
  let route: string
  if (first === 'view' || (first === 'tournament' && second === 'live')) route = '/view'
  else if (first === 'obs') route = '/obs'
  else if (first === 'edit') route = '/edit'
  else if (first === 'tournaments' && second) route = '/tournaments/open'
  else route = `/${first}`.toLowerCase().replace(/[^a-z0-9/_-]/g, '').slice(0, 40) || '/'
  return route === '/' ? `${APP_PREFIX}/` : `${APP_PREFIX}${route}`
}

/** "converter.saveProfile" -> "converter-saveprofile": a name the collector accepts, independent of the UI language. */
export function slugKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, KEY_MAX).replace(/-+$/, '')
}

const normalizeLabel = (s: string) => s.replace(/\s+/g, ' ').trim()

/** Maps the exact text of static interface labels to their translation key. Text with placeholders never matches. */
export function buildLabelIndex(dict: Record<string, string>): Map<string, string> {
  const index = new Map<string, string>()
  for (const [key, value] of Object.entries(dict)) {
    if (typeof value !== 'string' || value.includes('{') || value.length < 2 || value.length > 60) continue
    const text = normalizeLabel(value)
    if (!index.has(text)) index.set(text, key)
  }
  return index
}

/** The name for a clicked control, or null when its text is not a known static label (so it may be user data). */
export function labelToName(text: string | null | undefined, index: Map<string, string>): string | null {
  const key = index.get(normalizeLabel(text ?? ''))
  return key ? slugKey(key) || null : null
}

/** Keeps at most 8 simple, short properties; everything else is dropped. */
export function sanitizeProps(props: Record<string, unknown> | undefined): Record<string, string | number | boolean> | undefined {
  if (!props) return undefined
  const out: Record<string, string | number | boolean> = {}
  for (const [k, v] of Object.entries(props)) {
    if (Object.keys(out).length >= 8) break
    if (!/^[a-z][a-z0-9_]{0,23}$/.test(k)) continue
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v
    else if (typeof v === 'boolean') out[k] = v
    else if (typeof v === 'string' && v.length > 0 && v.length <= 64) out[k] = v
  }
  return Object.keys(out).length ? out : undefined
}

export function randomId(bytes = 12, rng: Pick<Crypto, 'getRandomValues'> = globalThis.crypto): string {
  const buf = new Uint8Array(bytes)
  rng.getRandomValues(buf)
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('')
}

export type EventType = 'pv' | 'hb' | 'click' | 'tool'

export interface TelemetryMessage {
  t: EventType
  p: string
  k?: string
  r?: string
  v: string
  s: string
  pr?: Record<string, string | number | boolean>
}

// ------------------------------------------------------------------------------------------------ cookies

const hasDocument = () => typeof document !== 'undefined'

export function readCookie(name: string): string | null {
  if (!hasDocument()) return null
  for (const part of document.cookie.split(';')) {
    const i = part.indexOf('=')
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim())
  }
  return null
}

function writeCookie(name: string, value: string, days: number) {
  if (!hasDocument()) return
  const secure = location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${days * 86_400}; Path=/; SameSite=Lax${secure}`
}

function deleteCookie(name: string) {
  if (hasDocument()) document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`
}

export const telemetryConfigured = ENDPOINT !== '' && !isDesktopApp

export const isOptedOut = () => readCookie(OPTOUT_COOKIE) === '1'

/** The in-app switch. Opting out also deletes the visitor cookie. */
export function setOptOut(optOut: boolean) {
  if (optOut) {
    // Ask the server to erase what it stored for this visitor cookie, then forget the cookie itself.
    const id = readCookie(VISITOR_COOKIE)
    if (id && ENDPOINT && !isDesktopApp) post({ t: 'forget', v: id })
    writeCookie(OPTOUT_COOKIE, '1', VISITOR_DAYS)
    deleteCookie(VISITOR_COOKIE)
    stop()
  } else {
    deleteCookie(OPTOUT_COOKIE)
    start()
  }
}

function browserSignals() {
  const nav = typeof navigator === 'undefined' ? undefined : (navigator as Navigator & { globalPrivacyControl?: boolean })
  return { dnt: nav?.doNotTrack === '1', gpc: nav?.globalPrivacyControl === true }
}

const allowed = () => trackingAllowed({ configured: ENDPOINT !== '', desktop: isDesktopApp, ...browserSignals(), optOut: isOptedOut() })

// ------------------------------------------------------------------------------------------------ runtime

let running = false
let teardown: Array<() => void> = []
let labelIndex: { lang: string; index: Map<string, string> } | null = null
let session = { id: '', last: 0 }
let currentPath = `${APP_PREFIX}/`
let firstView = true

function visitorId(): string {
  let id = readCookie(VISITOR_COOKIE)
  if (!id || !/^[a-f0-9]{24}$/.test(id)) id = randomId(12)
  writeCookie(VISITOR_COOKIE, id, VISITOR_DAYS) // refreshed on every visit, so active visitors never expire
  return id
}

function sessionId(): string {
  const now = Date.now()
  if (!session.id || now - session.last > SESSION_IDLE_MS) session = { id: randomId(9), last: now }
  session.last = now
  return session.id
}

function baseProps() {
  const lang = useSettings.getState().language
  const w = typeof window === 'undefined' ? 1280 : window.innerWidth
  return { lang, dev: w < 640 ? 'phone' : w < 1024 ? 'tablet' : 'desktop' }
}

function post(message: TelemetryMessage | { t: 'forget'; v: string }) {
  try {
    void fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, // a "simple" request: no CORS preflight
      body: JSON.stringify(message),
      keepalive: true,
      credentials: 'omit',
      mode: 'cors',
    }).catch(() => {})
  } catch {
    /* telemetry must never break the app */
  }
}

function send(t: EventType, extra: { k?: string; r?: string; props?: Record<string, unknown> } = {}) {
  if (!running || !allowed()) return
  const message: TelemetryMessage = { t, p: currentPath, v: visitorId(), s: sessionId() }
  if (extra.k) message.k = extra.k
  if (extra.r) message.r = extra.r
  message.pr = sanitizeProps({ ...baseProps(), ...extra.props })
  post(message)
}

/** Call on every route change. */
export function pageview(routerPathname: string) {
  currentPath = routeToPath(routerPathname)
  let referrer: string | undefined
  if (firstView && hasDocument() && document.referrer) {
    try {
      const host = new URL(document.referrer).hostname.toLowerCase()
      if (host && host !== location.hostname) referrer = host
    } catch {
      /* ignore */
    }
  }
  firstView = false
  send('pv', { r: referrer })
}

/** A named tool action, e.g. track('converter', { from: 'valorant', to: 'cs2' }). Props must be simple and non-personal. */
export function track(name: string, props?: Record<string, unknown>) {
  const k = slugKey(name)
  if (k) send('tool', { k, props })
}

function onClick(event: MouseEvent) {
  const target = event.target
  if (!(target instanceof Element)) return
  if (target.closest('[data-no-track]')) return
  const el = target.closest<HTMLElement>('[data-track],a,button,[role="button"]')
  if (!el) return
  let name = el.getAttribute('data-track') ? slugKey(el.getAttribute('data-track') ?? '') : null
  if (!name) {
    const lang = useSettings.getState().language
    if (!labelIndex || labelIndex.lang !== lang) labelIndex = { lang, index: buildLabelIndex(dictionaries[lang] as Record<TranslationKey, string>) }
    name = labelToName(el.getAttribute('aria-label') || el.textContent, labelIndex.index)
  }
  if (name) send('click', { k: name })
}

function start(): void {
  if (running || !allowed() || typeof document === 'undefined') return
  running = true
  document.addEventListener('click', onClick, true)
  const beat = window.setInterval(() => {
    if (document.visibilityState === 'visible') send('hb')
  }, HEARTBEAT_MS)
  teardown = [() => document.removeEventListener('click', onClick, true), () => window.clearInterval(beat)]
}

function stop(): void {
  running = false
  for (const fn of teardown) fn()
  teardown = []
}

/** Starts telemetry in the browser version. Returns the function that stops it. A no-op in the desktop app. */
export function startTelemetry(): () => void {
  if (isDesktopApp) return () => {}
  start()
  return stop
}
