import { ArrowLeftRight, ArrowRight, Gamepad2, MousePointer2, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AccuracyBadge } from '@/components/games/AccuracyBadge'
import { gameName } from '@/components/games/GameBadge'
import { GameSelector } from '@/components/games/GameSelector'
import { FeedbackCard } from '@/components/dashboard/FeedbackCard'
import { NewsFeed } from '@/components/dashboard/NewsFeed'
import { PerspectiveTeaser } from '@/components/dashboard/PerspectiveTeaser'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { CopyButton } from '@/components/ui/CopyButton'
import { NumberField } from '@/components/ui/Field'
import { getAllGames, getSupportedGames } from '@/core/sensitivity'
import { useConversion } from '@/hooks/useConversion'
import { useFormat } from '@/hooks/useFormat'
import { useT } from '@/i18n'
import { useConverter } from '@/store/converterStore'
import { useProfiles } from '@/store/profilesStore'
import { useSettings } from '@/store/settingsStore'
import { isDesktopApp } from '@/utils/platform'

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs text-muted [&_svg]:size-3.5">
        {icon}
        {label}
      </div>
      <div className="mt-2 truncate text-xl font-semibold tracking-tight">{value}</div>
      {sub && <div className="mt-0.5 truncate text-xs text-subtle">{sub}</div>}
    </Card>
  )
}

function QuickConvert() {
  const t = useT()
  const f = useFormat()
  const { form, result, isEmpty } = useConversion()
  const setField = useConverter((s) => s.setField)
  const swap = useConverter((s) => s.swap)
  const sensIssue = !result.ok ? result.issues.find((i) => i.field === 'sourceSensitivity') : undefined
  const dpiIssue = !result.ok ? result.issues.find((i) => i.field === 'sourceDpi') : undefined
  const text = result.ok ? f.sens(result.target.sensitivity) : ''

  return (
    <Card>
      <CardHeader
        title={t('dashboard.quickConvert')}
        icon={<ArrowLeftRight />}
        help={t('help.dashboard.quickConvert')}
        action={
          <Link to="/converter" className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">
            {t('dashboard.openConverter')}
            <ArrowRight className="size-3 rtl:rotate-180" />
          </Link>
        }
      />
      <CardBody className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
          <GameSelector value={form.sourceGameId} onChange={(id) => setField('sourceGameId', id)} label={t('converter.sourceGame')} />
          <Button variant="ghost" size="icon" onClick={swap} aria-label={t('converter.swap')} className="mx-auto">
            <ArrowLeftRight className="rotate-90 sm:rotate-0" />
          </Button>
          <GameSelector value={form.targetGameId} onChange={(id) => setField('targetGameId', id)} label={t('converter.targetGame')} />
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1.4fr]">
          <NumberField
            label={t('common.sensitivity')}
            value={form.sourceSensitivity}
            onValueChange={(v) => setField('sourceSensitivity', v)}
            placeholder="1.00"
            error={sensIssue && !(isEmpty && sensIssue.code === 'sens_required') ? t(`validation.${sensIssue.code}`) : null}
          />
          <NumberField
            label={t('common.dpi')}
            value={form.sourceDpi}
            onValueChange={(v) => setField('sourceDpi', v)}
            inputMode="numeric"
            error={dpiIssue ? t(`validation.${dpiIssue.code}`) : null}
          />
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-muted">
              <span>{t('converter.converted')}</span>
              {result.ok && <AccuracyBadge accuracy={result.accuracy} />}
            </div>
            <div className="flex h-10 items-center rounded-lg border border-accent/30 bg-accent-soft ps-3 pe-0.5">
              <span className="ltr num flex-1 truncate text-start text-lg font-semibold">{result.ok ? text : '—'}</span>
              {result.ok && (
                <span className="ltr num me-1 text-xs text-muted">{f.dist(result.target.cm360)} {f.unit}</span>
              )}
              <CopyButton text={text} label={t('converter.copySens')} variant="ghost" size="icon-sm" />
            </div>
          </div>
        </div>
        {!result.ok && result.unsupported.length > 0 && (
          <p className="text-xs text-danger">
            {t('converter.unsupportedTitle', { game: gameName(result.unsupported[0]!) })} ·{' '}
            <Link to="/converter" className="underline">
              {t('converter.calibrate', { game: gameName(result.unsupported[0]!) })}
            </Link>
          </p>
        )}
      </CardBody>
    </Card>
  )
}

export default function DashboardPage() {
  const t = useT()
  const profiles = useProfiles((s) => s.profiles)
  const calibrations = useSettings((s) => s.calibrations)
  const sourceDpi = useConverter((s) => s.sourceDpi)
  const supported = getSupportedGames(calibrations).length
  const total = getAllGames().length

  return (
    <div className="mx-auto max-w-5xl space-y-9">
      <div>
        <div className="eyebrow mb-2">{t('dashboard.eyebrow')}</div>
        {isDesktopApp ? (
          <h1 className="display text-3xl sm:text-4xl">{t('dashboard.welcome')}</h1>
        ) : (
          // The browser version has no "welcome back" greeting; the heading stays for screen readers and the outline.
          <h1 className="sr-only">{t('nav.dashboard')}</h1>
        )}
        <p className="mt-2 text-sm text-muted">{t('dashboard.subtitle')}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={<UserRound />} label={t('dashboard.stats.profiles')} value={<span className="num">{profiles.length}</span>} />
        <StatCard icon={<Gamepad2 />} label={t('dashboard.stats.games')} value={<span className="num">{t('dashboard.stats.gamesValue', { supported, total })}</span>} />
        <StatCard icon={<MousePointer2 />} label={t('dashboard.stats.currentDpi')} value={<span className="ltr num">{sourceDpi || '—'}</span>} />
      </div>

      <QuickConvert />

      <PerspectiveTeaser />

      <NewsFeed />

      <FeedbackCard />
    </div>
  )
}
