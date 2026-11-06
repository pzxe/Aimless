import { isKnownGame } from './gameDatabase'
import type { ConversionInput, ValidationCode, ValidationIssue } from './types'

export const LIMITS = {
  dpiMax: 64000,
  sensitivityMax: 100000,
} as const

/** Validate a DPI value; returns an error code or null when valid. */
export function validateDpi(dpi: unknown): ValidationCode | null {
  if (typeof dpi !== 'number' || Number.isNaN(dpi)) return 'dpi_required'
  if (!Number.isFinite(dpi) || dpi > LIMITS.dpiMax) return 'dpi_too_high'
  if (dpi <= 0) return 'dpi_not_positive'
  return null
}

/** Validate a sensitivity value; returns an error code or null when valid. */
export function validateSensitivity(sens: unknown): ValidationCode | null {
  if (typeof sens !== 'number' || Number.isNaN(sens)) return 'sens_required'
  if (!Number.isFinite(sens) || sens > LIMITS.sensitivityMax) return 'sens_too_high'
  if (sens <= 0) return 'sens_not_positive'
  return null
}

export function validateConversionInput(input: ConversionInput): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  if (!isKnownGame(input.sourceGameId)) issues.push({ field: 'sourceGameId', code: 'unknown_game' })
  if (!isKnownGame(input.targetGameId)) issues.push({ field: 'targetGameId', code: 'unknown_game' })
  const s = validateSensitivity(input.sourceSensitivity)
  if (s) issues.push({ field: 'sourceSensitivity', code: s })
  const sd = validateDpi(input.sourceDpi)
  if (sd) issues.push({ field: 'sourceDpi', code: sd })
  const td = validateDpi(input.targetDpi)
  if (td) issues.push({ field: 'targetDpi', code: td })
  return issues
}

/**
 * Parse user-typed numeric text. Accepts "," as decimal separator and Arabic-Indic digits,
 * so values typed on Arabic keyboards work. Returns NaN for empty/invalid input.
 */
export function parseNumber(text: string): number {
  const normalized = text
    .trim()
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/٫/g, '.') // Arabic decimal separator
    .replace(',', '.')
  if (normalized === '' || !/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(normalized)) return Number.NaN
  return Number(normalized)
}
