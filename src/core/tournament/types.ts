export type TournamentFormat = 'single' | 'double'
/** Legacy (v2.0) mode field, still accepted on import. */
export type TournamentMode = '1v1' | '5v5'
export type BracketSide = 'upper' | 'lower' | 'grand'
/** Series length: best of an odd number of games (1–15). */
export type BestOf = number

/** Stages that can have their own series length. */
export type StageKey = 'early' | 'quarterfinal' | 'semifinal' | 'final' | 'lower' | 'grandFinal'

/** One game (map) of a series as entered by the user. */
export interface GameInput {
  map?: string
  score: [number, number]
  overtime?: boolean
}

export interface GameRecord {
  map: string
  score: [number, number]
  overtime: boolean
  winner: 0 | 1
}

export interface Participant {
  id: string
  name: string
  /** Optional roster (team formats). */
  members: string[]
}

/** Where a match slot gets its participant from. */
export type SlotSource = { type: 'seed'; seed: number } | { type: 'winner' | 'loser'; matchId: string }

export interface MatchDef {
  id: string
  side: BracketSide
  /** 1-based round within its side. */
  round: number
  /** 0-based position within the round. */
  index: number
  sources: [SlotSource, SlotSource]
  /** Grand-final bracket reset: only played if the lower-bracket finalist wins the grand final. */
  isReset?: boolean
}

export interface MatchResult {
  /** The two participant ids the result was recorded for (slot order). */
  participants: [string, string]
  score: [number, number]
  winner: 0 | 1
  note?: string
  /** Game-by-game breakdown, when entered. `score` is then the series score (games won). */
  games?: GameRecord[]
}

export interface Tournament {
  id: string
  name: string
  gameId: string | null
  /** Players per side: 1 = solo, 2 = duo, up to 10. */
  teamSize: number
  format: TournamentFormat
  /** Default series length. */
  bestOf: BestOf
  /** Per-stage series lengths that override `bestOf`. */
  stageBestOf: Partial<Record<StageKey, number>>
  grandFinalReset: boolean
  /** In seed order: index 0 is seed 1. */
  participants: Participant[]
  bracketSize: number
  matches: MatchDef[]
  results: Record<string, MatchResult>
  /** Custom round names, keyed `${side}:${round}`. */
  roundLabels: Record<string, string>
  createdAt: number
  updatedAt: number
}

export type SlotState = { kind: 'filled'; id: string } | { kind: 'pending' } | { kind: 'empty' }

/**
 * pending:  waiting for an earlier match
 * ready:    both participants known, no result yet
 * done:     result recorded
 * walkover: one participant, the other slot can never be filled (bye)
 * void:     neither slot can be filled (or a bracket reset that is not needed)
 */
export type MatchStatus = 'pending' | 'ready' | 'done' | 'walkover' | 'void'

export interface ResolvedMatch {
  def: MatchDef
  slots: [SlotState, SlotState]
  status: MatchStatus
  winnerId: string | null
  loserId: string | null
  result: MatchResult | null
}

export interface ResolvedTournament {
  matches: Map<string, ResolvedMatch>
  championId: string | null
  runnerUpId: string | null
  /** Matches waiting for a score. */
  readyCount: number
  doneCount: number
  /** Matches that are (or will be) actually played: excludes walkovers and voids. */
  playableCount: number
}

export interface NewTournamentInput {
  name: string
  gameId: string | null
  teamSize: number
  format: TournamentFormat
  bestOf: BestOf
  stageBestOf?: Partial<Record<StageKey, number>>
  grandFinalReset: boolean
  participants: { name: string; members?: string[] }[]
  /** Order of entry is the seed order unless 'random'. */
  seeding?: 'manual' | 'random'
}

export type TournamentError =
  | 'name_required'
  | 'too_few'
  | 'too_many'
  | 'duplicate_names'
  | 'empty_name'
  | 'match_not_ready'
  | 'invalid_score'
  | 'tied_score'
  | 'unknown_match'
  | 'has_results'
  | 'invalid_file'
  | 'too_large'
  | 'invalid_team_size'
  | 'invalid_series'
  | 'invalid_game'
  | 'game_after_decided'
  | 'series_incomplete'
