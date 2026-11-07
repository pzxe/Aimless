import { Copy, Download, Link2, Plus, Trash2, Trophy, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { GameBadge, gameName } from '@/components/games/GameBadge'
import { EmptyState, PageHeader } from '@/components/layout/AppShell'
import { CreateTournamentDialog } from '@/components/tournament/CreateTournamentDialog'
import { participantName, teamSizeLabel } from '@/components/tournament/labels'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { formatShareId, parseLink } from '@/services/tournamentSync'
import { ConfirmDialog } from '@/components/ui/Dialog'
import { exportTournament, importTournament, MAX_TOURNAMENT_IMPORT_BYTES, resolveTournament, type Tournament } from '@/core/tournament'
import { useFormat } from '@/hooks/useFormat'
import { useT } from '@/i18n'
import { useTournaments } from '@/store/tournamentStore'
import { downloadJson, safeFilename } from '@/utils/importExport'

export default function TournamentsPage() {
  const t = useT()
  const f = useFormat()
  const tournaments = useTournaments((s) => s.tournaments)
  const { add, remove, duplicate } = useTournaments()
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<Tournament | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const [link, setLink] = useState('')

  const openLink = () => {
    const p = parseLink(link)
    if (!p) return toast.error(t('share.openInvalid'))
    setLink('')
    const id = p.kind === 'edit' ? `${formatShareId(p.share)}.${p.keys.pub}.${p.keys.priv}` : formatShareId(p.share)
    navigate(`/${p.kind}/${id}`)
  }

  const onImport = async (file: File | undefined) => {
    if (!file) return
    if (file.size > MAX_TOURNAMENT_IMPORT_BYTES) return toast.error(t('tournament.error.too_large'))
    const r = importTournament(await file.text().catch(() => ''))
    if (!r.ok) return toast.error(t(`tournament.error.${r.error}`))
    add(r.value)
    toast.success(t('tournament.imported', { name: r.value.name }))
  }

  return (
    <>
      <PageHeader
        eyebrow={t('tournament.eyebrow')}
        title={t('tournament.title')}
        description={t('tournament.subtitle')}
        actions={
          <>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                void onImport(e.target.files?.[0])
                e.target.value = ''
              }}
            />
            <Button onClick={() => fileRef.current?.click()}>
              <Upload />
              {t('profiles.import')}
            </Button>
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus />
              {t('tournament.new')}
            </Button>
          </>
        }
      />

      <form
        className="mb-5 flex max-w-xl items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          openLink()
        }}
      >
        <div className="relative min-w-0 flex-1">
          <Link2 className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
          <Input dir="ltr" value={link} onChange={(e) => setLink(e.target.value)} aria-label={t('share.open')} placeholder={t('share.openPlaceholder')} className="ps-9" />
        </div>
        <Button type="submit" disabled={!link.trim()}>
          {t('share.openGo')}
        </Button>
      </form>

      {tournaments.length === 0 ? (
        <EmptyState
          icon={<Trophy />}
          title={t('tournament.empty')}
          hint={t('tournament.emptyHint')}
          action={
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus />
              {t('tournament.new')}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tournaments.map((tour) => {
            const r = resolveTournament(tour)
            const champion = participantName(tour, r.championId)
            const progress = r.playableCount > 0 ? r.doneCount / r.playableCount : 0
            return (
              <div key={tour.id} className="card lift flex flex-col p-5">
                <Link to={`/tournaments/${tour.id}`} className="absolute inset-0 rounded-[20px]" aria-label={tour.name} />
                <div className="flex items-start gap-3">
                  {tour.gameId ? <GameBadge gameId={tour.gameId} size="lg" /> : <Trophy className="size-8 text-accent" />}
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-semibold">{tour.name}</h3>
                    <p className="truncate text-xs text-muted">
                      {tour.gameId ? `${gameName(tour.gameId)} · ` : ''}
                      {t(`tournament.format.${tour.format}`)} · {teamSizeLabel(t, tour.teamSize)} · <span className="num">Bo{tour.bestOf}</span>
                    </p>
                  </div>
                </div>
                <div className="mt-5">
                  <div className="mb-1.5 flex items-center justify-between text-[11px] text-subtle">
                    <span>{champion ? t('tournament.finished') : t('tournament.inProgress')}</span>
                    <span className="ltr num">
                      {r.doneCount}/{r.playableCount}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                    <div className="h-full rounded-full bg-accent-fill shadow-[0_0_10px_var(--c-accent-glow)] transition-[width] duration-500" style={{ width: `${progress * 100}%` }} />
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-xs text-muted">
                    {champion ? (
                      <>
                        🏆 <span className="font-semibold text-text">{champion}</span>
                      </>
                    ) : (
                      t('tournament.participantsCount', { n: tour.participants.length })
                    )}
                  </span>
                  <div className="relative z-10 flex items-center">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t('profiles.duplicate')}
                      title={t('profiles.duplicate')}
                      onClick={() => {
                        duplicate(tour.id, t('profiles.copySuffix'))
                        toast.success(t('tournament.duplicated'))
                      }}
                    >
                      <Copy />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t('tournament.exportJson')}
                      title={t('tournament.exportJson')}
                      onClick={() => downloadJson(`${safeFilename(tour.name)}.json`, exportTournament(tour))}
                    >
                      <Download />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t('common.delete')}
                      title={t('common.delete')}
                      onClick={() => setDeleting(tour)}
                      className="hover:text-danger"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
                <p className="mt-3 text-[11px] text-subtle">{t('profiles.updatedAt', { date: f.relativeTime(tour.updatedAt) })}</p>
              </div>
            )
          })}
        </div>
      )}

      <CreateTournamentDialog open={creating} onClose={() => setCreating(false)} />
      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={t('common.delete')}
        description={deleting ? t('tournament.deleteConfirm', { name: deleting.name }) : ''}
        confirmLabel={t('common.delete')}
        onConfirm={() => {
          if (deleting) {
            remove(deleting.id)
            toast.success(t('tournament.deleted'))
          }
        }}
      />
    </>
  )
}
