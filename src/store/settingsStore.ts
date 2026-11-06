import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { isKnownGame, type CalibrationMap } from '@/core/sensitivity'
import { persistStorage, STORAGE_KEYS } from '@/utils/storage'
import type { FovDisplay, Language, Theme } from './types'

export interface SettingsState {
  language: Language
  theme: Theme
  /** Decimal places for displayed sensitivity values. */
  precision: number
  defaultDpi: number
  fovDisplay: FovDisplay
  favoriteGames: string[]
  recentGames: string[]
  /** User-measured yaw values (degrees/count at sens 1). */
  calibrations: CalibrationMap
}

interface SettingsActions {
  set: (patch: Partial<Pick<SettingsState, 'language' | 'theme' | 'precision' | 'defaultDpi' | 'fovDisplay'>>) => void
  toggleFavoriteGame: (id: string) => void
  pushRecentGame: (id: string) => void
  setCalibration: (gameId: string, yaw: number) => void
  removeCalibration: (gameId: string) => void
  reset: () => void
}

export const DEFAULT_SETTINGS: SettingsState = {
  language: 'en',
  theme: 'dark',
  precision: 3,
  defaultDpi: 800,
  fovDisplay: 'horizontal',
  favoriteGames: [],
  recentGames: [],
  calibrations: {},
}

const RECENT_LIMIT = 5

export const useSettings = create<SettingsState & SettingsActions>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      set: (patch) => set(patch),
      toggleFavoriteGame: (id) =>
        set((s) => ({
          favoriteGames: s.favoriteGames.includes(id) ? s.favoriteGames.filter((g) => g !== id) : [...s.favoriteGames, id],
        })),
      pushRecentGame: (id) =>
        set((s) => ({ recentGames: [id, ...s.recentGames.filter((g) => g !== id)].slice(0, RECENT_LIMIT) })),
      setCalibration: (gameId, yaw) =>
        set((s) => (yaw > 0 && Number.isFinite(yaw) ? { calibrations: { ...s.calibrations, [gameId]: yaw } } : s)),
      removeCalibration: (gameId) =>
        set((s) => {
          const next = { ...s.calibrations }
          delete next[gameId]
          return { calibrations: next }
        }),
      reset: () => set({ ...DEFAULT_SETTINGS }),
    }),
    {
      name: STORAGE_KEYS.settings,
      storage: persistStorage,
      version: 1,
      // Guard against corrupted or hand-edited storage.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<SettingsState>
        const calibrations: CalibrationMap = {}
        if (p.calibrations && typeof p.calibrations === 'object') {
          for (const [k, v] of Object.entries(p.calibrations)) {
            if (isKnownGame(k) && typeof v === 'number' && v > 0 && Number.isFinite(v)) calibrations[k] = v
          }
        }
        const ids = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && isKnownGame(x)) : [])
        return {
          ...current,
          language: p.language === 'ar' ? 'ar' : 'en',
          theme: p.theme === 'light' || p.theme === 'system' ? p.theme : 'dark',
          precision: typeof p.precision === 'number' && p.precision >= 0 && p.precision <= 6 ? Math.round(p.precision) : current.precision,
          defaultDpi: typeof p.defaultDpi === 'number' && p.defaultDpi > 0 && p.defaultDpi <= 64000 ? p.defaultDpi : current.defaultDpi,
          fovDisplay: p.fovDisplay === 'vertical' ? 'vertical' : 'horizontal',
          favoriteGames: ids(p.favoriteGames),
          recentGames: ids(p.recentGames).slice(0, RECENT_LIMIT),
          calibrations,
        }
      },
    },
  ),
)
