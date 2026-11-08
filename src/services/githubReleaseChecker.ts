/**
 * GitHub release checker for the header notification bell.
 * Pure helpers (SemVer classification, title and markdown parsing) plus a cached, time-limited fetch.
 * Reuses the updater's own SemVer parsing and release validation (`electron/update-core.mjs`).
 */
import { compareVersions, LATEST_RELEASE_URL, parseRelease, parseVersion, type Release } from '../../electron/update-core.mjs'

export { LATEST_RELEASE_URL }

/** How an update is classified from its version number. */
export type UpdateCategory = 'major' | 'minor' | 'patch'

/** Newer-than-current classification: Major when X grows, Minor when Y grows, otherwise a Bug Fix. Null when not newer. */
export function classifyUpdate(current: string, latest: string): UpdateCategory | null {
  const a = parseVersion(current)
  const b = parseVersion(latest)
  if (!a || !b) return null
  try {
    if (compareVersions(latest, current) <= 0) return null
  } catch {
    return null
  }
  if (b.major > a.major) return 'major'
  if (b.minor > a.minor) return 'minor'
  return 'patch'
}

/** The kind of release a version number is on its own: x.0.0 is major, x.y.0 minor, x.y.z (z > 0) a bug fix. */
export function classifyVersion(version: string): UpdateCategory {
  const v = parseVersion(version)
  if (!v) return 'patch'
  if (v.patch > 0) return 'patch'
  if (v.minor > 0) return 'minor'
  return 'major'
}

/** "Update v2.5.2 — Smart Notification Bell 🔔" -> "Smart Notification Bell 🔔". Falls back to the whole name. */
export function parseReleaseTitle(name: string, tag: string): string {
  const raw = (name || '').trim()
  const stripped = raw.replace(/^(?:update\s+)?(?:aimless\s+)?v?\d+\.\d+\.\d+(?:-[\w.]+)?\s*[—–:|-]+\s*/i, '').trim()
  if (stripped && stripped !== raw) return stripped
  if (!raw || raw === tag) return tag
  return raw
}

export interface ParsedBody {
  /** One or two sentences about the release. */
  intro: string
  /** The bullet points (key highlights and fixes), cleaned of markdown. */
  highlights: string[]
}

/** The bell lists at most this many bullets (it scrolls, so a long release still fits). */
export const MAX_HIGHLIGHTS = 10

const SKIP_SECTION = /download|checksum|sha-?256|good to know|known limitation/i

/** Inline markdown to plain text. */
function plain(s: string): string {
  return s
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(^|[\s(])[*_]([^*_\n]+)[*_](?=[\s).,!?:;]|$)/g, '$1$2')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

const clip = (s: string, max: number) => (s.length <= max ? s : s.slice(0, max - 1).replace(/[\s,.;:]+\S*$/, '') + '…')

/** Splits a release body into a short overview and a clean bullet list. Skips code, images, details blocks and Downloads. */
export function parseReleaseBody(body: string): ParsedBody {
  const text = (body || '')
    .replace(/\r\n?/g, '\n')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<details[\s\S]*?<\/details>/gi, '')
    .replace(/```[\s\S]*?```/g, '')
  let section = ''
  let intro = ''
  const highlights: string[] = []
  const para: string[] = []
  const flush = () => {
    if (!intro && para.length && !SKIP_SECTION.test(section)) intro = plain(para.join(' '))
    para.length = 0
  }
  for (const line of text.split('\n')) {
    const heading = /^\s{0,3}#{1,6}\s+(.*)$/.exec(line)
    if (heading) {
      flush()
      section = plain(heading[1] ?? '')
      continue
    }
    const bullet = /^\s*(?:[-*+]|\d+[.)])\s+(.*)$/.exec(line)
    if (bullet) {
      flush()
      const item = plain(bullet[1] ?? '')
      if (item && !SKIP_SECTION.test(section) && !highlights.includes(item) && highlights.length < MAX_HIGHLIGHTS) highlights.push(clip(item, 170))
      continue
    }
    if (!line.trim()) {
      flush()
      continue
    }
    // a bullet's continuation line, an image-only line or a bare link line is not an overview
    if (/^\s*!\[/.test(line) || /^\s*<img/i.test(line) || !plain(line)) continue
    if (!highlights.length) para.push(line.trim())
  }
  flush()
  const sentences = intro.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g)?.map((x) => x.trim()).filter(Boolean) ?? []
  return { intro: clip(sentences.slice(0, 2).join(' '), 280), highlights }
}

