import {
  Activity,
  ArrowLeftRight,
  Crosshair,
  Gauge,
  ArrowRight,
  BarChart3,
  Calculator,
  Clock,
  Gamepad2,
  MousePointer2,
  Ruler,
  ScanEye,
  Star,
  Trophy,
  UserRound,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { AccuracyBadge } from '@/components/games/AccuracyBadge'
import { GameBadge, gameName } from '@/components/games/GameBadge'
import { GameSelector } from '@/components/games/GameSelector'
import { HistoryRow } from '@/components/dashboard/HistoryRow'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { CopyButton } from '@/components/ui/CopyButton'
import { NumberField } from '@/components/ui/Field'
import { describeSetting, getAllGames, getSupportedGames } from '@/core/sensitivity'
import { useConversion } from '@/hooks/useConversion'
import { useFormat } from '@/hooks/useFormat'
import { useLoadIntoConverter } from '@/hooks/useLoadIntoConverter'
import { useT } from '@/i18n'
import { useConverter } from '@/store/converterStore'
import { useHistory } from '@/store/historyStore'
import { useProfiles } from '@/store/profilesStore'
import { useSettings } from '@/store/settingsStore'
import { useTournaments } from '@/store/tournamentStore'
import { resolveTournament } from '@/core/tournament'
import { participantName } from '@/components/tournament/labels'

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs text-muted [&_svg]:size-3.5">
        {icon}
        {label}
      </div>
      <div className="mt-2 truncate text-xl font-semibold tracking-tight">{value}</div>
      {sub && <div className="mt-0.5 truncate text-xs text-subtle">{sub}</div>}
    </Card>
  )
}

function QuickConvert() {
  const t = useT()
  const f = useFormat()
  const { form, result, isEmpty } = useConversion()
  const setField = useConverter((s) => s.setField)
  const swap = useConverter((s) => s.swap)
  const sensIssue = !result.ok ? result.issues.find((i) => i.field === 'sourceSensitivity') : undefined
  const dpiIssue = !result.ok ? result.issues.find((i) => i.field === 'sourceDpi') : undefined
  const text = result.ok ? f.sens(result.target.sensitivity) : ''

  return (
    <Card className="lg:col-span-2">
      <CardHeader
        title={t('dashboard.quickConvert')}
        icon={<ArrowLeftRight />}
        help={t('help.dashboard.quickConvert')}
        action={
          <Link to="/converter" className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">
            {t('dashboard.openConverter')}
            <ArrowRight className="size-3 rtl:rotate-180" />
          </Link>
        }
      />
      <CardBody className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
          <GameSelector value={form.sourceGameId} onChange={(id) => setField('sourceGameId', id)} label={t('converter.sourceGame')} />
          <Button variant="ghost" size="icon" onClick={swap} aria-label={t('converter.swap')} className="mx-auto">
            <ArrowLeftRight className="rotate-90 sm:rotate-0" />
          </Button>
          <GameSelector value={form.targetGameId} onChange={(id) => setField('targetGameId', id)} label={t('converter.targetGame')} />
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1.4fr]">
          <NumberField
            label={t('common.sensitivity')}
            value={form.sourceSensitivity}
            onValueChange={(v) => setField('sourceSensitivity', v)}
            placeholder="1.00"
            error={sensIssue && !(isEmpty && sensIssue.code === 'sens_required') ? t(`validation.${sensIssue.code}`) : null}
          />
          <NumberField
            label={t('common.dpi')}
            value={form.sourceDpi}
            onValueChange={(v) => setField('sourceDpi', v)}
            inputMode="numeric"
            error={dpiIssue ? t(`validation.${dpiIssue.code}`) : null}
          />
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-muted">
              <span>{t('converter.converted')}</span>
              {result.ok && <AccuracyBadge accuracy={result.accuracy} />}
            </div>
            <div className="flex h-10 items-center rounded-lg border border-accent/30 bg-accent-soft ps-3 pe-0.5">
              <span className="ltr num flex-1 truncate text-start text-lg font-semibold">{result.ok ? text : '—'}</span>
              {result.ok && (
                <span className="ltr num me-1 text-xs text-muted">{f.dist(result.target.cm360)} {f.unit}</span>
              )}
              <CopyButton text={text} label={t('converter.copySens')} variant="ghost" size="icon-sm" />
            </div>
          </div>
        </div>
        {!result.ok && result.unsupported.length > 0 && (
          <p className="text-xs text-danger">
            {t('converter.unsupportedTitle', { game: gameName(result.unsupported[0]!) })} ·{' '}
            <Link to="/converter" className="underline">
              {t('converter.calibrate', { game: gameName(result.unsupported[0]!) })}
            </Link>
          </p>
        )}
      </CardBody>
    </Card>
  )
}

