import { Crosshair, Gauge, Radar, RectangleHorizontal, Ruler, ScanLine, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { GameSelector } from '@/components/games/GameSelector'
import { PageHeader } from '@/components/layout/AppShell'
import { Calibrator, type CalibrationResult } from '@/components/mousepad/Calibrator'
import { PadHeatmap } from '@/components/mousepad/PadHeatmap'
import { AimStyleMeter } from '@/components/tools/AimStyleMeter'
import { PadPicker } from '@/components/tools/MousepadVisualizer'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Label, NumberField } from '@/components/ui/Field'
import { describeSetting, parseNumber, validateDpi, validateSensitivity } from '@/core/sensitivity'
import { classifyAimStyle, deskReport, mousepadHeightCm, mousepadWidthCm, type DeskNoteCode, type DeskReport } from '@/core/tools'
import { useFormat } from '@/hooks/useFormat'
import { useGameAccuracy } from '@/hooks/useGameAccuracy'
import { useT, type TFunction } from '@/i18n'
import { useConverter } from '@/store/converterStore'
import { usePadCalibration } from '@/store/padCalibrationStore'
import { useSettings } from '@/store/settingsStore'
import { cn } from '@/utils/cn'

/** One readout on the telemetry panel. */
function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'hot' | 'good' | 'warn' }) {
  return (
    <div className="relative z-10 min-w-0 rounded-xl border border-border bg-bg/50 px-3.5 py-3">
      <div className="text-[10px] leading-snug font-semibold tracking-[0.14em] text-subtle uppercase">{label}</div>
      <div className={cn('num display mt-1 truncate text-2xl leading-none', tone === 'hot' && 'text-accent', tone === 'good' && 'text-success', tone === 'warn' && 'text-warning')} dir="ltr">
        {value}
      </div>
      {sub && <div className="num mt-1 truncate text-[11px] text-muted" dir="ltr">{sub}</div>}
    </div>
  )
}

/** The advice sentences for a desk report, most important first. */
function adviceFor(t: TFunction, f: ReturnType<typeof useFormat>, r: DeskReport, cm360: number, padW: number, padH: number): { code: DeskNoteCode | 'style'; text: string; tone: 'good' | 'warn' | 'info' }[] {
  const dist = (cm: number) => `${f.dist(cm)} ${f.unit}`
  const out: { code: DeskNoteCode | 'style'; text: string; tone: 'good' | 'warn' | 'info' }[] = []
  for (const code of r.notes) {
    switch (code) {
      case 'overflow':
        out.push({ code, tone: 'warn', text: t('pad.note.overflow', { cm360: dist(cm360), width: dist(padW), pct: Math.round(r.speedUpPct), max: dist(r.maxComfortCm360) }) })
        break
      case 'tight':
        out.push({ code, tone: 'info', text: t('pad.note.tight', { pct: Math.round(r.utilizationPct), width: dist(padW), turns: f.num(r.turnsAcross, 2) }) })
        break
      case 'good':
        out.push({ code, tone: 'good', text: t('pad.note.good', { width: dist(padW), turns: f.num(r.turnsAcross, 1), spare: dist(r.spareCm), half: dist(r.halfTurnCm) }) })
        break
      case 'roomy':
        out.push({ code, tone: 'info', text: t('pad.note.roomy', { width: dist(padW), turns: f.num(r.turnsAcross, 1), max: dist(r.maxComfortCm360) }) })
        break
      case 'vertical':
        out.push({ code, tone: 'warn', text: t('pad.note.vertical', { need: dist(r.pitchNeedCm), depth: dist(padH) }) })
        break
      case 'precision':
        out.push({ code, tone: 'warn', text: t('pad.note.precision', { cpd: f.num(r.countsPerDegree, 1) }) })
        break
    }
  }
  const style = classifyAimStyle(cm360)
  if (style) out.push({ code: 'style', tone: 'info', text: t(`pad.note.style.${style}`, { cm360: dist(cm360) }) })
  return out
}

