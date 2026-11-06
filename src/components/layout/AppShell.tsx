import { Languages, Menu, Moon, ShieldCheck, Sun, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useT } from '@/i18n'
import { useSettings } from '@/store/settingsStore'
import { cn } from '@/utils/cn'
import { Button } from '../ui/Button'
import { LogoMark } from './Logo'
import { NAV_ITEMS } from './nav'

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const t = useT()
  return (
    <nav className="flex flex-col gap-0.5" aria-label={t('nav.menu')}>
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'relative flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors duration-150',
              isActive ? 'bg-surface-2 text-text' : 'text-muted hover:bg-surface-2/60 hover:text-text',
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && <span className="absolute inset-y-2 start-0 w-0.5 rounded-full bg-accent" aria-hidden="true" />}
              <Icon className={cn('size-4', isActive && 'text-accent')} />
              {t(label)}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

function Brand({ compact }: { compact?: boolean }) {
  const t = useT()
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark />
      <div className="leading-tight">
        <div className="text-sm font-semibold tracking-tight">{t('app.name')}</div>
        {!compact && <div className="text-[11px] text-subtle">{t('app.tagline')}</div>}
      </div>
    </div>
  )
}

function QuickToggles({ resolvedTheme }: { resolvedTheme: 'dark' | 'light' }) {
  const t = useT()
  const language = useSettings((s) => s.language)

  const set = useSettings((s) => s.set)
  const isDark = resolvedTheme === 'dark'
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t('settings.theme')}
        title={t('settings.theme')}
        onClick={() => set({ theme: isDark ? 'light' : 'dark' })}
      >
        {isDark ? <Sun /> : <Moon />}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        aria-label={t('settings.language')}
        title={t('settings.language')}
        onClick={() => set({ language: language === 'en' ? 'ar' : 'en' })}
        className="px-2"
      >
        <Languages />
        <span className="hidden sm:inline">{language === 'en' ? 'العربية' : 'English'}</span>
      </Button>
    </div>
  )
}

export function AppShell({ children, resolvedTheme }: { children: ReactNode; resolvedTheme: 'dark' | 'light' }) {
  const t = useT()
  const [drawer, setDrawer] = useState(false)
  const location = useLocation()

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
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-e border-border bg-surface/50 px-3 py-4 lg:flex">
        <div className="px-2 pb-6">
          <Brand />
        </div>
        <NavList />
        <div className="mt-auto space-y-3 px-1">
          <QuickToggles resolvedTheme={resolvedTheme} />
          <p className="flex items-center gap-1.5 px-1 text-[11px] text-subtle">
            <ShieldCheck className="size-3.5" />
            {t('nav.localOnly')}
          </p>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-bg/85 px-4 backdrop-blur lg:hidden">
        <Brand compact />
        <div className="flex items-center gap-1">
          <QuickToggles resolvedTheme={resolvedTheme} />
          <Button variant="ghost" size="icon" aria-label={t('nav.menu')} aria-expanded={drawer} onClick={() => setDrawer(true)}>
            <Menu />
          </Button>
        </div>
      </header>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50 animate-[fade-in_150ms_ease-out]" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 end-0 flex w-72 max-w-[85vw] flex-col border-s border-border bg-surface p-3 shadow-pop">
            <div className="flex items-center justify-between px-2 pb-4">
              <Brand />
              <Button variant="ghost" size="icon-sm" aria-label={t('common.close')} onClick={() => setDrawer(false)}>
                <X />
              </Button>
            </div>
            <NavList onNavigate={() => setDrawer(false)} />
            <p className="mt-auto flex items-center gap-1.5 px-2 text-[11px] text-subtle">
              <ShieldCheck className="size-3.5" />
              {t('nav.localOnly')}
            </p>
          </div>
        </div>
      )}

      <main className="min-w-0">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</div>
      </main>
    </div>
  )
}

export function PageHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between lg:mb-8">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function EmptyState({ icon, title, hint, action }: { icon: ReactNode; title: ReactNode; hint?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-12 text-center">
      <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-surface-2 text-muted [&_svg]:size-5">{icon}</div>
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-xs text-muted">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
