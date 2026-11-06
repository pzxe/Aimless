import { MAX_SERIES } from '@/core/tournament'
import { useT } from '@/i18n'
import { Select } from '../ui/Field'

const LENGTHS = Array.from({ length: (MAX_SERIES + 1) / 2 }, (_, i) => i * 2 + 1)

/** Series length picker: Bo1 … Bo15. With `allowDefault`, an empty value means "use the default". */
export function SeriesSelect({
  value,
  onChange,
  label,
  allowDefault = false,
  defaultValue,
  className,
}: {
  value: number | null
  onChange: (v: number | null) => void
  label: string
  allowDefault?: boolean
  defaultValue?: number
  className?: string
}) {
  const t = useT()
  return (
    <Select
      aria-label={label}
      value={value === null ? '' : String(value)}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      className={className}
    >
      {allowDefault && <option value="">{t('tournament.series.useDefault', { n: defaultValue ?? 1 })}</option>}
      {LENGTHS.map((n) => (
        <option key={n} value={n}>
          {t('tournament.bestOf', { n })}
        </option>
      ))}
    </Select>
  )
}
