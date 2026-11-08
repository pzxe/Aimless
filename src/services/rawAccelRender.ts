/**
 * SVG renderers for the Raw Accel advisor: the Sensitivity graph, the classic Raw Accel window
 * replica and the pro showcase card. One source of truth for the live panel and the PNG export
 * (SVG string -> image -> canvas -> PNG).
 *
 * The Raw Accel parameter names and axis titles are NEVER translated, so they can be typed into Raw Accel 1:1.
 */
import {
  GRID_MAJOR,
  GRID_MINOR,
  SPEED_MAX,
  sampleCurve,
  yAxisBounds,
  type CurvePoint,
  type RawAccelParams,
} from './rawAccelEngine'

export type ReplicaTheme = 'dark' | 'classic'

export const RA_LABELS = {
  sensMultiplier: 'Sens Multiplier',
  yxRatio: 'Y/X Ratio',
  rotation: 'Rotation',
  gain: 'Gain',
  acceleration: 'Acceleration',
  exponent: 'Exponent',
  limit: 'Limit',
  capType: 'Cap Type',
  capInput: 'Cap: Input',
  capOutput: 'Cap: Output',
  inputOffset: 'Input Offset',
  anisotropy: 'Anisotropy',
  lockXY: 'Lock X & Y',
  graphTitle: 'Sensitivity',
  graphX: 'Input Speed (counts/ms)',
  graphY: 'Ratio of Output to Input',
} as const

export const fmt = (n: number, max = 4): string => {
  if (!Number.isFinite(n)) return '0'
  return String(Number(n.toFixed(max)))
}

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

// ------------------------------------------------------------------ fields

export interface RaField {
  id: string
  /** Exact English Raw Accel label (empty for the curve dropdown). */
  label: string
  kind: 'num' | 'select' | 'check'
  value: string
  key?: keyof RawAccelParams
  options?: readonly string[]
  /** Value copied by the per-field Copy button. */
  copy?: string
}

/** The Raw Accel fields in their on-screen order for the active curve type. */
export function fieldsFor(p: RawAccelParams): RaField[] {
  const f: RaField[] = [
    { id: 'sens', label: RA_LABELS.sensMultiplier, kind: 'num', key: 'sensMultiplier', value: fmt(p.sensMultiplier), copy: fmt(p.sensMultiplier) },
    { id: 'yx', label: RA_LABELS.yxRatio, kind: 'num', key: 'yxRatio', value: fmt(p.yxRatio) },
    { id: 'rot', label: RA_LABELS.rotation, kind: 'num', key: 'rotation', value: fmt(p.rotation) },
    { id: 'curve', label: '', kind: 'select', key: 'curve', value: p.curve, options: ['Linear', 'Natural', 'Classic', 'Power', 'Jump'] },
    { id: 'gain', label: RA_LABELS.gain, kind: 'check', key: 'gain', value: p.gain ? '1' : '0' },
    { id: 'accel', label: RA_LABELS.acceleration, kind: 'num', key: 'acceleration', value: fmt(p.acceleration), copy: fmt(p.acceleration) },
  ]
  if (p.curve === 'Classic' || p.curve === 'Power') f.push({ id: 'exp', label: RA_LABELS.exponent, kind: 'num', key: 'exponent', value: fmt(p.exponent) })
  if (p.curve === 'Natural') f.push({ id: 'limit', label: RA_LABELS.limit, kind: 'num', key: 'limit', value: fmt(p.limit) })
  f.push({ id: 'captype', label: RA_LABELS.capType, kind: 'select', key: 'capType', value: p.capType, options: ['Input', 'Output', 'Both'] })
  if (p.capType === 'Input' || p.capType === 'Both') f.push({ id: 'capin', label: RA_LABELS.capInput, kind: 'num', key: 'capInput', value: fmt(p.capInput), copy: fmt(p.capInput) })
  if (p.capType === 'Output' || p.capType === 'Both') f.push({ id: 'capout', label: RA_LABELS.capOutput, kind: 'num', key: 'capOutput', value: fmt(p.capOutput), copy: fmt(p.capOutput) })
  f.push({ id: 'offset', label: RA_LABELS.inputOffset, kind: 'num', key: 'inputOffset', value: fmt(p.inputOffset), copy: fmt(p.inputOffset) })
  return f
}

