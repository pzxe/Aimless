/**
 * Gaming ID parsing and profile deep links. Pure functions, no network.
 *
 * Every link points to a public page on a third-party tracker; nothing is sent from the app.
 */

export type IdKind = 'riot' | 'battletag' | 'steam' | 'epic' | 'ubisoft' | 'activision' | 'origin' | 'generic'

/** Which kind of in-game ID each game with a tracker uses. Other games take a free-form ID. */
export const GAME_ID_KIND: Record<string, IdKind> = {
  valorant: 'riot',
  overwatch2: 'battletag',
  overwatch: 'battletag',
  cs2: 'steam',
  csgo: 'steam',
  apex: 'origin',
  fortnite: 'epic',
  r6siege: 'ubisoft',
  warzone: 'activision',
  marvelrivals: 'generic',
  pubg: 'steam',
}

export const ID_KIND_PLACEHOLDER: Record<IdKind, string> = {
  riot: 'Name#TAG',
  battletag: 'Name#1234',
  steam: '76561198000000000',
  epic: 'EpicName',
  ubisoft: 'UbisoftName',
  activision: 'Name#1234567',
  origin: 'EAName',
  generic: 'Name',
}

export interface NameTag {
  name: string
  tag: string
}

function splitHash(input: string): NameTag | null {
  const s = input.trim()
  const i = s.lastIndexOf('#')
  if (i <= 0 || i === s.length - 1) return null
  return { name: s.slice(0, i).trim(), tag: s.slice(i + 1).trim() }
}

/** Riot ID `Name#TAG`: name 3 to 16 characters (spaces allowed), tag 3 to 5 letters or digits. */
export function parseRiotId(input: string): NameTag | null {
  const p = splitHash(input)
  if (!p) return null
  if (p.name.length < 3 || p.name.length > 16) return null
  if (!/^[\p{L}\p{N}]{3,5}$/u.test(p.tag)) return null
  return p
}

/**
 * BattleTag `Name#1234`: name 3 to 12 characters starting with a letter (no spaces),
 * discriminator of 4 to 8 digits. The OverFast API form `Name-1234` is accepted too.
 */
export function parseBattleTag(input: string): NameTag | null {
  const s = input.trim()
  let m: NameTag | null
  if (s.includes('#')) m = splitHash(s)
  else {
    const j = s.lastIndexOf('-')
    m = j > 0 ? { name: s.slice(0, j), tag: s.slice(j + 1) } : null
  }
  if (!m) return null
  if (!/^\p{L}[\p{L}\p{N}]{2,11}$/u.test(m.name)) return null
  if (!/^\d{4,8}$/.test(m.tag)) return null
  return m
}

/** BattleTag to the OverFast player id: `Player#1234` becomes `Player-1234`. */
export function battleTagToOverFastId(input: string): string | null {
  const p = parseBattleTag(input)
  return p ? `${p.name}-${p.tag}` : null
}

export function isSteamId64(input: string): boolean {
  return /^7656119\d{10}$/.test(input.trim())
}

export interface TrackerLink {
  id: string
  /** Site name shown on the button (a proper noun, not translated). */
  label: string
  url: string
}

const enc = encodeURIComponent

/** Profile deep links for a game and an in-game ID. Empty when the ID can't be used. */
export function trackerLinks(gameId: string, rawId: string): TrackerLink[] {
  const id = rawId.trim()
  if (!id) return []
  const links: TrackerLink[] = []
  const add = (key: string, label: string, url: string) => links.push({ id: key, label, url })

  switch (gameId) {
    case 'valorant': {
      const p = parseRiotId(id)
      if (!p) return []
      add('trackergg', 'Tracker.gg', `https://tracker.gg/valorant/profile/riot/${enc(`${p.name}#${p.tag}`)}/overview`)
      add('opgg', 'OP.GG', `https://www.op.gg/valorant/profile/${enc(p.name)}-${enc(p.tag)}`)
      break
    }
    case 'overwatch2':
    case 'overwatch': {
      const p = parseBattleTag(id)
      if (!p) return []
      add('trackergg', 'Tracker.gg', `https://tracker.gg/overwatch/profile/battlenet/${enc(`${p.name}#${p.tag}`)}/overview`)
      add('blizzard', 'Blizzard', `https://overwatch.blizzard.com/en-us/career/${enc(`${p.name}-${p.tag}`)}/`)
      add('overfast', 'OverFast', `https://overfast-api.tekrop.fr/players/${enc(`${p.name}-${p.tag}`)}/summary`)
      break
    }
    case 'cs2':
    case 'csgo': {
      add('trackergg', 'Tracker.gg', `https://tracker.gg/cs2/profile/steam/${enc(id)}/overview`)
      if (isSteamId64(id)) {
        add('leetify', 'Leetify', `https://leetify.com/app/profile/${id}`)
        add('steam', 'Steam', `https://steamcommunity.com/profiles/${id}`)
      } else add('steam', 'Steam', `https://steamcommunity.com/id/${enc(id)}`)
      break
    }
    case 'apex':
      add('trackergg', 'Tracker.gg', `https://tracker.gg/apex/profile/origin/${enc(id)}/overview`)
      break
    case 'fortnite':
      add('fortnitetracker', 'Fortnite Tracker', `https://fortnitetracker.com/profile/all/${enc(id)}`)
      break
    case 'r6siege':
      add('trackergg', 'Tracker.gg', `https://tracker.gg/r6siege/profile/ubi/${enc(id)}/overview`)
      break
    case 'warzone':
      add('trackergg', 'Tracker.gg', `https://cod.tracker.gg/warzone/profile/atvi/${enc(id)}/overview`)
      break
    case 'marvelrivals':
      add('trackergg', 'Tracker.gg', `https://tracker.gg/marvel-rivals/profile/ign/${enc(id)}/overview`)
      break
    case 'pubg':
      add('trackergg', 'Tracker.gg', `https://tracker.gg/pubg/profile/steam/${enc(id)}/overview`)
      add('opgg', 'OP.GG', `https://pubg.op.gg/user/${enc(id)}`)
      break
    default:
      return []
  }
  return links
}

/** Games that have at least one tracker deep link. */
export const TRACKER_GAMES: readonly string[] = [
  'valorant',
  'overwatch2',
  'cs2',
  'apex',
  'fortnite',
  'r6siege',
  'warzone',
  'marvelrivals',
  'pubg',
]
