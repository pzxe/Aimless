import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { persistStorage, STORAGE_KEYS } from '@/utils/storage'

/** The result of the Live Sensor Calibrator: the real usable size of the player's pad. */
export interface PadCalibration {
  widthCm: number
  heightCm: number
  at: number
  /** The DPI the counts were converted with. */
  dpi: number
  /** True when the system reported raw (unaccelerated) movement; false means OS pointer settings may skew the numbers. */
  raw: boolean
  /** Coarse map of where the sweeps went (0..255 per cell, row by row). */
  cols: number
  rows: number
  heat: number[]
}

interface CalibrationState {
  cal: PadCalibration | null
  save: (c: PadCalibration) => void
  clear: () => void
}

const finite = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi

/** Stored data is untrusted: only a well-formed calibration is accepted. */
export function sanitizeCalibration(raw: unknown): PadCalibration | null {
  const c = raw as Partial<PadCalibration> | null
  if (!c || typeof c !== 'object') return null
  if (!finite(c.widthCm, 3, 400) || !finite(c.heightCm, 3, 300) || !finite(c.at, 0, 8.64e15) || !finite(c.dpi, 1, 64000)) return null
  const cols = Number.isInteger(c.cols) && c.cols! >= 1 && c.cols! <= 64 ? c.cols! : 24
  const rows = Number.isInteger(c.rows) && c.rows! >= 1 && c.rows! <= 64 ? c.rows! : 16
  const heat = Array.isArray(c.heat) && c.heat.length === cols * rows && c.heat.every((v) => finite(v, 0, 255)) ? c.heat : new Array<number>(cols * rows).fill(0)
  return { widthCm: c.widthCm, heightCm: c.heightCm, at: c.at, dpi: c.dpi, raw: c.raw === true, cols, rows, heat }
}

export const usePadCalibration = create<CalibrationState>()(
  persist(
    (set) => ({
      cal: null,
      save: (cal) => set({ cal }),
      clear: () => set({ cal: null }),
    }),
    {
      name: STORAGE_KEYS.padCalibration,
      storage: persistStorage,
      version: 1,
      merge: (persisted, current) => ({ ...current, cal: sanitizeCalibration((persisted as { cal?: unknown } | undefined)?.cal) }),
    },
  ),
)
