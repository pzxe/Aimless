import type { CSSProperties } from 'react'
import { useT } from '@/i18n'
import type { Perspective } from '@/services/tppFppEngine'
import { cn } from '@/utils/cn'

const RAD = Math.PI / 180
const CX = 160
const PLAYER_Y = 132
/** Where each camera sits in the top-down scene: right on the player's eyes, or well behind the shoulder. */
const CAMERA_Y: Record<Perspective, number> = { fpp: PLAYER_Y - 6, tpp: PLAYER_Y + 46 }
const REACH = 104

/** A pie slice for a camera at `y` seeing `fov` degrees, pointing up the screen. */
export function wedgePath(y: number, fov: number): string {
  const a = (Math.min(Math.max(fov, 1), 179) / 2) * RAD
  const dx = Math.sin(a) * REACH
  const dy = Math.cos(a) * REACH
  const f = (n: number) => n.toFixed(2)
  return `M ${CX} ${y} L ${f(CX - dx)} ${f(y - dy)} A ${REACH} ${REACH} 0 0 1 ${f(CX + dx)} ${f(y - dy)} Z`
}

/** CSS `d` lets the browser morph one wedge into the next; the `d` attribute is the fallback. */
const morph = (d: string): CSSProperties => ({ d: `path("${d}")` }) as CSSProperties

/**
 * A top-down scene: the camera glides between the shoulder (third person) and the eyes (first person) while its
 * field-of-view wedge widens or narrows. The perspective you are converting from is drawn solid, the other one dashed.
 */
export function CameraScene({ active, fov }: { active: Perspective; fov: Record<Perspective, number | null> }) {
  const t = useT()
  const other: Perspective = active === 'tpp' ? 'fpp' : 'tpp'
  const wedge = (p: Perspective) => wedgePath(CAMERA_Y[p], fov[p] ?? 90)
  return (
    <svg viewBox="0 0 320 200" className="h-auto w-full" role="img" aria-label={t('tpp.preview.top')}>
      <defs>
        <radialGradient id="tpp-fade" cx="50%" cy="100%" r="100%">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.5" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.04" />
        </radialGradient>
      </defs>
      {/* ground grid */}
      <g className="text-border-strong" stroke="currentColor" strokeWidth="0.6" opacity="0.55">
        {[40, 80, 120, 160, 200, 240, 280].map((x) => <line key={x} x1={x} y1="0" x2={x} y2="200" />)}
        {[40, 80, 120, 160].map((y) => <line key={y} x1="0" y1={y} x2="320" y2={y} />)}
      </g>
      {/* the camera that is not the source: a dashed ghost */}
      <path d={wedge(other)} style={morph(wedge(other))} className="tpp-wedge text-info" fill="none" stroke="currentColor" strokeWidth="1.4" strokeDasharray="4 4" opacity="0.8" />
      {/* the source camera */}
      <path d={wedge(active)} style={morph(wedge(active))} className="tpp-wedge text-accent" fill="url(#tpp-fade)" stroke="currentColor" strokeWidth="1.8" />
      {/* the player */}
      <g>
        <ellipse cx={CX} cy={PLAYER_Y + 2} rx="15" ry="8" className="fill-surface-3 stroke-border-strong" strokeWidth="1" />
        <circle cx={CX} cy={PLAYER_Y - 2} r="7.5" className="fill-surface-2 stroke-text" strokeWidth="1.4" />
        <path d={`M ${CX - 3} ${PLAYER_Y - 10} L ${CX} ${PLAYER_Y - 14} L ${CX + 3} ${PLAYER_Y - 10}`} className="stroke-text" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      </g>
      {/* the camera body */}
      <g className="tpp-cam text-accent" style={{ transform: `translateY(${CAMERA_Y[active]}px)` }}>
        <rect x={CX - 9} y="-5" width="18" height="11" rx="3" fill="var(--c-surface)" stroke="currentColor" strokeWidth="1.6" />
        <path d={`M ${CX - 4} -5 L ${CX - 2} -9 L ${CX + 2} -9 L ${CX + 4} -5`} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        <circle cx={CX} cy="0.5" r="2.6" fill="currentColor" />
      </g>
    </svg>
  )
}

/**
 * "What you see": the two views stacked on the same crosshair, drawn to scale. The wider one shows more of the world.
 */
export function FrameCompare({ from, to, fromLabel, toLabel, aspect }: { from: number; to: number; fromLabel: string; toLabel: string; aspect: number }) {
  // Width on a flat screen at one distance grows with tan(FOV / 2).
  const a = Math.tan((from * RAD) / 2)
  const b = Math.tan((to * RAD) / 2)
  const widest = Math.max(a, b)
  const pct = (v: number) => `${Math.max(8, (v / widest) * 92)}%`
  const box = (v: number, tone: 'accent' | 'info', label: string) => (
    <div
      className={cn('tpp-frame absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md border-2', tone === 'accent' ? 'border-accent bg-accent-soft' : 'border-info bg-info-soft')}
      style={{ width: pct(v), aspectRatio: String(aspect) }}
    >
      <span className={cn('absolute text-[10px] font-semibold tracking-wide whitespace-nowrap uppercase', tone === 'accent' ? 'start-1.5 top-1 text-accent' : 'end-1.5 bottom-1 text-info')}>
        {label}
      </span>
    </div>
  )
  return (
    <div className="relative mx-auto w-full max-w-[460px] overflow-hidden rounded-xl border border-border bg-bg/50" style={{ aspectRatio: String(aspect) }}>
      {box(a, 'accent', fromLabel)}
      {box(b, 'info', toLabel)}
      <div className="absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-text/80" aria-hidden="true" />
    </div>
  )
}
