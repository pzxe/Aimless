/**
 * eDPI = mouse DPI × in-game sensitivity.
 *
 * eDPI is only comparable between games that share the same yaw constant
 * (e.g. CS2 ↔ Apex ↔ TF2, or Overwatch 2 ↔ Call of Duty). Between other games,
 * compare cm/360° instead.
 */
export function calculateEdpi(dpi: number, sensitivity: number): number {
  return dpi * sensitivity
}

/** Two games' eDPI values can be compared directly only when their yaw is identical. */
export function isEdpiComparable(yawA: number | null, yawB: number | null): boolean {
  if (yawA === null || yawB === null) return false
  return Math.abs(yawA - yawB) < 1e-12
}
