import { ChevronDown } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { CopyButton } from '@/components/ui/CopyButton'
import { useT } from '@/i18n'
import { curveDefaults, sanitizeParams, type CurveType, type RawAccelParams } from '@/services/rawAccelEngine'
import { PALETTES, RA_LABELS, fieldsFor, fmt, graphSvg, type Ghost, type ReplicaTheme } from '@/services/rawAccelRender'

function RaNum({ value, onCommit, pal, label }: { value: number; onCommit: (n: number) => void; pal: (typeof PALETTES)['dark']; label: string }) {
  const [draft, setDraft] = useState(fmt(value))
  const [focus, setFocus] = useState(false)
  useEffect(() => {
    if (!focus) setDraft(fmt(value))
  }, [value, focus])
  return (
    <input
      aria-label={label}
      inputMode="decimal"
      autoComplete="off"
      spellCheck={false}
      value={draft}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      onChange={(e) => {
        setDraft(e.target.value)
        const n = Number(e.target.value.replace(',', '.'))
        if (e.target.value.trim() !== '' && Number.isFinite(n)) onCommit(n)
      }}
      className="h-6 w-full min-w-0 px-1.5 text-[13px] outline-none focus:ring-2 focus:ring-[#4c9bff]/60"
      style={{ background: pal.input, color: pal.text, border: `1px solid ${pal.border}` }}
    />
  )
}

/**
 * 1:1 replica of the Raw Accel window. Field names are NEVER translated so they can be copied into Raw Accel as-is.
 */
export function ReplicaPanel({
  params,
  onChange,
  theme,
  ghosts,
  onApply,
  onReset,
}: {
  params: RawAccelParams
  onChange: (p: RawAccelParams) => void
  theme: ReplicaTheme
  ghosts: Ghost[]
  onApply: () => void
  onReset: () => void
}) {
  const t = useT()
  const pal = PALETTES[theme]
  const [aniso, setAniso] = useState(false)
  const fields = useMemo(() => fieldsFor(params), [params])
  const set = (patch: Partial<RawAccelParams>) => onChange(sanitizeParams({ ...params, ...patch }))
  const svg = useMemo(() => graphSvg({ params, ghosts, theme, w: 560, h: 430 }), [params, ghosts, theme])

  return (
    <div dir="ltr" lang="en" className="overflow-hidden rounded-xl border text-left" style={{ background: pal.window, color: pal.text, borderColor: pal.border, fontFamily: 'Segoe UI, Roboto, Arial, sans-serif' }}>
      <div className="flex items-center border-b px-3 py-1.5 text-xs" style={{ background: theme === 'classic' ? '#fff' : pal.panel, borderColor: pal.border }}>
        Raw Accel
      </div>
      <div className="grid gap-4 p-3 md:grid-cols-[minmax(280px,340px)_minmax(0,1fr)]">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pb-1 text-xs">
            <span>Last (x, y): (1, 0)</span>
            <span>Current</span>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={params.lockXY} onChange={(e) => set({ lockXY: e.target.checked })} style={{ accentColor: pal.accent }} />
              {RA_LABELS.lockXY}
            </label>
          </div>
          {fields.map((f) => (
            <div key={f.id} className="flex items-center gap-2 text-[13px]">
              {f.kind === 'check' ? (
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={f.value === '1'} onChange={(e) => set({ gain: e.target.checked })} style={{ accentColor: pal.accent }} />
                  {f.label}
                </label>
              ) : (
                <>
                  {f.label && <span className="w-[8.5rem] shrink-0">{f.label}</span>}
                  <div className="min-w-0 flex-1">
                    {f.kind === 'select' ? (
                      <select
                        aria-label={f.label || 'Curve'}
                        value={f.value}
                        onChange={(e) => {
                          if (f.key === 'curve') set({ ...curveDefaults(e.target.value as CurveType), curve: e.target.value as CurveType })
                          else set({ [f.key as string]: e.target.value } as Partial<RawAccelParams>)
                        }}
                        className="h-6 w-full px-1 text-[13px] outline-none focus:ring-2 focus:ring-[#4c9bff]/60"
                        style={{ background: pal.input, color: pal.text, border: `1px solid ${pal.border}` }}
                      >
                        {f.options!.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <RaNum value={Number(f.value)} pal={pal} label={f.label} onCommit={(n) => set({ [f.key as string]: n } as Partial<RawAccelParams>)} />
                    )}
                  </div>
                  {f.copy && <CopyButton text={f.copy} label={t('ra.replica.copyField', { field: f.label })} size="icon-sm" variant="ghost" className="shrink-0" />}
                </>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setAniso((v) => !v)}
            aria-expanded={aniso}
            className="mt-2 flex h-7 w-full items-center justify-between border px-2 text-[12.5px]"
            style={{ borderColor: pal.border, background: pal.window }}
          >
            {RA_LABELS.anisotropy}
            <ChevronDown className={`size-3.5 transition-transform ${aniso ? 'rotate-180' : ''}`} />
          </button>
          {aniso && (
            <div className="space-y-1 border p-2 text-xs" style={{ borderColor: pal.border }}>
              {['Range', 'Domain', 'LP Norm'].map((n) => (
                <div key={n} className="flex items-center gap-2">
                  <span className="w-20">{n}</span>
                  <input disabled readOnly value="1" className="h-5 w-full px-1.5 opacity-60" style={{ background: pal.input, border: `1px solid ${pal.border}`, color: pal.text }} />
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 pt-2">
            {[
              ['Apply', onApply],
              ['Reset', onReset],
            ].map(([label, fn]) => (
              <button key={label as string} type="button" onClick={fn as () => void} className="h-7 w-24 border text-[12.5px] hover:brightness-95" style={{ background: pal.button, borderColor: pal.border, color: pal.text }}>
                {label as string}
              </button>
            ))}
          </div>
        </div>
        <div className="min-w-0 border" style={{ background: theme === 'classic' ? '#fff' : pal.panel, borderColor: pal.border }}>
          {/* Markup is generated from validated numeric parameters only. */}
          <div dangerouslySetInnerHTML={{ __html: svg }} />
        </div>
      </div>
    </div>
  )
}
