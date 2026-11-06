import { describe, expect, it } from 'vitest'
import {
  actualFov,
  calculateEdpi,
  cmPer360,
  convertFov,
  convertSensitivity,
  describeSetting,
  formatNumber,
  getAllGames,
  getGame,
  isEdpiComparable,
  parseNumber,
  resolveFormula,
  roundTo,
  roundToStep,
  sensitivityForCm360,
  stepDecimals,
  validateDpi,
  validateSensitivity,
  weakestAccuracy,
  yawFromMeasurement,
} from './index'

const convert = (src: string, sens: number, dpi: number, dst: string, tdpi = dpi) =>
  convertSensitivity({ sourceGameId: src, sourceSensitivity: sens, sourceDpi: dpi, targetGameId: dst, targetDpi: tdpi })

describe('eDPI', () => {
  it('multiplies DPI by sensitivity', () => {
    expect(calculateEdpi(800, 1.25)).toBe(1000)
    expect(calculateEdpi(400, 0.5)).toBe(200)
  })
  it('is comparable only for identical yaw', () => {
    expect(isEdpiComparable(0.022, 0.022)).toBe(true)
    expect(isEdpiComparable(0.022, 0.07)).toBe(false)
    expect(isEdpiComparable(null, 0.022)).toBe(false)
  })
})

describe('cm/360', () => {
  it('matches the known CS2 value at 800 DPI, sens 1', () => {
    // 360 / (0.022 * 800) inches * 2.54
    expect(cmPer360(0.022, 800)).toBeCloseTo(51.954545, 5)
  })
  it('matches Valorant 0.4 @ 800 DPI', () => {
    expect(describeSetting('valorant', 800, 0.4)!.cm360).toBeCloseTo(40.821429, 5)
  })
  it('halves when DPI doubles', () => {
    expect(cmPer360(0.022, 1600)).toBeCloseTo(cmPer360(0.022, 800) / 2, 10)
  })
  it('uses each game constant, not one universal constant', () => {
    const cs = describeSetting('cs2', 800, 1)!
    const val = describeSetting('valorant', 800, 1)!
    const ow = describeSetting('overwatch2', 800, 1)!
    expect(cs.cm360).not.toBeCloseTo(val.cm360, 1)
    expect(val.cm360 * (0.07 / 0.022)).toBeCloseTo(cs.cm360, 8)
    expect(ow.cm360).toBeCloseTo(cs.cm360 * (0.022 / 0.0066), 8)
  })
})

describe('sensitivity conversion', () => {
  it('CS2 → Valorant uses the 0.022 / 0.07 ratio', () => {
    const r = convert('cs2', 1, 800, 'valorant')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.target.sensitivity).toBeCloseTo(0.3142857, 6)
    expect(r.target.cm360).toBeCloseTo(r.source.cm360, 9)
  })
  it('Valorant → Overwatch 2 uses the 0.07 / 0.0066 ratio', () => {
    const r = convert('valorant', 0.4, 800, 'overwatch2')
    if (!r.ok) throw new Error('expected ok')
    expect(r.target.sensitivity).toBeCloseTo(4.242424, 5)
    expect(r.targetRounded?.sensitivity).toBe(4.24)
  })
  it('games sharing a yaw convert 1:1 at the same DPI', () => {
    const r = convert('cs2', 1.7, 800, 'apex')
    if (!r.ok) throw new Error('expected ok')
    expect(r.target.sensitivity).toBeCloseTo(1.7, 12)
    expect(r.notes).not.toContain('note.edpiNotComparable')
  })
  it('accounts for a different target DPI', () => {
    const r = convert('valorant', 0.4, 800, 'cs2', 400)
    if (!r.ok) throw new Error('expected ok')
    expect(r.target.sensitivity).toBeCloseTo(2.545454, 5)
    expect(r.target.cm360).toBeCloseTo(r.source.cm360, 9)
    expect(r.target.edpi).toBeCloseTo(400 * 2.5454545, 3)
  })
  it('same game, DPI change only scales sensitivity inversely', () => {
    const r = convert('cs2', 2, 400, 'cs2', 1600)
    if (!r.ok) throw new Error('expected ok')
    expect(r.target.sensitivity).toBeCloseTo(0.5, 12)
  })
  it('round-trips without drift', () => {
    const a = convert('cs2', 1.234, 800, 'r6siege', 1600)
    if (!a.ok) throw new Error('expected ok')
    const b = convert('r6siege', a.target.sensitivity, 1600, 'cs2', 800)
    if (!b.ok) throw new Error('expected ok')
    expect(b.target.sensitivity).toBeCloseTo(1.234, 12)
  })
  it('is deterministic', () => {
    expect(convert('apex', 1.5, 800, 'fortnite')).toEqual(convert('apex', 1.5, 800, 'fortnite'))
  })
  it('flags eDPI as not comparable between different yaws', () => {
    const r = convert('cs2', 1, 800, 'valorant')
    if (!r.ok) throw new Error('expected ok')
    expect(r.notes).toContain('note.edpiNotComparable')
  })
})

