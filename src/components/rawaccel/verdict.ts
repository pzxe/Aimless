import type { TFunction } from '@/i18n'
import type { Diagnostic, EdpiTelemetry, RawAccelParams } from '@/services/rawAccelEngine'

/** The full advice text: anchor sentence + flick sentence, plus extra hints. */
export function adviceParts(t: TFunction, d: Diagnostic, tel: EdpiTelemetry, p: RawAccelParams) {
  const vars = { offset: Number(p.inputOffset.toFixed(2)), base: Math.round(tel.baseEdpi), peak: Math.round(tel.peakEdpi) }
  const main = `${t(`ra.advice.anchor.${d.anchor}`, vars)} ${t(`ra.advice.flick.${d.flick}`, vars)}`
  const hints = d.hints.map((h) => t(`ra.hint.${h}`))
  return { main, hints }
}

export const fmtCm = (v: number | null) => (v === null || !Number.isFinite(v) ? '—' : v >= 100 ? v.toFixed(0) : v.toFixed(1))
