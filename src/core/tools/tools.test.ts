import { describe, expect, it } from 'vitest'
import {
  aimMeterPosition,
  classifyAimStyle,
  magnification,
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
