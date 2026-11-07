// Opt-in: talks to the real public relay. LIVE_RELAY=1 npx vitest run src/services/tournamentSync.live.test.ts
import { describe, expect, it } from 'vitest'
import { createTournament, reportResult, resolveTournament } from '@/core/tournament'
import { NtfyTransport, SyncSession, fingerprint, generateKeys, newTopic, type RemoteState } from './tournamentSync'

const live = !!process.env.LIVE_RELAY

async function until(cond: () => boolean, ms = 20000) {
  const end = Date.now() + ms
  while (!cond()) {
    if (Date.now() > end) throw new Error('timeout')
    await new Promise((r) => setTimeout(r, 100))
  }
}

describe.skipIf(!live)('real relay (ntfy.sh)', () => {
  it('host -> guest -> editor round trip over the internet, with a late joiner', async () => {
    const transport = new NtfyTransport()
    const hostKeys = await generateKeys()
    const editorKeys = await generateKeys()
    const share = { topic: newTopic(), fp: await fingerprint(hostKeys.pub) }
    const made = createTournament({
      name: 'Live Test',
      gameId: null,
      teamSize: 1,
      format: 'double',
      bestOf: 3,
      grandFinalReset: true,
      participants: Array.from({ length: 32 }, (_, i) => ({ name: `Team ${i + 1}` })),
    })
    if (!made.ok) throw new Error('setup')
    let t = made.value

    const host = new SyncSession({ transport, share, role: 'host', keys: hostKeys, editors: [editorKeys.pub], debounceMs: 0 })
    host.start()
    await host.announce()
    host.publish(t)
    await host.flush()

    const seen: RemoteState[] = []
    const t0 = Date.now()
    const guest = new SyncSession({ transport, share, role: 'guest', onState: (s) => seen.push(s) })
    guest.start()
    await until(() => seen.length >= 1)
    console.log(`guest got the first state after ${Date.now() - t0} ms (32-team double elimination)`)
    expect(seen[0]!.tournament.participants).toHaveLength(32)

    // Live update from the host.
    const ready = [...resolveTournament(t).matches.values()].find((m) => m.status === 'ready')!
    const r = reportResult(t, ready.def.id, [2, 1], undefined, Date.now())
    if (!r.ok) throw new Error('report')
    t = r.value
    const before = seen.length
    const t1 = Date.now()
    host.publish(t)
    await host.flush()
    await until(() => seen.length > before && Object.keys(seen[seen.length - 1]!.tournament.results).length === 1)
    console.log(`guest saw the host score after ${Date.now() - t1} ms`)

    // Editor edits; guest sees it.
    const editor = new SyncSession({ transport, share, role: 'editor', keys: editorKeys, debounceMs: 0 })
    editor.start()
    await until(() => editor.collector.rev >= 2)
    const ready2 = [...resolveTournament(t).matches.values()].find((m) => m.status === 'ready')!
    const r2 = reportResult(t, ready2.def.id, [2, 0], undefined, Date.now())
    if (!r2.ok) throw new Error('report')
    const t2 = Date.now()
    editor.publish(r2.value)
    await editor.flush()
    await until(() => Object.keys(seen[seen.length - 1]!.tournament.results).length === 2)
    console.log(`guest saw the editor score after ${Date.now() - t2} ms`)
    expect(seen[seen.length - 1]!.byHost).toBe(false)

    // Late joiner gets the newest state from the relay history.
    const late: RemoteState[] = []
    const lateGuest = new SyncSession({ transport, share, role: 'guest', onState: (s) => late.push(s) })
    lateGuest.start()
    await until(() => late.length > 0 && Object.keys(late[late.length - 1]!.tournament.results).length === 2)

    for (const s of [host, guest, editor, lateGuest]) s.stop()
  }, 90000)
})
