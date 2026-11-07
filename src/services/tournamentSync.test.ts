import { describe, expect, it } from 'vitest'
import { createTournament, reportResult, resolveTournament, type Tournament } from '@/core/tournament'
import {
  CHUNK_CHARS,
  Collector,
  MemoryRelay,
  SyncSession,
  chunkText,
  editorLink,
  fingerprint,
  formatShareId,
  generateKeys,
  newTopic,
  obsLink,
  packState,
  parseEditorId,
  parseEnvelope,
  parseLink,
  parseShareId,
  signEnvelope,
  unpackState,
  verifyEnvelope,
  viewerLink,
  type RemoteState,
  type ShareId,
} from './tournamentSync'

function make(n = 8, format: 'single' | 'double' = 'single'): Tournament {
  const r = createTournament({
    name: 'LAN Finals',
    gameId: null,
    teamSize: 1,
    format,
    bestOf: 3,
    grandFinalReset: true,
    participants: Array.from({ length: n }, (_, i) => ({ name: `Team ${i + 1}` })),
  })
  if (!r.ok) throw new Error('setup')
  return r.value
}

function play(t: Tournament, times: number): Tournament {
  let cur = t
  for (let i = 0; i < times; i++) {
    const ready = [...resolveTournament(cur).matches.values()].find((m) => m.status === 'ready')
    if (!ready) break
    const r = reportResult(cur, ready.def.id, [2, i % 2], undefined, 1000 + i)
    if (!r.ok) throw new Error('report')
    cur = r.value
  }
  return cur
}

const tick = () => new Promise((r) => setTimeout(r, 0))
async function until(cond: () => boolean, ms = 2000) {
  const end = Date.now() + ms
  while (!cond()) {
    if (Date.now() > end) throw new Error('timeout')
    await new Promise((r) => setTimeout(r, 5))
  }
}

async function setup() {
  const relay = new MemoryRelay()
  const hostKeys = await generateKeys()
  const share: ShareId = { topic: newTopic(), fp: await fingerprint(hostKeys.pub) }
  return { relay, hostKeys, share }
}

describe('links', () => {
  it('round-trips viewer, OBS and editor links', async () => {
    const { share } = await setup()
    const keys = await generateKeys()
    const v = parseLink(viewerLink(share))
    expect(v).toEqual({ kind: 'view', share })
    expect(parseLink(obsLink(share))).toEqual({ kind: 'obs', share })
    expect(parseLink(editorLink(share, keys))).toEqual({ kind: 'edit', share, keys })
    expect(parseLink(`https://x.example/#/tournament/live/${formatShareId(share)}`)).toEqual({ kind: 'view', share })
    expect(parseLink(`/view/${formatShareId(share)}/`)).toEqual({ kind: 'view', share })
    expect(parseLink(`${viewerLink(share)}?scale=1.5`)).toEqual({ kind: 'view', share })
  })

  it('never puts the private key into viewer or OBS links', async () => {
    const { share, hostKeys } = await setup()
    expect(viewerLink(share)).not.toContain(hostKeys.priv)
    expect(obsLink(share)).not.toContain(hostKeys.priv)
    expect(viewerLink(share).length).toBeLessThan(110)
  })

  it('rejects malformed ids', async () => {
    const { share } = await setup()
    const id = formatShareId(share)
    expect(parseShareId('nope')).toBeNull()
    expect(parseShareId(`${id}.extra`)).toBeNull()
    expect(parseShareId(`al-short.${share.fp}`)).toBeNull()
    expect(parseEditorId(id)).toBeNull()
    expect(parseEditorId(`${id}.a.b.c`)).toBeNull()
    expect(parseLink('https://example.com/#/settings')).toBeNull()
    expect(parseLink('#/edit/' + id)).toBeNull()
  })
})

describe('signatures', () => {
  it('verifies genuine messages and rejects any change', async () => {
    const { share, hostKeys } = await setup()
    const env = await signEnvelope(share.topic, hostKeys, { k: 's', ts: 5, rev: 3, i: 0, n: 1, d: 'abc' })
    expect(await verifyEnvelope(share.topic, env)).toBe(true)
    expect(await verifyEnvelope(share.topic, { ...env, rev: 4 })).toBe(false)
    expect(await verifyEnvelope(share.topic, { ...env, d: 'abd' })).toBe(false)
    expect(await verifyEnvelope(share.topic, { ...env, ts: 6 })).toBe(false)
    expect(await verifyEnvelope('al-' + 'A'.repeat(22), env)).toBe(false) // replay on another topic
    const other = await generateKeys()
    expect(await verifyEnvelope(share.topic, { ...env, by: other.pub })).toBe(false)
  })

  it('rejects malformed envelopes before any crypto', () => {
    expect(parseEnvelope('not json')).toBeNull()
    expect(parseEnvelope('{}')).toBeNull()
    expect(parseEnvelope('x'.repeat(5000))).toBeNull()
    expect(parseEnvelope(JSON.stringify({ v: 1, k: 's', by: 'x', sig: 'y', ts: 1 }))).toBeNull()
  })
})

