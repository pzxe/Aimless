import { describe, expect, it } from 'vitest'
import {
  fetchOverwatchRank,
  fetchValorantRank,
  henrikAccountUrl,
  henrikMmrUrl,
  overFastUrl,
  parseTiers,
  RankError,
  bundledTiers,
  type Transport,
} from './rankFetcher'

const ok = (body: unknown) => ({ status: 200, body: JSON.stringify(body) })
const status = (s: number) => ({ status: s, body: '{}' })

const account = { data: { name: 'TenZ', tag: '0505', region: 'na', account_level: 200, card: { small: 'https://c' } } }
const mmrV2 = {
  data: {
    current_data: { currenttier: 22, currenttierpatched: 'Ascendant 2', ranking_in_tier: 74, mmr_change_to_last_game: 21 },
    highest_rank: { tier: 24, patched_tier: 'Immortal 1', season: 'e8a3' },
  },
}

describe('URL builders', () => {
  it('builds the OverFast URL with # converted to -', () => {
    expect(overFastUrl('Player#1234')).toBe('https://overfast-api.tekrop.fr/players/Player-1234/summary')
    expect(overFastUrl('bad')).toBeNull()
  })
  it('builds the HenrikDev URLs and encodes names', () => {
    expect(henrikAccountUrl('Ten Z', '0505')).toBe('https://api.henrikdev.xyz/valorant/v1/account/Ten%20Z/0505')
    expect(henrikMmrUrl('eu', 'TenZ', '0505')).toBe('https://api.henrikdev.xyz/valorant/v2/mmr/eu/TenZ/0505')
    expect(henrikMmrUrl('eu', 'TenZ', '0505', 'v3')).toBe('https://api.henrikdev.xyz/valorant/v3/mmr/eu/pc/TenZ/0505')
  })
})

describe('fetchOverwatchRank', () => {
  it('requests the converted id and parses the summary', async () => {
    const seen: string[] = []
    const transport: Transport = async ({ url }) => {
      seen.push(url)
      return ok({ username: 'Player', competitive: { pc: { season: 5, tank: { division: 'master', tier: 4 } } } })
    }
    const r = await fetchOverwatchRank('Player#1234', transport)
    expect(seen).toEqual(['https://overfast-api.tekrop.fr/players/Player-1234/summary'])
    expect(r.roles[0]).toMatchObject({ role: 'tank', division: 'master', tier: 4 })
  })
  it('reports private profiles, unknown players and bad ids', async () => {
    const priv = await fetchOverwatchRank('Player#1234', async () => ok({ username: 'P', competitive: null }))
    expect(priv.competitivePrivate).toBe(true)
    await expect(fetchOverwatchRank('Player#1234', async () => status(404))).rejects.toMatchObject({ kind: 'not-found' })
    await expect(fetchOverwatchRank('Player#1234', async () => status(429))).rejects.toMatchObject({ kind: 'rate-limited' })
    await expect(fetchOverwatchRank('nope', async () => status(200))).rejects.toMatchObject({ kind: 'invalid-id' })
    await expect(fetchOverwatchRank('Player#1234', async () => ({ status: 200, body: '<html>' }))).rejects.toBeInstanceOf(RankError)
  })
})

describe('fetchValorantRank', () => {
  it('detects the region from the account, then reads MMR, RR, last change and peak', async () => {
    const urls: string[] = []
    const keys: (string | undefined)[] = []
    const transport: Transport = async ({ url, headers }) => {
      urls.push(url)
      keys.push(headers?.Authorization)
      return url.includes('/account/') ? ok(account) : ok(mmrV2)
    }
    const r = await fetchValorantRank({ riotId: 'TenZ#0505', apiKey: 'HDEV-abc' }, transport)
    expect(urls[1]).toBe('https://api.henrikdev.xyz/valorant/v2/mmr/na/TenZ/0505')
    expect(keys).toEqual(['HDEV-abc', 'HDEV-abc'])
    expect(r).toMatchObject({ region: 'na', level: 200, tier: 22, tierName: 'Ascendant 2', rr: 74, lastChange: 21, peakTier: 24, peakName: 'Immortal 1' })
  })

  it('falls back to MMR v3 when v2 is gone', async () => {
    const transport: Transport = async ({ url }) => {
      if (url.includes('/account/')) return ok(account)
      if (url.includes('/v2/mmr/')) return status(410)
      return ok({ data: { current: { tier: { id: 18, name: 'Diamond 1' }, rr: 5, last_change: -15 } } })
    }
    const r = await fetchValorantRank({ riotId: 'TenZ#0505', region: 'eu' }, transport)
    expect(r).toMatchObject({ tier: 18, rr: 5, lastChange: -15, region: 'eu' })
  })

  it('reports a missing API key (401) and rate limits', async () => {
    await expect(fetchValorantRank({ riotId: 'TenZ#0505' }, async () => status(401))).rejects.toMatchObject({ kind: 'needs-key' })
    await expect(fetchValorantRank({ riotId: 'TenZ#0505', region: 'eu' }, async () => status(429))).rejects.toMatchObject({ kind: 'rate-limited' })
  })

  it('does not send an Authorization header without a key', async () => {
    const seen: (string | undefined)[] = []
    await fetchValorantRank({ riotId: 'TenZ#0505' }, async ({ url, headers }) => {
      seen.push(headers?.Authorization)
      return url.includes('/account/') ? ok(account) : ok(mmrV2)
    })
    expect(seen).toEqual([undefined, undefined])
  })

  it('rejects an invalid Riot ID before any request', async () => {
    let called = false
    await expect(
      fetchValorantRank({ riotId: 'nope' }, async () => {
        called = true
        return status(200)
      }),
    ).rejects.toMatchObject({ kind: 'invalid-id' })
    expect(called).toBe(false)
  })
})

describe('Valorant tiers (valorant-api.com)', () => {
  it('bundles every tier from Iron 1 to Radiant', () => {
    const tiers = bundledTiers()
    expect(tiers).toHaveLength(25)
    expect(tiers[0]).toMatchObject({ tier: 3, name: 'Iron 1' })
    expect(tiers.at(-1)).toMatchObject({ tier: 27, name: 'Radiant' })
  })
  it('parses the live competitivetiers response using the latest episode', () => {
    const mk = (n: number) => ({ tier: n, tierName: `TIER ${n}`, color: 'aabbccff', smallIcon: `https://icon/${n}.png` })
    const body = { data: [{ tiers: [mk(3)] }, { tiers: Array.from({ length: 25 }, (_, i) => mk(i + 3)) }] }
    const tiers = parseTiers(body)
    expect(tiers).toHaveLength(25)
    expect(tiers?.[0]).toEqual({ tier: 3, name: 'Tier 3', color: '#aabbcc', icon: 'https://icon/3.png' })
    expect(parseTiers({ data: [] })).toBeNull()
    expect(parseTiers({ data: [{ tiers: [mk(3)] }] })).toBeNull()
  })
})
