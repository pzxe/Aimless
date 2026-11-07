import { Crosshair, HeartPulse, ShieldHalf, Swords, Users, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { overwatchRankLabel, rrToRankUp, valorantTierColor, type OverwatchLive, type OverwatchRoleKey, type ValorantLive } from '@/core/accounts/rank'
import { useValorantTiers } from '@/hooks/useValorantTiers'
import { useT } from '@/i18n'
import { cn } from '@/utils/cn'

/** A tier icon from valorant-api.com (bundled snapshot or the live copy), falling back to a colour dot. */
export function TierIcon({ tier, className }: { tier: number; className?: string }) {
  const { byTier } = useValorantTiers()
  const info = byTier.get(tier)
  const [failed, setFailed] = useState(false)
  if (!info || failed) return <span aria-hidden="true" className={cn('inline-block rounded-full', className)} style={{ background: valorantTierColor(tier) }} />
  return <img src={info.icon} alt="" draggable={false} onError={() => setFailed(true)} className={cn('object-contain', className)} />
}

function RrBar({ rr, tier }: { rr: number; tier: number }) {
  const t = useT()
  const toGo = rrToRankUp(rr, tier)
  if (toGo === null) {
    return <p className="ltr num text-start text-xs font-medium">{t('rank.rrOpen', { rr })}</p>
  }
  const color = valorantTierColor(tier)
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
        <span className="ltr num font-medium">{t('rank.rrProgress', { rr })}</span>
        <span className="text-subtle">{t('rank.rrToGo', { n: toGo })}</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(rr, 100)}
        aria-label={t('rank.rrProgress', { rr })}
        className="h-2 overflow-hidden rounded-full bg-surface-3"
      >
        <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${Math.min(rr, 100)}%`, background: color }} />
      </div>
    </div>
  )
}

export function DeltaBadge({ delta }: { delta: number | null }) {
  const t = useT()
  if (delta === null) return null
  const up = delta > 0
  const flat = delta === 0
  return (
    <span
      title={t('rank.lastGame')}
      className={cn(
        'ltr num inline-flex h-5 items-center rounded-full px-2 text-[11px] font-semibold',
        flat ? 'bg-surface-3 text-muted' : up ? 'bg-success/15 text-success' : 'bg-danger-soft text-danger',
      )}
    >
      {up ? '+' : ''}
      {delta} RR
    </span>
  )
}

/** Valorant: official tier icon, RR progress, last game delta and peak rank. `live` wins over manual values. */
export function ValorantRank({ live, manualTier, manualRr }: { live?: ValorantLive; manualTier?: number; manualRr?: number }) {
  const t = useT()
  const tier = live?.tier ?? manualTier
  const { byTier } = useValorantTiers()
  if (tier === undefined) return <p className="text-xs text-subtle">{t('rank.noRank')}</p>
  const rr = live?.rr ?? manualRr ?? 0
  const name = byTier.get(tier)?.name ?? live?.tierName ?? `#${tier}`
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <TierIcon tier={tier} className="size-11 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold" style={{ color: valorantTierColor(tier) }}>
            {name}
          </p>
          <p className="truncate text-[11px] text-subtle">
            {live ? t('rank.live') : t('rank.manual')}
            {live?.level != null && ` · ${t('rank.level', { n: live.level })}`}
          </p>
        </div>
        {live && <DeltaBadge delta={live.lastChange} />}
      </div>
      <RrBar rr={rr} tier={tier} />
      {live?.peakTier != null && (
        <div className="flex items-center gap-2 text-xs text-muted">
          <TierIcon tier={live.peakTier} className="size-5" />
          <span className="min-w-0 truncate">
            {t('rank.peak', { rank: byTier.get(live.peakTier)?.name ?? live.peakName ?? `#${live.peakTier}` })}
            {live.peakSeason ? ` · ${live.peakSeason.toUpperCase()}` : ''}
          </span>
        </div>
      )}
    </div>
  )
}

const ROLE_ICON: Record<OverwatchRoleKey, LucideIcon> = { tank: ShieldHalf, damage: Swords, support: HeartPulse, open: Users }

function RoleIcon({ role, src }: { role: OverwatchRoleKey; src: string | null }) {
  const [failed, setFailed] = useState(false)
  const Fallback = ROLE_ICON[role] ?? Crosshair
  if (!src || failed) return <Fallback className="size-4 text-muted" aria-hidden="true" />
  return <img src={src} alt="" draggable={false} onError={() => setFailed(true)} className="size-4 object-contain opacity-80 invert-[.7]" />
}

function RankImage({ src }: { src: string | null }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) return <span className="size-8 shrink-0" />
  return <img src={src} alt="" draggable={false} loading="lazy" onError={() => setFailed(true)} className="size-8 shrink-0 object-contain" />
}

/** Overwatch 2: avatar, namecard, title, endorsement and the PC competitive rank of every role. */
export function OverwatchRank({ live }: { live: OverwatchLive }) {
  const t = useT()
  return (
    <div className="space-y-3">
      <div className="relative flex items-center gap-3 overflow-hidden rounded-xl border border-border bg-surface-2/60 p-2.5">
        {live.namecard && <img src={live.namecard} alt="" draggable={false} className="pointer-events-none absolute inset-0 size-full object-cover opacity-25" />}
        <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-surface-3">
          {live.avatar && <img src={live.avatar} alt="" draggable={false} className="size-full object-cover" />}
        </div>
        <div className="relative min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{live.username}</p>
          <p className="truncate text-[11px] text-muted">{live.title ?? ' '}</p>
        </div>
        {live.endorsement != null && (
          <span className="relative ltr num inline-flex h-5 shrink-0 items-center rounded-full bg-accent-soft px-2 text-[11px] font-semibold text-accent" title={t('rank.endorsement', { n: live.endorsement })}>
            ★ {live.endorsement}
          </span>
        )}
      </div>

      {live.competitivePrivate ? (
        <p role="status" className="rounded-xl bg-warning/10 px-3 py-2 text-xs text-warning">
          {t('rank.private')}
        </p>
      ) : live.roles.length === 0 ? (
        <p className="text-xs text-subtle">{t('rank.unranked')}</p>
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-2">
            {live.roles.map((r) => (
              <li key={r.role} className="flex items-center gap-2 rounded-xl border border-border bg-surface-2/40 p-2">
                <RankImage src={r.rankIcon} />
                <div className="min-w-0">
                  <p className="flex items-center gap-1 truncate text-[11px] text-subtle">
                    <RoleIcon role={r.role} src={r.roleIcon} />
                    {t(`rank.role.${r.role}`)}
                  </p>
                  <p className="text-[13px] leading-tight font-semibold break-words">{overwatchRankLabel(r)}</p>
                </div>
              </li>
            ))}
          </ul>
          {live.season != null && <p className="text-[11px] text-subtle">{t('rank.season', { n: live.season })} · PC</p>}
        </>
      )}
    </div>
  )
}
