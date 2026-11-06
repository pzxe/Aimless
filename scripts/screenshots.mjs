// Captures the README screenshots (1440×900 PNG) from the production build.
//   npm run build && npm run screenshots
// Starts its own preview server and drives your installed Google Chrome through playwright-core.
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright-core'
import { preview } from 'vite'

const OUT = 'docs/screenshots'
const VIEWPORT = { width: 1440, height: 900 }

const now = Date.now()
const profile = (id, name, gameId, dpi, sensitivity, favorite = false) => ({
  id, name, gameId, dpi, sensitivity, notes: '', favorite, createdAt: now - 3600e3, updatedAt: now - 3600e3,
})

export const seedState = ({ language = 'en', converter = {}, motion = 'instant' } = {}) => ({
  'sc.settings': {
    state: {
      language, theme: 'dark', precision: 3, defaultDpi: 800, fovDisplay: 'horizontal', units: 'cm',
      mousepad: 'large', mousepadCustomCm: 60, motion, density: 'comfortable', accent: 'crimson',
      startupView: 'landing', sound: false,
      favoriteGames: ['valorant', 'cs2'], recentGames: ['overwatch2', 'valorant', 'cs2'], calibrations: {},
    },
    version: 2,
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
  'sc.tournaments': { state: { tournaments: [] }, version: 1 },
})

async function openPage(browser, baseUrl, path, state) {
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, colorScheme: 'dark' })
  await context.addInitScript((entries) => {
    // Seed only on the first load of this context.
    if (sessionStorage.getItem('seeded')) return
    sessionStorage.setItem('seeded', '1')
    localStorage.clear()
    for (const [k, v] of Object.entries(entries)) localStorage.setItem(k, JSON.stringify(v))
  }, state)
  const page = await context.newPage()
  await page.goto(baseUrl + '#' + path)
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
  return { context, page }
}

async function shot(page, name) {
  await page.mouse.move(0, 0)
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${OUT}/${name}`, type: 'png' })
  console.log(`saved ${OUT}/${name}`)
}

/** Create a double-elimination bracket through the UI and play some matches. */
export async function buildTournament(page, { matches = 9, slow = 0 } = {}) {
  await page.getByRole('button', { name: 'New tournament' }).first().click()
  await page.getByLabel('Name', { exact: true }).fill('Friday Night Cup')
  await page.getByRole('radio', { name: 'Double elimination' }).click()
  const names = ['Nightfall', 'Red Pulse', 'Zero Recoil', 'Static', 'Crossfire', 'Afterimage', 'Midline', 'Overtime']
  for (let i = 0; i < names.length; i++) await page.getByLabel(`Team ${i + 1}`, { exact: true }).fill(names[i])
  await page.getByRole('button', { name: 'Generate bracket' }).click()
  await page.waitForURL(/tournaments\//)
  await page.locator('[data-status="ready"]').first().waitFor()
  // Let the "bracket generated" toast clear before playing.
  await page.waitForTimeout(slow ? 400 : 4500)
  const scores = ['2–0', '2–1', '2–1', '2–0', '1–2', '2–0', '2–1', '0–2', '2–1', '2–0', '2–1', '2–0', '1–2', '2–0']
  for (let i = 0; i < matches; i++) {
    const ready = page.locator('[data-status="ready"]').first()
    if ((await ready.count()) === 0) break
    await ready.click()
    if (slow) await page.waitForTimeout(slow)
    await page.getByRole('button', { name: scores[i % scores.length], exact: true }).click()
    await page.waitForTimeout(slow || 120)
  }
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('screenshots.mjs')) {
  await mkdir(OUT, { recursive: true })
  const server = await preview({ preview: { port: 0 }, logLevel: 'silent' })
  const baseUrl = server.resolvedUrls.local[0]
  const browser = await chromium.launch({ channel: 'chrome' })
  try {
    // Presentation landing page.
    {
      const { context, page } = await openPage(browser, baseUrl, '/welcome', seedState())
      await page.getByRole('heading', { level: 1 }).waitFor()
      await shot(page, 'landing-hero.png')
      await context.close()
    }
    // Converter: Valorant → Overwatch 2 with the calculation summary.
    {
      const { context, page } = await openPage(browser, baseUrl, '/converter', seedState())
      await page.getByRole('heading', { name: 'Calculation summary' }).waitFor()
      await shot(page, 'converter-dark.png')
      await context.close()
    }
    // Tournament bracket (double elimination, partly played).
    {
      const { context, page } = await openPage(browser, baseUrl, '/tournaments', seedState())
      await buildTournament(page, { matches: 9 })
      await page.waitForTimeout(4500) // let toasts clear
      await page.evaluate(() => window.scrollTo(0, 0))
      await shot(page, 'tournament-bracket.png')
      await context.close()
    }
    // Compare: reference + profiles matched, with the chart.
    {
      const { context, page } = await openPage(
        browser,
        baseUrl,
        '/compare',
        seedState({ converter: { sourceGameId: 'cs2', sourceSensitivity: '1.1', targetGameId: 'valorant' } }),
      )
      const addProfile = page.getByLabel('Add from profile')
      await addProfile.selectOption({ label: 'Apex Tracking · APEX' })
      await addProfile.selectOption({ label: 'Siege · R6S' })
      await page.getByRole('button', { name: /first row/i }).click()
      await page.getByRole('heading', { name: 'Distance per 360°' }).waitFor()
      await shot(page, 'compare-dark.png')
      await context.close()
    }
    // Mousepad visualizer.
    {
      const { context, page } = await openPage(
        browser,
        baseUrl,
        '/mousepad',
        seedState({ converter: { sourceGameId: 'cs2', sourceSensitivity: '1.6', sourceDpi: '800' } }),
      )
      await shot(page, 'mousepad-visualizer.png')
      await context.close()
    }
    // Converter in Arabic (RTL).
    {
      const { context, page } = await openPage(
        browser,
        baseUrl,
        '/converter',
        seedState({ language: 'ar', converter: { sourceGameId: 'cs2', sourceSensitivity: '1.25', targetGameId: 'valorant' } }),
      )
      await page.getByRole('heading', { name: 'ملخص الحساب' }).waitFor()
      await shot(page, 'converter-rtl-ar.png')
      await context.close()
    }
    // Games page: Verified, Approximate and Unsupported side by side.
    {
      const { context, page } = await openPage(browser, baseUrl, '/games', seedState())
      await page.getByRole('heading', { name: 'Rainbow Six Siege' }).evaluate((el) => {
        const card = el.closest('.card')
        window.scrollTo({ top: card.getBoundingClientRect().top + window.scrollY - 24 })
      })
      await shot(page, 'games-calibration.png')
      await context.close()
    }
  } finally {
    await browser.close()
    await new Promise((resolve) => server.httpServer.close(resolve))
  }
}
