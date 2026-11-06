import { Ruler, Search, Star, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AccuracyBadge } from '@/components/games/AccuracyBadge'
import { CalibrateDialog } from '@/components/games/CalibrateDialog'
import { GameBadge } from '@/components/games/GameBadge'
import { PageHeader } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Field'
import { InfoTip } from '@/components/ui/InfoTip'
import { Segmented } from '@/components/ui/Segmented'
import { formatNumber, getAllGames, type ResultAccuracy } from '@/core/sensitivity'
import { useGameAccuracy } from '@/hooks/useGameAccuracy'
import { isTranslationKey, useT } from '@/i18n'
import { useSettings } from '@/store/settingsStore'
import { cn } from '@/utils/cn'

type Filter = 'all' | ResultAccuracy

export default function GamesPage() {
  const t = useT()
  const favorites = useSettings((s) => s.favoriteGames)
  const toggleFavorite = useSettings((s) => s.toggleFavoriteGame)
  const calibrations = useSettings((s) => s.calibrations)
  const removeCalibration = useSettings((s) => s.removeCalibration)
  const accuracyOf = useGameAccuracy()
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [calibrateId, setCalibrateId] = useState<string | null>(null)

  const games = useMemo(() => {
    const q = query.trim().toLowerCase()
    return getAllGames().filter(
      (g) => (filter === 'all' || accuracyOf(g.id) === filter) && (!q || g.name.toLowerCase().includes(q) || g.short.toLowerCase().includes(q)),
    )
  }, [filter, query, accuracyOf])

  const filters: { value: Filter; label: string }[] = [
    { value: 'all', label: t('games.filter.all') },
    { value: 'verified', label: t('accuracy.verified') },
    { value: 'approximate', label: t('accuracy.approximate') },
    { value: 'calibrated', label: t('accuracy.calibrated') },
    { value: 'unsupported', label: t('accuracy.unsupported') },
  ]

  return (
    <>
      <PageHeader title={t('games.title')} description={t('games.subtitle')} />
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('gameSelector.search')} className="ps-9" aria-label={t('common.search')} />
        </div>
        <div className="scrollbar-thin overflow-x-auto">
          <Segmented value={filter} onChange={setFilter} options={filters} label={t('common.accuracy')} />
        </div>
      </div>
      <p className="mb-3 text-xs text-subtle">{t('games.count', { count: games.length })}</p>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {games.map((g) => {
          const acc = accuracyOf(g.id)
          const calibrated = calibrations[g.id]
          const yaw = calibrated ?? g.formula?.yaw
          const fav = favorites.includes(g.id)
          return (
            <Card key={g.id} className="flex min-w-0 flex-col p-4">
              <div className="flex items-start gap-3">
                <GameBadge gameId={g.id} size="lg" />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold">{g.name}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <AccuracyBadge accuracy={acc} />
                    {g.status === 'discontinued' && (
                      <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-muted">{t('games.discontinued')}</span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-pressed={fav}
                  aria-label={fav ? t('gameSelector.unfavorite') : t('gameSelector.favorite')}
                  onClick={() => toggleFavorite(g.id)}
                  className={cn(fav && 'text-warning hover:text-warning')}
                >
                  <Star className={cn(fav && 'fill-current')} />
                </Button>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs sm:grid-cols-3">
                <div>
                  <dt className="text-subtle">{t('common.yaw')}</dt>
                  <dd className="ltr num mt-0.5 text-start font-medium">
                    {yaw ? `${formatNumber(yaw, 8)}${t('common.degPerCount')}` : t('games.yawUnknown')}
                  </dd>
                </div>
                <div>
                  <dt className="text-subtle">{t('games.scale')}</dt>
                  <dd className="ltr mt-0.5 truncate text-start font-medium">{g.scaleLabel}</dd>
                </div>
                <div>
                  <dt className="text-subtle">{t('games.engine')}</dt>
                  <dd className="ltr mt-0.5 truncate text-start font-medium">{g.engine ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-subtle">{t('games.defaultFov')}</dt>
                  <dd className="mt-0.5 font-medium">
                    {g.fov ? (
                      <>
                        <span className="ltr num">{g.fov.default}</span> · {t(`fovType.${g.fov.type}`)}
                      </>
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-subtle">{t('games.step')}</dt>
                  <dd className="ltr num mt-0.5 text-start font-medium">{g.sensitivityStep ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-subtle">{t('common.edpi')}</dt>
                  <dd className="mt-0.5 font-medium">{g.edpiComparable ? '✓' : '—'}</dd>
                </div>
              </dl>

              {isTranslationKey(g.noteKey) && <p className="mt-4 text-xs leading-relaxed text-muted">{t(g.noteKey)}</p>}

              <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                <Button size="sm" onClick={() => setCalibrateId(g.id)}>
                  <Ruler />
                  {t('games.calibrate')}
                </Button>
                <InfoTip>{t('help.games.calibrate')}</InfoTip>
                {calibrated !== undefined && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      removeCalibration(g.id)
                      toast.success(t('games.calibrationRemoved'))
                    }}
                  >
                    <X />
                    {t('games.removeCalibration')}
                  </Button>
                )}
              </div>
            </Card>
          )
        })}
      </div>
      <CalibrateDialog gameId={calibrateId} open={calibrateId !== null} onClose={() => setCalibrateId(null)} />
    </>
  )
}
