import {
  Check,
  Database,
  Info,
  Laptop,
  Moon,
  MousePointerClick,
  Palette,
  RectangleHorizontal,
  RotateCcw,
  Rocket,
  SlidersHorizontal,
  Sun,
  Trash2,
  Volume2,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/AppShell'
import { PadPicker } from '@/components/tools/MousepadVisualizer'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/Dialog'
import { NumberField } from '@/components/ui/Field'
import { Segmented } from '@/components/ui/Segmented'
import { InfoTip } from '@/components/ui/InfoTip'
import { parseNumber, validateDpi } from '@/core/sensitivity'
import { useT } from '@/i18n'
import { initialForm, useConverter } from '@/store/converterStore'
import { useHistory } from '@/store/historyStore'
import { useProfiles } from '@/store/profilesStore'
import { DEFAULT_SETTINGS, PREFERENCE_KEYS, useSettings } from '@/store/settingsStore'
import { useTournaments } from '@/store/tournamentStore'
import {
  ACCENTS,
  LANGUAGES,
  type Density,
  type FovDisplay,
  type MotionPref,
  type StartupView,
  type Theme,
  type Units,
} from '@/store/types'
import { cn } from '@/utils/cn'
import { playSound } from '@/utils/sound'
import { useAccounts } from '@/store/accountsStore'
import { clearAllStorage } from '@/utils/storage'
import { isDesktopApp } from '@/utils/platform'
import { clearPersistentTools } from '@/hooks/usePersistentState'
import { DesktopShortcutButton, useShortcutStatus } from '@/components/layout/DesktopShortcut'

function Row({ label, hint, help, children }: { label: ReactNode; hint?: ReactNode; help?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0 md:max-w-xs">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          {label}
          {help && <InfoTip>{help}</InfoTip>}
        </div>
        {hint && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
      </div>
      <div className="scrollbar-thin max-w-full min-w-0 overflow-x-auto md:shrink-0">{children}</div>
    </div>
  )
}

export default function SettingsPage() {
  const shortcut = useShortcutStatus()
  const t = useT()
  const s = useSettings()
  const [dpiText, setDpiText] = useState(String(s.defaultDpi))
  const [confirm, setConfirm] = useState<'reset' | 'clear' | null>(null)

  useEffect(() => setDpiText(String(s.defaultDpi)), [s.defaultDpi])
  const dpiErr = validateDpi(parseNumber(dpiText))

  return (
    <>
      <PageHeader eyebrow={t('settings.eyebrow')} title={t('settings.title')} description={t('settings.subtitle')} />
      <div className="grid max-w-4xl grid-cols-1 gap-4">
        <Card>
          <CardHeader title={t('settings.appearance')} icon={<Palette />} />
          <CardBody className="divide-y divide-border">
            <Row label={t('settings.language')} help={t('help.settings.language')}>
              <div role="radiogroup" aria-label={t('settings.language')} className="flex flex-wrap gap-1.5">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    role="radio"
                    aria-checked={s.language === l.code}
                    lang={l.code}
                    onClick={() => s.set({ language: l.code })}
                    className={cn(
                      'h-8 rounded-xl border px-3 text-xs font-medium transition-colors',
                      s.language === l.code ? 'border-accent-line bg-accent-soft text-text' : 'border-border text-muted hover:text-text',
                    )}
                  >
                    {l.native}
                  </button>
                ))}
              </div>
            </Row>
            <Row label={t('settings.theme')} help={t('help.settings.theme')}>
              <Segmented<Theme>
                label={t('settings.theme')}
                value={s.theme}
                onChange={(theme) => s.set({ theme })}
                options={[
                  { value: 'dark', label: t('settings.theme.dark'), icon: <Moon /> },
                  { value: 'light', label: t('settings.theme.light'), icon: <Sun /> },
                  { value: 'system', label: t('settings.theme.system'), icon: <Laptop /> },
                ]}
              />
            </Row>
            <Row label={t('settings.accent')} hint={t('settings.accentHint')} help={t('help.settings.accent')}>
              <div role="radiogroup" aria-label={t('settings.accent')} className="flex gap-2">
                {ACCENTS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    role="radio"
                    aria-checked={s.accent === a.id}
                    aria-label={t(`settings.accent.${a.id}`)}
                    title={t(`settings.accent.${a.id}`)}
                    onClick={() => s.set({ accent: a.id })}
                    className={cn(
                      'flex size-9 items-center justify-center rounded-full border-2 transition-transform hover:scale-105',
                      s.accent === a.id ? 'border-text' : 'border-transparent',
                    )}
                    style={{ background: a.swatch, boxShadow: `0 6px 18px -6px ${a.swatch}` }}
                  >
                    {s.accent === a.id && <Check className={cn('size-4', a.id === 'ice' ? 'text-black' : 'text-white')} />}
                  </button>
                ))}
              </div>
            </Row>
            <Row label={t('settings.density')} hint={t('settings.densityHint')} help={t('help.settings.density')}>
              <Segmented<Density>
                label={t('settings.density')}
                value={s.density}
                onChange={(density) => s.set({ density })}
                options={[
                  { value: 'comfortable', label: t('settings.density.comfortable') },
                  { value: 'compact', label: t('settings.density.compact') },
                ]}
              />
            </Row>
            <Row label={t('settings.motion')} hint={t('settings.motionHint')} help={t('help.settings.motion')}>
              <Segmented<MotionPref>
                label={t('settings.motion')}
                value={s.motion}
                onChange={(motion) => s.set({ motion })}
                options={[
                  { value: 'full', label: t('settings.motion.full') },
                  { value: 'reduced', label: t('settings.motion.reduced') },
                  { value: 'instant', label: t('settings.motion.instant') },
                ]}
              />
            </Row>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t('settings.measurement')} icon={<RectangleHorizontal />} />
          <CardBody className="divide-y divide-border">
            <Row label={t('settings.units')} hint={t('settings.unitsHint')} help={t('help.settings.units')}>
              <Segmented<Units>
                label={t('settings.units')}
                value={s.units}
                onChange={(units) => s.set({ units })}
                options={[
                  { value: 'cm', label: t('common.cm360') },
                  { value: 'in', label: t('common.in360') },
                ]}
              />
            </Row>
            <Row label={t('mousepad.size')} hint={t('settings.mousepadHint')} help={t('help.settings.mousepad')}>
              <PadPicker />
            </Row>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t('settings.defaults')} icon={<SlidersHorizontal />} />
          <CardBody className="divide-y divide-border">
            <Row label={t('settings.startup')} hint={t('settings.startupHint')} help={t('help.settings.startup')}>
              <Segmented<StartupView>
                label={t('settings.startup')}
                value={s.startupView}
                onChange={(startupView) => s.set({ startupView })}
                options={[
                  ...(isDesktopApp ? [] : [{ value: 'landing' as const, label: t('nav.presentation'), icon: <Rocket /> }]),
                  { value: 'dashboard', label: t('nav.dashboard') },
                  { value: 'converter', label: t('nav.converter') },
                  { value: 'tournaments', label: t('nav.tournaments') },
                ]}
              />
            </Row>
            <Row label={t('settings.precision')} hint={t('settings.precisionHint')} help={t('help.settings.precision')}>
              <Segmented
                label={t('settings.precision')}
                value={String(s.precision)}
                onChange={(v) => s.set({ precision: Number(v) })}
                options={['2', '3', '4', '5', '6'].map((v) => ({ value: v, label: <span className="num">{v}</span> }))}
              />
            </Row>
            <Row label={t('settings.defaultDpi')} hint={t('settings.defaultDpiHint')} help={t('help.settings.defaultDpi')}>
              <NumberField
                label={<span className="sr-only">{t('settings.defaultDpi')}</span>}
                value={dpiText}
                inputMode="numeric"
                className="w-36"
                onValueChange={(v) => {
                  setDpiText(v)
                  const n = parseNumber(v)
                  if (!validateDpi(n)) s.set({ defaultDpi: n })
                }}
                error={dpiErr ? t(`validation.${dpiErr}`) : null}
              />
            </Row>
            <Row label={t('settings.fovDisplay')} hint={t('settings.fovDisplayHint')} help={t('help.settings.fovDisplay')}>
              <Segmented<FovDisplay>
                label={t('settings.fovDisplay')}
                value={s.fovDisplay}
                onChange={(fovDisplay) => s.set({ fovDisplay })}
                options={[
                  { value: 'horizontal', label: t('fovType.horizontal') },
                  { value: 'vertical', label: t('fovType.vertical') },
                ]}
              />
            </Row>
            <Row label={t('settings.sound')} hint={t('settings.soundHint')} help={t('help.settings.sound')}>
              <div className="flex items-center gap-2">
                <Segmented<'on' | 'off'>
                  label={t('settings.sound')}
                  value={s.sound ? 'on' : 'off'}
                  onChange={(v) => {
                    s.set({ sound: v === 'on' })
                    if (v === 'on') setTimeout(() => playSound('success'), 0)
                  }}
                  options={[
                    { value: 'off', label: t('settings.off') },
                    { value: 'on', label: t('settings.on'), icon: <Volume2 /> },
                  ]}
                />
                {s.sound && (
                  <Button size="icon-sm" variant="ghost" aria-label={t('settings.soundTest')} title={t('settings.soundTest')} onClick={() => playSound('success')}>
                    <MousePointerClick />
                  </Button>
                )}
              </div>
            </Row>
            {shortcut.status && (
              <Row label={t('settings.shortcut')} hint={t('settings.shortcutHint')} help={t('help.settings.shortcut')}>
                <DesktopShortcutButton />
              </Row>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t('settings.data')} description={t('settings.dataHint')} icon={<Database />} />
          <CardBody className="flex flex-wrap gap-2">
            <Button onClick={() => setConfirm('reset')}>
              <RotateCcw />
              {t('settings.resetSettings')}
            </Button>
            <Button variant="danger" onClick={() => setConfirm('clear')}>
              <Trash2 />
              {t('settings.clearData')}
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t('settings.about')} icon={<Info />} />
          <CardBody className="text-sm text-muted">
            <p>{t('settings.aboutBody')}</p>
            <p className="ltr num mt-2 text-start text-xs text-subtle">{t('settings.version', { version: __APP_VERSION__ })}</p>
          </CardBody>
        </Card>
      </div>

      <ConfirmDialog
        open={confirm === 'reset'}
        onClose={() => setConfirm(null)}
        title={t('settings.resetSettings')}
        description={t('settings.resetSettingsConfirm')}
        confirmLabel={t('common.reset')}
        onConfirm={() => {
          // Keep favorites, recents and calibrations: they are user data, not preferences.
          const defaults = Object.fromEntries(PREFERENCE_KEYS.map((k) => [k, DEFAULT_SETTINGS[k]]))
          s.set(defaults)
          toast.success(t('settings.resetDone'))
        }}
      />
      <ConfirmDialog
        open={confirm === 'clear'}
        onClose={() => setConfirm(null)}
        title={t('settings.clearData')}
        description={t('settings.clearDataConfirm')}
        confirmLabel={t('settings.clearData')}
        onConfirm={() => {
          const message = t('settings.clearDone')
          useProfiles.getState().clear()
          useHistory.getState().clear()
          useTournaments.setState({ tournaments: [] })
          useSettings.getState().reset()
          useConverter.getState().load(initialForm(DEFAULT_SETTINGS.defaultDpi))
          clearAllStorage()
          useAccounts.getState().wipe()
          clearPersistentTools()
          toast.success(message)
        }}
      />
    </>
  )
}
