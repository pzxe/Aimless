import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PARAMS,
  adaptParamsToDpi,
  decodeShareCode,
  diagnose,
  encodeShareCode,
  parseAny,
  parseConfigJson,
  pushHistory,
  ratioAt,
  recommend,
  sampleCurve,
  slopeAt,
  telemetry,
  toConfigFile,
  toNativeSettings,
  yAxisBounds,
  type AccelConfig,
  type HistoryItem,
  type RawAccelParams,
} from '../rawAccelEngine'

// The reference setup: Linear + Gain, Offset 9, Sens Multiplier 0.5, Acceleration 0.75, Cap: Output 3.
const REF: RawAccelParams = { ...DEFAULT_PARAMS }

/** Independent brute-force integration of the slope, to cross-check the closed form. */
function numericGainRatio(p: RawAccelParams, x: number) {
  const n = 200000
  const h = x / n
  let sum = 0
  for (let i = 0; i < n; i++) sum += slopeAt(p, (i + 0.5) * h) * h
  return (p.sensMultiplier * sum) / x
}

describe('Linear + Gain curve', () => {
  it('is flat at the Sens Multiplier until the Input Offset', () => {
    for (const x of [1, 4, 8, 9]) expect(ratioAt(REF, x)).toBeCloseTo(0.5, 10)
  })

  it('rises smoothly after the offset (running average of the slope)', () => {
    // 0.5 * (1 + a/2 * (x-9)^2 / x)
    expect(ratioAt(REF, 10)).toBeCloseTo(0.5 * (1 + 0.375 / 10), 10)
    expect(ratioAt(REF, 11)).toBeCloseTo(0.5 * (1 + (0.375 * 4) / 11), 10)
    let prev = ratioAt(REF, 9)
    for (let x = 9.5; x <= 80; x += 0.5) {
      const y = ratioAt(REF, x)
      expect(y).toBeGreaterThan(prev)
      prev = y
    }
  })

  it('matches a numeric integral, including past the output cap', () => {
    for (const x of [5, 9, 10.5, 11.6667, 12, 30, 80]) expect(ratioAt(REF, x)).toBeCloseTo(numericGainRatio(REF, x), 3)
  })

  it('stays under Cap: Output x Sens Multiplier and approaches it', () => {
    expect(slopeAt(REF, 80)).toBe(3)
    for (let x = 1; x <= 80; x += 1) expect(ratioAt(REF, x)).toBeLessThan(1.5)
    expect(ratioAt(REF, 80)).toBeCloseTo(0.5 * ((9 + 2.6667 + 0.375 * 2.6667 ** 2 + 3 * (80 - 11.6667)) / 80), 3)
    expect(ratioAt(REF, 80)).toBeGreaterThan(1.3)
  })

  it('without Gain, the curve is the slope itself and caps hard', () => {
    const p = { ...REF, gain: false }
    expect(ratioAt(p, 9)).toBeCloseTo(0.5, 10)
    expect(ratioAt(p, 10)).toBeCloseTo(0.5 * 1.75, 10)
    expect(ratioAt(p, 40)).toBeCloseTo(1.5, 10)
  })

  it('Cap: Input freezes the slope at the capped speed', () => {
    const p = { ...REF, capType: 'Input' as const, capInput: 15 }
    expect(slopeAt(p, 15)).toBeCloseTo(1 + 0.75 * 6, 10)
    expect(slopeAt(p, 60)).toBeCloseTo(1 + 0.75 * 6, 10)
    expect(ratioAt(p, 60)).toBeCloseTo(numericGainRatio(p, 60), 3)
  })

  it('samples 0..80 and scales the Y axis around the curve', () => {
    const pts = sampleCurve(REF)
    expect(pts[0]!.x).toBe(0)
    expect(pts[pts.length - 1]!.x).toBe(80)
    const ax = yAxisBounds(pts)
    expect(ax.min).toBeLessThanOrEqual(0.5)
    expect(ax.min).toBeGreaterThan(0.4)
    expect(ax.max).toBeGreaterThan(1.37)
    expect(ax.max).toBeLessThan(1.5)
  })

  it('other curve types start at the multiplier and never go negative', () => {
    for (const curve of ['Natural', 'Classic', 'Power', 'Jump'] as const) {
      const p: RawAccelParams = { ...REF, curve, acceleration: 0.5, limit: 2, exponent: curve === 'Power' ? 0.6 : 2, capOutput: 0 }
      expect(ratioAt(p, 1)).toBeCloseTo(0.5, 6)
      for (const pt of sampleCurve(p)) expect(pt.y).toBeGreaterThan(0)
    }
  })
})

