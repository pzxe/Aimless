import { describe, expect, it } from 'vitest'
import { getAllGames } from '@/core/sensitivity'
import { ar } from './ar'
import { en } from './en'
import { isTranslationKey, translate } from './index'

describe('i18n', () => {
  it('Arabic has every English key and no extras', () => {
    expect(Object.keys(ar).sort()).toEqual(Object.keys(en).sort())
  })
  it('placeholders match between languages', () => {
    const vars = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort()
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(vars(ar[key]), key).toEqual(vars(en[key]))
    }
  })
  it('interpolates variables', () => {
    expect(translate('en', 'dashboard.stats.gamesValue', { supported: 14, total: 20 })).toBe('14 of 20')
  })
  it('every game note key exists', () => {
    for (const g of getAllGames()) expect(isTranslationKey(g.noteKey), g.id).toBe(true)
  })
})
