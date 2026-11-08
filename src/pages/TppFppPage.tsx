import { ArrowLeftRight, Eye, Gauge, PersonStanding, ScanEye, Sigma, SwitchCamera, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AccuracyBadge } from '@/components/games/AccuracyBadge'
import { GameSelector } from '@/components/games/GameSelector'
import { PageHeader } from '@/components/layout/AppShell'
import { CameraScene, FrameCompare } from '@/components/tppfpp/PerspectiveStage'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { CopyButton } from '@/components/ui/CopyButton'
import { Label, NumberField } from '@/components/ui/Field'
import { Segmented } from '@/components/ui/Segmented'
import { getGame, parseNumber, resolveFormula, resolveYaw, validateDpi, validateSensitivity, type FovType, type GameDefinition } from '@/core/sensitivity'
import { useFormat } from '@/hooks/useFormat'
import { useT } from '@/i18n'
import {
  ASPECTS, convertPerspective, MATCH_METHODS, opposite,
  type AspectKey, type MatchMethod, type Perspective, type PerspectiveResult,
} from '@/services/tppFppEngine'
import { useConverter } from '@/store/converterStore'
import { useSettings } from '@/store/settingsStore'

const FOV_HINT: Record<FovType, 'horizontal' | 'vertical' | 'h43'> = { horizontal: 'horizontal', vertical: 'vertical', 'horizontal-4:3': 'h43' }
const ASPECT_KEYS = Object.keys(ASPECTS) as AspectKey[]

/** One telemetry readout. Remounting on a new value replays the pulse. */
function Telemetry({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="relative min-w-0 overflow-hidden rounded-2xl border border-border bg-surface/80 p-4 backdrop-blur">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.14em] text-subtle uppercase [&_svg]:size-3.5">{icon}{label}</div>
      <div key={value} className="tpp-pulse num display mt-2 truncate text-2xl leading-none text-text" dir="ltr">{value}</div>
      {sub && <div className="mt-1.5 text-[11px] leading-snug text-muted">{sub}</div>}
    </div>
  )
}

function fovNote(t: ReturnType<typeof useT>, game: GameDefinition): string {
  if (game.fov?.fixed) return t('tpp.fovFixed', { fov: game.fov.default })
  const hint = t(`tpp.fovHint.${game.fov ? FOV_HINT[game.fov.type] : 'unknown'}`)
  return game.fov?.min && game.fov.max ? `${hint} ${t('tpp.fovLimits', { min: game.fov.min, max: game.fov.max })}` : hint
}

