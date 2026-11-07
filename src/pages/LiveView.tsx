import { Crown, Radio, Trophy } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { gameName } from '@/components/games/GameBadge'
import { BracketView } from '@/components/tournament/BracketView'
import { LiveStatusBadge, RoleBadge } from '@/components/tournament/LiveBadges'
import { participantName, roundName, teamSizeLabel } from '@/components/tournament/labels'
import { useMatchFlash } from '@/components/tournament/useMatchFlash'
import { Card } from '@/components/ui/Card'
import { resolveTournament, type BracketSide, type ResolvedTournament, type Tournament } from '@/core/tournament'
import { useT, type TFunction } from '@/i18n'
import { useLiveTournament } from '@/services/liveRuntime'
import { parseShareId } from '@/services/tournamentSync'
import { cn } from '@/utils/cn'

/** Name of the stage being played right now ("Semifinals"), or null before the first match / after the final. */
export function currentStage(t: TFunction, tournament: Tournament, resolved: ResolvedTournament): string | null {
  const order: BracketSide[] = ['upper', 'lower', 'grand']
  let best: { side: BracketSide; round: number } | null = null
  for (const m of resolved.matches.values()) {
    if (m.status !== 'ready') continue
    const rank = (x: { side: BracketSide; round: number }) => order.indexOf(x.side) * 100 + x.round
    if (!best || rank(m.def) < rank(best)) best = { side: m.def.side, round: m.def.round }
  }
  return best ? roundName(t, tournament, best.side, best.round) : null
}

function useDocumentClass(name: string, on: boolean) {
  useEffect(() => {
    if (!on) return
    document.documentElement.classList.add(name)
    return () => document.documentElement.classList.remove(name)
  }, [name, on])
}

