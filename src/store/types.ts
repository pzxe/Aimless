import type { ResultAccuracy } from '@/core/sensitivity'
import type { MousepadPreset } from '@/core/tools'

export type Language = 'en' | 'ar' | 'es' | 'ru' | 'pt'
export const LANGUAGES: { code: Language; native: string; dir: 'ltr' | 'rtl' }[] = [
  { code: 'en', native: 'English', dir: 'ltr' },
  { code: 'ar', native: 'العربية', dir: 'rtl' },
  { code: 'es', native: 'Español', dir: 'ltr' },
  { code: 'ru', native: 'Русский', dir: 'ltr' },
  { code: 'pt', native: 'Português', dir: 'ltr' },
]
export const isLanguage = (v: unknown): v is Language => LANGUAGES.some((l) => l.code === v)

export type Theme = 'dark' | 'light' | 'system'
export type FovDisplay = 'horizontal' | 'vertical'
export type Units = 'cm' | 'in'
export type MotionPref = 'full' | 'reduced' | 'instant'
export type Density = 'comfortable' | 'compact'
export type Accent = 'crimson' | 'ember' | 'magenta' | 'violet' | 'ice'
export const ACCENTS: { id: Accent; swatch: string }[] = [
  { id: 'crimson', swatch: '#ff2e4d' },
  { id: 'ember', swatch: '#ff6a1f' },
  { id: 'magenta', swatch: '#e040fb' },
  { id: 'violet', swatch: '#8b7cff' },
  { id: 'ice', swatch: '#dfe6f0' },
]
export type StartupView = 'landing' | 'dashboard' | 'converter' | 'tournaments'
export type { MousepadPreset }

export interface Resolution {
  width: number
  height: number
}

export interface Profile {
  id: string
  name: string
  gameId: string
  dpi: number
  sensitivity: number
  resolution?: Resolution
  fov?: number
  notes: string
  favorite: boolean
  createdAt: number
  updatedAt: number
}

export type ProfileDraft = Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>

export interface HistoryEntry {
  id: string
  at: number
  sourceGameId: string
  sourceSensitivity: number
  sourceDpi: number
  targetGameId: string
  targetDpi: number
  targetSensitivity: number
  cm360: number
  accuracy: ResultAccuracy
}
