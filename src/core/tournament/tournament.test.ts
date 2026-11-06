import { describe, expect, it } from 'vitest'
import {
  clearResult,
  createTournament,
  fillEmptyNames,
  validateNewTournament,
  exportTournament,
  generateMatches,
  importTournament,
  renameRound,
  reportResult,
  reseed,
  resolveTournament,
  roundLabel,
  sanitizeTournament,
  seedOrder,
  shuffle,
  type NewTournamentInput,
  type Tournament,
} from './index'

let n = 0
const ids = () => `id${n++}`
const names = (count: number) => Array.from({ length: count }, (_, i) => ({ name: `P${i + 1}` }))

function make(count: number, format: 'single' | 'double', extra: Partial<NewTournamentInput> = {}): Tournament {
  const r = createTournament(
    { name: 'Cup', gameId: null, mode: '1v1', format, bestOf: 3, grandFinalReset: true, participants: names(count), seeding: 'manual', ...extra },
    { idFactory: ids, now: 0 },
  )
  if (!r.ok) throw new Error(r.error)
  return r.value
}

const seedOf = (t: Tournament, id: string) => t.participants.findIndex((p) => p.id === id) + 1
const nameOf = (t: Tournament, id: string | null) => t.participants.find((p) => p.id === id)?.name ?? null

/** Play every ready match until none are left. `pick` returns 0 or 1 for the winning slot. */
function playAll(t: Tournament, pick: (a: string, b: string, matchId: string) => 0 | 1): Tournament {
  for (let guard = 0; guard < 500; guard++) {
    const ready = [...resolveTournament(t).matches.values()].find((m) => m.status === 'ready')
    if (!ready) return t
    const [a, b] = ready.slots as [{ kind: 'filled'; id: string }, { kind: 'filled'; id: string }]
    const w = pick(a.id, b.id, ready.def.id)
    const r = reportResult(t, ready.def.id, w === 0 ? [2, 1] : [1, 2], undefined, 0)
    if (!r.ok) throw new Error(r.error)
    t = r.value
  }
  throw new Error('did not finish')
}
const higherSeedWins = (t: Tournament) => (a: string, b: string) => (seedOf(t, a) < seedOf(t, b) ? 0 : 1)

/** Deterministic pseudo-random generator for property tests. */
function lcg(seed: number) {
  let s = seed >>> 0
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32)
}

describe('seeding', () => {
  it('produces the standard bracket order', () => {
    expect(seedOrder(2)).toEqual([1, 2])
    expect(seedOrder(4)).toEqual([1, 4, 2, 3])
    expect(seedOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6])
  })
  it('shuffles deterministically with an injected rng and keeps all items', () => {
    const a = shuffle([1, 2, 3, 4, 5], lcg(1))
    expect(a).toEqual(shuffle([1, 2, 3, 4, 5], lcg(1)))
    expect([...a].sort()).toEqual([1, 2, 3, 4, 5])
  })
})

describe('bracket structure', () => {
  it('single elimination has size - 1 matches', () => {
    expect(generateMatches('single', 8, false)).toHaveLength(7)
    expect(generateMatches('single', 16, false)).toHaveLength(15)
  })
  it('double elimination has the expected upper, lower and grand matches', () => {
    const m = generateMatches('double', 8, true)
    expect(m.filter((x) => x.side === 'upper')).toHaveLength(7)
    expect(m.filter((x) => x.side === 'lower')).toHaveLength(6)
    expect(m.filter((x) => x.side === 'grand')).toHaveLength(2)
    expect(generateMatches('double', 8, false).filter((x) => x.side === 'grand')).toHaveLength(1)
    expect(generateMatches('double', 16, true).filter((x) => x.side === 'lower')).toHaveLength(14)
  })
  it('every source refers to an earlier match', () => {
    const m = generateMatches('double', 32, true)
    const seen = new Set<string>()
    for (const x of m) {
      for (const s of x.sources) if (s.type !== 'seed') expect(seen.has(s.matchId), `${x.id} ← ${s.matchId}`).toBe(true)
      seen.add(x.id)
    }
  })
})

describe('validation', () => {
  it('rejects bad input', () => {
    const base = { name: 'Cup', gameId: null, mode: '1v1', format: 'single', bestOf: 1, grandFinalReset: false, seeding: 'manual' } as const
    expect(createTournament({ ...base, participants: names(1) })).toEqual({ ok: false, error: 'too_few' })
    expect(createTournament({ ...base, format: 'double', participants: names(2) })).toEqual({ ok: false, error: 'too_few' })
    expect(createTournament({ ...base, participants: names(65) })).toEqual({ ok: false, error: 'too_many' })
    expect(createTournament({ ...base, name: ' ', participants: names(4) })).toEqual({ ok: false, error: 'name_required' })
    expect(createTournament({ ...base, participants: [{ name: 'A' }, { name: 'a' }] })).toEqual({ ok: false, error: 'duplicate_names' })
    expect(createTournament({ ...base, participants: [{ name: 'A' }, { name: '' }] })).toEqual({ ok: false, error: 'empty_name' })
  })
})

