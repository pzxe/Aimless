import { useEffect, useState } from 'react'
import type { Tournament } from '@/core/tournament'
import { useLiveStatus, useShares, type ShareRecord } from '@/store/shareStore'
import { useTournaments } from '@/store/tournamentStore'
import { NtfyTransport, SyncSession, type LiveStatus, type RemoteState, type ShareId, type Transport } from './tournamentSync'

const HEARTBEAT_MS = 3 * 60 * 60 * 1000
const transport: Transport = new NtfyTransport()

interface Running {
  session: SyncSession
  record: ShareRecord
  lastJson: string
  appliedRev: number
  signature: string
  editorKeys: string
}

const running = new Map<string, Running>()

const signatureOf = (r: ShareRecord) => `${r.share.topic}|${r.role}|${r.keys.pub}`
const editorKeysOf = (r: ShareRecord) => r.editors.map((e) => e.keys.pub).sort().join(',')

function startSession(record: ShareRecord) {
  const tid = record.tournamentId
  const live = useLiveStatus.getState()
  const session = new SyncSession({
    transport,
    share: record.share,
    role: record.role,
    keys: record.keys,
    editors: record.editors.map((e) => e.keys.pub),
    grantSeq: record.grantSeq,
    onStatus: (status) => live.set(tid, { status }),
    onPublish: (ok) => live.set(tid, ok ? { lastSync: Date.now(), publishError: false } : { publishError: true }),
    onState: (state) => applyRemote(tid, state),
  })
  const entry: Running = { record, session, lastJson: '', appliedRev: 0, signature: signatureOf(record), editorKeys: editorKeysOf(record) }
  running.set(tid, entry)
  live.set(tid, { status: 'connecting' })
  session.start()
  const t = useTournaments.getState().tournaments.find((x) => x.id === tid)
  if (t) {
    entry.lastJson = JSON.stringify(t)
    session.seed(t)
  }
  if (record.role === 'host') {
    void session
      .announce()
      .then(() => useShares.getState().bumpGrantSeq(tid, session.grantSeq))
      .catch(() => {})
    // If the relay holds nothing for this topic once its history has replayed (first start, or expired), publish ours.
    setTimeout(() => {
      const local = useTournaments.getState().tournaments.find((x) => x.id === tid)
      if (running.get(tid) === entry && local && session.collector.rev === 0) session.publish(local)
    }, 2500)
  }
}

function applyRemote(tid: string, state: RemoteState) {
  const entry = running.get(tid)
  if (!entry) return
  useLiveStatus.getState().set(tid, { lastSync: Date.now() })
  // Our own messages echo back through the relay: never let them overwrite newer local edits.
  if (state.by === entry.record.keys.pub) return
  if (state.rev <= entry.appliedRev) return
  entry.appliedRev = state.rev
  const next: Tournament = { ...state.tournament, id: tid }
  const json = JSON.stringify(next)
  if (json === entry.lastJson) return
  entry.lastJson = json
  useTournaments.getState().applyRemote(next)
}

function reconcile() {
  const shares = useShares.getState().shares
  for (const [tid, r] of running) {
    const rec = shares[tid]
    if (!rec || r.signature !== signatureOf(rec)) {
      r.session.stop()
      running.delete(tid)
      useLiveStatus.getState().clear(tid)
    } else r.record = rec
  }
  for (const rec of Object.values(shares)) if (!running.has(rec.tournamentId)) startSession(rec)
  // The host changed the editor list: publish a new grant and the current state so revoked keys drop out.
  for (const [tid, r] of running) {
    if (r.record.role !== 'host') continue
    const keys = editorKeysOf(r.record)
    if (keys === r.editorKeys) continue
    r.editorKeys = keys
    void r.session
      .setEditors(r.record.editors.map((e) => e.keys.pub))
      .then(() => {
        useShares.getState().bumpGrantSeq(tid, r.session.grantSeq)
        const t = useTournaments.getState().tournaments.find((x) => x.id === tid)
        if (t) r.session.publish(t)
      })
      .catch(() => {})
  }
}

function onTournaments() {
  const list = useTournaments.getState().tournaments
  for (const [tid, r] of running) {
    const t = list.find((x) => x.id === tid)
    if (!t) {
      // Deleted locally: stop sharing it from this device.
      queueMicrotask(() => useShares.getState().stop(tid))
      continue
    }
    const json = JSON.stringify(t)
    if (json === r.lastJson) continue
    r.lastJson = json
    r.session.publish(t)
  }
}

/** Starts the background sync for every shared tournament on this device. Returns a cleanup function. */
export function startLiveRuntime(): () => void {
  reconcile()
  const u1 = useShares.subscribe(reconcile)
  const u2 = useTournaments.subscribe(onTournaments)
  const heartbeat = setInterval(() => {
    for (const r of running.values()) if (r.record.role === 'host') void r.session.resend()
  }, HEARTBEAT_MS)
  return () => {
    u1()
    u2()
    clearInterval(heartbeat)
    for (const r of running.values()) r.session.stop()
    running.clear()
  }
}

/** Read-only live subscription for the viewer and OBS pages (nothing is stored on this device). */
export function useLiveTournament(share: ShareId | null): { tournament: Tournament | null; status: LiveStatus; lastUpdate: number | null; rev: number } {
  const [state, setState] = useState<{ tournament: Tournament | null; lastUpdate: number | null; rev: number }>({ tournament: null, lastUpdate: null, rev: 0 })
  const [status, setStatus] = useState<LiveStatus>('connecting')
  const topic = share?.topic
  const fp = share?.fp
  useEffect(() => {
    if (!topic || !fp) return
    const session = new SyncSession({
      transport,
      share: { topic, fp },
      role: 'guest',
      onStatus: setStatus,
      onState: (s) => setState({ tournament: s.tournament, lastUpdate: s.ts, rev: s.rev }),
    })
    session.start()
    return () => session.stop()
  }, [topic, fp])
  return { ...state, status }
}
