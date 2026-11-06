import type { MatchStatus, ResolvedMatch, ResolvedTournament, SlotSource, SlotState, Tournament } from './types'

/**
 * Derive every match's participants and status from the graph and the recorded results.
 * Pure and deterministic. A stored result only counts while its participants still
 * match the slots, so editing an earlier match invalidates later results automatically.
 */
export function resolveTournament(t: Tournament): ResolvedTournament {
  const out = new Map<string, ResolvedMatch>()

  const slotFrom = (src: SlotSource): SlotState => {
    if (src.type === 'seed') {
      const p = t.participants[src.seed - 1]
      return p ? { kind: 'filled', id: p.id } : { kind: 'empty' }
    }
    const m = out.get(src.matchId)
    if (!m) return { kind: 'empty' }
    if (m.status === 'void') return { kind: 'empty' }
    if (m.status === 'pending' || m.status === 'ready') return { kind: 'pending' }
    const id = src.type === 'winner' ? m.winnerId : m.loserId
    return id ? { kind: 'filled', id } : { kind: 'empty' }
  }

  for (const def of t.matches) {
    const slots: [SlotState, SlotState] = [slotFrom(def.sources[0]), slotFrom(def.sources[1])]
    let status: MatchStatus
    let winnerId: string | null = null
    let loserId: string | null = null
    let result = null as ResolvedMatch['result']

    if (def.isReset) {
      // Only played when the lower-bracket finalist (grand final slot 1) wins the grand final.
      const gf = out.get(def.sources[0].type === 'seed' ? '' : def.sources[0].matchId)
      if (!gf || gf.status === 'pending' || gf.status === 'ready') status = 'pending'
      else if (gf.status !== 'done' || gf.result?.winner === 0) status = 'void'
      else status = 'ready'
      if (status === 'ready' && gf) {
        // Keep the original slot order: upper-bracket finalist first.
        const a = gf.slots[0]
        const b = gf.slots[1]
        slots[0] = a
        slots[1] = b
      }
    } else if (slots[0].kind === 'filled' && slots[1].kind === 'filled') {
      status = 'ready'
    } else if (slots[0].kind === 'empty' && slots[1].kind === 'empty') {
      status = 'void'
    } else if (slots[0].kind === 'empty' || slots[1].kind === 'empty') {
      const filled = slots[0].kind === 'filled' ? slots[0] : slots[1].kind === 'filled' ? slots[1] : null
      if (filled) {
        status = 'walkover'
        winnerId = filled.id
      } else status = 'pending'
    } else {
      status = 'pending'
    }

    if (status === 'ready' && slots[0].kind === 'filled' && slots[1].kind === 'filled') {
      const r = t.results[def.id]
      if (r && r.participants[0] === slots[0].id && r.participants[1] === slots[1].id) {
        status = 'done'
        result = r
        winnerId = slots[r.winner]!.kind === 'filled' ? (slots[r.winner] as { id: string }).id : null
        loserId = (slots[r.winner === 0 ? 1 : 0] as { id: string }).id
      }
    }

    out.set(def.id, { def, slots, status, winnerId, loserId, result })
  }

  let championId: string | null = null
  let runnerUpId: string | null = null
  if (t.format === 'single') {
    const final = t.matches.filter((m) => m.side === 'upper').at(-1)
    const r = final ? out.get(final.id) : undefined
    if (r && (r.status === 'done' || r.status === 'walkover')) {
      championId = r.winnerId
      runnerUpId = r.loserId
    }
  } else {
    const gf = out.get('GF')
    const reset = out.get('GF2')
    if (reset && reset.status === 'done') {
      championId = reset.winnerId
      runnerUpId = reset.loserId
    } else if (gf && (gf.status === 'done' || gf.status === 'walkover') && (!reset || reset.status === 'void')) {
      championId = gf.winnerId
      runnerUpId = gf.loserId
    }
  }

  let readyCount = 0
  let doneCount = 0
  let playableCount = 0
  for (const m of out.values()) {
    if (m.status === 'ready') readyCount++
    if (m.status === 'done') doneCount++
    if (m.status === 'ready' || m.status === 'done' || m.status === 'pending') playableCount++
  }

  return { matches: out, championId, runnerUpId, readyCount, doneCount, playableCount }
}
