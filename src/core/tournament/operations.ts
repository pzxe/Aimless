import { generateMatches, MAX_PARTICIPANTS, MIN_PARTICIPANTS, nextPowerOfTwo, roundCounts } from './generate'
import { resolveTournament } from './resolve'
import type {
  BestOf,
  BracketSide,
  NewTournamentInput,
  Participant,
  Tournament,
  TournamentError,
  TournamentFormat,
  TournamentMode,
} from './types'

export type Result<T> = { ok: true; value: T } | { ok: false; error: TournamentError }

const ok = <T>(value: T): Result<T> => ({ ok: true, value })
const fail = <T>(error: TournamentError): Result<T> => ({ ok: false, error })

const clean = (s: unknown, max: number) =>
  typeof s === 'string' ? s.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, max) : ''

let counter = 0
const defaultId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `t${Date.now().toString(36)}${(counter++).toString(36)}`

/** Fisher–Yates with an injectable random source (for tests). */
export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

export function validateNewTournament(input: NewTournamentInput): TournamentError | null {
  if (!clean(input.name, 80)) return 'name_required'
  const names = input.participants.map((p) => clean(p.name, 40))
  if (names.some((n) => !n)) return 'empty_name'
  if (names.length < MIN_PARTICIPANTS[input.format]) return 'too_few'
  if (names.length > MAX_PARTICIPANTS) return 'too_many'
  const lower = names.map((n) => n.toLocaleLowerCase())
  if (new Set(lower).size !== lower.length) return 'duplicate_names'
  return null
}

export function createTournament(
  input: NewTournamentInput,
  opts: { rng?: () => number; idFactory?: () => string; now?: number } = {},
): Result<Tournament> {
  const error = validateNewTournament(input)
  if (error) return fail(error)
  const makeId = opts.idFactory ?? defaultId
  const now = opts.now ?? Date.now()
  let participants: Participant[] = input.participants.map((p) => ({
    id: makeId(),
    name: clean(p.name, 40),
    members: (p.members ?? []).map((m) => clean(m, 40)).filter(Boolean).slice(0, 10),
  }))
  if (input.seeding === 'random') participants = shuffle(participants, opts.rng)
  const size = nextPowerOfTwo(Math.max(input.format === 'double' ? 4 : 2, participants.length))
  const grandFinalReset = input.format === 'double' && input.grandFinalReset
  return ok({
    id: makeId(),
    name: clean(input.name, 80),
    gameId: input.gameId,
    mode: input.mode,
    format: input.format,
    bestOf: input.bestOf,
    grandFinalReset,
    participants,
    bracketSize: size,
    matches: generateMatches(input.format, size, grandFinalReset),
    results: {},
    roundLabels: {},
    createdAt: now,
    updatedAt: now,
  })
}

/** Remove results that no longer apply (their participants changed upstream). */
export function pruneResults(t: Tournament): Tournament {
  // Results can depend on each other, so prune until stable.
  let current = t
  for (let pass = 0; pass < 8; pass++) {
    const resolved = resolveTournament(current)
    const keep: Tournament['results'] = {}
    for (const [id, r] of Object.entries(current.results)) {
      if (resolved.matches.get(id)?.status === 'done') keep[id] = r
    }
    if (Object.keys(keep).length === Object.keys(current.results).length) return current
    current = { ...current, results: keep }
  }
  return current
}

export function reportResult(t: Tournament, matchId: string, score: [number, number], note?: string, now = Date.now()): Result<Tournament> {
  const m = resolveTournament(t).matches.get(matchId)
  if (!m) return fail('unknown_match')
  if ((m.status !== 'ready' && m.status !== 'done') || m.slots[0].kind !== 'filled' || m.slots[1].kind !== 'filled') {
    return fail('match_not_ready')
  }
  if (!score.every((s) => Number.isInteger(s) && s >= 0 && s <= 999)) return fail('invalid_score')
  if (score[0] === score[1]) return fail('tied_score')
  const next: Tournament = {
    ...t,
    results: {
      ...t.results,
      [matchId]: {
        participants: [m.slots[0].id, m.slots[1].id],
        score,
        winner: score[0] > score[1] ? 0 : 1,
        ...(note ? { note: clean(note, 120) } : {}),
      },
    },
    updatedAt: now,
  }
  return ok(pruneResults(next))
}

