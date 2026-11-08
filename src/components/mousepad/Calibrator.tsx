import { Check, MoveHorizontal, MoveVertical, RotateCcw, TriangleAlert, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { NumberField } from '@/components/ui/Field'
import { parseNumber } from '@/core/sensitivity'
import { cmToCounts, countsToCm, normalizeHeat, SweepTracker, traceHeat } from '@/core/tools'
import { useT } from '@/i18n'
import { cn } from '@/utils/cn'
import { drawHeat } from './heat'

/** A sweep shorter than this is treated as a mistake (a nudge, not a pad). */
export const MIN_SWEEP_CM = 3
const COLS = 24
const ROWS = 16
type Step = 'intro' | 'h' | 'v' | 'result'
type Lock = 'raw' | 'adjusted' | null

/**
 * Locks the pointer to `el`. `unadjustedMovement` asks the browser for raw sensor movement (no OS acceleration), which
 * is what makes counts / DPI a real distance. Falls back to a normal lock, reported as "adjusted", when that is refused.
 */
export async function lockPointer(el: HTMLElement): Promise<Lock> {
  const waitForLock = () =>
    new Promise<boolean>((resolve) => {
      const done = (ok: boolean) => {
        document.removeEventListener('pointerlockchange', onChange)
        document.removeEventListener('pointerlockerror', onError)
        clearTimeout(timer)
        resolve(ok)
      }
      const onChange = () => done(document.pointerLockElement === el)
      const onError = () => done(false)
      const timer = setTimeout(() => done(document.pointerLockElement === el), 1500)
      document.addEventListener('pointerlockchange', onChange)
      document.addEventListener('pointerlockerror', onError)
    })
  const attempt = async (options?: { unadjustedMovement: boolean }) => {
    const ready = waitForLock()
    try {
      const r = (el.requestPointerLock as (o?: unknown) => unknown)(options) as Promise<void> | undefined
      if (r && typeof r.then === 'function') await r.catch(() => undefined)
    } catch {
      return false
    }
    return ready
  }
  if (await attempt({ unadjustedMovement: true })) return 'raw'
  if (await attempt()) return 'adjusted'
  return null
}

export interface CalibrationResult {
  widthCm: number
  heightCm: number
  raw: boolean
  cols: number
  rows: number
  heat: number[]
}

/** Overlay that measures the real usable size of the mousepad from raw mouse counts. */
export function Calibrator({ dpi, onClose, onSave }: { dpi: number; onClose: () => void; onSave: (r: CalibrationResult) => void }) {
  const t = useT()
  const supported = typeof Element !== 'undefined' && 'requestPointerLock' in Element.prototype
  const [step, setStep] = useState<Step>('intro')
  const [recording, setRecording] = useState(false)
  const [live, setLive] = useState({ x: 0, y: 0 })
  const [issue, setIssue] = useState<'lock' | { short: number } | null>(null)
  const [raw, setRaw] = useState<boolean | null>(null)
  const [widthText, setWidthText] = useState('')
  const [heightText, setHeightText] = useState('')
  const [measured, setMeasured] = useState<{ w: number; h: number } | null>(null)

  const stage = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const h = useRef(new SweepTracker())
  const v = useRef(new SweepTracker())
  const active = useRef<SweepTracker | null>(null)
  const recordingRef = useRef(false)
  const stepRef = useRef<Step>('intro')
  const rawRef = useRef<boolean | null>(null)
  const dirty = useRef(false)
  stepRef.current = step

  // live numbers and the heat trace, at most once per frame
  useEffect(() => {
    let raf = 0
    const tick = () => {
      if (dirty.current && active.current) {
        dirty.current = false
        setLive({ x: active.current.extentX, y: active.current.extentY })
        if (canvas.current) {
          // live view: centred on the path, one cell is the same distance on both axes so the shape is true
          const cell = Math.max(active.current.extentX / (COLS - 2), active.current.extentY / (ROWS - 2), 1)
          drawHeat(canvas.current, normalizeHeat(traceHeat(active.current.path, { cols: COLS, rows: ROWS, cellX: cell, cellY: cell, anchorX: 'mid', anchorY: 'mid' })), COLS, ROWS)
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const finishSweep = useCallback(() => {
    if (!recordingRef.current) return
    recordingRef.current = false
    setRecording(false)
    if (document.pointerLockElement) document.exitPointerLock()
    const tracker = active.current
    if (!tracker) return
    const current = stepRef.current
    const cm = countsToCm(current === 'h' ? tracker.extentX : tracker.extentY, dpi)
    if (!(cm >= MIN_SWEEP_CM)) {
      setIssue({ short: Number.isFinite(cm) ? cm : 0 })
      return
    }
    setIssue(null)
    if (current === 'h') {
      setStep('v')
      return
    }
    const w = countsToCm(h.current.extentX, dpi)
    const d = countsToCm(v.current.extentY, dpi)
    setMeasured({ w, h: d })
    setWidthText(String(Math.round(w * 10) / 10))
    setHeightText(String(Math.round(d * 10) / 10))
    setRaw(rawRef.current === true)
    setStep('result')
  }, [dpi])

  // movement, stop (click / Space / Enter), lost lock, Escape
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!recordingRef.current || document.pointerLockElement !== stage.current) return
      active.current?.add(e.movementX, e.movementY)
      dirty.current = true
    }
    const onKey = (e: KeyboardEvent) => {
      if (recordingRef.current && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault()
        finishSweep()
      } else if (e.key === 'Escape' && !recordingRef.current) onClose()
    }
    const onLockChange = () => {
      if (recordingRef.current && document.pointerLockElement !== stage.current) finishSweep()
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerlockchange', onLockChange)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerlockchange', onLockChange)
      recordingRef.current = false
      if (document.pointerLockElement) document.exitPointerLock()
    }
  }, [finishSweep, onClose])

  const start = async () => {
    const el = stage.current
    if (!el) return
    const tracker = step === 'h' ? h.current : v.current
    tracker.reset()
    active.current = tracker
    setLive({ x: 0, y: 0 })
    if (canvas.current) drawHeat(canvas.current, [], COLS, ROWS)
    const mode = await lockPointer(el)
    if (!mode) {
      setIssue('lock')
      return
    }
    rawRef.current = mode === 'raw' && rawRef.current !== false
    setIssue(null)
    recordingRef.current = true
    setRecording(true)
  }

  const restart = () => {
    h.current.reset()
    v.current.reset()
    rawRef.current = null
    setIssue(null)
    setMeasured(null)
    setStep('h')
  }

  const save = () => {
    const w = parseNumber(widthText)
    const d = parseNumber(heightText)
    if (!(w >= 5 && w <= 300 && d >= 5 && d <= 200)) return
    // the saved map is pad-shaped: the left-right sweep runs along the middle, the front-back sweep down the middle
    const cellX = cmToCounts(w, dpi) / COLS
    const cellY = cmToCounts(d, dpi) / ROWS
    const cells = traceHeat(h.current.path, { cols: COLS, rows: ROWS, cellX, cellY, anchorX: 'min', anchorY: 'mid' })
    traceHeat(v.current.path, { cols: COLS, rows: ROWS, cellX, cellY, anchorX: 'mid', anchorY: 'min' }, cells)
    onSave({ widthCm: Math.round(w * 10) / 10, heightCm: Math.round(d * 10) / 10, raw: raw === true, cols: COLS, rows: ROWS, heat: normalizeHeat(cells) })
  }
  const validManual = (() => {
    const w = parseNumber(widthText)
    const d = parseNumber(heightText)
    return w >= 5 && w <= 300 && d >= 5 && d <= 200
  })()
  const stepNo = step === 'h' ? 1 : step === 'v' ? 2 : 3
  const cmNow = countsToCm(step === 'h' ? live.x : live.y, dpi)
  const countsNow = Math.round(step === 'h' ? live.x : live.y)

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-labelledby="cal-title">
      <div ref={stage} onMouseDown={(e) => e.button === 0 && recordingRef.current && finishSweep()} className="hud relative flex max-h-full w-full max-w-3xl flex-col overflow-y-auto p-5 sm:p-7">
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.2em] text-accent uppercase">{t('pad.cal.step', { n: stepNo, total: 3 })}</p>
            <h2 id="cal-title" className="display mt-1 text-xl">{t('pad.cal.title')}</h2>
          </div>
          <Button variant="ghost" size="icon-sm" aria-label={t('pad.cal.close')} onClick={onClose} disabled={recording}>
            <X />
          </Button>
        </div>

        <div className="relative z-10 mt-5 space-y-4">
          {step === 'intro' && (
            <>
              <p className="text-sm leading-relaxed text-muted">{t('pad.cal.intro.body', { dpi })}</p>
              <p className="text-xs leading-relaxed text-subtle">{t('pad.cal.intro.tip')}</p>
              {!supported && <p className="rounded-xl border border-danger/30 bg-danger-soft px-3 py-2.5 text-xs text-danger">{t('pad.cal.unsupported')}</p>}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button variant="primary" disabled={!supported} onClick={() => setStep('h')}>
                  {t('pad.cal.next')}
                </Button>
                <Button variant="outline" onClick={() => { setMeasured(null); setWidthText(''); setHeightText(''); setRaw(false); setStep('result') }}>
                  {t('pad.cal.manual')}
                </Button>
              </div>
            </>
          )}

          {(step === 'h' || step === 'v') && (
            <>
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">{step === 'h' ? <MoveHorizontal /> : <MoveVertical />}</span>
                <div>
                  <h3 className="text-base font-semibold">{step === 'h' ? t('pad.cal.h.title') : t('pad.cal.v.title')}</h3>
                  <p className="text-xs text-muted">{step === 'h' ? t('pad.cal.h.body') : t('pad.cal.v.body')}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                <div className="rounded-2xl border border-border bg-bg/60 p-4">
                  <div className="text-[11px] text-subtle">{t('pad.cal.live')}</div>
                  <div className="num display mt-1 text-4xl" dir="ltr">
                    {Number.isFinite(cmNow) ? cmNow.toFixed(1) : '0.0'}
                    <span className="ms-1 text-base text-muted">cm</span>
                  </div>
                  <div className="num mt-1 text-xs text-subtle" dir="ltr">{t('pad.cal.counts', { n: countsNow.toLocaleString('en-US') })} · {dpi} DPI</div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
                    <div className={cn('h-full rounded-full bg-accent-fill transition-[width] duration-100', recording && 'shadow-[0_0_12px_var(--c-accent-glow)]')} style={{ width: `${Math.min(100, (cmNow / 60) * 100) || 0}%` }} />
                  </div>
                </div>
                <div className="relative overflow-hidden rounded-2xl border border-border bg-bg/60" aria-hidden="true">
                  <canvas ref={canvas} width={COLS * 16} height={ROWS * 16} className="aspect-[3/2] w-full" />
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(var(--c-border)_1px,transparent_1px),linear-gradient(90deg,var(--c-border)_1px,transparent_1px)] bg-[size:12.5%_16.66%] opacity-40" />
                </div>
              </div>

              {typeof issue === 'object' && issue && <p role="alert" className="rounded-xl border border-warning/30 bg-warning/10 px-3 py-2.5 text-xs text-warning">{t('pad.cal.tooShort', { cm: issue.short.toFixed(1) })}</p>}
              {issue === 'lock' && <p role="alert" className="rounded-xl border border-danger/30 bg-danger-soft px-3 py-2.5 text-xs text-danger">{t('pad.cal.lockFailed')}</p>}

              <div className="flex flex-wrap items-center gap-2">
                {recording ? (
                  <p className="flex items-center gap-2 rounded-xl bg-accent-soft px-3 py-2 text-sm font-medium text-accent" role="status">
                    <span className="relative flex size-2.5" aria-hidden="true"><span className="absolute inline-flex size-full rounded-full bg-accent-fill opacity-70 motion-safe:animate-ping" /><span className="relative inline-flex size-2.5 rounded-full bg-accent-fill" /></span>
                    {t('pad.cal.recording')} {t('pad.cal.stop')}
                  </p>
                ) : (
                  <Button variant="primary" size="lg" onClick={() => void start()}>
                    {issue ? t('pad.cal.retry') : t('pad.cal.start')}
                  </Button>
                )}
              </div>
            </>
          )}

          {step === 'result' && (
            <>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold">{t('pad.cal.result.title')}</h3>
                <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase', raw ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning')}>
                  {measured ? (raw ? t('pad.measured.raw') : t('pad.measured.approx')) : t('pad.cal.byHand')}
                </span>
              </div>
              {measured && !raw && (
                <p className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2.5 text-xs text-warning">
                  <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                  {t('pad.cal.notRaw')}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <NumberField label={`${t('pad.cal.width')} (cm)`} value={widthText} onValueChange={setWidthText} suffix="cm" />
                <NumberField label={`${t('pad.cal.height')} (cm)`} value={heightText} onValueChange={setHeightText} suffix="cm" />
              </div>
              <p className="text-xs text-subtle">{t('pad.cal.check')}</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="primary" disabled={!validManual} onClick={save}>
                  <Check /> {t('pad.cal.save')}
                </Button>
                {supported && (
                  <Button variant="outline" onClick={restart}>
                    <RotateCcw /> {t('pad.cal.again')}
                  </Button>
                )}
                <Button variant="ghost" onClick={onClose}>
                  {t('pad.cal.cancel')}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
