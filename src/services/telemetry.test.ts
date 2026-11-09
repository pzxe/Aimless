import { afterEach, describe, expect, it, vi } from 'vitest'
import { dictionaries } from '@/i18n'
import { NAV_ITEMS } from '@/components/layout/nav'
import { DESKTOP_ONLY_PATHS } from '@/utils/platform'
import { buildLabelIndex, labelToName, randomId, routeToPath, sanitizeProps, slugKey, trackingAllowed } from './telemetry'

describe('routeToPath: never reports anything secret', () => {
  it('prefixes the app and keeps simple routes', () => {
    expect(routeToPath('/')).toBe('/aimless/')
    expect(routeToPath('/converter')).toBe('/aimless/converter')
    expect(routeToPath('/perspective')).toBe('/aimless/perspective')
    expect(routeToPath('/Converter?x=1#y')).toBe('/aimless/converter')
    expect(routeToPath('/converter/')).toBe('/aimless/converter')
  })

  it('reduces share links, whose ids and keys are secrets, to a fixed name', () => {
    const secretEditor = '/edit/AbCd1234.fingerprint.PUBLICx.PUBLICy.PRIVATE_KEY_d'
    expect(routeToPath(secretEditor)).toBe('/aimless/edit')
    expect(routeToPath(secretEditor)).not.toMatch(/PRIVATE|AbCd/)
    expect(routeToPath('/view/topic.fp')).toBe('/aimless/view')
    expect(routeToPath('/tournament/live/topic.fp')).toBe('/aimless/view')
    expect(routeToPath('/obs/topic.fp')).toBe('/aimless/obs')
    expect(routeToPath('/tournaments/My-Private-Cup-2026')).toBe('/aimless/tournaments/open')
    expect(routeToPath('/tournaments')).toBe('/aimless/tournaments')
  })

  it('strips odd characters instead of passing them on', () => {
    expect(routeToPath('/we ird!<script>')).toBe('/aimless/weirdscript')
    expect(routeToPath('/' + 'x'.repeat(200)).length).toBeLessThanOrEqual('/aimless/'.length + 40)
  })
})

describe('click naming only ever uses static interface labels', () => {
  const en = buildLabelIndex(dictionaries.en as Record<string, string>)
  const ar = buildLabelIndex(dictionaries.ar as Record<string, string>)

  it('slugs a translation key into a name the collector accepts', () => {
    expect(slugKey('converter.saveProfile')).toBe('converter-saveprofile')
    expect(slugKey('web.desktopOnly.cta')).toBe('web-desktoponly-cta')
    expect(slugKey('a'.repeat(80)).length).toBeLessThanOrEqual(40)
    expect(slugKey('x.y')).toMatch(/^[a-z0-9][a-z0-9_-]{0,39}$/)
  })

  it('recognises a real label, in any language, as the same name', () => {
    expect(labelToName('Download for Windows', en)).toBe('web-desktoponly-cta')
    expect(labelToName('  Download   for Windows ', en)).toBe('web-desktoponly-cta')
    expect(labelToName(dictionaries.ar['web.desktopOnly.cta'], ar)).toBe('web-desktoponly-cta')
  })

  it('ignores anything that is not a known label: names the user typed, tournament titles, accounts', () => {
    for (const text of ['My Secret Team', 'xX_Pro_Gamer_Xx', 'Spring Cup 2026', 'Delete Team Alpha', '', null, undefined]) {
      expect(labelToName(text, en)).toBeNull()
    }
  })

  it('never indexes translations that contain placeholders (they can embed user values)', () => {
    for (const [text] of en) expect(text).not.toContain('{')
    expect(en.has('Download size: {size}')).toBe(false)
  })
})

describe('sanitizeProps', () => {
  it('keeps short, simple values and drops the rest', () => {
    expect(sanitizeProps({ from: 'valorant', to: 'cs2', n: 3, ok: true })).toEqual({ from: 'valorant', to: 'cs2', n: 3, ok: true })
    expect(sanitizeProps({ long: 'x'.repeat(65), empty: '', nan: Number.NaN, obj: { a: 1 }, list: [1], BadKey: 'x', 'bad key': 'x' })).toBeUndefined()
    expect(Object.keys(sanitizeProps(Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`k${i}`, i]))) ?? {})).toHaveLength(8)
    expect(sanitizeProps(undefined)).toBeUndefined()
  })
})

describe('trackingAllowed', () => {
  const ok = { configured: true, desktop: false, dnt: false, gpc: false, optOut: false }
  it('needs a configured endpoint and no objection of any kind', () => {
    expect(trackingAllowed(ok)).toBe(true)
    expect(trackingAllowed({ ...ok, configured: false })).toBe(false)
    expect(trackingAllowed({ ...ok, desktop: true })).toBe(false)
    expect(trackingAllowed({ ...ok, dnt: true })).toBe(false)
    expect(trackingAllowed({ ...ok, gpc: true })).toBe(false)
    expect(trackingAllowed({ ...ok, optOut: true })).toBe(false)
  })
})

describe('randomId', () => {
  it('is lowercase hex of the right length and does not repeat', () => {
    const ids = new Set(Array.from({ length: 200 }, () => randomId(12)))
    expect(ids.size).toBe(200)
    for (const id of ids) expect(id).toMatch(/^[a-f0-9]{24}$/)
    expect(randomId(9)).toMatch(/^[a-f0-9]{18}$/)
  })
})

describe('the desktop app stays untouched', () => {
  it('hides exactly the five desktop-only pages in the browser, and nothing else', () => {
    const hidden = NAV_ITEMS.filter((i) => i.desktopOnly).map((i) => i.to).sort()
    expect(hidden).toEqual([...DESKTOP_ONLY_PATHS].sort())
    expect(hidden).toEqual(['/accounts', '/games', '/mousepad', '/profiles', '/settings'])
    for (const to of ['/dashboard', '/converter', '/compare', '/tournaments', '/rawaccel', '/perspective', '/tools', '/history']) {
      expect(NAV_ITEMS.find((i) => i.to === to)?.desktopOnly, to).toBeFalsy()
    }
  })

  describe('inside Electron', () => {
    afterEach(() => {
      vi.unstubAllGlobals()
      vi.unstubAllEnvs()
      vi.resetModules()
    })

    it('telemetry is never configured and starting it does nothing', async () => {
      vi.stubEnv('VITE_TELEMETRY_URL', 'https://admin.example/c') // even if an endpoint were baked in by mistake
      vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 AppleWebKit/537.36 Chrome/130 Electron/33.0.0 Safari/537.36' })
      const fetchSpy = vi.fn()
      vi.stubGlobal('fetch', fetchSpy)
      vi.resetModules()
      const mod = await import('./telemetry')
      expect(mod.telemetryConfigured).toBe(false)
      const stop = mod.startTelemetry()
      mod.pageview('/converter')
      mod.track('converter', { from: 'a', to: 'b' })
      stop()
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('the browser build with an endpoint is configured', async () => {
      vi.stubEnv('VITE_TELEMETRY_URL', 'https://admin.example/c')
      vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 Chrome/130 Safari/537.36' })
      vi.resetModules()
      const mod = await import('./telemetry')
      expect(mod.telemetryConfigured).toBe(true)
    })
  })
})
