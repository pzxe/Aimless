// node --test scripts/tweet-length.test.mjs   (npm run test:tweet)
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { describeTweet, SAFE_LIMIT, validateTweet, weightedLength } from './lib/tweet-length.mjs'
import { oauth1Header } from './lib/x-api.mjs'

test('Latin and Arabic characters count 1', () => {
  assert.equal(weightedLength('hello'), 5)
  assert.equal(weightedLength('تحديث جديد'), 10)
  assert.equal(weightedLength('Привет'), 6)
})
test('emoji count 2 each, including sequences', () => {
  assert.equal(weightedLength('🎯'), 2)
  assert.equal(weightedLength('a🎯b'), 4)
  assert.equal(weightedLength('👍🏽'), 2) // skin tone modifier: one emoji
  assert.equal(weightedLength('👨‍👩‍👧'), 2) // ZWJ family: one emoji
  assert.equal(weightedLength('🇸🇦'), 2) // flag
})
test('every URL counts 23 whatever its length', () => {
  assert.equal(weightedLength('https://a.co'), 23)
  assert.equal(weightedLength('https://pzxe.github.io/Aimless/?utm=' + 'x'.repeat(200)), 23)
  assert.equal(weightedLength('go https://x.com/87lx now'), 3 + 23 + 4)
  assert.equal(weightedLength('https://a.co https://b.co'), 23 + 1 + 23)
})
test('a newline counts 1; bullet and RLM count 2', () => {
  assert.equal(weightedLength('a\nb'), 3)
  assert.equal(weightedLength('•'), 2)
  assert.equal(weightedLength('‏'), 2)
  assert.equal(weightedLength('–'), 1) // U+2013 is inside 2010-201F
})
test('CJK counts 2', () => assert.equal(weightedLength('日本'), 4))
test('validation enforces the 250 safety limit, a link and at most 2 hashtags', () => {
  assert.deepEqual(validateTweet('hi https://a.co #a #b'), [])
  assert.ok(validateTweet('x'.repeat(SAFE_LIMIT) + ' https://a.co').some((p) => p.includes('over')))
  assert.deepEqual(validateTweet('x'.repeat(SAFE_LIMIT - 24) + ' https://a.co'), [])
  assert.ok(validateTweet('x'.repeat(SAFE_LIMIT - 23) + ' https://a.co').length > 0) // one over because of the space
  assert.ok(validateTweet('no link').includes('no link'))
  assert.ok(validateTweet('hi https://a.co #a #b #c').some((p) => p.includes('hashtags')))
  assert.deepEqual(describeTweet('hi 🎯 https://a.co #a'), { weighted: 32, urls: 1, emoji: 1, hashtags: 1 })
})
test('OAuth 1.0a header is well formed and signs deterministically', () => {
  const creds = { apiKey: 'k', apiSecret: 's', accessToken: 't', accessSecret: 'ts' }
  const a = oauth1Header('POST', 'https://api.x.com/2/tweets', creds, { nonce: 'n', timestamp: '1' })
  const b = oauth1Header('POST', 'https://api.x.com/2/tweets', creds, { nonce: 'n', timestamp: '1' })
  assert.equal(a, b)
  assert.match(a, /^OAuth /)
  for (const f of ['oauth_consumer_key="k"', 'oauth_token="t"', 'oauth_signature_method="HMAC-SHA1"', 'oauth_version="1.0"', 'oauth_signature="']) assert.ok(a.includes(f), f)
})
