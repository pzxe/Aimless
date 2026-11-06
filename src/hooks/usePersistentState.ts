import { useEffect, useState } from 'react'

const PREFIX = 'sc.tools.'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw === null) return fallback
    const v = JSON.parse(raw) as unknown
    // Only accept a value of the same type as the default (stored data is untrusted).
    return typeof v === typeof fallback && (typeof v !== 'string' || v.length <= 64) ? (v as T) : fallback
  } catch {
    return fallback
  }
}

/**
 * useState that remembers its value in localStorage (per browser), for calculator inputs.
 * Storage errors (private mode, quota) are ignored: the tool still works for the session.
 */
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => read(key, initial))
  useEffect(() => {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value))
    } catch {
      /* ignore */
    }
  }, [key, value])
  return [value, setValue] as const
}

/** Remove every remembered tool input (used by "Clear all data"). */
export function clearPersistentTools() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i)
      if (k?.startsWith(PREFIX)) localStorage.removeItem(k)
    }
  } catch {
    /* ignore */
  }
}
