/**
 * Live tournament sharing (v2.4.0).
 *
 * Zero-config relay: a public ntfy.sh topic. There are no accounts and no servers of ours; the topic name is
 * an unguessable random id that only people with a link know. Because anyone who knows the topic could also
 * *publish* to it, nothing on the relay is trusted by itself. Every message is signed (ECDSA P-256):
 *
 *   share id  = <topic>.<fingerprint of the host's public key>      (viewer link)
 *   editor id = <share id>.<editor public key x>.<y>.<private d>    (editor link: the key IS the permission)
 *
 * - Viewers only accept state signed by the host key (whose fingerprint is in the link) or by an editor key
 *   that the host has authorised in a host-signed *grant*. Forged or tampered messages are ignored.
 * - Revoking an editor = the host publishes a newer grant without that key and re-publishes the state.
 * - Messages are limited to 4 KB by the relay, so a tournament is deflated and split into signed chunks.
 *
 * Limits (also documented in the UI): the relay keeps messages for about 12 hours (the host app re-sends
 * the state while it is open), concurrent edits are last-writer-wins by revision, and anybody who knows the
 * topic can flood it (which the signature checks make harmless, but can delay updates).
 */
import { sanitizeTournament, type Tournament } from '@/core/tournament'

export const RELAY_URL = 'https://ntfy.sh'
export const LIVE_BASE_URL = 'https://pzxe.github.io/Aimless/'
/** Characters of encoded payload per message (the relay allows 4096 bytes in total). */
export const CHUNK_CHARS = 2400
export const MAX_CHUNKS = 40
export const MAX_STATE_BYTES = 400_000
export const MAX_EDITORS = 8

export type ShareRole = 'host' | 'editor' | 'guest'
export type LiveStatus = 'connecting' | 'live' | 'offline' | 'limited'

// ------------------------------------------------------------------ encoding helpers
const enc = new TextEncoder()
const dec = new TextDecoder()

export function b64urlEncode(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function b64urlDecode(text: string): Uint8Array {
  const pad = '='.repeat((4 - (text.length % 4)) % 4)
  const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/') + pad)
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

const B64 = /^[A-Za-z0-9_-]+$/

async function pump(stream: ReadableStream<Uint8Array>, limit: number): Promise<Uint8Array> {
  const reader = stream.getReader()
  const parts: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.length
    if (total > limit) {
      await reader.cancel().catch(() => {})
      throw new Error('too_large')
    }
    parts.push(value)
  }
  const out = new Uint8Array(total)
  let at = 0
  for (const p of parts) {
    out.set(p, at)
    at += p.length
  }
  return out
}

async function transform(data: Uint8Array, stream: CompressionStream | DecompressionStream, limit: number): Promise<Uint8Array> {
  const writer = stream.writable.getWriter()
  void writer.write(data as BufferSource).then(() => writer.close()).catch(() => {})
  return pump(stream.readable, limit)
}

/** Tournament -> deflated base64url text. */
export async function packState(t: Tournament): Promise<string> {
  const json = JSON.stringify(t)
  return b64urlEncode(await transform(enc.encode(json), new CompressionStream('deflate-raw'), MAX_STATE_BYTES))
}

/** Text -> validated tournament (never trusts the sender: it goes through the same sanitiser as imports). */
export async function unpackState(text: string): Promise<Tournament | null> {
  try {
    if (!B64.test(text)) return null
    const raw = await transform(b64urlDecode(text), new DecompressionStream('deflate-raw'), MAX_STATE_BYTES)
    const r = sanitizeTournament(JSON.parse(dec.decode(raw)), { keepIds: true })
    return r.ok ? r.value : null
  } catch {
    return null
  }
}

export function chunkText(text: string, size = CHUNK_CHARS): string[] {
  const out: string[] = []
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size))
  return out.length ? out : ['']
}

// ------------------------------------------------------------------ keys and signatures
export interface KeyPair {
  /** `${x}.${y}` (base64url, 43 chars each). */
  pub: string
  /** base64url `d`. */
  priv: string
}