/** Plain-text list of every value, for the "Copy all" button. */
export function valuesText(p: RawAccelParams): string {
  return fieldsFor(p)
    .map((x) => (x.kind === 'check' ? `${x.label}: ${x.value === '1' ? 'on' : 'off'}` : x.label ? `${x.label}: ${x.value}` : `Curve: ${x.value}`))
    .join('\n')
}

// ------------------------------------------------------------------- graph

interface Palette {
  window: string
  panel: string
  text: string
  subtle: string
  border: string
  grid: string
  gridMinor: string
  curve: string
  ghost: string
  input: string
  accent: string
  button: string
}

export const PALETTES: Record<ReplicaTheme, Palette> = {
  classic: { window: '#f0f0f0', panel: '#ffffff', text: '#111111', subtle: '#555555', border: '#adadad', grid: '#c9c9c9', gridMinor: '#d9d9d9', curve: '#1f6fd0', ghost: '#e07b00', input: '#ffffff', accent: '#0078d7', button: '#e1e1e1' },
  dark: { window: '#101013', panel: '#17171c', text: '#ececf1', subtle: '#8f8f9b', border: '#2d2d36', grid: '#2f2f38', gridMinor: '#25252c', curve: '#5aa9ff', ghost: '#ffa94d', input: '#0e0e12', accent: '#4c9bff', button: '#24242c' },
}

const FONT = "Segoe UI, Roboto, Helvetica, Arial, sans-serif"

export interface Ghost {
  params: RawAccelParams
  /** Legend label, not drawn. */
  name?: string
}

export interface GraphOptions {
  params: RawAccelParams
  ghosts?: Ghost[]
  theme: ReplicaTheme
  w: number
  h: number
}

