import { describe, expect, it } from 'vitest'
import { CACHE_TTL_MS, MAX_HIGHLIGHTS, classifyUpdate, classifyVersion, fetchLatestRelease, parseReleaseBody, parseReleaseTitle } from '../githubReleaseChecker'

describe('classifyUpdate (SemVer)', () => {
  it('a patch bump is a Bug Fix & Small Fixes update', () => {
    expect(classifyUpdate('2.5.1', '2.5.2')).toBe('patch')
    expect(classifyUpdate('2.5.0', 'v2.5.1')).toBe('patch')
    expect(classifyUpdate('2.4.9', '2.4.10')).toBe('patch')
  })
  it('a minor bump is a Minor Update, whatever the patch number', () => {
    expect(classifyUpdate('2.4.0', '2.5.0')).toBe('minor')
    expect(classifyUpdate('2.5.1', '2.6.0')).toBe('minor')
    expect(classifyUpdate('2.5.9', '2.6.3')).toBe('minor')
  })
  it('a major bump is a Major Update, whatever the rest', () => {
    expect(classifyUpdate('2.5.2', '3.0.0')).toBe('major')
    expect(classifyUpdate('2.5.2', 'v3.1.4')).toBe('major')
    expect(classifyUpdate('1.9.9', '10.0.0')).toBe('major')
  })
  it('compares numbers, not strings', () => {
    expect(classifyUpdate('2.9.0', '2.10.0')).toBe('minor')
    expect(classifyUpdate('2.10.0', '2.9.0')).toBeNull()
  })
  it('is null when the latest is the same, older, or not a version', () => {
    expect(classifyUpdate('2.5.2', '2.5.2')).toBeNull()
    expect(classifyUpdate('2.5.2', 'v2.5.2')).toBeNull()
    expect(classifyUpdate('2.5.2', '2.5.1')).toBeNull()
    expect(classifyUpdate('2.5.2', 'latest')).toBeNull()
    expect(classifyUpdate('dev', '2.5.2')).toBeNull()
    expect(classifyUpdate('2.5.2', '')).toBeNull()
  })
  it('a pre-release is older than its own release', () => {
    expect(classifyUpdate('2.6.0-beta.1', '2.6.0')).toBe('patch')
    expect(classifyUpdate('2.6.0', '2.6.0-beta.1')).toBeNull()
  })
})

describe('classifyVersion (what a release is on its own)', () => {
  it('x.0.0 major, x.y.0 minor, x.y.z bug fix', () => {
    expect(classifyVersion('3.0.0')).toBe('major')
    expect(classifyVersion('2.5.0')).toBe('minor')
    expect(classifyVersion('2.5.1')).toBe('patch')
    expect(classifyVersion('v2.5.2')).toBe('patch')
    expect(classifyVersion('nonsense')).toBe('patch')
  })
})

describe('parseReleaseTitle', () => {
  it('drops the version prefix and keeps the marketing name', () => {
    expect(parseReleaseTitle('Update v2.5.2 — Smart Notification Bell & Global Bug Fixes 🔔🔧', 'v2.5.2')).toBe('Smart Notification Bell & Global Bug Fixes 🔔🔧')
    expect(parseReleaseTitle('v2.5.1 — Raw Accel Generator Bug Fix', 'v2.5.1')).toBe('Raw Accel Generator Bug Fix')
    expect(parseReleaseTitle('Aimless v2.4.0: Live tournaments', 'v2.4.0')).toBe('Live tournaments')
  })
  it('falls back to the whole name or the tag', () => {
    expect(parseReleaseTitle('Big news', 'v2.6.0')).toBe('Big news')
    expect(parseReleaseTitle('', 'v2.6.0')).toBe('v2.6.0')
    expect(parseReleaseTitle('v2.6.0', 'v2.6.0')).toBe('v2.6.0')
  })
})

