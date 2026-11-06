// Records the animated README demos into docs/screenshots/*.gif.
//   npm run build && npm run gifs
// Starts its own preview server, drives the app with playwright-core (your installed Chrome),
// captures frames with Chrome's screencast (real timestamps) and encodes them with gifenc
// using one shared 256-colour palette, so the GIFs play at real speed without flicker.
import { mkdir, writeFile } from 'node:fs/promises'
import gifenc from 'gifenc'
import { chromium } from 'playwright-core'
import { PNG } from 'pngjs'

const { GIFEncoder, applyPalette, quantize } = gifenc
import { preview } from 'vite'

const OUT = 'docs/screenshots'
const VIEWPORT = { width: 1280, height: 800 }
const GIF_SIZE = { width: 960, height: 600 }
const MIN_FRAME_MS = 40 // ≤25 fps; browsers clamp delays under 20 ms to 100 ms

// ---------------------------------------------------------------- app state
const now = Date.now()
const profile = (id, name, gameId, dpi, sensitivity) => ({
  id, name, gameId, dpi, sensitivity, notes: '', favorite: false, createdAt: now, updatedAt: now,
})
const seed = (converter) => ({
  'sc.settings': {
    state: {
      language: 'en', theme: 'dark', precision: 3, defaultDpi: 800, fovDisplay: 'horizontal', units: 'cm',
      mousepad: 'large', mousepadCustomCm: 60, motion: 'full', density: 'comfortable', accent: 'crimson',
      startupView: 'landing', sound: false, favoriteGames: [], recentGames: [], calibrations: {},
    },
    version: 2,
  },
  'sc.converter': {
    state: {
      sourceGameId: 'cs2', sourceSensitivity: '', sourceDpi: '800', targetGameId: 'valorant', targetDpi: '800',
      linkDpi: true, resolutionWidth: '1920', resolutionHeight: '1080', fov: '', ...converter,
    },
    version: 1,
  },
  'sc.profiles': {
    state: { profiles: [profile('p1', 'Apex Tracking', 'apex', 800, 1.6), profile('p2', 'Siege', 'r6siege', 400, 14)] },
    version: 1,
  },
  'sc.history': { state: { entries: [] }, version: 1 },
  'sc.tournaments': { state: { tournaments: [] }, version: 1 },
})

// A visible cursor, because screencasts don't include the OS pointer.
function installCursor() {
  const add = () => {
    const c = document.createElement('div')
    c.id = '__demo_cursor'
    c.innerHTML =
      '<svg width="22" height="22" viewBox="0 0 24 24"><path d="M4 2l15 11-6.5 1.2L9.8 21z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg>'
    Object.assign(c.style, {
      position: 'fixed', left: '0', top: '0', zIndex: '2147483647', pointerEvents: 'none',
      transform: 'translate(-100px,-100px)', transition: 'scale 120ms ease-out', transformOrigin: '4px 2px',
    })
    document.body.appendChild(c)
    addEventListener('mousemove', (e) => (c.style.transform = `translate(${e.clientX - 4}px, ${e.clientY - 2}px)`), true)
    addEventListener('mousedown', () => (c.style.scale = '0.82'), true)
    addEventListener('mouseup', () => (c.style.scale = '1'), true)
  }
  if (document.body) add()
  else addEventListener('DOMContentLoaded', add)
}

// ---------------------------------------------------------------- recording
// ONLY=demo-landing.gif npm run gifs  records a single demo.
const ONLY = process.env.ONLY