export interface ReleaseInfo {
  version: string
  tag: string
  /** The marketing name without the version prefix. */
  title: string
  htmlUrl: string
  publishedAt: string | null
  intro: string
  highlights: string[]
  /** Direct link to the Windows setup, when the release has one (used by the web build). */
  installerUrl: string | null
}

export function toReleaseInfo(release: Release): ReleaseInfo {
  const body = parseReleaseBody(release.notes)
  const setup = release.assets.find((a) => /-Setup\.exe$/i.test(a.name))
  return {
    version: release.version,
    tag: release.tag,
    title: parseReleaseTitle(release.name, release.tag),
    htmlUrl: release.htmlUrl,
    publishedAt: release.publishedAt,
    intro: body.intro,
    highlights: body.highlights,
    installerUrl: setup?.url ?? null,
  }
}

// ------------------------------------------------------------------------------------ cached fetch

const CACHE_KEY = 'sc.releaseCache'
export const CACHE_TTL_MS = 30 * 60 * 1000
export const FETCH_TIMEOUT_MS = 8000

interface Cached { at: number; json: unknown }
export type FetchError = 'rate-limited' | 'no-release' | 'http' | 'network' | 'bad-response'
export interface FetchResult {
  info: ReleaseInfo | null
  /** True when the answer came from the local cache (fresh, or stale because GitHub could not be reached). */
  fromCache: boolean
  error?: FetchError
}

function readCache(storage: Pick<Storage, 'getItem'> | undefined): Cached | null {
  try {
    const raw = storage?.getItem(CACHE_KEY)
    const c = raw ? (JSON.parse(raw) as Cached) : null
    return c && typeof c.at === 'number' && c.json ? c : null
  } catch {
    return null
  }
}

function defaultStorage(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage
  } catch {
    return undefined
  }
}

/**
 * The latest published release. Uses a 30-minute local cache (so the API is hit at most twice an hour),
 * gives up after 8 s, and falls back to the last cached copy when GitHub is unreachable or rate-limited.
 */
export async function fetchLatestRelease(opts: { force?: boolean; fetchImpl?: typeof fetch; storage?: Pick<Storage, 'getItem' | 'setItem'>; now?: number } = {}): Promise<FetchResult> {
  const storage = opts.storage ?? defaultStorage()
  const now = opts.now ?? Date.now()
  const cached = readCache(storage)
  const fromJson = (json: unknown) => {
    const release = parseRelease(json)
    return release ? toReleaseInfo(release) : null
  }
  if (cached && !opts.force && now - cached.at < CACHE_TTL_MS) {
    const info = fromJson(cached.json)
    if (info) return { info, fromCache: true }
  }
  const fallback = (error: FetchError): FetchResult => {
    const info = cached ? fromJson(cached.json) : null
    return { info, fromCache: !!info, error }
  }
  const doFetch = opts.fetchImpl ?? (typeof fetch === 'undefined' ? undefined : fetch)
  if (!doFetch) return fallback('network')
  const ctrl = typeof AbortController === 'undefined' ? null : new AbortController()
  const timer = ctrl ? setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS) : null
  try {
    const res = await doFetch(LATEST_RELEASE_URL, { headers: { Accept: 'application/vnd.github+json' }, signal: ctrl?.signal })
    if (res.status === 403 || res.status === 429) return fallback('rate-limited')
    if (res.status === 404) return fallback('no-release')
    if (!res.ok) return fallback('http')
    const json: unknown = await res.json()
    const info = fromJson(json)
    if (!info) return fallback('bad-response')
    try {
      storage?.setItem(CACHE_KEY, JSON.stringify({ at: now, json } satisfies Cached))
    } catch {
      /* storage full or blocked: the next check simply asks GitHub again */
    }
    return { info, fromCache: false }
  } catch {
    return fallback('network')
  } finally {
    if (timer) clearTimeout(timer)
  }
}
