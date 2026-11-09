import { ArrowLeftRight, Gauge, Info, Link2, Link2Off, RotateCcw, Ruler, Save, TriangleAlert } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { AccuracyBadge } from '@/components/games/AccuracyBadge'
import { CalibrateDialog } from '@/components/games/CalibrateDialog'
import { GameSelector } from '@/components/games/GameSelector'
import { DisplaySettings } from '@/components/converter/DisplaySettings'
import { Stat } from '@/components/converter/StatPair'
import { AimStyleMeter } from '@/components/tools/AimStyleMeter'
import { MousepadVisualizer, PadPicker } from '@/components/tools/MousepadVisualizer'
import { PageHeader } from '@/components/layout/AppShell'
import { ProfileDialog, type ProfileDialogInitial } from '@/components/profiles/ProfileDialog'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { CopyButton } from '@/components/ui/CopyButton'
import { Label, NumberField } from '@/components/ui/Field'
import { InfoTip } from '@/components/ui/InfoTip'
import { describeSetting, formatNumber, getGame, isValidFov, isValidResolution, parseNumber } from '@/core/sensitivity'
import { useConversion } from '@/hooks/useConversion'
import { useFormat } from '@/hooks/useFormat'
import { isTranslationKey, useT } from '@/i18n'
import { track } from '@/services/telemetry'
import { useConverter } from '@/store/converterStore'
import { useSettings } from '@/store/settingsStore'
import { cn } from '@/utils/cn'
import { conversionSummary } from '@/utils/summary'