async function record(browser, baseUrl, path, state, name, script, { captureLoad = false } = {}) {
  if (ONLY && ONLY !== name) return
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, colorScheme: 'dark' })
  await context.addInitScript((entries) => {
    if (sessionStorage.getItem('seeded')) return
    sessionStorage.setItem('seeded', '1')
    localStorage.clear()
    for (const [k, v] of Object.entries(entries)) localStorage.setItem(k, JSON.stringify(v))
  }, state)
  await context.addInitScript(installCursor)
  const page = await context.newPage()
  const frames = []
  const cdp = await context.newCDPSession(page)
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    frames.push({ png: Buffer.from(data, 'base64'), t: metadata.timestamp * 1000 })
    await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
  })
  const start = () => cdp.send('Page.startScreencast', { format: 'png', maxWidth: GIF_SIZE.width, maxHeight: GIF_SIZE.height, everyNthFrame: 1 })
  if (captureLoad) {
    // Fonts first (an unrelated page), so the entrance animation plays with the real typefaces.
    await page.goto(baseUrl + '#/settings')
    await page.waitForLoadState('networkidle')
    await page.evaluate(() => document.fonts.ready)
    await page.mouse.move(VIEWPORT.width * 0.3, VIEWPORT.height * 0.35)
    await start()
    await page.goto(baseUrl + '#' + path)
    await page.evaluate(() => document.fonts.ready)
  } else {
    await page.goto(baseUrl + '#' + path)
    await page.waitForLoadState('networkidle')
    await page.evaluate(() => document.fonts.ready)
    await page.mouse.move(VIEWPORT.width * 0.55, VIEWPORT.height * 0.55)
    await page.waitForTimeout(300)
    await start()
  }
  const ui = helpers(page)
  await ui.wait(500)
  await script(page, ui)
  const end = Date.now()
  await cdp.send('Page.stopScreencast')
  await context.close()

  await encode(frames, end, `${OUT}/${name}`)
}

function helpers(page) {
  const wait = (ms) => page.waitForTimeout(ms)
  const moveTo = async (locator) => {
    await locator.scrollIntoViewIfNeeded()
    const b = await locator.boundingBox()
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 })
    await wait(140)
  }
  const click = async (locator) => {
    await moveTo(locator)
    await page.mouse.down()
    await wait(70)
    await page.mouse.up()
  }
  const type = (text) => page.keyboard.type(text, { delay: 90 })
  return { wait, moveTo, click, type, press: (k) => page.keyboard.press(k) }
}

// ---------------------------------------------------------------- encoding
async function encode(rawFrames, endMs, file) {
  // Keep at most one frame per MIN_FRAME_MS (the newest image wins) and timestamp in ms.
  const kept = []
  for (const f of rawFrames) {
    const last = kept[kept.length - 1]
    if (last && f.t - last.t < MIN_FRAME_MS) last.png = f.png
    else kept.push({ ...f })
  }
  const decoded = kept
    .map((f) => ({ ...f, img: PNG.sync.read(f.png) }))
    .filter((f) => f.img.width === GIF_SIZE.width && f.img.height === GIF_SIZE.height)
  if (decoded.length === 0) throw new Error(`no frames captured for ${file}`)

  // One palette for the whole clip, sampled from every frame.
  const step = 7
  const samples = []
  for (const f of decoded) {
    const d = f.img.data
    for (let i = 0; i < d.length; i += 4 * step) samples.push(d[i], d[i + 1], d[i + 2], 255)
  }
  const palette = quantize(new Uint8Array(samples), 256)

  const gif = GIFEncoder()
  decoded.forEach((f, i) => {
    const next = i + 1 < decoded.length ? decoded[i + 1].t : endMs
    const delay = Math.max(MIN_FRAME_MS, Math.round(next - f.t))
    const index = applyPalette(new Uint8Array(f.img.data), palette)
    gif.writeFrame(index, f.img.width, f.img.height, { palette: i === 0 ? palette : undefined, delay, repeat: 0 })
  })
  gif.finish()
  const bytes = gif.bytes()
  await writeFile(file, bytes)
  const seconds = (endMs - decoded[0].t) / 1000
  console.log(`saved ${file}  ${decoded.length} frames  ${seconds.toFixed(1)} s  ${(bytes.length / 1024 / 1024).toFixed(2)} MB`)
}

