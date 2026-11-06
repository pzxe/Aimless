import {
  ArrowLeftRight,
  ArrowRight,
  BarChart3,
  Crosshair,
  Download,
  Gauge,
  Globe,
  Monitor,
  Package,
  RectangleHorizontal,
  ShieldCheck,
  Trophy,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { HeroConverter, type DemoState } from '@/components/landing/HeroConverter'
import { GitHubLink, GitHubMark } from '@/components/layout/GitHubLink'
import { LanguageMenu } from '@/components/layout/LanguageMenu'
import { LogoMark, Wordmark } from '@/components/layout/Logo'
import { ThemeToggle } from '@/components/layout/AppShell'
import { AdsTool } from '@/components/tools/AdsTool'
import { AimStyleMeter } from '@/components/tools/AimStyleMeter'
import { MousepadVisualizer, PadPicker } from '@/components/tools/MousepadVisualizer'
import { PollingTool } from '@/components/tools/PollingTool'
import { Card } from '@/components/ui/Card'
import { Segmented } from '@/components/ui/Segmented'
import { convertSensitivity, describeSetting, getAllGames, parseNumber } from '@/core/sensitivity'
import { useCountUp } from '@/hooks/useCountUp'
import { useFormat } from '@/hooks/useFormat'
import { useReveal } from '@/hooks/useReveal'
import { useT } from '@/i18n'
import { useConverter } from '@/store/converterStore'
import { useSettings } from '@/store/settingsStore'
import { LANGUAGES } from '@/store/types'
import { cn } from '@/utils/cn'
import { isDesktopApp, RELEASES_URL, REPO_URL } from '@/utils/platform'

const GAMES = getAllGames()
const VERIFIED = GAMES.filter((g) => g.accuracy === 'verified').length

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: document.documentElement.dataset.motionPref === 'full' ? 'smooth' : 'auto', block: 'start' })
}

function Counter({ value, decimals = 0, suffix = '' }: { value: number; decimals?: number; suffix?: string }) {
  const { ref, value: v } = useCountUp(value)
  return (
    <span ref={ref as React.RefObject<HTMLSpanElement>} className="ltr num">
      {v.toFixed(decimals)}
      {suffix}
    </span>
  )
}

function Section({ id, eyebrow, title, lead, children, className }: { id: string; eyebrow: string; title: ReactNode; lead?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={cn('flex scroll-mt-16 flex-col justify-center py-16 lg:min-h-[100svh] lg:py-10', className)}>
      <div className="wrap">
      <div data-reveal className="mx-auto mb-6 max-w-2xl text-center">
        <div className="eyebrow mb-3">{eyebrow}</div>
        <h2 className="display text-4xl sm:text-5xl">{title}</h2>
        {lead && <p className="mt-4 text-base text-muted">{lead}</p>}
      </div>
      {children}
      </div>
    </section>
  )
}

/** Original background art: crosshair rings and a glow disc (no third-party imagery). */
const RINGS =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 600'%3E%3Cg fill='none' stroke='%23888' stroke-opacity='.28'%3E%3Ccircle cx='300' cy='300' r='290'/%3E%3Ccircle cx='300' cy='300' r='220' stroke-dasharray='2 10'/%3E%3Ccircle cx='300' cy='300' r='150'/%3E%3Cpath d='M300 10v110M300 480v110M10 300h110M480 300h110' stroke-width='1.5'/%3E%3C/g%3E%3C/svg%3E\")"

/** The hero's single background layer: accent glow and crosshair rings (original art). */
function HeroArt() {
  return (
    <div
      className="pointer-events-none absolute inset-0 -z-10"
      aria-hidden="true"
      style={{
        backgroundImage: `${RINGS}, radial-gradient(circle at center, var(--c-accent-glow), transparent 62%)`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'min(80vw, 720px), min(80vw, 720px)',
        backgroundPosition: 'right -6vw top 6%, right -6vw top 6%',
      }}
    />
  )
}

