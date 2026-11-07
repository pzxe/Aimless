import { Download, KeyRound, Lock, Plus, Search, ShieldCheck, Star, Upload, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { AccountCard } from '@/components/accounts/AccountCard'
import { AccountDialog } from '@/components/accounts/AccountDialog'
import { BackupDialog, PinDialog, UnlockScreen, VaultError } from '@/components/accounts/VaultDialogs'
import { EmptyState, PageHeader } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/Dialog'
import { Input, Label, Select } from '@/components/ui/Field'
import { ACCOUNT_REGIONS, ACCOUNT_STATUSES, type Account } from '@/core/accounts/types'
import { rankScore } from '@/core/accounts/rank'
import { getGame } from '@/core/sensitivity'
import { useLoadIntoConverter } from '@/hooks/useLoadIntoConverter'
import { supportsLiveRank, useRankRefresh } from '@/hooks/useRankRefresh'
import { useT } from '@/i18n'
import { useAccounts } from '@/store/accountsStore'
import { useProfiles } from '@/store/profilesStore'
import { useRankSettings } from '@/store/rankSettingsStore'
import { cn } from '@/utils/cn'

type SortKey = 'recent' | 'rank' | 'name' | 'game'

function sortAccounts(list: Account[], key: SortKey): Account[] {
  const out = [...list]
  const fav = (a: Account, b: Account) => Number(b.favorite) - Number(a.favorite)
  if (key === 'rank') out.sort((a, b) => fav(a, b) || rankScore(b.live, b.rankTier, b.rr) - rankScore(a.live, a.rankTier, a.rr) || a.label.localeCompare(b.label))
  else if (key === 'name') out.sort((a, b) => fav(a, b) || a.label.localeCompare(b.label))
  else if (key === 'game') out.sort((a, b) => fav(a, b) || (getGame(a.gameId)?.name ?? '').localeCompare(getGame(b.gameId)?.name ?? '') || a.label.localeCompare(b.label))
  else out.sort((a, b) => fav(a, b) || b.updatedAt - a.updatedAt)
  return out
}

export default function AccountsPage() {
  const t = useT()
  const status = useAccounts((s) => s.status)
  const accounts = useAccounts((s) => s.accounts)
  const pinEnabled = useAccounts((s) => s.pinEnabled)
  const { init, lock, remove, toggleFavorite, removePin, wipe } = useAccounts()
  const profiles = useProfiles((s) => s.profiles)
  const { fromProfile } = useLoadIntoConverter()
  const { refresh, busy } = useRankRefresh()
  const henrikKey = useRankSettings((s) => s.henrikKey)
  const setHenrikKey = useRankSettings((s) => s.setHenrikKey)

  const [query, setQuery] = useState('')
  const [game, setGame] = useState('')
  const [region, setRegion] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [favOnly, setFavOnly] = useState(false)
  const [sort, setSort] = useState<SortKey>('recent')
  const [editing, setEditing] = useState<Account | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState<Account | null>(null)
  const [pinOpen, setPinOpen] = useState(false)
  const [backup, setBackup] = useState<'export' | 'import' | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [removePinOpen, setRemovePinOpen] = useState(false)
  const [keyDraft, setKeyDraft] = useState(henrikKey)

  useEffect(() => {
    void init()
  }, [init])

  const gamesInUse = useMemo(() => [...new Set(accounts.map((a) => a.gameId))].sort((a, b) => (getGame(a)?.name ?? a).localeCompare(getGame(b)?.name ?? b)), [accounts])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = accounts.filter((a) => {
      if (favOnly && !a.favorite) return false
      if (game && a.gameId !== game) return false
      if (region && a.region !== region) return false
      if (statusFilter && a.status !== statusFilter) return false
      if (!q) return true
      return [a.label, a.inGameId, a.username, a.rank, a.notes, getGame(a.gameId)?.name ?? ''].some((v) => v.toLowerCase().includes(q))
    })
    return sortAccounts(list, sort)
  }, [accounts, query, game, region, statusFilter, favOnly, sort])

  const openAdd = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const ready = status === 'ready'

  return (
    <>
      <PageHeader
        eyebrow={t('nav.group.library')}
        title={t('accounts.title')}
        description={t('accounts.subtitle')}
        actions={
          ready ? (
            <>
              {pinEnabled && (
                <Button onClick={lock}>
                  <Lock />
                  {t('vault.lock')}
                </Button>
              )}
              <Button variant="primary" onClick={openAdd}>
                <Plus />
                {t('accounts.add')}
              </Button>
            </>
          ) : undefined
        }
      />

      {status === 'loading' && <div className="h-40" aria-busy="true" />}
      {status === 'locked' && <UnlockScreen />}
      {status === 'error' && <VaultError onReset={() => setResetOpen(true)} />}

      {ready && (
        <>
          {accounts.length > 0 && (
            <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))_auto]">
              <div className="relative sm:col-span-2 lg:col-span-1">
                <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('accounts.search')} className="ps-9" aria-label={t('common.search')} />
              </div>
              <Select value={game} onChange={(e) => setGame(e.target.value)} aria-label={t('common.game')}>
                <option value="">{t('accounts.filter.allGames')}</option>
                {gamesInUse.map((id) => (
                  <option key={id} value={id}>
                    {getGame(id)?.name ?? id}
                  </option>
                ))}
              </Select>
              <Select value={region} onChange={(e) => setRegion(e.target.value)} aria-label={t('accounts.field.region')}>
                <option value="">{t('accounts.filter.allRegions')}</option>
                {ACCOUNT_REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {t(`accounts.region.${r}`)}
                  </option>
                ))}
              </Select>
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label={t('accounts.field.status')}>
                <option value="">{t('accounts.filter.allStatuses')}</option>
                {ACCOUNT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(`accounts.status.${s}`)}
                  </option>
                ))}
              </Select>
              <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label={t('accounts.sort.label')}>
                <option value="recent">{t('accounts.sort.recent')}</option>
                <option value="rank">{t('accounts.sort.rank')}</option>
                <option value="name">{t('accounts.sort.name')}</option>
                <option value="game">{t('accounts.sort.game')}</option>
              </Select>
              <Button variant={favOnly ? 'primary' : 'secondary'} aria-pressed={favOnly} onClick={() => setFavOnly((v) => !v)} className="h-10">
                <Star className={cn(favOnly && 'fill-current')} />
                {t('profiles.favoritesOnly')}
              </Button>
            </div>
          )}

          {accounts.length === 0 ? (
            <EmptyState
              icon={<Users />}
              title={t('accounts.empty')}
              hint={t('accounts.emptyHint')}
              action={
                <Button variant="primary" onClick={openAdd}>
                  <Plus />
                  {t('accounts.add')}
                </Button>
              }
            />
          ) : filtered.length === 0 ? (
            <EmptyState icon={<Search />} title={t('accounts.noMatch')} />
          ) : (
            <div className="grid items-stretch gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((a) => (
                <AccountCard
                  key={a.id}
                  account={a}
                  busy={busy.has(a.id)}
                  onRefresh={() => void refresh(a)}
                  onEdit={() => {
                    setEditing(a)
                    setDialogOpen(true)
                  }}
                  onDelete={() => setDeleting(a)}
                  onToggleFavorite={() => toggleFavorite(a.id)}
                  onLoadProfile={(id) => {
                    const p = profiles.find((x) => x.id === id)
                    if (p) fromProfile(p)
                  }}
                />
              ))}
            </div>
          )}

          <div className="mt-6 grid items-stretch gap-3 lg:grid-cols-2">
            <Card className="flex h-full flex-col">
              <CardHeader title={t('vault.title')} icon={<ShieldCheck />} help={t('vault.help')} />
              <CardBody className="flex flex-1 flex-col gap-3">
                <p className="text-xs text-muted">{pinEnabled ? t('vault.statusPin') : t('vault.statusDevice')}</p>
                <div className="mt-auto flex flex-wrap gap-2">
                  <Button onClick={() => setPinOpen(true)}>
                    <KeyRound />
                    {pinEnabled ? t('vault.changePin') : t('vault.setPin')}
                  </Button>
                  {pinEnabled && (
                    <Button onClick={() => setRemovePinOpen(true)} variant="outline">
                      {t('vault.removePin')}
                    </Button>
                  )}
                  <Button disabled={accounts.length === 0} onClick={() => setBackup('export')}>
                    <Download />
                    {t('vault.export')}
                  </Button>
                  <Button onClick={() => setBackup('import')}>
                    <Upload />
                    {t('vault.import')}
                  </Button>
                </div>
              </CardBody>
            </Card>

            <Card className="flex h-full flex-col">
              <CardHeader title={t('rank.settings.title')} description={t('rank.settings.desc')} icon={<Star />} />
              <CardBody className="flex flex-1 flex-col gap-3">
                <div>
                  <Label htmlFor="henrik-key" hint={t('common.optional')} help={t('rank.keyHelp')}>
                    {t('rank.keyLabel')}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="henrik-key"
                      type="password"
                      dir="ltr"
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="HDEV-…"
                      value={keyDraft}
                      onChange={(e) => setKeyDraft(e.target.value)}
                      onBlur={() => setHenrikKey(keyDraft)}
                    />
                    <Button onClick={() => setHenrikKey(keyDraft)} disabled={keyDraft.trim() === henrikKey}>
                      {t('common.save')}
                    </Button>
                  </div>
                </div>
                <p className="mt-auto text-xs text-subtle">{t('rank.privacyNote')}</p>
              </CardBody>
            </Card>
          </div>
        </>
      )}

      <AccountDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        account={editing}
        onSaved={(a) => {
          if (supportsLiveRank(a.gameId) && a.inGameId && (!editing || editing.inGameId !== a.inGameId)) void refresh(a, { quiet: true })
        }}
      />
      <PinDialog open={pinOpen} onClose={() => setPinOpen(false)} />
      <BackupDialog open={backup !== null} mode={backup ?? 'export'} onClose={() => setBackup(null)} />
      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={t('accounts.deleteTitle')}
        description={t('accounts.deleteConfirm', { name: deleting?.label ?? '' })}
        confirmLabel={t('common.delete')}
        onConfirm={() => deleting && remove(deleting.id)}
      />
      <ConfirmDialog
        open={removePinOpen}
        onClose={() => setRemovePinOpen(false)}
        title={t('vault.removePin')}
        description={t('vault.removePinConfirm')}
        confirmLabel={t('vault.removePin')}
        onConfirm={() => void removePin()}
      />
      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title={t('vault.reset')}
        description={t('vault.resetConfirm')}
        confirmLabel={t('vault.reset')}
        onConfirm={wipe}
      />
    </>
  )
}
