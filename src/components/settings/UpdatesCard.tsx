import { AlertTriangle, CheckCircle2, Download, ExternalLink, Loader2, MonitorDown, RefreshCw, Rocket, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { DesktopShortcutButton, useShortcutStatus } from '@/components/layout/DesktopShortcut'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Segmented } from '@/components/ui/Segmented'
import { useFormat } from '@/hooks/useFormat'
import { useT, type TranslationKey } from '@/i18n'
import { useSettings } from '@/store/settingsStore'
import { useUpdates } from '@/store/updateStore'
import { cn } from '@/utils/cn'
import { desktop } from '@/utils/desktop'

const MB = 1024 * 1024
const RELEASES = 'https://github.com/pzxe/Aimless/releases/latest'

const ERROR_KEYS = ['network', 'timeout', 'rate-limited', 'no-release', 'http', 'bad-response', 'verify-failed', 'untrusted-host', 'install-failed', 'not-installable'] as const

function ToggleRow({ label, hint, value, onChange }: { label: string; hint: string; value: boolean; onChange: (v: boolean) => void }) {
  const t = useT()
  return (
    <div className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:justify-between md:gap-6">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="mt-0.5 text-xs text-muted">{hint}</div>
      </div>
      <Segmented
        label={label}
        value={value ? 'on' : 'off'}
        onChange={(v) => onChange(v === 'on')}
        options={[
          { value: 'on', label: t('settings.on') },
          { value: 'off', label: t('settings.off') },
        ]}
      />
    </div>
  )
}

/** The live status line with its icon. */
function Status({ icon, tone, children }: { icon: ReactNode; tone?: 'ok' | 'warn' | 'bad' | 'accent'; children: ReactNode }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm',
        tone === 'ok' && 'border-success/30 bg-success/10',
        tone === 'bad' && 'border-danger/30 bg-danger-soft',
        tone === 'accent' && 'border-accent-line bg-accent-soft',
        (!tone || tone === 'warn') && 'border-border bg-surface-2/50',
      )}
    >
      <span className={cn('mt-0.5 shrink-0 [&_svg]:size-4', tone === 'ok' && 'text-success', tone === 'bad' && 'text-danger', tone === 'accent' && 'text-accent')}>{icon}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

