import { Pause, Play } from 'lucide-react'
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { convertSensitivity, describeSetting, getGame } from '@/core/sensitivity'
import { pollStats, zoomSensitivityRatio } from '@/core/tools'
import { useFormat } from '@/hooks/useFormat'
import { useT } from '@/i18n'
import { cn } from '@/utils/cn'
import { GameArt } from '../games/GameArt'
import { AimStyleMeter } from '../tools/AimStyleMeter'

/**
 * The hero collage: three sets of real Aimless UI pieces, crossfading every 2.8 s
 * (0.7 s fade). Nothing moves inside a set. A pause disc stops the cycle; with reduced or
 * instant motion the first set simply stays.
 */
const CYCLE_MS = 2800

function Piece({ style, children, className }: { style: CSSProperties; children: ReactNode; className?: string }) {
  return (
    <div className={cn('card glass absolute overflow-hidden rounded-2xl p-4 shadow-pop', className)} style={style}>
      {children}
    </div>
  )
}

function Row({ label, value, strong }: { label: ReactNode; value: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 text-xs">
      <span className="truncate text-muted">{label}</span>
      <span className={cn('ltr mono shrink-0', strong ? 'font-semibold text-text' : 'text-muted')}>{value}</span>
    </div>
  )
}

export function HeroCollage() {
  const t = useT()
  const f = useFormat()
  const [set, setSet] = useState(0)
  const [paused, setPaused] = useState(false)
  const motion = typeof document !== 'undefined' ? document.documentElement.dataset.motionPref : 'full'
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  const cycling = motion === 'full' && !reduced && !paused

  useEffect(() => {
    if (!cycling) return
    const id = window.setInterval(() => setSet((s) => (s + 1) % 3), CYCLE_MS)
    return () => window.clearInterval(id)
  }, [cycling])

  // Real numbers from the engine.
  const conv = convertSensitivity({ sourceGameId: 'cs2', sourceSensitivity: 1, sourceDpi: 800, targetGameId: 'valorant', targetDpi: 800 })
  const cs = describeSetting('cs2', 800, 1)!
  const ow = convertSensitivity({ sourceGameId: 'valorant', sourceSensitivity: 0.4, sourceDpi: 800, targetGameId: 'overwatch2', targetDpi: 800 })
  const poll = [1000, 4000, 8000].map((hz) => pollStats(800, hz, 30)!)
  const ads = zoomSensitivityRatio(103, 40, 0)!

  const fade = (i: number) => cn('absolute inset-0 transition-opacity duration-700', set === i ? 'opacity-100' : 'pointer-events-none opacity-0')

  return (
    <div className="relative aspect-[628/716] w-full" role="img" aria-label={t('landing.collage.label')}>
      {/* Set 1: the converter */}
      <div className={fade(0)} aria-hidden="true">
        <Piece style={{ left: '4%', top: '6%', width: '62%' }}>
          <div className="eyebrow mb-3">{t('converter.title')}</div>
          <div className="flex items-center gap-3">
            <GameArt gameId="cs2" className="h-8 w-10" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs text-muted">{getGame('cs2')?.name}</div>
              <div className="ltr mono text-start text-lg font-semibold">1.00 · 800</div>
            </div>
          </div>
          <div className="my-3 h-px bg-border" />
          <div className="flex items-center gap-3">
            <GameArt gameId="valorant" className="h-8 w-10" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs text-muted">{getGame('valorant')?.name}</div>
              <div className="mono text-2xl font-semibold text-accent">{conv.ok ? f.sens(conv.target.sensitivity) : '—'}</div>
            </div>
          </div>
        </Piece>
        <Piece style={{ left: '52%', top: '44%', width: '44%' }} className="p-3">
          <AimStyleMeter cm360={cs.cm360} compact />
        </Piece>
        <Piece style={{ left: '8%', top: '62%', width: 'max(40%, 11.5rem)' }}>
          <Row label={f.distLabel} value={f.dist(cs.cm360)} strong />
          <Row label={t('common.edpi')} value={f.edpi(cs.edpi)} />
          <Row label={t('landing.f.counts')} value={f.num(360 / cs.degreesPerCount, 0)} />
          <div className="mt-2 inline-flex rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-medium text-success">{t('accuracy.verified')}</div>
        </Piece>
      </div>

      {/* Set 2: tournaments with a series breakdown */}
      <div className={fade(1)} aria-hidden="true">
        <Piece style={{ left: '4%', top: '6%', width: '52%' }}>
          <div className="eyebrow mb-2">{t('tournament.round.semifinal')}</div>
          {[
            ['Nightfall', 2, true],
            ['Red Pulse', 1, false],
          ].map(([n, s, w]) => (
            <div key={String(n)} className="flex items-center justify-between py-1.5 text-sm">
              <span className={w ? 'font-semibold' : 'text-muted'}>{n}</span>
              <span className={cn('mono rounded-md px-1.5 text-xs font-semibold', w ? 'bg-accent-fill text-accent-fg' : 'bg-surface-3 text-muted')}>{s}</span>
            </div>
          ))}
        </Piece>
        <Piece style={{ left: '40%', top: '34%', width: '56%' }}>
          <div className="mb-2 flex items-center justify-between">
            <span className="eyebrow">Bo3</span>
            <span className="mono text-lg font-semibold">2–1</span>
          </div>
          <Row label={`${t('tournament.gameN', { n: 1 })} · Ascent`} value="13–9" />
          <Row label={`${t('tournament.gameN', { n: 2 })} · Bind`} value="10–13" />
          <Row label={`${t('tournament.gameN', { n: 3 })} · Haven`} value="15–13 OT" strong />
        </Piece>
        <Piece style={{ left: '8%', top: '70%', width: '40%' }}>
          <div className="eyebrow mb-1">{t('tournament.teamSize')}</div>
          <div className="flex flex-wrap gap-1.5 text-xs">
            {['1v1', '2v2', '5v5'].map((m, i) => (
              <span key={m} className={cn('mono rounded-lg px-2 py-1', i === 2 ? 'bg-accent-soft text-text ring-1 ring-accent-line' : 'bg-surface-3 text-muted')}>
                {m}
              </span>
            ))}
          </div>
        </Piece>
      </div>

      {/* Set 3: aim tools */}
      <div className={fade(2)} aria-hidden="true">
        <Piece style={{ left: '4%', top: '8%', width: '70%' }}>
          <div className="eyebrow mb-3">{t('mousepad.visualizer')}</div>
          <div className="relative h-12 rounded-xl border border-border-strong bg-surface-2">
            <div className="absolute inset-y-3 left-2 rounded-full bg-accent-fill shadow-[0_0_16px_-2px_var(--c-accent)]" style={{ width: `${(cs.cm360 / 60) * 100}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-subtle">
            <span className="mono">0</span>
            <span className="mono">{f.dist(cs.cm360)} {f.unit}</span>
            <span className="mono">60</span>
          </div>
        </Piece>
        <Piece style={{ left: '46%', top: '44%', width: '50%' }}>
          <div className="eyebrow mb-1">{t('polling.title')}</div>
          {poll.map((p) => (
            <Row key={p.hz} label={`${p.hz} Hz`} value={f.num(p.countsPerPoll, 2)} strong={p.hz === 1000} />
          ))}
        </Piece>
        <Piece style={{ left: '8%', top: '64%', width: '34%' }}>
          <div className="eyebrow mb-1">{t('ads.title')}</div>
          <div className="mono text-2xl font-semibold">{f.num(ads, 3)}×</div>
          <div className="text-[11px] text-muted">{t('ads.focalLength')}</div>
          {ow.ok && <div className="mt-1 text-[11px] text-subtle">OW2 {f.sens(ow.target.sensitivity)}</div>}
        </Piece>
      </div>

      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        aria-label={paused ? t('landing.collage.play') : t('landing.collage.pause')}
        aria-pressed={paused}
        className="absolute end-[3%] bottom-[3%] z-10 flex size-9 items-center justify-center rounded-full border border-border-strong bg-surface text-muted shadow-pop transition-colors hover:text-text"
      >
        {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
      </button>
      <div className="absolute start-[4%] bottom-[3%] z-10 flex gap-1.5" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span key={i} className={cn('h-1 rounded-full transition-all duration-500', set === i ? 'w-6 bg-accent' : 'w-2 bg-border-strong')} />
        ))}
      </div>
    </div>
  )
}
