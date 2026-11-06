import { AIM_METER_RANGE, AIM_STYLE_BOUNDS, aimMeterPosition, classifyAimStyle } from '@/core/tools'
import { useFormat } from '@/hooks/useFormat'
import { useT } from '@/i18n'
import { cn } from '@/utils/cn'

const CX = 110
const CY = 104
const R = 86

function point(p: number, r = R) {
  const a = Math.PI * (1 - p)
  return { x: CX + r * Math.cos(a), y: CY - r * Math.sin(a) }
}
function arc(p0: number, p1: number, r = R) {
  const a = point(p0, r)
  const b = point(p1, r)
  return `M ${a.x} ${a.y} A ${r} ${r} 0 0 1 ${b.x} ${b.y}`
}

/** Arc gauge classifying a cm/360° into wrist / hybrid / arm aim. */
export function AimStyleMeter({ cm360, compact = false }: { cm360: number | null; compact?: boolean }) {
  const t = useT()
  const f = useFormat()
  const style = cm360 ? classifyAimStyle(cm360) : null
  const p = cm360 ? aimMeterPosition(cm360) : 0
  const wristEnd = aimMeterPosition(AIM_STYLE_BOUNDS.wristMax)
  const hybridEnd = aimMeterPosition(AIM_STYLE_BOUNDS.hybridMax)
  const tip = point(p)

  return (
    <div className={cn('flex flex-col items-center', compact ? 'gap-1' : 'gap-3')}>
      <svg viewBox="0 0 220 122" className={cn('w-full', compact ? 'max-w-52' : 'max-w-72')} style={{ direction: 'ltr' }} role="img" aria-label={style ? t(`aim.${style}`) : t('aim.title')}>
        <path d={arc(0, 1)} fill="none" stroke="var(--c-surface-3)" strokeWidth="12" strokeLinecap="round" />
        <path d={arc(0, wristEnd)} fill="none" stroke="var(--c-info)" strokeOpacity="0.5" strokeWidth="12" strokeLinecap="round" />
        <path d={arc(wristEnd + 0.01, hybridEnd)} fill="none" stroke="var(--c-success)" strokeOpacity="0.5" strokeWidth="12" />
        <path d={arc(hybridEnd + 0.01, 1)} fill="none" stroke="var(--c-warning)" strokeOpacity="0.5" strokeWidth="12" strokeLinecap="round" />
        {cm360 && <path d={arc(0, Math.max(0.001, p))} fill="none" stroke="var(--c-accent)" strokeWidth="4" strokeLinecap="round" className="transition-all duration-500" />}
        {/* ticks */}
        {Array.from({ length: 13 }, (_, i) => i / 12).map((q) => {
          const a = point(q, R - 16)
          const major = Math.round(q * 12) % 3 === 0
          const b = point(q, major ? R - 24 : R - 20)
          return <line key={q} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--c-subtle)" strokeOpacity="0.45" strokeWidth="1" />
        })}
        {cm360 && (
          <g className="transition-transform duration-500">
            <circle cx={tip.x} cy={tip.y} r="11" fill="var(--c-accent)" opacity="0.25" />
            <circle cx={tip.x} cy={tip.y} r="6" fill="var(--c-accent)" style={{ filter: 'drop-shadow(0 0 6px var(--c-accent))' }} />
            <circle cx={tip.x} cy={tip.y} r="2.4" fill="#fff" />
          </g>
        )}
        <text x={CX} y={CY - 18} textAnchor="middle" className="num" fill="var(--c-text)" fontSize="30" fontWeight="600">
          {cm360 ? f.dist(cm360) : '—'}
        </text>
        <text x={CX} y={CY} textAnchor="middle" fill="var(--c-subtle)" fontSize="10" letterSpacing="1.5">
          {f.distLabel.toUpperCase()}
        </text>
        <text x={point(0).x} y={CY + 16} textAnchor="middle" fill="var(--c-subtle)" fontSize="9">{AIM_METER_RANGE.min}</text>
        <text x={point(1).x} y={CY + 16} textAnchor="middle" fill="var(--c-subtle)" fontSize="9">{AIM_METER_RANGE.max}+ cm</text>
      </svg>
      <div className="text-center">
        <div className={cn('display', compact ? 'text-lg' : 'text-2xl', style ? 'text-text' : 'text-subtle')}>
          {style ? t(`aim.${style}`) : t('aim.empty')}
        </div>
        {!compact && style && <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-muted">{t(`aim.${style}.insight`)}</p>}
      </div>
    </div>
  )
}
