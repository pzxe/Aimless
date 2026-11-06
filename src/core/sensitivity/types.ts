/**
 * Core types for the sensitivity engine. This module has no UI dependencies.
 */

/**
 * How trustworthy a game's conversion data is.
 * - verified:    constant is widely documented and consistent across independent sources.
 * - approximate: constant comes from limited community measurement, or the game has
 *                settings that can change effective rotation. Results should be checked in-game.
 * - unsupported: no reliable constant is known. The engine will not invent one; the user
 *                can supply a calibrated yaw instead.
 */
export type Accuracy = 'verified' | 'approximate' | 'unsupported'

/** Accuracy of a concrete conversion result, which can also come from user calibration. */
export type ResultAccuracy = Accuracy | 'calibrated'

export type FovType = 'horizontal' | 'vertical' | 'horizontal-4:3'

export interface FovInfo {
  /** Default FOV value as the game displays it. */
  default: number
  /** What the displayed number measures. */
  type: FovType
  min?: number
  max?: number
  /** True when the game does not let the player change FOV. */
  fixed?: boolean
}

/**
 * A sensitivity formula maps an in-game sensitivity value to degrees of rotation per
 * mouse count, and back. Keeping both directions lets future non-linear games
 * (e.g. exponential sliders) plug in without changing the converter.
 */
export interface LinearFormula {
  kind: 'linear'
  /** Degrees of horizontal rotation per mouse count at sensitivity 1. */
  yaw: number
}

export type SensitivityFormula = LinearFormula

export interface GameDefinition {
  id: string
  name: string
  /** Short text badge used instead of copyrighted artwork. */
  short: string
  /** Badge color (hex). Original, not a brand color requirement. */
  color: string
  /** Formula, or null when no reliable constant is known. */
  formula: SensitivityFormula | null
  accuracy: Accuracy
  /** Human readable description of the in-game value (e.g. "Mouse sensitivity", "X-axis %"). */
  scaleLabel: string
  /** Smallest step the game accepts, when known. Used to show the nearest settable value. */
  sensitivityStep?: number
  /**
   * True when the in-game slider is known to be non-linear. A single-point user
   * calibration is then only accurate close to the measured value.
   */
  nonLinearSlider?: boolean
  /** True if eDPI (DPI × sens) can be compared with other games that share the same yaw. */
  edpiComparable: boolean
  fov?: FovInfo
  /** Engine/family label, for grouping games that share a yaw. */
  engine?: string
  /** Release status notes, e.g. a shut-down game. */
  status?: 'active' | 'discontinued'
  /** i18n key of the note explaining this game's data. */
  noteKey: string
}

export interface ConversionInput {
  sourceGameId: string
  sourceSensitivity: number
  sourceDpi: number
  targetGameId: string
  targetDpi: number
}

/** User-supplied yaw values (degrees/count at sens 1), keyed by game id. */
export type CalibrationMap = Record<string, number>

export type ValidationCode =
  | 'dpi_required'
  | 'dpi_not_positive'
  | 'dpi_too_high'
  | 'sens_required'
  | 'sens_not_positive'
  | 'sens_too_high'
  | 'unknown_game'

export interface ValidationIssue {
  field: 'sourceDpi' | 'targetDpi' | 'sourceSensitivity' | 'sourceGameId' | 'targetGameId'
  code: ValidationCode
}

export interface SideResult {
  gameId: string
  dpi: number
  sensitivity: number
  /** DPI × sensitivity. Only meaningful across games with the same yaw. */
  edpi: number
  /** Degrees per count at this sensitivity and DPI-independent. */
  degreesPerCount: number
  cm360: number
  inches360: number
  accuracy: ResultAccuracy
}

export type ConversionResult =
  | {
      ok: true
      source: SideResult
      target: SideResult
      /** Nearest value the target game accepts, if it has a known step. */
      targetRounded?: { sensitivity: number; cm360: number; errorPercent: number }
      /** Weakest accuracy of the two sides. */
      accuracy: ResultAccuracy
      /** i18n keys of notes that apply to this conversion. */
      notes: string[]
    }
  | {
      ok: false
      issues: ValidationIssue[]
      /** Game ids that lack a formula (and no calibration). */
      unsupported: string[]
    }
