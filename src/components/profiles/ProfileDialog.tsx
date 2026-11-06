import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { isValidFov, isValidResolution, parseNumber, validateDpi, validateSensitivity } from '@/core/sensitivity'
import { useT } from '@/i18n'
import { useProfiles } from '@/store/profilesStore'
import { useSettings } from '@/store/settingsStore'
import type { Profile, ProfileDraft } from '@/store/types'
import { GameSelector } from '../games/GameSelector'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { FieldError, Input, Label, NumberField, Textarea } from '../ui/Field'

export interface ProfileDialogInitial {
  name?: string
  gameId?: string
  dpi?: number
  sensitivity?: number
  resolution?: { width: number; height: number }
  fov?: number
  notes?: string
}

/** Create or edit a profile. Pass `profile` to edit, or `initial` to prefill a new one. */
export function ProfileDialog({
  open,
  onClose,
  profile,
  initial,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  profile?: Profile | null
  initial?: ProfileDialogInitial
  onSaved?: (p: Profile) => void
}) {
  const t = useT()
  const defaultDpi = useSettings((s) => s.defaultDpi)
  const create = useProfiles((s) => s.create)
  const update = useProfiles((s) => s.update)

  const [name, setName] = useState('')
  const [gameId, setGameId] = useState('cs2')
  const [dpi, setDpi] = useState('')
  const [sens, setSens] = useState('')
  const [width, setWidth] = useState('')
  const [height, setHeight] = useState('')
  const [fov, setFov] = useState('')
  const [notes, setNotes] = useState('')
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (!open) return
    const src = profile ?? initial ?? {}
    setName(src.name ?? '')
    setGameId(src.gameId ?? 'cs2')
    setDpi(String(src.dpi ?? defaultDpi))
    setSens(src.sensitivity !== undefined ? String(src.sensitivity) : '')
    setWidth(src.resolution ? String(src.resolution.width) : '')
    setHeight(src.resolution ? String(src.resolution.height) : '')
    setFov(src.fov !== undefined ? String(src.fov) : '')
    setNotes(src.notes ?? '')
    setTouched(false)
  }, [open, profile, initial, defaultDpi])

  const d = parseNumber(dpi)
  const s = parseNumber(sens)
  const w = parseNumber(width)
  const h = parseNumber(height)
  const f = parseNumber(fov)
  const nameErr = name.trim() === ''
  const dpiErr = validateDpi(d)
  const sensErr = validateSensitivity(s)
  const resGiven = width.trim() !== '' || height.trim() !== ''
  const resErr = resGiven && !(isValidResolution(w, h) && Number.isInteger(w) && Number.isInteger(h))
  const fovErr = fov.trim() !== '' && !isValidFov(f)
  const valid = !nameErr && !dpiErr && !sensErr && !resErr && !fovErr

  const submit = () => {
    setTouched(true)
    if (!valid) return
    const draft: ProfileDraft = {
      name: name.trim().slice(0, 80),
      gameId,
      dpi: d,
      sensitivity: s,
      notes: notes.trim().slice(0, 2000),
      favorite: profile?.favorite ?? false,
      resolution: resGiven ? { width: w, height: h } : undefined,
      fov: fov.trim() !== '' ? f : undefined,
    }
    if (profile) {
      update(profile.id, draft)
      toast.success(t('profiles.updated'))
      onSaved?.({ ...profile, ...draft })
    } else {
      const created = create(draft)
      toast.success(t('profiles.created'))
      onSaved?.(created)
    }
    onClose()
  }

  const templates = [t('profiles.template.main'), t('profiles.template.tracking'), t('profiles.template.flicking')]

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={profile ? t('profiles.edit') : t('profiles.new')}
      footer={
        <>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" onClick={submit}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <div>
          <Label htmlFor="profile-name">{t('common.name')}</Label>
          <Input
            id="profile-name"
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={touched && nameErr ? true : undefined}
          />
          <FieldError>{touched && nameErr ? t('validation.nameRequired') : null}</FieldError>
          {!profile && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-subtle">{t('profiles.templates')}:</span>
              {templates.map((tpl) => (
                <button
                  key={tpl}
                  type="button"
                  onClick={() => setName(tpl)}
                  className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted transition-colors hover:border-border-strong hover:text-text"
                >
                  {tpl}
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <Label>{t('common.game')}</Label>
          <GameSelector value={gameId} onChange={setGameId} label={t('common.game')} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label={t('common.dpi')}
            value={dpi}
            onValueChange={setDpi}
            error={touched && dpiErr ? t(`validation.${dpiErr}`) : null}
          />
          <NumberField
            label={t('common.sensitivity')}
            value={sens}
            onValueChange={setSens}
            error={touched && sensErr ? t(`validation.${sensErr}`) : null}
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <NumberField
            label={t('common.width')}
            hint={t('common.optional')}
            value={width}
            onValueChange={setWidth}
            inputMode="numeric"
            placeholder="1920"
          />
          <NumberField label={t('common.height')} value={height} onValueChange={setHeight} inputMode="numeric" placeholder="1080" />
          <NumberField
            label={t('common.fov')}
            hint={t('common.optional')}
            value={fov}
            onValueChange={setFov}
            error={touched && fovErr ? t('validation.fov') : null}
          />
          {touched && resErr && <FieldError>{t('validation.resolution')}</FieldError>}
        </div>
        <div>
          <Label htmlFor="profile-notes" hint={t('common.optional')}>
            {t('common.notes')}
          </Label>
          <Textarea id="profile-notes" value={notes} maxLength={2000} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </div>
        <button type="submit" hidden />
      </form>
    </Dialog>
  )
}
