import { ArrowLeft, Crown, Download, FileImage, FileJson, Image, ListOrdered, Trash2, Trophy } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { gameName } from '@/components/games/GameBadge'
import { EmptyState } from '@/components/layout/AppShell'
import { BracketView } from '@/components/tournament/BracketView'
import { participantName, roundName, teamSizeLabel } from '@/components/tournament/labels'
import { SeriesDialog } from '@/components/tournament/SeriesDialog'
import { InfoTip } from '@/components/ui/InfoTip'
import { MatchDialog } from '@/components/tournament/MatchDialog'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { CopyButton } from '@/components/ui/CopyButton'
import { ConfirmDialog } from '@/components/ui/Dialog'
import { exportTournament, resolveTournament, type BracketSide } from '@/core/tournament'
import { useT } from '@/i18n'
import { useTournaments } from '@/store/tournamentStore'
import { bracketSvg, bracketText, downloadBlob, svgToPng, type BracketSvgLabels } from '@/utils/bracketExport'
import { cn } from '@/utils/cn'
import { downloadJson, safeFilename } from '@/utils/importExport'

export default function TournamentViewPage() {
  const t = useT()
  const { id } = useParams()
  const navigate = useNavigate()
  const tournament = useTournaments((s) => s.tournaments.find((x) => x.id === id))
  const { renameRound, randomize, remove, rename } = useTournaments()
  const [confirmRandom, setConfirmRandom] = useState(false)
  const [seriesOpen, setSeriesOpen] = useState(false)
  const [openMatch, setOpenMatch] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const resolved = useMemo(() => (tournament ? resolveTournament(tournament) : null), [tournament])

  if (!tournament || !resolved) {
    return (
      <div className="pt-10">
        <EmptyState
          icon={<Trophy />}
          title={t('tournament.notFound')}
          action={
            <Button onClick={() => navigate('/tournaments')}>
              <ArrowLeft className="rtl:rotate-180" />
              {t('tournament.back')}
            </Button>
          }
        />
      </div>
    )
  }

  const labels: BracketSvgLabels = {
    roundName: (side, round) => roundName(t, tournament, side, round),
    sideName: (side) => t(`tournament.side.${side}`),
    champion: t('tournament.champion'),
    tbd: t('tournament.tbd'),
    bye: t('tournament.bye'),
    footer: 'Aimless · pzxe.github.io/Aimless',
  }
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--c-accent').trim() || '#ff2e4d'
  const file = safeFilename(tournament.name)
  const champion = participantName(tournament, resolved.championId)
  const runnerUp = participantName(tournament, resolved.runnerUpId)
  const hasResults = Object.keys(tournament.results).length > 0
  const sides: BracketSide[] = tournament.format === 'double' ? ['upper', 'lower', 'grand'] : ['upper']
  const match = openMatch ? (resolved.matches.get(openMatch) ?? null) : null

  return (
    <>
      <Link to="/tournaments" className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-text">
        <ArrowLeft className="size-3.5 rtl:rotate-180" />
        {t('tournament.back')}
      </Link>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="eyebrow mb-2">
            {tournament.gameId ? `${gameName(tournament.gameId)} · ` : ''}
            {t(`tournament.format.${tournament.format}`)} · {teamSizeLabel(t, tournament.teamSize)} · Bo{tournament.bestOf}
          </div>
          {editingName ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const value = new FormData(e.currentTarget).get('name')
                if (typeof value === 'string') rename(tournament.id, value)
                setEditingName(false)
              }}
            >
              <input
                name="name"
                autoFocus
                defaultValue={tournament.name}
                maxLength={80}
                onBlur={(e) => {
                  rename(tournament.id, e.target.value)
                  setEditingName(false)
                }}
                className="display w-full rounded-xl border border-accent-line bg-surface-2 px-3 py-1 text-3xl outline-none sm:text-4xl"
              />
            </form>
          ) : (
            <h1 className="display cursor-text text-3xl sm:text-4xl" title={t('tournament.rename')} onClick={() => setEditingName(true)}>
              {tournament.name}
            </h1>
          )}
          <p className="mt-2 text-sm text-muted">
            {t('tournament.progress', { done: resolved.doneCount, total: resolved.playableCount })} ·{' '}
            {t('tournament.participantsCount', { n: tournament.participants.length })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => {
              if (hasResults) setConfirmRandom(true)
              else {
                randomize(tournament.id)
                toast.success(t('tournament.shuffled'))
              }
            }}
          >
            <span aria-hidden="true">🎲</span>
            {t('tournament.randomize')}
          </Button>
          <InfoTip>{t('help.tournament.randomizeBracket')}</InfoTip>
          <Button onClick={() => setSeriesOpen(true)}>
            <ListOrdered />
            {t('tournament.series.button')}
          </Button>
          <ExportMenu
            onJson={() => downloadJson(`${file}.json`, exportTournament(tournament))}
            onSvg={() => downloadBlob(`${file}.svg`, new Blob([bracketSvg(tournament, labels, accent)], { type: 'image/svg+xml' }))}
            onPng={async () => {
              try {
                downloadBlob(`${file}.png`, await svgToPng(bracketSvg(tournament, labels, accent)))
              } catch {
                toast.error(t('tournament.pngFailed'))
              }
            }}
          />
          <CopyButton text={bracketText(tournament, labels)} label={t('tournament.copySummary')} showLabel />
          <Button variant="ghost" size="icon" aria-label={t('common.delete')} title={t('common.delete')} onClick={() => setConfirmDelete(true)} className="hover:text-danger">
            <Trash2 />
          </Button>
        </div>
      </div>

      {champion && (
        <Card className="mb-5 flex items-center gap-4 overflow-hidden p-5">
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

      {resolved.readyCount > 0 && !champion && (
        <p className="mb-4 flex items-center gap-2 text-xs text-muted">
          <span className="size-2 rounded-full bg-accent-fill shadow-[0_0_8px_var(--c-accent)]" />
          {t('tournament.readyHint', { n: resolved.readyCount })}
        </p>
      )}

      <div className="space-y-5">
        {sides.map((side) => (
          <Card key={side} className="p-5">
            {sides.length > 1 && <h2 className="eyebrow mb-4">{t(`tournament.side.${side}`)}</h2>}
            <BracketView
              tournament={tournament}
              resolved={resolved}
              side={side}
              onOpen={setOpenMatch}
              onRename={(s, round, label) => renameRound(tournament.id, s, round, label)}
            />
          </Card>
        ))}
      </div>

      <Card className="mt-5 p-5">
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

      <MatchDialog tournament={tournament} match={match} onClose={() => setOpenMatch(null)} />
      <SeriesDialog tournament={tournament} open={seriesOpen} onClose={() => setSeriesOpen(false)} />
      <ConfirmDialog
        open={confirmRandom}
        onClose={() => setConfirmRandom(false)}
        title={t('tournament.randomize')}
        description={t('tournament.randomizeConfirm')}
        confirmLabel={t('tournament.randomize')}
        onConfirm={() => {
          randomize(tournament.id)
          toast.success(t('tournament.shuffled'))
        }}
      />
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={t('common.delete')}
        description={t('tournament.deleteConfirm', { name: tournament.name })}
        confirmLabel={t('common.delete')}
        onConfirm={() => {
          remove(tournament.id)
          toast.success(t('tournament.deleted'))
          navigate('/tournaments')
        }}
      />
    </>
  )
}

function ExportMenu({ onJson, onSvg, onPng }: { onJson: () => void; onSvg: () => void; onPng: () => void }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const items = [
    { icon: FileJson, label: t('tournament.exportJson'), run: onJson },
    { icon: FileImage, label: t('tournament.exportSvg'), run: onSvg },
    { icon: Image, label: t('tournament.exportPng'), run: onPng },
  ]
  return (
    <div
      className="relative"
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setOpen(false)}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation()
          setOpen(false)
          ;(e.currentTarget.querySelector('button') as HTMLButtonElement | null)?.focus()
        }
      }}
    >
      <Button aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Download />
        {t('tournament.export')}
      </Button>
      {open && (
        <div role="menu" className="glass absolute end-0 top-full z-40 mt-2 w-52 rounded-2xl border border-border p-1.5 shadow-pop animate-[pop-in_140ms_ease-out]">
          {items.map(({ icon: Icon, label, run }) => (
            <button
              key={label}
              role="menuitem"
              type="button"
              onClick={() => {
                run()
                setOpen(false)
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-start text-sm hover:bg-surface-2"
            >
              <Icon className="size-4 text-muted" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
