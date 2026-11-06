import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { formatNumber, getGame, parseNumber, validateDpi, validateSensitivity, yawFromMeasurement } from '@/core/sensitivity'
import { useT } from '@/i18n'
import { useSettings } from '@/store/settingsStore'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { NumberField } from '../ui/Field'

/**
 * Lets the user derive a yaw constant from a real in-game measurement:
 * yaw = 360 × 2.54 / (cm360 × DPI × sensitivity).
 */
export function CalibrateDialog({ gameId, open, onClose }: { gameId: string | null; open: boolean; onClose: () => void }) {
  const t = useT()
  const defaultDpi = useSettings((s) => s.defaultDpi)
  const setCalibration = useSettings((s) => s.setCalibration)
  const [sens, setSens] = useState('')
  const [dpi, setDpi] = useState(String(defaultDpi))
  const [cm, setCm] = useState('')
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (open) {
      setSens('')
      setDpi(String(defaultDpi))
      setCm('')
      setTouched(false)
    }
  }, [open, defaultDpi])

  const game = gameId ? getGame(gameId) : undefined
  if (!game) return null

  const s = parseNumber(sens)
  const d = parseNumber(dpi)
  const c = parseNumber(cm)
  const sensErr = validateSensitivity(s)
  const dpiErr = validateDpi(d)
  const cmErr = !(c > 0) || !Number.isFinite(c) ? 'cm' : null
  const valid = !sensErr && !dpiErr && !cmErr
  const yaw = valid ? yawFromMeasurement(s, d, c) : null

  const submit = () => {
    setTouched(true)
    if (!yaw) return
    setCalibration(game.id, yaw)
    toast.success(t('games.calibrationSaved', { game: game.name }))
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('games.calibrateTitle', { game: game.name })}
      description={t('games.calibrateIntro')}
      footer={
        <>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" onClick={submit} disabled={touched && !valid}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form
        className="grid gap-4 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <NumberField
          label={t('converter.inGameSens')}
          value={sens}
          onValueChange={setSens}
          error={touched && sensErr ? t(`validation.${sensErr}`) : null}
        />
        <NumberField
          label={t('common.dpi')}
          value={dpi}
          onValueChange={setDpi}
          error={touched && dpiErr ? t(`validation.${dpiErr}`) : null}
        />
        <NumberField
          label={t('games.calibrateMeasured')}
          value={cm}
          onValueChange={setCm}
          suffix="cm"
          error={touched && cmErr ? t('validation.cm360') : null}
        />
        <button type="submit" hidden />
      </form>
      <p className="mt-4 text-xs text-muted">{t('games.calibrateLinear')}</p>
      {game.nonLinearSlider && <p className="mt-2 rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">{t('note.calibratedNonLinear')}</p>}
      {game.formula && <p className="mt-4 rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">{t('games.calibrateOverride')}</p>}
      <p className="mt-4 text-sm text-muted">
        {yaw ? (
          <span className="ltr num font-medium text-text">{t('games.calibrateResult', { yaw: formatNumber(yaw, 8) })}</span>
        ) : (
          <span className="ltr num text-subtle">yaw = 360 × 2.54 ÷ (cm × DPI × sens)</span>
        )}
      </p>
    </Dialog>
  )
}
