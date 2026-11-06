import { ArrowDownToLine } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useT } from '@/i18n'
import { useConverter } from '@/store/converterStore'
import { cn } from '@/utils/cn'

/** Fills a tool from the converter's current setting. */
export function FromConverter({ onPick }: { onPick: (c: ReturnType<typeof useConverter.getState>) => void }) {
  const t = useT()
  return (
    <Button size="sm" variant="ghost" onClick={() => onPick(useConverter.getState())} title={t('tools.fromConverter')}>
      <ArrowDownToLine />
      <span className="hidden sm:inline">{t('tools.fromConverter')}</span>
    </Button>
  )
}

/** Common DPI values as one-click chips. */
export function DpiChips({ onPick, current }: { onPick: (dpi: string) => void; current: string }) {
  return (
    <div className="-mt-2 flex flex-wrap gap-1.5">
      {['400', '800', '1600', '3200'].map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => onPick(d)}
          aria-pressed={current === d}
          className={cn(
            'num rounded-full border px-2.5 py-0.5 text-[11px] transition-colors',
            current === d ? 'border-accent-line bg-accent-soft text-text' : 'border-border text-muted hover:border-border-strong hover:text-text',
          )}
        >
          {d}
        </button>
      ))}
    </div>
  )
}
