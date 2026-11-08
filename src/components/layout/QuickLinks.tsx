import { Sparkles, Star } from 'lucide-react'
import type { ReactNode } from 'react'
import { useT, type TranslationKey } from '@/i18n'
import { cn } from '@/utils/cn'
import { LINKS } from '@/utils/links'
import { GitHubMark } from './GitHubLink'
import { XMark } from './BrandMarks'

const ITEMS: { key: string; href: string; label: TranslationKey; icon: ReactNode; hover: string }[] = [
  { key: 'github', href: LINKS.github, label: 'quick.github', icon: <GitHubMark className="size-[18px]" />, hover: 'hover:text-text' },
  { key: 'star', href: LINKS.repo, label: 'quick.star', icon: <Star className="size-[18px]" />, hover: 'hover:border-warning/50 hover:text-warning hover:shadow-[0_0_16px_-2px_var(--color-warning)] [&:hover_svg]:fill-current' },
  { key: 'x', href: LINKS.xLab, label: 'quick.x', icon: <XMark className="size-[17px]" />, hover: 'hover:border-text/50 hover:text-text hover:shadow-[0_0_16px_-4px_var(--color-text)]' },
  { key: 'releases', href: LINKS.releases, label: 'quick.releases', icon: <Sparkles className="size-[18px]" />, hover: 'hover:border-accent/60 hover:text-accent hover:shadow-[0_0_16px_-2px_var(--color-accent)]' },
]

/**
 * Four external quick links (developer GitHub, star the repo, the project's X account, releases). They are plain `target="_blank"` anchors: the browser opens a new tab, and in
 * the desktop app the window's open handler passes https URLs to shell.openExternal (default browser).
 */
export function QuickLinks({ className }: { className?: string }) {
  const t = useT()
  return (
    <div role="group" aria-label={t('quick.group')} className={cn('grid grid-cols-4 gap-2', className)}>
      {ITEMS.map((i, index) => (
        <a
          key={i.key}
          href={i.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t(i.label)}
          className={cn(
            'group/tip relative flex h-10 items-center justify-center rounded-xl border border-border bg-surface-2/60 text-muted',
            'transition-[color,border-color,box-shadow,transform] duration-150 hover:-translate-y-px active:translate-y-0 active:scale-[0.97]',
            'focus-visible:outline-2 focus-visible:outline-offset-2',
            i.hover,
          )}
        >
          {i.icon}
          <span
            role="tooltip"
            className={cn(
              'pointer-events-none absolute bottom-[calc(100%+8px)] z-30 w-max max-w-[220px] rounded-lg border border-border-strong bg-surface-3 px-2.5 py-1.5 text-xs font-medium text-text opacity-0 shadow-pop transition-opacity duration-100 group-hover/tip:opacity-100 group-focus-visible/tip:opacity-100',
              // The outer tooltips align to their button's edge so they never leave the sidebar / window.
              index === 0 ? 'start-0 text-start' : index === ITEMS.length - 1 ? 'end-0 text-end' : 'start-1/2 -translate-x-1/2 text-center rtl:translate-x-1/2',
            )}
          >
            {t(i.label)}
          </span>
        </a>
      ))}
    </div>
  )
}
