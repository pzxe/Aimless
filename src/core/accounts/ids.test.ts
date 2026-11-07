import { describe, expect, it } from 'vitest'
import { battleTagToOverFastId, GAME_ID_KIND, isSteamId64, parseBattleTag, parseRiotId, trackerLinks, TRACKER_GAMES } from './ids'

describe('BattleTag', () => {
  it('converts # to - for the OverFast API', () => {
    expect(battleTagToOverFastId('Player#1234')).toBe('Player-1234')
    expect(battleTagToOverFastId('  TeKrop#2217  ')).toBe('TeKrop-2217')
  })
  it('accepts the OverFast form and keeps it unchanged', () => {
    expect(battleTagToOverFastId('Player-1234')).toBe('Player-1234')
  })
  it('splits on the last # and keeps non-ASCII names', () => {
    expect(parseBattleTag('Jäger#98765')).toEqual({ name: 'Jäger', tag: '98765' })
  })
  it('rejects invalid BattleTags', () => {
    for (const bad of ['', 'Player', 'Player#', '#1234', 'Pl#1234', 'Player#12', 'Player#abcd', '1Player#1234', 'Has Space#1234', 'WayTooLongName#1234']) {
      expect(parseBattleTag(bad), bad).toBeNull()
      expect(battleTagToOverFastId(bad), bad).toBeNull()
    }
  })
})

describe('Riot ID', () => {
  it('parses Name#TAG', () => {
    expect(parseRiotId('TenZ#0505')).toEqual({ name: 'TenZ', tag: '0505' })
    expect(parseRiotId('My Name#EUW')).toEqual({ name: 'My Name', tag: 'EUW' })
  })
  it('rejects invalid Riot IDs', () => {
    for (const bad of ['', 'TenZ', 'TenZ#', '#0505', 'ab#0505', 'ThisNameIsTooLong1#0505', 'TenZ#12', 'TenZ#123456', 'TenZ#05 5']) {
      expect(parseRiotId(bad), bad).toBeNull()
    }
  })
})

describe('tracker links', () => {
  it('builds Valorant links with the # encoded', () => {
    const l = trackerLinks('valorant', 'TenZ#0505')
    expect(l.find((x) => x.id === 'trackergg')?.url).toBe('https://tracker.gg/valorant/profile/riot/TenZ%230505/overview')
    expect(l.map((x) => x.id)).toContain('opgg')
  })
  it('builds Overwatch 2 links including the OverFast API', () => {
    const l = trackerLinks('overwatch2', 'Player#1234')
    expect(l.find((x) => x.id === 'overfast')?.url).toBe('https://overfast-api.tekrop.fr/players/Player-1234/summary')
    expect(l.find((x) => x.id === 'blizzard')?.url).toBe('https://overwatch.blizzard.com/en-us/career/Player-1234/')
  })
  it('adds Leetify for a CS2 SteamID64 but not for a vanity name', () => {
    expect(trackerLinks('cs2', '76561198000000000').map((x) => x.id)).toEqual(['trackergg', 'leetify', 'steam'])
    expect(trackerLinks('cs2', 'gaben').map((x) => x.id)).toEqual(['trackergg', 'steam'])
    expect(isSteamId64('76561198000000000')).toBe(true)
    expect(isSteamId64('gaben')).toBe(false)
  })
  it('covers every tracker game and returns nothing for invalid or unsupported input', () => {
    for (const g of TRACKER_GAMES) {
      const id = GAME_ID_KIND[g] === 'riot' ? 'Name#TAG1' : GAME_ID_KIND[g] === 'battletag' ? 'Name#1234' : 'SomeName'
      expect(trackerLinks(g, id).length, g).toBeGreaterThan(0)
    }
    expect(trackerLinks('valorant', 'nope')).toEqual([])
    expect(trackerLinks('cs16', 'x')).toEqual([])
    expect(trackerLinks('apex', '   ')).toEqual([])
  })
})
