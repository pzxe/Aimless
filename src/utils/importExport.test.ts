import { describe, expect, it } from 'vitest'
import { buildExport, MAX_IMPORT_BYTES, parseImport, sanitizeProfile } from './importExport'
import type { Profile } from '@/store/types'

const valid = { name: 'Main', gameId: 'cs2', dpi: 800, sensitivity: 1.2, notes: 'n', favorite: true }

describe('sanitizeProfile', () => {
  it('accepts a valid profile and drops unknown fields', () => {
    const p = sanitizeProfile({ ...valid, evil: '() => alert(1)', __proto__: { x: 1 } })
    expect(p).toEqual({ name: 'Main', gameId: 'cs2', dpi: 800, sensitivity: 1.2, notes: 'n', favorite: true })
  })
  it('rejects bad values', () => {
    expect(sanitizeProfile({ ...valid, gameId: 'nope' })).toBeNull()
    expect(sanitizeProfile({ ...valid, dpi: -1 })).toBeNull()
    expect(sanitizeProfile({ ...valid, sensitivity: 0 })).toBeNull()
    expect(sanitizeProfile({ ...valid, sensitivity: '1.2' })).toBeNull()
    expect(sanitizeProfile({ ...valid, name: '   ' })).toBeNull()
    expect(sanitizeProfile(null)).toBeNull()
    expect(sanitizeProfile([valid])).toBeNull()
  })
  it('truncates long text and keeps optional fields only when valid', () => {
    const p = sanitizeProfile({ ...valid, name: 'x'.repeat(500), resolution: { width: 1920, height: 1080 }, fov: 103 })!
    expect(p.name).toHaveLength(80)
    expect(p.resolution).toEqual({ width: 1920, height: 1080 })
    expect(p.fov).toBe(103)
    const q = sanitizeProfile({ ...valid, resolution: { width: 'a', height: 1 }, fov: 500 })!
    expect(q.resolution).toBeUndefined()
    expect(q.fov).toBeUndefined()
  })
})

describe('parseImport', () => {
  it('round-trips an export', () => {
    const profile: Profile = { ...valid, id: 'a', createdAt: 1, updatedAt: 2 }
    const r = parseImport(JSON.stringify(buildExport([profile])))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.profiles[0]).toMatchObject({ name: 'Main', gameId: 'cs2' })
  })
  it('accepts a single profile and a bare array', () => {
    expect(parseImport(JSON.stringify(valid)).ok).toBe(true)
    expect(parseImport(JSON.stringify([valid, valid])).ok).toBe(true)
  })
  it('reports skipped invalid entries', () => {
    const r = parseImport(JSON.stringify([valid, { name: 'bad' }, 42]))
    expect(r).toMatchObject({ ok: true, skipped: 2 })
  })
  it('handles malformed input without throwing', () => {
    expect(parseImport('{not json')).toEqual({ ok: false, error: 'invalid_json' })
    expect(parseImport('"string"')).toEqual({ ok: false, error: 'invalid_format' })
    expect(parseImport('null')).toEqual({ ok: false, error: 'invalid_format' })
    expect(parseImport('{"profiles": 5}')).toEqual({ ok: false, error: 'invalid_format' })
    expect(parseImport('[]')).toEqual({ ok: false, error: 'no_valid_profiles' })
    expect(parseImport(JSON.stringify({ app: 'other-app', profiles: [valid] }))).toEqual({ ok: false, error: 'invalid_format' })
    expect(parseImport(JSON.stringify({ app: 'sensitivity-converter', version: 99, profiles: [valid] }))).toEqual({
      ok: false,
      error: 'newer_version',
    })
  })
  it('rejects oversized files', () => {
    expect(parseImport(' '.repeat(MAX_IMPORT_BYTES + 1))).toEqual({ ok: false, error: 'too_large' })
  })
})
