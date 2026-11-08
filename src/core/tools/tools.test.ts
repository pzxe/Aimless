import { describe, expect, it } from 'vitest'
import {
  MAX_COUNTS_PER_EVENT,
  MOUSEPAD_HEIGHTS_CM,
  MOUSEPAD_WIDTHS_CM,
  SweepTracker,
  aimMeterPosition,
  classifyAimStyle,
  cmToCounts,
  countsToCm,
  deskReport,
  normalizeHeat,
  traceHeat,
  magnification,
  mousepadHeightCm,
  mousepadWidthCm,
  padFit,
  pollStats,
  zoomFovFromMagnification,
  zoomSensitivityRatio,
} from './index'

describe('mousepad fit', () => {
  it('uses preset and custom widths', () => {
    expect(mousepadWidthCm('large', 0)).toBe(45)
    expect(mousepadWidthCm('xl', 0)).toBe(90)
    expect(mousepadWidthCm('custom', 52)).toBe(52)
  })
  it('computes turns and overflow', () => {
    const fit = padFit(30, 45)!
    expect(fit.turnsAcross).toBeCloseTo(1.5, 10)
    expect(fit.degreesAcross).toBeCloseTo(540, 10)
    expect(fit.overflow).toBe(false)
    expect(padFit(50, 45)!.overflow).toBe(true)
    expect(padFit(50, 45)!.spareCm).toBe(-5)
  })
  it('rejects invalid input', () => {
    expect(padFit(0, 45)).toBeNull()
    expect(padFit(30, -1)).toBeNull()
    expect(padFit(Number.NaN, 45)).toBeNull()
  })
})

describe('ADS / zoom ratio', () => {
  it('is 1 when FOV does not change', () => {
    expect(zoomSensitivityRatio(103, 103, 0)).toBeCloseTo(1, 12)
    expect(zoomSensitivityRatio(103, 103, 75)).toBeCloseTo(1, 12)
  })
  it('focal-length (0%) match is the tan ratio', () => {
    const r = zoomSensitivityRatio(90, 40, 0)!
    expect(r).toBeCloseTo(Math.tan((20 * Math.PI) / 180) / Math.tan((45 * Math.PI) / 180), 12)
  })
  it('approaches the 0% value as the percentage tends to 0', () => {
    expect(zoomSensitivityRatio(90, 40, 0.0001)).toBeCloseTo(zoomSensitivityRatio(90, 40, 0)!, 6)
  })
  it('100% match equals the angle ratio', () => {
    expect(zoomSensitivityRatio(90, 40, 100)).toBeCloseTo(40 / 90, 12)
  })
  it('magnification round-trips', () => {
    const z = zoomFovFromMagnification(103, 4)!
    expect(magnification(103, z)).toBeCloseTo(4, 10)
  })
  it('rejects invalid input', () => {
    expect(zoomSensitivityRatio(0, 40)).toBeNull()
    expect(zoomSensitivityRatio(90, 180)).toBeNull()
    expect(zoomSensitivityRatio(90, 40, 120)).toBeNull()
    expect(zoomFovFromMagnification(90, 0)).toBeNull()
  })
})

describe('polling', () => {
  it('computes counts per poll and the minimum speed', () => {
    const s = pollStats(800, 1000, 25.4)!
    // 25.4 cm/s = 10 in/s → 8000 counts/s → 8 per poll at 1000 Hz
    expect(s.countsPerPoll).toBeCloseTo(8, 10)
    expect(s.intervalMs).toBe(1)
    expect(s.minSpeedCmS).toBeCloseTo(3.175, 10)
    expect(pollStats(800, 8000, 25.4)!.countsPerPoll).toBeCloseTo(1, 10)
  })
  it('rejects invalid input', () => {
    expect(pollStats(0, 1000, 10)).toBeNull()
    expect(pollStats(800, 0, 10)).toBeNull()
    expect(pollStats(800, 1000, -1)).toBeNull()
  })
})

describe('aim style', () => {
  it('classifies at the documented boundaries', () => {
    expect(classifyAimStyle(18)).toBe('wrist')
    expect(classifyAimStyle(24.99)).toBe('wrist')
    expect(classifyAimStyle(25)).toBe('hybrid')
    expect(classifyAimStyle(40)).toBe('hybrid')
    expect(classifyAimStyle(40.01)).toBe('arm')
    expect(classifyAimStyle(0)).toBeNull()
  })
  it('clamps the meter position', () => {
    expect(aimMeterPosition(5)).toBe(0)
    expect(aimMeterPosition(40)).toBeCloseTo(0.5, 10)
    expect(aimMeterPosition(500)).toBe(1)
  })
})

