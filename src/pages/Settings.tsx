import { Database, Laptop, Moon, Palette, SlidersHorizontal, Sun, Trash2, RotateCcw, Info } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/Dialog'
import { NumberField } from '@/components/ui/Field'
import { Segmented } from '@/components/ui/Segmented'
import { parseNumber, validateDpi } from '@/core/sensitivity'
import { useT } from '@/i18n'
import { initialForm, useConverter } from '@/store/converterStore'
import { useHistory } from '@/store/historyStore'
import { useProfiles } from '@/store/profilesStore'
import { DEFAULT_SETTINGS, useSettings } from '@/store/settingsStore'
import type { FovDisplay, Language, Theme } from '@/store/types'
import { clearAllStorage } from '@/utils/storage'

function Row({ label, hint, children }: { label: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

export default function SettingsPage() {
  const t = useT()
  const s = useSettings()
  const [dpiText, setDpiText] = useState(String(s.defaultDpi))
  const [confirm, setConfirm] = useState<'reset' | 'clear' | null>(null)

  useEffect(() => setDpiText(String(s.defaultDpi)), [s.defaultDpi])
  const dpiErr = validateDpi(parseNumber(dpiText))

  return (
    <>
      <PageHeader title={t('settings.title')} description={t('settings.subtitle')} />
      <div className="grid max-w-3xl gap-3">
        <Card>
          <CardHeader title={t('settings.appearance')} icon={<Palette />} />
          <CardBody className="divide-y divide-border">
            <Row label={t('settings.language')}>
              <Segmented<Language>
                label={t('settings.language')}
                value={s.language}
                onChange={(language) => s.set({ language })}
                options={[
                  { value: 'en', label: 'English' },
                  { value: 'ar', label: 'العربية' },
                ]}
              />
            </Row>
            <Row label={t('settings.theme')}>
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
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t('settings.defaults')} icon={<SlidersHorizontal />} />
          <CardBody className="divide-y divide-border">
            <Row label={t('settings.precision')} hint={t('settings.precisionHint')}>
              <Segmented
                label={t('settings.precision')}
                value={String(s.precision)}
                onChange={(v) => s.set({ precision: Number(v) })}
                options={['2', '3', '4', '5', '6'].map((v) => ({ value: v, label: <span className="num">{v}</span> }))}
              />
            </Row>
            <Row label={t('settings.defaultDpi')} hint={t('settings.defaultDpiHint')}>
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
            <Row label={t('settings.fovDisplay')} hint={t('settings.fovDisplayHint')}>
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
          s.set({
            language: DEFAULT_SETTINGS.language,
            theme: DEFAULT_SETTINGS.theme,
            precision: DEFAULT_SETTINGS.precision,
            defaultDpi: DEFAULT_SETTINGS.defaultDpi,
            fovDisplay: DEFAULT_SETTINGS.fovDisplay,
          })
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
          useSettings.getState().reset()
          useConverter.getState().load(initialForm(DEFAULT_SETTINGS.defaultDpi))
          clearAllStorage()
          toast.success(message)
        }}
      />
    </>
  )
}
