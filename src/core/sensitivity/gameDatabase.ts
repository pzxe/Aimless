import { GAMES } from '@/data/games/games'
import type { CalibrationMap, GameDefinition, ResultAccuracy, SensitivityFormula } from './types'

const byId = new Map<string, GameDefinition>(GAMES.map((g) => [g.id, g]))

export function getAllGames(): readonly GameDefinition[] {
  return GAMES
}

export function getGame(id: string): GameDefinition | undefined {
  return byId.get(id)
}

export function isKnownGame(id: string): boolean {
  return byId.has(id)
}

export interface ResolvedFormula {
  formula: SensitivityFormula
  accuracy: ResultAccuracy
}

/**
 * The formula used for a game: a user calibration wins over the built-in constant;
 * unsupported games without a calibration resolve to null.
 */
export function resolveFormula(game: GameDefinition, calibrations: CalibrationMap = {}): ResolvedFormula | null {
  const calibrated = calibrations[game.id]
  if (typeof calibrated === 'number' && Number.isFinite(calibrated) && calibrated > 0) {
    return { formula: { kind: 'linear', yaw: calibrated }, accuracy: 'calibrated' }
  }
  if (!game.formula) return null
  return { formula: game.formula, accuracy: game.accuracy }
}

/** Yaw at sensitivity 1, or null when unknown. */
export function resolveYaw(game: GameDefinition, calibrations: CalibrationMap = {}): number | null {
  const r = resolveFormula(game, calibrations)
  if (!r) return null
  return r.formula.kind === 'linear' ? r.formula.yaw : null
}

export function getSupportedGames(calibrations: CalibrationMap = {}): GameDefinition[] {
  return GAMES.filter((g) => resolveFormula(g, calibrations) !== null)
}
