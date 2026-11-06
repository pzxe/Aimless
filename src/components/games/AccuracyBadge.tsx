import { CircleCheck, CircleDashed, CircleSlash, Ruler } from 'lucide-react'
import type { ResultAccuracy } from '@/core/sensitivity'
import { useT } from '@/i18n'
import { cn } from '@/utils/cn'

const styles: Record<ResultAccuracy, string> = {
  verified: 'bg-success-soft text-success',
  approximate: 'bg-warning-soft text-warning',
  calibrated: 'bg-info-soft text-info',
  unsupported: 'bg-danger-soft text-danger',
}

const icons = {
  verified: CircleCheck,
  approximate: CircleDashed,
  calibrated: Ruler,
  unsupported: CircleSlash,
} as const

export function AccuracyBadge({ accuracy, className, compact }: { accuracy: ResultAccuracy; className?: string; compact?: boolean }) {
  const t = useT()
  const Icon = icons[accuracy]
  return (
    <span
      title={t(`accuracy.${accuracy}.desc`)}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap',
        styles[accuracy],
        className,
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      {compact ? <span className="sr-only">{t(`accuracy.${accuracy}`)}</span> : t(`accuracy.${accuracy}`)}
    </span>
  )
}

export function AccuracyDot({ accuracy }: { accuracy: ResultAccuracy }) {
  const color = {
    verified: 'bg-success',
    approximate: 'bg-warning',
    calibrated: 'bg-info',
    unsupported: 'bg-danger/70',
  }[accuracy]
  return <span className={cn('inline-block size-1.5 shrink-0 rounded-full', color)} aria-hidden="true" />
}
