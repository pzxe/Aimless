import { ArrowLeftRight, ChevronDown, ChevronUp, Copy, ExternalLink, Eye, EyeOff, GripVertical, KeyRound, Pencil, RefreshCw, Star, Trash2, UserRound } from 'lucide-react'
import { useState } from 'react'
import { trackerLinks } from '@/core/accounts/ids'
import type { Account } from '@/core/accounts/types'
import { useFormat } from '@/hooks/useFormat'
import { supportsLiveRank } from '@/hooks/useRankRefresh'
import { useT } from '@/i18n'
import { useProfiles } from '@/store/profilesStore'
import { cn } from '@/utils/cn'
import { copyText } from '@/utils/clipboard'
import { GameBadge, gameName } from '../games/GameBadge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { OverwatchRank, ValorantRank } from './RankView'

const STATUS_TONE: Record<Account['status'], string> = {
  ready: 'bg-success/15 text-success',
  verified: 'bg-success/15 text-success',
  warmup: 'bg-accent-soft text-accent',
  cooldown: 'bg-warning/15 text-warning',
  banned: 'bg-danger-soft text-danger',
  inactive: 'bg-surface-3 text-muted',
}

export function AccountCard({
  account,
  busy,
  onRefresh,
  onEdit,
  onDelete,
  onToggleFavorite,
  onLoadProfile,
  reorder,
}: {
  account: Account
  busy: boolean
  onRefresh: () => void
  onEdit: () => void
  onDelete: () => void
  onToggleFavorite: () => void
  onLoadProfile: (profileId: string) => void
  /** Manual ordering: a grip to drag by and move-earlier / move-later buttons (the only way on touch screens). */
  reorder?: { first: boolean; last: boolean; onArm: () => void; onMove: (delta: -1 | 1) => void }
}) {
  const t = useT()
  const f = useFormat()
  const [showPw, setShowPw] = useState(false)
  const profile = useProfiles((s) => (account.profileId ? s.profiles.find((p) => p.id === account.profileId) : undefined))
  const links = trackerLinks(account.gameId, account.inGameId)
  const live = account.live
  const liveGame = supportsLiveRank(account.gameId)
  const canRefresh = liveGame && account.inGameId.trim() !== ''

  const copy = (text: string, success: string, secret = false) => void copyText(text, { success, failure: t('common.copyFailed'), secret })

  return (
    <Card className="flex h-full flex-col p-4">
      <div className="flex items-start gap-3">
        {reorder && (
          <div className="-ms-1 flex shrink-0 flex-col items-center">
            <Button variant="ghost" size="icon-sm" aria-label={t('accounts.reorder.up')} title={t('accounts.reorder.up')} disabled={reorder.first} onClick={() => reorder.onMove(-1)} className="h-5 w-6">
              <ChevronUp />
            </Button>
            <span
              role="img"
              aria-label={t('accounts.reorder.grip')}
              title={t('accounts.reorder.grip')}
              onPointerDown={reorder.onArm}
              className="flex h-6 w-6 cursor-grab touch-none items-center justify-center rounded-md text-subtle select-none hover:bg-surface-2 hover:text-text active:cursor-grabbing"
            >
              <GripVertical className="size-4" />
            </span>
            <Button variant="ghost" size="icon-sm" aria-label={t('accounts.reorder.down')} title={t('accounts.reorder.down')} disabled={reorder.last} onClick={() => reorder.onMove(1)} className="h-5 w-6">
              <ChevronDown />
            </Button>
          </div>
        )}
        <GameBadge gameId={account.gameId} size="lg" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold" title={account.label}>
            {account.label}
          </h3>
          <p className="truncate text-xs text-muted">{gameName(account.gameId)}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className={cn('inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium', STATUS_TONE[account.status])}>
              {t(`accounts.status.${account.status}`)}
            </span>
            {account.region && (
              <span className="inline-flex h-5 items-center rounded-full bg-surface-3 px-2 text-[11px] font-medium text-muted">{t(`accounts.region.${account.region}`)}</span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-pressed={account.favorite}
            aria-label={account.favorite ? t('accounts.unfavorite') : t('accounts.favorite')}
            onClick={onToggleFavorite}
            className={cn(account.favorite && 'text-warning hover:text-warning')}
          >
            <Star className={cn(account.favorite && 'fill-current')} />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label={t('common.edit')} title={t('common.edit')} onClick={onEdit}>
            <Pencil />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label={t('common.delete')} title={t('common.delete')} onClick={onDelete} className="hover:text-danger">
            <Trash2 />
          </Button>
        </div>
      </div>

      {account.inGameId && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-surface-2/50 px-3 py-1.5">
          <UserRound className="size-3.5 shrink-0 text-subtle" />
          <span dir="ltr" className="num min-w-0 flex-1 truncate text-start text-xs font-medium" title={account.inGameId}>
            {account.inGameId}
          </span>
        </div>
      )}

      <div className="mt-3 min-h-[3.25rem]">
        {live?.game === 'valorant' || (account.gameId === 'valorant' && !live) ? (
          <ValorantRank live={live?.game === 'valorant' ? live : undefined} manualTier={account.rankTier} manualRr={account.rr} />
        ) : live?.game === 'overwatch2' ? (
          <OverwatchRank live={live} />
        ) : account.rank || account.rr !== undefined ? (
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold">{account.rank || t('rank.noRank')}</span>
            {account.rr !== undefined && <span className="ltr num text-xs text-muted">{account.rr} RR</span>}
            <span className="text-[11px] text-subtle">{t('rank.manual')}</span>
          </div>
        ) : (
          <p className="text-xs text-subtle">{t('rank.noRank')}</p>
        )}
      </div>

      {account.notes && <p className="mt-3 line-clamp-2 text-xs whitespace-pre-line text-muted">{account.notes}</p>}

      <div className="mt-auto space-y-3 pt-4">
        {links.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {links.map((l) => (
              <a
                key={l.id}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-7 items-center gap-1 rounded-lg border border-border-strong px-2 text-[11px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-text"
              >
                {l.label}
                <ExternalLink className="size-3" />
              </a>
            ))}
          </div>
        )}

        {(account.username || account.password || account.inGameId) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {account.username && (
              <Button size="sm" onClick={() => copy(account.username, t('accounts.copiedUsername'), true)} aria-label={t('accounts.copyUsername')}>
                <Copy />
                {t('accounts.copyUsernameShort')}
              </Button>
            )}
            {account.password && (
              <Button size="sm" onClick={() => copy(account.password, t('accounts.copiedPassword'), true)} aria-label={t('accounts.copyPassword')}>
                <KeyRound />
                {t('accounts.copyPasswordShort')}
              </Button>
            )}
            {account.inGameId && (
              <Button size="sm" onClick={() => copy(account.inGameId, t('accounts.copiedTag'))} aria-label={t('accounts.copyTag')}>
                <Copy />
                {t('accounts.copyTagShort')}
              </Button>
            )}
            {account.password && (
              <span className="ms-auto flex items-center gap-1">
                <span dir="ltr" className="num max-w-[9rem] truncate text-xs text-muted">
                  {showPw ? account.password : '••••••••'}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={showPw ? t('accounts.hidePassword') : t('accounts.showPassword')}
                  aria-pressed={showPw}
                  onClick={() => setShowPw((v) => !v)}
                >
                  {showPw ? <EyeOff /> : <Eye />}
                </Button>
              </span>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <div className="flex min-w-0 items-center gap-2">
            {liveGame ? (
              <>
                <Button size="sm" disabled={!canRefresh || busy} onClick={onRefresh} title={canRefresh ? undefined : t('rank.needsId')}>
                  <RefreshCw className={cn(busy && 'animate-spin')} />
                  {busy ? t('rank.fetching') : t('rank.refresh')}
                </Button>
                <span className="truncate text-[11px] text-subtle">
                  {account.liveAt ? t('rank.updated', { time: f.relativeTime(account.liveAt) }) : t('rank.neverUpdated')}
                </span>
              </>
            ) : (
              <span className="truncate text-[11px] text-subtle">{t('rank.manualOnly')}</span>
            )}
          </div>
          {profile && (
            <Button size="sm" variant="outline" onClick={() => onLoadProfile(profile.id)} title={profile.name}>
              <ArrowLeftRight />
              {t('accounts.loadProfile')}
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}
