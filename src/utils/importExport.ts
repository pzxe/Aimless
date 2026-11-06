import { isKnownGame, validateDpi, validateSensitivity } from '@/core/sensitivity'
import type { Profile, ProfileDraft } from '@/store/types'

/**
 * Import/export of profiles as JSON.
 *
 * Imported files are treated as untrusted data: they are parsed with JSON.parse only
 * (never evaluated), size-limited, and every field is type-checked and clamped.
 * Unknown fields are dropped. Nothing in a file can execute code.
 */

export const EXPORT_APP_ID = 'sensitivity-converter'
export const EXPORT_VERSION = 1
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024
export const MAX_IMPORT_PROFILES = 1000

export interface ExportFile {
  app: typeof EXPORT_APP_ID
  version: typeof EXPORT_VERSION
  exportedAt: string
  profiles: Array<Omit<Profile, 'id'>>
}

export type ImportError = 'too_large' | 'invalid_json' | 'invalid_format' | 'no_valid_profiles' | 'newer_version'

export type ImportResult =
  | { ok: true; profiles: ProfileDraft[]; skipped: number }
  | { ok: false; error: ImportError }

const cleanText = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max) : ''

/** Validate one untrusted profile object. Returns null if it cannot be used. */
export function sanitizeProfile(input: unknown): ProfileDraft | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  const r = input as Record<string, unknown>
  const name = cleanText(r.name, 80)
  const gameId = typeof r.gameId === 'string' ? r.gameId : ''
  const dpi = r.dpi
  const sensitivity = r.sensitivity
  if (!name || !isKnownGame(gameId)) return null
  if (validateDpi(dpi) !== null || validateSensitivity(sensitivity) !== null) return null

  const draft: ProfileDraft = {
    name,
    gameId,
    dpi: dpi as number,
    sensitivity: sensitivity as number,
    notes: cleanText(r.notes, 2000),
    favorite: r.favorite === true,
  }
  const res = r.resolution as Record<string, unknown> | undefined
  if (res && typeof res === 'object') {
    const { width, height } = res
    if (
      typeof width === 'number' && typeof height === 'number' &&
      Number.isInteger(width) && Number.isInteger(height) &&
      width > 0 && height > 0 && width <= 16384 && height <= 16384
    ) {
      draft.resolution = { width, height }
    }
  }
  if (typeof r.fov === 'number' && Number.isFinite(r.fov) && r.fov > 0 && r.fov < 180) draft.fov = r.fov
  return draft
}

export function buildExport(profiles: Profile[]): ExportFile {
  return {
    app: EXPORT_APP_ID,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    profiles: profiles.map(({ id: _id, ...rest }) => rest),
  }
}

/**
 * Parse an import file. Accepts this app's export format, a bare array of profiles,
 * or a single profile object.
 */
export function parseImport(text: string): ImportResult {
  if (text.length > MAX_IMPORT_BYTES) return { ok: false, error: 'too_large' }
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: 'invalid_json' }
  }

  let items: unknown[]
  if (Array.isArray(data)) {
    items = data
  } else if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>
    if ('profiles' in obj) {
      if (obj.app !== undefined && obj.app !== EXPORT_APP_ID) return { ok: false, error: 'invalid_format' }
      if (typeof obj.version === 'number' && obj.version > EXPORT_VERSION) return { ok: false, error: 'newer_version' }
      if (!Array.isArray(obj.profiles)) return { ok: false, error: 'invalid_format' }
      items = obj.profiles
    } else {
      items = [obj]
    }
  } else {
    return { ok: false, error: 'invalid_format' }
  }

  const limited = items.slice(0, MAX_IMPORT_PROFILES)
  const profiles = limited.map(sanitizeProfile).filter((p): p is ProfileDraft => p !== null)
  if (profiles.length === 0) return { ok: false, error: 'no_valid_profiles' }
  return { ok: true, profiles, skipped: items.length - profiles.length }
}

/** Trigger a browser download of a JSON file. */
export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function safeFilename(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9؀-ۿ]+/gi, '-').replace(/^-+|-+$/g, '')
  return base || 'profile'
}
