import { create } from 'zustand'
import {
  decryptWithKey,
  encryptWithKey,
  generateDeviceKey,
  isSealedBlob,
  openWithPassphrase,
  sealWithKey,
  sealWithPassphrase,
  WrongPassphraseError,
  fromBase64,
  toBase64,
  type DeviceBlob,
  type SealedBlob,
} from '@/core/accounts/crypto'
import type { LiveRank } from '@/core/accounts/rank'
import { sanitizeAccount, type Account, type AccountDraft } from '@/core/accounts/types'
import { createId } from '@/utils/id'
import { storageGet, storageRemove, storageSet, STORAGE_KEYS } from '@/utils/storage'

/**
 * Alt Accounts vault.
 *
 * Everything (including passwords) is kept only on this device, as one AES-GCM encrypted blob in
 * localStorage (`sc.vault`):
 *   - no PIN:  encrypted with a per-device key that never leaves the browser's key store (IndexedDB),
 *              so the stored data isn't readable as plain text. This is not protection against someone
 *              who can run code on this profile.
 *   - PIN:     encrypted with a key derived from the PIN (PBKDF2-SHA-256 + random salt). The key lives
 *              only in memory while unlocked; locking drops it and the decrypted accounts.
 */

export type VaultStatus = 'loading' | 'locked' | 'ready' | 'error'

interface AccountsState {
  status: VaultStatus
  pinEnabled: boolean
  accounts: Account[]
  init: () => Promise<void>
  unlock: (pin: string) => Promise<boolean>
  lock: () => void
  setPin: (pin: string) => Promise<void>
  removePin: () => Promise<void>
  add: (draft: AccountDraft) => Account
  update: (id: string, patch: Partial<AccountDraft>) => void
  remove: (id: string) => void
  toggleFavorite: (id: string) => void
  /** Put the accounts in this id order (ids not listed keep their relative order at the end). The order is saved with the vault. */
  reorder: (ids: string[]) => void
  setLive: (id: string, live: LiveRank) => void
  importMany: (accounts: Account[]) => number
  exportBackup: (passphrase: string) => Promise<string>
  importBackup: (text: string, passphrase: string) => Promise<number>
  wipe: () => void
}

// ---- device key (no-PIN mode) -------------------------------------------------------------

const IDB_NAME = 'aimless-vault'
const IDB_STORE = 'keys'
const LS_FALLBACK_KEY = 'sc.vaultDeviceKey'

function idb<T>(run: (store: IDBObjectStore) => IDBRequest<T>, mode: IDBTransactionMode): Promise<T> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(IDB_NAME, 1)
    open.onupgradeneeded = () => open.result.createObjectStore(IDB_STORE)
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const tx = open.result.transaction(IDB_STORE, mode)
      const req = run(tx.objectStore(IDB_STORE))
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    }
  })
}

let deviceKeyPromise: Promise<CryptoKey> | null = null

/** The per-device AES key: non-extractable in IndexedDB; a localStorage copy only if IndexedDB is unavailable. */
function getDeviceKey(): Promise<CryptoKey> {
  deviceKeyPromise ??= (async () => {
    try {
      const existing = await idb<CryptoKey | undefined>((s) => s.get('device'), 'readonly')
      if (existing) return existing
      const key = await generateDeviceKey()
      await idb((s) => s.put(key, 'device'), 'readwrite')
      return key
    } catch {
      let raw = storageGet(LS_FALLBACK_KEY)
      if (!raw) {
        raw = toBase64(crypto.getRandomValues(new Uint8Array(32)))
        storageSet(LS_FALLBACK_KEY, raw)
      }
      return crypto.subtle.importKey('raw', fromBase64(raw), 'AES-GCM', false, ['encrypt', 'decrypt'])
    }
  })()
  return deviceKeyPromise
}

// ---- persistence --------------------------------------------------------------------------

interface Session {
  mode: 'device' | 'pin'
  key?: CryptoKey
  salt?: string
}
let session: Session = { mode: 'device' }
let lockedBlob: SealedBlob | null = null
let chain: Promise<void> = Promise.resolve()

function queueSave(accounts: Account[]) {
  chain = chain
    .then(async () => {
      const payload = { accounts }
      if (session.mode === 'pin') {
        // Locked (no key): never write, or an empty list could replace the real vault.
        if (!session.key || !session.salt) return
        storageSet(STORAGE_KEYS.vault, JSON.stringify(await sealWithKey(session.key, session.salt, payload)))
      } else {
        const blob: DeviceBlob = { v: 1, kdf: 'device', ...(await encryptWithKey(await getDeviceKey(), payload)) }
        storageSet(STORAGE_KEYS.vault, JSON.stringify(blob))
      }
    })
    .catch(() => {
      /* a failed save must not break later saves */
    })
}

function parseAccounts(data: unknown): Account[] {
  const list = (data as { accounts?: unknown })?.accounts
  if (!Array.isArray(list)) return []
  return list.map(sanitizeAccountKeepLive).filter((a): a is Account => a !== null)
}

/** Like sanitizeAccount, but keeps the (non-secret, already validated by shape) live rank data. */
function sanitizeAccountKeepLive(raw: unknown): Account | null {
  const base = sanitizeAccount(raw)
  if (!base) return null
  const r = raw as { live?: LiveRank; liveAt?: number }
  if (r.live && (r.live.game === 'valorant' || r.live.game === 'overwatch2') && typeof r.liveAt === 'number') {
    base.live = r.live
    base.liveAt = r.liveAt
  }
  return base
}

