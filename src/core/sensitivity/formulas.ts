import type { SensitivityFormula } from './types'

/** Centimetres per inch. */
export const CM_PER_INCH = 2.54

/**
 * Degrees of rotation produced by one mouse count at the given in-game sensitivity.
 * The value is independent of DPI.
 */
export function degreesPerCount(formula: SensitivityFormula, sensitivity: number): number {
  switch (formula.kind) {
    case 'linear':
      return formula.yaw * sensitivity
  }
}

/** Inverse of {@link degreesPerCount}: the sensitivity that produces `degrees` per count. */
export function sensitivityForDegreesPerCount(formula: SensitivityFormula, degrees: number): number {
  switch (formula.kind) {
    case 'linear':
      return degrees / formula.yaw
  }
}

/**
 * Yaw (degrees/count at sens 1) implied by a measurement the user made in-game.
 * Used to calibrate games that have no known constant.
 */
export function yawFromMeasurement(sensitivity: number, dpi: number, cm360: number): number {
  return (360 * CM_PER_INCH) / (cm360 * dpi * sensitivity)
}
