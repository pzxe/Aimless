import { Crosshair } from 'lucide-react'
import { usePersistentState } from '@/hooks/usePersistentState'
import { parseNumber, validateSensitivity } from '@/core/sensitivity'
import { magnification, zoomFovFromMagnification, zoomSensitivityRatio } from '@/core/tools'
import { useFormat } from '@/hooks/useFormat'
import { useT } from '@/i18n'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { FromConverter } from './shared'
import { CopyButton } from '../ui/CopyButton'
import { Label, NumberField } from '../ui/Field'
import { Segmented } from '../ui/Segmented'

type Mode = 'fov' | 'magnification' | 'custom'

export function AdsTool() {
  const t = useT()
  const f = useFormat()
  const [mode, setMode] = usePersistentState<Mode>('ads.mode', 'fov')
  const [sens, setSens] = usePersistentState('ads.sens', '1')
  const [hip, setHip] = usePersistentState('ads.hip', '103')
  const [zoom, setZoom] = usePersistentState('ads.zoom', '70')
  const [mag, setMag] = usePersistentState('ads.mag', '4')
  const [md, setMd] = usePersistentState('ads.md', '0')
  const [custom, setCustom] = usePersistentState('ads.custom', '1')

  const s = parseNumber(sens)
  const h = parseNumber(hip)
  const z = mode === 'magnification' ? zoomFovFromMagnification(h, parseNumber(mag)) : parseNumber(zoom)
  const p = parseNumber(md)
  const ratio = mode === 'custom' ? (parseNumber(custom) > 0 ? parseNumber(custom) : null) : z ? zoomSensitivityRatio(h, z, p) : null
  const sensOk = !validateSensitivity(s)
  const ads = ratio && sensOk ? s * ratio : null
  const magValue = mode !== 'custom' && z ? magnification(h, z) : null

  return (
    <Card id="ads" className="scroll-mt-20">
      <CardHeader title={t('ads.title')} description={t('ads.desc')} icon={<Crosshair />} help={t('help.tools.ads')} action={<FromConverter onPick={(c) => c.sourceSensitivity && setSens(c.sourceSensitivity)} />} />
      <CardBody className="space-y-4">
        <Segmented<Mode>
          label={t('ads.mode')}
          value={mode}
          onChange={setMode}
          options={[
            { value: 'fov', label: t('ads.mode.fov') },
            { value: 'magnification', label: t('ads.mode.magnification') },
            { value: 'custom', label: t('ads.mode.custom') },
          ]}
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <NumberField label={t('ads.hipSens')} value={sens} step={0.01} onValueChange={setSens} />
          {mode !== 'custom' && <NumberField label={t('ads.hipFov')} value={hip} step={1} onValueChange={setHip} suffix="°" />}
          {mode === 'fov' && <NumberField label={t('ads.zoomFov')} value={zoom} step={1} onValueChange={setZoom} suffix="°" />}
          {mode === 'magnification' && <NumberField label={t('ads.magnification')} value={mag} step={0.5} onValueChange={setMag} suffix="×" />}
          {mode === 'custom' && <NumberField label={t('ads.multiplier')} value={custom} step={0.05} onValueChange={setCustom} suffix="×" />}
        </div>
        {mode !== 'custom' && (
          <div>
            <Label help={t('help.tools.monitorDistance')} hint={<span className="ltr num">{f.num(p, 0)}%</span>}>{t('ads.monitorDistance')}</Label>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={Number.isFinite(p) ? p : 0}
              onChange={(e) => setMd(e.target.value)}
              className="w-full"
              aria-label={t('ads.monitorDistance')}
            />
            <div className="mt-1 flex flex-wrap gap-1.5">
              {[0, 56.25, 75, 100].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setMd(String(v))}
                  className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted transition-colors hover:border-accent-line hover:text-text num"
                >
                  {v === 0 ? t('ads.focalLength') : `${v}%`}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="grid gap-2 sm:grid-cols-3">
          <Out label={t('ads.result')} value={ads ? f.sens(ads) : null} copy />
          <Out label={t('ads.ratio')} value={ratio ? `${f.num(ratio, 4)}×` : null} />
          <Out label={t('ads.zoom')} value={magValue ? `${f.num(magValue, 2)}×` : mode === 'custom' ? '—' : null} />
        </div>
        <p className="text-xs leading-relaxed text-subtle">{t('ads.note')}</p>
      </CardBody>
    </Card>
  )
}

function Out({ label, value, copy }: { label: string; value: string | null; copy?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl bg-surface-2/70 px-3.5 py-3">
      <div className="min-w-0">
        <div className="truncate text-[11px] text-subtle">{label}</div>
        <div className="ltr num truncate text-start text-lg font-semibold">{value ?? <span className="text-subtle">—</span>}</div>
      </div>
      {copy && value && <CopyButton text={value} label={label} variant="ghost" size="icon-sm" />}
    </div>
  )
}
