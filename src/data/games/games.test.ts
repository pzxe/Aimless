/// <reference types="node" />
import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { getAllGames, getGame } from '@/core/sensitivity'
import { GAME_ICON_IDS } from './gameIcons'

const games = getAllGames()
const count = (a: string) => games.filter((g) => g.accuracy === a).length

describe('game database', () => {
  it('has 125 games with unique ids', () => {
    expect(games).toHaveLength(125)
    expect(new Set(games.map((g) => g.id)).size).toBe(125)
  })

  it('has the audited accuracy split: 26 verified, 23 approximate, 76 unsupported', () => {
    expect(count('verified')).toBe(26)
    expect(count('approximate')).toBe(23)
    expect(count('unsupported')).toBe(76)
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
})

describe('Valorant tier icons', () => {
  it('ships an icon for every tier', () => {
    for (let t = 3; t <= 27; t++) expect(existsSync(`public/rank-icons/valorant/${t}.png`), String(t)).toBe(true)
  })
})
