import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { isKnownGame, type CalibrationMap } from '@/core/sensitivity'
import { isDesktopApp } from '@/utils/platform'
import { persistStorage, STORAGE_KEYS } from '@/utils/storage'
import {
  ACCENTS,
  isLanguage,
  type Accent,
  type Density,
  type FovDisplay,
  type Language,
  type MotionPref,
  type MousepadPreset,
  type StartupView,
  type Theme,
  type Units,
} from './types'

export interface SettingsState {
  language: Language
  theme: Theme
  /** Decimal places for displayed sensitivity values. */
  precision: number
  defaultDpi: number
  fovDisplay: FovDisplay
  units: Units
  mousepad: MousepadPreset
  mousepadCustomCm: number
  motion: MotionPref
  density: Density
  accent: Accent
  startupView: StartupView
  sound: boolean
  /** Desktop app: look for a newer GitHub release 3 seconds after launch. */
  autoCheckUpdates: boolean
  /** Desktop app: download a found update in the background (installing always needs a click). */
  autoDownloadUpdates: boolean
  favoriteGames: string[]
  recentGames: string[]
  /** User-measured yaw values (degrees/count at sens 1). */
  calibrations: CalibrationMap
}

type Preferences = Omit<SettingsState, 'favoriteGames' | 'recentGames' | 'calibrations'>

interface SettingsActions {
  set: (patch: Partial<Preferences>) => void
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
  units: 'cm',
  mousepad: 'large',
  mousepadCustomCm: 60,
  motion: 'full',
  density: 'comfortable',
  accent: 'crimson',
  // The desktop app opens straight into the workspace.
  startupView: isDesktopApp ? 'dashboard' : 'landing',
  sound: false,
  autoCheckUpdates: true,
  autoDownloadUpdates: false,
  favoriteGames: [],
  recentGames: [],
  calibrations: {},
}

export const PREFERENCE_KEYS = [
  'language', 'theme', 'precision', 'defaultDpi', 'fovDisplay', 'units', 'mousepad',
  'mousepadCustomCm', 'motion', 'density', 'accent', 'startupView', 'sound',
  'autoCheckUpdates', 'autoDownloadUpdates',
] as const satisfies readonly (keyof Preferences)[]

const RECENT_LIMIT = 5
const oneOf = <T extends string>(v: unknown, list: readonly T[], fallback: T): T => (list.includes(v as T) ? (v as T) : fallback)

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
      version: 2,
      // Guard against corrupted or hand-edited storage; also upgrades v1 data.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<SettingsState>
        const calibrations: CalibrationMap = {}
        if (p.calibrations && typeof p.calibrations === 'object') {
          for (const [k, v] of Object.entries(p.calibrations)) {
            if (isKnownGame(k) && typeof v === 'number' && v > 0 && Number.isFinite(v)) calibrations[k] = v
          }
        }
        const ids = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && isKnownGame(x)) : [])
        const num = (v: unknown, min: number, max: number, fallback: number) =>
          typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : fallback
        return {
          ...current,
          language: isLanguage(p.language) ? p.language : 'en',
          theme: oneOf(p.theme, ['dark', 'light', 'system'], 'dark'),
          precision: Math.round(num(p.precision, 0, 6, current.precision)),
          defaultDpi: num(p.defaultDpi, 1, 64000, current.defaultDpi),
          fovDisplay: oneOf(p.fovDisplay, ['horizontal', 'vertical'], 'horizontal'),
          units: oneOf(p.units, ['cm', 'in'], 'cm'),
          mousepad: oneOf(p.mousepad, ['small', 'medium', 'large', 'xl', 'custom'], current.mousepad),
          mousepadCustomCm: num(p.mousepadCustomCm, 5, 300, current.mousepadCustomCm),
          motion: oneOf(p.motion, ['full', 'reduced', 'instant'], 'full'),
          density: oneOf(p.density, ['comfortable', 'compact'], 'comfortable'),
          accent: oneOf(p.accent, ACCENTS.map((a) => a.id), current.accent),
          startupView: oneOf(p.startupView, ['landing', 'dashboard', 'converter', 'tournaments'], current.startupView),
          sound: p.sound === true,
          autoCheckUpdates: p.autoCheckUpdates !== false,
          autoDownloadUpdates: p.autoDownloadUpdates === true,
          favoriteGames: ids(p.favoriteGames),
          recentGames: ids(p.recentGames).slice(0, RECENT_LIMIT),
          calibrations,
        }
      },
    },
  ),
)
