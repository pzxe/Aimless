import type { MatchDef, TournamentFormat } from './types'

export const MIN_PARTICIPANTS: Record<TournamentFormat, number> = { single: 2, double: 3 }
export const MAX_PARTICIPANTS = 64

export function nextPowerOfTwo(n: number): number {
  let p = 1
  while (p < n) p *= 2
  return p
}

/**
 * Standard bracket seed order, e.g. size 8 → [1, 8, 4, 5, 2, 7, 3, 6].
 * Consecutive pairs meet in round 1, and seeds 1 and 2 can only meet in the final.
 * Seeds above the participant count are byes, so byes go to the top seeds.
 */
export function seedOrder(size: number): number[] {
  let order = [1]
  while (order.length < size) {
    const sum = order.length * 2 + 1
    order = order.flatMap((s) => [s, sum - s])
  }
  return order
}

const U = (round: number, i: number) => `U${round}-${i}`
const L = (round: number, i: number) => `L${round}-${i}`

/** Build the match graph. Matches are ordered so every source comes before its match. */
export function generateMatches(format: TournamentFormat, size: number, grandFinalReset: boolean): MatchDef[] {
  const k = Math.log2(size)
  if (!Number.isInteger(k) || k < 1) throw new Error('bracket size must be a power of two ≥ 2')
  const matches: MatchDef[] = []

  // Upper bracket (the whole bracket for single elimination).
  const order = seedOrder(size)
  for (let i = 0; i < size / 2; i++) {
    matches.push({
      id: U(1, i), side: 'upper', round: 1, index: i,
      sources: [{ type: 'seed', seed: order[2 * i]! }, { type: 'seed', seed: order[2 * i + 1]! }],
    })
  }
  for (let r = 2; r <= k; r++) {
    for (let i = 0; i < size / 2 ** r; i++) {
      matches.push({
        id: U(r, i), side: 'upper', round: r, index: i,
        sources: [{ type: 'winner', matchId: U(r - 1, 2 * i) }, { type: 'winner', matchId: U(r - 1, 2 * i + 1) }],
      })
    }
  }
  if (format === 'single') return matches
  if (k < 2) throw new Error('double elimination needs a bracket of at least 4')

  // Lower bracket: 2(k-1) rounds.
  // L1: losers of upper round 1, paired.
  for (let i = 0; i < size / 4; i++) {
    matches.push({
      id: L(1, i), side: 'lower', round: 1, index: i,
      sources: [{ type: 'loser', matchId: U(1, 2 * i) }, { type: 'loser', matchId: U(1, 2 * i + 1) }],
    })
  }
  for (let j = 1; j <= k - 1; j++) {
    // L(2j): survivors of L(2j-1) meet the losers dropping from upper round j+1.
    const dropRound = 2 * j
    const count = size / 2 ** (j + 1)
    for (let i = 0; i < count; i++) {
      // Alternate the drop-in order to avoid immediate rematches.
      const upperIndex = j % 2 === 1 ? count - 1 - i : i
      matches.push({
        id: L(dropRound, i), side: 'lower', round: dropRound, index: i,
        sources: [{ type: 'winner', matchId: L(dropRound - 1, i) }, { type: 'loser', matchId: U(j + 1, upperIndex) }],
      })
    }
    // L(2j+1): survivors of L(2j) paired (not after the last drop-in round).
    if (j <= k - 2) {
      const r = dropRound + 1
      for (let i = 0; i < count / 2; i++) {
        matches.push({
          id: L(r, i), side: 'lower', round: r, index: i,
          sources: [{ type: 'winner', matchId: L(dropRound, 2 * i) }, { type: 'winner', matchId: L(dropRound, 2 * i + 1) }],
        })
      }
    }
  }

  const lastLower = L(2 * (k - 1), 0)
  matches.push({
    id: 'GF', side: 'grand', round: 1, index: 0,
    sources: [{ type: 'winner', matchId: U(k, 0) }, { type: 'winner', matchId: lastLower }],
  })
  if (grandFinalReset) {
    matches.push({
      id: 'GF2', side: 'grand', round: 2, index: 0, isReset: true,
      sources: [{ type: 'winner', matchId: 'GF' }, { type: 'loser', matchId: 'GF' }],
    })
  }
  return matches
}

/** Number of rounds on each side, for headers and labels. */
export function roundCounts(matches: MatchDef[]): Record<'upper' | 'lower' | 'grand', number> {
  const max = { upper: 0, lower: 0, grand: 0 }
  for (const m of matches) max[m.side] = Math.max(max[m.side], m.round)
  return max
}
