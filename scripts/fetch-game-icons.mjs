// Fetches real game icons and bundles them locally (public/game-icons/<id>.webp) so the web app and the
// offline desktop app show them without any network request.
//
//   node scripts/fetch-game-icons.mjs            # fetch only the missing icons
//   node scripts/fetch-game-icons.mjs --force    # refetch everything
//   node scripts/fetch-game-icons.mjs --only=cs2,valorant
//
// Sources, in order:
//   1. Steam: Store Search API (https://store.steampowered.com/api/storesearch/) finds the app, then the
//      official client icon (.ico) from Steam's CDN (cdn.cloudflare.steamstatic.com). The icon hash comes
//      from api.steamcmd.net (a public mirror of Steam's app info), because Valve's own endpoint needs a key.
//   2. Wikipedia / Wikimedia Commons (pageimages API): the logo shown in the game's article.
//   3. The official website's favicon (Google's favicon service).
// Every image is normalised to 160x160 WebP in headless Chrome (already used by the other scripts here).
// The icons are the games' trademarks, shown only to identify each game in a sensitivity tool.
import { mkdir, readFile, writeFile, access } from 'node:fs/promises'
import { chromium } from 'playwright-core'

const OUT = 'public/game-icons'
const FORCE = process.argv.includes('--force')
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean)
const UA = 'Aimless-icon-fetcher/2.2 (+https://github.com/pzxe/Aimless)'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Steam app ids where a name search is ambiguous (several titles share one Steam app). */
const STEAM_APP = {
  cs2: 730, csgo: 730, apex: 1172470, overwatch2: 2357570, r6siege: 359550, pubg: 578080, tf2: 440,
  destiny2: 1085660, thefinals: 2073850, haloinfinite: 1240440, quakechampions: 611500, quakelive: 282440,
  warzone: 1938090, 'mw2-2022': 1938090, 'mw3-2023': 1938090, css: 240, cs16: 10, dods: 300, l4d2: 550,
  halflife: 70, halflife2: 220, portal2: 620, gmod: 4000, blackmesa: 362890, tfc: 20, quake: 2310,
  'halo-mcc': 976730, rust: 252490, dayz: 221100, bf2042: 1517290, bf5: 1238810, bf1: 1238840,
  marvelrivals: 2767030, deadlock: 1422450, tarkov: null, valorant: null,
  titanfall: null,
  cod4: 7940, 'mw2-2009': 10180, bo1: 42700, ut99: 13240, ut2004: 13230, ut3: 13210, jka: 6020,
  coldwar: 1985810, reflex: 328070, bf6: 2807960, bo6: 1938090, bo7: 1938090,
  l4d: 500, portal: 400, hl2dm: 320, cscz: 80, dod: 30, alienswarm: 630, hlopfor: 50, hlbshift: 130,
  nmrih: 224260, fof: 265630, contagion: 238430, doi: 447820, zps: 17500, synergy: 17520, dystopia: 17580,
  bloodlines: 2600, darkmessiah: 2100, svencoop: 225840, 'alienswarm-rd': 563560, cod1: 2620, jk2: 6030,
  hunt: 594650, verdun: 242860, realmroyale: 813820, quake2: 2320, quake3: 2200, rtcw: 9010, toxikk: 324810, payday2: 218620,
}

