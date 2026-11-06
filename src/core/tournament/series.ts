import { roundCounts } from './generate'
import type { GameInput, MatchDef, StageKey, Tournament, TournamentError } from './types'

export const MAX_SERIES = 15
export const MAX_TEAM_SIZE = 10
export const STAGE_KEYS: StageKey[] = ['early', 'quarterfinal', 'semifinal', 'final', 'lower', 'grandFinal']

/** A series is best of an odd number of games (1, 3, 5 … 15). */
export function isValidBestOf(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= MAX_SERIES && n % 2 === 1
}

export function isValidTeamSize(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= MAX_TEAM_SIZE
}

/** Games a side must win to take the series. */
export function winsNeeded(bestOf: number): number {
  return Math.floor(bestOf / 2) + 1
}

/** Which stage a match belongs to, for per-stage series lengths. */
export function stageOf(t: Pick<Tournament, 'matches'>, def: Pick<MatchDef, 'side' | 'round'>): StageKey {
  if (def.side === 'grand') return 'grandFinal'
  if (def.side === 'lower') return 'lower'
  const fromEnd = roundCounts(t.matches).upper - def.round
  if (fromEnd === 0) return 'final'
  if (fromEnd === 1) return 'semifinal'
  if (fromEnd === 2) return 'quarterfinal'
  return 'early'
}

/** Series length of a match: its stage's override, else the tournament default. */
export function bestOfFor(t: Pick<Tournament, 'matches' | 'bestOf' | 'stageBestOf'>, def: Pick<MatchDef, 'side' | 'round'>): number {
  const override = t.stageBestOf?.[stageOf(t, def)]
  return isValidBestOf(override) ? override : t.bestOf
}

export interface SeriesState {
  wins: [number, number]
  winner: 0 | 1 | null
  /** True once a side has reached the wins it needs. */
  decided: boolean
}

/**
 * Score a series game by game. Each game is won by the higher score. Games entered after
 * the series is already decided, ties and invalid scores are errors.
 */
export function seriesFromGames(games: GameInput[], bestOf: number): { ok: true; value: SeriesState } | { ok: false; error: TournamentError } {
  if (!isValidBestOf(bestOf)) return { ok: false, error: 'invalid_series' }
  if (games.length > bestOf) return { ok: false, error: 'game_after_decided' }
  const need = winsNeeded(bestOf)
  const wins: [number, number] = [0, 0]
  for (const g of games) {
    if (wins[0] >= need || wins[1] >= need) return { ok: false, error: 'game_after_decided' }
    const [a, b] = g.score
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0 || a > 999 || b > 999) return { ok: false, error: 'invalid_game' }
    if (a === b) return { ok: false, error: 'tied_score' }
    wins[a > b ? 0 : 1]++
  }
  const winner = wins[0] >= need ? 0 : wins[1] >= need ? 1 : null
  return { ok: true, value: { wins, winner, decided: winner !== null } }
}