describe('state packing', () => {
  it('round-trips a tournament with results', async () => {
    const t = play(make(8, 'double'), 5)
    const back = await unpackState(await packState(t))
    expect(back?.results).toEqual(t.results)
    expect(back?.participants.map((p) => p.id)).toEqual(t.participants.map((p) => p.id))
  })

  it('splits big tournaments into messages that fit the 4 KB relay limit', async () => {
    const t = play(make(32, 'double'), 40)
    const text = await packState(t)
    const parts = chunkText(text)
    expect(parts.every((p) => p.length <= CHUNK_CHARS)).toBe(true)
    const { share, hostKeys } = await setup()
    for (let i = 0; i < parts.length; i++) {
      const env = await signEnvelope(share.topic, hostKeys, { k: 's', ts: Date.now(), rev: 1, i, n: parts.length, d: parts[i]! })
      expect(JSON.stringify(env).length).toBeLessThan(4096)
    }
    expect(parts.join('')).toBe(text)
  })

  it('refuses garbage and decompression bombs', async () => {
    expect(await unpackState('!!!')).toBeNull()
    expect(await unpackState('AAAA')).toBeNull()
    const bomb = await (async () => {
      const big = new TextEncoder().encode('{"x":"' + 'a'.repeat(5_000_000) + '"}')
      const cs = new CompressionStream('deflate-raw')
      const w = cs.writable.getWriter()
      void w.write(big).then(() => w.close())
      const out = new Uint8Array(await new Response(cs.readable).arrayBuffer())
      let s = ''
      for (const b of out) s += String.fromCharCode(b)
      return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    })()
    expect(await unpackState(bomb)).toBeNull()
  })

  it('sanitises content from the wire like an import', async () => {
    const t = make(4)
    const evil = { ...t, participants: [...t.participants, { id: 'x', name: '<img onerror=1>'.repeat(10), members: [] }] }
    const back = await unpackState(await packState(evil as Tournament))
    expect(back).not.toBeNull()
    expect(back!.participants.every((p) => p.name.length <= 40)).toBe(true)
  })
})