// ---------------------------------------------------------------- demos
async function converterDemo(page, ui) {
  // Valorant → Overwatch 2
  await ui.click(page.getByRole('button', { name: /^Source game:/ }))
  await ui.wait(200)
  await ui.type('val')
  await ui.wait(150)
  await ui.press('Enter')
  await ui.wait(200)
  await ui.click(page.getByRole('button', { name: /^Target game:/ }))
  await ui.wait(200)
  await ui.type('ove')
  await ui.wait(150)
  await ui.press('Enter')
  await ui.wait(200)
  // Live calculation while typing
  await ui.click(page.getByLabel('In-game sensitivity'))
  await ui.type('0.45')
  await ui.wait(550)
  await ui.click(page.getByLabel('Mouse DPI'))
  await ui.press('Control+A')
  await ui.type('1600')
  await ui.wait(550)
  await ui.click(page.getByRole('button', { name: 'Swap source and target' }))
  await ui.wait(650)
  // The step-by-step math
  await ui.moveTo(page.getByRole('heading', { name: 'Calculation summary' }))
  await ui.wait(1400)
}

async function compareRtlDemo(page, ui) {
  const addProfile = page.getByLabel('Add from profile')
  await ui.moveTo(addProfile)
  await addProfile.selectOption({ label: 'Apex Tracking · APEX' })
  await ui.wait(400)
  await addProfile.selectOption({ label: 'Siege · R6S' })
  await ui.wait(400)
  await ui.click(page.getByRole('button', { name: /first row/i }))
  await ui.wait(900)
  await ui.click(page.getByRole('button', { name: 'Language' }).first())
  await ui.wait(250)
  await ui.click(page.getByRole('option', { name: /العربية/ })) // → Arabic (RTL)
  await ui.wait(1100)
  await ui.click(page.getByRole('button', { name: 'السمة' }).first()) // → light
  await ui.wait(1250)
  await ui.click(page.getByRole('button', { name: 'السمة' }).first()) // → dark
  await ui.wait(1200)
}

async function landingDemo(page, ui) {
  await ui.wait(1700) // hero entrance
  const sens = page.getByLabel('Sensitivity', { exact: true }).first()
  await ui.click(sens)
  await ui.press('Control+A')
  await ui.type('0.55')
  await ui.wait(700)
  // Scroll to the stats and the eDPI-vs-cm/360 comparison (counters animate in view).
  // The hero is exactly one screen: scroll one screen to land on the next section.
  for (let i = 0; i < 16; i++) {
    await page.mouse.wheel(0, VIEWPORT.height / 16)
    await ui.wait(45)
  }
  await ui.wait(1900)
}

async function tournamentDemo(page, ui) {
  await ui.click(page.getByRole('button', { name: 'New tournament' }).first())
  await ui.wait(150)
  await ui.type('LAN Finals')
  await ui.click(page.getByRole('radio', { name: 'Double elimination' }))
  await ui.click(page.getByRole('button', { name: 'Fill empty slots' }))
  await ui.wait(300)
  await ui.click(page.getByRole('button', { name: 'Generate bracket' }))
  await page.waitForURL(/tournaments\//)
  await page.locator('[data-status="ready"]').first().waitFor()
  await ui.wait(300)
  for (const score of ['2–0', '2–1', '0–2']) {
    await ui.click(page.locator('[data-status="ready"]').first())
    await ui.wait(200)
    await ui.click(page.getByRole('button', { name: score, exact: true }))
    await ui.wait(250)
  }
  await ui.wait(700)
}

// ---------------------------------------------------------------- main
await mkdir(OUT, { recursive: true })
const server = await preview({ preview: { port: 0, strictPort: false }, logLevel: 'silent' })
const baseUrl = server.resolvedUrls.local[0]
const browser = await chromium.launch({ channel: 'chrome' })
try {
  await record(browser, baseUrl, '/welcome', seed({ sourceGameId: 'cs2', sourceSensitivity: '1', targetGameId: 'valorant' }), 'demo-landing.gif', landingDemo, { captureLoad: true })
  await record(browser, baseUrl, '/converter', seed({}), 'demo-converter.gif', converterDemo)
  await record(browser, baseUrl, '/tournaments', seed({}), 'demo-tournament.gif', tournamentDemo)
  await record(
    browser,
    baseUrl,
    '/compare',
    seed({ sourceGameId: 'cs2', sourceSensitivity: '1.1', targetGameId: 'valorant' }),
    'demo-compare-rtl.gif',
    compareRtlDemo,
  )
} finally {
  await browser.close()
  await new Promise((resolve) => server.httpServer.close(resolve))
}