const BODY = `Smart bell, smarter updates. This release adds a **notification bell** and fixes a few [bugs](https://example.com). More text that should not be in the overview.

![The bell](https://raw.githubusercontent.com/pzxe/Aimless/main/docs/screenshots/bell.png)

## ✨ What's New

- **Header bell:** shows the \`latest\` release.
- Auto-collapsing toast
- Header bell: shows the \`latest\` release.

## 🐛 Bug Fixes

* Converter no longer accepts NaN
1. Vault locks cleanly

## 📦 Downloads

- **\`Aimless-v2.5.2-Setup.exe\`**: recommended.
- **\`Aimless-v2.5.2-Windows-NoInstall.zip\`**: unzip anywhere.

<details>
<summary>SHA-256 checksums</summary>

\`\`\`
56cf8799dffc6999f61439cd3d88670f7a870db9a62941ff7bc58853a2ddcc37  Aimless-v2.5.2-Setup.exe
\`\`\`

</details>
`

describe('parseReleaseBody', () => {
  const r = parseReleaseBody(BODY)
  it('takes the first two sentences as the overview, as plain text', () => {
    expect(r.intro).toBe('Smart bell, smarter updates. This release adds a notification bell and fixes a few bugs.')
  })
  it('lists the bullets of every section except Downloads, without markdown and without duplicates', () => {
    expect(r.highlights).toEqual(['Header bell: shows the latest release.', 'Auto-collapsing toast', 'Converter no longer accepts NaN', 'Vault locks cleanly'])
  })
  it('ignores images, code fences, details blocks and the downloads list', () => {
    const all = r.intro + r.highlights.join(' ')
    expect(all).not.toMatch(/png|SHA-256|Setup\.exe|unzip|\*\*|`|<|https?:/)
  })
  it('caps the list and the length of each bullet', () => {
    const many = Array.from({ length: 20 }, (_, i) => `- item ${i} ${'x'.repeat(300)}`).join('\n')
    const p = parseReleaseBody(`Intro.\n\n## Fixes\n${many}`)
    expect(p.highlights).toHaveLength(MAX_HIGHLIGHTS)
    expect(MAX_HIGHLIGHTS).toBe(10)
    expect(p.highlights.every((h) => h.length <= 170)).toBe(true)
  })
  it('handles empty, plain and heading-only bodies', () => {
    expect(parseReleaseBody('')).toEqual({ intro: '', highlights: [] })
    expect(parseReleaseBody('Just one sentence')).toEqual({ intro: 'Just one sentence', highlights: [] })
    expect(parseReleaseBody('## Only a heading')).toEqual({ intro: '', highlights: [] })
  })
  it('handles Windows line endings', () => {
    expect(parseReleaseBody('Hello there.\r\n\r\n## New\r\n- one\r\n- two\r\n').highlights).toEqual(['one', 'two'])
  })
  it('parses a real release body shape (heading, summary, image, sections)', () => {
    const real = `## Aimless v2.5.1: Raw Accel hotfix 🔧\n\n**Generate curve** now builds a curve for *your* setup.\n\n![x](https://example.com/a.png)\n\n## ✨ What's New\n\n- **3 curve profiles per Generate:** pick one.\n\n## 📦 Downloads\n\n- **\`Setup.exe\`**: recommended.`
    const p = parseReleaseBody(real)
    expect(p.intro).toBe('Generate curve now builds a curve for your setup.')
    expect(p.highlights).toEqual(['3 curve profiles per Generate: pick one.'])
  })
})

// ------------------------------------------------------------------------------------ fetch + cache
const releaseJson = (tag: string, extra: Record<string, unknown> = {}) => ({
  tag_name: tag,
  name: `Update ${tag} — Test Release`,
  body: 'A short summary.\n\n## Fixes\n\n- one fix',
  html_url: `https://github.com/pzxe/Aimless/releases/tag/${tag}`,
  published_at: '2026-11-08T10:00:00Z',
  draft: false,
  prerelease: false,
  assets: [{ name: `Aimless-${tag}-Setup.exe`, size: 10, browser_download_url: `https://github.com/pzxe/Aimless/releases/download/${tag}/Aimless-${tag}-Setup.exe` }],
  ...extra,
})
const memory = () => {
  const m = new Map<string, string>()
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }
}
const respond = (status: number, json?: unknown) => (async () => ({ status, ok: status >= 200 && status < 300, json: async () => json })) as unknown as typeof fetch

