/**
 * Raw Accel advisor engine. Pure math, no UI and no mouse driver.
 *
 * Models the Raw Accel sensitivity graph: X is input speed (counts/ms), Y is the
 * ratio of output to input. `Gain` follows Raw Accel's definition: the chosen curve
 * f(x) is the SLOPE of the output-speed vs input-speed graph, so the plotted ratio is
 * the running average of f: ratio(x) = (1/x) * integral(0..x) f(t) dt.
 *
 * Linear (+Gain), Classic and the caps are modelled directly from that definition.
 * Natural, Power and Jump follow the shapes Raw Accel documents; they are advisory
 * approximations, not a bit-exact copy of the driver.
 */

export const CURVES = ['Linear', 'Natural', 'Classic', 'Power', 'Jump'] as const
export type CurveType = (typeof CURVES)[number]
export const CAP_TYPES = ['Input', 'Output', 'Both'] as const
export type CapType = (typeof CAP_TYPES)[number]

/** Graph domain: Input Speed (counts/ms). */
export const SPEED_MAX = 80
export const GRID_MAJOR = 20
export const GRID_MINOR = 5

export interface RawAccelParams {
  curve: CurveType
  gain: boolean
  sensMultiplier: number
  yxRatio: number
  rotation: number
  /** Linear/Classic/Power slope, Natural decay rate, Jump height. */
  acceleration: number
  capType: CapType
  /** Cap: Output. Maximum value of the curve (0 disables). */
  capOutput: number
  /** Cap: Input. Speed after which the curve stops growing (0 disables). */
  capInput: number
  inputOffset: number
  /** Natural: asymptote of the curve. */
  limit: number
  /** Classic / Power exponent. */
  exponent: number
  lockXY: boolean
}

export const DEFAULT_PARAMS: RawAccelParams = {
  curve: 'Linear',
  gain: true,
  sensMultiplier: 0.5,
  yxRatio: 1,
  rotation: 0,
  acceleration: 0.75,
  capType: 'Output',
  capOutput: 3,
  capInput: 0,
  inputOffset: 9,
  limit: 1.5,
  exponent: 2,
  lockXY: true,
}

/** Default parameters when switching curve type. */
export function curveDefaults(curve: CurveType): Partial<RawAccelParams> {
  switch (curve) {
    case 'Linear':
      return { acceleration: 0.75, capType: 'Output', capOutput: 3, capInput: 0, inputOffset: 9 }
    case 'Classic':
      return { acceleration: 0.1, exponent: 2, capType: 'Output', capOutput: 3, capInput: 0, inputOffset: 9 }
    case 'Natural':
      return { acceleration: 0.12, limit: 2, capType: 'Output', capOutput: 0, capInput: 0, inputOffset: 6 }
    case 'Power':
      return { acceleration: 0.15, exponent: 0.6, capType: 'Output', capOutput: 3, capInput: 0, inputOffset: 6 }
    case 'Jump':
      return { acceleration: 2, capType: 'Output', capOutput: 0, capInput: 0, inputOffset: 20 }
  }
}

// ---------------------------------------------------------------- curve math

/** Un-capped curve f(x) (the "slope"): 1 below the offset, growing above it. */
function baseCurve(p: RawAccelParams, x: number): number {
  const d = x - p.inputOffset
  if (d <= 0) return 1
  switch (p.curve) {
    case 'Linear':
      return 1 + p.acceleration * d
    case 'Classic':
      return 1 + Math.pow(p.acceleration * d, p.exponent - 1)
    case 'Natural':
      return 1 + (Math.max(p.limit, 1) - 1) * (1 - Math.exp(-p.acceleration * d))
    case 'Power':
      return 1 + p.acceleration * Math.pow(d, p.exponent)
    case 'Jump': {
      // Smooth step up to `acceleration` over a short transition after the offset.
      // Transition width is proportional to the offset so the shape survives DPI adaptation.
      const w = Math.max(p.inputOffset * 0.1, 1e-3)
      const smooth = 1 / (1 + Math.exp(-((d - w) * 3) / w))
      return 1 + (Math.max(p.acceleration, 1) - 1) * smooth
    }
  }
}

/** Curve after applying Cap Type (Input / Output / Both). */
export function slopeAt(p: RawAccelParams, x: number): number {
  const useIn = (p.capType === 'Input' || p.capType === 'Both') && p.capInput > 0
  const useOut = (p.capType === 'Output' || p.capType === 'Both') && p.capOutput > 0
  let v = baseCurve(p, useIn ? Math.min(x, p.capInput) : x)
  if (useOut) v = Math.min(v, p.capOutput)
  return v
}

