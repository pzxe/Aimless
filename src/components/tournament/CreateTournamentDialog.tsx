import { ArrowDown, ArrowUp, ChevronDown, ListPlus, Plus, Users, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { MAX_PARTICIPANTS, type BestOf, type TournamentFormat, type TournamentMode } from '@/core/tournament'
import { fillEmptyNames, validateNewTournament } from '@/core/tournament'
import { useT } from '@/i18n'
import { useTournaments } from '@/store/tournamentStore'
import { cn } from '@/utils/cn'
import { createId } from '@/utils/id'
import { GameSelector } from '../games/GameSelector'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Input, Label, Textarea } from '../ui/Field'
import { Segmented } from '../ui/Segmented'

interface Row {
  key: string
  name: string
  members: string[]
  open: boolean
}

const blankRows = (n: number): Row[] => Array.from({ length: n }, () => ({ key: createId(), name: '', members: [], open: false }))

export function CreateTournamentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  const navigate = useNavigate()
  const create = useTournaments((s) => s.create)
  const [name, setName] = useState('')
  const [gameId, setGameId] = useState('valorant')
  const [mode, setMode] = useState<TournamentMode>('5v5')
  const [format, setFormat] = useState<TournamentFormat>('single')
  const [bestOf, setBestOf] = useState<BestOf>(3)
  const [reset, setReset] = useState(true)
  const [seeding, setSeeding] = useState<'manual' | 'random'>('manual')
  const [rows, setRows] = useState<Row[]>(() => blankRows(8))
  const [bulk, setBulk] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName('')
    setRows(blankRows(8))
    setBulk(null)
    setError(null)
  }, [open])

  const update = (key: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  const move = (i: number, dir: -1 | 1) =>
    setRows((rs) => {
      const j = i + dir
      if (j < 0 || j >= rs.length) return rs
      const next = [...rs]
      ;[next[i], next[j]] = [next[j]!, next[i]!]
      return next
    })
  const label = mode === '5v5' ? t('tournament.team') : t('tournament.player')

  const submit = () => {
    const input = {
      name,
      gameId,
      mode,
      format,
      bestOf,
      grandFinalReset: reset,
      seeding,
      participants: rows.filter((r) => r.name.trim()).map((r) => ({ name: r.name, members: r.members })),
    }
    const err = validateNewTournament(input)
    if (err) {
      setError(t(`tournament.error.${err}`))
      return
    }
    const r = create(input)
    if (!r.ok) {
      setError(t(`tournament.error.${r.error}`))
      return
    }
    toast.success(t('tournament.created'))
    onClose()
    navigate(`/tournaments/${r.value.id}`)
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('tournament.new')}
      description={t('tournament.newDesc')}
      className="sm:max-w-2xl"
      footer={
        <>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" onClick={submit}>
            {t('tournament.generate')}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="t-name">{t('common.name')}</Label>
            <Input id="t-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder={t('tournament.namePlaceholder')} />
          </div>
          <div>
            <Label>{t('common.game')}</Label>
            <GameSelector value={gameId} onChange={setGameId} label={t('common.game')} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>{t('tournament.mode')}</Label>
            <Segmented<TournamentMode>
              label={t('tournament.mode')}
              value={mode}
              onChange={setMode}
              className="w-full"
              options={[
                { value: '5v5', label: t('tournament.mode.5v5') },
                { value: '1v1', label: t('tournament.mode.1v1') },
              ]}
            />
          </div>
          <div>
            <Label>{t('tournament.format')}</Label>
            <Segmented<TournamentFormat>
              label={t('tournament.format')}
              value={format}
              onChange={setFormat}
              className="w-full"
              options={[
                { value: 'single', label: t('tournament.format.single') },
                { value: 'double', label: t('tournament.format.double') },
              ]}
            />
          </div>
          <div>
            <Label>{t('tournament.bestOfLabel')}</Label>
            <Segmented
              label={t('tournament.bestOfLabel')}
              value={String(bestOf)}
              onChange={(v) => setBestOf(Number(v) as BestOf)}
              className="w-full"
              options={['1', '3', '5', '7'].map((v) => ({ value: v, label: <span className="num">Bo{v}</span> }))}
            />
          </div>
          <div>
            <Label>{t('tournament.seeding')}</Label>
            <Segmented<'manual' | 'random'>
              label={t('tournament.seeding')}
              value={seeding}
              onChange={setSeeding}
              className="w-full"
              options={[
                { value: 'manual', label: t('tournament.seeding.manual') },
                { value: 'random', label: t('tournament.seeding.random') },
              ]}
            />
          </div>
        </div>
        {format === 'double' && (
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3">
            <input type="checkbox" checked={reset} onChange={(e) => setReset(e.target.checked)} className="mt-0.5 size-4 accent-[var(--c-accent)]" />
            <span>
              <span className="block text-sm font-medium">{t('tournament.reset')}</span>
              <span className="block text-xs text-muted">{t('tournament.resetHint')}</span>
            </span>
          </label>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <Label>
              {mode === '5v5' ? t('tournament.teams') : t('tournament.players')}{' '}
              <span className="num text-subtle">({rows.filter((r) => r.name.trim()).length}/{MAX_PARTICIPANTS})</span>
            </Label>
            <div className="flex gap-1.5">
              <Button size="sm" variant="ghost" onClick={() => setBulk(bulk === null ? rows.map((r) => r.name).filter(Boolean).join('\n') : null)}>
                <ListPlus />
                {t('tournament.pasteList')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setRows((rs) => {
                    const names = fillEmptyNames(rs.map((r) => r.name), label)
                    return rs.map((r, i) => ({ ...r, name: names[i]! }))
                  })
                }
              >
                {t('tournament.fillEmpty')}
              </Button>
            </div>
          </div>
          {bulk !== null ? (
            <div className="space-y-2">
              <Textarea rows={8} value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder={t('tournament.pasteHint')} />
              <Button
                size="sm"
                onClick={() => {
                  const names = bulk.split(/\r?\n/).map((s) => s.trim()).filter(Boolean).slice(0, MAX_PARTICIPANTS)
                  setRows(names.map((n) => ({ key: createId(), name: n, members: [], open: false })))
                  setBulk(null)
                }}
              >
                {t('tournament.applyList')}
              </Button>
            </div>
          ) : (
            <ol className="space-y-1.5">
              {rows.map((r, i) => (
                <li key={r.key} className="rounded-xl border border-border bg-surface-2/40">
                  <div className="flex items-center gap-1.5 p-1.5">
                    <span className="ltr num w-7 shrink-0 text-center text-xs text-subtle" title={t('tournament.seed')}>
                      {i + 1}
                    </span>
                    <Input
                      value={r.name}
                      maxLength={40}
                      onChange={(e) => update(r.key, { name: e.target.value })}
                      placeholder={`${label} ${i + 1}`}
                      aria-label={`${label} ${i + 1}`}
                      className="h-9"
                    />
                    {mode === '5v5' && (
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={t('tournament.roster')}
                        title={t('tournament.roster')}
                        aria-expanded={r.open}
                        onClick={() => update(r.key, { open: !r.open })}
                      >
                        <Users />
                      </Button>
                    )}
                    <Button size="icon-sm" variant="ghost" aria-label={t('tournament.moveUp')} disabled={i === 0} onClick={() => move(i, -1)}>
                      <ArrowUp />
                    </Button>
                    <Button size="icon-sm" variant="ghost" aria-label={t('tournament.moveDown')} disabled={i === rows.length - 1} onClick={() => move(i, 1)}>
                      <ArrowDown />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={t('common.delete')}
                      onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                      className="hover:text-danger"
                    >
                      <X />
                    </Button>
                  </div>
                  {mode === '5v5' && r.open && (
                    <div className="grid grid-cols-2 gap-1.5 px-2 pb-2 sm:grid-cols-5">
                      {Array.from({ length: 5 }, (_, k) => (
                        <Input
                          key={k}
                          value={r.members[k] ?? ''}
                          maxLength={40}
                          className="h-8 text-xs"
                          placeholder={t('tournament.playerN', { n: k + 1 })}
                          onChange={(e) => {
                            const members = [...r.members]
                            members[k] = e.target.value
                            update(r.key, { members })
                          }}
                        />
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
          {bulk === null && (
            <Button
              size="sm"
              className={cn('mt-2')}
              disabled={rows.length >= MAX_PARTICIPANTS}
              onClick={() => setRows((rs) => [...rs, ...blankRows(1)])}
            >
              <Plus />
              {t('tournament.addParticipant', { label })}
            </Button>
          )}
        </div>
        <p className="flex items-center gap-1.5 text-xs text-subtle">
          <ChevronDown className="size-3.5" />
          {t('tournament.byeHint')}
        </p>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      </div>
    </Dialog>
  )
}
