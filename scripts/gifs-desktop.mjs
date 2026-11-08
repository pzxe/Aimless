// Records the Raw Accel Lab demo from the REAL desktop app (Electron, native 1.0x, no zoom or scale tricks).
//   npm run build && node scripts/gifs-desktop.mjs
// Uses an isolated user-data folder (your real settings are never touched), glides the mouse like a human,
// captures frames with Chrome's screencast (real timestamps) and encodes with gifenc.
import gifenc from 'gifenc'
import { PNG } from 'pngjs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { _electron as electron } from 'playwright-core'

const ROOT = resolve(import.meta.dirname, '..')
const OUT = join(ROOT, 'docs/gifs/raw-accel-lab.gif')
const { GIFEncoder, applyPalette, quantize } = gifenc
const GIF_W = 880

const now = Date.now()
const cfg = (over) => ({ params: { curve: 'Linear', gain: true, sensMultiplier: 0.5, yxRatio: 1, rotation: 0, acceleration: 0.75, capType: 'Output', capOutput: 3, capInput: 0, inputOffset: 9, limit: 1.5, exponent: 2, lockXY: true, ...over }, dpi: 800, pollingRate: 1000, gameId: 'valorant', gameSens: 0.4, notes: '', name: '' })
const seed = {
  'sc.settings': { state: { language: 'en', theme: 'dark', precision: 3, defaultDpi: 800, fovDisplay: 'horizontal', units: 'cm', mousepad: 'large', mousepadCustomCm: 60, motion: 'full', density: 'comfortable', accent: 'crimson', startupView: 'dashboard', sound: false, favoriteGames: ['valorant', 'cs2'], recentGames: ['valorant', 'cs2'], calibrations: {}, autoUpdate: false }, version: 2 },
  'sc.converter': { state: { sourceGameId: 'valorant', sourceSensitivity: '0.4', sourceDpi: '800', targetGameId: 'overwatch2', targetDpi: '800', linkDpi: true, resolutionWidth: '1920', resolutionHeight: '1080', fov: '', }, version: 1 },
  'sc.rawaccel': {
    state: {
      dpi: 800, pollingRate: 1000, gameId: 'valorant', gameSens: '0.4', preset: 'tactical', hand: 'hybrid', pad: 'large', theme: 'dark', notes: '', name: '', seeded: true,
      params: cfg({}).params,
      history: [
        { id: 'h1', at: now - 7200e3, name: 'My Valorant God Curve v1', pinned: true, baseEdpi: 192, peakEdpi: 480, config: cfg({ sensMultiplier: 0.6, inputOffset: 6, acceleration: 0.5, capOutput: 2.5 }) },
        { id: 'h2', at: now - 3600e3, name: 'Calm tracking', pinned: false, baseEdpi: 272, peakEdpi: 400, config: cfg({ curve: 'Natural', sensMultiplier: 0.85, inputOffset: 4, acceleration: 0.12, limit: 1.6, capOutput: 0 }) },
      ],
    },
    version: 1,
  },
}

function installCursor() {
  const c = document.createElement('div')
  c.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24"><path d="M4 2l15 11-6.5 1.2L9.8 21z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg>'
  Object.assign(c.style, { position: 'fixed', left: '0', top: '0', zIndex: '2147483647', pointerEvents: 'none', transform: 'translate(-100px,-100px)', transition: 'scale 120ms ease-out', transformOrigin: '4px 2px' })
  document.body.appendChild(c)
  addEventListener('mousemove', (e) => (c.style.transform = `translate(${e.clientX - 4}px, ${e.clientY - 2}px)`), true)
  addEventListener('mousedown', () => (c.style.scale = '0.82'), true)
  addEventListener('mouseup', () => (c.style.scale = '1'), true)
}

const tmp = await mkdtemp(join(tmpdir(), 'aimless-gif-'))
const app = await electron.launch({ args: [`--user-data-dir=${join(tmp, 'profile')}`, ROOT], cwd: ROOT })
const page = await app.firstWindow()
await page.waitForLoadState('domcontentloaded')
await page.evaluate((entries) => {
  localStorage.clear()
  for (const [k, v] of Object.entries(entries)) localStorage.setItem(k, JSON.stringify(v))
}, seed)
await page.reload()
await page.waitForLoadState('networkidle')
await page.evaluate(() => document.fonts.ready)
await page.evaluate(installCursor)
const size = await page.evaluate(() => ({ w: innerWidth, h: innerHeight, dpr: devicePixelRatio, zoom: outerWidth / innerWidth }))
console.log('window', size)

