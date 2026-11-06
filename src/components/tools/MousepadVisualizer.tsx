import { TriangleAlert } from 'lucide-react'
import { MOUSEPAD_WIDTHS_CM, mousepadWidthCm, padFit, type MousepadPreset } from '@/core/tools'
import { useFormat } from '@/hooks/useFormat'
import { useT } from '@/i18n'
import { useSettings } from '@/store/settingsStore'
import { cn } from '@/utils/cn'
import { NumberField } from '../ui/Field'
import { Segmented } from '../ui/Segmented'
import { parseNumber } from '@/core/sensitivity'
import { useEffect, useState } from 'react'

/** Pad size picker bound to settings (preset or custom width). */
export function PadPicker() {
  const t = useT()
  const f = useFormat()
  const preset = useSettings((s) => s.mousepad)
  const custom = useSettings((s) => s.mousepadCustomCm)
  const set = useSettings((s) => s.set)
  const [text, setText] = useState(() => f.num(f.units === 'in' ? custom / 2.54 : custom, 1))
  useEffect(() => setText(f.num(f.units === 'in' ? custom / 2.54 : custom, 1)), [custom, f])
  const presets: MousepadPreset[] = ['small', 'medium', 'large', 'xl', 'custom']
  return (
    <div className="flex min-w-0 flex-wrap items-end gap-3">
      <div className="scrollbar-thin max-w-full min-w-0 overflow-x-auto">
        <Segmented<MousepadPreset>
          label={t('mousepad.size')}
          value={preset}
          onChange={(mousepad) => set({ mousepad })}
          options={presets.map((p) => ({
            value: p,
            label: (
              <span>
                {t(`mousepad.preset.${p}`)}
                {p !== 'custom' && <span className="ms-1 text-subtle ltr num">{f.dist(MOUSEPAD_WIDTHS_CM[p]).replace(/\.00$/, '')}</span>}
              </span>
            ),
          }))}
        />
      </div>
      {preset === 'custom' && (
        <NumberField
          className="w-32"
          label={t('mousepad.customWidth')}
          value={text}
          suffix={f.unit}
          onValueChange={(v) => {
            setText(v)
            const n = parseNumber(v)
            const cm = f.units === 'in' ? n * 2.54 : n
            if (cm >= 5 && cm <= 300) set({ mousepadCustomCm: cm })
          }}
        />
      )}
    </div>
  )
}

/** To-scale view of one 360° turn against the pad width. */
export function MousepadVisualizer({ cm360 }: { cm360: number | null }) {
  const t = useT()
  const f = useFormat()
  const preset = useSettings((s) => s.mousepad)
  const custom = useSettings((s) => s.mousepadCustomCm)
  const pad = mousepadWidthCm(preset, custom)
  const fit = cm360 ? padFit(cm360, pad) : null
  const span = Math.max(pad, cm360 ?? 0) * 1.08
  const pct = (cm: number) => `${(cm / span) * 100}%`
  const tickStep = span > 120 ? 20 : span > 60 ? 10 : 5

  return (
    <div className="space-y-4">
      <div dir="ltr" className="relative pt-7 pb-8">
        {/* Pad */}
        <div
          className="relative h-28 rounded-2xl border border-border-strong bg-[repeating-linear-gradient(135deg,transparent_0_10px,rgb(255_255_255/0.018)_10px_20px)] bg-surface-2"
          style={{ width: pct(pad) }}
        >
          <span className="absolute top-2 left-3 text-[10px] font-semibold tracking-[0.16em] text-subtle uppercase">
            {t('mousepad.pad')} · <span className="num">{f.dist(pad)} {f.unit}</span>
          </span>
        </div>
        {/* 360° sweep */}
        {cm360 && (
          <div className="absolute top-[4.6rem] left-0 h-6" style={{ width: pct(cm360) }}>
            <div
              className={cn(
                'h-full rounded-full transition-[width] duration-500',
                fit?.overflow
                  ? 'bg-[linear-gradient(90deg,var(--c-accent)_0,var(--c-accent)_var(--fit),var(--c-danger)_var(--fit))] shadow-[0_0_18px_-2px_var(--c-danger)]'
                  : 'bg-accent-fill shadow-[0_0_18px_-4px_var(--c-accent)]',
              )}
              style={{ ['--fit' as string]: `${Math.min(100, (pad / cm360) * 100)}%` }}
            />
            <span className="absolute -top-6 right-0 translate-x-1/2 rounded-md bg-accent-fill px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap text-accent-fg num">
              360°
            </span>
            <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-subtle num">180°</span>
            <span className="absolute top-0 left-1/2 h-full w-px bg-white/40" />
          </div>
        )}
        {/* Ruler */}
        <div className="absolute inset-x-0 bottom-0 h-6">
          {Array.from({ length: Math.floor(span / tickStep) + 1 }, (_, i) => i * tickStep).map((cm) => (
            <span key={cm} className="absolute bottom-0 flex -translate-x-1/2 flex-col items-center" style={{ left: pct(cm) }}>
              <span className="h-2 w-px bg-border-strong" />
              <span className="num text-[9px] text-subtle">{f.units === 'in' ? f.num(cm / 2.54, 0) : cm}</span>
            </span>
          ))}
        </div>
      </div>

      {fit ? (
        <div className="grid grid-cols-3 gap-2">
          <Metric label={t('mousepad.turns')} value={`${f.num(fit.turnsAcross, 2)}×`} />
          <Metric label={t('mousepad.degrees')} value={`${f.num(fit.degreesAcross, 0)}°`} />
          <Metric
            label={fit.overflow ? t('mousepad.short') : t('mousepad.spare')}
            value={`${f.dist(Math.abs(fit.spareCm))} ${f.unit}`}
            danger={fit.overflow}
          />
        </div>
      ) : (
        <p className="text-sm text-subtle">{t('mousepad.empty')}</p>
      )}
      {fit?.overflow && (
        <p role="status" className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger-soft px-3 py-2.5 text-xs text-danger">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
          {t('mousepad.overflow', { short: `${f.dist(-fit.spareCm)} ${f.unit}` })}
        </p>
      )}
    </div>
  )
}

function Metric({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="min-w-0 rounded-xl bg-surface-2/70 px-3 py-2.5">
      <div className="truncate text-[11px] text-subtle">{label}</div>
      <div className={cn('ltr num mt-0.5 truncate text-start text-base font-semibold', danger && 'text-danger')}>{value}</div>
    </div>
  )
}
