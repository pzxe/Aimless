/**
 * Live rank fetching.
 *
 * - Overwatch 2: OverFast API (https://overfast-api.tekrop.fr), keyless.
 * - Valorant: HenrikDev API (https://api.henrikdev.xyz). It needs a free community key (`HDEV-...`);
 *   without one it answers 401, which is reported as `needs-key`. Rank icons and colours come from
 *   valorant-api.com (keyless).
 *
 * In the desktop app the requests go through the main process (`fetch-live-rank` IPC), so browser CORS
 * rules never apply. On the web they use `fetch` directly (all three services send CORS headers).
 */
import {
  parseHenrikAccount,
  parseHenrikMmr,
  parseOverFast,
  VALORANT_REGIONS,
  type OverwatchLive,
  type ValorantLive,
} from '@/core/accounts/rank'
import { battleTagToOverFastId, parseRiotId } from '@/core/accounts/ids'
import { VALORANT_TIERS } from '@/data/valorantTiers'
import { desktop } from './desktop'

export type RankErrorKind = 'invalid-id' | 'not-found' | 'needs-key' | 'rate-limited' | 'network' | 'bad-response'

export class RankError extends Error {
  constructor(
    public kind: RankErrorKind,
    public status?: number,
  ) {
    super(kind)
    this.name = 'RankError'
  }
}

export interface TransportRequest {
  url: string
  headers?: Record<string, string>
}
export interface TransportResponse {
  status: number
  body: string
}
export type Transport = (req: TransportRequest) => Promise<TransportResponse>

/** Desktop: main-process fetch over IPC. Web: the browser's fetch. */
export const defaultTransport: Transport = async ({ url, headers }) => {
  try {
    if (desktop?.rank) return await desktop.rank.fetch(url, headers)
    const res = await fetch(url, { headers: { Accept: 'application/json', ...headers } })
    return { status: res.status, body: await res.text() }
  } catch {
    throw new RankError('network')
  }
}

export const OVERFAST_BASE = 'https://overfast-api.tekrop.fr'
export const HENRIK_BASE = 'https://api.henrikdev.xyz'
export const VALORANT_API_TIERS_URL = 'https://valorant-api.com/v1/competitivetiers'

const enc = encodeURIComponent

/** `Player#1234` -> `…/players/Player-1234/summary`. Null if the BattleTag is invalid. */
export function overFastUrl(battleTag: string): string | null {
  const id = battleTagToOverFastId(battleTag)
  return id ? `${OVERFAST_BASE}/players/${enc(id)}/summary` : null
}
export const henrikAccountUrl = (name: string, tag: string, version: 'v1' | 'v2' = 'v1') =>
  `${HENRIK_BASE}/valorant/${version}/account/${enc(name)}/${enc(tag)}`
export const henrikMmrUrl = (region: string, name: string, tag: string, version: 'v2' | 'v3' = 'v2') =>
  version === 'v2'
    ? `${HENRIK_BASE}/valorant/v2/mmr/${enc(region)}/${enc(name)}/${enc(tag)}`
    : `${HENRIK_BASE}/valorant/v3/mmr/${enc(region)}/pc/${enc(name)}/${enc(tag)}`

function parseBody(res: TransportResponse): unknown {
  try {
    return JSON.parse(res.body)
  } catch {
    throw new RankError('bad-response', res.status)
  }
}

function failFor(res: TransportResponse): RankError {
  if (res.status === 401 || res.status === 403) return new RankError('needs-key', res.status)
  if (res.status === 404) return new RankError('not-found', res.status)
  if (res.status === 429) return new RankError('rate-limited', res.status)
  return new RankError('bad-response', res.status)
}

export async function fetchOverwatchRank(battleTag: string, transport: Transport = defaultTransport): Promise<OverwatchLive> {
  const url = overFastUrl(battleTag)
  if (!url) throw new RankError('invalid-id')
  const res = await transport({ url, headers: { Accept: 'application/json' } })
  if (res.status !== 200) throw failFor(res)
  try {
    return parseOverFast(parseBody(res))
  } catch (e) {
    throw e instanceof RankError ? e : new RankError('bad-response', res.status)
  }
}

export interface ValorantQuery {
  riotId: string
  /** Chosen region; when empty it is detected from the account lookup. */
  region?: string
  apiKey?: string
}