/** Public read-only live bracket (`/view/:id`, also `/tournament/live/:id`) and the OBS browser source (`/obs/:id`). */
export default function LiveViewPage({ mode }: { mode: 'view' | 'obs' }) {
  const t = useT()
  const { id = '' } = useParams()
  const [search] = useSearchParams()
  const share = useMemo(() => parseShareId(id), [id])
  const { tournament, status, lastUpdate } = useLiveTournament(share)
  const resolved = useMemo(() => (tournament ? resolveTournament(tournament) : null), [tournament])
  const flash = useMatchFlash(resolved, tournament?.id ?? '')
  const obs = mode === 'obs'
  useDocumentClass('obs-mode', obs)

  const scale = Math.min(3, Math.max(0.4, Number(search.get('scale')) || 1))
  const bg = search.get('bg') === 'dark' ? 'dark' : 'transparent'
  const sideParam = search.get('side')
  const showTitle = search.get('title') !== '0'

  useEffect(() => {
    if (tournament) document.title = `${tournament.name} · Aimless`
  }, [tournament])

  if (!share) {
    return (
      <div className="grid min-h-dvh place-items-center p-6 text-center">
        <p className="text-sm text-muted">{t('live.invalid')}</p>
      </div>
    )
  }

  if (!tournament || !resolved) {
    return (
      <div className={cn('grid min-h-dvh place-items-center p-6 text-center', obs && bg === 'dark' && 'bg-bg')}>
        {obs ? (
          <span className="sr-only">{t('live.waiting')}</span>
        ) : (
          <div className="max-w-sm">
            <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-surface-2 text-accent">
              <Radio className="size-6 animate-pulse" />
            </span>
            <h1 className="display text-2xl">{t('live.waiting')}</h1>
            <p className="mt-2 text-sm text-muted">{t('live.waitingDesc')}</p>
            <div className="mt-4 flex justify-center">
              <LiveStatusBadge status={status} />
            </div>
          </div>
        )}
      </div>
    )
  }

  const sides: BracketSide[] = tournament.format === 'double' ? ['upper', 'lower', 'grand'] : ['upper']
  const only = sideParam === 'upper' || sideParam === 'lower' || sideParam === 'grand' ? (sideParam as BracketSide) : null
  const visible: BracketSide[] = obs && only && sides.includes(only) ? [only] : sides
  const champion = participantName(tournament, resolved.championId)
  const runnerUp = participantName(tournament, resolved.runnerUpId)
  const stage = resolved.championId ? t('live.stageDone') : (currentStage(t, tournament, resolved) ?? t('live.stageNotStarted'))

  if (obs) {
    return (
      <div className={cn('min-h-dvh w-max min-w-full p-8', bg === 'dark' && 'bg-bg')} style={{ zoom: scale }}>
        {showTitle && (
          <div className="mb-5 flex items-end justify-between gap-8">
            <div>
              <div className="eyebrow mb-1">{stage}</div>
              <h1 className="display text-4xl drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">{tournament.name}</h1>
            </div>
            {champion && (
              <div key={champion} className="flex items-center gap-3 rounded-2xl bg-accent-fill px-5 py-3 text-accent-fg glow animate-[pop-in_500ms_ease-out]">
                <Crown className="size-7" />
                <span className="display text-2xl">{champion}</span>
              </div>
            )}
          </div>
        )}
        <div className="space-y-8">
          {visible.map((side) => (
            <div key={side} className={cn('p-2', bg === 'dark' && 'rounded-3xl border border-border bg-surface/70 p-6')}>
              {sides.length > 1 && <h2 className="eyebrow mb-4">{t(`tournament.side.${side}`)}</h2>}
              <BracketView tournament={tournament} resolved={resolved} side={side} flash={flash} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto min-h-dvh max-w-[1500px] px-4 py-5 sm:px-8 sm:py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="size-8" />
          <span className="display text-lg">Aimless</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RoleBadge role="guest" />
          <LiveStatusBadge status={status} lastSync={lastUpdate} />
        </div>
      </header>

      <div className="mb-6">
        <div className="eyebrow mb-2">
          {tournament.gameId ? `${gameName(tournament.gameId)} · ` : ''}
          {t(`tournament.format.${tournament.format}`)} · {teamSizeLabel(t, tournament.teamSize)} · Bo{tournament.bestOf}
        </div>
        <h1 className="display text-3xl sm:text-5xl">{tournament.name}</h1>
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Trophy className="size-4 text-accent" />
            {t('live.stage')}: <strong className="font-semibold text-text">{stage}</strong>
          </span>
          <span>{t('tournament.progress', { done: resolved.doneCount, total: resolved.playableCount })}</span>
          <span>{t('tournament.participantsCount', { n: tournament.participants.length })}</span>
        </p>
      </div>

      {champion && (
        <Card className="relative mb-5 flex items-center gap-4 overflow-hidden p-5">
          <div className="pointer-events-none absolute -start-10 -top-16 size-48 rounded-full bg-accent-fill/25 blur-3xl" />
          <span className="relative flex size-12 items-center justify-center rounded-2xl bg-accent-fill text-accent-fg glow">
            <Crown className="size-6" />
          </span>
          <div className="relative min-w-0">
            <div className="eyebrow">{t('tournament.champion')}</div>
            <div className="display truncate text-2xl">{champion}</div>
            {runnerUp && <div className="text-xs text-muted">{t('tournament.runnerUp', { name: runnerUp })}</div>}
          </div>
        </Card>
      )}

      <div className="space-y-5">
        {sides.map((side) => (
          <Card key={side} className="p-4 sm:p-5">
            {sides.length > 1 && <h2 className="eyebrow mb-4">{t(`tournament.side.${side}`)}</h2>}
            <BracketView tournament={tournament} resolved={resolved} side={side} flash={flash} />
          </Card>
        ))}
      </div>

      <Card className="mt-5 p-4 sm:p-5">
        <h2 className="eyebrow mb-3">{t('tournament.seeds')}</h2>
        <ol className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
          {tournament.participants.map((p, i) => (
            <li key={p.id} className="flex min-w-0 items-center gap-2 text-sm">
              <span className="ltr num w-6 text-xs text-subtle">{i + 1}</span>
              <span className={cn('truncate', p.id === resolved.championId && 'font-semibold text-accent')}>{p.name}</span>
              {p.members.length > 0 && <span className="truncate text-xs text-subtle">({p.members.join(', ')})</span>}
            </li>
          ))}
        </ol>
      </Card>

      <footer className="mt-8 flex items-center justify-center gap-2 pb-4 text-xs text-subtle">
        {t('live.poweredBy')} ·
        <Link to="/welcome" className="text-accent hover:underline">
          {t('live.openApp')}
        </Link>
      </footer>
    </div>
  )
}