describe('accuracy', () => {
  it('reports verified for two verified games', () => {
    const r = convert('cs2', 1, 800, 'valorant')
    expect(r.ok && r.accuracy).toBe('verified')
  })
  it('reports approximate and adds the game note when one side is approximate', () => {
    const r = convert('cs2', 1, 800, 'fortnite')
    if (!r.ok) throw new Error('expected ok')
    expect(r.accuracy).toBe('approximate')
    expect(r.notes).toContain('note.fortnite')
  })
  it('weakest accuracy wins', () => {
    expect(weakestAccuracy('verified', 'approximate')).toBe('approximate')
    expect(weakestAccuracy('calibrated', 'verified')).toBe('calibrated')
    expect(weakestAccuracy('approximate', 'calibrated')).toBe('approximate')
  })
})

describe('unsupported games', () => {
  it('refuses to convert to a game without a known constant', () => {
    const r = convert('cs2', 1, 800, 'pubg')
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.unsupported).toEqual(['pubg'])
  })
  it('refuses to convert from an unsupported game', () => {
    const r = convert('haloinfinite', 5, 800, 'cs2')
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.unsupported).toEqual(['haloinfinite'])
  })
  it('every unsupported game has no formula and every supported one has a positive yaw', () => {
    for (const g of getAllGames()) {
      if (g.accuracy === 'unsupported') expect(g.formula).toBeNull()
      else expect(g.formula && g.formula.yaw > 0).toBe(true)
    }
  })
  it('works once the user calibrates the game', () => {
    const yaw = yawFromMeasurement(1, 800, 30)
    const calibrations = { pubg: yaw }
    expect(resolveFormula(getGame('pubg')!, calibrations)?.accuracy).toBe('calibrated')
    const r = convertSensitivity(
      { sourceGameId: 'cs2', sourceSensitivity: 1, sourceDpi: 800, targetGameId: 'pubg', targetDpi: 800 },
      calibrations,
    )
    if (!r.ok) throw new Error('expected ok')
    expect(r.accuracy).toBe('calibrated')
    expect(r.notes).toContain('note.calibrated')
    expect(r.target.cm360).toBeCloseTo(r.source.cm360, 9)
  })
  it('rejects unknown game ids', () => {
    const r = convert('not-a-game', 1, 800, 'cs2')
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.issues).toContainEqual({ field: 'sourceGameId', code: 'unknown_game' })
  })
})