export default function ConverterPage() {
  const t = useT()
  const f = useFormat()
  const lang = useSettings((s) => s.language)
  const precision = useSettings((s) => s.precision)
  const defaultDpi = useSettings((s) => s.defaultDpi)
  const { form, parsed, result, isEmpty } = useConversion()
  const calibrations = useSettings((s) => s.calibrations)
  const { setField, swap, reset } = useConverter()
  const [calibrateId, setCalibrateId] = useState<string | null>(null)
  const [saveOpen, setSaveOpen] = useState(false)

  const sourceGame = getGame(form.sourceGameId)
  const targetGame = getGame(form.targetGameId)

  const issue = (field: string) => {
    if (result.ok) return null
    const i = result.issues.find((x) => x.field === field)
    // Don't shout "required" at an untouched, empty sensitivity field.
    if (!i || (i.code === 'sens_required' && isEmpty)) return null
    return t(`validation.${i.code}`)
  }

  const unsupported = !result.ok ? result.unsupported : []
  const ok = result.ok ? result : null
  // Browser version only (track() is a no-op in the desktop app): one "conversion" once the user settles on a pair.
  const convertedTo = ok ? ok.target.sensitivity : null
  useEffect(() => {
    if (convertedTo === null) return
    const id = window.setTimeout(() => track('converter', { from: form.sourceGameId, to: form.targetGameId }), 1500)
    return () => window.clearTimeout(id)
  }, [convertedTo, form.sourceGameId, form.targetGameId])
  // Source metrics stay visible even when the target game can't be converted.
  const sourceSide = ok?.source ?? describeSetting(form.sourceGameId, parsed.sourceDpi, parsed.sourceSensitivity, calibrations)

  const profileInitial = useMemo<ProfileDialogInitial | undefined>(() => {
    if (!ok || !targetGame) return undefined
    const w = parseNumber(form.resolutionWidth)
    const h = parseNumber(form.resolutionHeight)
    const fov = parseNumber(form.fov)
    return {
      name: `${targetGame.name}`,
      gameId: targetGame.id,
      dpi: ok.target.dpi,
      sensitivity: Number(formatNumber(ok.targetRounded?.sensitivity ?? ok.target.sensitivity, Math.max(precision, 3))),
      resolution: isValidResolution(w, h) && Number.isInteger(w) && Number.isInteger(h) ? { width: w, height: h } : undefined,
      fov: isValidFov(fov) ? fov : undefined,
      notes: `${sourceGame?.name ?? ''} ${f.sens(ok.source.sensitivity)} @ ${ok.source.dpi} DPI → ${f.dist(ok.source.cm360)} ${f.distLabel}`,
    }
  }, [ok, targetGame, sourceGame, form.resolutionWidth, form.resolutionHeight, form.fov, precision, f])

  const targetSensText = ok ? f.sens(ok.target.sensitivity) : ''
  const sameGame = form.sourceGameId === form.targetGameId

  return (
    <>
      <PageHeader
        eyebrow={t('converter.eyebrow')}
        title={t('converter.title')}
        description={t('converter.subtitle')}
        actions={
          <>
            <Button variant="ghost" onClick={() => reset(defaultDpi)}>
              <RotateCcw />
              {t('converter.reset')}
            </Button>
            <Button variant="primary" disabled={!ok} onClick={() => setSaveOpen(true)}>
              <Save />
              {t('converter.saveProfile')}
            </Button>
          </>
        }
      />

      <div className="grid items-stretch gap-3 lg:grid-cols-[1fr_auto_1fr]">
        {/* SOURCE */}
        <Card className="p-5">
          <div className="mb-4 flex h-6 items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-subtle uppercase">{t('converter.source')}</span>
          </div>
          <div className="space-y-4">
            <div>
              <Label help={t('help.converter.sourceGame')}>{t('converter.sourceGame')}</Label>
              <GameSelector value={form.sourceGameId} onChange={(id) => setField('sourceGameId', id)} label={t('converter.sourceGame')} />
            </div>
            <div className="grid grid-cols-[1.4fr_1fr] gap-3">
              <NumberField
                label={t('converter.inGameSens')}
                help={t('help.converter.sens')}
                hint={sourceGame?.scaleLabel !== 'Sensitivity' ? sourceGame?.scaleLabel : undefined}
                value={form.sourceSensitivity}
                onValueChange={(v) => setField('sourceSensitivity', v)}
                placeholder="1.00"
                large
                step={0.01}
                autoFocus
                error={issue('sourceSensitivity')}
              />
              <NumberField
                label={t('converter.mouseDpi')}
                help={t('help.converter.dpi')}
                value={form.sourceDpi}
                onValueChange={(v) => setField('sourceDpi', v)}
                large
                step={50}
                inputMode="numeric"
                error={issue('sourceDpi')}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Stat label={t('common.edpi')} value={sourceSide ? f.edpi(sourceSide.edpi) : '—'} muted={!sourceSide} />
              <Stat label={f.distLabel} value={sourceSide ? f.dist(sourceSide.cm360) : '—'} muted={!sourceSide} />
            </div>
            <DisplaySettings />
          </div>
        </Card>

        {/* SWAP */}
        <div className="flex items-center justify-center lg:flex-col">
          <Button
            variant="outline"
            size="icon"
            onClick={swap}
            aria-label={t('converter.swap')}
            title={t('converter.swap')}
            className="rounded-full bg-surface"
          >
            <ArrowLeftRight className="rotate-90 lg:rotate-0 rtl:lg:rotate-180" />
          </Button>
        </div>

        {/* TARGET */}
        <Card className={cn('relative overflow-hidden p-5', ok && 'border-accent/40')}>
          {ok && <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent" />}
          <div className="mb-4 flex h-6 items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-subtle uppercase">{t('converter.target')}</span>
            {ok && <AccuracyBadge accuracy={ok.accuracy} />}
          </div>
          <div className="space-y-4">
            <div>
              <Label help={t('help.converter.targetGame')}>{t('converter.targetGame')}</Label>
              <GameSelector value={form.targetGameId} onChange={(id) => setField('targetGameId', id)} label={t('converter.targetGame')} />
            </div>
            <div className="grid grid-cols-[1.4fr_1fr] gap-3">
              <div className="min-w-0">
                <Label hint={targetGame?.scaleLabel !== 'Sensitivity' ? targetGame?.scaleLabel : undefined}>{t('converter.converted')}</Label>
                <div className="flex h-12 items-center gap-1 rounded-lg border border-accent/30 bg-accent-soft ps-3 pe-1">
                  <output
                    aria-live="polite"
                    className={cn('ltr num min-w-0 flex-1 truncate text-start text-xl font-semibold', ok ? 'text-text' : 'text-subtle')}
                  >
                    {ok ? targetSensText : '—'}
                  </output>
                  <CopyButton text={targetSensText} label={t('converter.copySens')} variant="ghost" size="icon" />
                </div>
              </div>
              <div>
                <NumberField
                  label={t('converter.targetDpi')}
                  help={t('help.converter.targetDpi')}
                  value={form.targetDpi}
                  onValueChange={(v) => setField('targetDpi', v)}
                  large
                  step={50}
                  inputMode="numeric"
                  error={issue('targetDpi')}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => setField('linkDpi', !form.linkDpi)}
              aria-pressed={form.linkDpi}
              className="-mt-2 inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-text"
            >
              {form.linkDpi ? <Link2 className="size-3.5 text-accent" /> : <Link2Off className="size-3.5" />}
              {t('converter.linkDpi')}
            </button>
            <InfoTip className="-mt-2 ms-1.5 align-middle">{t('help.converter.linkDpi')}</InfoTip>
            {ok?.targetRounded &&
              (f.sens(ok.targetRounded.sensitivity) !== targetSensText || Math.abs(ok.targetRounded.errorPercent) >= 0.1) && (
              <p className="ltr num -mt-1 text-start text-xs text-muted">
                {t('converter.nearest', {
                  value: f.sens(ok.targetRounded.sensitivity),
                  error: `${ok.targetRounded.errorPercent > 0 ? '+' : ''}${f.num(ok.targetRounded.errorPercent)}%`,
                })}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Stat label={t('common.edpi')} value={ok ? f.edpi(ok.target.edpi) : '—'} muted={!ok} />
              <Stat label={f.distLabel} value={ok ? f.dist(ok.target.cm360) : '—'} muted={!ok} />
            </div>

            {unsupported.length > 0 &&
              unsupported.map((id) => (
                <div key={id} className="rounded-lg border border-danger/30 bg-danger-soft p-3.5">
                  <p className="flex items-center gap-2 text-sm font-medium text-danger">
                    <TriangleAlert className="size-4 shrink-0" />
                    {t('converter.unsupportedTitle', { game: getGame(id)?.name ?? id })}
                  </p>
                  <p className="mt-1 text-xs text-muted">{t('converter.unsupportedBody')}</p>
                  <Button size="sm" className="mt-3" onClick={() => setCalibrateId(id)}>
                    <Ruler />
                    {t('converter.calibrate', { game: getGame(id)?.name ?? id })}
                  </Button>
                </div>
              ))}
            {!ok && unsupported.length === 0 && isEmpty && <p className="text-xs text-subtle">{t('converter.enterValues')}</p>}
          </div>
        </Card>
      </div>

      {/* SUMMARY + NOTES */}
      {ok && (
        <div className="mt-3 grid gap-3 lg:grid-cols-[1.3fr_1fr]">
          <Card className="p-5">
            <div className="mb-3 flex min-h-8 flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold">
                {t('converter.summary')}
                <InfoTip>{t('help.converter.summary')}</InfoTip>
              </h2>
              <div className="flex flex-wrap gap-1.5">
                <CopyButton text={f.edpi(ok.target.edpi)} label={t('converter.copyEdpi')} showLabel size="sm" />
                <CopyButton text={`${f.dist(ok.target.cm360)} ${f.distLabel}`} label={t('converter.copyCm', { unit: f.distLabel })} showLabel size="sm" />
                <CopyButton text={conversionSummary(ok, lang, precision)} label={t('converter.copySummary')} showLabel size="sm" />
              </div>
            </div>
            <ol className="space-y-2 text-sm">
              {[
                t('converter.summaryLine1', {
                  sens: f.sens(ok.source.sensitivity),
                  game: sourceGame?.name ?? '',
                  deg: formatNumber(ok.source.degreesPerCount, 6),
                }),
                t('converter.summaryLine2', {
                  counts: formatNumber(360 / ok.source.degreesPerCount, 0),
                  dpi: ok.source.dpi,
                  cm: f.cm(ok.source.cm360),
                  inch: f.cm(ok.source.inches360),
                }),
                t('converter.summaryLine3', {
                  dpi: ok.target.dpi,
                  game: targetGame?.name ?? '',
                  sens: f.sens(ok.target.sensitivity),
                }),
              ].map((line, i) => (
                <li key={i} className="flex gap-3">
                  <span className="ltr num mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[11px] font-semibold text-muted">
                    {i + 1}
                  </span>
                  <span className="num text-muted">{line}</span>
                </li>
              ))}
            </ol>
            {sameGame && <p className="mt-3 text-xs text-subtle">{t('converter.sameGame')}</p>}
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 flex min-h-8 items-center gap-2 text-sm font-semibold">
              <Info className="size-4 text-muted" />
              {t('common.accuracy')}
              <AccuracyBadge accuracy={ok.accuracy} className="ms-auto" />
            </h2>
            <ul className="space-y-2.5 text-xs leading-relaxed text-muted">
              {ok.notes.map((key) => (isTranslationKey(key) ? <li key={key}>{t(key)}</li> : null))}
              <li className="text-subtle">{t('converter.disclaimer')}</li>
            </ul>
          </Card>
        </div>
      )}

      {ok && (
        <Card className="mt-3">
          <CardHeader title={t('converter.aimProfile')} description={t('converter.aimProfileDesc')} icon={<Gauge />} help={t('help.converter.aimProfile')} />
          <div className="grid grid-cols-1 gap-6 px-5 pb-5 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)] lg:items-center">
            <AimStyleMeter cm360={ok.target.cm360} />
            <div className="space-y-4">
              <PadPicker />
              <MousepadVisualizer cm360={ok.target.cm360} />
            </div>
          </div>
        </Card>
      )}

      <CalibrateDialog gameId={calibrateId} open={calibrateId !== null} onClose={() => setCalibrateId(null)} />
      <ProfileDialog open={saveOpen} onClose={() => setSaveOpen(false)} initial={profileInitial} />
    </>
  )
}
