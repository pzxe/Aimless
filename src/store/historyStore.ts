import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { isKnownGame } from '@/core/sensitivity'
import { createId } from '@/utils/id'
import { persistStorage, STORAGE_KEYS } from '@/utils/storage'
import type { HistoryEntry } from './types'

const LIMIT = 50
/** Edits to the same game pair within this window update the latest entry instead of adding one. */
const COALESCE_MS = 60_000

interface HistoryState {
  entries: HistoryEntry[]
  record: (entry: Omit<HistoryEntry, 'id' | 'at'>) => void
  remove: (id: string) => void
  clear: () => void
}

export const useHistory = create<HistoryState>()(
  persist(
    (set) => ({
      entries: [],
      record: (entry) =>
        set((s) => {
          const now = Date.now()
          const last = s.entries[0]
          const identical =
            last &&
            last.sourceGameId === entry.sourceGameId &&
            last.targetGameId === entry.targetGameId &&
            last.sourceSensitivity === entry.sourceSensitivity &&
            last.sourceDpi === entry.sourceDpi &&
            last.targetDpi === entry.targetDpi
          if (identical) return s
          const coalesce =
            last &&
            now - last.at < COALESCE_MS &&
            last.sourceGameId === entry.sourceGameId &&
            last.targetGameId === entry.targetGameId
          const next: HistoryEntry = { ...entry, id: coalesce ? last.id : createId(), at: now }
          const rest = coalesce ? s.entries.slice(1) : s.entries
          return { entries: [next, ...rest].slice(0, LIMIT) }
        }),
      remove: (id) => set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
      clear: () => set({ entries: [] }),
    }),
    {
      name: STORAGE_KEYS.history,
      storage: persistStorage,
      version: 1,
      merge: (persisted, current) => {
        const raw = (persisted as { entries?: unknown })?.entries
        const valid = (e: unknown): e is HistoryEntry => {
          if (!e || typeof e !== 'object') return false
          const h = e as Record<string, unknown>
          const pos = (k: string) => typeof h[k] === 'number' && (h[k] as number) > 0 && Number.isFinite(h[k])
          return (
            typeof h.id === 'string' &&
            typeof h.sourceGameId === 'string' && isKnownGame(h.sourceGameId) &&
            typeof h.targetGameId === 'string' && isKnownGame(h.targetGameId) &&
            ['at', 'sourceSensitivity', 'sourceDpi', 'targetDpi', 'targetSensitivity', 'cm360'].every(pos) &&
            ['verified', 'approximate', 'calibrated'].includes(h.accuracy as string)
          )
        }
        return { ...current, entries: Array.isArray(raw) ? raw.filter(valid).slice(0, LIMIT) : [] }
      },
    },
  ),
)
