// In-app updater (main process): checks GitHub Releases, streams the Windows build with live progress,
// verifies its SHA-256, then hands over to a short PowerShell script that waits for this app to exit,
// installs/replaces, repairs the shortcuts and starts the new version.
//
// Works without code signing or electron-updater, for all three ways Aimless runs on Windows:
//   setup    NSIS install            -> runs Aimless-vX-Setup.exe silently (/S)
//   portable the single .exe         -> replaces the .exe next to the old one
//   zip      the extracted folder    -> unpacks the NoInstall ZIP over the folder
//
// Safety: only GitHub's hosts are contacted for downloads, only assets of this repository's latest
// (non-draft, non-prerelease) release are considered, the file must match the SHA-256 GitHub publishes for
// it (re-checked right before running), and nothing is installed without the user's click.
const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const { spawn } = require('node:child_process')
const { app, net, shell } = require('electron')

let core = null
const loadCore = async () => (core ??= await import(pathToFileURL(path.join(__dirname, 'update-core.mjs')).href))

const isWindows = process.platform === 'win32'

/** Test hook: a loopback API URL in AIMLESS_UPDATE_TEST_API replaces GitHub (never anything else). */
function testApi() {
  const raw = process.env.AIMLESS_UPDATE_TEST_API
  if (!raw) return null
  try {
    const u = new URL(raw)
    return u.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(u.hostname) ? u.toString() : null
  } catch {
    return null
  }
}

/** setup | portable | zip on a packaged Windows build, otherwise dev (updates can be checked but not installed). */
function installKind() {
  if (!isWindows || !app.isPackaged) return 'dev'
  if (process.env.PORTABLE_EXECUTABLE_FILE) return 'portable'
  const dir = path.dirname(process.execPath)
  return fs.existsSync(path.join(dir, `Uninstall ${app.getName()}.exe`)) ? 'setup' : 'zip'
}

const DEFAULT_PREFS = { autoCheck: true, autoDownload: false }
let prefs = { ...DEFAULT_PREFS }
const prefsFile = () => path.join(app.getPath('userData'), 'update-prefs.json')

function loadPrefs() {
  try {
    const j = JSON.parse(fs.readFileSync(prefsFile(), 'utf8'))
    prefs = { autoCheck: j.autoCheck !== false, autoDownload: j.autoDownload === true }
  } catch {
    prefs = { ...DEFAULT_PREFS }
  }
}

function setPrefs(p) {
  const next = { autoCheck: p && p.autoCheck !== false, autoDownload: !!(p && p.autoDownload === true) }
  prefs = next
  prefsReceived = true
  try {
    fs.writeFileSync(prefsFile(), JSON.stringify(next))
  } catch {
    /* not critical */
  }
  return prefs
}
let prefsReceived = false

const initialState = () => ({
  status: 'idle', // idle | checking | uptodate | available | downloading | ready | installing | error
  current: app.getVersion(),
  kind: installKind(),
  checkedAt: null,
  latest: null,
  progress: null,
  error: null,
})
let state = initialState()
let latestRelease = null
let latestAsset = null
let downloaded = null // { filePath, size, sha256 }
let abort = null
let getWindow = () => null

function broadcast(channel, payload) {
  const win = getWindow()
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload)
}
function setState(patch) {
  state = { ...state, ...patch }
  broadcast('update:state', state)
  return state
}
const fail = (code, extra = {}) => setState({ status: 'error', progress: null, error: { code, ...extra } })

async function api() {
  const c = await loadCore()
  const base = testApi()
  return { c, url: base ? new URL('/releases/latest', base).toString() : c.LATEST_RELEASE_URL, opts: { allowLoopback: !!base } }
}