describe('single elimination', () => {
  it('gives byes to the top seeds and crowns the best seed when favourites win', () => {
    const t = make(5, 'single')
    expect(t.bracketSize).toBe(8)
    const r = resolveTournament(t)
    const walkovers = [...r.matches.values()].filter((m) => m.status === 'walkover').map((m) => nameOf(t, m.winnerId))
    expect(walkovers.sort()).toEqual(['P1', 'P2', 'P3'])
    const done = playAll(t, higherSeedWins(t))
    const end = resolveTournament(done)
    expect(nameOf(done, end.championId)).toBe('P1')
    expect(nameOf(done, end.runnerUpId)).toBe('P2')
    expect(end.readyCount).toBe(0)
  })
  it('rejects ties and unready matches', () => {
    const t = make(4, 'single')
    expect(reportResult(t, 'U1-0', [1, 1])).toEqual({ ok: false, error: 'tied_score' })
    expect(reportResult(t, 'U1-0', [-1, 2])).toEqual({ ok: false, error: 'invalid_score' })
    expect(reportResult(t, 'U2-0', [2, 0])).toEqual({ ok: false, error: 'match_not_ready' })
    expect(reportResult(t, 'nope', [2, 0])).toEqual({ ok: false, error: 'unknown_match' })
  })
  it('editing an earlier result invalidates later results that no longer apply', () => {
    let t = make(4, 'single')
    t = playAll(t, higherSeedWins(t))
    expect(resolveTournament(t).championId).not.toBeNull()
    // Seed 4 now beats seed 1 in round 1: the final no longer has the same players.
    const r = reportResult(t, 'U1-0', [0, 2], undefined, 0)
    if (!r.ok) throw new Error(r.error)
    expect(r.value.results['U2-0']).toBeUndefined()
    expect(resolveTournament(r.value).championId).toBeNull()
    expect(resolveTournament(r.value).matches.get('U2-0')!.status).toBe('ready')
  })
  it('clearing a result reopens the match', () => {
    let t = make(4, 'single')
    t = playAll(t, higherSeedWins(t))
    const cleared = clearResult(t, 'U1-1', 0)
    expect(resolveTournament(cleared).matches.get('U1-1')!.status).toBe('ready')
    expect(resolveTournament(cleared).matches.get('U2-0')!.status).toBe('pending')
  })
})

describe('double elimination', () => {
  it('drops upper-bracket losers into the lower bracket', () => {
    let t = make(8, 'double')
    t = (reportResult(t, 'U1-0', [2, 0], undefined, 0) as { ok: true; value: Tournament }).value
    const l1 = resolveTournament(t).matches.get('L1-0')!
    expect(l1.slots[0]).toEqual({ kind: 'filled', id: t.participants[7]!.id }) // seed 8 lost to seed 1
  })
  it('skips the bracket reset when the upper finalist wins the grand final', () => {
    let t = make(4, 'double')
    t = playAll(t, higherSeedWins(t))
    const r = resolveTournament(t)
    expect(r.matches.get('GF2')!.status).toBe('void')
    expect(nameOf(t, r.championId)).toBe('P1')
  })
  it('plays the bracket reset when the lower finalist wins the grand final', () => {
    let t = make(4, 'double')
    t = playAll(t, (a, b, id) => (id === 'GF' ? 1 : seedOf(t, a) < seedOf(t, b) ? 0 : 1))
    const r = resolveTournament(t)
    expect(r.matches.get('GF2')!.status).toBe('done')
    expect(r.championId).not.toBeNull()
  })
  it('without a reset the grand final decides the champion', () => {
    let t = make(4, 'double', { grandFinalReset: false })
    t = playAll(t, (a, b, id) => (id === 'GF' ? 1 : seedOf(t, a) < seedOf(t, b) ? 0 : 1))
    const r = resolveTournament(t)
    expect(r.matches.has('GF2')).toBe(false)
    expect(r.championId).toBe(r.matches.get('GF')!.winnerId)
  })
  it('always completes, and every non-champion loses exactly twice (random results, 3–20 players)', () => {
    for (let count = 3; count <= 20; count++) {
      const rng = lcg(count * 97)
      let t = make(count, 'double')
      t = playAll(t, () => (rng() < 0.5 ? 0 : 1))
      const r = resolveTournament(t)
      expect(r.championId, `champion for ${count}`).not.toBeNull()
      expect([...r.matches.values()].some((m) => m.status === 'pending' || m.status === 'ready')).toBe(false)
      const losses = new Map<string, number>()
      for (const m of r.matches.values()) if (m.status === 'done' && m.loserId) losses.set(m.loserId, (losses.get(m.loserId) ?? 0) + 1)
      for (const p of t.participants) {
        const l = losses.get(p.id) ?? 0
        if (p.id === r.championId) expect(l).toBeLessThanOrEqual(1)
        else expect(l, `${p.name} in ${count}`).toBe(2)
      }
    }
  })
  it('single elimination always completes with one champion (random results, 2–33 players)', () => {
    for (let count = 2; count <= 33; count++) {
      const rng = lcg(count)
      let t = make(count, 'single')
      t = playAll(t, () => (rng() < 0.5 ? 0 : 1))
      const r = resolveTournament(t)
      expect(r.championId).not.toBeNull()
      expect(r.doneCount).toBe(count - 1)
    }
  })
})

