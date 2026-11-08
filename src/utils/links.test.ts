import { describe, expect, it } from 'vitest'
import { en } from '@/i18n/en'
import { translate } from '@/i18n'
import { LINKS } from './links'

describe('external links', () => {
  it('points at the developer and repository', () => {
    expect(LINKS.github).toBe('https://github.com/pzxe')
    expect(LINKS.repo).toBe('https://github.com/pzxe/Aimless')
    expect(LINKS.twitch).toBe('https://www.twitch.tv/1usl')
    expect(LINKS.x).toBe('https://x.com/87lx')
    expect(LINKS.releases).toBe('https://github.com/pzxe/Aimless/releases')
    expect(LINKS.discordUser).toBe('1usl')
  })
  it('only uses https (the desktop app opens only https links externally)', () => {
    for (const [k, v] of Object.entries(LINKS)) if (k !== 'discordUser') expect(v.startsWith('https://'), k).toBe(true)
  })
})

describe('quick-link tooltips and developer card strings', () => {
  it('uses the requested English tooltips', () => {
    expect(en['quick.github']).toBe('Developer GitHub (@pzxe)')
    expect(en['quick.star']).toBe('Star Aimless on GitHub')
    expect(en['quick.x']).toBe('Follow AimlessLab on X')
    expect(LINKS.xLab).toBe('https://x.com/AimlessLab')
    expect(en['quick.releases']).toBe('Releases & Updates')
    expect(en['dev.title']).toBe('Developer & Tech Stack')
  })
  it('interpolates the Discord toast in every language', () => {
    expect(translate('en', 'dev.discordCopied', { name: '1usl' })).toBe("Discord username '1usl' copied!")
    for (const l of ['ar', 'es', 'ru', 'pt'] as const) expect(translate(l, 'dev.discordCopied', { name: '1usl' })).toContain("'1usl'")
  })
})
