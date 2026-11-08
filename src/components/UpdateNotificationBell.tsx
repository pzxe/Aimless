import { Bell, Check, ExternalLink, Download, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/Button'
import { useT, type TranslationKey } from '@/i18n'
import {
  CACHE_TTL_MS,
  classifyUpdate,
  classifyVersion,
  fetchLatestRelease,
  parseReleaseBody,
  parseReleaseTitle,
  type ReleaseInfo,
  type UpdateCategory,
} from '@/services/githubReleaseChecker'
import { useSettings } from '@/store/settingsStore'
import { useUpdates } from '@/store/updateStore'
import { cn } from '@/utils/cn'
import { desktop } from '@/utils/desktop'

declare const __APP_VERSION__: string

/** The "New Update Available" mini-popup stays fully visible for exactly this long, then folds into the bell. */
export const TOAST_VISIBLE_MS = 5000
const TOAST_COLLAPSE_MS = 520
const SEEN_KEY = 'sc.update.seen'
/** First check shortly after the app opens, so it never competes with the first paint. */
const FIRST_CHECK_MS = 1200

const CATEGORY: Record<UpdateCategory, { key: TranslationKey; icon: string; className: string }> = {
  major: { key: 'bell.cat.major', icon: '🚀', className: 'bg-gradient-to-r from-[#ff2e4d] to-[#ffc83d] text-[#1a0a10]' },
  minor: { key: 'bell.cat.minor', icon: '✨', className: 'bg-gradient-to-r from-[#2f7bff] to-[#9b5cff] text-white' },
  patch: { key: 'bell.cat.patch', icon: '🔧', className: 'bg-gradient-to-r from-[#22c58b] to-[#ffb020] text-[#08140f]' },
}

function readSeen(): string {
  try {
    return localStorage.getItem(SEEN_KEY) ?? ''
  } catch {
    return ''
  }
}
function writeSeen(v: string) {
  try {
    localStorage.setItem(SEEN_KEY, v)
  } catch {
    /* blocked storage: the dot just reappears next launch */
  }
}

export function CategoryBadge({ category, className }: { category: UpdateCategory; className?: string }) {
  const t = useT()
  const c = CATEGORY[category]
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide', c.className, className)}>
      <span aria-hidden="true">{c.icon}</span>
      {t(c.key)}
    </span>
  )
}

/** Release info from the desktop updater, used when GitHub could not be reached from the page. */
function fromDesktop(l: NonNullable<ReturnType<typeof useUpdates.getState>['state']['latest']>): ReleaseInfo {
  const body = parseReleaseBody(l.notes)
  return { version: l.version, tag: l.tag, title: parseReleaseTitle(l.name, l.tag), htmlUrl: l.htmlUrl, publishedAt: l.publishedAt, intro: body.intro, highlights: body.highlights, installerUrl: null }
}

type ToastPhase = 'off' | 'enter' | 'show' | 'collapse'

/**
 * Header bell. Checks GitHub for the latest release (30-minute cache), pops a mini notice next to the bell for
 * 5 seconds when a newer version exists, then folds it into the bell and keeps a glowing dot until the card is opened.
 */
