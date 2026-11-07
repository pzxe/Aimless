// X (Twitter) weighted tweet length, following twitter-text config v3 (the non-Premium limit is 280).
//   - every URL counts 23, whatever its length
//   - characters in U+0000-10FF, U+2000-200D, U+2010-201F and U+2032-2037 count 1 (Latin, Arabic, Cyrillic, ...)
//   - everything else counts 2: emoji (a whole emoji sequence counts 2 once), CJK, and punctuation such as
//     U+2022 "•" and U+200F (the right-to-left mark), so avoid those when space is tight
//   - a newline counts 1
export const X_LIMIT = 280
export const SAFE_LIMIT = 250
export const URL_WEIGHT = 23

const URL_RE = /https?:\/\/[^\s]+/gi
const LIGHT = [
  [0x0000, 0x10ff],
  [0x2000, 0x200d],
  [0x2010, 0x201f],
  [0x2032, 0x2037],
]
const EMOJI_RE = /\p{Extended_Pictographic}|\p{Regional_Indicator}|\u{20E3}/u

const weightOfCodePoint = (cp) => (LIGHT.some(([a, b]) => cp >= a && cp <= b) ? 1 : 2)

function weightOfText(text) {
  const seg = new Intl.Segmenter('en', { granularity: 'grapheme' })
  let w = 0
  for (const { segment } of seg.segment(text)) {
    if (EMOJI_RE.test(segment)) {
      w += 2 // one emoji (including skin tones, flags and ZWJ sequences) costs 2
      continue
    }
    for (const ch of segment) w += weightOfCodePoint(ch.codePointAt(0))
  }
  return w
}

/** Weighted length of a tweet. */
export function weightedLength(text) {
  let total = 0
  let last = 0
  for (const m of text.matchAll(URL_RE)) {
    total += weightOfText(text.slice(last, m.index)) + URL_WEIGHT
    last = m.index + m[0].length
  }
  return total + weightOfText(text.slice(last))
}

/** Counts the pieces, for the report. */
export function describeTweet(text) {
  const urls = [...text.matchAll(URL_RE)].length
  const emoji = [...new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(text.replace(URL_RE, ''))].filter((s) => EMOJI_RE.test(s.segment)).length
  return { weighted: weightedLength(text), urls, emoji, hashtags: (text.match(/#[\p{L}\p{N}_]+/gu) ?? []).length }
}

/** Returns a list of problems (empty when the tweet is fine). */
export function validateTweet(text, { limit = SAFE_LIMIT } = {}) {
  const problems = []
  const d = describeTweet(text)
  if (!text.trim()) problems.push('empty')
  if (d.weighted > limit) problems.push(`weighted length ${d.weighted} is over the ${limit} limit by ${d.weighted - limit}`)
  if (d.urls < 1) problems.push('no link')
  if (d.hashtags > 2) problems.push(`${d.hashtags} hashtags (max 2)`)
  return problems
}
