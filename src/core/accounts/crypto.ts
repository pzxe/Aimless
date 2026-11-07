/**
 * Vault encryption: AES-GCM (256-bit) through the Web Crypto API.
 *
 * - A passphrase / PIN is stretched with PBKDF2-SHA-256 (random 16-byte salt) into the AES key.
 * - Every encryption uses a fresh random 12-byte IV; the GCM tag authenticates the data, so a wrong
 *   passphrase or a modified blob fails to decrypt instead of returning garbage.
 * - Nothing here touches storage or the network.
 */

export const PBKDF2_ITERATIONS = 210_000
export const MIN_PASSPHRASE_LENGTH = 4

/** A passphrase-protected blob. All binary fields are base64. */
export interface SealedBlob {
  v: 1
  kdf: 'pbkdf2'
  iter: number
  salt: string
  iv: string
  ct: string
}

/** A blob protected by a non-extractable per-device key (no passphrase). */
export interface DeviceBlob {
  v: 1
  kdf: 'device'
  iv: string
  ct: string
}

export class WrongPassphraseError extends Error {
  constructor() {
    super('wrong passphrase or corrupted data')
    this.name = 'WrongPassphraseError'
  }
}

const enc = new TextEncoder()
const dec = new TextDecoder()

export function toBase64(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

export function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

const randomBytes = (n: number): Uint8Array<ArrayBuffer> => crypto.getRandomValues(new Uint8Array(n))

/** Derives the AES-GCM key from a passphrase. The key is not extractable. */
export async function deriveKey(passphrase: string, salt: Uint8Array<ArrayBuffer>, iterations = PBKDF2_ITERATIONS): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

/** A fresh random AES-GCM key that never leaves the browser's key store (not extractable). */
export function generateDeviceKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}

/** Encrypts any JSON-serialisable value with an AES-GCM key. Returns the IV and ciphertext. */
export async function encryptWithKey(key: CryptoKey, data: unknown): Promise<{ iv: string; ct: string }> {
  const iv = randomBytes(12)
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(data)))
  return { iv: toBase64(iv), ct: toBase64(new Uint8Array(ct)) }
}

/** Decrypts a value produced by encryptWithKey. Throws WrongPassphraseError if the key or data is wrong. */
export async function decryptWithKey<T = unknown>(key: CryptoKey, blob: { iv: string; ct: string }): Promise<T> {
  try {
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(blob.iv) }, key, fromBase64(blob.ct))
    return JSON.parse(dec.decode(pt)) as T
  } catch {
    throw new WrongPassphraseError()
  }
}

/** Encrypts with a passphrase (new random salt) and returns the blob and the derived key. */
export async function sealWithPassphrase(passphrase: string, data: unknown): Promise<{ blob: SealedBlob; key: CryptoKey }> {
  const salt = randomBytes(16)
  const key = await deriveKey(passphrase, salt)
  const { iv, ct } = await encryptWithKey(key, data)
  return { blob: { v: 1, kdf: 'pbkdf2', iter: PBKDF2_ITERATIONS, salt: toBase64(salt), iv, ct }, key }
}

/** Re-encrypts with an already derived key, keeping the blob's salt. */
export async function sealWithKey(key: CryptoKey, salt: string, data: unknown): Promise<SealedBlob> {
  const { iv, ct } = await encryptWithKey(key, data)
  return { v: 1, kdf: 'pbkdf2', iter: PBKDF2_ITERATIONS, salt, iv, ct }
}

export function isSealedBlob(x: unknown): x is SealedBlob {
  const b = x as SealedBlob | null
  return (
    !!b &&
    b.v === 1 &&
    b.kdf === 'pbkdf2' &&
    typeof b.salt === 'string' &&
    typeof b.iv === 'string' &&
    typeof b.ct === 'string' &&
    Number.isInteger(b.iter) &&
    b.iter >= 100_000 &&
    b.iter <= 5_000_000
  )
}

/** Decrypts a passphrase blob. Returns the plain data and the key (so the caller can keep it unlocked). */
export async function openWithPassphrase<T = unknown>(passphrase: string, blob: SealedBlob): Promise<{ data: T; key: CryptoKey }> {
  const key = await deriveKey(passphrase, fromBase64(blob.salt), blob.iter)
  const data = await decryptWithKey<T>(key, blob)
  return { data, key }
}
