import { ArrowLeftRight, Copy, Download, Pencil, Plus, Search, Star, Trash2, Upload, UserRound } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { AccuracyBadge } from '@/components/games/AccuracyBadge'
import { GameBadge, gameName } from '@/components/games/GameBadge'
import { EmptyState, PageHeader } from '@/components/layout/AppShell'
import { ProfileDialog } from '@/components/profiles/ProfileDialog'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Field'
import { describeSetting } from '@/core/sensitivity'
import { useFormat } from '@/hooks/useFormat'
import { useGameAccuracy } from '@/hooks/useGameAccuracy'
import { useLoadIntoConverter } from '@/hooks/useLoadIntoConverter'
import { useT } from '@/i18n'
import { useProfiles } from '@/store/profilesStore'
import { useSettings } from '@/store/settingsStore'
import type { Profile } from '@/store/types'
import { cn } from '@/utils/cn'
import { buildExport, downloadJson, MAX_IMPORT_BYTES, parseImport, safeFilename } from '@/utils/importExport'

export default function ProfilesPage() {
  const t = useT()
  const f = useFormat()
  const profiles = useProfiles((s) => s.profiles)
  const { remove, duplicate, toggleFavorite, importMany } = useProfiles()
  const calibrations = useSettings((s) => s.calibrations)
  const accuracyOf = useGameAccuracy()
  const { fromProfile } = useLoadIntoConverter()

  const [query, setQuery] = useState('')
  const [favOnly, setFavOnly] = useState(false)
  const [editing, setEditing] = useState<Profile | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState<Profile | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return profiles
      .filter((p) => !favOnly || p.favorite)
      .filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.notes.toLowerCase().includes(q) ||
          gameName(p.gameId).toLowerCase().includes(q),
      )
      .sort((a, b) => Number(b.favorite) - Number(a.favorite) || b.updatedAt - a.updatedAt)
  }, [profiles, query, favOnly])

  const onImportFile = async (file: File | undefined) => {
    if (!file) return
    if (file.size > MAX_IMPORT_BYTES) {
      toast.error(t('profiles.importError.too_large'))
      return
    }
    let text: string
    try {
      text = await file.text()
    } catch {
      toast.error(t('profiles.importError.invalid_json'))
      return
    }
    const result = parseImport(text)
    if (!result.ok) {
      toast.error(t(`profiles.importError.${result.error}`))
      return
    }
    const added = importMany(result.profiles)
    const skipped = result.skipped + (result.profiles.length - added)
    if (added === 0) toast.info(t('profiles.importNothingNew'))
    else if (skipped > 0) toast.success(t('profiles.importedSkipped', { count: added, skipped }))
    else toast.success(t('profiles.imported', { count: added }))
  }

  return (
    <>
      <PageHeader
        title={t('profiles.title')}
        description={t('profiles.subtitle')}
        actions={
          <>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                void onImportFile(e.target.files?.[0])
                e.target.value = ''
              }}
            />
            <Button onClick={() => fileRef.current?.click()}>
              <Upload />
              {t('profiles.import')}
            </Button>
            <Button
              disabled={profiles.length === 0}
              onClick={() => downloadJson(`sensitivity-profiles-${new Date().toISOString().slice(0, 10)}.json`, buildExport(profiles))}
            >
              <Download />
              {t('profiles.exportAll')}
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setEditing(null)
                setDialogOpen(true)
              }}
            >
              <Plus />
              {t('profiles.new')}
            </Button>
          </>
        }
      />

      {profiles.length > 0 && (
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('profiles.search')} className="ps-9" aria-label={t('common.search')} />
          </div>
          <Button variant={favOnly ? 'primary' : 'secondary'} aria-pressed={favOnly} onClick={() => setFavOnly((v) => !v)} className="h-10">
            <Star className={cn(favOnly && 'fill-current')} />
            {t('profiles.favoritesOnly')}
          </Button>
          <span className="text-xs text-subtle sm:ms-2">{t('profiles.count', { count: filtered.length })}</span>
        </div>
      )}

      {profiles.length === 0 ? (
        <EmptyState
          icon={<UserRound />}
          title={t('profiles.empty')}
          hint={t('profiles.emptyHint')}
          action={
            <Button variant="primary" onClick={() => setDialogOpen(true)}>
              <Plus />
              {t('profiles.new')}
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Search />} title={t('profiles.noMatch')} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => {
            const d = describeSetting(p.gameId, p.dpi, p.sensitivity, calibrations)
            return (
              <Card key={p.id} className="flex flex-col p-4">
                <div className="flex items-start gap-3">
                  <GameBadge gameId={p.gameId} size="lg" />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold" title={p.name}>
                      {p.name}
                    </h3>
                    <p className="truncate text-xs text-muted">{gameName(p.gameId)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-pressed={p.favorite}
                    aria-label={p.favorite ? t('profiles.unfavorite') : t('profiles.favorite')}
                    onClick={() => toggleFavorite(p.id)}
                    className={cn(p.favorite && 'text-warning hover:text-warning')}
                  >
                    <Star className={cn(p.favorite && 'fill-current')} />
                  </Button>
                </div>
                <dl className="mt-4 grid grid-cols-4 gap-2 text-start">
                  {[
                    [t('common.sensitivity'), f.sens(p.sensitivity)],
                    [t('common.dpi'), String(p.dpi)],
                    [t('common.edpi'), f.edpi(p.dpi * p.sensitivity)],
                    [f.distLabel, d ? f.dist(d.cm360) : t('common.notAvailable')],
                  ].map(([label, value]) => (
                    <div key={label} className="min-w-0">
                      <dt className="truncate text-[11px] text-subtle">{label}</dt>
                      <dd className="ltr num truncate text-start text-sm font-semibold">{value}</dd>
                    </div>
                  ))}
                </dl>
                {(p.resolution || p.fov !== undefined) && (
                  <p className="ltr num mt-2 text-start text-[11px] text-subtle">
                    {p.resolution ? `${p.resolution.width}×${p.resolution.height}` : ''}
                    {p.resolution && p.fov !== undefined ? ' · ' : ''}
                    {p.fov !== undefined ? `FOV ${p.fov}` : ''}
                  </p>
                )}
                {p.notes && <p className="mt-3 line-clamp-2 text-xs whitespace-pre-line text-muted">{p.notes}</p>}
                <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                  <div className="flex items-center gap-2">
                    <AccuracyBadge accuracy={accuracyOf(p.gameId)} />
                    <span className="hidden truncate text-[11px] whitespace-nowrap text-subtle sm:inline">{t('profiles.updatedAt', { date: f.relativeTime(p.updatedAt) })}</span>
                  </div>
                  <div className="flex items-center">
                    <Button variant="ghost" size="icon-sm" title={t('profiles.useInConverter')} aria-label={t('profiles.useInConverter')} onClick={() => fromProfile(p)}>
                      <ArrowLeftRight />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title={t('common.edit')}
                      aria-label={t('common.edit')}
                      onClick={() => {
                        setEditing(p)
                        setDialogOpen(true)
                      }}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title={t('profiles.duplicate')}
                      aria-label={t('profiles.duplicate')}
                      onClick={() => {
                        duplicate(p.id, t('profiles.copySuffix'))
                        toast.success(t('profiles.duplicated'))
                      }}
                    >
                      <Copy />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title={t('profiles.export')}
                      aria-label={t('profiles.export')}
                      onClick={() => downloadJson(`${safeFilename(p.name)}.json`, buildExport([p]))}
                    >
                      <Download />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title={t('common.delete')}
                      aria-label={t('common.delete')}
                      onClick={() => setDeleting(p)}
                      className="hover:text-danger"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <ProfileDialog open={dialogOpen} onClose={() => setDialogOpen(false)} profile={editing} />
      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={t('common.delete')}
        description={deleting ? t('profiles.deleteConfirm', { name: deleting.name }) : ''}
        confirmLabel={t('common.delete')}
        onConfirm={() => {
          if (deleting) {
            remove(deleting.id)
            toast.success(t('profiles.deleted'))
          }
        }}
      />
    </>
  )
}
