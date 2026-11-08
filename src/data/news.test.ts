/// <reference types="node" />
import { existsSync, statSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { dictionaries, type TranslationKey } from '@/i18n'
import { LANGUAGES } from '@/store/types'
import { parseVersion } from '../../electron/update-core.mjs'
import { NEWS } from './news'

describe('dashboard news feed', () => {
  it('has unique ids, valid versions, and newest first', () => {
    expect(new Set(NEWS.map((n) => n.id)).size).toBe(NEWS.length)
    const versions = NEWS.map((n) => parseVersion(n.version))
    expect(versions.every((v) => v !== null)).toBe(true)
    for (let i = 1; i < versions.length; i++) {
      const a = versions[i - 1]!
      const b = versions[i]!
      expect(a.major * 1e6 + a.minor * 1e3 + a.patch).toBeGreaterThanOrEqual(b.major * 1e6 + b.minor * 1e3 + b.patch)
    }
  })

  it('ships a real screenshot for every item, kept small enough to bundle', () => {
    for (const n of NEWS) {
      const file = `public/news/${n.image}`
      expect(existsSync(file), file).toBe(true)
      expect(statSync(file).size, file).toBeGreaterThan(5_000)
      expect(statSync(file).size, file).toBeLessThan(250_000)
    }
  })

  it('is translated into every language', () => {
    for (const { code } of LANGUAGES) {
      for (const n of NEWS) {
        for (const part of ['title', 'desc'] as const) {
          const key = `news.${n.id}.${part}` as TranslationKey
          expect(dictionaries[code][key], `${code} ${key}`).toBeTruthy()
        }
      }
    }
  })

  it('only links to pages that exist in the app', () => {
    const routes = ['/mousepad', '/accounts', '/games', '/tools', '/rawaccel', '/tournaments', '/converter']
    for (const n of NEWS) if (n.to) expect(routes, n.id).toContain(n.to)
  })
})