/** Games that are not on Steam, or whose Steam page is not the best source: Wikipedia title + website. */
const OFFSITE = {
  valorant: { wiki: 'Valorant', domain: 'playvalorant.com' },
  titanfall: { wiki: 'Titanfall (video game)', domain: 'ea.com' },
  fortnite: { wiki: 'Fortnite', domain: 'fortnite.com' },
  tarkov: { wiki: 'Escape from Tarkov', domain: 'escapefromtarkov.com' },
  xdefiant: { wiki: 'XDefiant', domain: 'ubisoft.com' },
  overwatch: { wiki: 'Overwatch (video game)', domain: 'playoverwatch.com' },
  bo7: { wiki: 'Call of Duty: Black Ops 7', domain: 'callofduty.com' },
  bf6: { wiki: 'Battlefield 6', domain: 'ea.com' },
  splitgate2: { wiki: 'Splitgate 2', domain: 'splitgate.com' },
  krunker: { wiki: 'Krunker', domain: 'krunker.io' },
  crossfire: { wiki: 'CrossFire (video game)', domain: 'crossfire.com' },
  warface: { wiki: 'Warface', domain: 'warface.com' },
  spectredivide: { wiki: 'Spectre Divide', domain: 'spectredivide.com' },
  fragpunk: { wiki: 'FragPunk', domain: 'fragpunk.com' },
  strinova: { wiki: 'Strinova', domain: 'strinova.com' },
  concord: { wiki: 'Concord (video game)', domain: 'playconcord.com' },
  bloodstrike: { wiki: 'Blood Strike', domain: 'bloodstrike.com' },
  'cod-wz-mobile': { wiki: 'Call of Duty: Warzone Mobile', domain: 'callofduty.com' },
  mw2009: { wiki: 'Call of Duty: Modern Warfare 2', domain: 'callofduty.com' },
  'mw2-2009': { wiki: 'Call of Duty: Modern Warfare 2', domain: 'callofduty.com' },
  cod4: { wiki: 'Call of Duty 4: Modern Warfare', domain: 'callofduty.com' },
  bo1: { wiki: 'Call of Duty: Black Ops', domain: 'callofduty.com' },
  bo4: { wiki: 'Call of Duty: Black Ops 4', domain: 'callofduty.com' },
  mw2019: { wiki: 'Call of Duty: Modern Warfare (2019 video game)', domain: 'callofduty.com' },
  coldwar: { wiki: 'Call of Duty: Black Ops Cold War', domain: 'callofduty.com' },
  vanguard: { wiki: 'Call of Duty: Vanguard', domain: 'callofduty.com' },
  bo6: { wiki: 'Call of Duty: Black Ops 6', domain: 'callofduty.com' },
  'mw2-2022': { wiki: 'Call of Duty: Modern Warfare II (2022 video game)', domain: 'callofduty.com' },
  'mw3-2023': { wiki: 'Call of Duty: Modern Warfare III (2023 video game)', domain: 'callofduty.com' },
  warzone: { wiki: 'Call of Duty: Warzone', domain: 'callofduty.com' },
  diabotical: { wiki: 'Diabotical', domain: 'diabotical.com' },
  reflex: { wiki: 'Reflex Arena', domain: 'reflexfps.net' },
  bloodhunt: { wiki: 'Vampire: The Masquerade – Bloodhunt', domain: 'bloodhunt.com' },
  h1z1: { wiki: 'H1Z1', domain: 'z1battleroyale.com' },
  realmroyale: { wiki: 'Realm Royale', domain: 'realmroyale.com' },
  'super-people': { wiki: 'Super People (video game)', domain: 'superpeople.com' },
  farlight84: { wiki: 'Farlight 84', domain: 'farlight84.farlightgames.com' },
  thecycle: { wiki: 'The Cycle: Frontier', domain: 'thecyclefrontier.com' },
  battleborn: { wiki: 'Battleborn (video game)', domain: 'battleborn.com' },
  quake3: { wiki: 'Quake III Arena', domain: 'quake.com' },
  quake2: { wiki: 'Quake II', domain: 'quake.com' },
  wolfet: { wiki: 'Wolfenstein: Enemy Territory', domain: 'enemy-territory.com' },
  rtcw: { wiki: 'Return to Castle Wolfenstein', domain: 'bethesda.net' },
  jka: { wiki: 'Star Wars Jedi Knight: Jedi Academy', domain: 'starwars.com' },
  mohaa: { wiki: 'Medal of Honor: Allied Assault', domain: 'ea.com' },
  xonotic: { wiki: 'Xonotic', domain: 'xonotic.org' },
  warsow: { wiki: 'Warsow', domain: 'warsow.net' },
  ut99: { wiki: 'Unreal Tournament', domain: 'unrealtournament.com' },
  ut2004: { wiki: 'Unreal Tournament 2004', domain: 'unrealtournament.com' },
  ut3: { wiki: 'Unreal Tournament 3', domain: 'unrealtournament.com' },
  toxikk: { wiki: 'Toxikk', domain: 'toxikk.com' },
  arma3: { wiki: 'Arma 3', domain: 'arma3.com' },
  enlisted: { wiki: 'Enlisted (video game)', domain: 'enlisted.net' },
  verdun: { wiki: 'Verdun (video game)', domain: 'verdun-game.com' },
  paladins: { wiki: 'Paladins (video game)', domain: 'paladins.com' },
  hunt: { wiki: 'Hunt: Showdown', domain: 'huntshowdown.com' },
  payday2: { wiki: 'Payday 2', domain: 'payday2.com' },
  openarena: { wiki: 'OpenArena', domain: 'openarena.ws' },
  nexuiz: { wiki: 'Nexuiz', domain: 'alientrap.org' },
}

