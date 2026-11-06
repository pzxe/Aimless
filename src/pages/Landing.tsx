import { ArrowLeftRight, ArrowRight, BarChart3, Crosshair, Download, Gauge, Globe, Package, RectangleHorizontal, ShieldCheck, Trophy } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GameArt } from '@/components/games/GameArt'
import { HeroCollage } from '@/components/landing/HeroCollage'
import { HeroConverter, type DemoState } from '@/components/landing/HeroConverter'
import { ThemeToggle } from '@/components/layout/AppShell'
import { GitHubLink, GitHubMark } from '@/components/layout/GitHubLink'
import { LanguageMenu } from '@/components/layout/LanguageMenu'
import { LogoMark, Wordmark } from '@/components/layout/Logo'
import { AdsTool } from '@/components/tools/AdsTool'
import { AimStyleMeter } from '@/components/tools/AimStyleMeter'
import { MousepadVisualizer, PadPicker } from '@/components/tools/MousepadVisualizer'
import { PollingTool } from '@/components/tools/PollingTool'
import { Card } from '@/components/ui/Card'
import { Segmented } from '@/components/ui/Segmented'
import { convertSensitivity, describeSetting, getAllGames, GENRES, parseNumber, type Genre } from '@/core/sensitivity'
import { useAutoHideHeader } from '@/hooks/useAutoHideHeader'
import { useCountUp } from '@/hooks/useCountUp'
import { useFormat } from '@/hooks/useFormat'
import { useT } from '@/i18n'
import { useConverter } from '@/store/converterStore'
import { useSettings } from '@/store/settingsStore'
import { LANGUAGES } from '@/store/types'
import { cn } from '@/utils/cn'
import { isDesktopApp, RELEASES_URL, REPO_URL } from '@/utils/platform'

const GAMES = getAllGames()
const COUNT = (acc: string) => GAMES.filter((g) => g.accuracy === acc).length

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: document.documentElement.dataset.motionPref === 'full' ? 'smooth' : 'auto', block: 'start' })
}

function Counter({ value, decimals = 0, suffix = '' }: { value: number; decimals?: number; suffix?: string }) {
  const { ref, value: v } = useCountUp(value)
  return (
    <span ref={ref as React.RefObject<HTMLSpanElement>} className="ltr mono">
      {v.toFixed(decimals)}
      {suffix}
    </span>
  )
}

/** One screen on desktop; its heading sits on the left line, the lead under it. */
function Section({ id, eyebrow, title, lead, children, aside }: { id: string; eyebrow: string; title: ReactNode; lead?: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <section id={id} className="flex scroll-mt-16 flex-col justify-center py-20 lg:min-h-[100svh] lg:py-14">
      <div className="wrap">
        <div className="mb-10 grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="eyebrow mb-4">{eyebrow}</div>
            <h2 className="display text-[2rem] sm:text-[2.5rem] lg:text-[2.75rem]">{title}</h2>
          </div>
          {(lead || aside) && (
            <div className="lg:col-span-5">
              {lead && <p className="text-base leading-relaxed text-muted">{lead}</p>}
              {aside}
            </div>
          )}
        </div>
        {children}
      </div>
    </section>
  )
}

function PrimaryButton({ children, onClick, href, large, secondary, icon }: { children: ReactNode; onClick?: () => void; href?: string; large?: boolean; secondary?: boolean; icon?: ReactNode }) {
  const cls = cn(
    'group inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-[background-color,border-color,transform] duration-150 hover:-translate-y-px active:translate-y-0 active:scale-[0.98] [&_svg]:size-4',
    large ? 'h-16 px-7 text-lg' : 'h-12 px-5 text-sm',
    secondary ? 'border border-border bg-surface-2/80 text-text hover:bg-surface-3' : 'glow bg-accent-fill text-accent-fg hover:bg-accent-fill-hover',
  )
  const content = (
    <>
      {icon}
      {children}
      {!icon && <ArrowRight className="transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />}
    </>
  )
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" className={cls}>
      {content}
    </a>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {content}
    </button>
  )
}

