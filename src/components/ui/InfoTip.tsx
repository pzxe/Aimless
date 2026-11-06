import { Info } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useT } from '@/i18n'
import { cn } from '@/utils/cn'

/**
 * A small ⓘ button with a tooltip explaining a field or control.
 * Hover or keyboard focus shows it, a tap toggles it on touch screens, Escape hides it.
 * The text is linked with aria-describedby so screen readers read it too.
 */
export function InfoTip({ children, className, label }: { children: ReactNode; className?: string; label?: string }) {
  const t = useT()
  const id = useId()
  const ref = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; above: boolean } | null>(null)
  const hideTimer = useRef<number>(0)

  const place = useCallback(() => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    const width = Math.min(300, window.innerWidth - 16)
    const left = Math.max(8, Math.min(r.left + r.width / 2 - width / 2, window.innerWidth - width - 8))
    const above = r.top > window.innerHeight * 0.55
    setPos({ top: above ? r.top - 8 : r.bottom + 8, left, above })
  }, [])

  const show = () => {
    window.clearTimeout(hideTimer.current)
    place()
    setOpen(true)
  }
  const hide = (delay = 80) => {
    window.clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(() => setOpen(false), delay)
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    const onScroll = () => setOpen(false)
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [open])

  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-label={label ?? t('help.more')}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onPointerEnter={(e) => e.pointerType === 'mouse' && show()}
        onPointerLeave={(e) => e.pointerType === 'mouse' && hide()}
        onFocus={show}
        onBlur={() => hide(0)}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (open) setOpen(false)
          else show()
        }}
        className={cn(
          'inline-flex size-4 shrink-0 items-center justify-center rounded-full text-subtle transition-colors hover:text-accent focus-visible:text-accent',
          className,
        )}
      >
        <Info className="size-3.5" aria-hidden="true" />
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            id={id}
            role="tooltip"
            onPointerEnter={() => window.clearTimeout(hideTimer.current)}
            onPointerLeave={() => hide()}
            className="glass fixed z-[70] w-[min(300px,calc(100vw-16px))] rounded-xl border border-border px-3.5 py-2.5 text-xs leading-relaxed font-normal tracking-normal text-text normal-case shadow-pop animate-[pop-in_120ms_ease-out]"
            style={{ top: pos.top, left: pos.left, transform: pos.above ? 'translateY(-100%)' : undefined }}
          >
            {children}
          </div>,
          document.body,
        )}
    </>
  )
}
