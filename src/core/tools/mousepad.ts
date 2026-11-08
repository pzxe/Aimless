/**
 * Mousepad fit: how a 360° turn compares with the width of a mousepad.
 * Preset sizes are typical sizes, not specific products.
 */
export type MousepadPreset = 'small' | 'medium' | 'large' | 'xl' | 'deskmat' | 'custom'

export const MOUSEPAD_WIDTHS_CM: Record<Exclude<MousepadPreset, 'custom'>, number> = {
  small: 25,
  medium: 35,
  large: 45,
  xl: 90,
  deskmat: 120,
}

/** Typical depth for each preset (front to back). */
export const MOUSEPAD_HEIGHTS_CM: Record<Exclude<MousepadPreset, 'custom'>, number> = {
  small: 21,
  medium: 28,
  large: 40,
  xl: 40,
  deskmat: 60,
}

export function mousepadWidthCm(preset: MousepadPreset, customCm: number): number {
  return preset === 'custom' ? customCm : MOUSEPAD_WIDTHS_CM[preset]
}

export function mousepadHeightCm(preset: MousepadPreset, customHeightCm: number): number {
  return preset === 'custom' ? customHeightCm : MOUSEPAD_HEIGHTS_CM[preset]
}

export interface PadFit {
  /** How many full 360° turns fit across the pad. */
  turnsAcross: number
  /** Degrees of rotation from one edge of the pad to the other. */
  degreesAcross: number
  /** True when a single 360° turn needs more width than the pad has. */
  overflow: boolean
  /** Width still free after one 360° (negative when overflowing). */
  spareCm: number
}

export function padFit(cm360: number, padWidthCm: number): PadFit | null {
  if (!(cm360 > 0) || !(padWidthCm > 0) || !Number.isFinite(cm360) || !Number.isFinite(padWidthCm)) return null
  return {
    turnsAcross: padWidthCm / cm360,
    degreesAcross: (360 * padWidthCm) / cm360,
    overflow: cm360 > padWidthCm,
    spareCm: padWidthCm - cm360,
  }
}

// ------------------------------------------------------------------------------------------ calibration

const CM_PER_INCH = 2.54

/** Physical distance for a number of mouse counts at a given DPI (counts / DPI = inches). */
export function countsToCm(counts: number, dpi: number): number {
  if (!Number.isFinite(counts) || !(dpi > 0) || !Number.isFinite(dpi)) return Number.NaN
  return (counts / dpi) * CM_PER_INCH
}

/** Mouse counts for a physical distance at a given DPI. */
export function cmToCounts(cm: number, dpi: number): number {
  if (!Number.isFinite(cm) || !(dpi > 0) || !Number.isFinite(dpi)) return Number.NaN
  return (cm / CM_PER_INCH) * dpi
}

/** One mouse event can never honestly move this far; larger jumps are driver or window glitches and are ignored. */
export const MAX_COUNTS_PER_EVENT = 2000

/**
 * Tracks a sweep of the mouse across the pad. Feed it the raw movement of every event; the used width and height are
 * the total travel of the cursor between its two extremes, so going back and forth or overshooting a little does not
 * inflate the result.
 */
export class SweepTracker {
  x = 0
  y = 0
  minX = 0
  maxX = 0
  minY = 0
  maxY = 0
  events = 0
  /** Position after each event (for the live trace and the heatmap). */
  readonly path: { x: number; y: number }[] = []

  add(dx: number, dy: number): void {
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return
    if (Math.abs(dx) > MAX_COUNTS_PER_EVENT || Math.abs(dy) > MAX_COUNTS_PER_EVENT) return
    if (dx === 0 && dy === 0) return
    this.x += dx
    this.y += dy
    this.minX = Math.min(this.minX, this.x)
    this.maxX = Math.max(this.maxX, this.x)
    this.minY = Math.min(this.minY, this.y)
    this.maxY = Math.max(this.maxY, this.y)
    this.events++
    if (this.path.length < 20000) this.path.push({ x: this.x, y: this.y })
  }

  get extentX(): number {
    return this.maxX - this.minX
  }
  get extentY(): number {
    return this.maxY - this.minY
  }
  reset(): void {
    this.x = this.y = this.minX = this.maxX = this.minY = this.maxY = this.events = 0
    this.path.length = 0
  }
}

export interface TraceHeatOptions {
  cols: number
  rows: number
  /** Mouse counts covered by one cell, per axis (the same value on both axes keeps the true proportions). */
  cellX: number
  cellY: number
  /** 'min': the lowest position sits at the first cell (a full-width sweep starts at the pad's edge); 'mid': the middle of the path sits in the middle cell. */
  anchorX: 'min' | 'mid'
  anchorY: 'min' | 'mid'
}

