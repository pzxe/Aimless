import { Check, Globe } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useT } from '@/i18n'
import { useSettings } from '@/store/settingsStore'
import { LANGUAGES } from '@/store/types'
import { cn } from '@/utils/cn'

/** Compact language switcher (5 languages) with keyboard support. */
export function LanguageMenu({ className, align = 'end' }: { className?: string; align?: 'start' | 'end' }) {
  const t = useT()
  const language = useSettings((s) => s.language)
  const set = useSettings((s) => s.set)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listId = useId()

  useEffect(() => {
    if (!open) return
    setActive(Math.max(0, LANGUAGES.findIndex((l) => l.code === language)))
    const onDown = (e: MouseEvent) => !rootRef.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open, language])

  const choose = (i: number) => {
    const l = LANGUAGES[i]
    if (l) set({ language: l.code })
    setOpen(false)
    buttonRef.current?.focus()
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={t('settings.language')}
        title={t('settings.language')}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault()
            setOpen(true)
          }
        }}
        className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-border bg-surface-2/60 px-2.5 text-xs font-medium text-muted transition-colors hover:border-border-strong hover:text-text"
      >
        <Globe className="size-3.5" />
        <span className="uppercase">{language}</span>
      </button>
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={t('settings.language')}
          tabIndex={-1}
          ref={(el) => el?.focus()}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActive((a) => (a + 1) % LANGUAGES.length)
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActive((a) => (a - 1 + LANGUAGES.length) % LANGUAGES.length)
            } else if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              choose(active)
            } else if (e.key === 'Escape') {
              e.stopPropagation()
              setOpen(false)
              buttonRef.current?.focus()
            } else if (e.key === 'Tab') setOpen(false)
          }}
          className={cn(
            'glass absolute top-full z-50 mt-2 w-44 rounded-2xl border border-border p-1.5 shadow-pop outline-none animate-[pop-in_140ms_cubic-bezier(0.2,0.8,0.2,1)]',
            align === 'end' ? 'end-0' : 'start-0',
          )}
        >
          {LANGUAGES.map((l, i) => (
            <li
              key={l.code}
              role="option"
              aria-selected={l.code === language}
              lang={l.code}
              onMouseMove={() => setActive(i)}
              onClick={() => choose(i)}
              className={cn(
                'flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm',
                i === active && 'bg-surface-2',
              )}
            >
              <span className="w-6 text-[11px] font-semibold text-subtle uppercase">{l.code}</span>
              <span className="flex-1">{l.native}</span>
              {l.code === language && <Check className="size-3.5 text-accent" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