function LandingNav({ resolvedTheme }: { resolvedTheme: 'dark' | 'light' }) {
  const t = useT()
  const navigate = useNavigate()
  const links = [
    { id: 'why', label: t('landing.nav.why') },
    { id: 'features', label: t('landing.nav.features') },
    { id: 'playground', label: t('landing.nav.playground') },
    ...(isDesktopApp ? [] : [{ id: 'download', label: t('landing.nav.download') }]),
  ]
  return (
    <header className="nav glass fixed inset-x-0 top-0 z-40 border-b border-border/60">
      <div className="wrap flex h-16 items-center justify-between gap-4">
        <Link to="/welcome" className="flex items-center gap-2.5" aria-label="Aimless">
          <LogoMark />
          <Wordmark />
        </Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label={t('nav.menu')}>
          {links.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => scrollToId(l.id)}
              className="relative rounded-lg px-3 py-2 text-sm whitespace-nowrap text-muted transition-colors after:absolute after:inset-x-3 after:bottom-1 after:h-px after:origin-left after:scale-x-0 after:bg-accent after:transition-transform hover:text-text hover:after:scale-x-100"
            >
              {l.label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-1.5">
          <GitHubLink className="hidden sm:inline-flex" />
          <LanguageMenu />
          <ThemeToggle resolvedTheme={resolvedTheme} />
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="glow ms-1 inline-flex h-9 items-center gap-1.5 rounded-xl bg-accent-fill px-3.5 text-sm font-semibold text-accent-fg transition-[background-color,transform] hover:bg-accent-fill-hover active:scale-[0.97]"
          >
            <span className="hidden sm:inline">{t('landing.launch')}</span>
            <span className="sm:hidden">{t('landing.launchShort')}</span>
            <ArrowRight className="size-4 rtl:rotate-180" />
          </button>
        </div>
      </div>
    </header>
  )
}

function CtaLink({ href, onClick, icon, children, primary }: { href?: string; onClick?: () => void; icon: ReactNode; children: ReactNode; primary?: boolean }) {
  const cls = cn(
    'inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition-[background-color,border-color,transform] duration-150 hover:-translate-y-px active:translate-y-0 active:scale-[0.97] [&_svg]:size-4',
    primary ? 'bg-accent-fill text-accent-fg glow hover:bg-accent-fill-hover' : 'border border-border bg-surface-2/80 text-text hover:bg-surface-3',
  )
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" className={cls}>
      {icon}
      {children}
    </a>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {icon}
      {children}
    </button>
  )
}

function Hero({ demo, setDemo }: { demo: DemoState; setDemo: (d: DemoState) => void }) {
  const t = useT()
  const navigate = useNavigate()
  return (
    <section className="relative isolate flex flex-col pt-16 lg:min-h-[100svh]">
      <HeroArt />
      <div className="wrap flex flex-1 flex-col">
      <div className="grid flex-1 grid-cols-1 content-center items-stretch gap-12 py-14 lg:grid-cols-[1.1fr_1fr] lg:py-8">
        <div>
          <div data-reveal style={{ ['--i' as string]: 0 }} className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent-line bg-accent-soft py-1 ps-1 pe-3 text-xs font-medium">
            <span className="rounded-full bg-accent-fill px-2 py-0.5 text-[10px] font-bold tracking-wider text-accent-fg uppercase">v2.0</span>
            {t('landing.badge')}
          </div>
          <h1 data-reveal style={{ ['--i' as string]: 1 }} className="display text-[clamp(3rem,8vw,6.5rem)]">
            {t('landing.hero.line1')}
            <br />
            <span className="text-accent [text-shadow:0_0_40px_var(--c-accent-glow)]">{t('landing.hero.line2')}</span>
          </h1>
          <p data-reveal style={{ ['--i' as string]: 2 }} className="mt-6 max-w-xl text-lg text-muted">
            {t('landing.hero.sub', { games: GAMES.length })}
          </p>
          <div data-reveal style={{ ['--i' as string]: 3 }} className="mt-8 flex flex-wrap gap-3">
            <CtaLink primary icon={<Crosshair />} onClick={() => navigate('/dashboard')}>
              {t('landing.cta.try')}
            </CtaLink>
            {!isDesktopApp && (
              <CtaLink href={RELEASES_URL} icon={<Download />}>
                {t('landing.cta.exe')}
              </CtaLink>
            )}
          </div>
          <ul data-reveal style={{ ['--i' as string]: 4 }} className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs text-text/85">
            <li className="flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-success" />{t('landing.fact.local')}</li>
            <li className="flex items-center gap-1.5"><Globe className="size-3.5 text-accent" />{t('landing.fact.languages')}</li>
            <li className="flex items-center gap-1.5"><Monitor className="size-3.5 text-accent" />{t('landing.fact.platforms')}</li>
          </ul>
        </div>
        <div data-reveal style={{ ['--i' as string]: 3 }}>
          <HeroConverter demo={demo} setDemo={setDemo} />
        </div>
      </div>
      <Stats />
      </div>
    </section>
  )
}

