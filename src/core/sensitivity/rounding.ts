/**
 * Round half away from zero to `decimals` places, avoiding binary floating point
 * artefacts such as 1.005 → 1.00. Display-only: the engine keeps full precision.
 */
export function roundTo(value: number, decimals: number): number {
  if (!Number.isFinite(value)) return value
  const d = Math.max(0, Math.min(12, Math.trunc(decimals)))
  const sign = value < 0 ? -1 : 1
  const rounded = Math.round(shiftExp(Math.abs(value), d))
  // `+ 0` turns a negative zero (a tiny negative value that rounds away) into a plain 0
  return sign * shiftExp(rounded, -d) + 0
}

/** x * 10^n without float error, and without building "1e-7e3" style strings (which parse to NaN). */
function shiftExp(x: number, n: number): number {
  const [mantissa, exponent] = x.toExponential().split('e')
  return Number(`${mantissa}e${Number(exponent) + n}`)
}

/** Round to the nearest multiple of `step` (e.g. 0.01 or 1). Halves round away from zero. */
export function roundToStep(value: number, step: number): number {
  if (!(step > 0) || !Number.isFinite(value)) return value
  const decimals = stepDecimals(step)
  const sign = value < 0 ? -1 : 1
  // 0.285 / 0.01 is 28.499999999999996: clean the float noise first so the half rounds up like a person expects
  const steps = Math.round(roundTo(Math.abs(value) / step, 9))
  return roundTo(sign * steps * step, decimals)
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