/** Closed form of Linear + Gain with an optional output cap (and input cap folded into the same shape). */
function linearGainRatio(p: RawAccelParams, x: number): number {
  if (x <= 0) return 1
  const a = p.acceleration
  const off = p.inputOffset
  const useIn = (p.capType === 'Input' || p.capType === 'Both') && p.capInput > 0
  const useOut = (p.capType === 'Output' || p.capType === 'Both') && p.capOutput > 0
  // x where the slope stops growing: output cap and/or input cap, whichever comes first.
  let xCap = Infinity
  if (useOut && a > 0) xCap = off + (Math.max(p.capOutput, 1) - 1) / a
  if (useIn) xCap = Math.min(xCap, Math.max(p.capInput, off))
  const slopeAtCap = 1 + a * Math.max(Math.min(xCap, 1e9) - off, 0)
  const integral = (u: number) => {
    // integral of the slope from 0 to u, u <= xCap
    if (u <= off) return u
    return off + (u - off) + 0.5 * a * (u - off) * (u - off)
  }
  if (x <= xCap) return integral(x) / x
  return (integral(xCap) + slopeAtCap * (x - xCap)) / x
}

/**
 * Ratio of output to input at a given input speed, INCLUDING the Sens Multiplier
 * (this is the value Raw Accel's Sensitivity graph shows).
 */
export function ratioAt(p: RawAccelParams, x: number): number {
  const m = p.sensMultiplier
  if (!p.gain) return m * slopeAt(p, x)
  if (p.curve === 'Linear') return m * linearGainRatio(p, x)
  return m * integrateAverage(p, x)
}

/** (1/x) * integral of slopeAt over [0, x] by Simpson's rule. */
function integrateAverage(p: RawAccelParams, x: number): number {
  if (x <= 0) return 1
  const n = Math.max(40, Math.ceil(x / 0.05) * 2)
  const h = x / n
  let sum = slopeAt(p, 0) + slopeAt(p, x)
  for (let i = 1; i < n; i++) sum += slopeAt(p, i * h) * (i % 2 === 0 ? 2 : 4)
  return (sum * h) / 3 / x
}

export interface CurvePoint {
  x: number
  y: number
}

/** Sample the graph curve (0..SPEED_MAX) for drawing. */
export function sampleCurve(p: RawAccelParams, step = 0.5): CurvePoint[] {
  const pts: CurvePoint[] = []
  const steps = Math.round(SPEED_MAX / step)
  for (let i = 0; i <= steps; i++) {
    const x = i * step
    pts.push({ x, y: ratioAt(p, Math.max(x, 1e-6)) })
  }
  return pts
}

export interface YAxis {
  min: number
  max: number
}

/** Y-axis bounds scaled around the curve(s), with a little padding (e.g. 0.45 to 1.52). */
export function yAxisBounds(...curves: CurvePoint[][]): YAxis {
  let lo = Infinity
  let hi = -Infinity
  for (const c of curves) for (const pt of c) {
    lo = Math.min(lo, pt.y)
    hi = Math.max(hi, pt.y)
  }
  if (!Number.isFinite(lo)) return { min: 0, max: 1 }
  const pad = Math.max((hi - lo) * 0.05, 0.02)
  return { min: Math.max(0, Math.round((lo - pad) * 100) / 100), max: Math.round((hi + pad) * 100) / 100 }
}

// -------------------------------------------------------------------- eDPI

export interface EdpiTelemetry {
  /** DPI * in-game sensitivity. */
  rawEdpi: number
  rawCm360: number | null
  /** Slow-speed eDPI (at or under the Input Offset): raw * Sens Multiplier. */
  baseEdpi: number
  baseCm360: number | null
  /** Fastest eDPI: raw * Sens Multiplier * Cap: Output (or the ratio at 80 counts/ms when there is no output cap). */
  peakEdpi: number
  peakCm360: number | null
  /** Ratio the curve really reaches at SPEED_MAX (with multiplier). */
  reachedRatio: number
}

export function hasOutputCap(p: RawAccelParams): boolean {
  return (p.capType === 'Output' || p.capType === 'Both') && p.capOutput > 0
}

export function telemetry(dpi: number, gameSens: number, rawCm360: number | null, p: RawAccelParams): EdpiTelemetry {
  const rawEdpi = dpi * gameSens
  const baseRatio = p.sensMultiplier
  const reachedRatio = ratioAt(p, SPEED_MAX)
  const peakRatio = hasOutputCap(p) ? p.sensMultiplier * p.capOutput : reachedRatio
  const cm = (ratio: number) => (rawCm360 !== null && ratio > 0 ? rawCm360 / ratio : null)
  return {
    rawEdpi,
    rawCm360,
    baseEdpi: rawEdpi * baseRatio,
    baseCm360: cm(baseRatio),
    peakEdpi: rawEdpi * peakRatio,
    peakCm360: cm(peakRatio),
    reachedRatio,
  }
}

