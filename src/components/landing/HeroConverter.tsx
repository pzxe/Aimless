import { ArrowLeftRight, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { convertSensitivity, parseNumber } from '@/core/sensitivity'
import { useFormat } from '@/hooks/useFormat'
import { useT } from '@/i18n'
import { useConverter } from '@/store/converterStore'
import { useSettings } from '@/store/settingsStore'
import { AccuracyBadge } from '../games/AccuracyBadge'
import { GameSelector } from '../games/GameSelector'
import { CopyButton } from '../ui/CopyButton'
import { NumberField } from '../ui/Field'

export interface DemoState {
  source: string
  target: string
  sens: string
  dpi: string
}

/** The real converter, framed as an app window for the landing page hero. */
export function HeroConverter({ demo, setDemo }: { demo: DemoState; setDemo: (d: DemoState) => void }) {
  const t = useT()
  const f = useFormat()
  const navigate = useNavigate()
  const calibrations = useSettings((s) => s.calibrations)
  const load = useConverter((s) => s.load)
  const dpi = parseNumber(demo.dpi)
  const result = convertSensitivity(
    { sourceGameId: demo.source, targetGameId: demo.target, sourceSensitivity: parseNumber(demo.sens), sourceDpi: dpi, targetDpi: dpi },
    calibrations,
  )
  const text = result.ok ? f.sens(result.target.sensitivity) : ''

  return (
    <div data-ui="aimless-converter" className="card glass relative flex w-full flex-col overflow-hidden rounded-[24px] shadow-pop">
      <div className="flex items-center gap-1.5 border-b border-border px-4 py-3">
        <span className="size-2.5 rounded-full bg-[#ff5f57]" />
        <span className="size-2.5 rounded-full bg-[#febc2e]" />
        <span className="size-2.5 rounded-full bg-[#28c840]" />
        <span className="ms-3 text-[11px] font-medium tracking-[0.14em] text-muted uppercase">{t('landing.widget.title')}</span>
        {result.ok && <AccuracyBadge accuracy={result.accuracy} className="ms-auto" />}
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
          <GameSelector value={demo.source} onChange={(source) => setDemo({ ...demo, source })} label={t('converter.sourceGame')} />
          <button
            type="button"
            onClick={() => setDemo({ ...demo, source: demo.target, target: demo.source })}
            aria-label={t('converter.swap')}
            className="flex size-9 items-center justify-center rounded-full border border-border bg-surface-2 text-muted transition-colors hover:border-accent-line hover:text-text"
          >
            <ArrowLeftRight className="size-4" />
          </button>
          <GameSelector value={demo.target} onChange={(target) => setDemo({ ...demo, target })} label={t('converter.targetGame')} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumberField label={t('common.sensitivity')} value={demo.sens} onValueChange={(sens) => setDemo({ ...demo, sens })} large />
          <NumberField label={t('common.dpi')} value={demo.dpi} onValueChange={(v) => setDemo({ ...demo, dpi: v })} large inputMode="numeric" />
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-accent-line bg-accent-soft p-4">
          <div className="pointer-events-none absolute -end-10 -top-10 size-32 rounded-full bg-accent-fill/30 blur-2xl" />
          <div className="relative flex items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-medium text-muted">{t('converter.converted')}</div>
              <output aria-live="polite" className="ltr num block truncate text-start text-4xl font-semibold tracking-tight">
                {result.ok ? text : '—'}
              </output>
            </div>
            <div className="text-end">
              <div className="text-[11px] text-muted">{f.distLabel}</div>
              <div className="ltr num text-lg font-semibold">{result.ok ? f.dist(result.target.cm360) : '—'}</div>
            </div>
          </div>
        </div>
        {!result.ok && result.unsupported.length > 0 && <p className="text-xs text-danger">{t('note.unsupportedGeneric')}</p>}
        <div className="mt-auto flex items-center justify-between gap-2">
          <CopyButton text={text} label={t('converter.copySens')} showLabel size="sm" />
          <button
            type="button"
            onClick={() => {
              load({
                sourceGameId: demo.source,
                targetGameId: demo.target,
                sourceSensitivity: demo.sens,
                sourceDpi: demo.dpi,
                targetDpi: demo.dpi,
                linkDpi: true,
              })
              navigate('/converter')
            }}
            className="group inline-flex items-center gap-1.5 text-xs font-semibold text-accent"
          >
            {t('landing.widget.open')}
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
