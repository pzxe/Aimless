import { useCallback, useMemo } from 'react'
import { formatNumber } from '@/core/sensitivity'
import { useT } from '@/i18n'
import { useSettings } from '@/store/settingsStore'

/** Display formatters bound to the user's precision and language. */
export function useFormat() {
  const precision = useSettings((s) => s.precision)
  const lang = useSettings((s) => s.language)
  const t = useT()

  const sens = useCallback((v: number) => formatNumber(v, precision, true, lang), [precision, lang])
  const cm = useCallback((v: number) => formatNumber(v, 2, false, lang), [lang])
  const edpi = useCallback((v: number) => formatNumber(v, 1, true, lang), [lang])
  const num = useCallback((v: number, d = 2) => formatNumber(v, d, true, lang), [lang])

  const relativeTime = useCallback(
    (at: number) => {
      const diff = Math.max(0, Date.now() - at)
      const min = Math.floor(diff / 60000)
      if (min < 1) return t('time.justNow')
      if (min < 60) return t('time.minutes', { n: min })
      const h = Math.floor(min / 60)
      if (h < 24) return t('time.hours', { n: h })
      const d = Math.floor(h / 24)
      if (d < 30) return t('time.days', { n: d })
      return new Date(at).toLocaleDateString(lang === 'ar' ? 'ar' : 'en')
    },
    [t, lang],
  )

  return useMemo(() => ({ sens, cm, edpi, num, relativeTime, precision }), [sens, cm, edpi, num, relativeTime, precision])
}
