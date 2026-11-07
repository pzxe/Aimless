import type { GameDefinition, Genre } from '@/core/sensitivity/types'

/**
 * Additional titles (v2.1). Same honesty rules as games.ts:
 * - verified:    a documented engine console variable (Source/GoldSrc m_yaw, Quake-engine m_yaw)
 *                or the same engine and scale as an already verified title (Overwatch).
 * - approximate: an engine relative that may rescale sensitivity; each carries a note.
 * - unsupported: no reliable constant known (formula null). Users can calibrate.
 *
 * Colours are derived from the id so every game gets a distinct, original emblem.
 */

/** Stable hue from an id (FNV-1a), for original emblem colours. */
export function hueOf(id: string): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) % 360
}

function hslToHex(h: number, s: number, l: number): string {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const c = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(255 * c).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

type Kind = 'source' | 'idtech' | 'sourceApprox' | 'idtechApprox' | 'codFamily' | 'codClassic' | 'overwatch' | 'none'

const KIND: Record<Kind, Pick<GameDefinition, 'formula' | 'accuracy' | 'noteKey' | 'edpiComparable'>> = {
  source: { formula: { kind: 'linear', yaw: 0.022 }, accuracy: 'verified', noteKey: 'note.source', edpiComparable: true },
  idtech: { formula: { kind: 'linear', yaw: 0.022 }, accuracy: 'verified', noteKey: 'note.idTech', edpiComparable: true },
  sourceApprox: { formula: { kind: 'linear', yaw: 0.022 }, accuracy: 'approximate', noteKey: 'note.sourceApprox', edpiComparable: true },
  idtechApprox: { formula: { kind: 'linear', yaw: 0.022 }, accuracy: 'approximate', noteKey: 'note.idTechApprox', edpiComparable: true },
  codFamily: { formula: { kind: 'linear', yaw: 0.0066 }, accuracy: 'approximate', noteKey: 'note.codFamily', edpiComparable: true },
  codClassic: { formula: { kind: 'linear', yaw: 0.022 }, accuracy: 'approximate', noteKey: 'note.codClassic', edpiComparable: true },
  overwatch: { formula: { kind: 'linear', yaw: 0.0066 }, accuracy: 'verified', noteKey: 'note.overwatch1', edpiComparable: true },
  none: { formula: null, accuracy: 'unsupported', noteKey: 'note.unsupportedGeneric', edpiComparable: false },
}

function game(
  id: string,
  name: string,
  short: string,
  genre: Genre,
  kind: Kind,
  engine: string,
  extra: Partial<GameDefinition> = {},
): GameDefinition {
  return {
    id,
    name,
    short,
    genre,
    color: hslToHex(hueOf(id), 68, 56),
    scaleLabel: 'Sensitivity',
    engine,
    status: 'active',
    ...KIND[kind],
    ...extra,
  }
}

const gone = { status: 'discontinued' as const }

export const CATALOG: GameDefinition[] = [
  // Tactical
  game('css', 'Counter-Strike: Source', 'CSS', 'tactical', 'source', 'Source'),
  game('cs16', 'Counter-Strike 1.6', 'CS16', 'tactical', 'source', 'GoldSrc'),
  game('dods', 'Day of Defeat: Source', 'DODS', 'tactical', 'source', 'Source'),
  game('insurgency', 'Insurgency (2014)', 'INS', 'tactical', 'sourceApprox', 'Source'),
  game('sandstorm', 'Insurgency: Sandstorm', 'INSS', 'tactical', 'none', 'Unreal Engine 4'),
  game('r6extraction', 'Rainbow Six Extraction', 'R6X', 'tactical', 'none', 'AnvilNext'),
  game('readyornot', 'Ready or Not', 'RON', 'tactical', 'none', 'Unreal Engine 5'),
  game('groundbranch', 'Ground Branch', 'GB', 'tactical', 'none', 'Unreal Engine 4'),
  game('spectredivide', 'Spectre Divide', 'SPD', 'tactical', 'none', 'Unreal Engine 5', gone),
  game('fragpunk', 'FragPunk', 'FPK', 'tactical', 'none', 'Unreal Engine 5'),
  game('crossfire', 'CrossFire', 'CF', 'tactical', 'none', 'LithTech'),
  game('warface', 'Warface', 'WF', 'tactical', 'none', 'CryEngine'),
  game('blackmesa', 'Black Mesa', 'BM', 'singleplayer', 'source', 'Source'),

  // Military and large-scale
  game('bf2042', 'Battlefield 2042', 'BF42', 'military', 'none', 'Frostbite'),
  game('bf5', 'Battlefield V', 'BFV', 'military', 'none', 'Frostbite'),
  game('bf1', 'Battlefield 1', 'BF1', 'military', 'none', 'Frostbite'),
  game('bf4', 'Battlefield 4', 'BF4', 'military', 'none', 'Frostbite'),
  game('bf3', 'Battlefield 3', 'BF3', 'military', 'none', 'Frostbite'),
  game('squad', 'Squad', 'SQD', 'military', 'none', 'Unreal Engine 5'),
  game('hellletloose', 'Hell Let Loose', 'HLL', 'military', 'none', 'Unreal Engine 4'),
  game('arma3', 'Arma 3', 'ARMA', 'military', 'none', 'Real Virtuality 4'),
  game('arma-reforger', 'Arma Reforger', 'ARF', 'military', 'none', 'Enfusion'),
  game('rs2', 'Rising Storm 2: Vietnam', 'RS2', 'military', 'none', 'Unreal Engine 3'),
  game('verdun', 'Verdun', 'VRD', 'military', 'none', 'Unity'),
  game('enlisted', 'Enlisted', 'ENL', 'military', 'none', 'Dagor'),
  game('deltaforce', 'Delta Force (2024)', 'DF', 'military', 'none', 'Unreal Engine 4'),
  game('swbf2', 'Star Wars Battlefront II (2017)', 'SWBF', 'military', 'none', 'Frostbite'),

  // Call of Duty
  game('mw2019', 'Call of Duty: Modern Warfare (2019)', 'MW19', 'military', 'codFamily', 'IW engine'),
  game('mw2-2022', 'Call of Duty: Modern Warfare II (2022)', 'MWII', 'military', 'codFamily', 'IW engine'),
  game('mw3-2023', 'Call of Duty: Modern Warfare III (2023)', 'MWIII', 'military', 'codFamily', 'IW engine'),
  game('coldwar', 'Call of Duty: Black Ops Cold War', 'BOCW', 'military', 'codFamily', 'IW engine'),
  game('vanguard', 'Call of Duty: Vanguard', 'VG', 'military', 'codFamily', 'IW engine'),
  game('bo4', 'Call of Duty: Black Ops 4', 'BO4', 'military', 'none', 'IW engine'),
  game('cod4', 'Call of Duty 4: Modern Warfare', 'COD4', 'classic', 'codClassic', 'IW 3'),
  game('mw2-2009', 'Call of Duty: Modern Warfare 2 (2009)', 'MW2', 'classic', 'codClassic', 'IW 4'),
  game('bo1', 'Call of Duty: Black Ops (2010)', 'BO1', 'classic', 'codClassic', 'IW 3 (Treyarch)'),

  // Battle royale
  game('farlight84', 'Farlight 84', 'F84', 'battle-royale', 'none', 'Unity'),
  game('bloodstrike', 'Blood Strike', 'BS', 'battle-royale', 'none', 'Messiah'),
  game('realmroyale', 'Realm Royale', 'RR', 'battle-royale', 'none', 'Unreal Engine 3'),
  game('bloodhunt', 'Bloodhunt', 'BH', 'battle-royale', 'none', 'Unreal Engine 4', gone),
  game('super-people', 'Super People', 'SP', 'battle-royale', 'none', 'Unreal Engine 4', gone),
  game('h1z1', 'Z1 Battle Royale', 'Z1', 'battle-royale', 'none', 'ForgeLight', gone),
  game('cod-wz-mobile', 'Call of Duty: Warzone Mobile', 'WZM', 'battle-royale', 'none', 'IW engine', gone),

  // Arena shooters
  game('quake', 'Quake (1996)', 'Q1', 'arena', 'idtech', 'Quake engine'),
  game('quake2', 'Quake II', 'Q2', 'arena', 'idtech', 'id Tech 2'),
  game('quake3', 'Quake III Arena', 'Q3', 'arena', 'idtech', 'id Tech 3'),
  game('quake4', 'Quake 4', 'Q4', 'arena', 'idtechApprox', 'id Tech 4'),
  game('wolfet', 'Wolfenstein: Enemy Territory', 'ET', 'arena', 'idtech', 'id Tech 3'),
  game('rtcw', 'Return to Castle Wolfenstein', 'RTCW', 'classic', 'idtech', 'id Tech 3'),
  game('jka', 'Star Wars Jedi Knight: Jedi Academy', 'JKA', 'classic', 'idtechApprox', 'id Tech 3'),
  game('mohaa', 'Medal of Honor: Allied Assault', 'MOHA', 'classic', 'idtechApprox', 'id Tech 3'),
  game('xonotic', 'Xonotic', 'XON', 'arena', 'idtechApprox', 'DarkPlaces'),
  game('warsow', 'Warsow', 'WSW', 'arena', 'idtechApprox', 'Qfusion'),
  game('diabotical', 'Diabotical', 'DBT', 'arena', 'none', 'Custom', gone),
  game('reflex', 'Reflex Arena', 'RFX', 'arena', 'none', 'Custom'),
  game('ut2004', 'Unreal Tournament 2004', 'UT04', 'arena', 'none', 'Unreal Engine 2'),
  game('ut3', 'Unreal Tournament 3', 'UT3', 'arena', 'none', 'Unreal Engine 3'),
  game('ut99', 'Unreal Tournament (1999)', 'UT99', 'classic', 'none', 'Unreal Engine 1'),
  game('toxikk', 'Toxikk', 'TXK', 'arena', 'none', 'Unreal Engine 3'),
  game('krunker', 'Krunker', 'KRN', 'arena', 'none', 'Three.js'),
  game('splitgate', 'Splitgate (2019)', 'SG1', 'arena', 'none', 'Unreal Engine 4'),
  game('halo-mcc', 'Halo: The Master Chief Collection', 'MCC', 'arena', 'none', 'Blam!'),
  // Verified (v2.2.1): published at the Source 0.022 yaw by several independent converter databases
  // (mouse-sensitivity.com, csdb.gg, skin.club), which agree with each other.
  game('titanfall2', 'Titanfall 2', 'T2', 'arena', 'source', 'Source (modified)', { noteKey: 'note.titanfall2' }),
  game('titanfall', 'Titanfall', 'TTF', 'arena', 'sourceApprox', 'Source (modified)', gone),
  game('doom2016', 'Doom (2016)', 'DM16', 'arena', 'idtechApprox', 'id Tech 6'),
  game('doometernal', 'Doom Eternal', 'DMET', 'arena', 'idtechApprox', 'id Tech 7'),
  game('doom3', 'Doom 3', 'DM3', 'classic', 'idtechApprox', 'id Tech 4'),

  // Hero shooters
  game('overwatch', 'Overwatch (2016)', 'OW1', 'hero', 'overwatch', 'Proprietary', gone),
  game('tfc', 'Team Fortress Classic', 'TFC', 'hero', 'source', 'GoldSrc'),
  game('paladins', 'Paladins', 'PAL', 'hero', 'none', 'Unreal Engine 3'),
  game('marvelrivals', 'Marvel Rivals', 'MR', 'hero', 'none', 'Unreal Engine 5'),
  game('deadlock', 'Deadlock', 'DLK', 'hero', 'none', 'Source 2'),
  game('concord', 'Concord', 'CCD', 'hero', 'none', 'Proprietary', gone),
  game('strinova', 'Strinova', 'STR', 'hero', 'none', 'Unreal Engine 4'),
  game('roguecompany', 'Rogue Company', 'RC', 'hero', 'none', 'Unreal Engine 4'),
  game('battleborn', 'Battleborn', 'BB', 'hero', 'none', 'Unreal Engine 3', gone),

  // Extraction and survival
  game('tarkov', 'Escape from Tarkov', 'EFT', 'extraction', 'none', 'Unity'),
  game('hunt', 'Hunt: Showdown 1896', 'HNT', 'extraction', 'none', 'CryEngine'),
  game('arenabreakout', 'Arena Breakout: Infinite', 'ABI', 'extraction', 'none', 'Unreal Engine 5'),
  game('grayzone', 'Gray Zone Warfare', 'GZW', 'extraction', 'none', 'Unreal Engine 5'),
  game('arcraiders', 'ARC Raiders', 'ARC', 'extraction', 'none', 'Unreal Engine 5'),
  game('thecycle', 'The Cycle: Frontier', 'TCF', 'extraction', 'none', 'Unreal Engine 4', gone),
  game('rust', 'Rust', 'RST', 'extraction', 'none', 'Unity'),
  game('dayz', 'DayZ', 'DZ', 'extraction', 'none', 'Enfusion'),

  // Co-op and single-player
  game('halflife', 'Half-Life', 'HL1', 'singleplayer', 'source', 'GoldSrc'),
  game('halflife2', 'Half-Life 2', 'HL2', 'singleplayer', 'source', 'Source'),
  game('portal2', 'Portal 2', 'P2', 'singleplayer', 'source', 'Source'),
  game('l4d2', 'Left 4 Dead 2', 'L4D2', 'coop', 'source', 'Source'),
  game('gmod', "Garry's Mod", 'GMOD', 'coop', 'source', 'Source'),
  game('drg', 'Deep Rock Galactic', 'DRG', 'coop', 'none', 'Unreal Engine 4'),
  game('payday2', 'Payday 2', 'PD2', 'coop', 'none', 'Diesel'),
  game('payday3', 'Payday 3', 'PD3', 'coop', 'none', 'Unreal Engine 4'),
  game('back4blood', 'Back 4 Blood', 'B4B', 'coop', 'none', 'Unreal Engine 4'),
  game('kf2', 'Killing Floor 2', 'KF2', 'coop', 'none', 'Unreal Engine 3'),
  game('borderlands3', 'Borderlands 3', 'BL3', 'coop', 'none', 'Unreal Engine 4'),
  game('borderlands2', 'Borderlands 2', 'BL2', 'coop', 'none', 'Unreal Engine 3'),
  game('metroexodus', 'Metro Exodus', 'MTX', 'singleplayer', 'none', '4A Engine'),
  game('farcry6', 'Far Cry 6', 'FC6', 'singleplayer', 'none', 'Dunia 2'),
  game('farcry5', 'Far Cry 5', 'FC5', 'singleplayer', 'none', 'Dunia 2'),
  game('cyberpunk', 'Cyberpunk 2077', 'CP77', 'singleplayer', 'none', 'REDengine 4'),
  game('atomicheart', 'Atomic Heart', 'AH', 'singleplayer', 'none', 'Unreal Engine 4'),
  game('wolf2', 'Wolfenstein II: The New Colossus', 'WF2', 'singleplayer', 'none', 'id Tech 6'),
  game('serioussam4', 'Serious Sam 4', 'SS4', 'singleplayer', 'none', 'Serious Engine 4'),
  game('ultrakill', 'Ultrakill', 'UK', 'singleplayer', 'none', 'Unity'),
  game('prey2017', 'Prey (2017)', 'PRY', 'singleplayer', 'none', 'CryEngine'),
]
