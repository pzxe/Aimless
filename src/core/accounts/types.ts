import { isKnownGame } from '@/core/sensitivity'
import type { LiveRank } from './rank'

export const ACCOUNT_STATUSES = ['ready', 'cooldown', 'verified', 'warmup', 'banned', 'inactive'] as const
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number]

export const ACCOUNT_REGIONS = ['eu', 'na', 'mena', 'asia', 'kr', 'latam', 'br', 'oce'] as const
export type AccountRegion = (typeof ACCOUNT_REGIONS)[number]

/** Our regions to the HenrikDev ones (eu, na, ap, kr, latam, br). */
export function toValorantRegion(region: string): string {
  return ({ eu: 'eu', mena: 'eu', na: 'na', asia: 'ap', oce: 'ap', kr: 'kr', latam: 'latam', br: 'br' } as Record<string, string>)[region] ?? ''
}
export function fromValorantRegion(region: string | null): AccountRegion | '' {
  return ({ eu: 'eu', na: 'na', ap: 'asia', kr: 'kr', latam: 'latam', br: 'br' } as Record<string, AccountRegion>)[region ?? ''] ?? ''
}

export interface Account {
  id: string
  /** Name shown on the card, e.g. "Main Ranked". */
  label: string
  gameId: string
  /** Login name or email. Optional: an account can be an ID-only entry for rank tracking. */
  username: string
  password: string
  /** Riot ID, BattleTag, Steam ID and so on. Drives the tracker links and the live rank. */
  inGameId: string
  /** Manual rank text for games without a live rank (and as a fallback). */
  rank: string
  /** Manual Valorant tier id (3 = Iron 1 … 27 = Radiant), used when there is no live data. */
  rankTier?: number
  rr?: number
  region: AccountRegion | ''
  status: AccountStatus
  notes: string
  /** Saved sensitivity profile to load into the converter. */
  profileId?: string
  favorite: boolean
  /** Last live rank result and when it was fetched. */
  live?: LiveRank
  liveAt?: number
  createdAt: number
  updatedAt: number
}

export type AccountDraft = Omit<Account, 'id' | 'createdAt' | 'updatedAt' | 'live' | 'liveAt'>

export const emptyDraft = (gameId = 'valorant'): AccountDraft => ({
  label: '',
  gameId,
  username: '',
  password: '',
  inGameId: '',
  rank: '',
  region: '',
  status: 'ready',
  notes: '',
  favorite: false,
})

const s = (x: unknown, max: number): string => (typeof x === 'string' ? x.slice(0, max) : '')

/** Validates an untrusted account (from a backup file). Returns null if it can't be used. */
export function sanitizeAccount(raw: unknown): Account | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const gameId = s(r.gameId, 64)
  if (!isKnownGame(gameId)) return null
  const id = s(r.id, 80)
  if (!id) return null
  const status = ACCOUNT_STATUSES.includes(r.status as AccountStatus) ? (r.status as AccountStatus) : 'ready'
  const region = (ACCOUNT_REGIONS as readonly string[]).includes(r.region as string) ? (r.region as AccountRegion) : ''
  const tier = typeof r.rankTier === 'number' && Number.isInteger(r.rankTier) && r.rankTier >= 3 && r.rankTier <= 27 ? r.rankTier : undefined
  const rr = typeof r.rr === 'number' && Number.isFinite(r.rr) && r.rr >= 0 && r.rr <= 9999 ? Math.round(r.rr) : undefined
  const now = Date.now()
  return {
    id,
    label: s(r.label, 80),
    gameId,
    username: s(r.username, 200),
    password: s(r.password, 500),
    inGameId: s(r.inGameId, 100),
    rank: s(r.rank, 60),
    rankTier: tier,
    rr,
    region,
    status,
    notes: s(r.notes, 1000),
    profileId: typeof r.profileId === 'string' ? r.profileId.slice(0, 80) : undefined,
    favorite: r.favorite === true,
    createdAt: typeof r.createdAt === 'number' ? r.createdAt : now,
    updatedAt: typeof r.updatedAt === 'number' ? r.updatedAt : now,
  }
}
