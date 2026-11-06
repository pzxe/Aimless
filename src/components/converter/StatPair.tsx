import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

/** Small labelled metric, e.g. "eDPI 800". */
export function Stat({ label, value, muted, className }: { label: ReactNode; value: ReactNode; muted?: boolean; className?: string }) {
  return (
    <div className={cn('min-w-0 rounded-lg bg-surface-2 px-3 py-2.5', className)}>
      <div className="text-[11px] font-medium text-subtle">{label}</div>
      <div className={cn('ltr num mt-0.5 truncate text-start text-base font-semibold', muted && 'text-subtle')}>{value}</div>
    </div>
  )
}
