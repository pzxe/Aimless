import { formatNumber, getGame, type ConversionResult } from '@/core/sensitivity'
import { translate } from '@/i18n'
import type { Language } from '@/store/types'

/** Plain-text summary of a conversion for the clipboard. */
export function conversionSummary(result: Extract<ConversionResult, { ok: true }>, lang: Language, precision: number): string {
  const tr = (k: Parameters<typeof translate>[1]) => translate(lang, k)
  const side = (s: typeof result.source) =>
    `${getGame(s.gameId)?.name ?? s.gameId}: ${formatNumber(s.sensitivity, precision)} @ ${s.dpi} DPI ` +
    `(eDPI ${formatNumber(s.edpi, 1)}, ${formatNumber(s.cm360, 2, false)} cm/360°)`
  const lines = [
    tr('summary.title'),
    `${tr('summary.from')} ${side(result.source)}`,
    `${tr('summary.to')} ${side(result.target)}`,
  ]
  if (result.targetRounded) {
    lines.push(`≈ ${formatNumber(result.targetRounded.sensitivity, precision)} (${formatNumber(result.targetRounded.cm360, 2, false)} cm/360°)`)
  }
  lines.push(`${tr('summary.accuracy')}: ${tr(`accuracy.${result.accuracy}`)}`)
  return lines.join('\n')
}
