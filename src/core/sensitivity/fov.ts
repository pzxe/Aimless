import type { FovType } from './types'

const DEG = Math.PI / 180

/** Convert a displayed FOV value to the actual vertical FOV in degrees. */
export function toVerticalFov(value: number, type: FovType, aspect: number): number {
  switch (type) {
    case 'vertical':
      return value
    case 'horizontal':
      return (2 * Math.atan(Math.tan((value * DEG) / 2) / aspect)) / DEG
    case 'horizontal-4:3':
      // Hor+ scaling: the number describes the horizontal FOV of a 4:3 frame.
      return (2 * Math.atan(Math.tan((value * DEG) / 2) / (4 / 3))) / DEG
  }
}

/** Actual horizontal FOV in degrees for a given vertical FOV and aspect ratio. */
export function horizontalFromVertical(verticalFov: number, aspect: number): number {
  return (2 * Math.atan(Math.tan((verticalFov * DEG) / 2) * aspect)) / DEG
}

/** Express a vertical FOV in the given display type. */
export function fromVerticalFov(verticalFov: number, type: FovType, aspect: number): number {
  switch (type) {
    case 'vertical':
      return verticalFov
    case 'horizontal':
      return horizontalFromVertical(verticalFov, aspect)
    case 'horizontal-4:3':
      return horizontalFromVertical(verticalFov, 4 / 3)
  }
}

/** Real horizontal and vertical FOV for a game's displayed FOV at a resolution. */
export function actualFov(value: number, type: FovType, width: number, height: number) {
  const aspect = width / height
  const vertical = toVerticalFov(value, type, aspect)
  return { horizontal: horizontalFromVertical(vertical, aspect), vertical }
}

/** Convert a displayed FOV between two FOV types at the same aspect ratio. */
export function convertFov(value: number, from: FovType, to: FovType, width: number, height: number): number {
  const aspect = width / height
  return fromVerticalFov(toVerticalFov(value, from, aspect), to, aspect)
}

export function isValidResolution(width: number, height: number): boolean {
  return Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0 && width <= 16384 && height <= 16384
}

export function isValidFov(value: number): boolean {
  return Number.isFinite(value) && value > 0 && value < 180
}
