import { Eraser, Trophy } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { bestOfFor, winsNeeded, type GameInput, type ResolvedMatch, type Tournament } from '@/core/tournament'
import { useT } from '@/i18n'
import { useTournaments } from '@/store/tournamentStore'
import { cn } from '@/utils/cn'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Input, Label } from '../ui/Field'
import { InfoTip } from '../ui/InfoTip'
import { participantName, roundName, seedOf } from './labels'

interface GameRow {
  map: string
  a: string
  b: string
  ot: boolean
}

const emptyRow = (): GameRow => ({ map: '', a: '', b: '', ot: false })
const digits = (v: string) => v.replace(/[^\d]/g, '').slice(0, 3)

/** Live series state from the rows typed so far (stops at the first incomplete row). */
function liveSeries(rows: GameRow[], need: number) {
  const wins: [number, number] = [0, 0]
  const games: GameInput[] = []
  let decidedAt = -1
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!
    if (r.a === '' || r.b === '') break
    const a = Number(r.a)
    const b = Number(r.b)
    if (a === b) return { wins, games, decidedAt, tieAt: i }
    wins[a > b ? 0 : 1]++
    games.push({ map: r.map.trim(), score: [a, b], overtime: r.ot })
    if (wins[0] >= need || wins[1] >= need) {
      decidedAt = i
      break
    }
  }
  return { wins, games, decidedAt, tieAt: -1 }
}