function LandingNav({ resolvedTheme }: { resolvedTheme: 'dark' | 'light' }) {
  const t = useT()
  const navigate = useNavigate()
  const { hidden, atTop } = useAutoHideHeader()
  const links = [
    { id: 'why', label: t('landing.nav.why') },
    { id: 'games', label: t('landing.nav.games') },
    { id: 'features', label: t('landing.nav.features') },
    { id: 'playground', label: t('landing.nav.playground') },
    ...(isDesktopApp ? [] : [{ id: 'download', label: t('landing.nav.download') }]),
  ]
  return (
    <header
      className={cn(
        'nav fixed inset-x-0 top-0 z-40 border-b transition-[transform,background-color,border-color] duration-300 ease-out',
        hidden ? '-translate-y-full' : 'translate-y-0',
        atTop ? 'border-transparent bg-transparent' : 'border-border/40 bg-bg/40 backdrop-blur-md',
      )}
    >
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
            className="ms-1 inline-flex h-9 items-center gap-1.5 rounded-xl bg-accent-fill px-3.5 text-sm font-medium text-accent-fg transition-[background-color,transform] hover:bg-accent-fill-hover active:scale-[0.97]"
          >
            <span className="hidden sm:inline">{t('landing.launch')}</span>
            <span className="sm:hidden">{t('landing.launchShort')}</span>
          </button>
        </div>
      </div>
    </header>
  )
}

