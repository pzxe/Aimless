import { Download, MonitorDown } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useT } from '@/i18n'
import { isDesktopApp, RELEASES_URL } from '@/utils/platform'

/**
 * Wraps a route that only the desktop app has (mousepad lab, profiles, alt accounts, game library, settings).
 * Inside the desktop app it renders the page untouched; in the browser it shows a short "get the desktop app" notice.
 */
export function DesktopOnly({ children }: { children: ReactNode }) {
  return isDesktopApp ? <>{children}</> : <DesktopOnlyNotice />
}

export function DesktopOnlyNotice() {
  const t = useT()
  return (
    <div className="mx-auto max-w-lg py-20 text-center" data-testid="desktop-only-notice">
      <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-accent-soft text-accent [&_svg]:size-7">
        <MonitorDown />
      </div>
      <h1 className="display text-2xl sm:text-3xl">{t('web.desktopOnly.title')}</h1>
      <p className="mt-3 text-sm text-muted">{t('web.desktopOnly.body')}</p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <a
          href={RELEASES_URL}
          target="_blank"
          rel="noreferrer"
          data-track="desktop-notice-download"
          className="glow inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-accent-fill px-5 text-sm font-medium text-accent-fg transition-[background-color,transform] duration-150 hover:bg-accent-fill-hover active:scale-[0.97]"
        >
          <Download className="size-4" />
          {t('web.desktopOnly.cta')}
        </a>
        <Link
          to="/converter"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-surface-2/80 px-5 text-sm font-medium text-text transition-colors hover:bg-surface-3"
        >
          {t('web.desktopOnly.back')}
        </Link>
      </div>
    </div>
  )
}