export function MatchDialog({ tournament, match, onClose }: { tournament: Tournament; match: ResolvedMatch | null; onClose: () => void }) {
  const t = useT()
  const report = useTournaments((s) => s.report)
  const clearMatch = useTournaments((s) => s.clearMatch)
  const bo = match ? bestOfFor(tournament, match.def) : 1
  const need = winsNeeded(bo)
  const [rows, setRows] = useState<GameRow[]>([])
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!match) return
    const prev = match.result?.games ?? []
    setRows(
      Array.from({ length: bo }, (_, i) => {
        const g = prev[i]
        return g ? { map: g.map, a: String(g.score[0]), b: String(g.score[1]), ot: g.overtime } : emptyRow()
      }),
    )
    setNote(match.result?.note ?? '')
    setError(null)
  }, [match, bo])

  const live = useMemo(() => liveSeries(rows, need), [rows, need])

  if (!match || match.slots[0].kind !== 'filled' || match.slots[1].kind !== 'filled') return null
  const ids = [match.slots[0].id, match.slots[1].id] as const
  const names = ids.map((id) => participantName(tournament, id) ?? '?')
  const decided = live.decidedAt >= 0
  const winnerName = decided ? names[live.wins[0] > live.wins[1] ? 0 : 1] : null

  const quick: [number, number][] =
    bo === 1 ? [[1, 0], [0, 1]] : [...Array.from({ length: need }, (_, i) => [need, i] as [number, number]), ...Array.from({ length: need }, (_, i) => [need - 1 - i, need] as [number, number])]

  const finish = (score: [number, number], games?: GameInput[]) => {
    const r = report(tournament.id, match.def.id, score, note.trim() || undefined, games)
    if (!r.ok) {
      setError(t(`tournament.error.${r.error}`))
      return
    }
    toast.success(t('tournament.resultSaved', { name: names[score[0] > score[1] ? 0 : 1] ?? '' }))
    onClose()
  }

  const saveBreakdown = () => {
    if (live.tieAt >= 0) return setError(t('tournament.error.tied_score'))
    if (!decided) return setError(t('tournament.error.series_incomplete'))
    finish(live.wins, live.games)
  }

  const setRow = (i: number, patch: Partial<GameRow>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)))

  return (
    <Dialog
      open={!!match}
      onClose={onClose}
      title={roundName(t, tournament, match.def.side, match.def.round)}
      description={t('tournament.series.needs', { bo, n: need })}
      className="sm:max-w-xl"
      footer={
        <>
          {match.status === 'done' && (
            <Button
              variant="ghost"
              className="me-auto"
              onClick={() => {
                clearMatch(tournament.id, match.def.id)
                onClose()
              }}
            >
              <Eraser />
              {t('tournament.clearResult')}
            </Button>
          )}
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" onClick={saveBreakdown} disabled={!decided}>
            {t('tournament.saveResult')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Series scoreboard */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl bg-surface-2/70 p-3.5" aria-live="polite">
          {[0, 1].map((i) => (
            <div key={i} className={cn('min-w-0', i === 1 && 'order-3 text-end')}>
              <div className="flex items-center gap-2 truncate text-sm font-semibold" style={{ justifyContent: i === 1 ? 'flex-end' : undefined }}>
                <span className="ltr num shrink-0 text-[11px] font-normal text-subtle">#{seedOf(tournament, ids[i as 0 | 1])}</span>
                <span className="truncate">{names[i]}</span>
              </div>
            </div>
          ))}
          <div className="order-2 text-center">
            <div className="ltr num display text-3xl">
              {live.wins[0]}–{live.wins[1]}
            </div>
            <div className="text-[10px] tracking-wider text-subtle uppercase">Bo{bo}</div>
          </div>
        </div>
        {decided && (
          <p className="flex items-center gap-2 rounded-xl border border-success/30 bg-success-soft px-3 py-2 text-xs font-medium text-success">
            <Trophy className="size-3.5" />
            {t('tournament.series.winner', { name: winnerName ?? '' })}
          </p>
        )}

        {/* Game-by-game */}
        <div>
          <Label help={t('help.tournament.games')}>{t('tournament.games')}</Label>
          <ol className="space-y-1.5">
            {rows.map((r, i) => {
              const locked = decided && i > live.decidedAt
              const done = r.a !== '' && r.b !== '' && r.a !== r.b
              const winner = done ? (Number(r.a) > Number(r.b) ? 0 : 1) : null
              return (
                <li
                  key={i}
                  className={cn(
                    'grid grid-cols-[3.5rem_1fr_3.25rem_3.25rem_auto] items-center gap-1.5 rounded-xl border border-border p-1.5 transition-opacity',
                    locked && 'opacity-40',
                  )}
                >
                  <span className="text-[11px] font-semibold text-subtle">{t('tournament.gameN', { n: i + 1 })}</span>
                  <Input
                    value={r.map}
                    disabled={locked}
                    maxLength={40}
                    onChange={(e) => setRow(i, { map: e.target.value })}
                    placeholder={t('tournament.mapPlaceholder')}
                    aria-label={t('tournament.mapFor', { n: i + 1 })}
                    className="h-9 text-xs"
                  />
                  {(['a', 'b'] as const).map((side, k) => (
                    <input
                      key={side}
                      inputMode="numeric"
                      dir="ltr"
                      disabled={locked}
                      value={r[side]}
                      onChange={(e) => setRow(i, { [side]: digits(e.target.value) })}
                      aria-label={t('tournament.gameScoreFor', { n: i + 1, name: names[k] ?? '' })}
                      className={cn(
                        'num h-9 w-full rounded-xl border bg-surface px-1 text-center text-sm font-semibold outline-none focus:border-accent focus:ring-3 focus:ring-ring',
                        winner === k ? 'border-accent-line text-text' : 'border-border text-muted',
                      )}
                    />
                  ))}
                  <label className="flex items-center gap-1 px-1 text-[11px] text-muted" title={t('tournament.overtime')}>
                    <input type="checkbox" checked={r.ot} disabled={locked} onChange={(e) => setRow(i, { ot: e.target.checked })} className="size-3.5 accent-[var(--c-accent)]" />
                    OT
                  </label>
                </li>
              )
            })}
          </ol>
          {live.tieAt >= 0 && <p className="mt-2 text-xs text-danger">{t('tournament.error.tied_score')}</p>}
        </div>

        {/* Quick series score without a breakdown */}
        <div>
          <Label help={t('help.tournament.quickScore')}>{t('tournament.quickScore')}</Label>
          <div className="flex flex-wrap gap-1.5">
            {quick.map(([x, y]) => (
              <button
                key={`${x}-${y}`}
                type="button"
                onClick={() => finish([x, y])}
                className={cn(
                  'num ltr rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                  x > y ? 'border-accent-line text-text hover:bg-accent-soft' : 'border-border text-muted hover:border-border-strong hover:text-text',
                )}
              >
                {x}–{y}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="match-note" hint={t('common.optional')}>
            {t('tournament.note')}
          </Label>
          <Input id="match-note" value={note} maxLength={120} onChange={(e) => setNote(e.target.value)} placeholder={t('tournament.notePlaceholder')} />
        </div>
        {error && (
          <p role="alert" className="text-xs text-danger">
            {error}
          </p>
        )}
        <p className="flex items-center gap-1.5 text-[11px] text-subtle">
          <InfoTip>{t('help.tournament.seriesAuto')}</InfoTip>
          {t('tournament.series.autoHint')}
        </p>
      </div>
    </Dialog>
  )
}
