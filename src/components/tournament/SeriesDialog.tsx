import { STAGE_KEYS, type Tournament } from '@/core/tournament'
import { useT } from '@/i18n'
import { useTournaments } from '@/store/tournamentStore'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Label } from '../ui/Field'
import { SeriesSelect } from './SeriesSelect'

/** Edit the default and per-stage series lengths of an existing tournament. */
export function SeriesDialog({ tournament, open, onClose }: { tournament: Tournament; open: boolean; onClose: () => void }) {
  const t = useT()
  const setSeries = useTournaments((s) => s.setSeries)
  const stages = STAGE_KEYS.filter((k) => tournament.format === 'double' || (k !== 'lower' && k !== 'grandFinal'))
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('tournament.series.title')}
      description={t('tournament.series.desc')}
      footer={<Button variant="primary" onClick={onClose}>{t('common.close')}</Button>}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label help={t('help.tournament.series')}>{t('tournament.series.default')}</Label>
          <SeriesSelect value={tournament.bestOf} onChange={(v) => v && setSeries(tournament.id, null, v)} label={t('tournament.series.default')} />
        </div>
        {stages.map((k) => (
          <div key={k}>
            <Label>{t(`tournament.stage.${k}`)}</Label>
            <SeriesSelect
              allowDefault
              defaultValue={tournament.bestOf}
              value={tournament.stageBestOf[k] ?? null}
              onChange={(v) => setSeries(tournament.id, k, v)}
              label={t(`tournament.stage.${k}`)}
            />
          </div>
        ))}
      </div>
    </Dialog>
  )
}
