import { Lock, LockOpen, ShieldAlert } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { MIN_PASSPHRASE_LENGTH } from '@/core/accounts/crypto'
import { useT } from '@/i18n'
import { useAccounts } from '@/store/accountsStore'
import { downloadJson } from '@/utils/importExport'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Dialog } from '../ui/Dialog'
import { FieldError, Input, Label } from '../ui/Field'

const MAX_BACKUP_BYTES = 8 * 1024 * 1024

/** Shown instead of the accounts while a PIN-protected vault is locked. */
export function UnlockScreen() {
  const t = useT()
  const unlock = useAccounts((s) => s.unlock)
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!pin || busy) return
    setBusy(true)
    setError(false)
    try {
      const ok = await unlock(pin)
      if (!ok) setError(true)
      else setPin('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="mx-auto max-w-md p-6 text-center">
      <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
        <Lock className="size-5" />
      </div>
      <h2 className="text-base font-semibold">{t('vault.locked.title')}</h2>
      <p className="mt-1 text-sm text-muted">{t('vault.locked.body')}</p>
      <form
        className="mt-5 text-start"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <Label htmlFor="vault-pin">{t('vault.pin')}</Label>
        <Input
          id="vault-pin"
          type="password"
          dir="ltr"
          autoFocus
          autoComplete="current-password"
          value={pin}
          onChange={(e) => {
            setPin(e.target.value)
            setError(false)
          }}
          aria-invalid={error ? true : undefined}
        />
        <FieldError>{error ? t('vault.wrongPin') : null}</FieldError>
        <Button type="submit" variant="primary" className="mt-4 w-full" disabled={!pin || busy}>
          <LockOpen />
          {t('vault.unlock')}
        </Button>
      </form>
    </Card>
  )
}

/** The vault could not be decrypted (cleared key, corrupted data). */
export function VaultError({ onReset }: { onReset: () => void }) {
  const t = useT()
  return (
    <Card className="mx-auto max-w-md p-6 text-center">
      <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-danger-soft text-danger">
        <ShieldAlert className="size-5" />
      </div>
      <h2 className="text-base font-semibold">{t('vault.error.title')}</h2>
      <p className="mt-1 text-sm text-muted">{t('vault.error.body')}</p>
      <Button variant="danger" className="mt-5" onClick={onReset}>
        {t('vault.reset')}
      </Button>
    </Card>
  )
}

/** Set or change the PIN lock. */
export function PinDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  const setPin = useAccounts((s) => s.setPin)
  const enabled = useAccounts((s) => s.pinEnabled)
  const [pin, setPinValue] = useState('')
  const [again, setAgain] = useState('')
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)

  const tooShort = pin.length < MIN_PASSPHRASE_LENGTH
  const mismatch = pin !== again
  const close = () => {
    setPinValue('')
    setAgain('')
    setTouched(false)
    onClose()
  }
  const save = async () => {
    setTouched(true)
    if (tooShort || mismatch || busy) return
    setBusy(true)
    try {
      await setPin(pin)
      toast.success(t('vault.pinSaved'))
      close()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title={enabled ? t('vault.changePin') : t('vault.setPin')}
      description={t('vault.pinDescription')}
      footer={
        <>
          <Button onClick={close}>{t('common.cancel')}</Button>
          <Button variant="primary" onClick={() => void save()} disabled={busy}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form
        className="space-y-4 py-1"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <div>
          <Label htmlFor="pin-new">{t('vault.pinNew', { n: MIN_PASSPHRASE_LENGTH })}</Label>
          <Input id="pin-new" type="password" dir="ltr" autoComplete="new-password" value={pin} onChange={(e) => setPinValue(e.target.value)} aria-invalid={touched && tooShort ? true : undefined} />
          <FieldError>{touched && tooShort ? t('vault.pinTooShort', { n: MIN_PASSPHRASE_LENGTH }) : null}</FieldError>
        </div>
        <div>
          <Label htmlFor="pin-again">{t('vault.pinConfirm')}</Label>
          <Input id="pin-again" type="password" dir="ltr" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} aria-invalid={touched && mismatch ? true : undefined} />
          <FieldError>{touched && mismatch ? t('vault.pinMismatch') : null}</FieldError>
        </div>
        <p className="rounded-xl bg-warning/10 px-3 py-2 text-xs text-warning">{t('vault.pinWarning')}</p>
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Dialog>
  )
}

/** Export the vault as an encrypted file, or import one. */
export function BackupDialog({ open, onClose, mode }: { open: boolean; onClose: () => void; mode: 'export' | 'import' }) {
  const t = useT()
  const exportBackup = useAccounts((s) => s.exportBackup)
  const importBackup = useAccounts((s) => s.importBackup)
  const [pass, setPass] = useState('')
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const exporting = mode === 'export'

  const close = () => {
    setPass('')
    setText('')
    setFileName('')
    setError(null)
    onClose()
  }

  const run = async () => {
    if (busy) return
    setError(null)
    if (pass.length < MIN_PASSPHRASE_LENGTH) return setError(t('vault.pinTooShort', { n: MIN_PASSPHRASE_LENGTH }))
    setBusy(true)
    try {
      if (exporting) {
        const json = await exportBackup(pass)
        downloadJson(`aimless-accounts-${new Date().toISOString().slice(0, 10)}.json`, JSON.parse(json))
        toast.success(t('vault.exportDone'))
      } else {
        if (!text) return setError(t('vault.importNoFile'))
        const n = await importBackup(text, pass)
        toast.success(t('vault.importDone', { n }))
      }
      close()
    } catch (e) {
      void e
      setError(t('vault.importFailed'))
    } finally {
      setBusy(false)
    }
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    if (file.size > MAX_BACKUP_BYTES) return setError(t('vault.importFailed'))
    setText(await file.text())
    setFileName(file.name)
    setError(null)
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title={exporting ? t('vault.exportTitle') : t('vault.importTitle')}
      description={exporting ? t('vault.exportBody') : t('vault.importBody')}
      footer={
        <>
          <Button onClick={close}>{t('common.cancel')}</Button>
          <Button variant="primary" onClick={() => void run()} disabled={busy}>
            {exporting ? t('vault.export') : t('vault.import')}
          </Button>
        </>
      }
    >
      <form
        className="space-y-4 py-1"
        onSubmit={(e) => {
          e.preventDefault()
          void run()
        }}
      >
        {!exporting && (
          <div>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
            <Button onClick={() => fileRef.current?.click()}>{fileName || t('vault.chooseFile')}</Button>
          </div>
        )}
        <div>
          <Label htmlFor="backup-pass">{t('vault.backupPassphrase')}</Label>
          <Input id="backup-pass" type="password" dir="ltr" autoComplete="off" value={pass} onChange={(e) => setPass(e.target.value)} aria-invalid={error ? true : undefined} />
          <FieldError>{error}</FieldError>
        </div>
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Dialog>
  )
}
