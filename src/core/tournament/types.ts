export type TournamentFormat = 'single' | 'double'
export type TournamentMode = '1v1' | '5v5'
export type BracketSide = 'upper' | 'lower' | 'grand'
export type BestOf = 1 | 3 | 5 | 7

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
}

export interface Tournament {
  id: string
  name: string
  gameId: string | null
  mode: TournamentMode
  format: TournamentFormat
  bestOf: BestOf
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
  mode: TournamentMode
  format: TournamentFormat
  bestOf: BestOf
  grandFinalReset: boolean
  participants: { name: string; members?: string[] }[]
  seeding: 'manual' | 'random'
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
