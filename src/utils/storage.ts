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

export const persistStorage = createJSONStorage(() => safeStorage)

export const STORAGE_KEYS = {
  settings: 'sc.settings',
  profiles: 'sc.profiles',
  history: 'sc.history',
  converter: 'sc.converter',
  tournaments: 'sc.tournaments',
} as const

export function clearAllStorage() {
  for (const key of Object.values(STORAGE_KEYS)) safeStorage.removeItem(key)
}