/** Looks up the latest GitHub release. Resolves with the new state (never throws). */
async function check() {
  if (['checking', 'downloading', 'installing'].includes(state.status)) return state
  setState({ status: 'checking', error: null })
  try {
    const { c, url, opts } = await api()
    const res = await net.fetch(url, {
      headers: { 'User-Agent': 'Aimless-Updater', Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
      signal: AbortSignal.timeout(15000),
    })
    if (res.status === 403 || res.status === 429) return fail('rate-limited')
    if (res.status === 404) return fail('no-release')
    if (!res.ok) return fail('http', { status: res.status })
    const release = c.parseRelease(await res.json(), opts)
    if (!release) return fail('bad-response')
    const checkedAt = Date.now()
    latestRelease = release
    const summary = {
      version: release.version,
      tag: release.tag,
      name: release.name,
      notes: release.notes.slice(0, 8000),
      htmlUrl: release.htmlUrl,
      publishedAt: release.publishedAt,
    }
    if (!c.isNewerVersion(release.version, app.getVersion())) {
      latestAsset = null
      return setState({ status: 'uptodate', checkedAt, latest: { ...summary, size: 0, assetName: null, canInstall: false } })
    }
    const kind = installKind()
    latestAsset = kind === 'dev' ? null : c.pickAsset(release, kind)
    const hash = latestAsset ? c.expectedSha256(latestAsset, release.notes) : null
    // Without a published checksum the file cannot be verified, so it is not downloaded automatically.
    const canInstall = !!latestAsset && !!hash
    setState({
      status: 'available',
      checkedAt,
      latest: { ...summary, size: latestAsset ? latestAsset.size : 0, assetName: latestAsset ? latestAsset.name : null, canInstall },
      progress: null,
    })
    if (canInstall && prefs.autoDownload) void download()
    return state
  } catch (e) {
    return fail(e && e.name === 'TimeoutError' ? 'timeout' : 'network')
  }
}


/**
 * GET that vets the URL and every redirect hop BEFORE contacting it: a hop to a host that is not GitHub's
 * aborts the request without it ever being sent. Resolves with the response stream.
 */
function guardedGet(c, url, { headers, signal, opts }) {
  return new Promise((resolve, reject) => {
    const refuse = Object.assign(new Error('untrusted'), { code: 'untrusted-host' })
    if (!c.isTrustedDownloadUrl(url, opts)) return reject(refuse)
    const req = net.request({ method: 'GET', url, redirect: 'manual', headers })
    let hops = 0
    const onAbort = () => req.abort()
    signal.addEventListener('abort', onAbort, { once: true })
    const done = (fn, v) => {
      signal.removeEventListener('abort', onAbort)
      fn(v)
    }
    req.on('redirect', (_status, _method, redirectUrl) => {
      if (!c.isTrustedDownloadUrl(redirectUrl, opts)) {
        req.abort()
        return done(reject, refuse)
      }
      if (++hops > 5) {
        req.abort()
        return done(reject, Object.assign(new Error('redirects'), { code: 'http' }))
      }
      req.followRedirect()
    })
    req.on('response', (res) => done(resolve, { res, req }))
    req.on('error', (e) => done(reject, e))
    req.on('abort', () => done(reject, Object.assign(new Error('aborted'), { code: 'aborted' })))
    req.end()
  })
}

/** Streams the asset into %TEMP% with progress events, hashing as it goes, and verifies it. */
async function download() {
  if (state.status !== 'available' || !latestAsset || !latestRelease || !state.latest.canInstall) return state
  const c = await loadCore()
  const asset = latestAsset
  const expected = c.expectedSha256(asset, latestRelease.notes)
  const dir = path.join(app.getPath('temp'), `aimless-update-${latestRelease.version}`)
  const filePath = path.join(dir, asset.name)
  abort = new AbortController()
  const { opts } = await api()
  setState({ status: 'downloading', error: null, progress: { percent: 0, transferredBytes: 0, totalBytes: asset.size, speed: 0 } })
  let out = null
  try {
    fs.rmSync(dir, { recursive: true, force: true })
    fs.mkdirSync(dir, { recursive: true })
    const { res } = await guardedGet(c, asset.url, { headers: { 'User-Agent': 'Aimless-Updater', Accept: 'application/octet-stream' }, signal: abort.signal, opts })
    if (res.statusCode !== 200) throw Object.assign(new Error('http'), { code: 'http', status: res.statusCode })
    const lengthHeader = [].concat(res.headers['content-length'] || [])[0]
    const total = Number(lengthHeader) || asset.size
    out = fs.createWriteStream(filePath)
    const hash = crypto.createHash('sha256')
    let transferred = 0
    let speed = 0
    let lastT = Date.now()
    let lastBytes = 0
    for await (const value of res) {
      hash.update(value)
      if (!out.write(value)) await new Promise((r) => out.once('drain', r))
      transferred += value.length
      const now = Date.now()
      if (now - lastT >= 200) {
        speed = c.smoothSpeed(speed, transferred - lastBytes, (now - lastT) / 1000)
        lastT = now
        lastBytes = transferred
        const progress = { percent: total ? Math.min(100, (transferred / total) * 100) : 0, transferredBytes: transferred, totalBytes: total, speed }
        state = { ...state, progress }
        broadcast('update:progress', progress)
      }
    }
    if (abort.signal.aborted) throw Object.assign(new Error('aborted'), { code: 'aborted' })
    await new Promise((resolve, reject) => out.end((err) => (err ? reject(err) : resolve())))
    out = null
    const sha256 = hash.digest('hex')
    if (asset.size && transferred !== asset.size) throw Object.assign(new Error('size'), { code: 'verify-failed' })
    if (sha256 !== expected) throw Object.assign(new Error('hash'), { code: 'verify-failed' })
    downloaded = { filePath, size: transferred, sha256 }
    const done = { percent: 100, transferredBytes: transferred, totalBytes: total || transferred, speed: 0 }
    broadcast('update:progress', done)
    return setState({ status: 'ready', progress: done })
  } catch (e) {
    if (out) out.destroy()
    fs.rmSync(dir, { recursive: true, force: true })
    downloaded = null
    if (abort && abort.signal.aborted) return setState({ status: 'available', progress: null })
    return fail((e && e.code) || (e && e.name === 'TimeoutError' ? 'timeout' : 'network'), e && e.status ? { status: e.status } : {})
  } finally {
    abort = null
  }
}

function cancel() {
  if (abort) abort.abort()
  return state
}

async function sha256File(file) {
  const h = crypto.createHash('sha256')
  await new Promise((resolve, reject) => fs.createReadStream(file).on('data', (d) => h.update(d)).on('end', resolve).on('error', reject))
  return h.digest('hex')
}

/** Re-verifies the file, writes the updater script, starts it detached and quits the app. */
async function install() {
  if (state.status !== 'ready' || !downloaded || !latestAsset) return state
  const kind = installKind()
  if (kind === 'dev') return fail('not-installable')
  const c = await loadCore()
  try {
    // Re-check right before running: the file sat in %TEMP% since the download.
    if (!fs.existsSync(downloaded.filePath) || fs.statSync(downloaded.filePath).size !== downloaded.size || (await sha256File(downloaded.filePath)) !== downloaded.sha256) {
      return fail('verify-failed')
    }
    const logPath = path.join(app.getPath('temp'), 'aimless-update.log')
    const scriptPath = path.join(app.getPath('temp'), 'update-aimless.ps1')
    const exePath = process.execPath
    let script
    if (kind === 'setup') script = c.buildInstalledScript({ pid: process.pid, setupPath: downloaded.filePath, exePath, logPath })
    else if (kind === 'portable') {
      const oldFilePath = process.env.PORTABLE_EXECUTABLE_FILE
      script = c.buildPortableScript({ pid: process.pid, newFilePath: downloaded.filePath, oldFilePath, newName: latestAsset.name, logPath })
    } else script = c.buildZipScript({ pid: process.pid, zipPath: downloaded.filePath, appDir: path.dirname(exePath), exePath, logPath })
    // UTF-8 with a BOM so Windows PowerShell 5.1 reads non-ASCII paths correctly.
    fs.writeFileSync(scriptPath, '﻿' + script, 'utf8')
    // PowerShell needs a console, so `detached: true` (no console) makes it exit without running the script, and a direct
    // child can die with this process. A short-lived launcher starts the real script with Start-Process, which gives it
    // its own independent process; we quit only after the launcher is done. The path is wrapped in double quotes
    // (Start-Process does not quote arguments) inside a single-quoted literal, so spaces and symbols are inert.
    const lit = (s) => `'${String(s).replace(/'/g, "''")}'`
    const launcher = spawn(
      'powershell.exe',
      [
        '-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-Command',
        `Start-Process -FilePath powershell.exe -WindowStyle Hidden -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File',${lit(`"${scriptPath}"`)}`,
      ],
      { stdio: 'ignore', windowsHide: true },
    )
    const started = await new Promise((resolve) => {
      const timer = setTimeout(() => resolve(false), 20000)
      launcher.on('error', () => (clearTimeout(timer), resolve(false)))
      launcher.on('exit', (code) => (clearTimeout(timer), resolve(code === 0)))
    })
    if (!started) return fail('install-failed')
    setState({ status: 'installing' })
    setTimeout(() => app.quit(), 300)
    setTimeout(() => app.exit(0), 5000) // if a window refuses to close, the script is still waiting for us
    return state
  } catch {
    return fail('install-failed')
  }
}

/** Registers the IPC handlers. `fromOurWindow` gates every call to the app's own window. */
function register({ ipcMain, window, fromOurWindow }) {
  getWindow = window
  loadPrefs()
  const guard = (fn) => async (event, ...args) => {
    if (!fromOurWindow(event)) throw new Error('forbidden')
    return fn(...args)
  }
  ipcMain.handle('update:get-state', guard(() => state))
  ipcMain.handle('update:check', guard(() => check()))
  ipcMain.handle('update:download', guard(() => download()))
  ipcMain.handle('update:cancel', guard(() => cancel()))
  ipcMain.handle('update:install', guard(() => install()))
  ipcMain.handle('update:set-prefs', guard((p) => setPrefs(p)))
  ipcMain.handle('update:open-release', guard(async () => {
    const url = state.latest && /^https:\/\/github\.com\//.test(state.latest.htmlUrl) ? state.latest.htmlUrl : 'https://github.com/pzxe/Aimless/releases/latest'
    await shell.openExternal(url)
  }))
}

/** Background check 3 seconds after launch (packaged builds only), unless the user turned it off. */
function scheduleStartupCheck() {
  if (!app.isPackaged && !testApi()) return
  setTimeout(async () => {
    // The renderer pushes its saved preference right after it loads; give it a moment, else use the cached file.
    for (let i = 0; i < 10 && !prefsReceived; i++) await new Promise((r) => setTimeout(r, 300))
    if (prefs.autoCheck) void check()
  }, 3000)
}

module.exports = { register, scheduleStartupCheck, installKind }
