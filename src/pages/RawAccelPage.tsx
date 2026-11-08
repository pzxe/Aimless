import {
  ChevronDown,
  Download,
  FileJson,
  Gauge,
  History as HistoryIcon,
  Image as ImageIcon,
  Layers,
  Pencil,
  Pin,
  PinOff,
  RotateCcw,
  Share2,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { GameSelector } from '@/components/games/GameSelector'
import { PageHeader } from '@/components/layout/AppShell'
import { ReplicaPanel } from '@/components/rawaccel/ReplicaPanel'
import { adviceParts, fmtCm } from '@/components/rawaccel/verdict'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { CopyButton } from '@/components/ui/CopyButton'
import { Input, Label, NumberField, inputClass } from '@/components/ui/Field'
import { Segmented } from '@/components/ui/Segmented'
import { MOUSEPAD_WIDTHS_CM } from '@/core/tools'
import { describeSetting, getGame, parseNumber, validateSensitivity } from '@/core/sensitivity'
import { useT } from '@/i18n'
import {
  CURVES,
  DEFAULT_PARAMS,
  adaptParamsToDpi,
  diagnose,
  encodeShareCode,
  parseAny,
  PROFILE_IDS,
  generateProfiles,
  isFlatBaseline,
  pushHistory,
  telemetry,
  toConfigFile,
  toNativeSettings,
  type AccelConfig,
  type CurveType,
  type HandStyle,
  type HistoryItem,
  type PresetId,
  type ProfileId,
  type RawAccelParams,
} from '@/services/rawAccelEngine'
import {
  classicWindowSvg,
  copyPng,
  downloadBlob,
  fmt,
  showcaseCardSvg,
  svgToPng,
  valuesText,
  type CardLabels,
  type ReplicaTheme,
} from '@/services/rawAccelRender'
import { useConverter } from '@/store/converterStore'
import { useRawAccel, type PadSize } from '@/store/rawAccelStore'
import { useSettings } from '@/store/settingsStore'
import { cn } from '@/utils/cn'
import { copyText } from '@/utils/clipboard'
import { downloadJson, safeFilename } from '@/utils/importExport'
import { createId } from '@/utils/id'

const DPIS = [400, 800, 1600, 3200] as const
const POLLING = [500, 1000, 2000, 4000, 8000] as const
const PRESETS: { id: PresetId; icon: string }[] = [
  { id: 'tactical', icon: '🎯' },
  { id: 'tracking', icon: '⚡' },
  { id: 'hybrid', icon: '🔥' },
]
const MAX_IMPORT_BYTES = 200_000
const PROFILE_ICON: Record<ProfileId, string> = { slow: '🐢', natural: '⚖️', fast: '⚡' }

export default function RawAccelPage() {
  const t = useT()
  const calibrations = useSettings((s) => s.calibrations)
  const language = useSettings((s) => s.language)
  const st = useRawAccel()
  const { params, history, compare } = st
  const [curveChoice, setCurveChoice] = useState<'auto' | CurveType>('auto')
  const [customDpi, setCustomDpi] = useState(() => !(DPIS as readonly number[]).includes(st.dpi))
  const [showHistory, setShowHistory] = useState(true)
  const [imgStyle, setImgStyle] = useState<'classic' | 'showcase'>('classic')
  const [busy, setBusy] = useState(false)
  const [friend, setFriend] = useState<{ dpi: number; name: string } | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [code, setCode] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // First visit: take the game and sensitivity from the Converter.
  const syncFromConverter = useCallback(() => {
    const c = useConverter.getState()
    const dpi = parseNumber(c.sourceDpi)
    useRawAccel.getState().patch({
      gameId: c.sourceGameId,
      gameSens: c.sourceSensitivity || useRawAccel.getState().gameSens,
      ...(dpi > 0 ? { dpi } : {}),
      seeded: true,
    })
    if (dpi > 0) setCustomDpi(!(DPIS as readonly number[]).includes(dpi))
  }, [])
  useEffect(() => {
    if (!useRawAccel.getState().seeded) syncFromConverter()
  }, [syncFromConverter])

  const sensRaw = parseNumber(st.gameSens)
  const sensErr = st.gameSens.trim() !== '' ? validateSensitivity(sensRaw) : null
  // an invalid sensitivity (0, negative, absurdly large) counts as "unknown" so the eDPI cards never show NaN or Infinity
  const sens = validateSensitivity(sensRaw) === null ? sensRaw : 0
  const result = describeSetting(st.gameId, st.dpi, sens, calibrations)
  const rawCm360 = result?.cm360 ?? null
  const tel = useMemo(() => telemetry(st.dpi, sens > 0 ? sens : 0, rawCm360, params), [st.dpi, sens, rawCm360, params])
  const padCm = MOUSEPAD_WIDTHS_CM[st.pad]
  const diag = useMemo(() => diagnose(params, tel.peakCm360, padCm), [params, tel.peakCm360, padCm])
  const advice = adviceParts(t, diag, tel, params)
  const gameName = getGame(st.gameId)?.name ?? st.gameId

  const config = useCallback(
    (): AccelConfig => ({ params, dpi: st.dpi, pollingRate: st.pollingRate, gameId: st.gameId, gameSens: sens > 0 ? sens : 1, notes: st.notes, name: st.name }),
    [params, st.dpi, st.pollingRate, st.gameId, sens, st.notes, st.name],
  )

  const defaultName = (c: AccelConfig, tl: { baseEdpi: number; peakEdpi: number }) =>
    `${c.params.curve}${c.params.gain ? ' + Gain' : ''} · ${Math.round(tl.baseEdpi)}→${Math.round(tl.peakEdpi)} eDPI`

  const record = useCallback(
    (name?: string) => {
      if (isFlatBaseline(params)) return
      const c = config()
      const item: HistoryItem = {
        id: createId(),
        at: Date.now(),
        name: (name || c.name || defaultName(c, tel)).slice(0, 80),
        pinned: false,
        config: c,
        baseEdpi: tel.baseEdpi,
        peakEdpi: tel.peakEdpi,
      }
      useRawAccel.getState().setHistory(pushHistory(useRawAccel.getState().history, item))
    },
    [config, tel, params],
  )

  // Every tweak is saved automatically (after a short pause); identical configs are merged.
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const id = setTimeout(() => record(), 1500)
    return () => clearTimeout(id)
  }, [record])

  const apply = (c: AccelConfig, opts?: { keepDpi?: boolean }) => {
    useRawAccel.getState().patch({
      params: c.params,
      pollingRate: c.pollingRate,
      gameId: c.gameId,
      gameSens: String(c.gameSens),
      notes: c.notes,
      name: c.name,
      ...(opts?.keepDpi ? {} : { dpi: c.dpi }),
    })
    if (!opts?.keepDpi) setCustomDpi(!(DPIS as readonly number[]).includes(c.dpi))
  }

  const setupSig = JSON.stringify([st.dpi, st.pollingRate, st.gameId, st.gameSens, st.preset, st.hand, st.pad, curveChoice])
  const [flash, setFlash] = useState(0)
  const flat = isFlatBaseline(params)

  const generate = () => {
    const profiles = generateProfiles({ dpi: st.dpi, pollingRate: st.pollingRate, rawCm360, rawEdpi: st.dpi * (sens > 0 ? sens : 0), preset: st.preset, hand: st.hand, padCm, curve: curveChoice })
    st.patch({ profiles, profile: 'natural', params: profiles.natural, genSig: setupSig })
    setFriend(null)
    setFlash((n) => n + 1)
    toast.success(t('ra.generated'))
  }
  const pickProfile = (id: ProfileId) => {
    if (!st.profiles) return
    st.patch({ profile: id, params: st.profiles[id] })
    setFlash((n) => n + 1)
  }
  const profileStats = useMemo(
    () => (st.profiles ? (Object.fromEntries(PROFILE_IDS.map((id) => { const tl = telemetry(st.dpi, sens > 0 ? sens : 0, rawCm360, st.profiles![id]); return [id, { base: Math.round(tl.baseEdpi), peak: Math.round(tl.peakEdpi) }] })) as Record<ProfileId, { base: number; peak: number }>) : null),
    [st.profiles, st.dpi, sens, rawCm360],
  )

  // ---- sharing
  const exportFriend = async () => {
    const c = config()
    downloadJson(`${safeFilename(c.name || 'aimless-curve')}.aimless-accel.json`, toConfigFile(c))
    await copyText(encodeShareCode(c), { success: t('ra.share.exported'), failure: t('common.copyFailed') })
  }
  const exportNative = () => downloadJson('settings.json', toNativeSettings(config()))

  const importText = (text: string) => {
    const r = parseAny(text)
    if (!r.ok) {
      toast.error(t('ra.share.error'))
      return
    }
    // Show the friend's exact curve on the user's own mouse; offer to adapt it when the DPI differs.
    apply(r.config, { keepDpi: true })
    const own = useRawAccel.getState().dpi
    setFriend(r.config.dpi !== own ? { dpi: r.config.dpi, name: r.config.name } : null)
    const tl = telemetry(own, r.config.gameSens, describeSetting(r.config.gameId, own, r.config.gameSens, calibrations)?.cm360 ?? null, r.config.params)
    const item: HistoryItem = {
      id: createId(),
      at: Date.now(),
      name: (r.config.name || defaultName(r.config, tl)).slice(0, 80),
      pinned: false,
      config: r.config,
      baseEdpi: tl.baseEdpi,
      peakEdpi: tl.peakEdpi,
    }
    useRawAccel.getState().setHistory(pushHistory(useRawAccel.getState().history, item))
    toast.success(t('ra.share.importDone', { name: item.name }))
    setCode('')
  }
  const importFile = async (file: File | undefined) => {
    if (!file) return
    if (file.size > MAX_IMPORT_BYTES) return void toast.error(t('ra.share.error'))
    importText(await file.text())
  }
  const adaptFriend = () => {
    if (!friend) return
    useRawAccel.getState().patch({ params: adaptParamsToDpi(params, friend.dpi, st.dpi) })
    toast.success(t('ra.share.adapted', { dpi: st.dpi }))
    setFriend(null)
  }

  // ---- image export
  const cardLabels = (): CardLabels => {
    const rtl = language === 'ar'
    return {
      title: st.name || t('ra.img.cardTitle'),
      subtitle: `${gameName} · ${st.dpi} DPI · ${st.gameSens}`,
      base: t('ra.tel.base'),
      peak: t('ra.tel.peak'),
      cmRange: t('ra.img.cmRange'),
      verdict: t('ra.diag.title'),
      stability: t('ra.diag.stability'),
      flickLabel: t('ra.diag.flick'),
      smoothLabel: t('ra.diag.smooth'),
      stabilityValue: `${diag.microStability}%`,
      flickValue: t(`ra.flick.${diag.flick}`),
      smoothValue: t(`ra.smooth.${diag.smoothness}`),
      advice: advice.main,
      hints: advice.hints,
      footer: t('ra.img.footer'),
      baseEdpi: `${Math.round(tel.baseEdpi)} eDPI`,
      peakEdpi: `${Math.round(tel.peakEdpi)} eDPI`,
      cmText: tel.baseCm360 !== null ? `${fmtCm(tel.peakCm360)} – ${fmtCm(tel.baseCm360)}` : '—',
      rtl,
    }
  }
  const ghostList = useMemo(() => compare.map((id) => history.find((h) => h.id === id)).filter((h): h is HistoryItem => !!h).map((h) => ({ params: h.config.params, name: h.name })), [compare, history])

  const exportImage = async (mode: 'save' | 'copy') => {
    setBusy(true)
    try {
      const { svg, w, h } = imgStyle === 'classic' ? classicWindowSvg(params, ghostList) : showcaseCardSvg(params, cardLabels(), ghostList)
      const png = await svgToPng(svg, w, h)
      if (mode === 'save') {
        downloadBlob(`${safeFilename(st.name || 'raw-accel')}-${imgStyle}.png`, png)
        toast.success(t('ra.img.saved'))
      } else if (await copyPng(png)) toast.success(t('ra.img.copied'))
      else toast.error(t('ra.img.copyFailed'))
    } catch {
      toast.error(t('ra.img.failed'))
    } finally {
      setBusy(false)
    }
  }

  // ---- history
  const restore = (h: HistoryItem) => {
    apply(h.config)
    setFriend(null)
    toast.success(t('ra.hist.restored', { name: h.name }))
  }
  const updateHistory = (id: string, patch: Partial<HistoryItem>) => st.setHistory(history.map((h) => (h.id === id ? { ...h, ...patch } : h)))
  const sortedHistory = useMemo(() => [...history].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.at - a.at), [history])

  const themeOptions: { value: ReplicaTheme; label: string }[] = [
    { value: 'dark', label: t('ra.theme.dark') },
    { value: 'classic', label: t('ra.theme.classic') },
  ]
  const padOptions: { value: PadSize; label: string }[] = [
    { value: 'small', label: t('ra.pad.small') },
    { value: 'medium', label: t('ra.pad.medium') },
    { value: 'large', label: t('ra.pad.large') },
    { value: 'xl', label: t('ra.pad.xl') },
  ]
  const handOptions: { value: HandStyle; label: string }[] = [
    { value: 'wrist', label: t('ra.hand.wrist') },
    { value: 'arm', label: t('ra.hand.arm') },
    { value: 'hybrid', label: t('ra.hand.hybrid') },
  ]

  return (
    <>
      <PageHeader eyebrow={t('ra.eyebrow')} title={t('ra.title')} description={t('ra.subtitle')} />

      {/* PART 1: setup wizard */}
      <Card>
        <CardHeader title={t('ra.setup.title')} description={t('ra.setup.desc')} icon={<Gauge />} action={<Button size="sm" variant="outline" onClick={syncFromConverter}>{t('ra.syncConverter')}</Button>} />
        <CardBody className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,0.9fr)]">
            <div>
              <Label>{t('ra.mouseDpi')}</Label>
              <Segmented
                label={t('ra.mouseDpi')}
                value={customDpi ? 'custom' : String(st.dpi)}
                onChange={(v) => {
                  if (v === 'custom') setCustomDpi(true)
                  else {
                    setCustomDpi(false)
                    st.patch({ dpi: Number(v) })
                  }
                }}
                options={[...DPIS.map((d) => ({ value: String(d), label: String(d) })), { value: 'custom', label: t('ra.dpi.custom') }]}
              />
              {customDpi && (
                <NumberField className="mt-2" label={t('common.dpi')} value={String(st.dpi)} inputMode="numeric" onValueChange={(v) => { const n = parseNumber(v); if (n > 0) st.patch({ dpi: Math.min(32000, n) }) }} />
              )}
            </div>
            <div>
              <Label htmlFor="ra-poll">{t('ra.polling')}</Label>
              <select id="ra-poll" className={inputClass} value={st.pollingRate} onChange={(e) => st.patch({ pollingRate: Number(e.target.value) })}>
                {POLLING.map((p) => (
                  <option key={p} value={p}>{`${p} Hz`}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>{t('common.game')}</Label>
              <GameSelector value={st.gameId} onChange={(id) => st.patch({ gameId: id })} label={t('common.game')} />
            </div>
            <NumberField label={t('ra.gameSens')} value={st.gameSens} onValueChange={(v) => st.patch({ gameSens: v })} error={sensErr ? t(`validation.${sensErr}`) : null} />
          </div>

          <div>
            <Label>{t('ra.goal.title')}</Label>
            <div className="grid gap-2 md:grid-cols-3" role="radiogroup" aria-label={t('ra.goal.title')}>
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={st.preset === p.id}
                  onClick={() => st.patch({ preset: p.id })}
                  className={cn('rounded-xl border p-3 text-start transition-colors', st.preset === p.id ? 'border-accent bg-accent-soft' : 'border-border bg-surface-2/50 hover:border-border-strong')}
                >
                  <div className="text-sm font-semibold">{p.icon} {t(`ra.preset.${p.id}.name`)}</div>
                  <div className="mt-0.5 text-xs text-muted">{t(`ra.preset.${p.id}.desc`)}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>{t('ra.hand.title')}</Label>
              <Segmented label={t('ra.hand.title')} value={st.hand} onChange={(v) => st.patch({ hand: v })} options={handOptions} />
            </div>
            <div>
              <Label hint={`${padCm} cm`}>{t('ra.pad.title')}</Label>
              <Segmented label={t('ra.pad.title')} value={st.pad} onChange={(v) => st.patch({ pad: v })} options={padOptions} />
            </div>
            <div>
              <Label htmlFor="ra-curve">{t('ra.curveType')}</Label>
              <select id="ra-curve" className={inputClass} value={curveChoice} onChange={(e) => setCurveChoice(e.target.value as 'auto' | CurveType)}>
                <option value="auto">{t('ra.curve.auto')}</option>
                {CURVES.map((c) => (
                  <option key={c} value={c}>{c === 'Linear' ? 'Linear (+ Gain)' : c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" onClick={generate}>
              <Sparkles /> {t('ra.generate')}
            </Button>
            {result === null && <p className="text-xs text-danger">{t('ra.noCm')}</p>}
          </div>
        </CardBody>
      </Card>

      {/* Live eDPI telemetry */}
      <div className="mt-4 grid gap-3 md:grid-cols-3" aria-label={t('ra.tel.title')}>
        <Stat label={t('ra.tel.raw')} value={`${Math.round(tel.rawEdpi)}`} sub={tel.rawCm360 !== null ? t('ra.tel.cm', { cm: fmtCm(tel.rawCm360) }) : t('ra.tel.noCm')} hint={t('ra.tel.raw.hint')} />
        <Stat tone="good" label={t('ra.tel.base')} value={`${Math.round(tel.baseEdpi)}`} sub={tel.baseCm360 !== null ? t('ra.tel.cm', { cm: fmtCm(tel.baseCm360) }) : t('ra.tel.noCm')} hint={t('ra.tel.base.hint')} />
        <Stat tone="hot" label={t('ra.tel.peak')} value={`${Math.round(tel.peakEdpi)}`} sub={`${tel.peakCm360 !== null ? t('ra.tel.cm', { cm: fmtCm(tel.peakCm360) }) + ' · ' : ''}${t('ra.tel.reach', { ratio: (tel.reachedRatio / Math.max(params.sensMultiplier, 1e-9)).toFixed(2) })}`} hint={t('ra.tel.peak.hint')} />
      </div>

      {friend && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent-line bg-accent-soft p-4">
          <p className="text-sm">{t('ra.share.friendDpi', { dpi: friend.dpi, mine: st.dpi })}</p>
          <Button variant="primary" onClick={adaptFriend}>{t('ra.share.adapt', { dpi: st.dpi })}</Button>
        </div>
      )}

      {/* PART 3: replica */}
      <Card className="mt-4">
        <CardHeader
          title={t('ra.replica.title')}
          description={t('ra.replica.desc')}
          icon={<Layers />}
          action={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Segmented label={t('ra.theme.label')} value={st.theme} onChange={(v) => st.patch({ theme: v })} options={themeOptions} />
              <CopyButton text={valuesText(params)} label={t('ra.replica.copyAll')} showLabel size="sm" variant="outline" />
            </div>
          }
        />
        <CardBody className="space-y-3">
          {st.profiles && profileStats && (
            <div>
              <Label>{t('ra.profile.title')}</Label>
              <div className="grid gap-2 md:grid-cols-3" role="radiogroup" aria-label={t('ra.profile.title')}>
                {PROFILE_IDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={st.profile === id}
                    onClick={() => pickProfile(id)}
                    className={cn('rounded-xl border p-3 text-start transition-colors', st.profile === id ? 'border-accent bg-accent-soft' : 'border-border bg-surface-2/50 hover:border-border-strong')}
                  >
                    <div className="text-sm font-semibold">{PROFILE_ICON[id]} {t(`ra.profile.${id}`)}</div>
                    <div className="mt-0.5 text-xs text-muted">{t(`ra.profile.${id}.desc`)}</div>
                    <div className="num mt-1 text-xs text-subtle" dir="ltr">{profileStats[id].base} → {profileStats[id].peak} eDPI</div>
                  </button>
                ))}
              </div>
              {st.profile === null && <p className="mt-1.5 text-xs text-muted">{t('ra.profile.custom')}</p>}
              {st.genSig !== setupSig && <p className="mt-1.5 text-xs text-danger">{t('ra.stale')}</p>}
            </div>
          )}
          {flat && <p className="inline-flex items-center rounded-full border border-border-strong bg-surface-2/70 px-3 py-1 text-xs font-medium text-muted">{t('ra.flat.badge')}</p>}
          <div key={flash} className={flash > 0 ? 'ra-flash rounded-xl' : undefined}>
          <ReplicaPanel
            params={params}
            onChange={(p) => st.patch({ params: p, profile: null })}
            theme={st.theme}
            ghosts={ghostList}
            onApply={() => {
              record()
              toast.success(t('ra.replica.applied'))
            }}
            onReset={() => {
              st.patch({ params: { ...DEFAULT_PARAMS }, profile: null })
              setFlash((n) => n + 1)
            }}
          />
          </div>
          {ghostList.length > 0 && (
            <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
              <span className="inline-block h-0.5 w-6 bg-[#5aa9ff]" /> {t('ra.graph.current')}
              {ghostList.map((g, i) => (
                <span key={i} className="inline-flex items-center gap-1.5">
                  <span className="inline-block w-6 border-t-2 border-dashed border-[#ffa94d]" /> {t('ra.graph.ghost', { name: g.name })}
                </span>
              ))}
            </p>
          )}
          <p className="text-xs text-subtle">{t('ra.replica.note')}</p>

          {/* PART 6: image export */}
          <div className="hairline" />
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 text-sm font-semibold"><ImageIcon className="size-4" /> {t('ra.img.title')}</span>
            <Segmented
              label={t('ra.img.title')}
              value={imgStyle}
              onChange={setImgStyle}
              options={[
                { value: 'classic', label: t('ra.img.classic') },
                { value: 'showcase', label: t('ra.img.showcase') },
              ]}
            />
            <Button size="sm" variant="primary" disabled={busy} onClick={() => exportImage('save')}><Download /> {t('ra.img.save')}</Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => exportImage('copy')}><ImageIcon /> {t('ra.img.copy')}</Button>
          </div>
        </CardBody>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* PART 2: diagnostic */}
        <Card>
          <CardHeader title={t('ra.diag.title')} icon={<Gauge />} />
          <CardBody className="space-y-4">
            <div>
              <div className="mb-1 flex items-center justify-between text-xs"><span className="font-medium text-muted">{t('ra.diag.stability')}</span><span className="num font-semibold">{diag.microStability}%</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-valuenow={diag.microStability} aria-valuemin={0} aria-valuemax={100} aria-label={t('ra.diag.stability')}>
                <div className="h-full rounded-full bg-accent-fill transition-[width] duration-300" style={{ width: `${diag.microStability}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-border bg-surface-2/50 p-3"><div className="text-xs text-muted">{t('ra.diag.flick')}</div><div className="mt-0.5 font-semibold">{t(`ra.flick.${diag.flick}`)}</div></div>
              <div className="rounded-xl border border-border bg-surface-2/50 p-3"><div className="text-xs text-muted">{t('ra.diag.smooth')}</div><div className="mt-0.5 font-semibold">{t(`ra.smooth.${diag.smoothness}`)} <span className="num text-xs font-normal text-subtle">{diag.smoothScore}/100</span></div></div>
            </div>
            <p className="text-sm leading-relaxed">{flat ? t('ra.flat.advice') : advice.main}</p>
            {!flat && advice.hints.length > 0 && (
              <ul className="list-disc space-y-1 ps-5 text-xs text-muted">
                {advice.hints.map((h) => (<li key={h}>{h}</li>))}
              </ul>
            )}
          </CardBody>
        </Card>

        {/* PART 5: sharing */}
        <Card>
          <CardHeader title={t('ra.share.title')} icon={<Share2 />} />
          <CardBody className="space-y-3">
            <div>
              <Label htmlFor="ra-name">{t('ra.name')}</Label>
              <Input id="ra-name" maxLength={80} value={st.name} onChange={(e) => st.patch({ name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="ra-notes">{t('ra.notes')}</Label>
              <Input id="ra-notes" maxLength={500} value={st.notes} onChange={(e) => st.patch({ notes: e.target.value })} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" size="sm" onClick={exportFriend}><FileJson /> {t('ra.share.export')}</Button>
              <CopyButton text={encodeShareCode(config())} label={t('ra.share.copyCode')} showLabel size="sm" variant="outline" />
              <Button variant="outline" size="sm" onClick={exportNative}><Download /> {t('ra.share.native')}</Button>
            </div>
            <p className="text-xs text-subtle">{t('ra.share.nativeNote')}</p>
            <div className="hairline" />
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileRef.current?.click()}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileRef.current?.click() } }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); void importFile(e.dataTransfer.files[0]) }}
              className={cn('flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 border-dashed p-5 text-center text-sm transition-colors', dragOver ? 'border-accent bg-accent-soft' : 'border-border-strong hover:border-accent')}
            >
              <Upload className="size-5 text-muted" />
              <span className="font-medium">{t('ra.share.import')}</span>
              <span className="text-xs text-muted">{t('ra.share.drop')}</span>
              <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={(e) => { void importFile(e.target.files?.[0]); e.target.value = '' }} />
            </div>
            <div className="flex gap-2">
              <Input aria-label={t('ra.share.paste')} dir="ltr" placeholder="AIMLESS-RA:..." value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && code.trim()) importText(code) }} />
              <Button variant="outline" disabled={!code.trim()} onClick={() => importText(code)}>{t('ra.share.paste')}</Button>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* PART 4: history */}
      <Card className="mt-4">
        <CardHeader
          title={t('ra.hist.title')}
          description={t('ra.hist.count', { n: history.length })}
          icon={<HistoryIcon />}
          action={
            <Button size="sm" variant="ghost" aria-expanded={showHistory} onClick={() => setShowHistory((v) => !v)}>
              <ChevronDown className={cn('transition-transform', showHistory && 'rotate-180')} /> {showHistory ? t('ra.hist.hide') : t('ra.hist.show')}
            </Button>
          }
        />
        {showHistory && (
          <CardBody className="space-y-2">
            {sortedHistory.length === 0 && <p className="py-4 text-center text-sm text-muted">{t('ra.hist.empty')}</p>}
            {sortedHistory.map((h) => {
              const comparing = compare.includes(h.id)
              return (
                <div key={h.id} className={cn('flex flex-wrap items-center gap-2 rounded-xl border p-3', comparing ? 'border-[#ffa94d]/70' : 'border-border')}>
                  <div className="min-w-0 flex-1 basis-56">
                    {renaming === h.id ? (
                      <Input
                        autoFocus
                        aria-label={t('ra.hist.rename')}
                        maxLength={80}
                        defaultValue={h.name}
                        onBlur={(e) => { updateHistory(h.id, { name: e.target.value.trim() || h.name }); setRenaming(null) }}
                        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setRenaming(null) }}
                      />
                    ) : (
                      <button type="button" onClick={() => restore(h)} className="block max-w-full truncate text-start text-sm font-semibold hover:text-accent" title={t('ra.hist.restore')}>
                        {h.pinned && <Pin className="me-1 inline size-3.5 text-accent" />}{h.name}
                      </button>
                    )}
                    <p className="num truncate text-xs text-muted" dir="ltr">
                      {new Date(h.at).toLocaleString()} · {h.config.dpi} DPI · {getGame(h.config.gameId)?.name ?? h.config.gameId} · {Math.round(h.baseEdpi)} → {Math.round(h.peakEdpi)} eDPI · {h.config.params.curve}{h.config.params.gain ? ' + Gain' : ''} {fmt(h.config.params.sensMultiplier)}/{fmt(h.config.params.inputOffset)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon-sm" variant="ghost" aria-label={t('ra.hist.restore')} title={t('ra.hist.restore')} onClick={() => restore(h)}><RotateCcw /></Button>
                    <Button size="sm" variant={comparing ? 'primary' : 'outline'} aria-pressed={comparing} onClick={() => st.toggleCompare(h.id)}>{comparing ? t('ra.hist.comparing') : t('ra.hist.compare')}</Button>
                    <Button size="icon-sm" variant="ghost" aria-label={h.pinned ? t('ra.hist.unpin') : t('ra.hist.pin')} title={h.pinned ? t('ra.hist.unpin') : t('ra.hist.pin')} onClick={() => updateHistory(h.id, { pinned: !h.pinned })}>{h.pinned ? <PinOff /> : <Pin />}</Button>
                    <Button size="icon-sm" variant="ghost" aria-label={t('ra.hist.rename')} title={t('ra.hist.rename')} onClick={() => setRenaming(h.id)}><Pencil /></Button>
                    <Button size="icon-sm" variant="ghost" aria-label={t('common.delete')} title={t('common.delete')} onClick={() => st.setHistory(history.filter((x) => x.id !== h.id))}><Trash2 /></Button>
                  </div>
                </div>
              )
            })}
            {history.some((h) => !h.pinned) && (
              <div className="pt-1 text-end">
                <Button size="sm" variant="ghost" onClick={() => st.setHistory(history.filter((h) => h.pinned))}>{t('ra.hist.clear')}</Button>
              </div>
            )}
          </CardBody>
        )}
      </Card>
    </>
  )
}

function Stat({ label, value, sub, hint, tone }: { label: string; value: string; sub: string; hint: string; tone?: 'good' | 'hot' }) {
  return (
    <div className="card p-4" title={hint}>
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className={cn('display mt-1 text-3xl', tone === 'good' && 'text-success', tone === 'hot' && 'text-accent')}>
        <span className="num">{value}</span> <span className="text-sm font-normal text-subtle">eDPI</span>
      </div>
      <div className="num mt-0.5 text-xs text-muted">{sub}</div>
      <p className="mt-2 text-xs leading-relaxed text-subtle">{hint}</p>
    </div>
  )
}

export type { RawAccelParams }
