import { Eye, EyeOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { GAME_ID_KIND, ID_KIND_PLACEHOLDER, parseBattleTag, parseRiotId } from '@/core/accounts/ids'
import { ACCOUNT_REGIONS, ACCOUNT_STATUSES, emptyDraft, type Account, type AccountDraft } from '@/core/accounts/types'
import { useValorantTiers } from '@/hooks/useValorantTiers'
import { useT } from '@/i18n'
import { useAccounts } from '@/store/accountsStore'
import { useProfiles } from '@/store/profilesStore'
import { GameSelector } from '../games/GameSelector'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { FieldError, Input, Label, Select, Textarea } from '../ui/Field'
import { TierIcon } from './RankView'

/** Create or edit an account in the vault. */
export function AccountDialog({
  open,
  onClose,
  account,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  account?: Account | null
  onSaved?: (a: Account) => void
}) {
  const t = useT()
  const add = useAccounts((s) => s.add)
  const update = useAccounts((s) => s.update)
  const profiles = useProfiles((s) => s.profiles)
  const { list: tiers } = useValorantTiers()
  const [draft, setDraft] = useState<AccountDraft>(emptyDraft())
  const [showPw, setShowPw] = useState(false)
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (!open) return
    setTouched(false)
    setShowPw(false)
    if (account) {
      const { id: _i, createdAt: _c, updatedAt: _u, live: _l, liveAt: _la, ...rest } = account
      setDraft(rest)
    } else setDraft(emptyDraft())
  }, [open, account])

  const set = <K extends keyof AccountDraft>(key: K, value: AccountDraft[K]) => setDraft((d) => ({ ...d, [key]: value }))
  const kind = GAME_ID_KIND[draft.gameId] ?? 'generic'
  const idInvalid =
    draft.inGameId.trim() !== '' &&
    ((kind === 'riot' && !parseRiotId(draft.inGameId)) || (kind === 'battletag' && !parseBattleTag(draft.inGameId)))
  const labelMissing = draft.label.trim() === ''
  const isValorant = draft.gameId === 'valorant'

  const save = () => {
    setTouched(true)
    if (labelMissing || idInvalid) return
    const clean: AccountDraft = {
      ...draft,
      label: draft.label.trim(),
      username: draft.username.trim(),
      inGameId: draft.inGameId.trim(),
      rank: draft.rank.trim(),
      rr: draft.rr !== undefined && Number.isFinite(draft.rr) ? Math.max(0, Math.round(draft.rr)) : undefined,
      rankTier: isValorant ? draft.rankTier : undefined,
      profileId: draft.profileId || undefined,
    }
    if (account) {
      // A changed ID or game makes the previous live rank wrong: drop it.
      const same = account.gameId === clean.gameId && account.inGameId === clean.inGameId
      update(account.id, { ...clean, ...(same ? {} : { live: undefined, liveAt: undefined }) } as Partial<AccountDraft>)
      onSaved?.({ ...account, ...clean })
    } else onSaved?.(add(clean))
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={account ? t('accounts.editTitle') : t('accounts.addTitle')}
      description={t('accounts.dialogHint')}
      className="sm:max-w-2xl"
      footer={
        <>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" onClick={save}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
        className="grid gap-4 py-1 sm:grid-cols-2"
        autoComplete="off"
      >
        <div>
          <Label htmlFor="acc-label">{t('accounts.field.label')}</Label>
          <Input
            id="acc-label"
            value={draft.label}
            maxLength={80}
            onChange={(e) => set('label', e.target.value)}
            placeholder={t('accounts.field.labelPlaceholder')}
            aria-invalid={touched && labelMissing ? true : undefined}
          />
          <FieldError>{touched && labelMissing ? t('accounts.error.label') : null}</FieldError>
        </div>
        <GameSelector value={draft.gameId} onChange={(id) => set('gameId', id)} label={t('common.game')} />

        <div>
          <Label htmlFor="acc-id" help={t('accounts.help.inGameId')}>
            {t('accounts.field.inGameId')}
          </Label>
          <Input
            id="acc-id"
            dir="ltr"
            value={draft.inGameId}
            maxLength={100}
            onChange={(e) => set('inGameId', e.target.value)}
            placeholder={ID_KIND_PLACEHOLDER[kind]}
            spellCheck={false}
            aria-invalid={idInvalid ? true : undefined}
          />
          <FieldError>{idInvalid ? t(kind === 'riot' ? 'accounts.error.riotId' : 'accounts.error.battleTag') : null}</FieldError>
        </div>
        <div>
          <Label htmlFor="acc-region">{t('accounts.field.region')}</Label>
          <Select id="acc-region" value={draft.region} onChange={(e) => set('region', e.target.value as AccountDraft['region'])}>
            <option value="">{t('accounts.regionNone')}</option>
            {ACCOUNT_REGIONS.map((r) => (
              <option key={r} value={r}>
                {t(`accounts.region.${r}`)}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="acc-user">{t('accounts.field.username')}</Label>
          <Input id="acc-user" dir="ltr" value={draft.username} maxLength={200} onChange={(e) => set('username', e.target.value)} autoComplete="off" spellCheck={false} />
        </div>
        <div>
          <Label htmlFor="acc-pw" help={t('accounts.help.password')}>
            {t('accounts.field.password')}
          </Label>
          <div className="relative">
            <Input
              id="acc-pw"
              dir="ltr"
              type={showPw ? 'text' : 'password'}
              value={draft.password}
              maxLength={500}
              onChange={(e) => set('password', e.target.value)}
              autoComplete="new-password"
              spellCheck={false}
              className="pe-11"
            />
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute end-1.5 top-1/2 -translate-y-1/2"
              aria-label={showPw ? t('accounts.hidePassword') : t('accounts.showPassword')}
              aria-pressed={showPw}
              onClick={() => setShowPw((v) => !v)}
            >
              {showPw ? <EyeOff /> : <Eye />}
            </Button>
          </div>
        </div>

        <div>
          <Label htmlFor="acc-rank" hint={t('common.optional')}>
            {t('accounts.field.rank')}
          </Label>
          {isValorant ? (
            <div className="flex items-center gap-2">
              {draft.rankTier !== undefined && <TierIcon tier={draft.rankTier} className="size-8 shrink-0" />}
              <Select
                id="acc-rank"
                className="flex-1"
                value={draft.rankTier ?? ''}
                onChange={(e) => set('rankTier', e.target.value === '' ? undefined : Number(e.target.value))}
              >
                <option value="">{t('rank.noRank')}</option>
                {tiers.map((tier) => (
                  <option key={tier.tier} value={tier.tier}>
                    {tier.name}
                  </option>
                ))}
              </Select>
            </div>
          ) : (
            <Input id="acc-rank" value={draft.rank} maxLength={60} onChange={(e) => set('rank', e.target.value)} placeholder={t('accounts.field.rankPlaceholder')} />
          )}
        </div>
        <div>
          <Label htmlFor="acc-rr" hint={t('common.optional')}>
            {t('accounts.field.rr')}
          </Label>
          <Input
            id="acc-rr"
            dir="ltr"
            inputMode="numeric"
            value={draft.rr ?? ''}
            onChange={(e) => {
              const v = e.target.value.replace(/[^\d]/g, '').slice(0, 4)
              set('rr', v === '' ? undefined : Number(v))
            }}
            placeholder="0"
          />
        </div>

        <div>
          <Label htmlFor="acc-status">{t('accounts.field.status')}</Label>
          <Select id="acc-status" value={draft.status} onChange={(e) => set('status', e.target.value as AccountDraft['status'])}>
            {ACCOUNT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`accounts.status.${s}`)}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="acc-profile" hint={t('common.optional')} help={t('accounts.help.profile')}>
            {t('accounts.field.profile')}
          </Label>
          <Select id="acc-profile" value={draft.profileId ?? ''} onChange={(e) => set('profileId', e.target.value || undefined)}>
            <option value="">{t('accounts.profileNone')}</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="acc-notes" hint={t('common.optional')}>
            {t('common.notes')}
          </Label>
          <Textarea id="acc-notes" value={draft.notes} maxLength={1000} onChange={(e) => set('notes', e.target.value)} rows={3} />
        </div>
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Dialog>
  )
}