export function UpdateNotificationBell() {
  const t = useT()
  const rtl = useSettings((s) => s.language) === 'ar'
  const upd = useUpdates((s) => s.state)
  const current = __APP_VERSION__

  const [fetched, setFetched] = useState<ReleaseInfo | null>(null)
  const [failed, setFailed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [seen, setSeen] = useState(readSeen)
  const [toast, setToast] = useState<ToastPhase>('off')
  const wrap = useRef<HTMLDivElement>(null)
  const bellBtn = useRef<HTMLButtonElement>(null)
  const card = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const timers = useRef<number[]>([])
  const toastFor = useRef('')

  // ---- data: GitHub first (cached), the desktop updater's copy as a fallback
  const check = useCallback(async (force = false) => {
    setLoading(true)
    const r = await fetchLatestRelease({ force })
    if (r.info) {
      setFetched(r.info)
      setFailed(false)
    } else setFailed(true)
    setLoading(false)
  }, [])
  useEffect(() => {
    const first = window.setTimeout(() => void check(), FIRST_CHECK_MS)
    const every = window.setInterval(() => void check(), CACHE_TTL_MS + 1000)
    const onVisible = () => document.visibilityState === 'visible' && void check()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearTimeout(first)
      clearInterval(every)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [check])

  const info = useMemo(() => fetched ?? (upd.latest ? fromDesktop(upd.latest) : null), [fetched, upd.latest])
  const category = info ? classifyUpdate(current, info.version) : null
  const hasUpdate = category !== null
  const unread = hasUpdate && info !== null && seen !== info.version

  // ---- the 5-second toast. Timers live in a ref (not an effect cleanup) so a re-render can never strand it.
  const clearTimers = () => {
    timers.current.forEach((id) => clearTimeout(id))
    timers.current = []
  }
  useEffect(() => clearTimers, [])
  useEffect(() => {
    if (!info || !unread || toastFor.current === info.version) return
    toastFor.current = info.version
    setToast('enter')
    const raf = requestAnimationFrame(() => {
      setToast('show')
      timers.current.push(window.setTimeout(() => setToast('collapse'), TOAST_VISIBLE_MS), window.setTimeout(() => setToast('off'), TOAST_VISIBLE_MS + TOAST_COLLAPSE_MS))
    })
    return () => cancelAnimationFrame(raf)
  }, [info, unread])

  // ---- popover: outside click and Escape close it
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      const n = e.target as Node
      if (!wrap.current?.contains(n) && !card.current?.contains(n)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      bellBtn.current?.focus()
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const r = bellBtn.current?.getBoundingClientRect()
      if (!r) return
      const margin = 12
      const width = Math.min(400, window.innerWidth - margin * 2)
      const wanted = rtl ? r.left : r.right - width
      const left = Math.max(margin, Math.min(wanted, window.innerWidth - width - margin))
      setPos({ top: Math.round(r.bottom + 8), left: Math.round(left), width })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, rtl])
  useEffect(() => {
    if (open) card.current?.focus({ preventScroll: true })
  }, [open, pos])

  const toggle = () => {
    if (!open) {
      clearTimers()
      setToast('off')
      if (info) {
        setSeen(info.version)
        writeSeen(info.version)
      }
      // opening the card is also a good moment to refresh (cached for 30 minutes anyway)
      void check()
    }
    setOpen((o) => !o)
  }

  // ---- Update Now
  const updateNow = async () => {
    if (!info) return
    if (desktop) {
      const store = useUpdates.getState()
      if (store.state.status === 'ready') return void store.install()
      if (store.state.status !== 'available') await store.check()
      const s = useUpdates.getState().state
      if (s.status === 'available' && s.latest?.canInstall) return void useUpdates.getState().download()
      return void window.open(info.htmlUrl, '_blank', 'noopener,noreferrer')
    }
    window.open(info.installerUrl ?? info.htmlUrl, '_blank', 'noopener,noreferrer')
  }
  const busy = desktop && (upd.status === 'downloading' || upd.status === 'installing')
  const actionLabel =
    desktop && upd.status === 'downloading' ? t('bell.downloading', { percent: Math.round(upd.progress?.percent ?? 0) })
    : desktop && upd.status === 'installing' ? t('bell.installing')
    : desktop && upd.status === 'ready' ? t('bell.restart')
    : t('bell.updateNow')

  const shownCategory: UpdateCategory | null = info ? (category ?? classifyVersion(info.version)) : null
  const label = unread ? t('bell.tooltip.unread') : t('bell.tooltip')

  return (
    <div ref={wrap} className="relative">
      <Button ref={bellBtn} variant="ghost" size="icon-sm" aria-label={label} title={label} aria-haspopup="dialog" aria-expanded={open} onClick={toggle} className="relative">
        <Bell className={cn(unread && 'text-accent')} />
        {unread && (
          <span aria-hidden="true" className="absolute end-0.5 top-0.5 size-2.5 rounded-full border-2 border-bg bg-accent-fill shadow-[0_0_10px_2px_var(--c-accent-glow)] motion-safe:animate-pulse" />
        )}
      </Button>

      {/* 5-second mini popup next to the bell */}
      {toast !== 'off' && info && !open && (
        <div className="pointer-events-none absolute end-full top-1/2 z-50 me-2 -translate-y-1/2">
          <button
            type="button"
            tabIndex={toast === 'collapse' ? -1 : 0}
            data-phase={toast}
            onClick={toggle}
            style={{ ['--bt-to' as string]: rtl ? '-64px' : '64px', ['--bt-from' as string]: rtl ? '-16px' : '16px', transformOrigin: rtl ? 'left center' : 'right center' }}
            className="bell-toast pointer-events-auto flex max-w-[min(300px,calc(100vw-120px))] items-center gap-2.5 rounded-2xl border border-accent-line bg-surface px-3.5 py-2 text-start shadow-pop"
            role="status"
          >
            <span className="relative flex size-2.5 shrink-0" aria-hidden="true">
              <span className="absolute inline-flex size-full rounded-full bg-accent-fill opacity-70 motion-safe:animate-ping" />
              <span className="relative inline-flex size-2.5 rounded-full bg-accent-fill" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold text-text">{t('bell.toast.title')} <span className="text-accent">{t('bell.toast.cta')}</span></span>
              <span className="num block text-[11px] text-muted" dir="ltr">{info.tag}</span>
            </span>
          </button>
        </div>
      )}

      {open && pos && createPortal(
        <div
          ref={card}
          role="dialog"
          aria-label={t('bell.title')}
          tabIndex={-1}
          dir={rtl ? 'rtl' : 'ltr'}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, maxHeight: `calc(100vh - ${pos.top + 12}px)`, background: 'var(--c-surface)', backdropFilter: 'none' }}
          className="card z-[60] flex flex-col overflow-hidden p-0 shadow-pop outline-none"
        >
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            {info && shownCategory ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="num display text-2xl" dir="ltr">{info.tag}</span>
                  <CategoryBadge category={shownCategory} />
                </div>
                <p className="-mt-1 text-sm font-semibold leading-snug">{info.title}</p>
                {hasUpdate ? (
                  <p className="flex items-center gap-2 text-xs font-medium text-accent">
                    <span className="relative flex size-2" aria-hidden="true"><span className="absolute inline-flex size-full rounded-full bg-accent-fill opacity-70 motion-safe:animate-ping" /><span className="relative inline-flex size-2 rounded-full bg-accent-fill" /></span>
                    {t('bell.status.available')}
                    <span className="num font-normal text-muted" dir="ltr">· {t('bell.installed', { version: current })}</span>
                  </p>
                ) : (
                  <p className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success">
                    <Check className="size-3.5" /> {t('bell.status.latest')}
                  </p>
                )}
                {info.intro && <p className="text-sm leading-relaxed text-muted">{info.intro}</p>}
                {info.highlights.length > 0 ? (
                  <div>
                    <div className="mb-1.5 text-[11px] font-semibold tracking-wider text-subtle uppercase">{t('bell.highlights')}</div>
                    <ul className="space-y-1.5 pe-1 text-[13px] leading-snug">
                      {info.highlights.map((h) => (
                        <li key={h} className="flex gap-2"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent-fill" aria-hidden="true" /><span>{h}</span></li>
                      ))}
                    </ul>
                  </div>
                ) : !info.intro ? (
                  <p className="text-sm text-muted">{t('bell.empty')}</p>
                ) : null}
              </>
            ) : loading ? (
              <p className="flex items-center gap-2 py-6 text-sm text-muted"><RefreshCw className="size-4 motion-safe:animate-spin" /> {t('bell.status.checking')}</p>
            ) : (
              <div className="space-y-3 py-3">
                <p className="text-sm text-danger">{failed ? t('bell.status.error') : t('bell.empty')}</p>
                <Button size="sm" variant="outline" onClick={() => void check(true)}><RefreshCw /> {t('bell.retry')}</Button>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-border bg-surface-2/40 px-4 py-3">
            {hasUpdate && info && (
              <Button variant="primary" size="sm" disabled={busy} aria-busy={busy} onClick={() => void updateNow()}>
                <Download /> {actionLabel}
              </Button>
            )}
            <a
              href={info?.htmlUrl ?? 'https://github.com/pzxe/Aimless/releases/latest'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-xl border border-border bg-surface-2/80 px-3 text-xs font-medium whitespace-nowrap text-text transition-colors hover:bg-surface-3 [&_svg]:size-4"
            >
              <ExternalLink /> {t('bell.notes')}
            </a>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
