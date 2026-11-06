import { BarChart3, Plus, Trash2, Wand2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AccuracyBadge } from '@/components/games/AccuracyBadge'
import { GameSelector } from '@/components/games/GameSelector'
import { gameName } from '@/components/games/GameBadge'
import { EmptyState, PageHeader } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { NumberField, Select } from '@/components/ui/Field'
import { describeSetting, getGame, parseNumber, sensitivityForCm360, type SideResult } from '@/core/sensitivity'
import { useFormat } from '@/hooks/useFormat'
import { useGameAccuracy } from '@/hooks/useGameAccuracy'
import { useT } from '@/i18n'
import { useConverter } from '@/store/converterStore'
import { useProfiles } from '@/store/profilesStore'
import { useSettings } from '@/store/settingsStore'
import { createId } from '@/utils/id'
import { cn } from '@/utils/cn'

interface Row {
  id: string
  gameId: string
  dpi: string
  sens: string
  label?: string
}

const MAX_ROWS = 12

function initialRows(): Row[] {
  const c = useConverter.getState()
  return [
    { id: createId(), gameId: c.sourceGameId, dpi: c.sourceDpi, sens: c.sourceSensitivity || '1' },
    { id: createId(), gameId: c.targetGameId, dpi: c.targetDpi, sens: '' },
  ]
}

function trimNumber(n: number, decimals: number) {
  return String(Number(n.toFixed(decimals)))
}