/** Hero (dealt: triptych). Headline left, a collage of real UI in the middle, one large button right. */
function Hero() {
  const t = useT()
  const navigate = useNavigate()
  return (
    <section className="relative isolate flex flex-col pt-16 lg:min-h-[100svh]">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden="true"
        style={{ backgroundImage: 'radial-gradient(70% 55% at 55% 30%, var(--c-accent-glow), transparent 70%)', opacity: 0.55 }}
      />
      <div className="wrap flex flex-1 items-center">
        <div className="grid w-full grid-cols-1 items-center gap-10 py-10 lg:grid-cols-12 lg:gap-6">
          <div className="lg:col-span-3">
            <div className="eyebrow mb-5">Aimless v2.1</div>
            <h1 className="display text-[2.5rem] sm:text-[3.25rem] lg:text-[3.5rem]">{t('landing.hero.title')}</h1>
            <p className="mt-5 text-base leading-6 text-muted">{t('landing.hero.lead', { games: GAMES.length })}</p>
          </div>
          <div className="lg:col-span-6">
            <HeroCollage />
          </div>
          <div className="flex flex-col gap-3 lg:col-span-3 lg:items-end">
            <PrimaryButton large onClick={() => navigate('/dashboard')}>
              {t('landing.cta.try')}
            </PrimaryButton>
            <p className="text-xs text-muted lg:text-end">{t('landing.hero.under')}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function Bar({ label, cm, tone, max }: { label: string; cm: number; tone: 'good' | 'bad' | 'base'; max: number }) {
  const f = useFormat()
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
        <span className="text-muted">{label}</span>
        <span className="ltr mono font-medium">
          {f.dist(cm)} <span className="text-xs text-subtle">{f.unit}</span>
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-surface-3">
        <div
          className={cn(
            'h-full rounded-full',
            tone === 'bad' && 'bg-danger',
            tone === 'good' && 'bg-accent-fill shadow-[0_0_14px_var(--c-accent-glow)]',
            tone === 'base' && 'bg-text/70',
          )}
          style={{ width: `${(cm / max) * 100}%` }}
        />
      </div>
    </div>
  )
}

/** "Same feeling, different number": the live converter beside the proof. */
function Why({ demo, setDemo }: { demo: DemoState; setDemo: (d: DemoState) => void }) {
  const t = useT()
  const f = useFormat()
  const cs = describeSetting('cs2', 800, 1)!
  const val = describeSetting('valorant', 800, 1)!
  const matched = convertSensitivity({ sourceGameId: 'cs2', sourceSensitivity: 1, sourceDpi: 800, targetGameId: 'valorant', targetDpi: 800 })
  const max = cs.cm360
  return (
    <Section id="why" eyebrow={t('landing.why.eyebrow')} title={t('landing.why.title')} lead={t('landing.why.lead')}>
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <HeroConverter demo={demo} setDemo={setDemo} />
        </div>
        <div className="grid gap-5 lg:col-span-6">
          <Card className="p-6">
            <div className="eyebrow mb-2 !text-danger">{t('landing.why.guess')}</div>
            <h3 className="text-lg font-medium">{t('landing.why.guessTitle')}</h3>
            <p className="mt-1 text-sm text-muted">{t('landing.why.guessBody', { edpi: f.edpi(cs.edpi) })}</p>
            <div className="mt-5 space-y-3">
              <Bar label="Counter-Strike 2 · 1 @ 800" cm={cs.cm360} tone="base" max={max} />
              <Bar label="Valorant · 1 @ 800" cm={val.cm360} tone="bad" max={max} />
            </div>
            <p className="mt-4 text-sm">
              <span className="mono text-2xl font-semibold text-danger">
                <Counter value={cs.cm360 / val.cm360} decimals={2} suffix="×" />
              </span>{' '}
              <span className="text-muted">{t('landing.why.faster')}</span>
            </p>
          </Card>
          <Card className="p-6">
            <div className="eyebrow mb-2">{t('landing.why.true')}</div>
            <h3 className="text-lg font-medium">{t('landing.why.trueTitle')}</h3>
            <p className="mt-1 text-sm text-muted">{t('landing.why.trueBody')}</p>
            <div className="mt-5 space-y-3">
              <Bar label="Counter-Strike 2 · 1 @ 800" cm={cs.cm360} tone="base" max={max} />
              {matched.ok && <Bar label={`Valorant · ${f.sens(matched.target.sensitivity)} @ 800`} cm={matched.target.cm360} tone="good" max={max} />}
            </div>
          </Card>
        </div>
      </div>
    </Section>
  )
}

/** Every game as an original emblem, filterable by genre, with the honest accuracy split. */
function Games() {
  const t = useT()
  const navigate = useNavigate()
  const [genre, setGenre] = useState<Genre | 'all'>('all')
  const shown = useMemo(() => (genre === 'all' ? GAMES : GAMES.filter((g) => g.genre === genre)), [genre])
  const stats = [
    { v: GAMES.length, l: t('landing.stat.games') },
    { v: COUNT('verified'), l: t('accuracy.verified') },
    { v: COUNT('approximate'), l: t('accuracy.approximate') },
    { v: COUNT('unsupported'), l: t('landing.stat.calibratable') },
  ]
  return (
    <Section
      id="games"
      eyebrow={t('landing.games.eyebrow')}
      title={t('landing.games.title', { n: GAMES.length })}
      lead={t('landing.games.lead')}
      aside={
        <dl className="mt-6 grid grid-cols-4 gap-3">
          {stats.map((s) => (
            <div key={s.l}>
              <dd className="mono text-2xl font-semibold">
                <Counter value={s.v} />
              </dd>
              <dt className="mt-1 text-[11px] leading-tight text-muted">{s.l}</dt>
            </div>
          ))}
        </dl>
      }
    >
      <div className="scrollbar-thin mb-5 max-w-full overflow-x-auto">
        <Segmented<Genre | 'all'>
          label={t('landing.games.filter')}
          value={genre}
          onChange={setGenre}
          options={[{ value: 'all', label: t('games.filter.all') }, ...GENRES.map((g) => ({ value: g, label: t(`genre.${g}`) }))]}
        />
      </div>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(4.25rem,1fr))] gap-2">
        {shown.map((g) => (
          <li key={g.id}>
            <button
              type="button"
              onClick={() => {
                useConverter.getState().setField('targetGameId', g.id)
                navigate('/converter')
              }}
              title={`${g.name} · ${t(`accuracy.${g.accuracy}`)}`}
              aria-label={`${g.name}: ${t(`accuracy.${g.accuracy}`)}`}
              className="group relative block w-full rounded-xl transition-transform duration-150 hover:-translate-y-0.5 focus-visible:-translate-y-0.5"
            >
              <GameArt gameId={g.id} className="h-auto w-full" />
              <span
                className={cn(
                  'absolute top-1 end-1 size-1.5 rounded-full',
                  g.accuracy === 'verified' ? 'bg-success' : g.accuracy === 'approximate' ? 'bg-warning' : 'bg-subtle',
                )}
              />
              <span className="mono mt-1 block truncate text-center text-[10px] text-muted group-hover:text-text">{g.short}</span>
            </button>
          </li>
        ))}
      </ul>
    </Section>
  )
}

