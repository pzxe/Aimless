import { Eraser } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { ResolvedMatch, Tournament } from '@/core/tournament'
import { useT } from '@/i18n'
import { useTournaments } from '@/store/tournamentStore'
import { cn } from '@/utils/cn'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Input, Label } from '../ui/Field'
import { participantName, roundName, seedOf } from './labels'

export function MatchDialog({
  tournament,
  match,
  onClose,
}: {
  tournament: Tournament
  match: ResolvedMatch | null
  onClose: () => void
}) {
  const t = useT()
  const report = useTournaments((s) => s.report)
  const clearMatch = useTournaments((s) => s.clearMatch)
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!match) return
    setA(match.result ? String(match.result.score[0]) : '')
    setB(match.result ? String(match.result.score[1]) : '')
    setNote(match.result?.note ?? '')
    setError(null)
  }, [match])

  if (!match || match.slots[0].kind !== 'filled' || match.slots[1].kind !== 'filled') return null
  const ids = [match.slots[0].id, match.slots[1].id] as const
  const names = ids.map((id) => participantName(tournament, id) ?? '?')
  const wins = Math.ceil(tournament.bestOf / 2)
  const quick: [number, number][] =
    tournament.bestOf === 1
      ? [[1, 0], [0, 1]]
      : Array.from({ length: wins }, (_, i) => [wins, i] as [number, number]).concat(
          Array.from({ length: wins }, (_, i) => [wins - 1 - i, wins] as [number, number]),
        )

  const save = (score: [number, number]) => {
    const r = report(tournament.id, match.def.id, score, note.trim() || undefined)
    if (!r.ok) {
      setError(t(`tournament.error.${r.error}`))
      return
    }
    const winner = names[score[0] > score[1] ? 0 : 1]
    toast.success(t('tournament.resultSaved', { name: winner ?? '' }))
    onClose()
  }

  const submit = () => {
    const sa = Number(a)
    const sb = Number(b)
    if (a.trim() === '' || b.trim() === '' || !Number.isInteger(sa) || !Number.isInteger(sb)) {
      setError(t('tournament.error.invalid_score'))
      return
    }
    save([sa, sb])
  }

  return (
    <Dialog
      open={!!match}
      onClose={onClose}
      title={roundName(t, tournament, match.def.side, match.def.round)}
      description={t('tournament.bestOf', { n: tournament.bestOf })}
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
          <Button variant="primary" onClick={submit}>
            {t('tournament.saveResult')}
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        {[0, 1].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl bg-surface-2/70 p-3">
            <span className="ltr num flex size-7 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-xs text-muted">
              {seedOf(tournament, ids[i as 0 | 1])}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{names[i]}</span>
            <input
              inputMode="numeric"
              dir="ltr"
              aria-label={t('tournament.scoreFor', { name: names[i] ?? '' })}
              value={i === 0 ? a : b}
              onChange={(e) => (i === 0 ? setA : setB)(e.target.value.replace(/[^\d]/g, '').slice(0, 3))}
              className="num h-11 w-16 rounded-xl border border-border bg-surface px-2 text-center text-lg font-semibold outline-none focus:border-accent focus:ring-3 focus:ring-ring"
            />
          </div>
        ))}
        <div>
          <Label>{t('tournament.quickScore')}</Label>
          <div className="flex flex-wrap gap-1.5">
            {quick.map(([x, y]) => (
              <button
                key={`${x}-${y}`}
                type="button"
                onClick={() => save([x, y])}
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
        {error && <p role="alert" className="text-xs text-danger">{error}</p>}
        <button type="submit" hidden />
      </form>
    </Dialog>
  )
}
