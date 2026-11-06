import { ArrowDown, ArrowUp, ChevronDown, ListPlus, Plus, Users, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  fillEmptyNames,
  MAX_PARTICIPANTS,
  MAX_TEAM_SIZE,
  shuffle,
  STAGE_KEYS,
  validateNewTournament,
  type StageKey,
  type TournamentFormat,
} from '@/core/tournament'
import { useT } from '@/i18n'
import { useTournaments } from '@/store/tournamentStore'
import { cn } from '@/utils/cn'
import { createId } from '@/utils/id'
import { GameSelector } from '../games/GameSelector'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Input, Label, NumberField, Textarea } from '../ui/Field'
import { InfoTip } from '../ui/InfoTip'
import { Segmented } from '../ui/Segmented'
import { SeriesSelect } from './SeriesSelect'

interface Row {
  key: string
  name: string
  members: string[]
  open: boolean
}

type SizeChoice = 'solo' | 'duo' | 'custom'

const blankRows = (n: number): Row[] => Array.from({ length: n }, () => ({ key: createId(), name: '', members: [], open: false }))

export function CreateTournamentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  const navigate = useNavigate()
  const create = useTournaments((s) => s.create)
  const [name, setName] = useState('')
  const [gameId, setGameId] = useState('valorant')
  const [sizeChoice, setSizeChoice] = useState<SizeChoice>('custom')
  const [customSize, setCustomSize] = useState('5')
  const [format, setFormat] = useState<TournamentFormat>('single')
  const [bestOf, setBestOf] = useState(3)
  const [stageBestOf, setStageBestOf] = useState<Partial<Record<StageKey, number>>>({})
  const [stagesOpen, setStagesOpen] = useState(false)
  const [reset, setReset] = useState(true)
  const [rows, setRows] = useState<Row[]>(() => blankRows(8))
  const [bulk, setBulk] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [shuffles, setShuffles] = useState(0)

  useEffect(() => {
    if (!open) return
    setName('')
    setRows(blankRows(8))
    setBulk(null)
    setError(null)
    setStageBestOf({})
    setShuffles(0)
  }, [open])

  const customNum = Number(customSize)
  const customInvalid = sizeChoice === 'custom' && !(Number.isInteger(customNum) && customNum >= 1 && customNum <= MAX_TEAM_SIZE)
  const teamSize = sizeChoice === 'solo' ? 1 : sizeChoice === 'duo' ? 2 : customInvalid ? 5 : customNum
  const isTeam = teamSize > 1
  const label = isTeam ? t('tournament.team') : t('tournament.player')

  const update = (key: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  const move = (i: number, dir: -1 | 1) =>
    setRows((rs) => {
      const j = i + dir
      if (j < 0 || j >= rs.length) return rs
      const next = [...rs]
      ;[next[i], next[j]] = [next[j]!, next[i]!]
      return next
    })
  const setCount = (n: number) => setRows((rs) => (n > rs.length ? [...rs, ...blankRows(n - rs.length)] : rs.slice(0, Math.max(2, n))))

  const randomize = () => {
    setRows((rs) => shuffle(rs))
    setShuffles((n) => n + 1)
  }

  const submit = () => {
    if (customInvalid) {
      setError(t('tournament.error.invalid_team_size'))
      return
    }
    const input = {
      name: name.trim() || t('tournament.namePlaceholder'),
      gameId,
      teamSize,
      format,
      bestOf,
      stageBestOf,
      grandFinalReset: reset,
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

  const filled = rows.filter((r) => r.name.trim()).length
  const stages = STAGE_KEYS.filter((k) => format === 'double' || (k !== 'lower' && k !== 'grandFinal'))

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('tournament.new')}
      description={t('tournament.newDesc')}
      className="sm:max-w-2xl"
      footer={
        <>
          {error && (
            <p role="alert" className="me-auto self-center text-sm text-danger">
              {error}
            </p>
          )}
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" onClick={submit}>
            {t('tournament.generate')}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="t-name">{t('common.name')}</Label>
            <Input id="t-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder={t('tournament.namePlaceholder')} />
          </div>
          <div>
            <Label help={t('help.tournament.game')}>{t('common.game')}</Label>
            <GameSelector value={gameId} onChange={setGameId} label={t('common.game')} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label help={t('help.tournament.teamSize')}>{t('tournament.teamSize')}</Label>
            <div className="flex items-start gap-2">
              <Segmented<SizeChoice>
                label={t('tournament.teamSize')}
                value={sizeChoice}
                onChange={setSizeChoice}
                className="flex-1"
                options={[
                  { value: 'solo', label: t('tournament.size.solo') },
                  { value: 'duo', label: t('tournament.size.duo') },
                  { value: 'custom', label: t('tournament.size.custom') },
                ]}
              />
              {sizeChoice === 'custom' && (
                <NumberField
                  label={<span className="sr-only">{t('tournament.playersPerTeam')}</span>}
                  value={customSize}
                  onValueChange={setCustomSize}
                  step={1}
                  inputMode="numeric"
                  suffix={`v${teamSize}`}
                  className="-mt-[22px] w-24"
                  error={customInvalid ? t('tournament.error.invalid_team_size') : null}
                />
              )}
            </div>
          </div>
          <div>
            <Label help={t('help.tournament.format')}>{t('tournament.format')}</Label>
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
        </div>

        <div className="rounded-xl border border-border p-3.5">
          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_auto]">
            <div>
              <Label help={t('help.tournament.series')}>{t('tournament.bestOfLabel')}</Label>
              <SeriesSelect value={bestOf} onChange={(v) => v && setBestOf(v)} label={t('tournament.bestOfLabel')} />
            </div>
            <Button size="sm" variant="ghost" aria-expanded={stagesOpen} onClick={() => setStagesOpen((o) => !o)} className="h-10">
              <ChevronDown className={cn('transition-transform', stagesOpen && 'rotate-180')} />
              {t('tournament.series.perStage')}
            </Button>
          </div>
          {stagesOpen && (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {stages.map((k) => (
                <div key={k}>
                  <Label>{t(`tournament.stage.${k}`)}</Label>
                  <SeriesSelect
                    allowDefault
                    defaultValue={bestOf}
                    value={stageBestOf[k] ?? null}
                    onChange={(v) =>
                      setStageBestOf((s) => {
                        const next = { ...s }
                        if (v === null) delete next[k]
                        else next[k] = v
                        return next
                      })
                    }
                    label={t(`tournament.stage.${k}`)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {format === 'double' && (
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3">
            <input type="checkbox" checked={reset} onChange={(e) => setReset(e.target.checked)} className="mt-0.5 size-4 accent-[var(--c-accent)]" />
            <span className="flex-1">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                {t('tournament.reset')}
                <InfoTip>{t('help.tournament.reset')}</InfoTip>
              </span>
              <span className="block text-xs text-muted">{t('tournament.resetHint')}</span>
            </span>
          </label>
        )}

        <div>
          <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
            <NumberField
              label={isTeam ? t('tournament.teamCount') : t('tournament.playerCount')}
              help={t('help.tournament.entrants')}
              value={String(rows.length)}
              onValueChange={(v) => {
                const n = Math.round(Number(v))
                if (Number.isFinite(n) && n >= 2 && n <= MAX_PARTICIPANTS) setCount(n)
              }}
              step={1}
              inputMode="numeric"
              className="w-36"
            />
            <div className="flex flex-wrap items-center gap-1.5">
              <Button size="sm" onClick={randomize}>
                <span aria-hidden="true">🎲</span>
                {t('tournament.randomize')}
              </Button>
              <InfoTip>{t('help.tournament.randomize')}</InfoTip>
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
          <p className="mb-2 text-xs text-subtle" aria-live="polite">
            <span className="num">
              {filled}/{rows.length}
            </span>{' '}
            · {shuffles > 0 ? t('tournament.randomized', { n: shuffles }) : t('tournament.seedHint')}
          </p>
          {bulk !== null ? (
            <div className="space-y-2">
              <Textarea rows={8} value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder={t('tournament.pasteHint')} />
              <Button
                size="sm"
                onClick={() => {
                  const names = bulk.split(/\r?\n/).map((s) => s.trim()).filter(Boolean).slice(0, MAX_PARTICIPANTS)
                  setRows(names.length >= 2 ? names.map((n) => ({ key: createId(), name: n, members: [], open: false })) : blankRows(2))
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
                    {isTeam && (
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
                      disabled={rows.length <= 2}
                      onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                      className="hover:text-danger"
                    >
                      <X />
                    </Button>
                  </div>
                  {isTeam && r.open && (
                    <div className="grid grid-cols-2 gap-1.5 px-2 pb-2 sm:grid-cols-5">
                      {Array.from({ length: teamSize }, (_, k) => (
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
            <Button size="sm" className="mt-2" disabled={rows.length >= MAX_PARTICIPANTS} onClick={() => setRows((rs) => [...rs, ...blankRows(1)])}>
              <Plus />
              {t('tournament.addParticipant', { label })}
            </Button>
          )}
        </div>
        <p className="text-xs text-subtle">{t('tournament.byeHint')}</p>
      </div>
    </Dialog>
  )
}
