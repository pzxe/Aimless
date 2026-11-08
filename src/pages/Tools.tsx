import { Archive, ArrowRight, Calculator, Cloud, Cpu, Crosshair, KeyRound, Link2, MousePointer2, RectangleHorizontal, Ruler, ScanEye, ShieldCheck, Trophy, type LucideIcon } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { usePersistentState } from '@/hooks/usePersistentState'
import { Link, useLocation } from 'react-router-dom'
import { AccuracyBadge } from '@/components/games/AccuracyBadge'
import { GameSelector } from '@/components/games/GameSelector'
import { PageHeader } from '@/components/layout/AppShell'
import { AdsTool } from '@/components/tools/AdsTool'
import { PollingTool } from '@/components/tools/PollingTool'
import { DpiChips, FromConverter } from '@/components/tools/shared'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { CopyButton } from '@/components/ui/CopyButton'
import { Label, NumberField, Select } from '@/components/ui/Field'
import {
  calculateEdpi,
  convertFov,
  describeSetting,
  isValidFov,
  isValidResolution,
  parseNumber,
  sensitivityForCm360,
  validateDpi,
  validateSensitivity,
  type FovType,
} from '@/core/sensitivity'
import { useFormat } from '@/hooks/useFormat'
import { useGameAccuracy } from '@/hooks/useGameAccuracy'
import { useT } from '@/i18n'
import { useSettings } from '@/store/settingsStore'

function ToolCard({ id, icon, title, desc, children, action, help }: { id: string; icon: ReactNode; title: string; desc: string; children: ReactNode; action?: ReactNode; help?: ReactNode }) {
  return (
    <Card id={id} className="flex scroll-mt-24 flex-col transition-[border-color,box-shadow] duration-200 hover:border-border-strong hover:shadow-pop">
      <CardHeader title={title} description={desc} icon={icon} action={action} help={help} />
      <CardBody className="flex-1 space-y-4">{children}</CardBody>
    </Card>
  )
}