/** "Application Updates": version, live update state, download progress and the update preferences. */
export function UpdatesCard() {
  const t = useT()
  const f = useFormat()
  const { state, check, download, cancel, install, reloadFresh } = useUpdates()
  const autoCheck = useSettings((s) => s.autoCheckUpdates)
  const autoDownload = useSettings((s) => s.autoDownloadUpdates)
  const set = useSettings((s) => s.set)
  const shortcut = useShortcutStatus()
  const isDesktop = !!desktop
  const { status, latest, progress, error } = state
  const busy = status === 'checking' || status === 'downloading' || status === 'installing'
  const mb = (n: number) => (n / MB).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  const errKey = (error && (ERROR_KEYS as readonly string[]).includes(error.code) ? `updates.error.${error.code}` : 'updates.error.network') as TranslationKey
  const manual = latest?.htmlUrl ?? RELEASES

  return (
    <Card>
      <CardHeader
        title={t('updates.title')}
        description={state.checkedAt ? t('updates.lastChecked', { time: f.relativeTime(state.checkedAt) }) : t('updates.neverChecked')}
        icon={<RefreshCw />}
        help={t('updates.help')}
        action={
          <span className="ltr num inline-flex h-6 items-center rounded-full border border-border bg-surface-2/70 px-2.5 text-xs font-semibold" title={t('updates.kind', { kind: t(`updates.kind.${state.kind}`) })}>
            v{state.current}
          </span>
        }
      />
      <CardBody className="space-y-4">
        {status === 'checking' && (
          <Status icon={<Loader2 className="animate-spin" />}>
            <p className="font-medium">{t('updates.checking')}</p>
          </Status>
        )}

        {status === 'idle' && (
          <Status icon={<RefreshCw />}>
            <p className="text-muted">{isDesktop ? t('updates.idle') : t('updates.web.hint')}</p>
          </Status>
        )}

        {status === 'uptodate' && (
          <Status icon={<CheckCircle2 />} tone="ok">
            <p className="font-medium">{t('updates.upToDate', { version: state.current })}</p>
            {!isDesktop && latest && <p className="mt-1 text-xs text-muted">{t('updates.web.latestDesktop', { version: latest.version })}</p>}
          </Status>
        )}

        {(status === 'available' || status === 'downloading' || status === 'ready' || status === 'installing') && latest && (
          <Status icon={status === 'ready' || status === 'installing' ? <Rocket /> : <Download />} tone="accent">
            <p className="font-semibold">
              {status === 'ready' ? t('updates.ready', { version: latest.version }) : isDesktop ? t('updates.available', { version: latest.version }) : t('updates.availableWeb', { version: latest.version })}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted" title={latest.name}>
              {latest.name}
              {latest.size > 0 && ` · ${t('updates.size', { size: `${mb(latest.size)} MB` })}`}
            </p>

            {status === 'downloading' && progress && (
              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium">{t('updates.downloading')}</span>
                  <span className="ltr num font-semibold">{Math.floor(progress.percent)}%</span>
                </div>
                <div
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.floor(progress.percent)}
                  aria-label={t('updates.downloading')}
                  className="h-2.5 overflow-hidden rounded-full bg-surface-3"
                >
                  <div className="h-full rounded-full bg-accent-fill transition-[width] duration-200 ease-out" style={{ width: `${progress.percent}%` }} />
                </div>
                <p className="ltr num mt-1.5 text-start text-[11px] text-muted">
                  {t('updates.progressMb', { done: mb(progress.transferredBytes), total: mb(progress.totalBytes), speed: mb(progress.speed) })}
                </p>
              </div>
            )}

            {status === 'ready' && <p className="mt-1 text-xs text-muted">{t('updates.readyHint')}</p>}
            {status === 'installing' && (
              <p className="mt-2 flex items-center gap-2 text-xs text-muted">
                <Loader2 className="size-3.5 animate-spin" />
                {t('updates.installing')}
              </p>
            )}
            {isDesktop && status === 'available' && !latest.canInstall && <p className="mt-2 text-xs text-warning">{state.kind === 'dev' ? t('updates.devBuild') : t('updates.cantInstall')}</p>}

            {latest.notes.trim() && (
              <details className="group mt-3">
                <summary className="cursor-pointer text-xs font-medium text-muted select-none hover:text-text">{t('updates.notes')}</summary>
                <pre className="scrollbar-thin mt-2 max-h-56 overflow-auto rounded-xl border border-border bg-surface-2/60 p-3 text-start font-sans text-xs leading-relaxed whitespace-pre-wrap text-muted" dir="auto">
                  {latest.notes.trim()}
                </pre>
              </details>
            )}
          </Status>
        )}

        {status === 'error' && (
          <Status icon={<AlertTriangle />} tone="bad">
            <p className="font-medium">{t('updates.error.title')}</p>
            <p className="mt-0.5 text-xs text-muted">{t(errKey)}</p>
          </Status>
        )}

        {!isDesktop && state.installerUrl && (status === 'uptodate' || status === 'available') && (
          <p className="text-xs text-muted">{t('updates.web.hint')}</p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {status === 'downloading' ? (
            <Button onClick={() => void cancel()}>
              <X />
              {t('common.cancel')}
            </Button>
          ) : status === 'ready' ? (
            <Button variant="primary" onClick={() => void install()}>
              <Rocket />
              {t('updates.install')}
            </Button>
          ) : (
            <>
              {isDesktop && status === 'available' && latest?.canInstall && (
                <Button variant="primary" onClick={() => void download()}>
                  <Download />
                  {t('updates.download')}
                </Button>
              )}
              {!isDesktop && status === 'available' && (
                <Button variant="primary" onClick={() => void reloadFresh()}>
                  <RefreshCw />
                  {t('updates.web.reload')}
                </Button>
              )}
              <Button variant={status === 'error' ? 'primary' : 'secondary'} disabled={busy} onClick={() => void check()}>
                <RefreshCw className={cn(status === 'checking' && 'animate-spin')} />
                {status === 'error' ? t('updates.retry') : t('updates.check')}
              </Button>
            </>
          )}
          {!isDesktop && state.installerUrl && (
            <a
              href={state.installerUrl}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-border-strong px-3.5 text-sm font-medium transition-colors hover:bg-surface-2"
              rel="noopener noreferrer"
            >
              <MonitorDown className="size-4" />
              {t('updates.web.download', { size: `${mb(state.latest?.size ?? 0)} MB` })}
            </a>
          )}
          {(status === 'error' || (isDesktop && status === 'available' && !latest?.canInstall)) && (
            <a
              href={manual}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-border-strong px-3.5 text-sm font-medium transition-colors hover:bg-surface-2"
            >
              <ExternalLink className="size-4" />
              {t('updates.manualDownload')}
            </a>
          )}
        </div>

        {isDesktop && (
          <div className="divide-y divide-border border-t border-border pt-1">
            <ToggleRow label={t('updates.autoCheck')} hint={t('updates.autoCheckHint')} value={autoCheck} onChange={(v) => set({ autoCheckUpdates: v })} />
            <ToggleRow label={t('updates.autoDownload')} hint={t('updates.autoDownloadHint')} value={autoDownload} onChange={(v) => set({ autoDownloadUpdates: v })} />
            {shortcut.status && (
              <div className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:justify-between md:gap-6">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{t('updates.refreshShortcut')}</div>
                  <div className="mt-0.5 text-xs text-muted">{t('updates.shortcutHint')}</div>
                </div>
                <DesktopShortcutButton label={t('updates.refreshShortcut')} />
              </div>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  )
}