const TOOL_LINKS = [
  { to: '/mousepad', icon: Gauge, key: 'nav.mousepad' },
  { to: '/tools#ads', icon: Crosshair, key: 'ads.title' },
  { to: '/tools#polling', icon: Activity, key: 'polling.title' },
  { to: '/tools#cm360', icon: Ruler, key: 'tools.cm360.title' },
  { to: '/tools#fov', icon: ScanEye, key: 'tools.fov.title' },
  { to: '/compare', icon: BarChart3, key: 'nav.compare' },
] as const

export default function DashboardPage() {
  const t = useT()
  const f = useFormat()
  const navigate = useNavigate()
  const profiles = useProfiles((s) => s.profiles)
  const entries = useHistory((s) => s.entries)
  const calibrations = useSettings((s) => s.calibrations)
  const favoriteGames = useSettings((s) => s.favoriteGames)
  const sourceDpi = useConverter((s) => s.sourceDpi)
  const tournaments = useTournaments((s) => s.tournaments)
  const { fromHistory, fromProfile } = useLoadIntoConverter()

  const supported = getSupportedGames(calibrations).length
  const total = getAllGames().length
  const last = entries[0]
  const shownProfiles = [...profiles].sort((a, b) => Number(b.favorite) - Number(a.favorite) || b.updatedAt - a.updatedAt).slice(0, 4)

  return (
    <>
      <div className="mb-6 lg:mb-8">
        <div className="eyebrow mb-2">{t('dashboard.eyebrow')}</div>
        <h1 className="display text-3xl sm:text-4xl">{t('dashboard.welcome')}</h1>
        <p className="mt-2 text-sm text-muted">{t('dashboard.subtitle')}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard icon={<UserRound />} label={t('dashboard.stats.profiles')} value={<span className="num">{profiles.length}</span>} />
        <StatCard icon={<Trophy />} label={t('dashboard.stats.tournaments')} value={<span className="num">{tournaments.length}</span>} />
        <StatCard
          icon={<Gamepad2 />}
          label={t('dashboard.stats.games')}
          value={<span className="num">{t('dashboard.stats.gamesValue', { supported, total })}</span>}
        />
        <StatCard
          icon={<Clock />}
          label={t('dashboard.stats.lastConversion')}
          value={
            last ? (
              <span className="ltr num text-base">
                {gameName(last.sourceGameId).split(':')[0]} → {gameName(last.targetGameId).split(':')[0]}
              </span>
            ) : (
              <span className="text-base text-subtle">{t('dashboard.stats.never')}</span>
            )
          }
          sub={last ? f.relativeTime(last.at) : undefined}
        />
        <StatCard
          icon={<MousePointer2 />}
          label={t('dashboard.stats.currentDpi')}
          value={<span className="ltr num">{sourceDpi || '—'}</span>}
        />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <QuickConvert />
        <Card>
          <CardHeader title={t('dashboard.tools')} icon={<Calculator />} />
          <CardBody className="grid gap-1 pb-3">
            {TOOL_LINKS.map(({ to, icon: Icon, key }) => (
              <Link
                key={to}
                to={to}
                className="group flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-surface-2"
              >
                <span className="flex size-7 items-center justify-center rounded-md bg-surface-2 text-muted group-hover:text-accent">
                  <Icon className="size-3.5" />
                </span>
                <span className="flex-1">{t(key)}</span>
                <ArrowRight className="size-3.5 text-subtle opacity-0 transition-opacity group-hover:opacity-100 rtl:rotate-180" />
              </Link>
            ))}
          </CardBody>
        </Card>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title={t('dashboard.recent')}
            icon={<Clock />}
            action={
              entries.length > 0 && (
                <Link to="/history" className="text-xs font-medium text-accent hover:underline">
                  {t('common.viewAll')}
                </Link>
              )
            }
          />
          <CardBody className="pb-3">
            {entries.length === 0 ? (
              <p className="py-6 text-center text-sm text-subtle">{t('dashboard.recentEmpty')}</p>
            ) : (
              <div className="-mx-2">
                {entries.slice(0, 5).map((e) => (
                  <HistoryRow key={e.id} entry={e} onClick={() => fromHistory(e)} />
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <div className="grid content-start gap-3">
          <Card>
            <CardHeader
              title={t('dashboard.profiles')}
              icon={<UserRound />}
              action={
                profiles.length > 0 && (
                  <Link to="/profiles" className="text-xs font-medium text-accent hover:underline">
                    {t('common.viewAll')}
                  </Link>
                )
              }
            />
            <CardBody className="pb-3">
              {shownProfiles.length === 0 ? (
                <p className="py-4 text-center text-sm text-subtle">{t('dashboard.profilesEmpty')}</p>
              ) : (
                <div className="-mx-2">
                  {shownProfiles.map((p) => {
                    const d = describeSetting(p.gameId, p.dpi, p.sensitivity, calibrations)
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => fromProfile(p)}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-start transition-colors hover:bg-surface-2"
                      >
                        <GameBadge gameId={p.gameId} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1 truncate text-sm font-medium">
                            {p.favorite && <Star className="size-3 shrink-0 fill-warning text-warning" />}
                            <span className="truncate">{p.name}</span>
                          </span>
                          <span className="ltr num block text-start text-xs text-subtle">
                            {f.sens(p.sensitivity)} @ {p.dpi}
                          </span>
                        </span>
                        <span className="ltr num text-xs text-muted">{d ? `${f.dist(d.cm360)} ${f.unit}` : '—'}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title={t('dashboard.tournaments')}
              icon={<Trophy />}
              action={
                <Link to="/tournaments" className="text-xs font-medium text-accent hover:underline">
                  {tournaments.length > 0 ? t('common.viewAll') : t('tournament.new')}
                </Link>
              }
            />
            <CardBody className="pb-3">
              {tournaments.length === 0 ? (
                <p className="py-2 text-center text-sm text-subtle">{t('tournament.emptyHint')}</p>
              ) : (
                <div className="-mx-2">
                  {tournaments.slice(0, 3).map((tour) => {
                    const r = resolveTournament(tour)
                    const champ = participantName(tour, r.championId)
                    return (
                      <Link key={tour.id} to={`/tournaments/${tour.id}`} className="flex items-center gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-surface-2">
                        <Trophy className="size-4 shrink-0 text-accent" />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{tour.name}</span>
                        <span className="ltr num shrink-0 text-xs text-muted">{champ ? `🏆 ${champ}` : `${r.doneCount}/${r.playableCount}`}</span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={t('dashboard.favoriteGames')} icon={<Star />} />
            <CardBody>
              {favoriteGames.length === 0 ? (
                <p className="text-center text-xs text-subtle">
                  <Link to="/games" className="hover:text-text">
                    {t('dashboard.favoriteGamesEmpty')}
                  </Link>
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {favoriteGames.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        useConverter.getState().setField('targetGameId', id)
                        navigate('/converter')
                      }}
                      className="flex items-center gap-2 rounded-lg border border-border py-1 ps-1 pe-2.5 text-xs transition-colors hover:border-border-strong hover:bg-surface-2"
                    >
                      <GameBadge gameId={id} size="sm" />
                      {gameName(id)}
                    </button>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

    </>
  )
}