const subtle = () => globalThis.crypto.subtle
const ALG = { name: 'ECDSA', namedCurve: 'P-256' } as const
const SIGN = { name: 'ECDSA', hash: 'SHA-256' } as const

export async function generateKeys(): Promise<KeyPair> {
  const k = await subtle().generateKey(ALG, true, ['sign', 'verify'])
  const jwk = await subtle().exportKey('jwk', k.privateKey)
  return { pub: `${jwk.x}.${jwk.y}`, priv: jwk.d! }
}

const PUB = /^[A-Za-z0-9_-]{43}\.[A-Za-z0-9_-]{43}$/
export const isPub = (s: unknown): s is string => typeof s === 'string' && PUB.test(s)

async function importPublic(pub: string): Promise<CryptoKey> {
  const [x, y] = pub.split('.')
  return subtle().importKey('jwk', { kty: 'EC', crv: 'P-256', x, y, ext: true }, ALG, false, ['verify'])
}

async function importPrivate(k: KeyPair): Promise<CryptoKey> {
  const [x, y] = k.pub.split('.')
  return subtle().importKey('jwk', { kty: 'EC', crv: 'P-256', x, y, d: k.priv, ext: true }, ALG, false, ['sign'])
}

export async function fingerprint(pub: string): Promise<string> {
  const h = new Uint8Array(await subtle().digest('SHA-256', enc.encode(pub)))
  return b64urlEncode(h.subarray(0, 16))
}

// ------------------------------------------------------------------ links
const TOPIC = /^al-[A-Za-z0-9_-]{22}$/
const FP = /^[A-Za-z0-9_-]{22}$/
const KEYPART = /^[A-Za-z0-9_-]{43}$/

export interface ShareId {
  topic: string
  fp: string
}

export function newTopic(): string {
  return 'al-' + b64urlEncode(globalThis.crypto.getRandomValues(new Uint8Array(16)))
}

export const formatShareId = (s: ShareId) => `${s.topic}.${s.fp}`

export function parseShareId(text: string): ShareId | null {
  const [topic, fp, ...rest] = text.split('.')
  if (rest.length || !topic || !fp || !TOPIC.test(topic) || !FP.test(fp)) return null
  return { topic, fp }
}

export function editorToken(k: KeyPair): string {
  return `${k.pub}.${k.priv}`
}

export function parseEditorId(text: string): { share: ShareId; keys: KeyPair } | null {
  const parts = text.split('.')
  if (parts.length !== 5) return null
  const share = parseShareId(parts.slice(0, 2).join('.'))
  const [x, y, d] = parts.slice(2)
  if (!share || !KEYPART.test(x!) || !KEYPART.test(y!) || !KEYPART.test(d!)) return null
  return { share, keys: { pub: `${x}.${y}`, priv: d! } }
}

const withBase = (base: string) => (base.endsWith('/') ? base : base + '/')

export const viewerLink = (id: ShareId, base = LIVE_BASE_URL) => `${withBase(base)}#/view/${formatShareId(id)}`
export const obsLink = (id: ShareId, base = LIVE_BASE_URL) => `${withBase(base)}#/obs/${formatShareId(id)}`
export const editorLink = (id: ShareId, keys: KeyPair, base = LIVE_BASE_URL) => `${withBase(base)}#/edit/${formatShareId(id)}.${editorToken(keys)}`

export type ParsedLink = { kind: 'view' | 'obs'; share: ShareId } | { kind: 'edit'; share: ShareId; keys: KeyPair }

