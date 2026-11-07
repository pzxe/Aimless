import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  MAX_EDITORS,
  fingerprint,
  formatShareId,
  generateKeys,
  isPub,
  newTopic,
  parseShareId,
  type KeyPair,
  type LiveStatus,
  type ShareId,
  type ShareRole,
} from '@/services/tournamentSync'
import { persistStorage, STORAGE_KEYS } from '@/utils/storage'

export interface EditorGrant {
  id: string
  label: string
  keys: KeyPair
  createdAt: number
}

/** Local, never exported: the keys that give this device its role on a shared tournament. */
export interface ShareRecord {
  tournamentId: string
  share: ShareId
  role: Exclude<ShareRole, 'guest'>
  keys: KeyPair
  /** Host only. */
  editors: EditorGrant[]
  /** Host only: last grant sequence used. */
  grantSeq: number
  createdAt: number
}

interface ShareState {
  shares: Record<string, ShareRecord>
  startHosting: (tournamentId: string) => Promise<ShareRecord>
  addEditor: (tournamentId: string, label: string) => Promise<EditorGrant | null>
  revokeEditor: (tournamentId: string, editorId: string) => void
  /** Join somebody else's tournament as an editor (the tournament itself is added to the list by the caller). */
  joinAsEditor: (tournamentId: string, share: ShareId, keys: KeyPair) => void
  stop: (tournamentId: string) => void
  bumpGrantSeq: (tournamentId: string, gs: number) => void
}

const rid = () => Math.random().toString(36).slice(2, 10)

export const useShares = create<ShareState>()(
  persist(
    (set, get) => ({
      shares: {},
      startHosting: async (tournamentId) => {
        const existing = get().shares[tournamentId]
        if (existing) return existing
        const keys = await generateKeys()
        const record: ShareRecord = {
          tournamentId,
          share: { topic: newTopic(), fp: await fingerprint(keys.pub) },
          role: 'host',
          keys,
          editors: [],
          grantSeq: 0,
          createdAt: Date.now(),
        }
        set((s) => ({ shares: { ...s.shares, [tournamentId]: record } }))
        return record
      },
      addEditor: async (tournamentId, label) => {
        const rec = get().shares[tournamentId]
        if (!rec || rec.role !== 'host' || rec.editors.length >= MAX_EDITORS) return null
        const grant: EditorGrant = { id: rid(), label: label.trim().slice(0, 30) || 'Editor', keys: await generateKeys(), createdAt: Date.now() }
        set((s) => {
          const cur = s.shares[tournamentId]
          return cur ? { shares: { ...s.shares, [tournamentId]: { ...cur, editors: [...cur.editors, grant] } } } : s
        })
        return grant
      },
      revokeEditor: (tournamentId, editorId) =>
        set((s) => {
          const rec = s.shares[tournamentId]
          if (!rec || rec.role !== 'host') return s
          return { shares: { ...s.shares, [tournamentId]: { ...rec, editors: rec.editors.filter((e) => e.id !== editorId) } } }
        }),
      joinAsEditor: (tournamentId, share, keys) =>
        set((s) => ({
          shares: { ...s.shares, [tournamentId]: { tournamentId, share, role: 'editor', keys, editors: [], grantSeq: 0, createdAt: Date.now() } },
        })),
      stop: (tournamentId) =>
        set((s) => {
          const rest = { ...s.shares }
          delete rest[tournamentId]
          return { shares: rest }
        }),
      bumpGrantSeq: (tournamentId, gs) =>
        set((s) => {
          const rec = s.shares[tournamentId]
          return rec && rec.grantSeq !== gs ? { shares: { ...s.shares, [tournamentId]: { ...rec, grantSeq: gs } } } : s
        }),
    }),
    {
      name: STORAGE_KEYS.shares,
      storage: persistStorage,
      version: 1,
      partialize: (s) => ({ shares: s.shares }),
      merge: (persisted, current) => {
        const raw = (persisted as { shares?: unknown })?.shares
        const shares: Record<string, ShareRecord> = {}
        if (raw && typeof raw === 'object') {
          for (const [k, v] of Object.entries(raw as Record<string, unknown>).slice(0, 100)) {
            const r = v as Partial<ShareRecord> | null
            const share = r && typeof r.share === 'object' && r.share ? parseShareId(formatShareId(r.share as ShareId)) : null
            if (!r || !share || (r.role !== 'host' && r.role !== 'editor') || !isPub(r.keys?.pub) || typeof r.keys?.priv !== 'string') continue
            shares[k] = {
              tournamentId: k,
              share,
              role: r.role,
              keys: { pub: r.keys.pub, priv: r.keys.priv },
              editors: Array.isArray(r.editors)
                ? r.editors
                    .filter((e) => e && isPub(e.keys?.pub) && typeof e.keys?.priv === 'string')
                    .slice(0, MAX_EDITORS)
                    .map((e) => ({ id: String(e.id).slice(0, 16), label: String(e.label).slice(0, 30), keys: e.keys, createdAt: Number(e.createdAt) || 0 }))
                : [],
              grantSeq: Number.isInteger(r.grantSeq) ? (r.grantSeq as number) : 0,
              createdAt: Number(r.createdAt) || 0,
            }
          }
        }
        return { ...current, shares }
      },
    },
  ),
)

/** Connection state of each live tournament on this device (not persisted). */
export interface LiveInfo {
  status: LiveStatus
  /** Last time a state arrived from or was sent to the relay. */
  lastSync: number | null
  /** The relay refused or failed the last publish. */
  publishError: boolean
}

export const useLiveStatus = create<{
  info: Record<string, LiveInfo>
  set: (id: string, patch: Partial<LiveInfo>) => void
  clear: (id: string) => void
}>()((set) => ({
  info: {},
  set: (tid, patch) => set((s) => ({ info: { ...s.info, [tid]: { status: 'connecting', lastSync: null, publishError: false, ...s.info[tid], ...patch } } })),
  clear: (tid) =>
    set((s) => {
      const rest = { ...s.info }
      delete rest[tid]
      return { info: rest }
    }),
}))