describe('Base / Peak eDPI', () => {
  it('Raw 400 with 0.5 multiplier gives a 200 base eDPI', () => {
    const t = telemetry(800, 0.5, 60, { ...REF, capOutput: 3 })
    expect(t.rawEdpi).toBe(400)
    expect(t.baseEdpi).toBe(200)
  })

  it('peak = raw x multiplier x Cap: Output, with the matching cm/360', () => {
    const t = telemetry(800, 0.6, 40, REF)
    expect(t.rawEdpi).toBe(480)
    expect(t.baseEdpi).toBe(240)
    expect(t.peakEdpi).toBe(720)
    expect(t.baseCm360).toBeCloseTo(80, 8)
    expect(t.peakCm360).toBeCloseTo(40 / 1.5, 8)
  })

  it('without an output cap, the peak is whatever the curve reaches at 80 counts/ms', () => {
    const p: RawAccelParams = { ...REF, capType: 'Input', capInput: 20 }
    const t = telemetry(800, 0.6, 40, p)
    expect(t.peakEdpi).toBeCloseTo(480 * ratioAt(p, 80), 8)
  })

  it('tolerates an unknown cm/360', () => {
    const t = telemetry(800, 0.6, null, REF)
    expect(t.baseCm360).toBeNull()
    expect(t.peakCm360).toBeNull()
  })
})

describe('Curve diagnostic', () => {
  it('rates the reference curve as a solid anchor with fast flicks', () => {
    const d = diagnose(REF)
    expect(d.microStability).toBeGreaterThanOrEqual(70)
    expect(d.anchor).toBe('high')
    expect(d.flick).toBe('aggressive')
    expect(d.smoothness).not.toBe('rough')
  })
  it('flags a flat curve and a missing offset', () => {
    expect(diagnose({ ...REF, acceleration: 0 }).hints).toContain('flat')
    expect(diagnose({ ...REF, inputOffset: 0 }).hints).toContain('noOffset')
  })
  it('a 1.0 multiplier with no offset is a loose anchor', () => {
    expect(diagnose({ ...REF, sensMultiplier: 1, inputOffset: 0 }).anchor).toBe('low')
  })
  it('warns when the fastest flick does not fit the pad', () => {
    expect(diagnose(REF, 50, 40).hints).toContain('padTight')
    expect(diagnose(REF, 20, 40).hints).not.toContain('padTight')
  })
})

describe('DPI adaptation', () => {
  // Same physical hand speed -> same cm/360 factor: ratio_b(k x) * toDpi == ratio_a(x) * fromDpi
  const same = (a: RawAccelParams, b: RawAccelParams, fromDpi: number, toDpi: number) => {
    const k = toDpi / fromDpi
    for (const x of [2, 9, 12, 25, 60]) expect(ratioAt(b, x * k) * toDpi / (ratioAt(a, x) * fromDpi)).toBeCloseTo(1, 2) // parameters are rounded to 4 decimals
  }
  it('800 -> 1600 halves the multiplier and doubles the offset', () => {
    const out = adaptParamsToDpi(REF, 800, 1600)
    expect(out.sensMultiplier).toBeCloseTo(0.25, 6)
    expect(out.inputOffset).toBeCloseTo(18, 6)
    expect(out.acceleration).toBeCloseTo(0.375, 6)
  })
  it('keeps the physical feel for every curve type', () => {
    for (const curve of ['Linear', 'Natural', 'Classic', 'Power', 'Jump'] as const) {
      const a: RawAccelParams = { ...REF, curve, acceleration: curve === 'Jump' ? 2 : 0.4, limit: 2, exponent: curve === 'Power' ? 0.6 : 2, capOutput: 0, gain: false }
      same(a, adaptParamsToDpi(a, 800, 1600), 800, 1600)
      same(a, adaptParamsToDpi(a, 1600, 400), 1600, 400)
    }
  })
  it('keeps the feel with Gain on (Linear)', () => same(REF, adaptParamsToDpi(REF, 800, 1600), 800, 1600))
  it('round-trips and ignores identical or invalid DPIs', () => {
    const back = adaptParamsToDpi(adaptParamsToDpi(REF, 800, 1600), 1600, 800)
    expect(back.inputOffset).toBeCloseTo(9, 3)
    expect(back.sensMultiplier).toBeCloseTo(0.5, 3)
    expect(adaptParamsToDpi(REF, 800, 800)).toEqual(REF)
    expect(adaptParamsToDpi(REF, 0, 800)).toEqual(REF)
  })
})