function Stats() {
  const t = useT()
  const items = [
    { value: GAMES.length, label: t('landing.stat.games') },
    { value: VERIFIED, label: t('landing.stat.verified') },
    { value: LANGUAGES.length, label: t('landing.stat.languages') },
    { value: 0, label: t('landing.stat.requests') },
  ]
  return (
    <div className="pb-8">
      <div className="grid grid-cols-2 divide-border sm:grid-cols-4 sm:divide-x rtl:sm:divide-x-reverse">
        {items.map((s, i) => (
          <div key={s.label} data-reveal style={{ ['--i' as string]: i }} className="px-6 py-5 text-center">
            <div className="display text-4xl">
              <Counter value={s.value} />
            </div>
            <div className="mt-2 text-xs tracking-wide text-muted uppercase">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Bar({ label, cm, tone, max }: { label: string; cm: number; tone: 'good' | 'bad' | 'base'; max: number }) {
  const f = useFormat()
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
        <span className="text-muted">{label}</span>
        <span className="ltr num font-semibold">
          {f.dist(cm)} <span className="text-xs font-normal text-subtle">{f.unit}</span>
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-surface-3">
        <div
          data-reveal
          className={cn(
            'h-full origin-left rounded-full rtl:origin-right',
            tone === 'bad' && 'bg-danger shadow-[0_0_14px_var(--c-danger)]',
            tone === 'good' && 'bg-accent-fill shadow-[0_0_14px_var(--c-accent-glow)]',
            tone === 'base' && 'bg-text/70',
          )}
          style={{ width: `${(cm / max) * 100}%` }}
        />
      </div>
    </div>
  )
}

function Why() {
  const t = useT()
  const f = useFormat()
  // Real numbers from the engine: the same eDPI in two games with different yaw.
  const cs = describeSetting('cs2', 800, 1)!
  const val = describeSetting('valorant', 800, 1)!
  const matched = convertSensitivity({ sourceGameId: 'cs2', sourceSensitivity: 1, sourceDpi: 800, targetGameId: 'valorant', targetDpi: 800 })
  const valMatched = matched.ok ? matched.target : null
  const max = cs.cm360
  return (
    <Section id="why" eyebrow={t('landing.why.eyebrow')} title={t('landing.why.title')} lead={t('landing.why.lead')}>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card data-reveal className="p-7">
          <div className="mb-1 text-xs font-semibold tracking-[0.16em] text-danger uppercase">{t('landing.why.guess')}</div>
          <h3 className="display text-2xl">{t('landing.why.guessTitle')}</h3>
          <p className="mt-2 text-sm text-muted">{t('landing.why.guessBody', { edpi: f.edpi(cs.edpi) })}</p>
          <div className="mt-6 space-y-4">
            <Bar label="Counter-Strike 2 · 1 @ 800" cm={cs.cm360} tone="base" max={max} />
            <Bar label="Valorant · 1 @ 800" cm={val.cm360} tone="bad" max={max} />
          </div>
          <p className="mt-5 text-sm">
            <span className="display text-3xl text-danger">
              <Counter value={cs.cm360 / val.cm360} decimals={2} suffix="×" />
            </span>{' '}
            <span className="text-muted">{t('landing.why.faster')}</span>
          </p>
        </Card>
        <Card data-reveal style={{ ['--i' as string]: 1 }} className="p-7">
          <div className="mb-1 text-xs font-semibold tracking-[0.16em] text-accent uppercase">{t('landing.why.true')}</div>
          <h3 className="display text-2xl">{t('landing.why.trueTitle')}</h3>
          <p className="mt-2 text-sm text-muted">{t('landing.why.trueBody')}</p>
          <div className="mt-6 space-y-4">
            <Bar label="Counter-Strike 2 · 1 @ 800" cm={cs.cm360} tone="base" max={max} />
            {valMatched && <Bar label={`Valorant · ${f.sens(valMatched.sensitivity)} @ 800`} cm={valMatched.cm360} tone="good" max={max} />}
          </div>
          <p className="mt-5 text-sm">
            <span className="display text-3xl text-accent">
              <Counter value={f.units === 'in' ? cs.cm360 / 2.54 : cs.cm360} decimals={2} />
            </span>{' '}
            <span className="text-muted">{t('landing.why.same', { unit: f.distLabel })}</span>
          </p>
        </Card>
      </div>
    </Section>
  )
}

function BentoCard({ to, icon, title, body, children, className, i }: { to: string; icon: ReactNode; title: string; body: string; children?: ReactNode; className?: string; i: number }) {
  return (
    <Link to={to} data-reveal style={{ ['--i' as string]: i }} className={cn('card lift group flex flex-col overflow-hidden p-5', className)}>
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent [&_svg]:size-5">{icon}</span>
        <h3 className="display text-2xl">{title}</h3>
        <ArrowRight className="ms-auto size-4 text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-accent rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
      </div>
      <p className="mt-3 text-sm text-muted">{body}</p>
      {children && <div className="mt-4 flex-1">{children}</div>}
    </Link>
  )
}

function MiniBracket() {
  const box = 'h-7 rounded-lg border border-border bg-surface-2'
  return (
    <div dir="ltr" className="grid grid-cols-3 items-center gap-4">
      <div className="space-y-2">{[0, 1, 2, 3].map((i) => <div key={i} className={box} />)}</div>
      <div className="space-y-10"><div className={cn(box, 'border-accent-line')} /><div className={box} /></div>
      <div className={cn(box, 'border-accent bg-accent-soft shadow-[0_0_20px_-6px_var(--c-accent-glow)]')} />
    </div>
  )
}

function Features() {
  const t = useT()
  const f = useFormat()
  const cs = describeSetting('cs2', 800, 1)!
  const conv = convertSensitivity({ sourceGameId: 'cs2', sourceSensitivity: 1, sourceDpi: 800, targetGameId: 'valorant', targetDpi: 800 })
  return (
    <Section id="features" eyebrow={t('landing.features.eyebrow')} title={t('landing.features.title')} lead={t('landing.features.lead')}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <BentoCard i={0} to="/converter" icon={<ArrowLeftRight />} title={t('landing.f.converter')} body={t('landing.f.converterBody', { games: GAMES.length })} className="xl:col-span-2">
          <div dir="ltr" className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border border-border bg-surface-2/60 p-4">
            <div><div className="text-[11px] text-subtle">CS2 · 800 DPI</div><div className="num text-3xl font-semibold">1.00</div></div>
            <ArrowRight className="size-5 text-accent" />
            <div><div className="text-[11px] text-subtle">Valorant · 800 DPI</div><div className="num text-3xl font-semibold text-accent">{conv.ok ? f.sens(conv.target.sensitivity) : '—'}</div></div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] text-subtle">
            <div className="rounded-xl bg-surface-2/60 p-2"><div className="ltr num text-sm font-semibold text-text">{f.dist(cs.cm360)}</div>{f.distLabel}</div>
            <div className="rounded-xl bg-surface-2/60 p-2"><div className="ltr num text-sm font-semibold text-text">{f.num(360 / cs.degreesPerCount, 0)}</div>{t('landing.f.counts')}</div>
            <div className="rounded-xl bg-surface-2/60 p-2"><div className="text-sm font-semibold text-success">✓</div>{t('accuracy.verified')}</div>
          </div>
        </BentoCard>
        <BentoCard i={1} to="/tournaments" icon={<Trophy />} title={t('landing.f.tournaments')} body={t('landing.f.tournamentsBody')}>
          <MiniBracket />
        </BentoCard>
        <BentoCard i={2} to="/mousepad" icon={<RectangleHorizontal />} title={t('landing.f.mousepad')} body={t('landing.f.mousepadBody')}>
          <div dir="ltr" className="relative h-14 rounded-xl border border-border bg-surface-2">
            <div className="absolute inset-y-4 left-2 w-[70%] rounded-full bg-accent-fill shadow-[0_0_16px_-2px_var(--c-accent)]" />
          </div>
        </BentoCard>
        <BentoCard i={3} to="/compare" icon={<BarChart3 />} title={t('landing.f.compare')} body={t('landing.f.compareBody')}>
          <div className="flex h-16 items-end gap-2">
            {[62, 88, 74, 100, 56].map((h, i) => (
              <div key={i} className={cn('flex-1 rounded-t-md', i === 3 ? 'bg-accent-fill shadow-[0_0_16px_var(--c-accent-glow)]' : 'bg-surface-3')} style={{ height: `${h}%` }} />
            ))}
          </div>
        </BentoCard>
        <BentoCard i={4} to="/settings" icon={<ShieldCheck />} title={t('landing.f.privacy')} body={t('landing.f.privacyBody')} />
        <BentoCard i={5} to="/settings" icon={<Globe />} title={t('landing.f.languages')} body={t('landing.f.languagesBody')} className="xl:col-span-2">
          <div className="flex flex-wrap gap-1.5">
            {LANGUAGES.map((l) => (
              <span key={l.code} lang={l.code} className="rounded-full border border-border px-2.5 py-1 text-xs text-muted">{l.native}</span>
            ))}
          </div>
        </BentoCard>
      </div>
    </Section>
  )
}

type PlayTab = 'pad' | 'ads' | 'polling'
function Playground({ demo }: { demo: DemoState }) {
  const t = useT()
  const navigate = useNavigate()
  const calibrations = useSettings((s) => s.calibrations)
  const [tab, setTab] = useState<PlayTab>('pad')
  const d = describeSetting(demo.source, parseNumber(demo.dpi), parseNumber(demo.sens), calibrations)
  return (
    <Section id="playground" eyebrow={t('landing.play.eyebrow')} title={t('landing.play.title')} lead={t('landing.play.lead')}>
      <div>
        <div data-reveal className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="scrollbar-thin max-w-full min-w-0 overflow-x-auto">
          <Segmented<PlayTab>
            label={t('landing.play.title')}
            value={tab}
            onChange={setTab}
            options={[
              { value: 'pad', label: t('landing.play.pad'), icon: <Gauge /> },
              { value: 'ads', label: t('ads.title'), icon: <Crosshair /> },
              { value: 'polling', label: t('polling.title'), icon: <BarChart3 /> },
            ]}
          />
          </div>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="group inline-flex items-center gap-1.5 text-sm font-semibold text-accent"
          >
            {t('landing.play.fullscreen')}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180" />
          </button>
        </div>
        <div data-reveal data-ui="aimless-tools">
          {tab === 'pad' && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.6fr]">
              <Card className="flex flex-col justify-center p-6">
                <AimStyleMeter cm360={d?.cm360 ?? null} />
              </Card>
              <Card className="space-y-5 p-6">
                <p className="text-sm text-muted">{t('landing.play.padLead')}</p>
                <PadPicker />
                <MousepadVisualizer cm360={d?.cm360 ?? null} />
              </Card>
            </div>
          )}
          {tab === 'ads' && <AdsTool />}
          {tab === 'polling' && <PollingTool />}
        </div>
      </div>
    </Section>
  )
}

/** The page's closing screen: the Windows download, then the footer line. */
function Closing() {
  const t = useT()
  return (
    <footer id="download" className="closing flex scroll-mt-16 flex-col lg:min-h-[100svh]">
      <div className="wrap flex flex-1 flex-col">
        <div className="flex flex-1 flex-col justify-center py-16">
          {!isDesktopApp && (
            <div data-reveal className="card relative overflow-hidden p-8 sm:p-12">
              <div className="pointer-events-none absolute -end-24 -top-24 size-80 rounded-full bg-accent/25 blur-3xl" aria-hidden="true" />
              <div className="relative grid grid-cols-1 items-start gap-8 lg:grid-cols-[1.4fr_1fr]">
                <div>
                  <div className="eyebrow mb-3">{t('landing.dl.eyebrow')}</div>
                  <h2 className="display text-4xl sm:text-5xl">{t('landing.dl.title')}</h2>
                  <p className="mt-4 max-w-xl text-muted">{t('landing.dl.body')}</p>
                  <p className="mt-3 max-w-xl text-xs text-muted">{t('landing.dl.unsigned')}</p>
                </div>
                <div className="flex flex-col gap-3">
                  <CtaLink href={RELEASES_URL} icon={<Download />}>{t('landing.cta.exe')}</CtaLink>
                  <CtaLink href={RELEASES_URL} icon={<Package />}>{t('landing.cta.zip')}</CtaLink>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-3 pt-6 pb-[4.5rem] text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <LogoMark className="size-5" />
            <span>{t('landing.footer.line')}</span>
          </div>
          <div className="flex items-center gap-4">
            <a href={REPO_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-text">
              <GitHubMark className="size-3.5" /> GitHub
            </a>
            <span>MIT</span>
            <span>{t('landing.footer.trademarks')}</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default function LandingPage({ resolvedTheme }: { resolvedTheme: 'dark' | 'light' }) {
  const ref = useReveal<HTMLDivElement>()
  const [demo, setDemo] = useState<DemoState>(() => {
    const c = useConverter.getState()
    return { source: c.sourceGameId, target: c.targetGameId, sens: c.sourceSensitivity || '1', dpi: c.sourceDpi || '800' }
  })
  return (
    <div ref={ref} className="min-h-dvh">
      <LandingNav resolvedTheme={resolvedTheme} />
      <main>
        <Hero demo={demo} setDemo={setDemo} />
        <Why />
        <Features />
        <Playground demo={demo} />
      </main>
      <Closing />
    </div>
  )
}
