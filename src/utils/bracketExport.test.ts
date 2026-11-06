import { describe, expect, it } from 'vitest'
import { createTournament, reportResult, type Tournament } from '@/core/tournament'
import { bracketSvg, bracketText, type BracketSvgLabels } from './bracketExport'

const labels: BracketSvgLabels = {
  roundName: (side, round) => `${side} ${round}`,
  sideName: (side) => side,
  champion: 'Champion',
  tbd: 'TBD',
  bye: 'BYE',
  footer: 'Aimless',
}

function cup(): Tournament {
  const r = createTournament({
    name: 'Night <Cup> & "Co"',
    gameId: null,
    mode: '5v5',
    format: 'single',
    bestOf: 3,
    grandFinalReset: false,
    seeding: 'manual',
    participants: [{ name: '<script>' }, { name: 'B' }, { name: 'C' }],
  })
  if (!r.ok) throw new Error(r.error)
  return r.value
}

describe('bracket export', () => {
  it('escapes user text in the SVG', () => {
    const svg = bracketSvg(cup(), labels)
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg).not.toContain('<script>')
    expect(svg).toContain('&lt;script&gt;')
    expect(svg).toContain('Night &lt;Cup&gt; &amp; &quot;Co&quot;')
  })
  it('lists results in the text summary', () => {
    let t = cup()
    const r = reportResult(t, 'U1-1', [2, 1])
    if (!r.ok) throw new Error(r.error)
    t = r.value
    expect(bracketText(t, labels)).toContain('B 2–1 C')
  })
})