/** Inner SVG markup of the Sensitivity graph, positioned at 0,0 inside a w x h box. */
export function graphInner({ params, ghosts = [], theme, w, h }: GraphOptions): string {
  const c = PALETTES[theme]
  const L = 58, R = 16, T = 30, B = 46
  const pw = w - L - R
  const ph = h - T - B
  const main = sampleCurve(params)
  const ghostPts = ghosts.map((g) => sampleCurve(g.params))
  const ax = yAxisBounds(main, ...ghostPts)
  const sx = (x: number) => L + (x / SPEED_MAX) * pw
  const sy = (y: number) => T + ph - ((y - ax.min) / (ax.max - ax.min || 1)) * ph
  const path = (pts: CurvePoint[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join('')
  const o: string[] = []
  o.push(`<rect x="${L}" y="${T}" width="${pw}" height="${ph}" fill="${theme === 'classic' ? '#ffffff' : c.input}" stroke="${c.border}"/>`)
  // dotted minor vertical subdivisions every 5 counts/ms
  for (let x = GRID_MINOR; x < SPEED_MAX; x += GRID_MINOR) {
    if (x % GRID_MAJOR === 0) continue
    o.push(`<line x1="${sx(x)}" y1="${T}" x2="${sx(x)}" y2="${T + ph}" stroke="${c.gridMinor}" stroke-dasharray="1 3"/>`)
  }
  // major lines at 20 / 40 / 60 / 80
  for (let x = 0; x <= SPEED_MAX; x += GRID_MAJOR) {
    if (x > 0 && x < SPEED_MAX) o.push(`<line x1="${sx(x)}" y1="${T}" x2="${sx(x)}" y2="${T + ph}" stroke="${c.grid}"/>`)
    o.push(`<text x="${sx(x)}" y="${T + ph + 16}" text-anchor="middle" font-size="11" fill="${c.subtle}">${x}</text>`)
  }
  const ticks = 5
  for (let i = 0; i <= ticks; i++) {
    const v = ax.min + ((ax.max - ax.min) * i) / ticks
    o.push(`<line x1="${L}" y1="${sy(v)}" x2="${L + pw}" y2="${sy(v)}" stroke="${c.gridMinor}"/>`)
    o.push(`<text x="${L - 6}" y="${sy(v) + 4}" text-anchor="end" font-size="11" fill="${c.subtle}">${v.toFixed(2)}</text>`)
  }
  ghostPts.forEach((pts) => o.push(`<path d="${path(pts)}" fill="none" stroke="${c.ghost}" stroke-width="2" stroke-dasharray="7 5" opacity="0.9"/>`))
  o.push(`<path d="${path(main)}" fill="none" stroke="${c.curve}" stroke-width="2.4" stroke-linejoin="round"/>`)
  o.push(`<text x="${L + pw / 2}" y="18" text-anchor="middle" font-size="13" font-weight="600" fill="${c.text}">${RA_LABELS.graphTitle}</text>`)
  o.push(`<text x="${L + pw / 2}" y="${h - 8}" text-anchor="middle" font-size="11.5" fill="${c.subtle}">${RA_LABELS.graphX}</text>`)
  o.push(`<text transform="translate(14 ${T + ph / 2}) rotate(-90)" text-anchor="middle" font-size="11.5" fill="${c.subtle}">${RA_LABELS.graphY}</text>`)
  return o.join('')
}

/** Standalone responsive SVG for the live panel. */
export function graphSvg(o: GraphOptions): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${o.w} ${o.h}" width="100%" font-family="${FONT}" role="img" aria-label="${RA_LABELS.graphTitle}">${graphInner(o)}</svg>`
}

// ------------------------------------------------------- classic window PNG

function checkbox(x: number, y: number, on: boolean, c: Palette) {
  return `<rect x="${x}" y="${y}" width="15" height="15" rx="2" fill="${on ? c.accent : c.input}" stroke="${on ? c.accent : c.border}"/>${on ? `<path d="M${x + 3.5} ${y + 8} l3 3 l5-6" stroke="#fff" stroke-width="2" fill="none"/>` : ''}`
}

/** Style 1: the classic white Raw Accel window with the Sensitivity graph. */
export function classicWindowSvg(p: RawAccelParams, ghosts: Ghost[] = []): { svg: string; w: number; h: number } {
  const c = PALETTES.classic
  const fields = fieldsFor(p)
  const rowH = 30
  const leftW = 340
  const top = 38
  const bodyH = 48 + fields.length * rowH + 100
  const h = Math.max(bodyH + top, 470)
  const w = 940
  const o: string[] = []
  o.push(`<rect width="${w}" height="${h}" fill="${c.window}"/>`)
  o.push(`<rect width="${w}" height="${top - 6}" fill="#ffffff"/><text x="12" y="${top - 14}" font-size="12" fill="${c.text}">Raw Accel</text>`)
  o.push(`<line x1="0" y1="${top - 6}" x2="${w}" y2="${top - 6}" stroke="${c.border}"/>`)
  // status row
  let y = top + 14
  o.push(`<text x="16" y="${y}" font-size="12" fill="${c.text}">Last (x, y): (1, 0)</text><text x="160" y="${y}" font-size="12" fill="${c.text}">Current</text>`)
  o.push(checkbox(236, y - 12, p.lockXY, c) + `<text x="257" y="${y}" font-size="12" fill="${c.text}">${esc(RA_LABELS.lockXY)}</text>`)
  y += 22
  for (const f of fields) {
    const cy = y + rowH / 2
    if (f.kind === 'check') {
      o.push(checkbox(16, cy - 8, f.value === '1', c) + `<text x="38" y="${cy + 4}" font-size="13" fill="${c.text}">${esc(f.label)}</text>`)
    } else {
      if (f.label) o.push(`<text x="16" y="${cy + 4}" font-size="13" fill="${c.text}">${esc(f.label)}</text>`)
      const bx = f.label ? 150 : 16
      const bw = f.label ? 170 : 304
      o.push(`<rect x="${bx}" y="${cy - 11}" width="${bw}" height="22" fill="${c.input}" stroke="${c.border}"/><text x="${bx + 6}" y="${cy + 4}" font-size="13" fill="${c.text}">${esc(f.value)}</text>`)
      if (f.kind === 'select') o.push(`<text x="${bx + bw - 14}" y="${cy + 4}" font-size="10" fill="${c.text}">▼</text>`)
    }
    y += rowH
  }
  y += 6
  o.push(`<rect x="16" y="${y}" width="304" height="26" fill="${c.window}" stroke="${c.border}"/><text x="24" y="${y + 17}" font-size="12.5" fill="${c.text}">${RA_LABELS.anisotropy}</text><text x="302" y="${y + 17}" font-size="10" fill="${c.text}">▼</text>`)
  y += 40
  for (const [i, label] of ['Apply', 'Reset'].entries()) {
    o.push(`<rect x="${16 + i * 100}" y="${y}" width="90" height="26" fill="${c.button}" stroke="${c.border}"/><text x="${16 + i * 100 + 45}" y="${y + 17}" text-anchor="middle" font-size="12.5" fill="${c.text}">${label}</text>`)
  }
  o.push(`<g transform="translate(${leftW + 10} ${top + 4})">${graphInner({ params: p, ghosts, theme: 'classic', w: w - leftW - 24, h: h - top - 14 })}</g>`)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" font-family="${FONT}">${o.join('')}</svg>`
  return { svg, w, h }
}

// ------------------------------------------------------- showcase card PNG

export interface CardLabels {
  title: string
  subtitle: string
  base: string
  peak: string
  cmRange: string
  verdict: string
  stability: string
  flickLabel: string
  smoothLabel: string
  stabilityValue: string
  flickValue: string
  smoothValue: string
  advice: string
  hints: string[]
  footer: string
  baseEdpi: string
  peakEdpi: string
  cmText: string
  rtl: boolean
}

function wrap(text: string, max: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max && cur) {
      lines.push(cur)
      cur = w
    } else cur = (cur + ' ' + w).trim()
  }
  if (cur) lines.push(cur)
  return lines
}