export const useAccounts = create<AccountsState>()((set, get) => {
  const commit = (accounts: Account[]) => {
    // Late results (a rank refresh finishing after Lock) must not touch a locked or unreadable vault.
    if (get().status !== 'ready') return
    set({ accounts })
    queueSave(accounts)
  }
  return {
    status: 'loading',
    pinEnabled: false,
    accounts: [],

    init: async () => {
      if (get().status !== 'loading') return
      const raw = storageGet(STORAGE_KEYS.vault)
      if (!raw) {
        session = { mode: 'device' }
        set({ status: 'ready', pinEnabled: false, accounts: [] })
        return
      }
      try {
        const blob = JSON.parse(raw) as DeviceBlob | SealedBlob
        if (blob.kdf === 'pbkdf2' && isSealedBlob(blob)) {
          lockedBlob = blob
          set({ status: 'locked', pinEnabled: true, accounts: [] })
        } else if (blob.kdf === 'device') {
          const data = await decryptWithKey(await getDeviceKey(), blob)
          session = { mode: 'device' }
          set({ status: 'ready', pinEnabled: false, accounts: parseAccounts(data) })
        } else set({ status: 'error' })
      } catch {
        set({ status: 'error' })
      }
    },

    unlock: async (pin) => {
      if (!lockedBlob) return false
      try {
        const { data, key } = await openWithPassphrase(pin, lockedBlob)
        session = { mode: 'pin', key, salt: lockedBlob.salt }
        set({ status: 'ready', pinEnabled: true, accounts: parseAccounts(data) })
        return true
      } catch (e) {
        if (e instanceof WrongPassphraseError) return false
        throw e
      }
    },

    lock: () => {
      if (get().status !== 'ready' || session.mode !== 'pin') return
      // Wait for any pending save so the stored blob is current, then drop the key and the data.
      void chain.then(() => {
        const latest = storageGet(STORAGE_KEYS.vault)
        try {
          const blob = latest ? (JSON.parse(latest) as SealedBlob) : null
          if (blob && isSealedBlob(blob)) lockedBlob = blob
        } catch {
          /* ignore */
        }
        session = { mode: 'pin' }
        set({ status: 'locked', accounts: [] })
      })
    },

    setPin: async (pin) => {
      if (get().status !== 'ready') return
      await chain
      const { blob, key } = await sealWithPassphrase(pin, { accounts: get().accounts })
      storageSet(STORAGE_KEYS.vault, JSON.stringify(blob))
      session = { mode: 'pin', key, salt: blob.salt }
      lockedBlob = blob
      set({ pinEnabled: true })
    },

    removePin: async () => {
      if (get().status !== 'ready') return
      await chain
      session = { mode: 'device' }
      lockedBlob = null
      set({ pinEnabled: false })
      queueSave(get().accounts)
      await chain
    },

    add: (draft) => {
      const now = Date.now()
      const account: Account = { ...draft, id: createId(), createdAt: now, updatedAt: now }
      commit([account, ...get().accounts])
      return account
    },
    update: (id, patch) =>
      commit(get().accounts.map((a) => (a.id === id ? { ...a, ...patch, updatedAt: Date.now() } : a))),
    remove: (id) => commit(get().accounts.filter((a) => a.id !== id)),
    toggleFavorite: (id) => commit(get().accounts.map((a) => (a.id === id ? { ...a, favorite: !a.favorite } : a))),
    reorder: (ids) => {
      const current = get().accounts
      const byId = new Map(current.map((a) => [a.id, a]))
      const seen = new Set<string>()
      const next: Account[] = []
      for (const id of ids) {
        const a = byId.get(id)
        if (a && !seen.has(id)) {
          seen.add(id)
          next.push(a)
        }
      }
      for (const a of current) if (!seen.has(a.id)) next.push(a)
      // nothing moved: do not rewrite the encrypted vault
      if (next.every((a, i) => a === current[i])) return
      commit(next)
    },
    // Live rank refreshes don't change `updatedAt`: they are not edits.
    setLive: (id, live) =>
      commit(get().accounts.map((a) => (a.id === id ? { ...a, live, liveAt: Date.now() } : a))),

    importMany: (incoming) => {
      const have = new Set(get().accounts.map((a) => a.id))
      const fresh = incoming.filter((a) => !have.has(a.id))
      if (fresh.length) commit([...fresh, ...get().accounts])
      return fresh.length
    },

    exportBackup: async (passphrase) => {
      const { blob } = await sealWithPassphrase(passphrase, { accounts: get().accounts })
      return JSON.stringify({ app: 'aimless', type: 'alt-accounts-backup', exportedAt: new Date().toISOString(), ...blob }, null, 2)
    },

    importBackup: async (text, passphrase) => {
      let parsed: unknown
      try {
        parsed = JSON.parse(text)
      } catch {
        throw new Error('invalid')
      }
      const file = parsed as { app?: string; type?: string }
      if (file?.app !== 'aimless' || file.type !== 'alt-accounts-backup' || !isSealedBlob(parsed)) throw new Error('invalid')
      const { data } = await openWithPassphrase(passphrase, parsed)
      return get().importMany(parseAccounts(data))
    },

    wipe: () => {
      storageRemove(STORAGE_KEYS.vault)
      session = { mode: 'device' }
      lockedBlob = null
      set({ status: 'ready', pinEnabled: false, accounts: [] })
    },
  }
})

export { WrongPassphraseError }