function BentoCard({ to, icon, title, body, children, className }: { to: string; icon: ReactNode; title: string; body: string; children?: ReactNode; className?: string }) {
  return (
    <Link to={to} className={cn('card lift group flex flex-col overflow-hidden p-5', className)}>
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent [&_svg]:size-5">{icon}</span>
        <h3 className="text-lg font-medium">{title}</h3>
        <ArrowRight className="ms-auto size-4 text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-accent rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
      </div>
      <p className="mt-3 text-sm text-muted">{body}</p>
      {children && <div className="mt-4 flex-1">{children}</div>}
    </Link>
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
        <BentoCard to="/converter" icon={<ArrowLeftRight />} title={t('landing.f.converter')} body={t('landing.f.converterBody', { games: GAMES.length })} className="xl:col-span-2">
          <div dir="ltr" className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border border-border bg-surface-2/60 p-4">
            <div>
              <div className="text-[11px] text-subtle">CS2 · 800 DPI</div>
              <div className="mono text-3xl font-semibold">1.00</div>
            </div>
            <ArrowRight className="size-5 text-accent" />
            <div>
              <div className="text-[11px] text-subtle">Valorant · 800 DPI</div>
              <div className="mono text-3xl font-semibold text-accent">{conv.ok ? f.sens(conv.target.sensitivity) : '—'}</div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-center text-[11px] text-subtle">
            <div className="rounded-xl bg-surface-2/60 p-2">
              <div className="ltr mono text-sm font-semibold text-text">{f.dist(cs.cm360)}</div>
              {f.distLabel}
            </div>
            <div className="rounded-xl bg-surface-2/60 p-2">
              <div className="ltr mono text-sm font-semibold text-text">{f.num(360 / cs.degreesPerCount, 0)}</div>
              {t('landing.f.counts')}
            </div>
          </div>
        </BentoCard>
        <BentoCard to="/tournaments" icon={<Trophy />} title={t('landing.f.tournaments')} body={t('landing.f.tournamentsBody')} />
        <BentoCard to="/mousepad" icon={<RectangleHorizontal />} title={t('landing.f.mousepad')} body={t('landing.f.mousepadBody')}>
          <div dir="ltr" className="relative h-12 rounded-xl border border-border bg-surface-2">
            <div className="absolute inset-y-3.5 left-2 w-[70%] rounded-full bg-accent-fill shadow-[0_0_16px_-2px_var(--c-accent)]" />
          </div>
        </BentoCard>
        <BentoCard to="/compare" icon={<BarChart3 />} title={t('landing.f.compare')} body={t('landing.f.compareBody')} />
        <BentoCard to="/settings" icon={<ShieldCheck />} title={t('landing.f.privacy')} body={t('landing.f.privacyBody')} />
        <BentoCard to="/settings" icon={<Globe />} title={t('landing.f.languages')} body={t('landing.f.languagesBody')} className="xl:col-span-2">
          <div className="flex flex-wrap gap-1.5">
            {LANGUAGES.map((l) => (
              <span key={l.code} lang={l.code} className="rounded-full border border-border px-2.5 py-1 text-xs text-muted">
                {l.native}
              </span>
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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
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
        <button type="button" onClick={() => navigate('/dashboard')} className="group inline-flex items-center gap-1.5 text-sm font-medium text-accent">
          {t('landing.play.fullscreen')}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180" />
        </button>
      </div>
      <div data-ui="aimless-tools">
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
    </Section>
  )
}

/** The page's closing screen: the Windows download and the footer line. */
function Closing() {
  const t = useT()
  return (
    <footer id="download" className="closing flex scroll-mt-16 flex-col lg:min-h-[100svh]">
      <div className="wrap flex flex-1 flex-col">
        <div className="flex flex-1 flex-col justify-center py-16">
          {!isDesktopApp && (
            <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <div className="eyebrow mb-4">{t('landing.dl.eyebrow')}</div>
                <h2 className="display text-[2rem] sm:text-[2.5rem] lg:text-[2.75rem]">{t('landing.dl.title')}</h2>
                <p className="mt-5 max-w-xl text-muted">{t('landing.dl.body')}</p>
                <p className="mt-3 max-w-xl text-xs text-muted">{t('landing.dl.unsigned')}</p>
              </div>
              <div className="flex flex-col gap-3 lg:col-span-5 lg:pt-10">
                <PrimaryButton href={RELEASES_URL} icon={<Download />}>
                  {t('landing.cta.exe')}
                </PrimaryButton>
                <PrimaryButton href={RELEASES_URL} icon={<Package />} secondary>
                  {t('landing.cta.zip')}
                </PrimaryButton>
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
  const [demo, setDemo] = useState<DemoState>(() => {
    const c = useConverter.getState()
    return { source: c.sourceGameId, target: c.targetGameId, sens: c.sourceSensitivity || '1', dpi: c.sourceDpi || '800' }
  })
  return (
    <div className="min-h-dvh">
      <LandingNav resolvedTheme={resolvedTheme} />
      <main>
        <Hero />
        <Why demo={demo} setDemo={setDemo} />
        <Games />
        <Features />
        <Playground demo={demo} />
      </main>
      <Closing />
    </div>
  )
}
