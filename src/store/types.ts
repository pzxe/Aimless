import type { ResultAccuracy } from '@/core/sensitivity'

export type Language = 'en' | 'ar'
export type Theme = 'dark' | 'light' | 'system'
export type FovDisplay = 'horizontal' | 'vertical'

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
