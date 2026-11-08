import { describe, expect, it } from 'vitest'
import { REFERENCE_PARAMS as DEFAULT_PARAMS } from '../rawAccelEngine'
import { classicWindowSvg, fieldsFor, graphSvg, showcaseCardSvg, valuesText, type CardLabels } from '../rawAccelRender'

const labels: CardLabels = {
  title: 'Me & <you>', subtitle: 'Valorant · 800 DPI', base: 'Base', peak: 'Peak', cmRange: 'cm/360°', verdict: 'Verdict', stability: 'Stab', flickLabel: 'Flick', smoothLabel: 'Smooth',
  stabilityValue: '76%', flickValue: 'Aggressive', smoothValue: 'Smooth', advice: 'A & B '.repeat(30), hints: [], footer: 'Made with Aimless', baseEdpi: '240 eDPI', peakEdpi: '720 eDPI', cmText: '26 – 80', rtl: false,
}
// Every '&' must be an XML entity or the browser refuses to load the SVG as an image.
const wellFormedAmps = (svg: string) => !/&(?!amp;|lt;|gt;|quot;|#39;)/.test(svg)
const noRawAngle = (svg: string) => !/<[^a-zA-Z/!?]/.test(svg)

describe('Raw Accel renderers', () => {
  it('lists the fields in the Raw Accel order with exact English names', () => {
    const labelsInOrder = fieldsFor(DEFAULT_PARAMS).map((f) => f.label)
    expect(labelsInOrder).toEqual(['Sens Multiplier', 'Y/X Ratio', 'Rotation', '', 'Gain', 'Acceleration', 'Cap Type', 'Cap: Output', 'Input Offset'])
  })
  it('shows Cap: Input only for Input / Both caps', () => {
    expect(fieldsFor({ ...DEFAULT_PARAMS, capType: 'Both' }).map((f) => f.label)).toContain('Cap: Input')
    expect(fieldsFor(DEFAULT_PARAMS).map((f) => f.label)).not.toContain('Cap: Input')
  })
  it('copies every value as plain text', () => {
    const text = valuesText(DEFAULT_PARAMS)
    expect(text).toContain('Sens Multiplier: 0.5')
    expect(text).toContain('Input Offset: 9')
    expect(text).toContain('Gain: on')
  })
  it('draws the graph with the exact axis titles and major + dotted minor lines', () => {
    const svg = graphSvg({ params: DEFAULT_PARAMS, theme: 'classic', w: 560, h: 430 })
    expect(svg).toContain('Input Speed (counts/ms)')
    expect(svg).toContain('Ratio of Output to Input')
    expect(svg).toContain('>Sensitivity<')
    expect((svg.match(/stroke-dasharray="1 3"/g) ?? []).length).toBe(12) // every 5 counts/ms except the majors (20/40/60)
    expect(svg).toContain('>80<')
  })
  it('produces well-formed SVG for both image styles, including ghosts and hostile text', () => {
    const ghost = [{ params: { ...DEFAULT_PARAMS, sensMultiplier: 0.8 } }]
    for (const out of [classicWindowSvg(DEFAULT_PARAMS, ghost), showcaseCardSvg(DEFAULT_PARAMS, labels, ghost), showcaseCardSvg(DEFAULT_PARAMS, { ...labels, rtl: true }, [])]) {
      expect(wellFormedAmps(out.svg)).toBe(true)
      expect(noRawAngle(out.svg)).toBe(true)
      expect(out.svg).toContain('<svg')
    }
    expect(classicWindowSvg(DEFAULT_PARAMS).svg).toContain('Lock X &amp; Y')
    expect(showcaseCardSvg(DEFAULT_PARAMS, labels).svg).toContain('Me &amp; &lt;you&gt;')
  })
  it('draws the ghost curve dashed', () => {
    expect(graphSvg({ params: DEFAULT_PARAMS, ghosts: [{ params: { ...DEFAULT_PARAMS, sensMultiplier: 0.8 } }], theme: 'dark', w: 500, h: 400 })).toContain('stroke-dasharray="7 5"')
  })
})
