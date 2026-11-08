import { Menu, Moon, ShieldCheck, Sun, X } from 'lucide-react'
import { useUpdateBadge } from '@/store/updateStore'
import { UpdateNotificationBell } from '@/components/UpdateNotificationBell'
import { QuickLinks } from './QuickLinks'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAutoHideHeader } from '@/hooks/useAutoHideHeader'
import { useT } from '@/i18n'
import { useSettings } from '@/store/settingsStore'
import { cn } from '@/utils/cn'
import { Button } from '../ui/Button'
import { GitHubLink } from './GitHubLink'
import { LanguageMenu } from './LanguageMenu'
import { LogoMark, Wordmark } from './Logo'
import { NAV_ITEMS } from './nav'

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const t = useT()
  const updateBadge = useUpdateBadge()
  const groups = [
    { key: 'main', label: t('nav.group.workspace') },
    { key: 'library', label: t('nav.group.library') },
  ] as const
  return (
    <nav className="flex flex-col gap-5" aria-label={t('nav.menu')}>
      {groups.map((g) => (
        <div key={g.key}>
          <div className="mb-2 px-3 text-[10px] font-semibold tracking-[0.18em] text-subtle uppercase">{g.label}</div>
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.filter((i) => i.group === g.key).map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-[background-color,color,box-shadow] duration-200',
                    isActive
                      ? 'bg-accent-soft text-text shadow-[inset_0_0_0_1px_var(--c-accent-line),0_8px_24px_-12px_var(--c-accent-glow)]'
                      : 'text-muted hover:bg-surface-2/70 hover:text-text',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span
                        className="absolute inset-y-2.5 -start-3 w-1 rounded-full bg-accent-fill shadow-[0_0_12px_2px_var(--c-accent-glow)]"
                        aria-hidden="true"
                      />
                    )}
                    <Icon className={cn('size-[18px]', isActive && 'text-accent')} />
                    {t(label)}
                    {to === '/settings' && updateBadge && (
                      <span
                        role="img"
                        aria-label={t('updates.badge')}
                        title={t('updates.badge')}
                        className="ms-auto size-2 rounded-full bg-accent-fill shadow-[0_0_8px_1px_var(--c-accent-glow)]"
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  )
}

function Brand() {
  return (
    <Link to="/dashboard" className="flex items-center gap-2.5" aria-label="Aimless">
      <LogoMark />
      <Wordmark />
    </Link>
  )
}

export function ThemeToggle({ resolvedTheme }: { resolvedTheme: 'dark' | 'light' }) {
  const t = useT()
  const set = useSettings((s) => s.set)
  const isDark = resolvedTheme === 'dark'
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={t('settings.theme')}
      title={t('settings.theme')}
      onClick={() => set({ theme: isDark ? 'light' : 'dark' })}
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  )
}

function TopBarActions({ resolvedTheme }: { resolvedTheme: 'dark' | 'light' }) {
  return (
    <div className="flex items-center gap-1.5">
      {/* the repository link also lives in the sidebar, so it can make room for the bell on very narrow phones */}
      <GitHubLink className="max-[380px]:hidden" />
      <LanguageMenu />
      <ThemeToggle resolvedTheme={resolvedTheme} />
      <UpdateNotificationBell />
    </div>
  )
}

export function AppShell({ children, resolvedTheme }: { children: ReactNode; resolvedTheme: 'dark' | 'light' }) {
  const t = useT()
  const [drawer, setDrawer] = useState(false)
  const location = useLocation()
  const { hidden, atTop } = useAutoHideHeader()

  useEffect(() => {
    setDrawer(false)
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  useEffect(() => {
    if (!drawer) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawer(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drawer])

  return (
    <div className="min-h-[calc(100dvh-var(--tb))] lg:grid lg:grid-cols-[264px_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-(--tb) hidden h-[calc(100dvh-var(--tb))] flex-col p-3 lg:flex">
        <div className="card flex h-full flex-col rounded-[24px] px-3 py-5">
          <div className="px-3 pb-7">
            <Brand />
          </div>
          <div className="scrollbar-thin -mx-1 flex-1 overflow-y-auto px-1">
            <NavList />
          </div>
          <div className="hairline my-4" />
          <QuickLinks className="mb-4" />
          <p className="flex items-center gap-1.5 px-3 text-[11px] text-subtle">
            <ShieldCheck className="size-3.5 text-success" />
            {t('nav.localOnly')}
          </p>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Top bar */}
        <header
          className={cn(
            'sticky top-(--tb) z-30 border-b transition-[transform,background-color,border-color,backdrop-filter] duration-300 ease-out',
            hidden && !drawer ? '-translate-y-full' : 'translate-y-0',
            atTop ? 'border-transparent bg-transparent' : 'border-border/40 bg-bg/40 backdrop-blur-md',
          )}
        >
          <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
            <div className="lg:hidden">
              <Brand />
            </div>
            <div className="hidden lg:block" />
            <div className="flex items-center gap-1">
              <TopBarActions resolvedTheme={resolvedTheme} />
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label={t('nav.menu')}
                aria-expanded={drawer}
                onClick={() => setDrawer(true)}
              >
                <Menu />
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 pt-2 pb-10 sm:px-6 lg:px-10 lg:pb-14">{children}</main>
      </div>

      {drawer && (
        <div className="fixed inset-x-0 top-(--tb) bottom-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 animate-[fade-in_150ms_ease-out]" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 end-0 flex w-72 max-w-[85vw] flex-col border-s border-border bg-surface p-4 shadow-pop">
            <div className="flex items-center justify-between px-2 pb-6">
              <Brand />
              <Button variant="ghost" size="icon-sm" aria-label={t('common.close')} onClick={() => setDrawer(false)}>
                <X />
              </Button>
            </div>
            <div className="scrollbar-thin flex-1 overflow-y-auto">
              <NavList onNavigate={() => setDrawer(false)} />
            </div>
            <QuickLinks className="mt-4" />
            <p className="mt-4 flex items-center gap-1.5 px-2 text-[11px] text-subtle">
              <ShieldCheck className="size-3.5 text-success" />
              {t('nav.localOnly')}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  eyebrow?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between lg:mb-8">
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
        <h1 className="display text-3xl sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function EmptyState({ icon, title, hint, action }: { icon: ReactNode; title: ReactNode; hint?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[20px] border border-dashed border-border-strong px-6 py-14 text-center">
      <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-accent-soft text-accent [&_svg]:size-5">{icon}</div>
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-xs text-muted">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
