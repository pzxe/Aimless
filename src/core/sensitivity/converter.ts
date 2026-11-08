import { cmPer360, inchesPer360 } from './cm360'
import { calculateEdpi, isEdpiComparable } from './edpi'
import { degreesPerCount, sensitivityForDegreesPerCount } from './formulas'
import { getGame, resolveFormula, type ResolvedFormula } from './gameDatabase'
import { roundToStep } from './rounding'
import type {
  CalibrationMap,
  ConversionInput,
  ConversionResult,
  GameDefinition,
  ResultAccuracy,
  SideResult,
} from './types'
import { validateConversionInput, validateDpi, validateSensitivity } from './validation'

const ACCURACY_RANK: Record<ResultAccuracy, number> = {
  verified: 3,
  calibrated: 2,
  approximate: 1,
  unsupported: 0,
}

/** The weaker of two accuracy levels. */
export function weakestAccuracy(a: ResultAccuracy, b: ResultAccuracy): ResultAccuracy {
  return ACCURACY_RANK[a] <= ACCURACY_RANK[b] ? a : b
}

/** Describe one side (game + DPI + sensitivity) of a conversion. */
export function describeSide(
  game: GameDefinition,
  resolved: ResolvedFormula,
  dpi: number,
  sensitivity: number,
): SideResult {
  const dpc = degreesPerCount(resolved.formula, sensitivity)
  return {
    gameId: game.id,
    dpi,
    sensitivity,
    edpi: calculateEdpi(dpi, sensitivity),
    degreesPerCount: dpc,
    cm360: cmPer360(dpc, dpi),
    inches360: inchesPer360(dpc, dpi),
    accuracy: resolved.accuracy,
  }
}

/**
 * Convert a sensitivity from one game to another so that a full 360° turn needs the
 * same physical mouse distance (hipfire). Pure and deterministic.
 *
 * Steps:
 *  1. validate input;
 *  2. resolve each game's formula (user calibration > built-in constant);
 *  3. source degrees per count → source cm/360;
 *  4. target degrees per count = source degrees per count × sourceDPI / targetDPI;
 *  5. invert the target formula to get the target sensitivity.
 */
export function convertSensitivity(input: ConversionInput, calibrations: CalibrationMap = {}): ConversionResult {
  const issues = validateConversionInput(input)
  const sourceGame = getGame(input.sourceGameId)
  const targetGame = getGame(input.targetGameId)

  const sourceFormula = sourceGame ? resolveFormula(sourceGame, calibrations) : null
  const targetFormula = targetGame ? resolveFormula(targetGame, calibrations) : null
  const unsupported: string[] = []
  if (sourceGame && !sourceFormula) unsupported.push(sourceGame.id)
  if (targetGame && !targetFormula && targetGame.id !== sourceGame?.id) unsupported.push(targetGame.id)

  if (issues.length > 0 || !sourceGame || !targetGame || !sourceFormula || !targetFormula) {
    return { ok: false, issues, unsupported }
  }

  const source = describeSide(sourceGame, sourceFormula, input.sourceDpi, input.sourceSensitivity)

  // Same physical rotation per inch: degrees/inch must match on both sides.
  const targetDegreesPerCount = (source.degreesPerCount * input.sourceDpi) / input.targetDpi
  const targetSensitivity = sensitivityForDegreesPerCount(targetFormula.formula, targetDegreesPerCount)
  const target = describeSide(targetGame, targetFormula, input.targetDpi, targetSensitivity)

  let targetRounded: { sensitivity: number; cm360: number; errorPercent: number } | undefined
  if (targetGame.sensitivityStep) {
    const rounded = roundToStep(targetSensitivity, targetGame.sensitivityStep)
    if (rounded > 0 && Math.abs(rounded - targetSensitivity) > 1e-12) {
      const roundedCm = cmPer360(degreesPerCount(targetFormula.formula, rounded), input.targetDpi)
      targetRounded = {
        sensitivity: rounded,
        cm360: roundedCm,
        errorPercent: ((roundedCm - target.cm360) / target.cm360) * 100,
      }
    }
  }

  const notes = new Set<string>(['note.hipfireOnly'])
  const sameYaw =
    sourceFormula.formula.kind === 'linear' &&
    targetFormula.formula.kind === 'linear' &&
    isEdpiComparable(sourceFormula.formula.yaw, targetFormula.formula.yaw)
  if (!sameYaw || !sourceGame.edpiComparable || !targetGame.edpiComparable) notes.add('note.edpiNotComparable')
  if (sourceFormula.accuracy === 'calibrated' || targetFormula.accuracy === 'calibrated') notes.add('note.calibrated')
  if (
    (sourceFormula.accuracy === 'calibrated' && sourceGame.nonLinearSlider) ||
    (targetFormula.accuracy === 'calibrated' && targetGame.nonLinearSlider)
  ) {
    notes.add('note.calibratedNonLinear')
  }
  if (sourceFormula.accuracy === 'approximate') notes.add(sourceGame.noteKey)
  if (targetFormula.accuracy === 'approximate') notes.add(targetGame.noteKey)

  return {
    ok: true,
    source,
    target,
    targetRounded,
    accuracy: weakestAccuracy(source.accuracy, target.accuracy),
    notes: [...notes],
  }
}

/** Describe a single game setting (used by the comparison view and profiles). */
export function describeSetting(
  gameId: string,
  dpi: number,
  sensitivity: number,
  calibrations: CalibrationMap = {},
): SideResult | null {
  const game = getGame(gameId)
  if (!game) return null
  const resolved = resolveFormula(game, calibrations)
  // Same limits as the converter: an absurd value must read as "no result", never as NaN or Infinity on screen.
  if (!resolved || validateDpi(dpi) !== null || validateSensitivity(sensitivity) !== null) return null
  const side = describeSide(game, resolved, dpi, sensitivity)
  return [side.edpi, side.degreesPerCount, side.cm360, side.inches360].every(Number.isFinite) ? side : null
}

/** Sensitivity needed in a game to reach a target cm/360 at a given DPI. */
export function sensitivityForCm360(
  gameId: string,
  cm360: number,
  dpi: number,
  calibrations: CalibrationMap = {},
): number | null {
  const game = getGame(gameId)
  if (!game || !(cm360 > 0) || !(dpi > 0)) return null
  const resolved = resolveFormula(game, calibrations)
  if (!resolved) return null
  const dpc = (360 * 2.54) / (cm360 * dpi)
  return sensitivityForDegreesPerCount(resolved.formula, dpc)
}
