import { describe, expect, it } from 'vitest'
import { getAllGames } from '@/core/sensitivity'
import { LANGUAGES } from '@/store/types'
import { en } from './en'
import { dictionaries, isTranslationKey, translate } from './index'

const enKeys = Object.keys(en).sort()
const vars = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort()

describe('i18n', () => {
  it('ships exactly the five supported languages', () => {
    expect(Object.keys(dictionaries).sort()).toEqual(['ar', 'en', 'es', 'pt', 'ru'])
    expect(LANGUAGES.map((l) => l.code).sort()).toEqual(['ar', 'en', 'es', 'pt', 'ru'])
  })

  for (const lang of Object.keys(dictionaries) as (keyof typeof dictionaries)[]) {
    describe(lang, () => {
      const dict = dictionaries[lang]
      it('has every English key and no extras', () => {
        expect(Object.keys(dict).sort()).toEqual(enKeys)
      })
      it('has no empty strings', () => {
        const empty = enKeys.filter((k) => typeof dict[k as keyof typeof en] !== 'string' || !dict[k as keyof typeof en].trim())
        expect(empty).toEqual([])
      })
      it('uses the same placeholders as English', () => {
        const mismatched = enKeys.filter((k) => {
          const key = k as keyof typeof en
          return JSON.stringify(vars(dict[key])) !== JSON.stringify(vars(en[key]))
        })
        expect(mismatched).toEqual([])
      })
    })
  }

  it('only Arabic is right-to-left', () => {
    expect(LANGUAGES.filter((l) => l.dir === 'rtl').map((l) => l.code)).toEqual(['ar'])
  })
  it('interpolates variables', () => {
    expect(translate('en', 'dashboard.stats.gamesValue', { supported: 14, total: 20 })).toBe('14 of 20')
    expect(translate('es', 'dashboard.stats.gamesValue', { supported: 14, total: 20 })).toBe('14 de 20')
  })
  it('every game note key exists', () => {
    for (const g of getAllGames()) expect(isTranslationKey(g.noteKey), g.id).toBe(true)
  })
})
