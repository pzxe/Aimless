import { Activity } from 'lucide-react'
import { useState } from 'react'
import { parseNumber } from '@/core/sensitivity'
import { pollStats } from '@/core/tools'
import { useFormat } from '@/hooks/useFormat'
import { useT } from '@/i18n'
import { useSettings } from '@/store/settingsStore'
import { cn } from '@/utils/cn'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { Label, NumberField } from '../ui/Field'

const RATES = [1000, 2000, 4000, 8000]

export function PollingTool() {
  const t = useT()
  const f = useFormat()
  const defaultDpi = useSettings((s) => s.defaultDpi)
  const [dpi, setDpi] = useState(String(defaultDpi))
  const [speed, setSpeed] = useState('30')
  const d = parseNumber(dpi)
  const sCm = parseNumber(speed)
  const speedCm = f.units === 'in' ? sCm * 2.54 : sCm
  const rows = RATES.map((hz) => pollStats(d, hz, speedCm))
  const speedUnit = `${f.unit}/s`

  return (
    <Card id="polling" className="scroll-mt-20">
      <CardHeader title={t('polling.title')} description={t('polling.desc')} icon={<Activity />} />
      <CardBody className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <NumberField label={t('common.dpi')} value={dpi} onValueChange={setDpi} inputMode="numeric" />
          <NumberField label={t('polling.speed')} value={speed} onValueChange={setSpeed} suffix={speedUnit} />
        </div>
        <div>
          <Label>{t('polling.speedPresets')}</Label>
          <div className="flex flex-wrap gap-1.5">
            {[
              { key: 'polling.preset.micro', cm: 5 },
              { key: 'polling.preset.tracking', cm: 30 },
              { key: 'polling.preset.flick', cm: 150 },
            ].map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setSpeed(f.num(f.units === 'in' ? p.cm / 2.54 : p.cm, 1))}
                className="rounded-full border border-border px-2.5 py-0.5 text-[11px] text-muted transition-colors hover:border-accent-line hover:text-text"
              >
                {t(p.key as 'polling.preset.micro')} · <span className="num ltr">{f.num(f.units === 'in' ? p.cm / 2.54 : p.cm, 0)} {speedUnit}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-2/60 text-[11px] tracking-wide text-subtle uppercase">
              <tr>
                <th className="px-3 py-2 text-start font-medium">{t('polling.rate')}</th>
                <th className="px-3 py-2 text-start font-medium">{t('polling.interval')}</th>
                <th className="px-3 py-2 text-start font-medium">{t('polling.countsPerPoll')}</th>
                <th className="px-3 py-2 text-start font-medium">{t('polling.minSpeed')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r, i) => (
                <tr key={RATES[i]} className={cn(r && r.countsPerPoll < 1 && 'bg-warning-soft/60')}>
                  <td className="ltr num px-3 py-2 text-start font-medium">{RATES[i]} Hz</td>
                  <td className="ltr num px-3 py-2 text-start">{r ? `${f.num(r.intervalMs, 3)} ms` : '—'}</td>
                  <td className={cn('ltr num px-3 py-2 text-start font-semibold', r && r.countsPerPoll < 1 && 'text-warning')}>
                    {r ? f.num(r.countsPerPoll, 2) : '—'}
                  </td>
                  <td className="ltr num px-3 py-2 text-start">
                    {r ? `${f.num(f.units === 'in' ? r.minSpeedCmS / 2.54 : r.minSpeedCmS, 2)} ${speedUnit}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs leading-relaxed text-subtle">{t('polling.note')}</p>
      </CardBody>
    </Card>
  )
}
