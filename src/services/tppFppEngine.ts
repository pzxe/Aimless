/**
 * Third-person (TPP) ⇄ first-person (FPP) sensitivity matching.
 *
 * Many games give each camera its own field of view, and a wider or narrower view makes the same turn look faster or
 * slower. To keep your aim consistent, the sensitivity of the other perspective is scaled by how its view differs:
 *
 *   rotation ratio  r = atan(p · tan(F_to / 2)) / atan(p · tan(F_from / 2))      (monitor-distance match at p)
 *   rotation ratio  r = tan(F_to / 2) / tan(F_from / 2)                           (p → 0: centre of the screen)
 *   rotation ratio  r = 1                                                         (same cm/360°)
 *
 * p is how far from the centre of the screen the match is made (0 = centre, 1 = the edge). Both FOVs are first brought
 * to the same axis (horizontal, at your aspect ratio). In a linear game the target sensitivity is `source × r`, and the
 * new cm/360° is `source cm/360° ÷ r`.
 *
 * What this does not model: the camera's distance behind the player. An orbiting third-person camera turns by the
 * same angle as the view whatever its distance, so distance changes how far away things look, not how fast you turn.
 * Games that apply their own hidden TPP/FPP scale are outside this maths: check the result in the game.
 */
import { actualFov, CM_PER_INCH, isValidFov, type FovType } from '@/core/sensitivity'
import { roundToStep } from '@/core/sensitivity/rounding'

export type Perspective = 'tpp' | 'fpp'

/** How the two perspectives are matched. `cm360` keeps the same distance for a full turn. */
export type MatchMethod = 'cm360' | 'center' | 'half' | 'edge'

/** Monitor-distance percentage for each method (null = no FOV scaling). */
export const MATCH_PERCENT: Record<MatchMethod, number | null> = { cm360: null, center: 0, half: 50, edge: 100 }
export const MATCH_METHODS: readonly MatchMethod[] = ['cm360', 'center', 'half', 'edge']

export const ASPECTS = { '16:9': 16 / 9, '16:10': 16 / 10, '4:3': 4 / 3, '21:9': 21 / 9 } as const
export type AspectKey = keyof typeof ASPECTS

export const opposite = (p: Perspective): Perspective => (p === 'tpp' ? 'fpp' : 'tpp')

export interface PerspectiveInput {
  /** Degrees per count at sensitivity 1 (from the game database or the user's calibration). */
  yaw: number
  /** What the game's FOV number measures. */
  fovType: FovType
  aspect: number
  /** The perspective you already have a sensitivity for. */
  from: Perspective
  sensitivity: number
  dpi: number
  /** FOV of each camera, as the game displays it. */
  fov: Record<Perspective, number>
  method: MatchMethod
  /** The game's smallest sensitivity step, to also give the nearest value you can type in. */
  step?: number
}

export type PerspectiveIssue = 'yaw' | 'sensitivity' | 'dpi' | 'fov_from' | 'fov_to' | 'aspect'

export interface PerspectiveSide {
  perspective: Perspective
  /** FOV as the game displays it. */
  fov: number
  /** The same view as a horizontal FOV at the chosen aspect ratio. */
  horizontalFov: number
  sensitivity: number
  degreesPerCount: number
  cm360: number
  edpi: number
}

export type PerspectiveResult =
  | {
      ok: true
      from: PerspectiveSide
      to: PerspectiveSide
      method: MatchMethod
      /** Target rotation ÷ source rotation: the multiplier applied to the sensitivity. */
      rotationRatio: number
      /** How much bigger things look in the target view (tan(F_from/2) ÷ tan(F_to/2)). */
      fovMultiplier: number
      rounded?: { sensitivity: number; cm360: number; errorPercent: number }
    }
  | { ok: false; issues: PerspectiveIssue[] }

const RAD = Math.PI / 180

export function validatePerspective(i: PerspectiveInput): PerspectiveIssue[] {
  const issues: PerspectiveIssue[] = []
  if (!(i.yaw > 0) || !Number.isFinite(i.yaw)) issues.push('yaw')
  if (!(i.sensitivity > 0) || !Number.isFinite(i.sensitivity)) issues.push('sensitivity')
  if (!(i.dpi > 0) || !Number.isFinite(i.dpi)) issues.push('dpi')
  if (!isValidFov(i.fov[i.from])) issues.push('fov_from')
  if (!isValidFov(i.fov[opposite(i.from)])) issues.push('fov_to')
  if (!(i.aspect > 0) || !Number.isFinite(i.aspect)) issues.push('aspect')
  return issues
}

/** The view's horizontal FOV at the aspect ratio, whatever axis the game measures its FOV on. */
export function horizontalFovOf(value: number, type: FovType, aspect: number): number {
  return actualFov(value, type, aspect * 1000, 1000).horizontal
}

/** Rotation multiplier from a view with `fromH` degrees of horizontal FOV to one with `toH`. */
export function rotationRatio(fromH: number, toH: number, method: MatchMethod): number {
  const percent = MATCH_PERCENT[method]
  if (percent === null) return 1
  const a = Math.tan((fromH * RAD) / 2)
  const b = Math.tan((toH * RAD) / 2)
  if (percent === 0) return b / a
  const p = percent / 100
  return Math.atan(p * b) / Math.atan(p * a)
}

const cm360Of = (yaw: number, sens: number, dpi: number) => (360 * CM_PER_INCH) / (yaw * sens * dpi)

export function convertPerspective(i: PerspectiveInput): PerspectiveResult {
  const issues = validatePerspective(i)
  if (issues.length) return { ok: false, issues }
  const to = opposite(i.from)
  const fromH = horizontalFovOf(i.fov[i.from], i.fovType, i.aspect)
  const toH = horizontalFovOf(i.fov[to], i.fovType, i.aspect)
  const ratio = rotationRatio(fromH, toH, i.method)
  const side = (perspective: Perspective, sens: number, h: number): PerspectiveSide => ({
    perspective,
    fov: i.fov[perspective],
    horizontalFov: h,
    sensitivity: sens,
    degreesPerCount: i.yaw * sens,
    cm360: cm360Of(i.yaw, sens, i.dpi),
    edpi: sens * i.dpi,
  })
  const targetSens = i.sensitivity * ratio
  const result: PerspectiveResult = {
    ok: true,
    from: side(i.from, i.sensitivity, fromH),
    to: side(to, targetSens, toH),
    method: i.method,
    rotationRatio: ratio,
    fovMultiplier: Math.tan((fromH * RAD) / 2) / Math.tan((toH * RAD) / 2),
  }
  if (i.step && i.step > 0) {
    const sens = roundToStep(targetSens, i.step)
    if (sens > 0) {
      const cm360 = cm360Of(i.yaw, sens, i.dpi)
      result.rounded = { sensitivity: sens, cm360, errorPercent: Math.abs(cm360 / result.to.cm360 - 1) * 100 }
    }
  }
  return result
}
