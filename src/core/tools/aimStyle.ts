/**
 * Rough aim-style bands by cm/360°. These are common community rules of thumb,
 * not a measure of skill.
 */
export type AimStyle = 'wrist' | 'hybrid' | 'arm'

export const AIM_STYLE_BOUNDS = { wristMax: 25, hybridMax: 40 } as const
/** Range shown on the meter. */
export const AIM_METER_RANGE = { min: 10, max: 70 } as const

export function classifyAimStyle(cm360: number): AimStyle | null {
  if (!(cm360 > 0) || !Number.isFinite(cm360)) return null
  if (cm360 < AIM_STYLE_BOUNDS.wristMax) return 'wrist'
  if (cm360 <= AIM_STYLE_BOUNDS.hybridMax) return 'hybrid'
  return 'arm'
}

/** 0–1 position of a cm/360° value on the meter, clamped. */
export function aimMeterPosition(cm360: number): number {
  const { min, max } = AIM_METER_RANGE
  if (!Number.isFinite(cm360)) return 0
  return Math.min(1, Math.max(0, (cm360 - min) / (max - min)))
}
