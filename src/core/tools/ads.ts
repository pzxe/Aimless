/**
 * Scoped / ADS sensitivity from FOV change.
 *
 * Monitor distance match at p (0 < p ≤ 1, as a fraction of the half-screen along the FOV axis):
 *   ratio = atan(p · tan(zoom/2)) / atan(p · tan(hip/2))
 * At p → 0 this becomes the focal-length (0 %) match:
 *   ratio = tan(zoom/2) / tan(hip/2)
 *
 * Both FOVs must be measured on the same axis. The ratio is a multiplier on hipfire
 * rotation; games apply ADS settings differently (some already scale by FOV), so the
 * result is a starting point, not a per-game setting.
 */
const RAD = Math.PI / 180

export function isValidFovDeg(fov: number): boolean {
  return Number.isFinite(fov) && fov > 0 && fov < 180
}

/** Multiplier on hipfire rotation for a given monitor-distance percentage (0–100). */
export function zoomSensitivityRatio(hipFov: number, zoomFov: number, monitorDistancePercent = 0): number | null {
  if (!isValidFovDeg(hipFov) || !isValidFovDeg(zoomFov)) return null
  if (!(monitorDistancePercent >= 0 && monitorDistancePercent <= 100)) return null
  const th = Math.tan((hipFov * RAD) / 2)
  const tz = Math.tan((zoomFov * RAD) / 2)
  const p = monitorDistancePercent / 100
  if (p === 0) return tz / th
  return Math.atan(p * tz) / Math.atan(p * th)
}

/** Optical magnification of a zoom level (e.g. 4 for a "4x" scope). */
export function magnification(hipFov: number, zoomFov: number): number | null {
  if (!isValidFovDeg(hipFov) || !isValidFovDeg(zoomFov)) return null
  return Math.tan((hipFov * RAD) / 2) / Math.tan((zoomFov * RAD) / 2)
}

/** Zoomed FOV that produces a given magnification. */
export function zoomFovFromMagnification(hipFov: number, mag: number): number | null {
  if (!isValidFovDeg(hipFov) || !(mag > 0) || !Number.isFinite(mag)) return null
  return (2 * Math.atan(Math.tan((hipFov * RAD) / 2) / mag)) / RAD
}
