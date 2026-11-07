#!/usr/bin/env node
// Validates and publishes the two release tweets (Arabic + English) for @87lx.
//
//   node scripts/post-tweet.mjs --ar "<arabic tweet>" --en "<english tweet>"
//   node scripts/post-tweet.mjs --file tweets.json        # {"ar": "...", "en": "..."}
//
// Flags
//   --check     validate and print the scores only (opens nothing)
//   --json      print { ar, en, intents } as JSON (for the claude-in-chrome flow), opens nothing
//   --no-open   print everything but do not open the browser
//   --api       post through the X API v2 instead of opening tabs. Needs credentials in .env
//               and the extra flag --yes, because it publishes immediately.
//
// Rules, enforced for BOTH tweets independently before anything opens or posts:
//   weighted length <= 250 (X's limit is 280; the 30-character buffer is on purpose), at least one link,
//   at most 2 hashtags. Weighting: URLs 23, emoji 2, Latin / Arabic 1 (see scripts/lib/tweet-length.mjs).
import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { describeTweet, SAFE_LIMIT, validateTweet, X_LIMIT } from './lib/tweet-length.mjs'
import { credentialsFromEnv, postTweet } from './lib/x-api.mjs'

const HANDLE = '87lx'
const intentUrl = (text) => `https://x.com/intent/post?text=${encodeURIComponent(text)}`
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function loadDotEnv(path = '.env') {
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2')
  }
}

function parseArgs(argv) {
  const out = { flags: new Set() }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--ar' || a === '--en' || a === '--file') out[a.slice(2)] = argv[++i]
    else if (a.startsWith('--')) out.flags.add(a.slice(2))
  }
  return out
}

/** Opens a URL in the default browser without going through a shell (no quoting or % expansion issues). */
function openInBrowser(url) {
  const [cmd, args] =
    process.platform === 'win32' ? ['rundll32', ['url.dll,FileProtocolHandler', url]] : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]]
  spawn(cmd, args, { detached: true, stdio: 'ignore' }).unref()
}

function report(label, text) {
  const d = describeTweet(text)
  const problems = validateTweet(text)
  const bar = '█'.repeat(Math.round((Math.min(d.weighted, X_LIMIT) / X_LIMIT) * 28)).padEnd(28, '░')
  console.log(`\n── ${label} ${'─'.repeat(52 - label.length)}`)
  console.log(text)
  console.log(`   ${bar} ${d.weighted}/${SAFE_LIMIT} (X limit ${X_LIMIT}) · ${d.urls} link ×23 · ${d.emoji} emoji ×2 · ${d.hashtags} hashtags`)
  for (const p of problems) console.log(`   ✗ ${p}`)
  if (problems.length === 0) console.log(`   ✓ OK, ${SAFE_LIMIT - d.weighted} characters to spare under the safe limit`)
  return problems
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  loadDotEnv()
  let { ar, en } = args
  if (args.file) {
    const j = JSON.parse(readFileSync(args.file, 'utf8'))
    ar ??= j.ar
    en ??= j.en
  }
  if (!ar || !en) {
    console.error('Both tweets are required: --ar "<Arabic>" --en "<English>" (or --file tweets.json with {"ar","en"}).')
    process.exit(2)
  }
  ar = ar.replace(/\\n/g, '\n').trim()
  en = en.replace(/\\n/g, '\n').trim()

  const problems = [...report('Tweet 1 · Arabic', ar), ...report('Tweet 2 · English', en)]
  if (problems.length) {
    console.error('\nNothing was opened or posted: fix the tweets above and run again.')
    process.exit(1)
  }
  const intents = { ar: intentUrl(ar), en: intentUrl(en) }
  console.log('\nBoth tweets are within the limit.')

  if (args.flags.has('json')) {
    console.log(JSON.stringify({ ar, en, intents }, null, 2))
    return
  }
  if (args.flags.has('check')) return

  if (args.flags.has('api')) {
    const creds = credentialsFromEnv()
    if (!creds) {
      console.error('\n--api needs credentials in .env (see .env.example). Nothing was posted.')
      process.exit(3)
    }
    if (!args.flags.has('yes')) {
      console.log('\nDry run: --api publishes immediately. Add --yes to post both tweets as @' + HANDLE + '.')
      return
    }
    // Sequential: Arabic first, then English. If the first fails the second is not sent.
    for (const [label, text] of [['Arabic', ar], ['English', en]]) {
      const r = await postTweet(text, creds, HANDLE)
      console.log(`✓ ${label} tweet posted: ${r.url}`)
    }
    return
  }

  if (args.flags.has('no-open')) {
    console.log('\nCompose links (not opened):\n' + intents.ar + '\n' + intents.en)
    return
  }
  console.log('\nOpening two pre-filled compose tabs. Review each one and press Post.')
  openInBrowser(intents.ar)
  await sleep(900)
  openInBrowser(intents.en)
}

main().catch((e) => {
  console.error(String(e?.message || e))
  process.exit(1)
})
