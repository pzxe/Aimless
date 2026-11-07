/**
 * Live rank data: types and response parsers for the OverFast API (Overwatch 2) and the
 * HenrikDev API (Valorant). Pure functions over parsed JSON, so they can be tested with fixtures.
 */
import { VALORANT_TIERS } from '@/data/valorantTiers'

export type OverwatchRoleKey = 'tank' | 'damage' | 'support' | 'open'
export const OVERWATCH_ROLE_ORDER: readonly OverwatchRoleKey[] = ['tank', 'damage', 'support', 'open']
export const OVERWATCH_DIVISIONS = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'grandmaster', 'champion'] as const

export interface OverwatchRole {
  role: OverwatchRoleKey
  division: string
  tier: number
  rankIcon: string | null
  roleIcon: string | null
}

export interface OverwatchLive {
  game: 'overwatch2'
  username: string
  avatar: string | null
  namecard: string | null
  title: string | null
  endorsement: number | null
  season: number | null
  /** The profile hides its career: OverFast answers `competitive: null`. */
  competitivePrivate: boolean
  /** PC competitive ranks that exist (unranked roles are left out). */
  roles: OverwatchRole[]
}

export interface ValorantLive {
  game: 'valorant'
  name: string
  tag: string
  region: string | null
  level: number | null
  card: string | null
  tier: number
  tierName: string
  /** Ranked rating inside the current tier (0 to 99 below Immortal, unbounded from Immortal 1). */
  rr: number
  /** RR gained or lost in the last ranked game. */
  lastChange: number | null
  peakTier: number | null
  peakName: string | null
  peakSeason: string | null
}

export type LiveRank = OverwatchLive | ValorantLive

export const VALORANT_REGIONS = ['eu', 'na', 'ap', 'kr', 'latam', 'br'] as const
export type ValorantRegion = (typeof VALORANT_REGIONS)[number]

type Json = Record<string, unknown>
const obj = (x: unknown): Json | null => (x && typeof x === 'object' && !Array.isArray(x) ? (x as Json) : null)
const str = (x: unknown): string | null => (typeof x === 'string' && x ? x : null)
const num = (x: unknown): number | null => (typeof x === 'number' && Number.isFinite(x) ? x : null)

export function titleCase(s: string): string {
  return s.replace(/(^|[\s_-])(\p{L})/gu, (_m, sep: string, c: string) => `${sep === '_' || sep === '-' ? ' ' : sep}${c.toUpperCase()}`)
}

/** `Master 4`, `Grandmaster 1`. */
export function overwatchRankLabel(r: Pick<OverwatchRole, 'division' | 'tier'>): string {
  return `${titleCase(r.division)} ${r.tier}`
}

/** Parses an OverFast `/players/{id}/summary` response. */
export function parseOverFast(json: unknown): OverwatchLive {
  const root = obj(json)
  if (!root) throw new Error('invalid')
  const comp = obj(root.competitive)
  const platform = comp ? (obj(comp.pc) ?? obj(comp.console)) : null
  const roles: OverwatchRole[] = []
  if (platform) {
    for (const key of OVERWATCH_ROLE_ORDER) {
      const r = obj(platform[key])
      const division = r ? str(r.division) : null
      const tier = r ? num(r.tier) : null
      if (!r || !division || tier === null) continue
      roles.push({ role: key, division, tier, rankIcon: str(r.rank_icon), roleIcon: str(r.role_icon) })
    }
  }
  const endorsement = obj(root.endorsement)
  return {
    game: 'overwatch2',
    username: str(root.username) ?? '',
    avatar: str(root.avatar),
    namecard: str(root.namecard),
    title: str(root.title),
    endorsement: endorsement ? num(endorsement.level) : null,
    season: platform ? num(platform.season) : null,
    competitivePrivate: comp === null,
    roles,
  }
}

