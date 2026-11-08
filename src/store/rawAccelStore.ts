import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  DEFAULT_PARAMS,
  HISTORY_LIMIT,
  sanitizeParams,
  type HandStyle,
  type HistoryItem,
  type PresetId,
  type RawAccelParams,
} from '@/services/rawAccelEngine'
import type { ReplicaTheme } from '@/services/rawAccelRender'
import { persistStorage, STORAGE_KEYS } from '@/utils/storage'

export type PadSize = 'small' | 'medium' | 'large' | 'xl'

export interface RawAccelForm {
  dpi: number
  pollingRate: number
  gameId: string
  gameSens: string
  preset: PresetId
  hand: HandStyle
  pad: PadSize
  params: RawAccelParams
  notes: string
  name: string
  theme: ReplicaTheme
  /** True once the game and sensitivity were seeded from the Converter (first visit only). */
  seeded: boolean
}

interface RawAccelState extends RawAccelForm {
  history: HistoryItem[]
  /** Ids of history entries drawn as ghost curves (not persisted). */
  compare: string[]
  patch: (p: Partial<RawAccelForm>) => void
  setHistory: (h: HistoryItem[]) => void
  toggleCompare: (id: string) => void
}

export const initialForm: RawAccelForm = {
  dpi: 800,
  pollingRate: 1000,
  gameId: 'valorant',
  gameSens: '0.6',
  preset: 'tactical',
  hand: 'hybrid',
  pad: 'large',
  params: { ...DEFAULT_PARAMS },
  notes: '',
  name: '',
  theme: 'dark',
  seeded: false,
}

const num = (v: unknown, lo: number, hi: number, fb: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fb)

export const useRawAccel = create<RawAccelState>()(
  persist(
    (set) => ({
      ...initialForm,
      history: [],
      compare: [],
      patch: (p) => set(p),
      setHistory: (history) => set((s) => ({ history, compare: s.compare.filter((id) => history.some((h) => h.id === id)) })),
      toggleCompare: (id) => set((s) => ({ compare: s.compare.includes(id) ? s.compare.filter((x) => x !== id) : [...s.compare.slice(-2), id] })),
    }),
    {
      name: STORAGE_KEYS.rawAccel,
      storage: persistStorage,
      version: 1,
      partialize: (s) => {
        const { patch: _a, setHistory: _b, toggleCompare: _c, compare: _d, ...rest } = s
        return rest
      },
      // Stored data is untrusted: re-validate on load.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<RawAccelState>
        const history = Array.isArray(p.history)
          ? p.history
              .filter((h) => !!h && typeof h.id === 'string' && !!h.config && typeof h.config === 'object')
              .slice(0, HISTORY_LIMIT + 20)
              .map((h) => ({
                ...h,
                name: String(h.name ?? '').slice(0, 80),
                pinned: h.pinned === true,
                config: { ...h.config, params: sanitizeParams(h.config.params) },
              }))
          : []
        return {
          ...current,
          dpi: num(p.dpi, 50, 32000, current.dpi),
          pollingRate: num(p.pollingRate, 125, 8000, current.pollingRate),
          gameId: typeof p.gameId === 'string' ? p.gameId.slice(0, 40) : current.gameId,
          gameSens: typeof p.gameSens === 'string' ? p.gameSens.slice(0, 16) : current.gameSens,
          preset: p.preset === 'tracking' || p.preset === 'hybrid' ? p.preset : 'tactical',
          hand: p.hand === 'wrist' || p.hand === 'arm' ? p.hand : 'hybrid',
          pad: p.pad === 'small' || p.pad === 'medium' || p.pad === 'xl' ? p.pad : 'large',
          params: sanitizeParams(p.params),
          notes: typeof p.notes === 'string' ? p.notes.slice(0, 500) : '',
          name: typeof p.name === 'string' ? p.name.slice(0, 80) : '',
          theme: p.theme === 'classic' ? 'classic' : 'dark',
          seeded: p.seeded === true,
          history,
        }
      },
    },
  ),
)