/** Understands a full URL, a `#/view/...` fragment or a bare `/view/...` path. */
export function parseLink(input: string): ParsedLink | null {
  const m = /(?:^|[#/])(view|obs|edit|tournament\/live)\/([A-Za-z0-9_.-]+)\/?(?:[?#].*)?$/.exec(input.trim())
  if (!m) return null
  const kind = m[1] === 'tournament/live' ? 'view' : (m[1] as 'view' | 'obs' | 'edit')
  if (kind === 'edit') {
    const e = parseEditorId(m[2]!)
    return e ? { kind, share: e.share, keys: e.keys } : null
  }
  const share = parseShareId(m[2]!)
  return share ? { kind, share } : null
}

// ------------------------------------------------------------------ messages
export interface Envelope {
  v: 1
  /** s = state chunk, g = editor grant. */
  k: 's' | 'g'
  by: string
  sig: string
  ts: number
  rev?: number
  i?: number
  n?: number
  d?: string
  gs?: number
  eds?: string[]
}

const signedText = (topic: string, m: Omit<Envelope, 'sig'>) =>
  JSON.stringify([topic, m.v, m.k, m.by, m.ts, m.rev ?? 0, m.i ?? 0, m.n ?? 0, m.d ?? '', m.gs ?? 0, m.eds ?? []])

export async function signEnvelope(topic: string, keys: KeyPair, body: Omit<Envelope, 'sig' | 'by' | 'v'>): Promise<Envelope> {
  const base = { v: 1 as const, by: keys.pub, ...body }
  const sig = await subtle().sign(SIGN, await importPrivate(keys), enc.encode(signedText(topic, base)))
  return { ...base, sig: b64urlEncode(new Uint8Array(sig)) }
}

export async function verifyEnvelope(topic: string, m: Envelope): Promise<boolean> {
  try {
    const { sig, ...rest } = m
    return await subtle().verify(SIGN, await importPublic(m.by), b64urlDecode(sig) as BufferSource, enc.encode(signedText(topic, rest)))
  } catch {
    return false
  }
}

/** Structural validation of untrusted JSON before any crypto work. */
export function parseEnvelope(text: string): Envelope | null {
  if (text.length > 4200) return null
  let m: unknown
  try {
    m = JSON.parse(text)
  } catch {
    return null
  }
  if (!m || typeof m !== 'object') return null
  const e = m as Record<string, unknown>
  if (e.v !== 1 || (e.k !== 's' && e.k !== 'g') || !isPub(e.by) || typeof e.sig !== 'string' || e.sig.length > 100 || !B64.test(e.sig)) return null
  if (typeof e.ts !== 'number' || !Number.isFinite(e.ts)) return null
  if (e.k === 'g') {
    if (!Number.isInteger(e.gs) || (e.gs as number) < 1 || !Array.isArray(e.eds) || e.eds.length > MAX_EDITORS || !e.eds.every(isPub)) return null
  } else {
    if (!Number.isInteger(e.rev) || (e.rev as number) < 1) return null
    if (!Number.isInteger(e.i) || !Number.isInteger(e.n) || (e.n as number) < 1 || (e.n as number) > MAX_CHUNKS || (e.i as number) < 0 || (e.i as number) >= (e.n as number)) return null
    if (typeof e.d !== 'string' || e.d.length > CHUNK_CHARS + 8 || (e.d !== '' && !B64.test(e.d))) return null
  }
  return e as unknown as Envelope
}

// ------------------------------------------------------------------ receiving
export interface RemoteState {
  tournament: Tournament
  rev: number
  ts: number
  /** Who signed it. */
  by: string
  byHost: boolean
}

/** Collects signed messages from one topic and tracks the newest authorised complete state. */
export class Collector {
  private grant: { gs: number; eds: Set<string> } = { gs: 0, eds: new Set() }
  private hostPub: string | null = null
  private chunks = new Map<string, { n: number; ts: number; parts: Map<number, string> }>()
  private best: { rev: number; ts: number; by: string; text: string } | null = null
  private delivered = ''

  constructor(readonly share: ShareId) {}

  get editors(): string[] {
    return [...this.grant.eds]
  }
  get rev(): number {
    return this.best?.rev ?? 0
  }
  get grantSeq(): number {
    return this.grant.gs
  }
  get host(): string | null {
    return this.hostPub
  }

  /** Feed one raw message. Returns a new state when the newest valid state changed. */
  async ingest(raw: string): Promise<RemoteState | null> {
    const m = parseEnvelope(raw)
    if (!m) return null
    const isHost = (await fingerprint(m.by)) === this.share.fp
    if (m.k === 'g' && !isHost) return null
    if (!(await verifyEnvelope(this.share.topic, m))) return null
    if (isHost) this.hostPub = m.by
    if (m.k === 'g') {
      if (m.gs! > this.grant.gs) this.grant = { gs: m.gs!, eds: new Set(m.eds) }
      return this.evaluate()
    }
    const key = `${m.by}|${m.rev}`
    const entry = this.chunks.get(key) ?? { n: m.n!, ts: m.ts, parts: new Map<number, string>() }
    if (entry.n !== m.n) return null
    entry.parts.set(m.i!, m.d!)
    this.chunks.set(key, entry)
    if (this.chunks.size > 64) {
      const oldest = [...this.chunks.entries()].sort((a, b) => a[1].ts - b[1].ts)[0]
      if (oldest) this.chunks.delete(oldest[0])
    }
    return this.evaluate()
  }

  private async evaluate(): Promise<RemoteState | null> {
    let pick: { rev: number; ts: number; by: string; text: string } | null = null
    for (const [key, e] of this.chunks) {
      if (e.parts.size !== e.n) continue
      const [by, revText] = key.split('|') as [string, string]
      const byHost = (await fingerprint(by)) === this.share.fp
      if (!byHost && !this.grant.eds.has(by)) continue
      const rev = Number(revText)
      if (!pick || rev > pick.rev || (rev === pick.rev && e.ts > pick.ts)) {
        pick = { rev, ts: e.ts, by, text: Array.from({ length: e.n }, (_, i) => e.parts.get(i)!).join('') }
      }
    }
    this.best = pick
    if (!pick) return null
    const id = `${pick.by}|${pick.rev}|${pick.ts}`
    if (id === this.delivered) return null
    const tournament = await unpackState(pick.text)
    if (!tournament) {
      // Bad payload from an authorised key: ignore it, keep whatever we had.
      this.chunks.delete(`${pick.by}|${pick.rev}`)
      this.best = null
      return null
    }
    this.delivered = id
    return { tournament, rev: pick.rev, ts: pick.ts, by: pick.by, byHost: (await fingerprint(pick.by)) === this.share.fp }
  }
}

// ------------------------------------------------------------------ transports
export interface Transport {
  publish(topic: string, text: string): Promise<void>
  subscribe(topic: string, handlers: { onMessage: (text: string) => void; onStatus: (s: LiveStatus) => void }): () => void
}

export class RelayLimitError extends Error {}

/** ntfy.sh over plain fetch: POST to publish, a streaming SSE request to subscribe (works in browsers, Electron and Node). */
export class NtfyTransport implements Transport {
  /**
   * @param watchdogMs reconnect when the stream has been silent this long. ntfy sends a keepalive about every 30 s,
   *   so silence means a half-open connection (laptop sleep, Wi-Fi switch) that would otherwise look "live" forever.
   */
  constructor(
    private base = RELAY_URL,
    private fetchImpl: typeof fetch = (...a) => globalThis.fetch(...a),
    private watchdogMs = 75_000,
  ) {}

  async publish(topic: string, text: string): Promise<void> {
    const res = await this.fetchImpl(`${this.base}/${topic}`, { method: 'POST', body: text })
    if (res.status === 429) throw new RelayLimitError('relay rate limit')
    if (!res.ok) throw new Error(`relay ${res.status}`)
  }

  subscribe(topic: string, { onMessage, onStatus }: { onMessage: (t: string) => void; onStatus: (s: LiveStatus) => void }): () => void {
    let stopped = false
    let abort: AbortController | null = null
    let delay = 1000
    let wake: (() => void) | null = null
    // The network came back: do not wait out the backoff.
    const onOnline = () => {
      delay = 1000
      wake?.()
    }
    globalThis.addEventListener?.('online', onOnline)
    const run = async () => {
      while (!stopped) {
        const ctl = new AbortController()
        abort = ctl
        onStatus('connecting')
        let lastData = Date.now()
        const watchdog = setInterval(() => {
          if (Date.now() - lastData > this.watchdogMs) ctl.abort()
        }, Math.max(5, Math.min(10_000, Math.floor(this.watchdogMs / 3))))
        try {
          const res = await this.fetchImpl(`${this.base}/${topic}/sse?since=all`, { signal: ctl.signal })
          if (res.status === 429) onStatus('limited')
          else if (!res.ok || !res.body) onStatus('offline')
          else {
            onStatus('live')
            delay = 1000
            const reader = res.body.getReader()
            let buf = ''
            for (;;) {
              const { done, value } = await reader.read()
              if (done) break
              lastData = Date.now()
              buf += dec.decode(value, { stream: true })
              let nl: number
              while ((nl = buf.indexOf('\n')) >= 0) {
                const line = buf.slice(0, nl).replace(/\r$/, '')
                buf = buf.slice(nl + 1)
                if (!line.startsWith('data:')) continue
                try {
                  const ev = JSON.parse(line.slice(5).trim()) as { event?: string; message?: string }
                  if (ev.event === 'message' && typeof ev.message === 'string') onMessage(ev.message)
                } catch {
                  /* keepalive or malformed line */
                }
              }
            }
          }
        } catch {
          if (stopped) return
          onStatus('offline')
        } finally {
          clearInterval(watchdog)
        }
        if (stopped) return
        await new Promise<void>((resolve) => {
          const id = setTimeout(resolve, delay)
          wake = () => {
            clearTimeout(id)
            resolve()
          }
        })
        wake = null
        delay = Math.min(delay * 2, 15000)
      }
    }
    void run()
    return () => {
      stopped = true
      abort?.abort()
      wake?.()
      globalThis.removeEventListener?.('online', onOnline)
    }
  }
}

/** In-memory relay with history replay, for tests. */
export class MemoryRelay implements Transport {
  readonly log = new Map<string, string[]>()
  private subs = new Map<string, Set<(t: string) => void>>()
  failPublish = false

  async publish(topic: string, text: string): Promise<void> {
    if (this.failPublish) throw new RelayLimitError('limit')
    if (text.length > 4096) throw new Error('message too large')
    this.log.set(topic, [...(this.log.get(topic) ?? []), text])
    for (const s of this.subs.get(topic) ?? []) queueMicrotask(() => s(text))
  }

  subscribe(topic: string, { onMessage, onStatus }: { onMessage: (t: string) => void; onStatus: (s: LiveStatus) => void }) {
    onStatus('live')
    for (const m of this.log.get(topic) ?? []) queueMicrotask(() => onMessage(m))
    const set = this.subs.get(topic) ?? new Set()
    set.add(onMessage)
    this.subs.set(topic, set)
    return () => void set.delete(onMessage)
  }
}

// ------------------------------------------------------------------ session
export interface SessionOptions {
  transport: Transport
  share: ShareId
  role: ShareRole
  /** Host key (role host) or editor key (role editor). Absent for guests. */
  keys?: KeyPair
  /** Host only: editor public keys that may edit. */
  editors?: string[]
  /** Host only: current grant sequence (kept across restarts). */
  grantSeq?: number
  onState?: (s: RemoteState) => void
  onStatus?: (s: LiveStatus) => void
  /** Called after a publish succeeded or failed. */
  onPublish?: (ok: boolean, error?: unknown) => void
  debounceMs?: number
  /** First retry delay after a failed publish (doubles up to 30 s). Default 2000. */
  retryMs?: number
  /** Retry delay after the relay rate-limited us. Default 60000. */
  limitRetryMs?: number
}

export class SyncSession {
  readonly collector: Collector
  private unsub: (() => void) | null = null
  private pending: Tournament | null = null
  private timer: ReturnType<typeof setTimeout> | null = null
  private chain: Promise<void> = Promise.resolve()
  private rev = 0
  private gs: number
  private editors: string[]
  private lastSent: Tournament | null = null
  private stopped = false
  private retryDelay: number
  private onOnline = () => {
    // back online: send whatever is waiting right now instead of at the next backoff step
    this.retryDelay = this.o.retryMs ?? 2000
    if (this.pending && !this.stopped) {
      if (this.timer) clearTimeout(this.timer)
      void this.flush()
    }
  }
  status: LiveStatus = 'connecting'

  constructor(private o: SessionOptions) {
    this.collector = new Collector(o.share)
    this.gs = o.grantSeq ?? 0
    this.editors = [...(o.editors ?? [])]
    this.retryDelay = o.retryMs ?? 2000
  }

  get canWrite() {
    return this.o.role !== 'guest' && !!this.o.keys
  }
  get role() {
    return this.o.role
  }
  get grantSeq() {
    return this.gs
  }

  start() {
    this.stopped = false
    globalThis.addEventListener?.('online', this.onOnline)
    this.unsub = this.o.transport.subscribe(this.o.share.topic, {
      onMessage: (text) => {
        this.chain = this.chain.then(async () => {
          const state = await this.collector.ingest(text).catch(() => null)
          if (!state) return
          this.rev = Math.max(this.rev, state.rev)
          this.o.onState?.(state)
        })
      },
      onStatus: (s) => {
        this.status = s
        this.o.onStatus?.(s)
      },
    })
  }

  stop() {
    this.stopped = true
    globalThis.removeEventListener?.('online', this.onOnline)
    this.unsub?.()
    this.unsub = null
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    this.pending = null
  }

  /** Queue the latest tournament state for publishing (coalesced; only the newest is sent). */
  publish(t: Tournament) {
    if (!this.canWrite) return
    this.pending = t
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => void this.flush(), this.o.debounceMs ?? 400)
  }

  /** Remember the state the relay should hold (used by the heartbeat). */
  seed(t: Tournament) {
    this.lastSent = t
  }

  /** Re-send the last known state (relay history only lasts about 12 hours). */
  async resend() {
    if (this.lastSent) await this.send(this.lastSent, false)
  }

  async flush() {
    this.timer = null
    const t = this.pending
    this.pending = null
    if (t) await this.send(t, true)
  }

  private async send(t: Tournament, bump: boolean) {
    const keys = this.o.keys
    if (!keys) return
    const run = async () => {
      try {
        if (bump) this.rev = Math.max(this.rev, this.collector.rev) + 1
        else this.rev = Math.max(this.rev, 1)
        const text = await packState(t)
        const parts = chunkText(text)
        if (parts.length > MAX_CHUNKS) throw new Error('state too large')
        const ts = Date.now()
        for (let i = 0; i < parts.length; i++) {
          const env = await signEnvelope(this.o.share.topic, keys, { k: 's', ts, rev: this.rev, i, n: parts.length, d: parts[i]! })
          await this.o.transport.publish(this.o.share.topic, JSON.stringify(env))
        }
        this.lastSent = t
        this.retryDelay = this.o.retryMs ?? 2000
        this.o.onPublish?.(true)
      } catch (e) {
        const limited = e instanceof RelayLimitError
        if (limited) this.o.onStatus?.('limited')
        this.o.onPublish?.(false, e)
        if (bump) this.scheduleRetry(t, limited)
      }
    }
    this.chain = this.chain.then(run)
    await this.chain
  }

  /**
   * A failed publish (offline, relay error, rate limit) is retried with backoff instead of being lost.
   * A newer edit always wins: it is already in `pending` or has replaced the timer.
   */
  private scheduleRetry(t: Tournament, limited: boolean) {
    if (this.stopped || !this.canWrite) return
    if (!this.pending) this.pending = t
    if (this.timer) return
    const wait = limited ? (this.o.limitRetryMs ?? 60_000) : this.retryDelay
    this.retryDelay = Math.min(this.retryDelay * 2, 30_000)
    this.timer = setTimeout(() => void this.flush(), wait)
  }

  /** Host only: replace the authorised editor keys and publish a new grant. */
  async setEditors(editors: string[]) {
    if (this.o.role !== 'host' || !this.o.keys) throw new Error('only the host can manage editors')
    if (editors.length > MAX_EDITORS) throw new Error('too many editors')
    this.editors = [...editors]
    this.gs = Math.max(this.gs, this.collector.grantSeq) + 1
    const env = await signEnvelope(this.o.share.topic, this.o.keys, { k: 'g', ts: Date.now(), gs: this.gs, eds: this.editors })
    await this.o.transport.publish(this.o.share.topic, JSON.stringify(env))
  }

  /** Host only: announce the grant (and current editors) after (re)starting. */
  async announce() {
    if (this.o.role === 'host') await this.setEditors(this.editors)
  }
}