/** Publisher-wide favicons that would put the same logo on many different games: never used. */
const GENERIC_FAVICON = new Set(['callofduty.com', 'ea.com', 'starwars.com', 'unrealtournament.com', 'ubisoft.com'])

/** Fetched but rejected after a visual check (wrong logo, blank or illegible): these keep the generated badge. */
const DENY = new Set(['bf6', 'battleborn', 'concord', 'paladins', 'bloodstrike', 'warface'])

const GOOD_WIKI = /\.(png|jpe?g|webp|svg)/i
const BAD_NAME = /soundtrack|dlc|demo|beta|playtest|test|bundle|pack|edition upgrade|season pass|server|dedicated|sdk|tool|expansion|skin|cosmetic|artbook|wallpaper/i
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '')

async function getJson(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!r.ok) throw new Error(`${r.status} ${url}`)
  return r.json()
}
async function getBuf(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' })
  if (!r.ok) throw new Error(`${r.status} ${url}`)
  return { buf: Buffer.from(await r.arrayBuffer()), type: r.headers.get('content-type') || '' }
}

/** Reads the game list from the two data files (no TS toolchain needed). */
async function readGames() {
  const games = []
  const core = await readFile('src/data/games/games.ts', 'utf8')
  for (const m of core.matchAll(/id: '([^']+)', name: ('[^']*'|"[^"]*")/g)) games.push({ id: m[1], name: m[2].slice(1, -1) })
  const cat = await readFile('src/data/games/catalog.ts', 'utf8')
  for (const m of cat.matchAll(/game\('([^']+)', ('[^']*'|"[^"]*")/g)) games.push({ id: m[1], name: m[2].slice(1, -1) })
  return games
}

async function steamAppFor(g) {
  if (g.id in STEAM_APP) return STEAM_APP[g.id]
  const q = g.name.replace(/\(.*?\)/g, '').replace(/:/g, ' ').replace(/\s+/g, ' ').trim()
  const data = await getJson(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(q)}&l=english&cc=US`)
  const want = norm(q)
  const apps = (data.items || []).filter((i) => i.type === 'app' && !BAD_NAME.test(i.name))
  const exact = apps.find((i) => norm(i.name.replace(/:/g, ' ')) === want)
  if (exact) return exact.id
  const starts = apps.find((i) => norm(i.name).startsWith(want))
  return starts ? starts.id : null
}

async function steamIcon(appid) {
  const info = await getJson(`https://api.steamcmd.net/v1/info/${appid}`)
  const common = info?.data?.[appid]?.common
  if (!common) return null
  if (common.clienticon) {
    try {
      return { ...(await getBuf(`https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/${appid}/${common.clienticon}.ico`)), source: `steam:${appid}` }
    } catch {
      /* fall through to the capsule */
    }
  }
  try {
    return { ...(await getBuf(`https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appid}/library_600x900.jpg`)), source: `steam-capsule:${appid}` }
  } catch {
    return null
  }
}

async function wikiLogo(title) {
  const d = await getJson(
    `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&format=json&pithumbsize=320&redirects=1`,
  )
  const page = Object.values(d.query?.pages || {})[0]
  const src = page?.thumbnail?.source
  if (!src || !GOOD_WIKI.test(src)) return null
  return { ...(await getBuf(src)), source: `wikipedia:${title}` }
}

async function favicon(domain) {
  if (GENERIC_FAVICON.has(domain)) return null
  const { buf, type } = await getBuf(`https://www.google.com/s2/favicons?domain=${domain}&sz=256`)
  return buf.length > 400 ? { buf, type, source: `favicon:${domain}` } : null
}

async function exists(p) {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

const games = (await readGames()).filter((g) => !ONLY.length || ONLY.includes(g.id))
await mkdir(OUT, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage()
await page.setContent('<canvas id="c"></canvas>')

/** Normalises any image to a 160x160 WebP: covers square-ish art, fits logos with padding. */
async function toWebp(buf, type) {
  const b64 = buf.toString('base64')
  const mime = type.split(';')[0] || 'application/octet-stream'
  const out = await page.evaluate(
    async ({ b64, mime }) => {
      const blob = await (await fetch(`data:${mime};base64,${b64}`)).blob()
      const img = await new Promise((res, rej) => {
        const i = new Image()
        i.onload = () => res(i)
        i.onerror = () => rej(new Error('decode'))
        i.src = URL.createObjectURL(blob)
      })
      const S = 160
      const c = document.getElementById('c')
      c.width = c.height = S
      const ctx = c.getContext('2d')
      ctx.clearRect(0, 0, S, S)
      const ratio = img.naturalWidth / img.naturalHeight
      if (ratio > 0.85 && ratio < 1.18) {
        ctx.drawImage(img, 0, 0, S, S)
      } else if (ratio < 0.85) {
        // Portrait key art: take a square from the upper-middle.
        const side = img.naturalWidth
        ctx.drawImage(img, 0, img.naturalHeight * 0.12, side, side, 0, 0, S, S)
      } else {
        const pad = S * 0.08
        const w = S - pad * 2
        const h = w / ratio
        ctx.drawImage(img, pad, (S - h) / 2, w, h)
      }
      return c.toDataURL('image/webp', 0.9).split(',')[1]
    },
    { b64, mime },
  )
  return Buffer.from(out, 'base64')
}

const report = { ok: [], missing: [] }
const manifest = JSON.parse((await exists(`${OUT}/manifest.json`)) ? await readFile(`${OUT}/manifest.json`, 'utf8') : '{}')

for (const g of games) {
  const file = `${OUT}/${g.id}.webp`
  if (DENY.has(g.id)) {
    report.missing.push(g.id)
    continue
  }
  if (!FORCE && (await exists(file))) {
    report.ok.push(g.id)
    continue
  }
  let got = null
  const attempts = []
  const off = OFFSITE[g.id]
  const preferWiki = Boolean(off) && !(g.id in STEAM_APP && STEAM_APP[g.id])
  try {
    if (!preferWiki) {
      const app = await steamAppFor(g)
      if (app) got = await steamIcon(app)
    }
    if (!got && off?.wiki) got = await wikiLogo(off.wiki)
    if (!got && off?.domain) got = await favicon(off.domain)
    if (!got && !off) {
      // Last resort for unmapped titles: the article with the game's own name.
      got = await wikiLogo(`${g.name.replace(/\s*\(.*?\)\s*/g, '')} (video game)`).catch(() => null)
      if (!got) got = await wikiLogo(g.name.replace(/\s*\(.*?\)\s*/g, '')).catch(() => null)
    }
    if (got) {
      await writeFile(file, await toWebp(got.buf, got.type))
      manifest[g.id] = got.source
      report.ok.push(g.id)
      console.log('✓', g.id.padEnd(16), got.source)
    }
  } catch (e) {
    attempts.push(String(e.message || e))
  }
  if (!got) {
    report.missing.push(g.id)
    console.log('✗', g.id.padEnd(16), g.name, attempts.join(' | '))
  }
  await sleep(120)
}
await browser.close()

const ids = [...new Set(games.length ? (await readGames()).map((g) => g.id) : [])].filter((id) => manifest[id] || report.ok.includes(id))
const have = []
for (const id of ids) if (await exists(`${OUT}/${id}.webp`)) have.push(id)
await writeFile(`${OUT}/manifest.json`, JSON.stringify(Object.fromEntries(Object.entries(manifest).sort()), null, 2) + '\n')
await writeFile(
  'src/data/games/gameIcons.ts',
  `// Generated by scripts/fetch-game-icons.mjs. Games that have a bundled icon in public/game-icons/.\nexport const GAME_ICON_IDS: ReadonlySet<string> = new Set(${JSON.stringify(have.sort(), null, 2)})\n`,
)
console.log(`\n${have.length} icons bundled, ${report.missing.length} missing: ${report.missing.join(', ')}`)
