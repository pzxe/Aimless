import { Eye, PenLine, Radio, ShieldCheck } from 'lucide-react'
import type { LiveStatus, ShareRole } from '@/services/tournamentSync'
import { useT } from '@/i18n'
import { useSettings } from '@/store/settingsStore'
import { cn } from '@/utils/cn'

const ROLE_ICON = { host: ShieldCheck, editor: PenLine, guest: Eye } as const

/** Host / Editor / Guest pill. */
export function RoleBadge({ role, className }: { role: ShareRole; className?: string }) {
  const t = useT()
  const Icon = ROLE_ICON[role]
  const tone =
    role === 'host'
      ? 'border-accent-line bg-accent-soft text-accent'
      : role === 'editor'
        ? 'border-border-strong bg-surface-2 text-text'
        : 'border-border bg-surface-2 text-muted'
  return (
    <span
      title={t(`role.${role}Hint`)}
      className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide', tone, className)}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {t(`role.${role}`)}
    </span>
  )
}

/** Connection indicator: a dot (pulsing while live) and a label. */
export function LiveStatusBadge({ status, lastSync, className }: { status: LiveStatus; lastSync?: number | null; className?: string }) {
  const t = useT()
  const language = useSettings((s) => s.language)
  const dot = status === 'live' ? 'bg-success live-dot-on' : status === 'connecting' ? 'bg-warning' : 'bg-danger'
  const time = lastSync ? new Date(lastSync).toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : null
  return (
    <span
      role="status"
      className={cn('inline-flex items-center gap-2 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-muted', className)}
      title={time ? t('live.lastSync', { time }) : undefined}
    >
      <span className={cn('size-2 rounded-full', dot)} aria-hidden="true" />
      <Radio className="size-3.5" aria-hidden="true" />
      <span>{t(`live.status.${status}`)}</span>
    </span>
  )
}
