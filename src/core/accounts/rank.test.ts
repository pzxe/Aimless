import { describe, expect, it } from 'vitest'
import {
  overwatchRankLabel,
  parseHenrikAccount,
  parseHenrikMmr,
  parseOverFast,
  rankScore,
  rrToRankUp,
  valorantTierName,
  type OverwatchLive,
  type ValorantLive,
} from './rank'

const overfast = {
  username: 'TeKrop',
  avatar: 'https://example.test/a.png',
  namecard: 'https://example.test/n.png',
  title: 'Data Broker',
  endorsement: { level: 2, frame: 'x' },
  competitive: {
    pc: {
      season: 22,
      tank: { division: 'grandmaster', tier: 1, role_icon: 'https://example.test/tank.svg#icon', rank_icon: 'https://example.test/gm.png' },
      damage: { division: 'master', tier: 4, role_icon: null, rank_icon: 'https://example.test/m.png' },
      support: null,
      open: { division: 'silver', tier: 4, role_icon: 'r', rank_icon: 'i' },
    },
    console: null,
  },
}

describe('parseOverFast', () => {
  it('extracts profile data and every competitive role', () => {
    const r = parseOverFast(overfast)
    expect(r).toMatchObject({ username: 'TeKrop', title: 'Data Broker', endorsement: 2, season: 22, competitivePrivate: false })
    expect(r.roles.map((x) => x.role)).toEqual(['tank', 'damage', 'open'])
    expect(r.roles[0]).toMatchObject({ division: 'grandmaster', tier: 1, rankIcon: 'https://example.test/gm.png' })
    expect(overwatchRankLabel(r.roles[0]!)).toBe('Grandmaster 1')
    expect(overwatchRankLabel(r.roles[1]!)).toBe('Master 4')
  })
  it('flags a private profile (competitive is null)', () => {
    const r = parseOverFast({ ...overfast, competitive: null })
    expect(r.competitivePrivate).toBe(true)
    expect(r.roles).toEqual([])
  })
  it('falls back to console ranks when there are no PC ranks', () => {
    const r = parseOverFast({ username: 'x', competitive: { pc: null, console: { season: 3, tank: { division: 'gold', tier: 2 } } } })
    expect(r.roles).toHaveLength(1)
    expect(r.season).toBe(3)
  })
  it('handles an unranked public profile and rejects junk', () => {
    const r = parseOverFast({ username: 'x', competitive: { pc: { season: 1, tank: null, damage: null, support: null, open: null }, console: null } })
    expect(r.competitivePrivate).toBe(false)
    expect(r.roles).toEqual([])
    expect(() => parseOverFast('nope')).toThrow()
  })
})

describe('HenrikDev parsers', () => {
  it('parses the account lookup', () => {
    const a = parseHenrikAccount({ status: 200, data: { name: 'TenZ', tag: '0505', region: 'NA', account_level: 312, card: { small: 'https://s', wide: 'w' } } })
    expect(a).toEqual({ name: 'TenZ', tag: '0505', region: 'na', level: 312, card: 'https://s' })
    expect(parseHenrikAccount({ status: 404 })).toBeNull()
  })
  it('parses MMR v2 (current_data / highest_rank)', () => {
    const m = parseHenrikMmr({
      data: {
        current_data: { currenttier: 22, currenttierpatched: 'Ascendant 2', ranking_in_tier: 74, mmr_change_to_last_game: 21 },
        highest_rank: { tier: 24, patched_tier: 'Immortal 1', season: 'e8a3' },
      },
    })
    expect(m).toEqual({ tier: 22, tierName: 'Ascendant 2', rr: 74, lastChange: 21, peakTier: 24, peakName: 'Immortal 1', peakSeason: 'e8a3' })
  })
  it('parses MMR v3 (current / peak)', () => {
    const m = parseHenrikMmr({
      data: { current: { tier: { id: 18, name: 'Diamond 1' }, rr: 5, last_change: -15 }, peak: { tier: { id: 21, name: 'Ascendant 1' }, season: { short: 'e9a1' } } },
    })
    expect(m).toEqual({ tier: 18, tierName: 'Diamond 1', rr: 5, lastChange: -15, peakTier: 21, peakName: 'Ascendant 1', peakSeason: 'e9a1' })
  })
  it('returns null for unusable bodies', () => {
    expect(parseHenrikMmr({ data: {} })).toBeNull()
    expect(parseHenrikMmr(null)).toBeNull()
  })
})

describe('RR helpers', () => {
  it('computes points to rank up', () => {
    expect(rrToRankUp(74, 22)).toBe(26)
    expect(rrToRankUp(0, 3)).toBe(100)
    expect(rrToRankUp(250, 24)).toBeNull() // Immortal+ has no cap
    expect(rrToRankUp(120, 27)).toBeNull()
  })
  it('names tiers from the official table', () => {
    expect(valorantTierName(3)).toBe('Iron 1')
    expect(valorantTierName(27)).toBe('Radiant')
    expect(valorantTierName(0)).toBe('Unranked')
  })
  it('orders accounts by rank', () => {
    const val = (tier: number, rr: number) => ({ game: 'valorant', tier, rr }) as ValorantLive
    expect(rankScore(val(22, 10), undefined, undefined)).toBeGreaterThan(rankScore(val(21, 99), undefined, undefined))
    expect(rankScore(val(22, 50), undefined, undefined)).toBeGreaterThan(rankScore(val(22, 10), undefined, undefined))
    expect(rankScore(undefined, 20, 5)).toBe(20005)
    const ow = (division: string, tier: number) => ({ game: 'overwatch2', roles: [{ role: 'tank', division, tier }] }) as unknown as OverwatchLive
    expect(rankScore(ow('master', 4), undefined, undefined)).toBeGreaterThan(rankScore(ow('diamond', 1), undefined, undefined))
    expect(rankScore(ow('master', 1), undefined, undefined)).toBeGreaterThan(rankScore(ow('master', 4), undefined, undefined))
    expect(rankScore(undefined, undefined, undefined)).toBe(0)
  })
})