// ---- helpers
const wait = (ms) => page.waitForTimeout(ms)
let mx = 700, my = 400
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)
async function glide(x, y, ms = 900) {
  const x0 = mx, y0 = my
  const steps = Math.max(12, Math.round(ms / 16))
  for (let i = 1; i <= steps; i++) {
    const e = ease(i / steps)
    await page.mouse.move(x0 + (x - x0) * e, y0 + (y - y0) * e)
    await wait(ms / steps)
  }
  mx = x; my = y
}
async function moveTo(loc, ms = 900) {
  await scrollInto(loc)
  const b = await loc.boundingBox()
  await glide(b.x + b.width / 2, b.y + b.height / 2, ms)
  await wait(250)
}
async function click(loc, ms) {
  await moveTo(loc, ms)
  await page.mouse.down(); await wait(90); await page.mouse.up()
  await wait(400)
}
async function scrollInto(loc) {
  const b = await loc.boundingBox()
  if (b && b.y > 80 && b.y + b.height < size.h - 30) return
  const target = (await loc.evaluate((el) => { const r = el.getBoundingClientRect(); return r.top + r.height / 2 })) - size.h / 2
  await smoothScroll(target)
}
async function smoothScroll(dy, ms = 1100) {
  const steps = Math.round(ms / 16)
  let done = 0
  for (let i = 1; i <= steps; i++) {
    const to = dy * ease(i / steps)
    await page.mouse.wheel(0, to - done)
    done = to
    await wait(16)
  }
  await wait(350)
}
const scrollToTop = async () => { await page.evaluate(() => document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' }) ?? window.scrollTo({ top: 0, behavior: 'smooth' })); await wait(900) }

// ---- recording
const frames = []
const cdp = await page.context().newCDPSession(page)
cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
  frames.push({ data: Buffer.from(data, 'base64'), t: metadata.timestamp })
  await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
})
await glide(520, 320, 10)

// move to the Raw Accel page from the sidebar
await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1, maxWidth: GIF_W, maxHeight: Math.round((GIF_W * 860) / 1360) })
await wait(900)
await click(page.getByRole('link', { name: 'Raw Accel' }), 1100)
await page.getByText('Raw Accel Advisor').waitFor()
await wait(1100)

// DPI + game + preset
await click(page.getByRole('radio', { name: '1600', exact: true }), 1000)
await wait(500)
await click(page.getByRole('radio', { name: '800', exact: true }), 700)
await click(page.getByRole('button', { name: /^Game:/ }), 900)
await wait(300)
await page.keyboard.type('valorant', { delay: 110 })
await wait(400)
await page.keyboard.press('Enter')
await wait(500)
await click(page.getByRole('radio', { name: /Tactical micro-control/ }), 900)
await click(page.getByRole('button', { name: 'Generate curve' }), 800)
await wait(900)

// telemetry + diagnostic
await smoothScroll(330)
await wait(1500)

// replica + graph
await smoothScroll(520, 900)
await wait(1300)
await click(page.getByRole('radio', { name: 'Raw Accel Classic' }), 800)
await wait(1500)
await click(page.getByRole('radio', { name: 'Aimless Dark' }), 700)
await wait(900)

// history ghost curve
const compare = page.getByRole('button', { name: 'Compare', exact: true }).first()
await scrollInto(compare)
await wait(600)
await click(compare, 1000)
await wait(600)
await scrollInto(page.locator('svg[aria-label="Sensitivity"]').first())
await wait(2200)

// export image
const copyBtn = page.getByRole('button', { name: 'Copy image' })
await click(page.getByRole('radio', { name: 'Pro showcase card' }), 1000)
await click(copyBtn, 900)
await wait(2200)
await cdp.send('Page.stopScreencast')
const endT = frames.length ? frames[frames.length - 1].t + 1 : 0
const toast = await page.locator('[data-sonner-toast]').allInnerTexts().catch(() => [])
console.log('toasts:', toast)
await app.close()

// ---- encode (gifenc, one shared 256-colour palette so there is no flicker or banding between frames)
if (frames.length < 10) throw new Error('too few frames: ' + frames.length)
const MIN_FRAME_S = 0.04 // 25 fps
const kept = []
for (const f of frames) {
  const last = kept[kept.length - 1]
  if (last && f.t - last.t < MIN_FRAME_S) last.data = f.data
  else kept.push({ ...f })
}
if (process.env.DEBUG_FRAMES) for (let i = 0; i < kept.length; i += Math.ceil(kept.length / 14)) await writeFile(join(process.env.DEBUG_FRAMES, `f${i}.png`), kept[i].data)
const decoded = kept.map((f) => ({ t: f.t, img: PNG.sync.read(f.data) }))
const { width, height } = decoded[0].img
const same = decoded.filter((f) => f.img.width === width && f.img.height === height)
const px = width * height
const stride = Math.max(1, Math.ceil((px * same.length) / 1_500_000))
const samples = new Uint8Array(Math.ceil((px * same.length) / stride) * 4 + 4)
let n = 0
same.forEach((f, fi) => {
  const d = f.img.data
  for (let i = (fi % stride) * 4; i < d.length; i += 4 * stride) { samples[n++] = d[i]; samples[n++] = d[i + 1]; samples[n++] = d[i + 2]; samples[n++] = 255 }
})
// 255 colours + 1 reserved "unchanged pixel" index: each frame only stores what changed since the last one.
const colours = quantize(samples.subarray(0, n), 255)
const palette = [...colours, [0, 0, 0]]
const T = 255
const gif = GIFEncoder()
let prev = null
same.forEach((f, i) => {
  const next = i + 1 < same.length ? same[i + 1].t : endT
  const delay = Math.max(40, Math.round((next - f.t) * 1000))
  const index = applyPalette(new Uint8Array(f.img.data), colours)
  const out = prev ? index.map((v, k) => (v === prev[k] ? T : v)) : index
  prev = index
  gif.writeFrame(out, width, height, { palette: i === 0 ? palette : undefined, delay, repeat: 0, transparent: i > 0, transparentIndex: T, dispose: 1 })
})
gif.finish()
await writeFile(OUT, gif.bytes())
await rm(tmp, { recursive: true, force: true })
console.log(`saved ${OUT}  ${same.length} frames  ${width}x${height}  ${((endT - same[0].t)).toFixed(1)} s  ${(gif.bytes().length / 1048576).toFixed(2)} MB`)