export function clearResult(t: Tournament, matchId: string, now = Date.now()): Tournament {
  if (!(matchId in t.results)) return t
  const results = { ...t.results }
  delete results[matchId]
  return pruneResults({ ...t, results, updatedAt: now })
}

export function renameRound(t: Tournament, side: BracketSide, round: number, label: string, now = Date.now()): Tournament {
  const key = `${side}:${round}`
  const roundLabels = { ...t.roundLabels }
  const value = clean(label, 40)
  if (value) roundLabels[key] = value
  else delete roundLabels[key]
  return { ...t, roundLabels, updatedAt: now }
}

/** Change the seed order. Only allowed before any result is recorded. */
export function reseed(t: Tournament, participantIds: string[], now = Date.now()): Result<Tournament> {
  if (Object.keys(t.results).length > 0) return fail('has_results')
  const byId = new Map(t.participants.map((p) => [p.id, p]))
  if (participantIds.length !== t.participants.length || !participantIds.every((id) => byId.has(id))) {
    return fail('unknown_match')
  }
  return ok({ ...t, participants: participantIds.map((id) => byId.get(id)!), updatedAt: now })
}

export interface RoundLabel {
  /** i18n key of the default name. */
  key:
    | 'final' | 'semifinal' | 'quarterfinal' | 'round'
    | 'upperFinal' | 'upperSemifinal' | 'upperQuarterfinal' | 'upperRound'
    | 'lowerFinal' | 'lowerRound'
    | 'grandFinal' | 'grandFinalReset'
  n: number
  custom?: string
}

/** Default (or custom) name of a round. */
export function roundLabel(t: Tournament, side: BracketSide, round: number): RoundLabel {
  const custom = t.roundLabels[`${side}:${round}`]
  const counts = roundCounts(t.matches)
  let key: RoundLabel['key']
  if (side === 'grand') key = round === 1 ? 'grandFinal' : 'grandFinalReset'
  else if (side === 'lower') key = round === counts.lower ? 'lowerFinal' : 'lowerRound'
  else {
    const fromEnd = counts.upper - round
    const prefix = t.format === 'double'
    if (fromEnd === 0) key = prefix ? 'upperFinal' : 'final'
    else if (fromEnd === 1) key = prefix ? 'upperSemifinal' : 'semifinal'
    else if (fromEnd === 2) key = prefix ? 'upperQuarterfinal' : 'quarterfinal'
    else key = prefix ? 'upperRound' : 'round'
  }
  return { key, n: round, ...(custom ? { custom } : {}) }
}

// ---------------------------------------------------------------- import / export

export const TOURNAMENT_EXPORT_ID = 'aimless-tournament'
export const MAX_TOURNAMENT_IMPORT_BYTES = 1024 * 1024

export function exportTournament(t: Tournament) {
  return { app: TOURNAMENT_EXPORT_ID, version: 1, exportedAt: new Date().toISOString(), tournament: t }
}

const FORMATS: TournamentFormat[] = ['single', 'double']
const MODES: TournamentMode[] = ['1v1', '5v5']
const BEST_OF: BestOf[] = [1, 3, 5, 7]

/**
 * Parse an untrusted tournament file. The match graph is never taken from the file:
 * it is rebuilt from the format and participants, and only results that fit it are kept.
 */
export function importTournament(text: string, opts: ImportOptions = {}): Result<Tournament> {
  if (text.length > MAX_TOURNAMENT_IMPORT_BYTES) return fail('too_large')
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return fail('invalid_file')
  }
  return sanitizeTournament(data, opts)
}

export interface ImportOptions {
  idFactory?: () => string
  now?: number
  /** Keep the stored ids and timestamps (used when loading from local storage). */
  keepIds?: boolean
}

const SAFE_ID = /^[\w-]{1,64}$/

