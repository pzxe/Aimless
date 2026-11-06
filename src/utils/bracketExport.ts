import { resolveTournament, type BracketSide, type Tournament } from '@/core/tournament'

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

export interface BracketSvgLabels {
  roundName: (side: BracketSide, round: number) => string
  sideName: (side: BracketSide) => string
  champion: string
  tbd: string
  bye: string
  footer: string
}

const CARD_W = 220
const CARD_H = 56
const COL_GAP = 44
const ROW_GAP = 16
const PAD = 40

/** Render a tournament as a standalone SVG (dark theme), safe to share. */
export function bracketSvg(t: Tournament, labels: BracketSvgLabels, accent = '#ff2e4d'): string {
  const resolved = resolveTournament(t)
  const name = (id: string | null) => (id ? (t.participants.find((p) => p.id === id)?.name ?? '?') : null)
  const sides: BracketSide[] = t.format === 'double' ? ['upper', 'lower', 'grand'] : ['upper']
  const parts: string[] = []
  let y = PAD + 70
  let width = 0

  for (const side of sides) {
    const matches = t.matches.filter((m) => m.side === side && !(m.isReset && resolved.matches.get(m.id)?.status === 'void'))
    if (matches.length === 0) continue
    const rounds = [...new Set(matches.map((m) => m.round))].sort((a, b) => a - b)
    const maxCount = Math.max(...rounds.map((r) => matches.filter((m) => m.round === r).length))
    const colH = maxCount * CARD_H + (maxCount - 1) * ROW_GAP
    if (sides.length > 1) {
      parts.push(`<text x="${PAD}" y="${y}" fill="${accent}" font-size="12" font-weight="700" letter-spacing="2">${esc(labels.sideName(side).toUpperCase())}</text>`)
      y += 18
    }
    const centers = new Map<string, { x: number; y: number }>()
    rounds.forEach((round, ri) => {
      const x = PAD + ri * (CARD_W + COL_GAP)
      width = Math.max(width, x + CARD_W + PAD)
      parts.push(`<text x="${x}" y="${y + 12}" fill="#8f8f9b" font-size="10" font-weight="600" letter-spacing="1.5">${esc(labels.roundName(side, round).toUpperCase())}</text>`)
      const inRound = matches.filter((m) => m.round === round)
      const slot = colH / inRound.length
      inRound.forEach((m, i) => {
        const cy = y + 24 + slot * i + slot / 2
        const top = cy - CARD_H / 2
        centers.set(m.id, { x, y: cy })
        const r = resolved.matches.get(m.id)!
        const dim = r.status === 'void' ? 0.35 : 1
        parts.push(`<g opacity="${dim}"><rect x="${x}" y="${top}" width="${CARD_W}" height="${CARD_H}" rx="10" fill="#17171b" stroke="${r.status === 'ready' ? accent : '#2a2a31'}"/>`)
        parts.push(`<line x1="${x + 10}" y1="${cy}" x2="${x + CARD_W - 10}" y2="${cy}" stroke="#2a2a31"/>`)
        for (const k of [0, 1] as const) {
          const s = r.slots[k]
          const id = s.kind === 'filled' ? s.id : null
          const label = name(id) ?? (s.kind === 'empty' ? labels.bye : labels.tbd)
          const won = id !== null && id === r.winnerId && (r.status === 'done' || r.status === 'walkover')
          const ty = top + (k === 0 ? 18 : 46)
          const fill = won ? '#ffffff' : id ? '#a3a3af' : '#5d5d68'
          parts.push(`<text x="${x + 12}" y="${ty}" fill="${fill}" font-size="12" font-weight="${won ? 700 : 400}">${esc(label.length > 24 ? `${label.slice(0, 23)}…` : label)}</text>`)
          const score = r.result?.score[k]
          if (score !== undefined) {
            parts.push(`<rect x="${x + CARD_W - 34}" y="${ty - 13}" width="24" height="18" rx="5" fill="${won ? accent : '#26262d'}"/>`)
            parts.push(`<text x="${x + CARD_W - 22}" y="${ty}" fill="#fff" font-size="11" font-weight="700" text-anchor="middle">${score}</text>`)
          }
        }
        parts.push('</g>')
      })
    })
    // Connectors
    for (const m of matches) {
      const to = centers.get(m.id)
      if (!to) continue
      for (const src of m.sources) {
        if (src.type !== 'winner') continue
        const from = centers.get(src.matchId)
        if (!from) continue
        const x1 = from.x + CARD_W
        const mid = (x1 + to.x) / 2
        parts.unshift(`<path d="M ${x1} ${from.y} H ${mid} V ${to.y} H ${to.x}" fill="none" stroke="#33333b" stroke-width="1.5"/>`)
      }
    }
    y += 24 + colH + 48
  }

  const champion = name(resolved.championId)
  const height = y + 10
  width = Math.max(width, 640)
  const header = [
    `<text x="${PAD}" y="${PAD + 10}" fill="#f4f4f6" font-size="26" font-weight="700">${esc(t.name)}</text>`,
    champion
      ? `<text x="${PAD}" y="${PAD + 38}" fill="${accent}" font-size="14" font-weight="600">🏆 ${esc(labels.champion)}: ${esc(champion)}</text>`
      : '',
    `<text x="${width - PAD}" y="${height - 14}" fill="#5d5d68" font-size="10" text-anchor="end">${esc(labels.footer)}</text>`,
  ]
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="Inter, 'Segoe UI', Arial, sans-serif">`,
    `<rect width="100%" height="100%" fill="#09090b"/>`,
    ...header,
    ...parts,
    '</svg>',
  ].join('')
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

/** Rasterise an SVG string to a PNG at 2× for sharing. */
export async function svgToPng(svg: string): Promise<Blob> {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    const canvas = document.createElement('canvas')
    canvas.width = img.width * 2
    canvas.height = img.height * 2
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('no canvas')
    ctx.scale(2, 2)
    ctx.drawImage(img, 0, 0)
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('png'))), 'image/png'))
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Plain-text summary for chat apps. */
export function bracketText(t: Tournament, labels: BracketSvgLabels): string {
  const resolved = resolveTournament(t)
  const name = (id: string | null) => (id ? (t.participants.find((p) => p.id === id)?.name ?? '?') : '?')
  const lines = [t.name]
  if (resolved.championId) lines.push(`🏆 ${labels.champion}: ${name(resolved.championId)}`)
  for (const m of t.matches) {
    const r = resolved.matches.get(m.id)!
    if (r.status !== 'done' || !r.result) continue
    lines.push(`${labels.roundName(m.side, m.round)}: ${name(r.result.participants[0])} ${r.result.score[0]}–${r.result.score[1]} ${name(r.result.participants[1])}`)
  }
  return lines.join('\n')
}