/**
 * Counts how long the pointer dwelt in each cell of a pad-shaped grid. Adds into `into` so several sweeps can share
 * one map. Positions are placed by real distance (counts per cell), so a straight sweep stays a straight line.
 */
export function traceHeat(path: readonly { x: number; y: number }[], o: TraceHeatOptions, into?: number[]): number[] {
  const cells = into ?? new Array<number>(o.cols * o.rows).fill(0)
  if (path.length === 0 || !(o.cellX > 0) || !(o.cellY > 0)) return cells
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const p of path) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x)
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y)
  }
  const midX = (minX + maxX) / 2
  const midY = (minY + maxY) / 2
  const clamp = (v: number, n: number) => Math.min(n - 1, Math.max(0, Math.floor(v)))
  for (const p of path) {
    const cx = o.anchorX === 'min' ? (p.x - minX) / o.cellX : o.cols / 2 + (p.x - midX) / o.cellX
    const cy = o.anchorY === 'min' ? (p.y - minY) / o.cellY : o.rows / 2 + (p.y - midY) / o.cellY
    cells[clamp(cy, o.rows) * o.cols + clamp(cx, o.cols)]! += 1
  }
  return cells
}

/** Scales raw cell counts to 0..255, the brightest cell being 255. */
export function normalizeHeat(cells: readonly number[]): number[] {
  const peak = Math.max(...cells, 1)
  return cells.map((v) => Math.round((v / peak) * 255))
}

export type DeskVerdict = 'overflow' | 'tight' | 'good' | 'roomy'
export type DeskNoteCode = 'overflow' | 'tight' | 'good' | 'roomy' | 'vertical' | 'precision'

export interface DeskReport {
  /** Full 360° turns that fit across the usable width. */
  turnsAcross: number
  degreesAcross: number
  /** Width left after one 360° (negative: you are short). */
  spareCm: number
  /** Share of the usable width one 360° turn takes, in percent. */
  utilizationPct: number
  /** Travel for a 180° flick. */
  halfTurnCm: number
  /** Depth needed to look from straight down to straight up (180° of pitch). */
  pitchNeedCm: number
  verticalOk: boolean
  /** The slowest cm/360° that still fits a full turn in 80% of the width (a comfortable margin). */
  maxComfortCm360: number
  /** How much faster the sensitivity must be, in percent, to fit 360° in that margin (0 when it already fits). */
  speedUpPct: number
  countsPer360: number
  countsPerDegree: number
  countsAcrossPad: number
  verdict: DeskVerdict
  /** Plain-language findings, most important first. The UI turns each code into a translated sentence. */
  notes: DeskNoteCode[]
}

/** How a sensitivity fits a physical pad. Null when an input is missing or not a positive finite number. */
export function deskReport(i: { cm360: number; dpi: number; padWidthCm: number; padHeightCm: number }): DeskReport | null {
  const ok = (v: number) => v > 0 && Number.isFinite(v)
  if (!ok(i.cm360) || !ok(i.dpi) || !ok(i.padWidthCm) || !ok(i.padHeightCm)) return null
  const turnsAcross = i.padWidthCm / i.cm360
  const halfTurnCm = i.cm360 / 2
  const pitchNeedCm = i.cm360 / 2
  const maxComfortCm360 = i.padWidthCm * 0.8
  const countsPer360 = cmToCounts(i.cm360, i.dpi)
  const verdict: DeskVerdict = turnsAcross < 1 ? 'overflow' : turnsAcross < 1.25 ? 'tight' : turnsAcross < 3 ? 'good' : 'roomy'
  const verticalOk = i.padHeightCm >= pitchNeedCm
  const notes: DeskNoteCode[] = [verdict]
  if (!verticalOk) notes.push('vertical')
  if (countsPer360 / 360 < 8) notes.push('precision')
  return {
    turnsAcross,
    degreesAcross: turnsAcross * 360,
    spareCm: i.padWidthCm - i.cm360,
    utilizationPct: (i.cm360 / i.padWidthCm) * 100,
    halfTurnCm,
    pitchNeedCm,
    verticalOk,
    maxComfortCm360,
    speedUpPct: Math.max(0, (i.cm360 / maxComfortCm360 - 1) * 100),
    countsPer360,
    countsPerDegree: countsPer360 / 360,
    countsAcrossPad: cmToCounts(i.padWidthCm, i.dpi),
    verdict,
    notes,
  }
}