/** Validate an already-parsed tournament object. */
export function sanitizeTournament(data: unknown, opts: ImportOptions = {}): Result<Tournament> {
  const root = data as Record<string, unknown> | null
  const raw = (root && typeof root === 'object' && 'tournament' in root ? root.tournament : root) as Record<string, unknown> | null
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fail('invalid_file')
  if (root && 'app' in root && root.app !== TOURNAMENT_EXPORT_ID) return fail('invalid_file')

  const format = FORMATS.includes(raw.format as TournamentFormat) ? (raw.format as TournamentFormat) : null
  const mode = MODES.includes(raw.mode as TournamentMode) ? (raw.mode as TournamentMode) : '1v1'
  const bestOf = BEST_OF.includes(raw.bestOf as BestOf) ? (raw.bestOf as BestOf) : 1
  if (!format || !Array.isArray(raw.participants)) return fail('invalid_file')

  const makeId = opts.idFactory ?? defaultId
  const seen = new Set<string>()
  const idMap = new Map<string, string>()
  const participants: Participant[] = []
  for (const p of raw.participants.slice(0, MAX_PARTICIPANTS)) {
    if (!p || typeof p !== 'object') continue
    const r = p as Record<string, unknown>
    const name = clean(r.name, 40)
    if (!name || seen.has(name.toLocaleLowerCase())) continue
    seen.add(name.toLocaleLowerCase())
    const keep = opts.keepIds && typeof r.id === 'string' && SAFE_ID.test(r.id) && ![...idMap.values()].includes(r.id)
    const id = keep ? (r.id as string) : makeId()
    if (typeof r.id === 'string') idMap.set(r.id, id)
    participants.push({
      id,
      name,
      members: Array.isArray(r.members) ? r.members.map((m) => clean(m, 40)).filter(Boolean).slice(0, 10) : [],
    })
  }
  if (participants.length < MIN_PARTICIPANTS[format]) return fail('too_few')

  const size = nextPowerOfTwo(Math.max(format === 'double' ? 4 : 2, participants.length))
  const grandFinalReset = format === 'double' && raw.grandFinalReset === true
  const matches = generateMatches(format, size, grandFinalReset)
  const matchIds = new Set(matches.map((m) => m.id))

  const results: Tournament['results'] = {}
  if (raw.results && typeof raw.results === 'object') {
    for (const [mid, value] of Object.entries(raw.results as Record<string, unknown>)) {
      if (!matchIds.has(mid) || !value || typeof value !== 'object') continue
      const v = value as Record<string, unknown>
      const ps = v.participants
      const sc = v.score
      if (!Array.isArray(ps) || !Array.isArray(sc) || ps.length !== 2 || sc.length !== 2) continue
      const a = idMap.get(ps[0] as string)
      const b = idMap.get(ps[1] as string)
      const s0 = sc[0]
      const s1 = sc[1]
      if (!a || !b || !Number.isInteger(s0) || !Number.isInteger(s1) || s0 === s1 || (s0 as number) < 0 || (s1 as number) < 0) continue
      results[mid] = {
        participants: [a, b],
        score: [s0 as number, s1 as number],
        winner: (s0 as number) > (s1 as number) ? 0 : 1,
        ...(typeof v.note === 'string' && clean(v.note, 120) ? { note: clean(v.note, 120) } : {}),
      }
    }
  }

  const roundLabels: Record<string, string> = {}
  if (raw.roundLabels && typeof raw.roundLabels === 'object') {
    for (const [k, v] of Object.entries(raw.roundLabels as Record<string, unknown>)) {
      if (/^(upper|lower|grand):\d{1,2}$/.test(k) && clean(v, 40)) roundLabels[k] = clean(v, 40)
    }
  }

  const now = opts.now ?? Date.now()
  return ok(
    pruneResults({
      id: opts.keepIds && typeof raw.id === 'string' && SAFE_ID.test(raw.id) ? raw.id : makeId(),
      name: clean(raw.name, 80) || 'Tournament',
      gameId: typeof raw.gameId === 'string' ? raw.gameId.slice(0, 40) : null,
      mode,
      format,
      bestOf,
      grandFinalReset,
      participants,
      bracketSize: size,
      matches,
      results,
      roundLabels,
      createdAt: opts.keepIds && typeof raw.createdAt === 'number' ? raw.createdAt : now,
      updatedAt: opts.keepIds && typeof raw.updatedAt === 'number' ? raw.updatedAt : now,
    }),
  )
}