describe('round labels and editing', () => {
  it('names rounds from the end of the bracket', () => {
    const s = make(8, 'single')
    expect(roundLabel(s, 'upper', 3).key).toBe('final')
    expect(roundLabel(s, 'upper', 2).key).toBe('semifinal')
    expect(roundLabel(s, 'upper', 1).key).toBe('quarterfinal')
    const d = make(8, 'double')
    expect(roundLabel(d, 'upper', 3).key).toBe('upperFinal')
    expect(roundLabel(d, 'lower', 4).key).toBe('lowerFinal')
    expect(roundLabel(d, 'lower', 1)).toEqual({ key: 'lowerRound', n: 1 })
    expect(roundLabel(d, 'grand', 2).key).toBe('grandFinalReset')
  })
  it('supports custom round names', () => {
    const t = renameRound(make(8, 'single'), 'upper', 1, 'Playoffs', 0)
    expect(roundLabel(t, 'upper', 1).custom).toBe('Playoffs')
    expect(roundLabel(renameRound(t, 'upper', 1, '', 0), 'upper', 1).custom).toBeUndefined()
  })
  it('reseeds only before results exist', () => {
    const t = make(4, 'single')
    const reversed = [...t.participants].reverse().map((p) => p.id)
    const r = reseed(t, reversed, 0)
    expect(r.ok && r.value.participants[0]!.name).toBe('P4')
    const played = (reportResult(t, 'U1-0', [2, 0], undefined, 0) as { ok: true; value: Tournament }).value
    expect(reseed(played, reversed, 0)).toEqual({ ok: false, error: 'has_results' })
  })
})

describe('import / export', () => {
  it('round-trips a tournament with its results', () => {
    let t = make(6, 'double')
    t = playAll(t, higherSeedWins(t))
    const r = importTournament(JSON.stringify(exportTournament(t)), { idFactory: ids, now: 0 })
    if (!r.ok) throw new Error(r.error)
    expect(r.value.participants.map((p) => p.name)).toEqual(t.participants.map((p) => p.name))
    expect(nameOf(r.value, resolveTournament(r.value).championId)).toBe('P1')
  })
  it('rebuilds the match graph instead of trusting the file', () => {
    const t = make(4, 'single')
    const evil = { ...exportTournament(t), tournament: { ...t, matches: [{ id: 'x', sources: [] }], results: { 'U2-0': { participants: ['a', 'b'], score: [1, 0] } } } }
    const r = importTournament(JSON.stringify(evil), { idFactory: ids })
    if (!r.ok) throw new Error(r.error)
    expect(r.value.matches).toHaveLength(3)
    expect(r.value.results).toEqual({})
  })
  it('rejects malformed files without throwing', () => {
    expect(importTournament('{nope')).toEqual({ ok: false, error: 'invalid_file' })
    expect(importTournament('[]')).toEqual({ ok: false, error: 'invalid_file' })
    expect(importTournament(JSON.stringify({ app: 'other', tournament: {} }))).toEqual({ ok: false, error: 'invalid_file' })
    expect(importTournament(JSON.stringify({ format: 'single', participants: [{ name: 'A' }] }))).toEqual({ ok: false, error: 'too_few' })
    expect(importTournament(' '.repeat(1024 * 1024 + 1))).toEqual({ ok: false, error: 'too_large' })
  })
})

describe('stored tournaments', () => {
  it('keeps ids and timestamps when loading from storage', () => {
    let t = make(5, 'double')
    t = playAll(t, higherSeedWins(t))
    const stored = JSON.parse(JSON.stringify(t))
    const r = sanitizeTournament(stored, { keepIds: true })
    if (!r.ok) throw new Error(r.error)
    expect(r.value.id).toBe(t.id)
    expect(r.value.participants.map((p) => p.id)).toEqual(t.participants.map((p) => p.id))
    expect(r.value.results).toEqual(t.results)
    expect(r.value.createdAt).toBe(t.createdAt)
  })
})

describe('fillEmptyNames', () => {
  it('numbers empty slots without reusing taken names', () => {
    expect(fillEmptyNames(['Team 3', '', '', ''], 'Team')).toEqual(['Team 3', 'Team 1', 'Team 2', 'Team 4'])
    expect(fillEmptyNames(['', 'team 1', ''], 'Team')).toEqual(['Team 2', 'team 1', 'Team 3'])
    expect(fillEmptyNames(['A', 'B'], 'Team')).toEqual(['A', 'B'])
  })
  it('always produces a valid entrant list', () => {
    const names = fillEmptyNames(['Team 5', 'Team 2', '', '', '', '', '', ''], 'Team')
    expect(
      validateNewTournament({
        name: 'Cup', gameId: null, mode: '5v5', format: 'double', bestOf: 3, grandFinalReset: true, seeding: 'manual',
        participants: names.map((name) => ({ name })),
      }),
    ).toBeNull()
  })
})
