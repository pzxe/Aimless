import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  clearResult,
  createTournament,
  randomizeSeeds,
  setSeriesLength,
  renameRound,
  reportResult,
  reseed,
  sanitizeTournament,
  type BracketSide,
  type GameInput,
  type StageKey,
  type NewTournamentInput,
  type Result,
  type Tournament,
} from '@/core/tournament'
import { persistStorage, STORAGE_KEYS } from '@/utils/storage'

const LIMIT = 50

interface TournamentState {
  tournaments: Tournament[]
  create: (input: NewTournamentInput) => Result<Tournament>
  add: (t: Tournament) => void
  remove: (id: string) => void
  duplicate: (id: string, suffix: string) => Tournament | undefined
  report: (id: string, matchId: string, score: [number, number], note?: string, games?: GameInput[]) => Result<Tournament>
  /** Shuffle the seeds into a fresh random bracket (clears results). */
  randomize: (id: string) => void
  setSeries: (id: string, stage: StageKey | null, bestOf: number | null) => Result<Tournament>
  clearMatch: (id: string, matchId: string) => void
  renameRound: (id: string, side: BracketSide, round: number, label: string) => void
  rename: (id: string, name: string) => void
  reseed: (id: string, order: string[]) => Result<Tournament>
}

export const useTournaments = create<TournamentState>()(
  persist(
    (set, get) => {
      const replace = (t: Tournament) => set((s) => ({ tournaments: s.tournaments.map((x) => (x.id === t.id ? t : x)) }))
      const find = (id: string) => get().tournaments.find((t) => t.id === id)
      return {
        tournaments: [],
        create: (input) => {
          const r = createTournament(input)
          if (r.ok) set((s) => ({ tournaments: [r.value, ...s.tournaments].slice(0, LIMIT) }))
          return r
        },
        add: (t) => set((s) => ({ tournaments: [t, ...s.tournaments].slice(0, LIMIT) })),
        remove: (id) => set((s) => ({ tournaments: s.tournaments.filter((t) => t.id !== id) })),
        duplicate: (id, suffix) => {
          const t = find(id)
          if (!t) return undefined
          const r = sanitizeTournament({ ...t, name: `${t.name} ${suffix}`.slice(0, 80), results: {} })
          if (!r.ok) return undefined
          set((s) => ({ tournaments: [r.value, ...s.tournaments].slice(0, LIMIT) }))
          return r.value
        },
        report: (id, matchId, score, note, games) => {
          const t = find(id)
          if (!t) return { ok: false, error: 'unknown_match' }
          const r = reportResult(t, matchId, score, note, Date.now(), games)
          if (r.ok) replace(r.value)
          return r
        },
        randomize: (id) => {
          const t = find(id)
          if (t) replace(randomizeSeeds(t))
        },
        setSeries: (id, stage, bestOf) => {
          const t = find(id)
          if (!t) return { ok: false, error: 'unknown_match' }
          const r = setSeriesLength(t, stage, bestOf)
          if (r.ok) replace(r.value)
          return r
        },
        clearMatch: (id, matchId) => {
          const t = find(id)
          if (t) replace(clearResult(t, matchId))
        },
        renameRound: (id, side, round, label) => {
          const t = find(id)
          if (t) replace(renameRound(t, side, round, label))
        },
        rename: (id, name) => {
          const t = find(id)
          const clean = name.trim().slice(0, 80)
          if (t && clean) replace({ ...t, name: clean, updatedAt: Date.now() })
        },
        reseed: (id, order) => {
          const t = find(id)
          if (!t) return { ok: false, error: 'unknown_match' }
          const r = reseed(t, order)
          if (r.ok) replace(r.value)
          return r
        },
      }
    },
    {
      name: STORAGE_KEYS.tournaments,
      storage: persistStorage,
      version: 1,
      partialize: (s) => ({ tournaments: s.tournaments }),
      merge: (persisted, current) => {
        const raw = (persisted as { tournaments?: unknown })?.tournaments
        const tournaments: Tournament[] = []
        if (Array.isArray(raw)) {
          for (const item of raw.slice(0, LIMIT)) {
            const r = sanitizeTournament(item, { keepIds: true })
            if (r.ok && !tournaments.some((t) => t.id === r.value.id)) tournaments.push(r.value)
          }
        }
        return { ...current, tournaments }
      },
    },
  ),
)