describe('validation', () => {
  it('rejects invalid DPI', () => {
    expect(validateDpi(0)).toBe('dpi_not_positive')
    expect(validateDpi(-400)).toBe('dpi_not_positive')
    expect(validateDpi(Number.NaN)).toBe('dpi_required')
    expect(validateDpi(Infinity)).toBe('dpi_too_high')
    expect(validateDpi(100000)).toBe('dpi_too_high')
    expect(validateDpi(800)).toBeNull()
  })
  it('rejects zero and negative sensitivity', () => {
    expect(validateSensitivity(0)).toBe('sens_not_positive')
    expect(validateSensitivity(-1)).toBe('sens_not_positive')
    expect(validateSensitivity(Number.NaN)).toBe('sens_required')
    expect(validateSensitivity(0.0001)).toBeNull()
  })
  it('conversion returns issues instead of numbers for bad input', () => {
    const r = convert('cs2', 0, -800, 'valorant', 0)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.issues.map((i) => i.field).sort()).toEqual(['sourceDpi', 'sourceSensitivity', 'targetDpi'])
  })
  it('parses localized numeric text', () => {
    expect(parseNumber('0,45')).toBe(0.45)
    expect(parseNumber('٨٠٠')).toBe(800)
    expect(parseNumber('٠٫٥')).toBe(0.5)
    expect(parseNumber('')).toBeNaN()
    expect(parseNumber('1.2.3')).toBeNaN()
    expect(parseNumber('abc')).toBeNaN()
  })
})

describe('rounding', () => {
  it('rounds half away from zero without float artefacts', () => {
    expect(roundTo(1.005, 2)).toBe(1.01)
    expect(roundTo(2.675, 2)).toBe(2.68)
    expect(roundTo(-1.005, 2)).toBe(-1.01)
    expect(roundTo(0.3142857, 3)).toBe(0.314)
  })
  it('rounds to a game step', () => {
    expect(roundToStep(3.8397, 1)).toBe(4)
    expect(roundToStep(4.2424, 0.01)).toBe(4.24)
    expect(roundToStep(0.31428, 0.001)).toBe(0.314)
    expect(stepDecimals(0.001)).toBe(3)
    expect(stepDecimals(1)).toBe(0)
  })
  it('reports the error introduced by an integer-only target', () => {
    const r = convert('cs2', 1, 800, 'r6siege')
    if (!r.ok) throw new Error('expected ok')
    expect(r.target.sensitivity).toBeCloseTo(3.83972, 4)
    expect(r.targetRounded?.sensitivity).toBe(4)
    // Higher sens → shorter distance → negative error.
    expect(r.targetRounded!.errorPercent).toBeCloseTo((3.83972 / 4 - 1) * 100, 2)
  })
  it('keeps full precision internally', () => {
    const r = convert('cs2', 1, 800, 'valorant')
    if (!r.ok) throw new Error('expected ok')
    expect(r.target.sensitivity).toBe(0.022 / 0.07)
  })
  it('formats for display', () => {
    expect(formatNumber(0.3142857, 3)).toBe('0.314')
    expect(formatNumber(2, 3)).toBe('2')
    expect(formatNumber(2, 2, false)).toBe('2.00')
    expect(formatNumber(Number.NaN, 2)).toBe('—')
  })
})

describe('target cm/360', () => {
  it('finds the sensitivity for a desired distance', () => {
    const sens = sensitivityForCm360('cs2', 51.954545, 800)!
    expect(sens).toBeCloseTo(1, 5)
    expect(sensitivityForCm360('pubg', 30, 800)).toBeNull()
  })
})

describe('FOV', () => {
  it('converts CS2 4:3 FOV 90 to ~106.26 horizontal at 16:9', () => {
    const f = actualFov(90, 'horizontal-4:3', 1920, 1080)
    expect(f.horizontal).toBeCloseTo(106.26, 2)
    expect(f.vertical).toBeCloseTo(73.74, 2)
  })
  it('converts vertical 60 to horizontal at 16:9', () => {
    expect(convertFov(60, 'vertical', 'horizontal', 1920, 1080)).toBeCloseTo(91.49, 2)
  })
  it('round-trips', () => {
    const h = convertFov(73, 'vertical', 'horizontal', 2560, 1440)
    expect(convertFov(h, 'horizontal', 'vertical', 2560, 1440)).toBeCloseTo(73, 10)
  })
})

describe('non-linear calibration warning', () => {
  it('adds a note when a calibrated game has a non-linear slider', () => {
    const r = convertSensitivity(
      { sourceGameId: 'cs2', sourceSensitivity: 1, sourceDpi: 800, targetGameId: 'pubg', targetDpi: 800 },
      { pubg: 0.001 },
    )
    if (!r.ok) throw new Error('expected ok')
    expect(r.notes).toContain('note.calibratedNonLinear')
  })
})