export default function TppFppPage() {
  const t = useT()
  const f = useFormat()
  const calibrations = useSettings((s) => s.calibrations)

  const [gameId, setGameId] = useState(() => {
    const c = useConverter.getState()
    const g = getGame(c.sourceGameId)
    return g && resolveFormula(g, useSettings.getState().calibrations) ? g.id : 'valorant'
  })
  const [from, setFrom] = useState<Perspective>('tpp')
  const [sens, setSens] = useState(() => useConverter.getState().sourceSensitivity || '0.35')
  const [dpi, setDpi] = useState(() => useConverter.getState().sourceDpi || '800')
  const [fov, setFov] = useState<Record<Perspective, string>>(() => {
    const d = String(getGame(useConverter.getState().sourceGameId)?.fov?.default ?? 90)
    return { tpp: d, fpp: d }
  })
  const [aspect, setAspect] = useState<AspectKey>('16:9')
  const [method, setMethod] = useState<MatchMethod>('center')

  const game = getGame(gameId)!
  const yaw = resolveYaw(game, calibrations)
  const accuracy = resolveFormula(game, calibrations)?.accuracy ?? 'unsupported'
  const to = opposite(from)
  const mode = (p: Perspective) => t(p === 'tpp' ? 'tpp.tpp' : 'tpp.fpp')
  const modeLower = (p: Perspective) => mode(p).toLocaleLowerCase()

  const s = parseNumber(sens)
  const d = parseNumber(dpi)
  const fovNum = { tpp: parseNumber(fov.tpp), fpp: parseNumber(fov.fpp) }
  const sensIssue = sens.trim() === '' ? null : validateSensitivity(s)
  const dpiIssue = validateDpi(d)

  const result: PerspectiveResult | null = useMemo(
    () =>
      yaw === null
        ? null
        : convertPerspective({
            yaw, fovType: game.fov?.type ?? 'horizontal', aspect: ASPECTS[aspect], from, sensitivity: s, dpi: d,
            fov: { tpp: parseNumber(fov.tpp), fpp: parseNumber(fov.fpp) }, method, step: game.sensitivityStep,
          }),
    [yaw, game, aspect, from, s, d, fov.tpp, fov.fpp, method],
  )
  const good = result?.ok ? result : null
  const badFov = (p: Perspective) => !(fovNum[p] > 0 && fovNum[p] < 180)

  const pickGame = (id: string) => {
    setGameId(id)
    const g = getGame(id)
    if (g?.fov) setFov({ tpp: String(g.fov.default), fpp: String(g.fov.default) })
  }
  const swap = () => {
    // the result becomes the new starting point, so a second tap goes back to where you were
    if (good) setSens(String(Number(good.to.sensitivity.toPrecision(8))))
    setFrom(to)
  }
  const sameFov = good && fovNum.tpp === fovNum.fpp && method !== 'cm360'

  const fovField = (p: Perspective) => (
    <NumberField
      key={p}
      label={t('tpp.fovOf', { mode: mode(p) })}
      value={fov[p]}
      onValueChange={(v) => setFov((cur) => ({ ...cur, [p]: v }))}
      suffix="°"
      error={fov[p].trim() !== '' && badFov(p) ? t('tpp.fovError') : null}
    />
  )

  return (
    <>
      <PageHeader eyebrow={t('tpp.eyebrow')} title={t('tpp.title')} description={t('tpp.subtitle')} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* ------------------------------------------------------------ controls */}
        <Card className="tpp-glow h-fit">
          <CardHeader title={t('tpp.setup')} icon={<SwitchCamera />} />
          <CardBody className="space-y-4">
            <div>
              <Label>{t('common.game')}</Label>
              <GameSelector value={gameId} onChange={pickGame} label={t('common.game')} />
              <div className="mt-1.5"><AccuracyBadge accuracy={accuracy} /></div>
            </div>

            {yaw === null ? (
              <div className="rounded-xl border border-danger/30 bg-danger-soft p-3 text-xs text-danger">
                <p className="flex items-start gap-2"><TriangleAlert className="mt-0.5 size-3.5 shrink-0" />{t('tpp.unsupported', { game: game.name })}</p>
                <Link to="/converter" className="mt-1.5 inline-block font-medium underline">{t('tpp.calibrate')}</Link>
              </div>
            ) : (
              <>
                <div>
                  <Label>{t('tpp.source')}</Label>
                  <div className="flex items-center gap-2">
                    <Segmented<Perspective>
                      value={from}
                      onChange={setFrom}
                      label={t('tpp.source')}
                      className="flex-1"
                      options={[
                        { value: 'tpp', label: t('tpp.tpp'), icon: <PersonStanding /> },
                        { value: 'fpp', label: t('tpp.fpp'), icon: <Eye /> },
                      ]}
                    />
                    <Button variant="ghost" size="icon" onClick={swap} aria-label={t('tpp.swap')} title={t('tpp.swap')}>
                      <ArrowLeftRight />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <NumberField label={t('tpp.sensIn', { mode: modeLower(from) })} value={sens} onValueChange={setSens} error={sensIssue ? t(`validation.${sensIssue}`) : null} />
                  <NumberField label={t('common.dpi')} value={dpi} onValueChange={setDpi} inputMode="numeric" error={dpiIssue ? t(`validation.${dpiIssue}`) : null} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {fovField(from)}
                  {fovField(to)}
                </div>
                <p className="-mt-2 text-[11px] leading-snug text-subtle">{fovNote(t, game)}</p>
                <div>
                  <Label>{t('tpp.aspect')}</Label>
                  <Segmented<AspectKey> value={aspect} onChange={setAspect} label={t('tpp.aspect')} options={ASPECT_KEYS.map((k) => ({ value: k, label: <span dir="ltr">{k}</span> }))} />
                </div>
                <div>
                  <Label>{t('tpp.method')}</Label>
                  <Segmented<MatchMethod> value={method} onChange={setMethod} label={t('tpp.method')} options={MATCH_METHODS.map((m) => ({ value: m, label: t(`tpp.method.${m}`) }))} />
                  <p className="mt-1.5 text-[11px] leading-snug text-subtle">{t(`tpp.methodHelp.${method}`)}</p>
                </div>
              </>
            )}
          </CardBody>
        </Card>

        {/* ------------------------------------------------------------ output */}
        <div className="space-y-4">
          <div className="hud p-4 sm:p-5">
            <div className="relative z-10 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-center">
              <div className="rounded-xl border border-border bg-bg/60 p-2">
                <CameraScene active={from} fov={{ tpp: good ? (from === 'tpp' ? good.from.horizontalFov : good.to.horizontalFov) : null, fpp: good ? (from === 'fpp' ? good.from.horizontalFov : good.to.horizontalFov) : null }} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold tracking-[0.2em] text-accent uppercase">{t('tpp.result', { mode: modeLower(to) })}</div>
                <div className="tpp-glow mt-2 flex items-center rounded-2xl border border-accent/30 bg-accent-soft ps-4 pe-1.5">
                  <span key={good?.to.sensitivity} className="tpp-pulse num display flex-1 truncate py-3 text-start text-4xl leading-none" dir="ltr">
                    {good ? f.sens(good.to.sensitivity) : '—'}
                  </span>
                  <CopyButton text={good ? f.sens(good.to.sensitivity) : ''} label={t('tpp.copy')} variant="ghost" size="icon" />
                </div>
                {good?.rounded && Math.abs(good.rounded.sensitivity - good.to.sensitivity) > 1e-9 && (
                  <p className="mt-2 text-[11px] text-muted">
                    {t('tpp.nearest', { sens: f.sens(good.rounded.sensitivity), dist: f.dist(good.rounded.cm360), label: f.distLabel, err: f.num(good.rounded.errorPercent, 2) })}
                  </p>
                )}
                {sameFov && <p className="mt-2 text-[11px] text-warning">{t('tpp.sameFov')}</p>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Telemetry
              icon={<Gauge />}
              label={f.distLabel}
              value={good ? f.dist(good.to.cm360) : '—'}
              sub={good ? `${f.dist(good.from.cm360)} → ${f.dist(good.to.cm360)} ${f.unit}` : undefined}
            />
            <Telemetry
              icon={<ScanEye />}
              label={t('tpp.card.fov')}
              value={good ? `${f.num(good.fovMultiplier, 3)}×` : '—'}
              sub={good ? t('tpp.card.fovSub', { x: f.num(good.fovMultiplier, 2), mode: modeLower(to) }) : undefined}
            />
            <Telemetry
              icon={<Sigma />}
              label={t('tpp.card.rot')}
              value={good ? `${f.num(good.rotationRatio, 4)}×` : '—'}
              sub={good ? t('tpp.card.rotSub', { x: f.num(good.rotationRatio, 3) }) : undefined}
            />
          </div>

          <Card>
            <CardHeader title={t('tpp.preview')} icon={<ScanEye />} />
            <CardBody className="space-y-3">
              {good ? (
                <>
                  <FrameCompare
                    from={good.from.horizontalFov}
                    to={good.to.horizontalFov}
                    fromLabel={`${mode(from)} · ${f.num(good.from.horizontalFov, 1)}°`}
                    toLabel={`${mode(to)} · ${f.num(good.to.horizontalFov, 1)}°`}
                    aspect={ASPECTS[aspect]}
                  />
                  <div className="hairline" />
                  <div className="text-[10px] font-semibold tracking-[0.14em] text-subtle uppercase">{t('tpp.explain')}</div>
                  <ol className="num space-y-1 text-xs text-muted">
                    <li>{t('tpp.explain.fov', { from: f.num(good.from.horizontalFov, 2), to: f.num(good.to.horizontalFov, 2) })}</li>
                    <li>{t('tpp.explain.ratio', { ratio: f.num(good.rotationRatio, 5) })}</li>
                    <li>{t('tpp.explain.sens', { from: f.sens(good.from.sensitivity), ratio: f.num(good.rotationRatio, 5), to: f.sens(good.to.sensitivity) })}</li>
                  </ol>
                </>
              ) : (
                <p className="text-sm text-muted">—</p>
              )}
              <p className="text-[11px] leading-snug text-subtle">{t('tpp.note')}</p>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  )
}