describe('pad presets', () => {
  it('has a width and a depth for Small, Medium, Large, XL and Deskmat', () => {
    for (const k of ['small', 'medium', 'large', 'xl', 'deskmat'] as const) {
      expect(MOUSEPAD_WIDTHS_CM[k]).toBeGreaterThan(MOUSEPAD_HEIGHTS_CM[k])
    }
    expect(mousepadWidthCm('deskmat', 0)).toBe(120)
    expect(mousepadHeightCm('deskmat', 0)).toBe(60)
    expect(mousepadHeightCm('custom', 33)).toBe(33)
  })
})

describe('counts and physical distance', () => {
  it('counts / DPI is inches: 800 counts at 800 DPI is 2.54 cm', () => {
    expect(countsToCm(800, 800)).toBeCloseTo(2.54, 10)
    expect(countsToCm(8819, 800)).toBeCloseTo(28, 1)
    expect(countsToCm(1600, 1600)).toBeCloseTo(2.54, 10)
    expect(countsToCm(1600, 800)).toBeCloseTo(5.08, 10)
  })
  it('round-trips and rejects bad input', () => {
    expect(countsToCm(cmToCounts(32, 1200), 1200)).toBeCloseTo(32, 10)
    expect(countsToCm(100, 0)).toBeNaN()
    expect(countsToCm(Number.NaN, 800)).toBeNaN()
    expect(cmToCounts(10, -5)).toBeNaN()
  })
})

describe('SweepTracker', () => {
  it('measures the travel between the two extremes of a left to right sweep', () => {
    const s = new SweepTracker()
    for (let i = 0; i < 100; i++) s.add(88.19, 0)
    expect(s.extentX).toBeCloseTo(8819, 0)
    expect(countsToCm(s.extentX, 800)).toBeCloseTo(28, 1)
    expect(s.extentY).toBe(0)
  })
  it('going back and forth does not inflate the width, and a wobble in the other axis is its own extent', () => {
    const s = new SweepTracker()
    for (let i = 0; i < 50; i++) s.add(10, 1)
    for (let i = 0; i < 50; i++) s.add(-10, -1)
    for (let i = 0; i < 30; i++) s.add(10, 0)
    expect(s.extentX).toBe(500)
    expect(s.extentY).toBe(50)
  })
  it('a sweep that starts by moving left still measures the full travel', () => {
    const s = new SweepTracker()
    for (let i = 0; i < 10; i++) s.add(-20, 0)
    for (let i = 0; i < 30; i++) s.add(20, 0)
    expect(s.extentX).toBe(600)
  })
  it('ignores NaN, Infinity, empty events and impossible jumps', () => {
    const s = new SweepTracker()
    s.add(Number.NaN, 5)
    s.add(Number.POSITIVE_INFINITY, 0)
    s.add(0, 0)
    s.add(MAX_COUNTS_PER_EVENT + 1, 0)
    s.add(0, -MAX_COUNTS_PER_EVENT - 1)
    expect(s.events).toBe(0)
    expect(s.extentX).toBe(0)
    s.add(MAX_COUNTS_PER_EVENT, 0)
    expect(s.extentX).toBe(MAX_COUNTS_PER_EVENT)
  })
  it('can be reset', () => {
    const s = new SweepTracker()
    s.add(100, 100)
    s.reset()
    expect([s.extentX, s.extentY, s.events, s.path.length]).toEqual([0, 0, 0, 0])
  })
})

