import { describe, expect, it } from 'vitest'
import { getAllGames, resolveYaw } from '@/core/sensitivity'
import { ASPECTS, convertPerspective, horizontalFovOf, MATCH_METHODS, opposite, rotationRatio, validatePerspective, type PerspectiveInput } from './tppFppEngine'

const base: PerspectiveInput = {
  yaw: 0.022, fovType: 'horizontal', aspect: ASPECTS['16:9'], from: 'tpp', sensitivity: 2, dpi: 800,
  fov: { tpp: 90, fpp: 70 }, method: 'center',
}
const ok = (i: PerspectiveInput) => {
  const r = convertPerspective(i)
  if (!r.ok) throw new Error(`invalid: ${r.issues.join(',')}`)
  return r
}

describe('rotation ratio', () => {
  it('is exactly 1 when matching the distance of a full turn', () => {
    expect(rotationRatio(90, 60, 'cm360')).toBe(1)
    const r = ok({ ...base, method: 'cm360' })
    expect(r.to.sensitivity).toBe(base.sensitivity)
    expect(r.to.cm360).toBeCloseTo(r.from.cm360, 10)
  })
  it('centre match is the ratio of the tangents of the half-angles', () => {
    expect(rotationRatio(90, 60, 'center')).toBeCloseTo(Math.tan(Math.PI / 6) / Math.tan(Math.PI / 4), 12)
  })
  it('edge match is the plain ratio of the angles', () => {
    expect(rotationRatio(90, 60, 'edge')).toBeCloseTo(60 / 90, 12)
    expect(rotationRatio(103, 80, 'edge')).toBeCloseTo(80 / 103, 12)
  })
  it('half-screen match lies between the centre and the edge match', () => {
    const c = rotationRatio(100, 60, 'center')
    const h = rotationRatio(100, 60, 'half')
    const e = rotationRatio(100, 60, 'edge')
    expect(Math.min(c, e)).toBeLessThan(h)
    expect(h).toBeLessThan(Math.max(c, e))
  })
  it('is 1 for identical views whatever the method', () => {
    for (const m of MATCH_METHODS) expect(rotationRatio(95, 95, m)).toBeCloseTo(1, 12)
  })
})

describe('perspective conversion', () => {
  it('a narrower target view gets a lower sensitivity and a longer cm/360°', () => {
    const r = ok(base)
    expect(r.rotationRatio).toBeLessThan(1)
    expect(r.to.sensitivity).toBeCloseTo(2 * r.rotationRatio, 12)
    expect(r.to.cm360).toBeCloseTo(r.from.cm360 / r.rotationRatio, 9)
    expect(r.fovMultiplier).toBeCloseTo(1 / r.rotationRatio, 12) // centre match: apparent size and rotation scale cancel
  })
  it('a wider target view gets a higher sensitivity', () => {
    expect(ok({ ...base, from: 'fpp' }).to.sensitivity).toBeGreaterThan(2)
  })
  it('is reversible: TPP → FPP → TPP returns the starting sensitivity for every method', () => {
    for (const method of MATCH_METHODS) {
      const there = ok({ ...base, method })
      const back = ok({ ...base, method, from: 'fpp', sensitivity: there.to.sensitivity })
      expect(back.to.sensitivity, method).toBeCloseTo(base.sensitivity, 10)
      expect(back.to.perspective).toBe('tpp')
    }
  })
  it('uses the swapped FOVs when the source perspective changes', () => {
    const a = ok(base)
    const b = ok({ ...base, from: 'fpp', fov: { tpp: 70, fpp: 90 } })
    expect(a.from.fov).toBe(90)
    expect(b.from.fov).toBe(90)
    expect(a.to.fov).toBe(70)
    expect(b.to.sensitivity).toBeCloseTo(a.to.sensitivity, 12)
  })
  it('computes cm/360° from the game yaw, sensitivity and DPI', () => {
    const r = ok({ ...base, method: 'cm360', sensitivity: 1, dpi: 800 })
    expect(r.from.cm360).toBeCloseTo((360 * 2.54) / (0.022 * 800), 10)
    expect(r.from.edpi).toBe(800)
  })
  it('gives the nearest value the game accepts, with its error', () => {
    const r = ok({ ...base, step: 0.01 })
    expect(r.rounded!.sensitivity).toBeCloseTo(Math.round(r.to.sensitivity * 100) / 100, 10)
    expect(r.rounded!.errorPercent).toBeLessThan(1)
    expect(ok(base).rounded).toBeUndefined()
  })
  it('brings vertical and 4:3 FOVs to the same horizontal axis first', () => {
    expect(horizontalFovOf(90, 'horizontal', ASPECTS['16:9'])).toBeCloseTo(90, 9)
    expect(horizontalFovOf(90, 'horizontal-4:3', ASPECTS['16:9'])).toBeGreaterThan(90) // 4:3 frame 90° is wider on 16:9
    expect(horizontalFovOf(60, 'vertical', ASPECTS['16:9'])).toBeCloseTo((2 * Math.atan(Math.tan(Math.PI / 6) * (16 / 9)) * 180) / Math.PI, 9)
    // at the centre of the screen the axis cancels out; at the edge it does not
    const c16 = ok({ ...base, fovType: 'horizontal-4:3', aspect: ASPECTS['16:9'] })
    const c43 = ok({ ...base, fovType: 'horizontal-4:3', aspect: ASPECTS['4:3'] })
    expect(c16.rotationRatio).toBeCloseTo(c43.rotationRatio, 12)
    const e16 = ok({ ...base, fovType: 'horizontal-4:3', aspect: ASPECTS['16:9'], method: 'edge' })
    const e43 = ok({ ...base, fovType: 'horizontal-4:3', aspect: ASPECTS['4:3'], method: 'edge' })
    expect(e16.rotationRatio).not.toBeCloseTo(e43.rotationRatio, 4)
  })
  it('rejects bad input and says which field', () => {
    expect(validatePerspective({ ...base, sensitivity: 0 })).toEqual(['sensitivity'])
    expect(validatePerspective({ ...base, dpi: Number.NaN })).toEqual(['dpi'])
    expect(validatePerspective({ ...base, fov: { tpp: 180, fpp: 70 } })).toEqual(['fov_from'])
    expect(validatePerspective({ ...base, fov: { tpp: 90, fpp: 0 } })).toEqual(['fov_to'])
    expect(validatePerspective({ ...base, yaw: -1, aspect: 0 })).toEqual(['yaw', 'aspect'])
    expect(convertPerspective({ ...base, sensitivity: -1 })).toEqual({ ok: false, issues: ['sensitivity'] })
    expect(opposite('tpp')).toBe('fpp')
  })
})

describe('game database integration', () => {
  it('converts in every game that has a rotation constant, and only those', () => {
    let converted = 0
    for (const g of getAllGames()) {
      const yaw = resolveYaw(g)
      if (yaw === null) continue
      const fov = g.fov?.default ?? 90
      const r = ok({ ...base, yaw, fovType: g.fov?.type ?? 'horizontal', fov: { tpp: fov, fpp: Math.max(fov - 10, 40) }, step: g.sensitivityStep })
      expect(Number.isFinite(r.to.sensitivity) && r.to.sensitivity > 0, g.id).toBe(true)
      expect(r.to.cm360, g.id).toBeGreaterThan(r.from.cm360)
      converted++
    }
    expect(converted).toBe(72)
  })
})
