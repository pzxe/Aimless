import { useEffect, useRef, useState } from 'react'
import type { ResolvedTournament } from '@/core/tournament'

const FLASH_MS = 2400

function signature(r: ResolvedTournament): Map<string, string> {
  const out = new Map<string, string>()
  for (const [id, m] of r.matches) {
    const slots = m.slots.map((s) => (s.kind === 'filled' ? s.id : s.kind)).join('/')
    out.set(id, `${slots}|${m.result?.score.join('-') ?? ''}|${m.status}`)
  }
  return out
}

/** Ids of matches whose score or slots changed since the previous state (not on the first state). */
export function useMatchFlash(resolved: ResolvedTournament | null, key: string): ReadonlySet<string> {
  const prev = useRef<{ key: string; sig: Map<string, string> } | null>(null)
  const [flash, setFlash] = useState<ReadonlySet<string>>(new Set())
  useEffect(() => {
    if (!resolved) return
    const sig = signature(resolved)
    const before = prev.current
    prev.current = { key, sig }
    if (!before || before.key !== key) return
    const changed = new Set<string>()
    for (const [id, s] of sig) if (before.sig.get(id) !== s) changed.add(id)
    if (changed.size === 0) return
    setFlash(changed)
    const timer = setTimeout(() => setFlash(new Set()), FLASH_MS)
    return () => clearTimeout(timer)
  }, [resolved, key])
  return flash
}