describe('heat trace', () => {
  const opts = { cols: 10, rows: 6, cellX: 100, cellY: 100 }
  it('a full-width horizontal sweep runs along the middle rows from the first to the last column', () => {
    const path = Array.from({ length: 1000 }, (_, i) => ({ x: i + 1, y: (i % 3) - 1 })) // 1000 counts across, a hair of wobble
    const cells = traceHeat(path, { ...opts, anchorX: 'min', anchorY: 'mid' })
    const rowOf = (i: number) => Math.floor(i / opts.cols)
    const used = cells.map((v, i) => (v > 0 ? i : -1)).filter((i) => i >= 0)
    // the grid has an even number of rows, so "the middle" is the border of the two central ones
    for (const r of used.map(rowOf)) expect([opts.rows / 2 - 1, opts.rows / 2]).toContain(r)
    expect([...new Set(used.map((i) => i % opts.cols))].sort((x, y) => x - y)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  })
  it('a front-to-back sweep runs down the middle columns from the first row', () => {
    const path = Array.from({ length: 500 }, (_, i) => ({ x: (i % 3) - 1, y: i + 1 }))
    const cells = traceHeat(path, { ...opts, anchorX: 'mid', anchorY: 'min' })
    const used = cells.map((v, i) => (v > 0 ? i : -1)).filter((i) => i >= 0)
    for (const c of used.map((i) => i % opts.cols)) expect([opts.cols / 2 - 1, opts.cols / 2]).toContain(c)
    expect(Math.min(...used.map((i) => Math.floor(i / opts.cols)))).toBe(0)
  })
  it('adds several sweeps into one map, and stays inside the grid for any path', () => {
    const into = traceHeat([{ x: 0, y: 0 }, { x: 50, y: 0 }], { ...opts, anchorX: 'min', anchorY: 'mid' })
    traceHeat([{ x: 0, y: 0 }, { x: 0, y: 5000 }], { ...opts, anchorX: 'mid', anchorY: 'min' }, into)
    expect(into).toHaveLength(60)
    expect(into.reduce((a, b) => a + b, 0)).toBe(4)
    expect(traceHeat([{ x: 1e9, y: -1e9 }], { ...opts, anchorX: 'min', anchorY: 'mid' }).reduce((a, b) => a + b, 0)).toBe(1)
  })
  it('ignores an empty path or a zero cell size', () => {
    expect(traceHeat([], { ...opts, anchorX: 'min', anchorY: 'min' }).every((v) => v === 0)).toBe(true)
    expect(traceHeat([{ x: 1, y: 1 }], { ...opts, cellX: 0, anchorX: 'min', anchorY: 'min' }).every((v) => v === 0)).toBe(true)
  })
  it('normalizes to 0..255 with the busiest cell at 255', () => {
    expect(normalizeHeat([0, 5, 10])).toEqual([0, 128, 255])
    expect(normalizeHeat([0, 0])).toEqual([0, 0])
  })
})

describe('desk report', () => {
  it('a 32 cm/360° setting on a 35 cm pad fits one tight turn', () => {
    const r = deskReport({ cm360: 32, dpi: 800, padWidthCm: 35, padHeightCm: 28 })!
    expect(r.turnsAcross).toBeCloseTo(35 / 32, 10)
    expect(r.halfTurnCm).toBe(16)
    expect(r.spareCm).toBeCloseTo(3, 10)
    expect(r.utilizationPct).toBeCloseTo(91.4, 1)
    expect(r.verdict).toBe('tight')
    expect(r.maxComfortCm360).toBeCloseTo(28, 10)
    expect(r.speedUpPct).toBeCloseTo((32 / 28 - 1) * 100, 6)
  })
  it('classifies overflow, tight, good and roomy by turns across the pad', () => {
    const v = (cm360: number) => deskReport({ cm360, dpi: 800, padWidthCm: 45, padHeightCm: 40 })!.verdict
    expect(v(50)).toBe('overflow')
    expect(v(40)).toBe('tight')
    expect(v(30)).toBe('good')
    expect(v(10)).toBe('roomy')
  })
  it('an overflowing setting says how much faster it should be to fit', () => {
    const r = deskReport({ cm360: 60, dpi: 800, padWidthCm: 30, padHeightCm: 25 })!
    expect(r.spareCm).toBe(-30)
    expect(r.maxComfortCm360).toBeCloseTo(24, 10)
    expect(r.speedUpPct).toBeCloseTo(150, 6)
    expect(r.notes[0]).toBe('overflow')
  })
  it('a pad that is too shallow for a full look up and down is flagged', () => {
    const r = deskReport({ cm360: 60, dpi: 800, padWidthCm: 90, padHeightCm: 25 })!
    expect(r.pitchNeedCm).toBe(30)
    expect(r.verticalOk).toBe(false)
    expect(r.notes).toContain('vertical')
    expect(deskReport({ cm360: 60, dpi: 800, padWidthCm: 90, padHeightCm: 40 })!.verticalOk).toBe(true)
  })
  it('reports sensor counts, and flags very low precision', () => {
    const r = deskReport({ cm360: 32, dpi: 800, padWidthCm: 35, padHeightCm: 28 })!
    expect(r.countsPer360).toBeCloseTo((32 / 2.54) * 800, 6)
    expect(r.countsPerDegree).toBeCloseTo(r.countsPer360 / 360, 10)
    expect(r.countsAcrossPad).toBeCloseTo((35 / 2.54) * 800, 6)
    expect(r.notes).not.toContain('precision')
    expect(deskReport({ cm360: 40, dpi: 100, padWidthCm: 120, padHeightCm: 60 })!.notes).toContain('precision')
  })
  it('never returns NaN: invalid input gives null', () => {
    for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(deskReport({ cm360: bad, dpi: 800, padWidthCm: 35, padHeightCm: 28 })).toBeNull()
      expect(deskReport({ cm360: 30, dpi: bad, padWidthCm: 35, padHeightCm: 28 })).toBeNull()
      expect(deskReport({ cm360: 30, dpi: 800, padWidthCm: bad, padHeightCm: 28 })).toBeNull()
      expect(deskReport({ cm360: 30, dpi: 800, padWidthCm: 35, padHeightCm: bad })).toBeNull()
    }
  })
})