export default function ComparePage() {
  const t = useT()
  const f = useFormat()
  const calibrations = useSettings((s) => s.calibrations)
  const precision = useSettings((s) => s.precision)
  const defaultDpi = useSettings((s) => s.defaultDpi)
  const profiles = useProfiles((s) => s.profiles)
  const accuracyOf = useGameAccuracy()
  const [rows, setRows] = useState<Row[]>(initialRows)

  const computed = useMemo(
    () =>
      rows.map((r) => ({
        row: r,
        result: describeSetting(r.gameId, parseNumber(r.dpi), parseNumber(r.sens), calibrations) as SideResult | null,
        supported: accuracyOf(r.gameId) !== 'unsupported',
      })),
    [rows, calibrations, accuracyOf],
  )
  const reference = computed[0]?.result ?? null
  const maxCm = Math.max(0, ...computed.map((c) => c.result?.cm360 ?? 0))

  const update = (id: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch, label: patch.label ?? (patch.gameId ? undefined : r.label) } : r)))
  const remove = (id: string) => setRows((rs) => rs.filter((r) => r.id !== id))
  const add = (row?: Partial<Row>) =>
    setRows((rs) =>
      rs.length >= MAX_ROWS
        ? rs
        : [...rs, { id: createId(), gameId: row?.gameId ?? 'valorant', dpi: row?.dpi ?? String(defaultDpi), sens: row?.sens ?? '', label: row?.label }],
    )

  const matchAll = () => {
    if (!reference) return
    setRows((rs) =>
      rs.map((r, i) => {
        if (i === 0) return r
        const dpi = parseNumber(r.dpi)
        const sens = sensitivityForCm360(r.gameId, reference.cm360, dpi, calibrations)
        return sens ? { ...r, sens: trimNumber(sens, Math.max(precision, 4)), label: undefined } : r
      }),
    )
  }

  return (
    <>
      <PageHeader
        title={t('compare.title')}
        description={t('compare.subtitle')}
        actions={
          <>
            {profiles.length > 0 && (
              <Select
                aria-label={t('compare.addProfile')}
                value=""
                className="w-48"
                disabled={rows.length >= MAX_ROWS}
                onChange={(e) => {
                  const p = profiles.find((x) => x.id === e.target.value)
                  if (p) add({ gameId: p.gameId, dpi: String(p.dpi), sens: String(p.sensitivity), label: p.name })
                }}
              >
                <option value="">{t('compare.addProfile')}</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {getGame(p.gameId)?.short}
                  </option>
                ))}
              </Select>
            )}
            <Button onClick={() => add()} disabled={rows.length >= MAX_ROWS}>
              <Plus />
              {t('compare.addRow')}
            </Button>
            <Button variant="primary" onClick={matchAll} disabled={!reference || rows.length < 2} title={t('compare.matchHint')}>
              <Wand2 />
              {t('compare.match')}
            </Button>
          </>
        }
      />

      {rows.length === 0 ? (
        <EmptyState icon={<BarChart3 />} title={t('compare.empty')} action={<Button onClick={() => add()}>{t('compare.addRow')}</Button>} />
      ) : (
        <>
          <Card className="overflow-hidden">
            {/* Header row (desktop) */}
            <div className="hidden xl:grid xl:grid-cols-[minmax(180px,1.6fr)_88px_104px_80px_88px_72px_108px_32px] gap-3 border-b border-border bg-surface-2/50 px-4 py-2.5 text-[11px] font-medium tracking-wide text-subtle uppercase">
              <span>{t('common.game')}</span>
              <span>{t('common.dpi')}</span>
              <span>{t('common.sensitivity')}</span>
              <span>{t('common.edpi')}</span>
              <span>{t('common.cm360')}</span>
              <span>{t('compare.diff')}</span>
              <span>{t('common.accuracy')}</span>
              <span />
            </div>
            <ul className="divide-y divide-border">
              {computed.map(({ row, result, supported }, i) => {
                const diff = reference && result && i > 0 ? ((result.cm360 - reference.cm360) / reference.cm360) * 100 : null
                const sensInvalid = row.sens.trim() !== '' && !(parseNumber(row.sens) > 0)
                const dpiInvalid = !(parseNumber(row.dpi) > 0)
                return (
                  <li
                    key={row.id}
                    className="grid grid-cols-2 items-center gap-3 px-4 py-3 sm:grid-cols-4 xl:grid-cols-[minmax(180px,1.6fr)_88px_104px_80px_88px_72px_108px_32px]"
                  >
                    <div className="col-span-2 xl:col-span-1">
                      <div className="mb-1 flex items-center gap-2 text-[11px] text-subtle">
                        {i === 0 && <span className="rounded bg-accent-soft px-1.5 py-0.5 font-medium text-accent">{t('compare.reference')}</span>}
                        {row.label && <span className="truncate">{row.label}</span>}
                      </div>
                      <GameSelector value={row.gameId} onChange={(id) => update(row.id, { gameId: id })} label={t('common.game')} />
                    </div>
                    <NumberField
                      label={<span className="xl:sr-only">{t('common.dpi')}</span>}
                      value={row.dpi}
                      inputMode="numeric"
                      onValueChange={(v) => update(row.id, { dpi: v })}
                      aria-invalid={dpiInvalid || undefined}
                    />
                    <NumberField
                      label={<span className="xl:sr-only">{t('common.sensitivity')}</span>}
                      value={row.sens}
                      onValueChange={(v) => update(row.id, { sens: v })}
                      aria-invalid={sensInvalid || undefined}
                      placeholder="—"
                    />
                    <Metric label={t('common.edpi')} value={result ? f.edpi(result.edpi) : '—'} />
                    <Metric label={t('common.cm360')} value={result ? f.cm(result.cm360) : '—'} strong />
                    <Metric
                      label={t('compare.diff')}
                      value={diff === null ? (i === 0 ? '' : '—') : Math.abs(diff) < 0.05 ? '0%' : `${diff > 0 ? '+' : ''}${f.num(diff, 1)}%`}
                      className={cn(diff !== null && Math.abs(diff) < 0.5 && 'text-success', diff !== null && Math.abs(diff) >= 5 && 'text-warning')}
                    />
                    <div className="flex items-center">
                      {supported ? (
                        <AccuracyBadge accuracy={accuracyOf(row.gameId)} />
                      ) : (
                        <span className="text-xs text-danger">{t('compare.unsupported')}</span>
                      )}
                    </div>
                    <div className="flex justify-end">
                      <Button variant="ghost" size="icon-sm" onClick={() => remove(row.id)} aria-label={t('compare.remove')}>
                        <Trash2 />
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </Card>
          <p className="mt-2 text-xs text-subtle">{t('compare.matchHint')}</p>

          {maxCm > 0 && (
            <Card className="mt-3">
              <CardHeader title={t('compare.chart')} icon={<BarChart3 />} />
              <CardBody>
                <ul className="space-y-2.5" role="list">
                  {computed.map(({ row, result }) =>
                    result ? (
                      <li key={row.id} className="grid grid-cols-[minmax(0,140px)_1fr_auto] items-center gap-3 text-xs sm:grid-cols-[200px_1fr_80px]">
                        <span className="truncate text-muted" title={gameName(row.gameId)}>
                          {row.label ? `${row.label} · ` : ''}
                          {gameName(row.gameId)}
                        </span>
                        <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
                          <div
                            className="h-full rounded-full transition-[width] duration-300"
                            style={{
                              width: `${(result.cm360 / maxCm) * 100}%`,
                              background: getGame(row.gameId)?.color ?? 'var(--c-accent)',
                            }}
                          />
                        </div>
                        <span className="ltr num text-end font-medium">{f.cm(result.cm360)} cm</span>
                      </li>
                    ) : null,
                  )}
                </ul>
              </CardBody>
            </Card>
          )}
        </>
      )}
    </>
  )
}

function Metric({ label, value, strong, className }: { label: string; value: string; strong?: boolean; className?: string }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 text-[11px] text-subtle xl:hidden">{label}</div>
      <div className={cn('ltr num truncate text-start text-sm', strong && 'font-semibold', className)}>{value}</div>
    </div>
  )
}
