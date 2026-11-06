import { useEffect, useMemo } from 'react'
import { convertSensitivity, parseNumber, type ConversionResult } from '@/core/sensitivity'
import { useConverter } from '@/store/converterStore'
import { useHistory } from '@/store/historyStore'
import { useSettings } from '@/store/settingsStore'

const HISTORY_DELAY_MS = 1200

/**
 * Runs the converter on the current form. A conversion is recorded in history once
 * the inputs have been stable for a moment, so typing doesn't flood the list.
 */
export function useConversion({ recordHistory = true } = {}) {
  const form = useConverter()
  const calibrations = useSettings((s) => s.calibrations)
  const record = useHistory((s) => s.record)

  const parsed = useMemo(
    () => ({
      sourceGameId: form.sourceGameId,
      targetGameId: form.targetGameId,
      sourceSensitivity: parseNumber(form.sourceSensitivity),
      sourceDpi: parseNumber(form.sourceDpi),
      targetDpi: parseNumber(form.targetDpi),
    }),
    [form.sourceGameId, form.targetGameId, form.sourceSensitivity, form.sourceDpi, form.targetDpi],
  )

  const result: ConversionResult = useMemo(() => convertSensitivity(parsed, calibrations), [parsed, calibrations])
  const isEmpty = form.sourceSensitivity.trim() === ''

  useEffect(() => {
    if (!recordHistory || !result.ok) return
    const id = setTimeout(() => {
      record({
        sourceGameId: result.source.gameId,
        sourceSensitivity: result.source.sensitivity,
        sourceDpi: result.source.dpi,
        targetGameId: result.target.gameId,
        targetDpi: result.target.dpi,
        targetSensitivity: result.target.sensitivity,
        cm360: result.source.cm360,
        accuracy: result.accuracy === 'unsupported' ? 'approximate' : result.accuracy,
      })
    }, HISTORY_DELAY_MS)
    return () => clearTimeout(id)
  }, [result, recordHistory, record])

  return { form, parsed, result, isEmpty }
}
