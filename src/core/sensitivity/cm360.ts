import { CM_PER_INCH } from './formulas'

/**
 * Physical mouse travel for a full 360° turn.
 *
 *   counts per 360  = 360 / degreesPerCount
 *   inches per 360  = counts per 360 / DPI
 *   cm per 360      = inches × 2.54
 */
export function inchesPer360(degreesPerCount: number, dpi: number): number {
  return 360 / (degreesPerCount * dpi)
}

export function cmPer360(degreesPerCount: number, dpi: number): number {
  return inchesPer360(degreesPerCount, dpi) * CM_PER_INCH
}

/** Degrees per count required to reach a given cm/360 at a given DPI. */
export function degreesPerCountForCm360(cm360: number, dpi: number): number {
  return (360 * CM_PER_INCH) / (cm360 * dpi)
}