// -------------------------------------------------------------- diagnostics

export type FlickRating = 'slow' | 'balanced' | 'aggressive'
export type SmoothRating = 'smooth' | 'good' | 'rough'
export type AnchorLevel = 'high' | 'mid' | 'low'

export interface Diagnostic {
  /** 0-100 */
  microStability: number
  anchor: AnchorLevel
  flick: FlickRating
  /** Reached ratio at SPEED_MAX divided by the slow-speed ratio. */
  flickGain: number
  smoothness: SmoothRating
  smoothScore: number
  /** Extra hints, as translation key suffixes. */
  hints: ('noOffset' | 'noGain' | 'padTight' | 'multAboveOne' | 'flat')[]
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export function diagnose(p: RawAccelParams, peakCm360: number | null = null, padCm: number | null = null): Diagnostic {
  const multScore = clamp((1.2 - p.sensMultiplier) / 0.9, 0, 1)
  const offsetScore = clamp(p.inputOffset / 12, 0, 1)
  const microStability = Math.round(100 * (0.55 * multScore + 0.45 * offsetScore))
  const anchor: AnchorLevel = microStability >= 70 ? 'high' : microStability >= 45 ? 'mid' : 'low'

  const flickGain = ratioAt(p, SPEED_MAX) / Math.max(p.sensMultiplier, 1e-9)
  const flick: FlickRating = flickGain < 1.3 ? 'slow' : flickGain < 2.2 ? 'balanced' : 'aggressive'

  // Smoothness: kinks (hard caps, jumps, non-gain acceleration) hurt muscle memory.
  let score = 100
  if (p.curve === 'Jump') score -= 35
  if (!p.gain && p.acceleration > 0 && p.curve !== 'Jump') score -= 15
  const pts = sampleCurve(p, 0.5)
  let maxKink = 0
  for (let i = 2; i < pts.length; i++) {
    const s1 = (pts[i - 1]!.y - pts[i - 2]!.y) / 0.5
    const s2 = (pts[i]!.y - pts[i - 1]!.y) / 0.5
    maxKink = Math.max(maxKink, Math.abs(s2 - s1))
  }
  score -= Math.min(30, Math.round((maxKink / Math.max(p.sensMultiplier, 0.1)) * 40))
  if (flickGain > 3.5) score -= 10
  score = clamp(score, 0, 100)
  const smoothness: SmoothRating = score >= 80 ? 'smooth' : score >= 55 ? 'good' : 'rough'

  const hints: Diagnostic['hints'] = []
  if (flickGain < 1.02) hints.push('flat')
  if (p.acceleration > 0 && p.inputOffset <= 0) hints.push('noOffset')
  if (!p.gain && p.curve !== 'Jump') hints.push('noGain')
  if (p.sensMultiplier > 1) hints.push('multAboveOne')
  if (peakCm360 !== null && padCm !== null && peakCm360 > padCm * 0.9) hints.push('padTight')

  return { microStability, anchor, flick, flickGain, smoothness, smoothScore: score, hints }
}

// ---------------------------------------------------------- DPI adaptation

/**
 * Re-express a curve for another mouse DPI so the physical hand speed and cm/360 feel identical.
 * Input speeds are counts/ms, so the same hand speed produces k = newDpi/oldDpi times more counts:
 * x-axis values (Input Offset, Cap: Input) scale by k, slopes scale back, and the Sens Multiplier
 * compensates the extra counts. The in-game sensitivity is unchanged.
 */
export function adaptParamsToDpi(p: RawAccelParams, fromDpi: number, toDpi: number): RawAccelParams {
  if (!(fromDpi > 0) || !(toDpi > 0) || fromDpi === toDpi) return { ...p }
  const k = toDpi / fromDpi
  const round = (v: number) => Math.round(v * 1e4) / 1e4
  const out = { ...p }
  out.sensMultiplier = round(p.sensMultiplier / k)
  out.inputOffset = round(p.inputOffset * k)
  out.capInput = round(p.capInput * k)
  switch (p.curve) {
    case 'Power':
      out.acceleration = round(p.acceleration / Math.pow(k, p.exponent))
      break
    case 'Classic':
      // (a*d)^(e-1): a*k*d' must equal a*d  ->  a' = a / k
      out.acceleration = round(p.acceleration / k)
      break
    case 'Jump':
      break // jump height is a ratio, not a speed
    default:
      out.acceleration = round(p.acceleration / k)
  }
  return out
}

// ------------------------------------------------------ config + serialization

export const SHARE_PREFIX = 'AIMLESS-RA:'
export const FILE_EXTENSION = '.aimless-accel.json'
const FORMAT = 'aimless-accel'

export interface AccelConfig {
  params: RawAccelParams
  dpi: number
  pollingRate: number
  gameId: string
  gameSens: number
  notes: string
  name: string
}

export interface ConfigFile extends AccelConfig {
  format: typeof FORMAT
  version: 1
}

export function toConfigFile(c: AccelConfig): ConfigFile {
  return { format: FORMAT, version: 1, ...c, params: { ...c.params } }
}

const num = (v: unknown, lo: number, hi: number, fb: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? clamp(v, lo, hi) : fb
const oneOf = <T extends string>(v: unknown, list: readonly T[], fb: T): T => (typeof v === 'string' && (list as readonly string[]).includes(v) ? (v as T) : fb)
const str = (v: unknown, max: number, fb = ''): string => (typeof v === 'string' ? v.slice(0, max) : fb)

/** Defensive parse of untrusted parameters. */
export function sanitizeParams(raw: unknown): RawAccelParams {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const d = DEFAULT_PARAMS
  return {
    curve: oneOf(r.curve, CURVES, d.curve),
    gain: typeof r.gain === 'boolean' ? r.gain : d.gain,
    sensMultiplier: num(r.sensMultiplier, 0.001, 20, d.sensMultiplier),
    yxRatio: num(r.yxRatio, 0.01, 20, d.yxRatio),
    rotation: num(r.rotation, -180, 180, d.rotation),
    acceleration: num(r.acceleration, 0, 1000, d.acceleration),
    capType: oneOf(r.capType, CAP_TYPES, d.capType),
    capOutput: num(r.capOutput, 0, 100, d.capOutput),
    capInput: num(r.capInput, 0, 1000, d.capInput),
    inputOffset: num(r.inputOffset, 0, 1000, d.inputOffset),
    limit: num(r.limit, 1, 100, d.limit),
    exponent: num(r.exponent, 0.01, 10, d.exponent),
    lockXY: typeof r.lockXY === 'boolean' ? r.lockXY : d.lockXY,
  }
}

export type ParseResult = { ok: true; config: AccelConfig } | { ok: false; error: 'invalid_json' | 'invalid_format' | 'invalid_code' }

export function parseConfigObject(raw: unknown): ParseResult {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'invalid_format' }
  const r = raw as Record<string, unknown>
  if (r.format !== FORMAT || !r.params || typeof r.params !== 'object') return { ok: false, error: 'invalid_format' }
  return {
    ok: true,
    config: {
      params: sanitizeParams(r.params),
      dpi: num(r.dpi, 50, 32000, 800),
      pollingRate: num(r.pollingRate, 125, 8000, 1000),
      gameId: str(r.gameId, 40, 'valorant'),
      gameSens: num(r.gameSens, 0.0001, 10000, 1),
      notes: str(r.notes, 500),
      name: str(r.name, 80),
    },
  }
}

export function parseConfigJson(text: string): ParseResult {
  try {
    return parseConfigObject(JSON.parse(text))
  } catch {
    return { ok: false, error: 'invalid_json' }
  }
}

function b64encode(s: string): string {
  const bytes = new TextEncoder().encode(s)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function b64decode(s: string): string {
  const std = s.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(std + '='.repeat((4 - (std.length % 4)) % 4))
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
}

/** Compact clipboard string: AIMLESS-RA:<base64url(json)>. */
export function encodeShareCode(c: AccelConfig): string {
  return SHARE_PREFIX + b64encode(JSON.stringify(toConfigFile(c)))
}

export function decodeShareCode(code: string): ParseResult {
  const t = code.trim()
  if (!t.startsWith(SHARE_PREFIX)) return { ok: false, error: 'invalid_code' }
  try {
    return parseConfigJson(b64decode(t.slice(SHARE_PREFIX.length)))
  } catch {
    return { ok: false, error: 'invalid_code' }
  }
}

/** Accept either a share code or a config file's text. */
export function parseAny(text: string): ParseResult {
  const t = text.trim()
  return t.startsWith(SHARE_PREFIX) ? decodeShareCode(t) : parseConfigJson(t)
}

/**
 * Best-effort Raw Accel settings.json (profile layout of the 1.6/1.7 GUI).
 * Raw Accel versions differ, so the replica panel stays the source of truth.
 */
export function toNativeSettings(c: AccelConfig): Record<string, unknown> {
  const p = c.params
  const mode = p.curve === 'Classic' ? 'Classic' : p.curve
  return {
    version: '1.7.1',
    defaultDeviceConfig: { disable: false, 'Use constant time interval based on polling rate': false, 'DPI (normalizes sens to 1000dpi and converts input speed unit: counts/ms -> in/s)': 0, 'Polling rate Hz (keep at 0 for automatic adjustment)': 0 },
    profiles: [
      {
        name: c.name || 'Aimless',
        'Output DPI': 1000,
        'Y/X output DPI ratio (sets cursor sensitivity ratio)': p.yxRatio,
        'Degrees of rotation': p.rotation,
        'Input Speed Cap': p.capType === 'Input' || p.capType === 'Both' ? p.capInput : 0,
        'Whole or horizontal accel parameters': {
          'Accel type': mode,
          'Gain / Velocity': p.gain,
          Acceleration: p.acceleration,
          Exponent: p.exponent,
          Limit: p.limit,
          'Input Offset': p.inputOffset,
          'Cap Type': p.capType,
          'Output Cap': p.capOutput,
          'Sens Multiplier': p.sensMultiplier,
        },
        'Lock X & Y': p.lockXY,
      },
    ],
  }
}

// ------------------------------------------------------------- presets/advisor

export type PresetId = 'tactical' | 'tracking' | 'hybrid'
export type HandStyle = 'wrist' | 'arm' | 'hybrid'

export const PRESET_PARAMS: Record<PresetId, Partial<RawAccelParams>> = {
  tactical: { curve: 'Linear', gain: true, sensMultiplier: 0.5, acceleration: 0.75, capType: 'Output', capOutput: 3, inputOffset: 9 },
  tracking: { curve: 'Natural', gain: true, sensMultiplier: 0.85, acceleration: 0.12, limit: 1.6, capType: 'Output', capOutput: 0, inputOffset: 4 },
  hybrid: { curve: 'Linear', gain: true, sensMultiplier: 0.4, acceleration: 1, capType: 'Output', capOutput: 3.5, inputOffset: 12 },
}

/** Build a recommended curve from the playstyle choices. `curve` forces a specific curve type. */
export function recommend(opts: { preset: PresetId; hand: HandStyle; padCm: number; rawCm360: number | null; curve?: CurveType }, base: RawAccelParams = DEFAULT_PARAMS): RawAccelParams {
  let p: RawAccelParams = { ...base, ...PRESET_PARAMS[opts.preset] }
  if (opts.curve && opts.curve !== p.curve) p = { ...p, ...curveDefaults(opts.curve), curve: opts.curve, sensMultiplier: p.sensMultiplier, gain: p.gain }
  // Wrist aimers move slower (smaller offset); arm aimers move faster.
  const handFactor = opts.hand === 'wrist' ? 0.8 : opts.hand === 'arm' ? 1.25 : 1
  p.inputOffset = Math.round(p.inputOffset * handFactor * 10) / 10
  // Keep the fastest flick inside one pad swipe by raising the output cap when needed.
  if (opts.rawCm360 !== null && opts.padCm > 0 && p.capOutput > 0) {
    let cap = p.capOutput
    while (cap < 6 && opts.rawCm360 / (p.sensMultiplier * cap) > opts.padCm * 0.9) cap = Math.round((cap + 0.25) * 100) / 100
    p.capOutput = cap
  }
  return p
}

// -------------------------------------------------------------------- history

export interface HistoryItem {
  id: string
  at: number
  name: string
  pinned: boolean
  config: AccelConfig
  baseEdpi: number
  peakEdpi: number
}

export const HISTORY_LIMIT = 60

export function paramsEqual(a: RawAccelParams, b: RawAccelParams): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

/** Add or refresh an entry; identical configs are merged, and the unpinned tail is trimmed. */
export function pushHistory(list: HistoryItem[], item: HistoryItem): HistoryItem[] {
  const same = list.find((h) => paramsEqual(h.config.params, item.config.params) && h.config.dpi === item.config.dpi && h.config.gameSens === item.config.gameSens && h.config.gameId === item.config.gameId)
  const rest = list.filter((h) => h !== same)
  const merged = same ? { ...same, at: item.at, baseEdpi: item.baseEdpi, peakEdpi: item.peakEdpi, config: { ...same.config, notes: item.config.notes } } : item
  const next = [merged, ...rest]
  const pinned = next.filter((h) => h.pinned)
  const loose = next.filter((h) => !h.pinned).slice(0, Math.max(HISTORY_LIMIT - pinned.length, 10))
  return next.filter((h) => h.pinned || loose.includes(h))
}
