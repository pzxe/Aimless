/**
 * Mousepad fit: how a 360° turn compares with the width of a mousepad.
 * Preset widths are typical sizes, not specific products.
 */
export type MousepadPreset = 'small' | 'medium' | 'large' | 'xl' | 'custom'

export const MOUSEPAD_WIDTHS_CM: Record<Exclude<MousepadPreset, 'custom'>, number> = {
  small: 25,
  medium: 35,
  large: 45,
  xl: 90,
}

export function mousepadWidthCm(preset: MousepadPreset, customCm: number): number {
  return preset === 'custom' ? customCm : MOUSEPAD_WIDTHS_CM[preset]
}

export interface PadFit {
  /** How many full 360° turns fit across the pad. */
  turnsAcross: number
  /** Degrees of rotation from one edge of the pad to the other. */
  degreesAcross: number
  /** True when a single 360° turn needs more width than the pad has. */
  overflow: boolean
  /** Width still free after one 360° (negative when overflowing). */
  spareCm: number
}

export function padFit(cm360: number, padWidthCm: number): PadFit | null {
  if (!(cm360 > 0) || !(padWidthCm > 0) || !Number.isFinite(cm360) || !Number.isFinite(padWidthCm)) return null
  return {
    turnsAcross: padWidthCm / cm360,
    degreesAcross: (360 * padWidthCm) / cm360,
    overflow: cm360 > padWidthCm,
    spareCm: padWidthCm - cm360,
  }
}