export default function MousepadPage() {
  const t = useT()
  const f = useFormat()
  const calibrations = useSettings((s) => s.calibrations)
  const preset = useSettings((s) => s.mousepad)
  const customW = useSettings((s) => s.mousepadCustomCm)
  const customH = useSettings((s) => s.mousepadCustomHeightCm)
  const setSettings = useSettings((s) => s.set)
  const cal = usePadCalibration((s) => s.cal)
  const saveCal = usePadCalibration((s) => s.save)
  const clearCal = usePadCalibration((s) => s.clear)
  const accuracyOf = useGameAccuracy()
  // Start from whatever the converter currently holds.
  const [game, setGame] = useState(() => useConverter.getState().sourceGameId)
  const [sens, setSens] = useState(() => useConverter.getState().sourceSensitivity || '1')
  const [dpi, setDpi] = useState(() => useConverter.getState().sourceDpi || '800')
  const [calOpen, setCalOpen] = useState(false)
  const s = parseNumber(sens)
  const d = parseNumber(dpi)
  const sErr = sens.trim() !== '' ? validateSensitivity(s) : null
  const dErr = validateDpi(d)
  const result = describeSetting(game, d, s, calibrations)
  const padW = mousepadWidthCm(preset, customW)
  const padH = mousepadHeightCm(preset, customH)
  const report = result ? deskReport({ cm360: result.cm360, dpi: d, padWidthCm: padW, padHeightCm: padH }) : null
  const advice = result && report ? adviceFor(t, f, report, result.cm360, padW, padH) : []
  const traceMatches = cal !== null && preset === 'custom' && Math.abs(cal.widthCm - padW) < 0.25 && Math.abs(cal.heightCm - padH) < 0.25

  const onSave = (r: CalibrationResult) => {
    setSettings({ mousepad: 'custom', mousepadCustomCm: r.widthCm, mousepadCustomHeightCm: r.heightCm })
    saveCal({ widthCm: r.widthCm, heightCm: r.heightCm, at: Date.now(), dpi: d, raw: r.raw, cols: r.cols, rows: r.rows, heat: r.heat })
    setCalOpen(false)
    toast.success(t('pad.cal.saved', { w: f.dist(r.widthCm), h: f.dist(r.heightCm), unit: f.unit }))
  }

  return (
    <>
      <PageHeader
        eyebrow={t('pad.eyebrow')}
        title={t('pad.title')}
        description={t('pad.subtitle')}
        actions={
          <Button variant="primary" size="lg" disabled={dErr !== null} onClick={() => setCalOpen(true)}>
            <Radar /> {cal ? t('pad.recalibrate') : t('pad.calibrate')}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* ---------------------------------------------------------------- loadout */}
        <div className="space-y-4">
          <Card>
            <CardHeader title={t('pad.loadout')} icon={<Crosshair />} help={t('help.mousepad.aimStyle')} />
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

          <div className="hud p-4">
            <div className="relative z-10 mb-3 flex items-center gap-2 text-[10px] font-semibold tracking-[0.2em] text-accent uppercase">
              <ScanLine className="size-3.5" /> {t('pad.telemetry.live')}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <Tile tone="hot" label={f.distLabel} value={result ? f.dist(result.cm360) : '—'} sub={result ? `${f.num(result.degreesPerCount, 5)} °/count` : undefined} />
              <Tile label={t('pad.metric.counts360')} value={report ? Math.round(report.countsPer360).toLocaleString('en-US') : '—'} sub={report ? `${f.num(report.countsPerDegree, 1)} ${t('pad.metric.perDegree')}` : undefined} />
              <Tile tone="good" label={t('pad.metric.turns')} value={report ? `${f.num(report.turnsAcross, 2)}×` : '—'} sub={report ? `${f.num(report.degreesAcross, 0)}° ${t('pad.metric.edgeToEdge')}` : undefined} />
              <Tile
                tone={report && report.spareCm < 0 ? 'warn' : undefined}
                label={report && report.spareCm < 0 ? t('mousepad.short') : t('mousepad.spare')}
                value={report ? `${f.dist(Math.abs(report.spareCm))} ${f.unit}` : '—'}
                sub={report ? t('pad.metric.usedPct', { pct: Math.round(report.utilizationPct) }) : undefined}
              />
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------------------- pad */}
        <div className="space-y-4">
          <Card>
            <CardHeader title={t('pad.telemetry')} description={t('mousepad.visualizerDesc')} icon={<RectangleHorizontal />} help={t('help.mousepad.visualizer')} />
            <CardBody className="space-y-4">
              <PadPicker />
              <div className="hud p-3 sm:p-4">
                <div className="relative z-10">
                  <PadHeatmap padWidthCm={padW} padHeightCm={padH} cm360={result?.cm360 ?? null} trace={traceMatches ? cal : null} />
                  <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-muted">
                    <li className="flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-full bg-[#3ee6ff]" /> {t('pad.heat.legend.comfort')}</li>
                    <li className="flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-full bg-[#ff2e4d]" /> {t('pad.heat.legend.edge')}</li>
                    {traceMatches && <li className="flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-full bg-gradient-to-r from-[#3ee6ff] to-[#ff2e6d]" /> {t('pad.heat.legend.trace')}</li>}
                    <li className="flex items-center gap-1.5"><span className="inline-block h-1 w-4 rounded-full bg-accent-fill" /> 360°</li>
                  </ul>
                </div>
              </div>
              {report && (
                <div className="grid grid-cols-2 gap-2">
                  <Tile label={t('pad.metric.half')} value={`${f.dist(report.halfTurnCm)} ${f.unit}`} />
                  <Tile label={t('pad.metric.pitch')} value={`${f.dist(report.pitchNeedCm)} ${f.unit}`} tone={report.verticalOk ? undefined : 'warn'} />
                  <Tile label={t('pad.metric.countsPad')} value={Math.round(report.countsAcrossPad).toLocaleString('en-US')} />
                  <Tile label={t('pad.metric.util')} value={`${Math.round(report.utilizationPct)}%`} tone={report.utilizationPct > 100 ? 'warn' : report.utilizationPct > 80 ? undefined : 'good'} />
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={t('pad.advice')} icon={<Gauge />} />
            <CardBody className="space-y-2.5">
              {advice.length === 0 && <p className="text-sm text-subtle">{t('pad.note.empty')}</p>}
              {advice.map((a) => (
                <p
                  key={a.code}
                  className={cn(
                    'flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm leading-relaxed',
                    a.tone === 'warn' ? 'border-warning/30 bg-warning/10' : a.tone === 'good' ? 'border-success/30 bg-success/10' : 'border-border bg-surface-2/50',
                  )}
                >
                  {a.tone === 'warn' ? <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" /> : <Ruler className={cn('mt-0.5 size-4 shrink-0', a.tone === 'good' ? 'text-success' : 'text-muted')} />}
                  <span>{a.text}</span>
                </p>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={t('pad.measured.title')} icon={<Radar />} />
            <CardBody className="space-y-3">
              {cal ? (
                <>
                  <p className="text-sm">
                    <span className="num font-semibold" dir="ltr">{f.dist(cal.widthCm)} × {f.dist(cal.heightCm)} {f.unit}</span>
                    <span className="text-muted"> · {t('pad.measured.when', { date: new Date(cal.at).toLocaleDateString(), dpi: cal.dpi })}</span>
                    <span className={cn('ms-2 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase', cal.raw ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning')}>
                      {cal.raw ? t('pad.measured.raw') : t('pad.measured.approx')}
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" disabled={traceMatches} onClick={() => setSettings({ mousepad: 'custom', mousepadCustomCm: cal.widthCm, mousepadCustomHeightCm: cal.heightCm })}>
                      {t('pad.measured.use')}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={clearCal}>
                      {t('pad.measured.clear')}
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted">{t('pad.measured.none')}</p>
              )}
              <p className="text-xs text-subtle">{t('mousepad.note')}</p>
            </CardBody>
          </Card>
        </div>
      </div>

      {calOpen && !dErr && <Calibrator dpi={d} onClose={() => setCalOpen(false)} onSave={onSave} />}
    </>
  )
}