export async function fetchValorantRank(q: ValorantQuery, transport: Transport = defaultTransport): Promise<ValorantLive> {
  const id = parseRiotId(q.riotId)
  if (!id) throw new RankError('invalid-id')
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (q.apiKey?.trim()) headers.Authorization = q.apiKey.trim()

  // 1. Account: detects the region, level and player card.
  let account: ReturnType<typeof parseHenrikAccount> = null
  let accountError: RankError | null = null
  for (const version of ['v1', 'v2'] as const) {
    const res = await transport({ url: henrikAccountUrl(id.name, id.tag, version), headers })
    if (res.status === 200) {
      account = parseHenrikAccount(parseBody(res))
      accountError = null
      break
    }
    accountError = failFor(res)
    if (accountError.kind !== 'bad-response') break
  }
  const region = (q.region || account?.region || '').toLowerCase()
  if (!(VALORANT_REGIONS as readonly string[]).includes(region)) throw accountError ?? new RankError('bad-response')
  if (accountError && accountError.kind !== 'bad-response') throw accountError

  // 2. MMR: current rank, RR, last change and peak. v2 first, v3 if v2 is retired.
  let mmr: ReturnType<typeof parseHenrikMmr> = null
  let mmrError: RankError | null = null
  for (const version of ['v2', 'v3'] as const) {
    const res = await transport({ url: henrikMmrUrl(region, id.name, id.tag, version), headers })
    if (res.status === 200) {
      mmr = parseHenrikMmr(parseBody(res))
      if (mmr) break
      mmrError = new RankError('bad-response', 200)
      continue
    }
    mmrError = failFor(res)
    if (mmrError.kind === 'needs-key' || mmrError.kind === 'rate-limited' || mmrError.kind === 'not-found') break
  }
  if (!mmr) throw mmrError ?? new RankError('bad-response')

  return {
    game: 'valorant',
    name: account?.name ?? id.name,
    tag: account?.tag ?? id.tag,
    region,
    level: account?.level ?? null,
    card: account?.card ?? null,
    tier: mmr.tier,
    tierName: mmr.tierName,
    rr: mmr.rr,
    lastChange: mmr.lastChange,
    peakTier: mmr.peakTier,
    peakName: mmr.peakName,
    peakSeason: mmr.peakSeason,
  }
}

// ---------------------------------------------------------------------------------------------
// Official Valorant tier icons (valorant-api.com), cached in localStorage for a week.

export interface TierInfo {
  tier: number
  name: string
  color: string
  icon: string
}

const TIERS_CACHE_KEY = 'sc.valorantTiers'
const TIERS_TTL = 7 * 24 * 3600 * 1000
const bundledIcon = (tier: number) => `${import.meta.env.BASE_URL}rank-icons/valorant/${tier}.png`

/** The bundled snapshot: every tier from Iron 1 to Radiant, with local icons (works offline). */
export function bundledTiers(): TierInfo[] {
  return VALORANT_TIERS.map((t) => ({ tier: t.tier, name: t.name, color: t.color, icon: bundledIcon(t.tier) }))
}

export function parseTiers(json: unknown): TierInfo[] | null {
  const data = (json as { data?: unknown })?.data
  if (!Array.isArray(data) || data.length === 0) return null
  const latest = data[data.length - 1] as { tiers?: unknown }
  if (!Array.isArray(latest.tiers)) return null
  const out: TierInfo[] = []
  for (const t of latest.tiers as Record<string, unknown>[]) {
    if (typeof t.tier !== 'number' || t.tier < 3 || typeof t.smallIcon !== 'string' || typeof t.tierName !== 'string') continue
    const color = typeof t.color === 'string' ? `#${t.color.slice(0, 6)}` : '#9a9a9a'
    out.push({ tier: t.tier, name: t.tierName.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase()), color, icon: t.smallIcon })
  }
  return out.length >= 20 ? out : null
}

function readTiersCache(): TierInfo[] | null {
  try {
    const raw = localStorage.getItem(TIERS_CACHE_KEY)
    if (!raw) return null
    const c = JSON.parse(raw) as { at: number; tiers: TierInfo[] }
    return Date.now() - c.at < TIERS_TTL && Array.isArray(c.tiers) ? c.tiers : null
  } catch {
    return null
  }
}

let tiersPromise: Promise<TierInfo[]> | null = null

/**
 * Official tier data: cached copy if fresh, else a live fetch from valorant-api.com (then cached),
 * else the bundled snapshot. Never rejects.
 */
export function loadValorantTiers(transport: Transport = defaultTransport): Promise<TierInfo[]> {
  tiersPromise ??= (async () => {
    const cached = readTiersCache()
    if (cached) return cached
    try {
      const res = await transport({ url: VALORANT_API_TIERS_URL })
      const tiers = res.status === 200 ? parseTiers(JSON.parse(res.body)) : null
      if (tiers) {
        try {
          localStorage.setItem(TIERS_CACHE_KEY, JSON.stringify({ at: Date.now(), tiers }))
        } catch {
          /* ignore */
        }
        return tiers
      }
    } catch {
      /* offline or blocked: use the snapshot */
    }
    return bundledTiers()
  })()
  return tiersPromise
}
