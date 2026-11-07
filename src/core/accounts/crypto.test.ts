import { describe, expect, it } from 'vitest'
import {
  decryptWithKey,
  deriveKey,
  encryptWithKey,
  fromBase64,
  generateDeviceKey,
  isSealedBlob,
  openWithPassphrase,
  sealWithKey,
  sealWithPassphrase,
  toBase64,
  WrongPassphraseError,
} from './crypto'

const data = { accounts: [{ id: 'a', label: 'Main', password: 'hunter2 ✓' }] }

describe('vault encryption (AES-GCM)', () => {
  it('round-trips with a passphrase', async () => {
    const { blob } = await sealWithPassphrase('correct horse', data)
    const out = await openWithPassphrase<typeof data>('correct horse', blob)
    expect(out.data).toEqual(data)
  })

  it('never stores the plaintext', async () => {
    const { blob } = await sealWithPassphrase('correct horse', data)
    const raw = JSON.stringify(blob)
    expect(raw).not.toContain('hunter2')
    expect(raw).not.toContain('Main')
    expect(blob.kdf).toBe('pbkdf2')
  })

  it('rejects a wrong passphrase', async () => {
    const { blob } = await sealWithPassphrase('correct horse', data)
    await expect(openWithPassphrase('wrong', blob)).rejects.toBeInstanceOf(WrongPassphraseError)
  })

  it('detects tampering (the GCM tag fails)', async () => {
    const { blob } = await sealWithPassphrase('pw12', data)
    const bytes = fromBase64(blob.ct)
    bytes[0] = bytes[0]! ^ 1
    await expect(openWithPassphrase('pw12', { ...blob, ct: toBase64(bytes) })).rejects.toBeInstanceOf(WrongPassphraseError)
  })

  it('uses a fresh salt and IV every time', async () => {
    const a = await sealWithPassphrase('pw12', data)
    const b = await sealWithPassphrase('pw12', data)
    expect(a.blob.salt).not.toBe(b.blob.salt)
    expect(a.blob.iv).not.toBe(b.blob.iv)
    expect(a.blob.ct).not.toBe(b.blob.ct)
  })

  it('re-seals with the same key and salt but a new IV', async () => {
    const { blob, key } = await sealWithPassphrase('pw12', data)
    const again = await sealWithKey(key, blob.salt, { accounts: [] })
    expect(again.salt).toBe(blob.salt)
    expect(again.iv).not.toBe(blob.iv)
    expect((await openWithPassphrase<{ accounts: unknown[] }>('pw12', again)).data.accounts).toEqual([])
  })

  it('round-trips with a device key', async () => {
    const key = await generateDeviceKey()
    const enc = await encryptWithKey(key, data)
    expect(await decryptWithKey(key, enc)).toEqual(data)
    await expect(decryptWithKey(await generateDeviceKey(), enc)).rejects.toBeInstanceOf(WrongPassphraseError)
  })

  it('derives the same key for the same passphrase and salt', async () => {
    const salt = new Uint8Array(16).fill(7)
    const k1 = await deriveKey('pw12', salt, 100_000)
    const k2 = await deriveKey('pw12', salt, 100_000)
    const enc = await encryptWithKey(k1, 'x')
    expect(await decryptWithKey(k2, enc)).toBe('x')
  })

  it('validates blob shape and iteration bounds', async () => {
    const { blob } = await sealWithPassphrase('pw12', data)
    expect(isSealedBlob(blob)).toBe(true)
    expect(isSealedBlob({ ...blob, iter: 1 })).toBe(false)
    expect(isSealedBlob({ ...blob, kdf: 'device' })).toBe(false)
    expect(isSealedBlob(null)).toBe(false)
  })
})
