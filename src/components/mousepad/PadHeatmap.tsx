import { useId } from 'react'
import { useFormat } from '@/hooks/useFormat'
import { useT } from '@/i18n'
import type { PadCalibration } from '@/store/padCalibrationStore'

const VIEW_W = 760

/**
 * Top-down view of the pad, to scale. A comfort heatmap (centre = easy reach, edge = reach limit), the player's recorded
 * sweeps when the pad was calibrated, one 360° turn along the middle and the depth a full look up and down needs.
 */
export function PadHeatmap({ padWidthCm, padHeightCm, cm360, trace }: { padWidthCm: number; padHeightCm: number; cm360: number | null; trace?: PadCalibration | null }) {
  const t = useT()
  const f = useFormat()
  const uid = useId().replace(/:/g, '')
  const span = Math.max(padWidthCm, cm360 ?? 0) * 1.04
  const s = VIEW_W / span
  const padW = padWidthCm * s
  const padH = Math.max(padHeightCm * s, 48)
  const top = 34
  const left = 0
  const midY = top + padH / 2
  const viewH = Math.max(padH, (cm360 ? (cm360 / 2) * s : 0) + 8) + top + 44
  const step = padWidthCm > 80 ? 10 : padWidthCm > 40 ? 5 : 2.5
  const ticks: number[] = []
  for (let x = 0; x <= padWidthCm + 0.001; x += step) ticks.push(x)
  const sweep = cm360 ? cm360 * s : 0
  const pitch = cm360 ? (cm360 / 2) * s : 0
  const over = cm360 !== null && cm360 > padWidthCm
  const tooShallow = cm360 !== null && cm360 / 2 > padHeightCm

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${viewH}`}
      className="w-full"
      style={{ maxHeight: 420, direction: 'ltr' }}
      role="img"
      aria-label={t('pad.heat.aria')}
    >
      <defs>
        <radialGradient id={`${uid}-comfort`} cx="50%" cy="50%" r="72%">
          <stop offset="0%" stopColor="#3ee6ff" stopOpacity="0.34" />
          <stop offset="45%" stopColor="#3fcf8e" stopOpacity="0.16" />
          <stop offset="78%" stopColor="#ffc83d" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#ff2e4d" stopOpacity="0.42" />
        </radialGradient>
        <clipPath id={`${uid}-clip`}>
          <rect x={left} y={top} width={padW} height={padH} rx="14" />
        </clipPath>
      </defs>

      {/* width dimension */}
      <g className="fill-subtle" fontSize="12" fontFamily="inherit">
        <line x1={left} y1={top - 14} x2={left + padW} y2={top - 14} className="stroke-border-strong" strokeWidth="1" />
        <line x1={left} y1={top - 19} x2={left} y2={top - 9} className="stroke-border-strong" />
        <line x1={left + padW} y1={top - 19} x2={left + padW} y2={top - 9} className="stroke-border-strong" />
        <text x={left + padW / 2} y={top - 20} textAnchor="middle" className="num">
          {f.dist(padWidthCm)} {f.unit} × {f.dist(padHeightCm)} {f.unit}
        </text>
      </g>

      {/* the pad */}
      <rect x={left} y={top} width={padW} height={padH} rx="14" className="fill-surface-2 stroke-border-strong" strokeWidth="1.5" />
      <g clipPath={`url(#${uid}-clip)`}>
        <rect x={left} y={top} width={padW} height={padH} fill={`url(#${uid}-comfort)`} />
        {/* centimetre grid */}
        {ticks.map((x) => (
          <line key={x} x1={left + x * s} y1={top} x2={left + x * s} y2={top + padH} className="stroke-border" strokeWidth="1" strokeDasharray="2 5" opacity="0.7" />
        ))}
        {/* recorded sweeps */}
        {trace &&
          trace.heat.map((v, i) => {
            if (v < 6) return null
            const cx = i % trace.cols
            const cy = Math.floor(i / trace.cols)
            const w = padW / trace.cols
            const h = padH / trace.rows
            const k = v / 255
            return <rect key={i} x={left + cx * w} y={top + cy * h} width={w + 0.5} height={h + 0.5} fill={`hsl(${190 - k * 190} 95% ${50 + k * 6}%)`} opacity={0.2 + k * 0.7} />
          })}
        {/* depth a full look up and down needs, from the top edge */}
        {cm360 && (
          <g>
            <line x1={left + 14} y1={top} x2={left + 14} y2={top + Math.min(pitch, padH)} stroke={tooShallow ? '#ff2e4d' : '#3ee6ff'} strokeWidth="3" strokeLinecap="round" />
          </g>
        )}
      </g>
      {cm360 && pitch > padH && <line x1={left + 14} y1={top + padH} x2={left + 14} y2={top + pitch} stroke="#ff2e4d" strokeWidth="3" strokeDasharray="4 5" strokeLinecap="round" />}

      {/* one 360° turn along the middle */}
      {cm360 && (
        <g>
          <line x1={left} y1={midY} x2={left + Math.min(sweep, padW)} y2={midY} stroke="var(--c-accent)" strokeWidth="6" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 6px var(--c-accent-glow))' }} />
          {over && <line x1={left + padW} y1={midY} x2={left + sweep} y2={midY} stroke="#ff2e4d" strokeWidth="6" strokeDasharray="6 6" strokeLinecap="round" />}
          <line x1={left + sweep / 2} y1={midY - 14} x2={left + sweep / 2} y2={midY + 14} stroke="#fff" strokeOpacity="0.7" strokeWidth="2" />
          <text x={left + sweep / 2} y={midY - 20} textAnchor="middle" className="fill-muted num" fontSize="12">180°</text>
          <g transform={`translate(${left + Math.min(sweep, VIEW_W - 30)} ${midY + 22})`}>
            <rect x="-24" y="-12" width="48" height="20" rx="6" fill="var(--c-accent)" />
            <text x="0" y="3" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--c-accent-fg)" className="num">360°</text>
          </g>
        </g>
      )}

      {/* ruler */}
      <g className="fill-subtle" fontSize="11">
        {ticks.map((x) => (
          <g key={x}>
            <line x1={left + x * s} y1={top + padH + 6} x2={left + x * s} y2={top + padH + 12} className="stroke-border-strong" />
            <text x={left + x * s} y={top + padH + 25} textAnchor="middle" className="num">
              {f.units === 'in' ? f.num(x / 2.54, 0) : x}
            </text>
          </g>
        ))}
      </g>
    </svg>
  )
}