const TIER_BY_ID = new Map(VALORANT_TIERS.map((t) => [t.tier, t]))

export function valorantTierName(tier: number): string {
  return TIER_BY_ID.get(tier)?.name ?? (tier === 0 ? 'Unranked' : `Tier ${tier}`)
}

export function valorantTierColor(tier: number): string {
  return TIER_BY_ID.get(tier)?.color ?? '#9a9a9a'
}

/** Radiant has no RR cap and Immortal+ gains are unbounded; every other tier promotes at 100 RR. */
export function rrToRankUp(rr: number, tier: number): number | null {
  if (tier >= 24) return null
  return Math.max(0, 100 - rr)
}

export interface HenrikAccount {
  name: string | null
  tag: string | null
  region: string | null
  level: number | null
  card: string | null
}

/** Parses `/valorant/v1/account/{name}/{tag}` (and the v2 shape, which uses the same field names). */
export function parseHenrikAccount(json: unknown): HenrikAccount | null {
  const data = obj(obj(json)?.data)
  if (!data) return null
  const card = obj(data.card)
  return {
    name: str(data.name),
    tag: str(data.tag),
    region: str(data.region)?.toLowerCase() ?? null,
    level: num(data.account_level),
    card: card ? (str(card.small) ?? str(card.wide) ?? str(card.large)) : null,
  }
}

export interface HenrikMmr {
  tier: number
  tierName: string
  rr: number
  lastChange: number | null
  peakTier: number | null
  peakName: string | null
  peakSeason: string | null
}

/**
 * Parses `/valorant/v2/mmr/{region}/{name}/{tag}` (`current_data`, `highest_rank`) and the newer
 * `/valorant/v3/mmr/...` shape (`current`, `peak`).
 */
export function parseHenrikMmr(json: unknown): HenrikMmr | null {
  const data = obj(obj(json)?.data)
  if (!data) return null

  const cur2 = obj(data.current_data)
  if (cur2) {
    const tier = num(cur2.currenttier)
    if (tier === null) return null
    const peak = obj(data.highest_rank)
    return {
      tier,
      tierName: str(cur2.currenttierpatched) ?? valorantTierName(tier),
      rr: num(cur2.ranking_in_tier) ?? 0,
      lastChange: num(cur2.mmr_change_to_last_game),
      peakTier: peak ? num(peak.tier) : null,
      peakName: peak ? str(peak.patched_tier) : null,
      peakSeason: peak ? str(peak.season) : null,
    }
  }

  const cur3 = obj(data.current)
  if (cur3) {
    const t = obj(cur3.tier)
    const tier = t ? num(t.id) : null
    if (tier === null) return null
    const peak = obj(data.peak)
    const pt = peak ? obj(peak.tier) : null
    const ps = peak ? obj(peak.season) : null
    return {
      tier,
      tierName: (t && str(t.name)) ?? valorantTierName(tier),
      rr: num(cur3.rr) ?? 0,
      lastChange: num(cur3.last_change),
      peakTier: pt ? num(pt.id) : null,
      peakName: pt ? str(pt.name) : null,
      peakSeason: ps ? (str(ps.short) ?? str(ps.id)) : null,
    }
  }
  return null
}

/** Numeric rank for sorting accounts: higher is better. */
export function rankScore(live: LiveRank | undefined, manualTier: number | undefined, manualRr: number | undefined): number {
  if (live?.game === 'valorant') return live.tier * 1000 + Math.min(live.rr, 999)
  if (live?.game === 'overwatch2') {
    let best = 0
    for (const r of live.roles) {
      const d = OVERWATCH_DIVISIONS.indexOf(r.division as (typeof OVERWATCH_DIVISIONS)[number])
      best = Math.max(best, (d + 1) * 10 + (6 - r.tier))
    }
    return best
  }
  if (typeof manualTier === 'number') return manualTier * 1000 + Math.min(manualRr ?? 0, 999)
  return 0
}
