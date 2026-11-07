import { createJSONStorage, type StateStorage } from 'zustand/middleware'

/**
 * localStorage wrapper that never throws (private mode, blocked storage, quota).
 * Falls back to an in-memory map so the app keeps working for the session.
 */
const memory = new Map<string, string>()

const safeStorage: StateStorage = {
  getItem(name) {
    try {
      return localStorage.getItem(name)
    } catch {
      return memory.get(name) ?? null
    }
  },
  setItem(name, value) {
    try {
      localStorage.setItem(name, value)
    } catch {
      memory.set(name, value)
    }
  },
  removeItem(name) {
    try {
      localStorage.removeItem(name)
    } catch {
      /* ignore */
    }
    memory.delete(name)
  },
}

/** Raw access for modules that manage their own format (the encrypted vault). Never throws. */
export const storageGet = (name: string) => safeStorage.getItem(name) as string | null
export const storageSet = (name: string, value: string) => void safeStorage.setItem(name, value)
export const storageRemove = (name: string) => void safeStorage.removeItem(name)

export const persistStorage = createJSONStorage(() => safeStorage)

export const STORAGE_KEYS = {
  settings: 'sc.settings',
  profiles: 'sc.profiles',
  history: 'sc.history',
  converter: 'sc.converter',
  tournaments: 'sc.tournaments',
  shares: 'sc.shares',
  vault: 'sc.vault',
  rankSettings: 'sc.rank',
  valorantTiers: 'sc.valorantTiers',
} as const

export function clearAllStorage() {
  for (const key of Object.values(STORAGE_KEYS)) safeStorage.removeItem(key)
}
