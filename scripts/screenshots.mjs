// Captures README screenshots from the production preview build.
// Usage: npm run build && npm run preview   (in another terminal)
//        npm run screenshots
// Uses the locally installed Google Chrome through playwright-core (no browser download).
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright-core'

const BASE = process.env.BASE_URL ?? 'http://localhost:4173/'
const OUT = 'docs/screenshots'
const VIEWPORT = { width: 1440, height: 900 }

const now = Date.now()
const profile = (id, name, gameId, dpi, sensitivity, favorite = false) => ({
  id, name, gameId, dpi, sensitivity, notes: '', favorite, createdAt: now - 3600e3, updatedAt: now - 3600e3,
})

const baseState = ({ language = 'en', converter = {} } = {}) => ({
  'sc.settings': {
    state: {
      language, theme: 'dark', precision: 3, defaultDpi: 800, fovDisplay: 'horizontal',
      favoriteGames: ['valorant', 'cs2'], recentGames: ['overwatch2', 'valorant', 'cs2'], calibrations: {},
    },
    version: 1,
  },
  'sc.converter': {
    state: {
      sourceGameId: 'valorant', sourceSensitivity: '0.4', sourceDpi: '800', targetGameId: 'overwatch2', targetDpi: '800',
      linkDpi: true, resolutionWidth: '1920', resolutionHeight: '1080', fov: '', ...converter,
    },
    version: 1,
  },
  'sc.profiles': {
    state: {
      profiles: [
        profile('p1', 'Main Profile', 'cs2', 800, 1.1, true),
        profile('p2', 'Apex Tracking', 'apex', 800, 1.6),
        profile('p3', 'Siege', 'r6siege', 400, 14),
      ],
    },
    version: 1,
  },
  'sc.history': { state: { entries: [] }, version: 1 },
})

async function openPage(browser, path, state) {
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, colorScheme: 'dark' })
  await context.addInitScript((entries) => {
    // Seed only on the first load of this context.
    if (sessionStorage.getItem('seeded')) return
    sessionStorage.setItem('seeded', '1')
    localStorage.clear()
    for (const [k, v] of Object.entries(entries)) localStorage.setItem(k, JSON.stringify(v))
  }, state)
  const page = await context.newPage()
  await page.goto(BASE + '#' + path)
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
  return { context, page }
}

async function shot(page, name) {
  await page.mouse.move(0, 0)
  await page.waitForTimeout(400) // let entrance transitions settle
  await page.screenshot({ path: `${OUT}/${name}`, type: 'png' })
  console.log(`saved ${OUT}/${name}`)
}

const browser = await chromium.launch({ channel: 'chrome' })
await mkdir(OUT, { recursive: true })

try {
  // 1. Converter, English, dark: Valorant → Overwatch 2 with summary.
  {
    const { context, page } = await openPage(browser, '/converter', baseState())
    await page.getByRole('heading', { name: 'Calculation summary' }).waitFor()
    await page.locator('input').first().blur()
    await shot(page, 'converter-dark.png')
    await context.close()
  }

  // 2. Compare: reference row + profiles, matched to the reference, with chart.
  {
    const { context, page } = await openPage(
      browser,
      '/compare',
      baseState({ converter: { sourceGameId: 'cs2', sourceSensitivity: '1.1', targetGameId: 'valorant' } }),
    )
    const addProfile = page.getByLabel('Add from profile')
    await addProfile.selectOption({ label: 'Apex Tracking · APEX' })
    await addProfile.selectOption({ label: 'Siege · R6S' })
    await page.getByRole('button', { name: /first row/i }).click()
    await page.getByRole('heading', { name: 'Distance per 360°' }).waitFor()
    await shot(page, 'compare-dark.png')
    await context.close()
  }

  // 3. Converter in Arabic (RTL).
  {
    const { context, page } = await openPage(
      browser,
      '/converter',
      baseState({ language: 'ar', converter: { sourceGameId: 'cs2', sourceSensitivity: '1.25', targetGameId: 'valorant' } }),
    )
    await page.getByRole('heading', { name: 'ملخص الحساب' }).waitFor()
    await shot(page, 'converter-rtl-ar.png')
    await context.close()
  }

  // 4. Games page scrolled to a mix of Verified, Approximate and Unsupported titles.
  {
    const { context, page } = await openPage(browser, '/games', baseState())
    await page.getByRole('heading', { name: 'Rainbow Six Siege' }).evaluate((el) => {
      const card = el.closest('.rounded-xl')
      window.scrollTo({ top: card.getBoundingClientRect().top + window.scrollY - 24 })
    })
    await shot(page, 'games-calibration.png')
    await context.close()
  }
} finally {
  await browser.close()
}
