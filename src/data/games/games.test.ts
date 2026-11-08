/// <reference types="node" />
import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { getAllGames, getGame } from '@/core/sensitivity'
import { GAME_ICON_IDS } from './gameIcons'

const games = getAllGames()

/** The 23 titles added in v2.5.3 (documented engine rotation only; each has a real, visually checked icon). */
const NEW_IN_253 = ['l4d', 'portal', 'hl2dm', 'cscz', 'dod', 'alienswarm', 'hlopfor', 'hlbshift', 'nmrih', 'fof', 'contagion', 'doi', 'zps', 'synergy', 'dystopia', 'bloodlines', 'darkmessiah', 'svencoop', 'alienswarm-rd', 'cod1', 'jk2', 'openarena', 'nexuiz']
const count = (a: string) => games.filter((g) => g.accuracy === a).length

describe('game database', () => {
  it('has 148 games with unique ids', () => {
    expect(games).toHaveLength(148)
    expect(new Set(games.map((g) => g.id)).size).toBe(148)
  })

  it('has the audited accuracy split: 34 verified, 38 approximate, 76 unsupported (72 supported)', () => {
    expect(count('verified')).toBe(34)
    expect(count('approximate')).toBe(38)
    expect(count('unsupported')).toBe(76)
    expect(games.filter((g) => g.formula !== null)).toHaveLength(72)
  })

  it('upgraded Titanfall 2 to verified at the Source 0.022 yaw, with its own note', () => {
    const g = getGame('titanfall2')!
    expect(g.accuracy).toBe('verified')
    expect(g.formula).toEqual({ kind: 'linear', yaw: 0.022 })
    expect(g.noteKey).toBe('note.titanfall2')
  })

  it('keeps games with conflicting or missing sources out of "verified"', () => {
    for (const id of ['deadlock', 'marvelrivals', 'haloinfinite', 'krunker', 'doom2016', 'cod4']) {
      expect(getGame(id)!.accuracy, id).not.toBe('verified')
    }
  })

  it('v2.5.3 additions: Valve titles verified at the documented 0.022 yaw, third-party engine relatives approximate', () => {
    for (const id of ['l4d', 'portal', 'hl2dm', 'cscz', 'dod', 'alienswarm', 'hlopfor', 'hlbshift']) {
      expect(getGame(id)!.accuracy, id).toBe('verified')
      expect(getGame(id)!.formula, id).toEqual({ kind: 'linear', yaw: 0.022 })
    }
    for (const id of NEW_IN_253.filter((x) => !['l4d', 'portal', 'hl2dm', 'cscz', 'dod', 'alienswarm', 'hlopfor', 'hlbshift'].includes(x))) {
      expect(getGame(id)!.accuracy, id).toBe('approximate')
      expect(getGame(id)!.formula, id).toEqual({ kind: 'linear', yaw: 0.022 })
    }
  })

  it('never has a verified game without a formula', () => {
    for (const g of games.filter((x) => x.accuracy === 'verified')) expect(g.formula, g.id).not.toBeNull()
  })
})

describe('bundled game icons', () => {
  it('only lists real games and ships a file for each', () => {
    for (const id of GAME_ICON_IDS) {
      expect(getGame(id), id).toBeDefined()
      expect(existsSync(`public/game-icons/${id}.webp`), id).toBe(true)
    }
  })
  it('covers at least 100 games', () => {
    expect(GAME_ICON_IDS.size).toBeGreaterThanOrEqual(100)
  })
  it('gives every game added in v2.5.3 an authentic bundled icon', () => {
    for (const id of NEW_IN_253) expect(GAME_ICON_IDS.has(id), id).toBe(true)
  })
})

describe('Valorant tier icons', () => {
  it('ships an icon for every tier', () => {
    for (let t = 3; t <= 27; t++) expect(existsSync(`public/rank-icons/valorant/${t}.png`), String(t)).toBe(true)
  })
})