/** Style 2: 16:9 pro gamer showcase card. */
export function showcaseCardSvg(p: RawAccelParams, l: CardLabels, ghosts: Ghost[] = []): { svg: string; w: number; h: number } {
  const c = PALETTES.dark
  const w = 1280, h = 720
  const o: string[] = []
  const ta = l.rtl ? 'end' : 'start'
  const dir = l.rtl ? ' direction="rtl"' : ''
  o.push(`<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0a0a0d"/><stop offset="1" stop-color="#17141c"/></linearGradient><linearGradient id="bar" x1="0" x2="1"><stop offset="0" stop-color="#ff2e4d"/><stop offset="1" stop-color="#ff8a3d"/></linearGradient></defs>`)
  o.push(`<rect width="${w}" height="${h}" fill="url(#bg)"/><rect width="${w}" height="6" fill="url(#bar)"/>`)
  o.push(`<text x="40" y="52" font-size="14" font-weight="700" letter-spacing="3" fill="#ff4d66">AIMLESS</text>`)
  o.push(`<text x="${l.rtl ? w - 40 : 40}" y="92" font-size="34" font-weight="700" fill="#ffffff" text-anchor="${ta}"${dir}>${esc(l.title)}</text>`)
  o.push(`<text x="${l.rtl ? w - 40 : 40}" y="118" font-size="15" fill="${c.subtle}" text-anchor="${ta}"${dir}>${esc(l.subtitle)}</text>`)
  // graph
  o.push(`<rect x="40" y="140" width="780" height="420" rx="16" fill="${c.panel}" stroke="${c.border}"/>`)
  o.push(`<g transform="translate(52 148)">${graphInner({ params: p, ghosts, theme: 'dark', w: 756, h: 404 })}</g>`)
  // badges
  const tile = (x: number, wd: number, label: string, value: string, color: string) =>
    `<rect x="${x}" y="580" width="${wd}" height="104" rx="14" fill="${c.panel}" stroke="${c.border}"/><text x="${x + wd / 2}" y="610" text-anchor="middle" font-size="13" fill="${c.subtle}">${esc(label)}</text><text x="${x + wd / 2}" y="655" text-anchor="middle" font-size="34" font-weight="700" fill="${color}">${esc(value)}</text>`
  o.push(tile(40, 250, l.base, l.baseEdpi, '#7ee0a1'))
  o.push(`<text x="313" y="650" text-anchor="middle" font-size="34" fill="${c.subtle}">→</text>`)
  o.push(tile(336, 250, l.peak, l.peakEdpi, '#ff6b81'))
  o.push(tile(610, 210, l.cmRange, l.cmText, '#ffffff'))
  // params
  const boxes = fieldsFor(p).filter((f) => f.id !== 'yx' && f.id !== 'rot')
  boxes.slice(0, 8).forEach((f, i) => {
    const col = i % 2
    const row = Math.floor(i / 2)
    const x = 850 + col * 200
    const y = 140 + row * 70
    const val = f.kind === 'check' ? (f.value === '1' ? '✓' : '—') : f.value
    const label = f.label || 'Curve'
    o.push(`<rect x="${x}" y="${y}" width="190" height="60" rx="12" fill="${c.panel}" stroke="${c.border}"/><text x="${x + 12}" y="${y + 22}" font-size="12" fill="${c.subtle}">${esc(label)}</text><text x="${x + 12}" y="${y + 48}" font-size="22" font-weight="700" fill="#fff">${esc(val)}</text>`)
  })
  // verdict
  const vy = 140 + Math.ceil(Math.min(boxes.length, 8) / 2) * 70 + 8
  o.push(`<rect x="850" y="${vy}" width="390" height="${684 - vy}" rx="14" fill="${c.panel}" stroke="${c.border}"/>`)
  const vx = l.rtl ? 1228 : 866
  o.push(`<text x="${vx}" y="${vy + 28}" font-size="13" font-weight="700" letter-spacing="1.5" fill="#ff4d66" text-anchor="${ta}"${dir}>${esc(l.verdict.toUpperCase())}</text>`)
  const rows: [string, string][] = [[l.stability, l.stabilityValue], [l.flickLabel, l.flickValue], [l.smoothLabel, l.smoothValue]]
  rows.forEach(([k, v], i) => {
    const yy = vy + 56 + i * 24
    o.push(`<text x="${vx}" y="${yy}" font-size="14" fill="${c.subtle}" text-anchor="${ta}"${dir}>${esc(k)}: <tspan fill="#fff" font-weight="700">${esc(v)}</tspan></text>`)
  })
  const adviceLines = wrap(l.advice, 46).slice(0, Math.max(2, Math.floor((684 - vy - 150) / 18)))
  adviceLines.forEach((ln, i) => o.push(`<text x="${vx}" y="${vy + 140 + i * 18}" font-size="13" fill="#d6d6de" text-anchor="${ta}"${dir}>${esc(ln)}</text>`))
  o.push(`<text x="40" y="708" font-size="12" fill="#5d5d68">${esc(l.footer)}</text>`)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" font-family="${FONT}">${o.join('')}</svg>`
  return { svg, w, h }
}

// ---------------------------------------------------------- browser output

/** Rasterize an SVG string to a PNG blob at 2x for crisp sharing. */
export function svgToPng(svg: string, w: number, h: number, scale = 2): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = w * scale
      canvas.height = h * scale
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(url)
        reject(new Error('no canvas'))
        return
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/png')
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('render failed'))
    }
    img.src = url
  })
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Copy a PNG to the clipboard. Returns false when the browser blocks image clipboard access. */
export async function copyPng(blob: Blob): Promise<boolean> {
  try {
    if (!navigator.clipboard || typeof ClipboardItem === 'undefined') return false
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    return true
  } catch {
    return false
  }
}

