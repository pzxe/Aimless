import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface Option<T extends string> {
  value: T
  label: ReactNode
  icon?: ReactNode
}

/** Radio-group style segmented control. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T
  onChange: (value: T) => void
  options: Option<T>[]
  label: string
  className?: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex max-w-full overflow-x-auto rounded-xl border border-border bg-surface-2/70 p-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', className)}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-medium whitespace-nowrap transition-colors duration-150 [&_svg]:size-3.5',
              active ? 'bg-accent-soft text-text ring-1 ring-accent-line' : 'text-muted hover:text-text',
            )}
          >
            {o.icon}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