function Result({ label, value, unit, extra }: { label: string; value: string | null; unit?: string; extra?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-3.5 py-3">
      <div className="min-w-0">
        <div className="text-[11px] text-subtle">{label}</div>
        <div className="ltr num truncate text-start text-lg font-semibold">
          {value ?? <span className="text-subtle">—</span>}
          {value && unit && <span className="ms-1 text-xs font-normal text-muted">{unit}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {extra}
        {value && <CopyButton text={value} label={label} variant="ghost" size="icon-sm" />}
      </div>
    </div>
  )
}

const err = (t: ReturnType<typeof useT>, code: string | null, show: boolean) =>
  code && show ? t(`validation.${code}` as Parameters<typeof t>[0]) : null

function Cm360Tool() {
  const t = useT()
  const f = useFormat()
  const defaultDpi = useSettings((s) => s.defaultDpi)
  const calibrations = useSettings((s) => s.calibrations)
  const accuracyOf = useGameAccuracy()
  const [game, setGame] = usePersistentState('cm360.game', 'cs2')
  const [sens, setSens] = usePersistentState('cm360.sens', '')
  const [dpi, setDpi] = usePersistentState('cm360.dpi', String(defaultDpi))
  const s = parseNumber(sens)
  const d = parseNumber(dpi)
  const r = describeSetting(game, d, s, calibrations)
  const unsupported = accuracyOf(game) === 'unsupported'
  return (
    <ToolCard
      id="cm360"
      icon={<Ruler />}
      title={t('tools.cm360.title')}
      desc={t('tools.cm360.desc')} help={t('help.tools.cm360')}
      action={<FromConverter onPick={(c) => { setGame(c.sourceGameId); setSens(c.sourceSensitivity); setDpi(c.sourceDpi) }} />}
    >
      <div>
        <Label>{t('common.game')}</Label>
        <GameSelector value={game} onChange={setGame} label={t('common.game')} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <NumberField label={t('common.sensitivity')} value={sens} step={0.01} onValueChange={setSens} error={err(t, validateSensitivity(s), sens !== '')} />
        <NumberField label={t('common.dpi')} value={dpi} step={50} onValueChange={setDpi} inputMode="numeric" error={err(t, validateDpi(d), true)} />
      </div>
      <DpiChips current={dpi} onPick={setDpi} />
      {unsupported ? (
        <p className="text-xs text-danger">{t('note.unsupportedGeneric')}</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          <Result label={t('common.cm360')} value={r ? f.cm(r.cm360) : null} unit="cm" extra={r && <AccuracyBadge accuracy={r.accuracy} compact />} />
          <Result label={t('common.in360')} value={r ? f.cm(r.inches360) : null} unit="in" />
        </div>
      )}
    </ToolCard>
  )
}

function EdpiTool() {
  const t = useT()
  const f = useFormat()
  const defaultDpi = useSettings((s) => s.defaultDpi)
  const [sens, setSens] = usePersistentState('edpi.sens', '')
  const [dpi, setDpi] = usePersistentState('edpi.dpi', String(defaultDpi))
  const s = parseNumber(sens)
  const d = parseNumber(dpi)
  const ok = !validateSensitivity(s) && !validateDpi(d)
  return (
    <ToolCard
      id="edpi"
      icon={<Calculator />}
      title={t('tools.edpi.title')}
      desc={t('tools.edpi.desc')} help={t('help.tools.edpi')}
      action={<FromConverter onPick={(c) => { setSens(c.sourceSensitivity); setDpi(c.sourceDpi) }} />}
    >
      <div className="grid grid-cols-2 gap-3">
        <NumberField label={t('common.dpi')} value={dpi} step={50} onValueChange={setDpi} inputMode="numeric" error={err(t, validateDpi(d), true)} />
        <NumberField label={t('common.sensitivity')} value={sens} step={0.01} onValueChange={setSens} error={err(t, validateSensitivity(s), sens !== '')} />
      </div>
      <DpiChips current={dpi} onPick={setDpi} />
      <Result label={t('common.edpi')} value={ok ? f.edpi(calculateEdpi(d, s)) : null} />
    </ToolCard>
  )
}

function DpiTool() {
  const t = useT()
  const f = useFormat()
  const defaultDpi = useSettings((s) => s.defaultDpi)
  const [sens, setSens] = usePersistentState('dpi.sens', '')
  const [oldDpi, setOldDpi] = usePersistentState('dpi.old', String(defaultDpi))
  const [newDpi, setNewDpi] = usePersistentState('dpi.new', '1600')
  const s = parseNumber(sens)
  const o = parseNumber(oldDpi)
  const n = parseNumber(newDpi)
  const ok = !validateSensitivity(s) && !validateDpi(o) && !validateDpi(n)
  return (
    <ToolCard
      id="dpi"
      icon={<MousePointer2 />}
      title={t('tools.dpi.title')}
      desc={t('tools.dpi.desc')} help={t('help.tools.dpi')}
      action={<FromConverter onPick={(c) => { setSens(c.sourceSensitivity); setOldDpi(c.sourceDpi) }} />}
    >
      <div className="grid grid-cols-3 gap-3">
        <NumberField label={t('common.sensitivity')} value={sens} step={0.01} onValueChange={setSens} error={err(t, validateSensitivity(s), sens !== '')} />
        <NumberField label={t('tools.dpi.old')} value={oldDpi} step={50} onValueChange={setOldDpi} inputMode="numeric" error={err(t, validateDpi(o), true)} />
        <NumberField label={t('tools.dpi.new')} value={newDpi} step={50} onValueChange={setNewDpi} inputMode="numeric" error={err(t, validateDpi(n), true)} />
      </div>
      <DpiChips current={newDpi} onPick={setNewDpi} />
      {/* Same game, so the yaw cancels out: sens × oldDPI / newDPI. */}
      <Result label={t('tools.dpi.result')} value={ok ? f.sens((s * o) / n) : null} />
    </ToolCard>
  )
}

function TargetTool() {
  const t = useT()
  const f = useFormat()
  const defaultDpi = useSettings((s) => s.defaultDpi)
  const calibrations = useSettings((s) => s.calibrations)
  const accuracyOf = useGameAccuracy()
  const [game, setGame] = usePersistentState('target.game', 'valorant')
  const [cm, setCm] = usePersistentState('target.dist', '40')
  const [dpi, setDpi] = usePersistentState('target.dpi', String(defaultDpi))
  const c = parseNumber(cm) * (f.units === 'in' ? 2.54 : 1)
  const d = parseNumber(dpi)
  const sens = sensitivityForCm360(game, c, d, calibrations)
  const unsupported = accuracyOf(game) === 'unsupported'
  return (
    <ToolCard
      id="target"
      icon={<Crosshair />}
      title={t('tools.target.title')}
      desc={t('tools.target.desc')} help={t('help.tools.target')}
      action={
        <FromConverter
          onPick={(c) => {
            setGame(c.targetGameId)
            setDpi(c.targetDpi)
            const src = describeSetting(c.sourceGameId, parseNumber(c.sourceDpi), parseNumber(c.sourceSensitivity), calibrations)
            if (src) setCm(f.dist(src.cm360))
          }}
        />
      }
    >
      <div>
        <Label>{t('common.game')}</Label>
        <GameSelector value={game} onChange={setGame} label={t('common.game')} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label={t('tools.target.distance', { unit: f.distLabel })}
          value={cm}
          onValueChange={setCm}
          step={0.5}
          suffix={f.unit}
          error={cm !== '' && !(c > 0) ? t('validation.cm360') : null}
        />
        <NumberField label={t('common.dpi')} value={dpi} step={50} onValueChange={setDpi} inputMode="numeric" error={err(t, validateDpi(d), true)} />
      </div>
      <DpiChips current={dpi} onPick={setDpi} />
      {unsupported ? (
        <p className="text-xs text-danger">{t('note.unsupportedGeneric')}</p>
      ) : (
        <Result
          label={t('common.sensitivity')}
          value={sens && !validateDpi(d) ? f.sens(sens) : null}
          extra={sens ? <AccuracyBadge accuracy={accuracyOf(game)} compact /> : undefined}
        />
      )}
    </ToolCard>
  )
}

function FovTool() {
  const t = useT()
  const f = useFormat()
  const [value, setValue] = usePersistentState('fov.value', '90')
  const [from, setFrom] = usePersistentState<FovType>('fov.from', 'horizontal-4:3')
  const [to, setTo] = usePersistentState<FovType>('fov.to', 'horizontal')
  const [w, setW] = usePersistentState('fov.w', '1920')
  const [h, setH] = usePersistentState('fov.h', '1080')
  const v = parseNumber(value)
  const wn = parseNumber(w)
  const hn = parseNumber(h)
  const ok = isValidFov(v) && isValidResolution(wn, hn)
  const out = ok ? convertFov(v, from, to, wn, hn) : null
  const types: FovType[] = ['horizontal', 'vertical', 'horizontal-4:3']
  return (
    <ToolCard id="fov" icon={<ScanEye />} title={t('tools.fov.title')} desc={t('tools.fov.desc')} help={t('help.tools.fov')}>
      <div className="grid grid-cols-3 gap-3">
        <NumberField label={t('common.fov')} value={value} onValueChange={setValue} suffix="°" error={value !== '' && !isValidFov(v) ? t('validation.fov') : null} />
        <NumberField label={t('common.width')} value={w} onValueChange={setW} inputMode="numeric" />
        <NumberField label={t('common.height')} value={h} onValueChange={setH} inputMode="numeric" />
      </div>
      {!isValidResolution(wn, hn) && <p className="text-xs text-danger">{t('validation.resolution')}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>{t('tools.fov.from')}</Label>
          <Select value={from} onChange={(e) => setFrom(e.target.value as FovType)}>
            {types.map((x) => (
              <option key={x} value={x}>
                {t(`fovType.${x}`)}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>{t('tools.fov.to')}</Label>
          <Select value={to} onChange={(e) => setTo(e.target.value as FovType)}>
            {types.map((x) => (
              <option key={x} value={x}>
                {t(`fovType.${x}`)}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <Result label={t('tools.result')} value={out !== null ? f.num(out, 2) : null} unit="°" />
    </ToolCard>
  )
}

/** A card that opens another part of the app (the calibrator, the vault, live sharing...). */
function ToolLink({ to, icon: Icon, title, desc }: { to: string; icon: LucideIcon; title: string; desc: string }) {
  const t = useT()
  return (
    <Link
      to={to}
      className="group card flex items-center gap-3.5 p-4 transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-accent-line hover:shadow-pop focus-visible:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent transition-transform duration-200 group-hover:scale-105 [&_svg]:size-5">
        <Icon />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted">{desc}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-subtle transition-colors group-hover:text-accent">
        {t('tools.open')}
        <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
      </span>
    </Link>
  )
}

/** One labelled group of tools: an icon tile, a title and a one-line purpose, then its cards. */
function Group({ id, icon: Icon, title, desc, children }: { id: string; icon: LucideIcon; title: string; desc: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-24">
      <div className="mb-3.5 flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-accent-line bg-accent-soft text-accent shadow-[0_0_24px_-8px_var(--c-accent-glow)] [&_svg]:size-[18px]">
          <Icon />
        </span>
        <div className="min-w-0">
          <h2 id={`${id}-h`} className="display text-lg leading-tight">
            {title}
          </h2>
          <p className="text-xs text-muted">{desc}</p>
        </div>
        <span aria-hidden="true" className="ms-2 hidden h-px flex-1 bg-gradient-to-r from-border-strong to-transparent rtl:bg-gradient-to-l sm:block" />
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">{children}</div>
    </section>
  )
}

export default function ToolsPage() {
  const t = useT()
  const { hash } = useLocation()
  useEffect(() => {
    if (!hash) return
    const el = document.getElementById(hash.slice(1))
    if (el) requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }, [hash])
  const groups = [
    { id: 'group-sensitivity', icon: Calculator, label: t('tools.group.sens.title') },
    { id: 'group-hardware', icon: Cpu, label: t('tools.group.hardware.title') },
    { id: 'group-cloud', icon: Cloud, label: t('tools.group.cloud.title') },
    { id: 'group-backup', icon: ShieldCheck, label: t('tools.group.backup.title') },
  ]
  return (
    <>
      <PageHeader eyebrow={t('tools.eyebrow')} title={t('tools.title')} description={t('tools.subtitle')} />
      <nav aria-label={t('tools.jump')} className="-mt-2 mb-7 flex flex-wrap gap-2">
        {groups.map((g) => (
          <a
            key={g.id}
            href={`#${g.id}`}
            onClick={(e) => {
              e.preventDefault()
              document.getElementById(g.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-surface-2/60 px-3 text-xs font-medium text-muted transition-[color,border-color,transform] duration-150 hover:-translate-y-px hover:border-accent-line hover:text-text active:translate-y-0 [&_svg]:size-3.5"
          >
            <g.icon />
            {g.label}
          </a>
        ))}
      </nav>
      <div className="space-y-10">
        <Group id="group-sensitivity" icon={Calculator} title={t('tools.group.sens.title')} desc={t('tools.group.sens.desc')}>
          <Cm360Tool />
          <TargetTool />
          <DpiTool />
          <EdpiTool />
          <AdsTool />
          <FovTool />
        </Group>
        <Group id="group-hardware" icon={Cpu} title={t('tools.group.hardware.title')} desc={t('tools.group.hardware.desc')}>
          <div className="lg:col-span-2">
            <PollingTool />
          </div>
          <ToolLink to="/mousepad" icon={RectangleHorizontal} title={t('tools.link.mousepad.title')} desc={t('tools.link.mousepad.desc')} />
          <ToolLink to="/rawaccel" icon={MousePointer2} title={t('tools.link.rawaccel.title')} desc={t('tools.link.rawaccel.desc')} />
        </Group>
        <Group id="group-cloud" icon={Cloud} title={t('tools.group.cloud.title')} desc={t('tools.group.cloud.desc')}>
          <ToolLink to="/tournaments" icon={Trophy} title={t('tools.link.live.title')} desc={t('tools.link.live.desc')} />
          <ToolLink to="/tournaments" icon={Link2} title={t('tools.link.shared.title')} desc={t('tools.link.shared.desc')} />
        </Group>
        <Group id="group-backup" icon={ShieldCheck} title={t('tools.group.backup.title')} desc={t('tools.group.backup.desc')}>
          <ToolLink to="/accounts" icon={KeyRound} title={t('tools.link.vault.title')} desc={t('tools.link.vault.desc')} />
          <ToolLink to="/profiles" icon={Archive} title={t('tools.link.profiles.title')} desc={t('tools.link.profiles.desc')} />
        </Group>
      </div>
    </>
  )
}
