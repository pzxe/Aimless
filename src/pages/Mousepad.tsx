import { Gauge, RectangleHorizontal } from 'lucide-react'
import { useState } from 'react'
import { GameSelector } from '@/components/games/GameSelector'
import { PageHeader } from '@/components/layout/AppShell'
import { AimStyleMeter } from '@/components/tools/AimStyleMeter'
import { MousepadVisualizer, PadPicker } from '@/components/tools/MousepadVisualizer'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Label, NumberField } from '@/components/ui/Field'
import { describeSetting, parseNumber, validateDpi, validateSensitivity } from '@/core/sensitivity'
import { useGameAccuracy } from '@/hooks/useGameAccuracy'
import { useT } from '@/i18n'
import { useConverter } from '@/store/converterStore'
import { useSettings } from '@/store/settingsStore'

export default function MousepadPage() {
  const t = useT()
  const calibrations = useSettings((s) => s.calibrations)
  const accuracyOf = useGameAccuracy()
  // Start from whatever the converter currently holds.
  const [game, setGame] = useState(() => useConverter.getState().sourceGameId)
  const [sens, setSens] = useState(() => useConverter.getState().sourceSensitivity || '1')
  const [dpi, setDpi] = useState(() => useConverter.getState().sourceDpi || '800')
  const s = parseNumber(sens)
  const d = parseNumber(dpi)
  const result = describeSetting(game, d, s, calibrations)
  const sErr = sens.trim() !== '' ? validateSensitivity(s) : null
  const dErr = validateDpi(d)

  return (
    <>
      <PageHeader eyebrow={t('mousepad.eyebrow')} title={t('mousepad.title')} description={t('mousepad.subtitle')} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        <Card>
          <CardHeader title={t('mousepad.yourSetup')} icon={<Gauge />} />
          <CardBody className="space-y-4">
            <div>
              <Label>{t('common.game')}</Label>
              <GameSelector value={game} onChange={setGame} label={t('common.game')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label={t('common.sensitivity')} value={sens} onValueChange={setSens} error={sErr ? t(`validation.${sErr}`) : null} />
              <NumberField label={t('common.dpi')} value={dpi} onValueChange={setDpi} inputMode="numeric" error={dErr ? t(`validation.${dErr}`) : null} />
            </div>
            {accuracyOf(game) === 'unsupported' && <p className="text-xs text-danger">{t('note.unsupportedGeneric')}</p>}
            <div className="hairline" />
            <AimStyleMeter cm360={result?.cm360 ?? null} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={t('mousepad.visualizer')} description={t('mousepad.visualizerDesc')} icon={<RectangleHorizontal />} />
          <CardBody className="space-y-5">
            <PadPicker />
            <MousepadVisualizer cm360={result?.cm360 ?? null} />
            <p className="text-xs leading-relaxed text-subtle">{t('mousepad.note')}</p>
          </CardBody>
        </Card>
      </div>
    </>
  )
}
