/**
 * Polling rate maths. A mouse reports movement once per poll; at a given hand speed and
 * DPI this decides how many counts arrive in each report.
 */
export const POLLING_RATES = [125, 500, 1000, 2000, 4000, 8000] as const

export interface PollStats {
  hz: number
  /** Time between reports in milliseconds. */
  intervalMs: number
  /** Counts per report at the given hand speed. */
  countsPerPoll: number
  /** Hand speed (cm/s) below which some reports carry no movement. */
  minSpeedCmS: number
}

export function pollStats(dpi: number, hz: number, speedCmPerS: number): PollStats | null {
  if (!(dpi > 0) || !(hz > 0) || !(speedCmPerS >= 0) || ![dpi, hz, speedCmPerS].every(Number.isFinite)) return null
  const countsPerSecond = (speedCmPerS / 2.54) * dpi
  return {
    hz,
    intervalMs: 1000 / hz,
    countsPerPoll: countsPerSecond / hz,
    minSpeedCmS: (hz * 2.54) / dpi,
  }
}