describe('fetchLatestRelease', () => {
  it('returns the parsed release, with the title, summary, highlights and installer link', async () => {
    const r = await fetchLatestRelease({ fetchImpl: respond(200, releaseJson('v2.5.2')), storage: memory(), now: 1000 })
    expect(r.error).toBeUndefined()
    expect(r.fromCache).toBe(false)
    expect(r.info).toMatchObject({ version: '2.5.2', tag: 'v2.5.2', title: 'Test Release', intro: 'A short summary.', highlights: ['one fix'] })
    expect(r.info?.installerUrl).toBe('https://github.com/pzxe/Aimless/releases/download/v2.5.2/Aimless-v2.5.2-Setup.exe')
  })
  it('serves a fresh cache without asking GitHub again, and refreshes it once it expires', async () => {
    const storage = memory()
    let calls = 0
    const fetchImpl = (async () => { calls++; return { status: 200, ok: true, json: async () => releaseJson(calls === 1 ? 'v2.5.2' : 'v2.5.3') } }) as unknown as typeof fetch
    await fetchLatestRelease({ fetchImpl, storage, now: 0 })
    expect((await fetchLatestRelease({ fetchImpl, storage, now: CACHE_TTL_MS - 1 })).info?.version).toBe('2.5.2')
    expect(calls).toBe(1)
    expect((await fetchLatestRelease({ fetchImpl, storage, now: CACHE_TTL_MS + 1 })).info?.version).toBe('2.5.3')
    expect(calls).toBe(2)
    expect((await fetchLatestRelease({ fetchImpl, storage, now: CACHE_TTL_MS + 2, force: true })).fromCache).toBe(false)
    expect(calls).toBe(3)
  })
  it('falls back to the last cached copy when GitHub is unreachable or rate-limited', async () => {
    const storage = memory()
    await fetchLatestRelease({ fetchImpl: respond(200, releaseJson('v2.5.2')), storage, now: 0 })
    const down = (async () => { throw new TypeError('network') }) as unknown as typeof fetch
    const a = await fetchLatestRelease({ fetchImpl: down, storage, now: CACHE_TTL_MS * 5 })
    expect(a).toMatchObject({ fromCache: true, error: 'network' })
    expect(a.info?.version).toBe('2.5.2')
    const b = await fetchLatestRelease({ fetchImpl: respond(403, {}), storage, now: CACHE_TTL_MS * 5 })
    expect(b).toMatchObject({ fromCache: true, error: 'rate-limited' })
  })
  it('reports the error and no release when there is nothing cached', async () => {
    expect(await fetchLatestRelease({ fetchImpl: respond(500, {}), storage: memory() })).toEqual({ info: null, fromCache: false, error: 'http' })
    expect((await fetchLatestRelease({ fetchImpl: respond(404, {}), storage: memory() })).error).toBe('no-release')
    expect((await fetchLatestRelease({ fetchImpl: respond(429, {}), storage: memory() })).error).toBe('rate-limited')
  })
  it('refuses drafts, pre-releases and junk, and never caches them', async () => {
    const storage = memory()
    expect((await fetchLatestRelease({ fetchImpl: respond(200, releaseJson('v2.5.2', { draft: true })), storage })).error).toBe('bad-response')
    expect((await fetchLatestRelease({ fetchImpl: respond(200, releaseJson('v2.5.2', { prerelease: true })), storage })).error).toBe('bad-response')
    expect((await fetchLatestRelease({ fetchImpl: respond(200, { tag_name: 'not-a-version' }), storage })).error).toBe('bad-response')
    expect(storage.getItem('sc.releaseCache')).toBeNull()
  })
  it('survives corrupt cache and blocked storage', async () => {
    const bad = { getItem: () => '{not json', setItem: () => { throw new Error('quota') } }
    const r = await fetchLatestRelease({ fetchImpl: respond(200, releaseJson('v2.5.2')), storage: bad })
    expect(r.info?.version).toBe('2.5.2')
  })
  it('drops installer links that are not on GitHub hosts', async () => {
    const evil = releaseJson('v2.5.2', { assets: [{ name: 'Aimless-v2.5.2-Setup.exe', size: 1, browser_download_url: 'https://evil.example/Aimless-v2.5.2-Setup.exe' }] })
    expect((await fetchLatestRelease({ fetchImpl: respond(200, evil), storage: memory() })).info?.installerUrl).toBeNull()
  })
})