describe('collector and sessions', () => {
  it('a guest receives the host state live and on late join', async () => {
    const { relay, hostKeys, share } = await setup()
    const host = new SyncSession({ transport: relay, share, role: 'host', keys: hostKeys, debounceMs: 0 })
    host.start()
    const t1 = make(8)
    host.publish(t1)
    await host.flush()

    const seen: RemoteState[] = []
    const guest = new SyncSession({ transport: relay, share, role: 'guest', onState: (s) => seen.push(s) })
    guest.start()
    await until(() => seen.length === 1)
    expect(seen[0]!.byHost).toBe(true)
    expect(seen[0]!.tournament.id).toBe(t1.id)

    const t2 = play(t1, 2)
    host.publish(t2)
    await host.flush()
    await until(() => seen.length === 2)
    expect(Object.keys(seen[1]!.tournament.results)).toHaveLength(2)
    expect(seen[1]!.rev).toBeGreaterThan(seen[0]!.rev)
    host.stop()
    guest.stop()
  })

  it('guests cannot publish', async () => {
    const { relay, share } = await setup()
    const guest = new SyncSession({ transport: relay, share, role: 'guest' })
    guest.publish(make(4))
    await guest.flush()
    expect(relay.log.get(share.topic) ?? []).toHaveLength(0)
  })

  it('ignores forged state from someone who only knows the topic', async () => {
    const { relay, hostKeys, share } = await setup()
    const host = new SyncSession({ transport: relay, share, role: 'host', keys: hostKeys, debounceMs: 0 })
    host.start()
    const real = make(8)
    host.publish(real)
    await host.flush()

    const seen: RemoteState[] = []
    const guest = new SyncSession({ transport: relay, share, role: 'guest', onState: (s) => seen.push(s) })
    guest.start()
    await until(() => seen.length === 1)

    const attacker = await generateKeys()
    const fake = { ...make(8), name: 'HACKED' }
    const parts = chunkText(await packState(fake))
    for (let i = 0; i < parts.length; i++) {
      const env = await signEnvelope(share.topic, attacker, { k: 's', ts: Date.now(), rev: 999, i, n: parts.length, d: parts[i]! })
      await relay.publish(share.topic, JSON.stringify(env))
    }
    // An attacker claiming to be the host with their own key fails the fingerprint check too.
    const grant = await signEnvelope(share.topic, attacker, { k: 'g', ts: 1, gs: 50, eds: [attacker.pub] })
    await relay.publish(share.topic, JSON.stringify(grant))
    const again = parts.map((_, i) => signEnvelope(share.topic, attacker, { k: 's', ts: Date.now(), rev: 1000, i, n: parts.length, d: parts[i]! }))
    for (const e of await Promise.all(again)) await relay.publish(share.topic, JSON.stringify(await e))
    await tick()
    await new Promise((r) => setTimeout(r, 50))
    expect(seen).toHaveLength(1)
    expect(seen[0]!.tournament.name).toBe('LAN Finals')
    host.stop()
    guest.stop()
  })

  it('an editor works only after the host grants the key, and loses access when revoked', async () => {
    const { relay, hostKeys, share } = await setup()
    const editorKeys = await generateKeys()
    const host = new SyncSession({ transport: relay, share, role: 'host', keys: hostKeys, debounceMs: 0 })
    const hostSeen: RemoteState[] = []
    ;(host as unknown as { o: { onState: (s: RemoteState) => void } }).o.onState = (s) => hostSeen.push(s)
    host.start()
    const t0 = make(8)
    host.publish(t0)
    await host.flush()

    const viewerSeen: RemoteState[] = []
    const guest = new SyncSession({ transport: relay, share, role: 'guest', onState: (s) => viewerSeen.push(s) })
    guest.start()
    await until(() => viewerSeen.length === 1)

    const editor = new SyncSession({ transport: relay, share, role: 'editor', keys: editorKeys, debounceMs: 0 })
    editor.start()
    await until(() => editor.collector.rev >= 1)

    // Not granted yet: the edit is ignored by the viewer.
    const t1 = play(t0, 1)
    editor.publish(t1)
    await editor.flush()
    await new Promise((r) => setTimeout(r, 40))
    expect(viewerSeen).toHaveLength(1)

    // Grant: the same already-published edit becomes valid.
    await host.setEditors([editorKeys.pub])
    await until(() => viewerSeen.length === 2)
    expect(Object.keys(viewerSeen[1]!.tournament.results)).toHaveLength(1)
    expect(viewerSeen[1]!.byHost).toBe(false)
    await until(() => hostSeen.some((s) => !s.byHost))

    // Revoke: later edits by that key are ignored again.
    await host.setEditors([])
    await new Promise((r) => setTimeout(r, 20))
    const t2 = play(t1, 1)
    editor.publish(t2)
    await editor.flush()
    await new Promise((r) => setTimeout(r, 50))
    const last = viewerSeen[viewerSeen.length - 1]!
    expect(Object.keys(last.tournament.results).length).toBeLessThan(2)
    host.stop()
    guest.stop()
    editor.stop()
  })

  it('only the host can manage editors', async () => {
    const { relay, share } = await setup()
    const keys = await generateKeys()
    const editor = new SyncSession({ transport: relay, share, role: 'editor', keys })
    await expect(editor.setEditors([keys.pub])).rejects.toThrow()
  })

  it('reports relay rate limits instead of throwing', async () => {
    const { relay, hostKeys, share } = await setup()
    const statuses: string[] = []
    const oks: boolean[] = []
    const host = new SyncSession({ transport: relay, share, role: 'host', keys: hostKeys, debounceMs: 0, onStatus: (s) => statuses.push(s), onPublish: (ok) => oks.push(ok) })
    relay.failPublish = true
    host.publish(make(4))
    await host.flush()
    expect(statuses).toContain('limited')
    expect(oks).toEqual([false])
  })

  it('the collector ignores a tampered chunk but keeps the previous valid state', async () => {
    const { hostKeys, share } = await setup()
    const c = new Collector(share)
    const t = make(8)
    const parts = chunkText(await packState(t))
    let last: RemoteState | null = null
    for (let i = 0; i < parts.length; i++) {
      const env = await signEnvelope(share.topic, hostKeys, { k: 's', ts: 1, rev: 1, i, n: parts.length, d: parts[i]! })
      last = (await c.ingest(JSON.stringify(env))) ?? last
    }
    expect(last?.rev).toBe(1)
    const good = await signEnvelope(share.topic, hostKeys, { k: 's', ts: 2, rev: 2, i: 0, n: 1, d: parts[0]! })
    const tampered = { ...good, d: parts[0]!.slice(0, -1) + (parts[0]!.endsWith('A') ? 'B' : 'A') }
    expect(await c.ingest(JSON.stringify(tampered))).toBeNull()
    expect(c.rev).toBe(1)
  })
})