describe('Config import / export', () => {
  const cfg: AccelConfig = { params: REF, dpi: 800, pollingRate: 1000, gameId: 'valorant', gameSens: 0.6, notes: 'héllo ✓ notes', name: 'My curve' }

  it('round-trips through a share code (unicode safe)', () => {
    const code = encodeShareCode(cfg)
    expect(code.startsWith('AIMLESS-RA:')).toBe(true)
    expect(code).not.toMatch(/[+/=\s]/)
    const r = decodeShareCode(code)
    expect(r.ok && r.config).toEqual(cfg)
    expect(parseAny(`  ${code}  `).ok).toBe(true)
  })
  it('round-trips through the .aimless-accel.json text', () => {
    const r = parseConfigJson(JSON.stringify(toConfigFile(cfg)))
    expect(r.ok && r.config).toEqual(cfg)
    expect(parseAny(JSON.stringify(toConfigFile(cfg))).ok).toBe(true)
  })
  it('rejects junk', () => {
    expect(parseConfigJson('nope')).toEqual({ ok: false, error: 'invalid_json' })
    expect(parseConfigJson('{"a":1}')).toEqual({ ok: false, error: 'invalid_format' })
    expect(decodeShareCode('hello')).toEqual({ ok: false, error: 'invalid_code' })
    expect(decodeShareCode('AIMLESS-RA:@@@')).toEqual({ ok: false, error: 'invalid_code' })
  })
  it('sanitizes hostile values', () => {
    const evil = { ...toConfigFile(cfg), dpi: 1e12, params: { ...REF, curve: 'Evil', sensMultiplier: -5, acceleration: 'x', capType: 9 }, notes: 'a'.repeat(9000) }
    const r = parseConfigJson(JSON.stringify(evil))
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.config.dpi).toBe(32000)
      expect(r.config.params.curve).toBe('Linear')
      expect(r.config.params.sensMultiplier).toBeGreaterThan(0)
      expect(r.config.params.acceleration).toBe(DEFAULT_PARAMS.acceleration)
      expect(r.config.notes.length).toBe(500)
    }
  })
  it('builds a native settings object carrying the key values', () => {
    const native = JSON.stringify(toNativeSettings(cfg))
    expect(native).toContain('"Input Offset":9')
    expect(native).toContain('"Sens Multiplier":0.5')
    expect(native).toContain('"Linear"')
  })
})

describe('Advisor and history', () => {
  it('recommends the reference setup for the tactical preset', () => {
    const p = recommend({ preset: 'tactical', hand: 'hybrid', padCm: 45, rawCm360: 30 })
    expect(p.inputOffset).toBe(9)
    expect(p.sensMultiplier).toBe(0.5)
    expect(p.curve).toBe('Linear')
  })
  it('wrist aimers get a smaller offset; arm aimers a larger one', () => {
    expect(recommend({ preset: 'tactical', hand: 'wrist', padCm: 45, rawCm360: 30 }).inputOffset).toBeLessThan(9)
    expect(recommend({ preset: 'tactical', hand: 'arm', padCm: 45, rawCm360: 30 }).inputOffset).toBeGreaterThan(9)
  })
  it('raises the output cap when the fastest flick would not fit the pad', () => {
    const p = recommend({ preset: 'tactical', hand: 'hybrid', padCm: 20, rawCm360: 40 })
    expect(p.capOutput).toBeGreaterThan(3)
  })
  it('honours a forced curve type', () => {
    expect(recommend({ preset: 'tactical', hand: 'hybrid', padCm: 45, rawCm360: null, curve: 'Natural' }).curve).toBe('Natural')
  })

  const base: AccelConfig = { params: REF, dpi: 800, pollingRate: 1000, gameId: 'valorant', gameSens: 0.6, notes: '', name: '' }
  const item = (id: string, over: Partial<HistoryItem> = {}): HistoryItem => ({ id, at: 1, name: id, pinned: false, baseEdpi: 1, peakEdpi: 2, config: base, ...over })

  it('merges identical configs and keeps the newest first', () => {
    const a = item('a')
    const b = item('b', { config: { ...base, params: { ...REF, sensMultiplier: 0.4 } } })
    let list = pushHistory([], a)
    list = pushHistory(list, b)
    list = pushHistory(list, item('c', { at: 9 }))
    expect(list.map((h) => h.id)).toEqual(['a', 'b'])
    expect(list[0]!.at).toBe(9)
  })
  it('never drops pinned entries when trimming', () => {
    let list: HistoryItem[] = [item('pin', { pinned: true, config: { ...base, dpi: 1 } })]
    for (let i = 0; i < 100; i++) list = pushHistory(list, item('n' + i, { config: { ...base, dpi: 100 + i } }))
    expect(list.length).toBeLessThanOrEqual(61)
    expect(list.some((h) => h.id === 'pin')).toBe(true)
  })
})
