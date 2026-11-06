/**
 * Round half away from zero to `decimals` places, avoiding binary floating point
 * artefacts such as 1.005 → 1.00. Display-only: the engine keeps full precision.
 */
export function roundTo(value: number, decimals: number): number {
  if (!Number.isFinite(value)) return value
  const d = Math.max(0, Math.min(12, Math.trunc(decimals)))
  const sign = value < 0 ? -1 : 1
  const shifted = Number(`${Math.abs(value)}e${d}`)
  return sign * Number(`${Math.round(shifted)}e-${d}`)
}

/** Round to the nearest multiple of `step` (e.g. 0.01 or 1). */
export function roundToStep(value: number, step: number): number {
  if (!(step > 0)) return value
  const decimals = stepDecimals(step)
  return roundTo(Math.round(value / step) * step, decimals)
}

/** Number of decimal places implied by a step such as 0.001 → 3. */
export function stepDecimals(step: number): number {
  const s = String(step)
  if (s.includes('e-')) return Number(s.split('e-')[1])
  const dot = s.indexOf('.')
  return dot === -1 ? 0 : s.length - dot - 1
}

/** Format with a fixed number of decimals, trimming trailing zeros when `trim` is set. */
export function formatNumber(value: number, decimals: number, trim = true, locale = 'en'): string {
  if (!Number.isFinite(value)) return '—'
  const rounded = roundTo(value, decimals)
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', {
    minimumFractionDigits: trim ? 0 : decimals,
    maximumFractionDigits: decimals,
    useGrouping: false,
  }).format(rounded)
}
