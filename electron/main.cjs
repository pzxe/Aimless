// Electron entry point: wraps the static Vite build (dist/) as an offline desktop app.
const fs = require('node:fs')
const path = require('node:path')
const { app, BrowserWindow, Menu, ipcMain, net, session, shell } = require('electron')

const APP_ID = 'io.github.pzxe.aimless'
const isMac = process.platform === 'darwin'
const isWindows = process.platform === 'win32'

// One window per user; a second launch focuses the existing one.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  let win = null

  // Taskbar grouping and pinned-shortcut identity match the installer's shortcuts.
  if (isWindows) app.setAppUserModelId(APP_ID)

  /** The executable a shortcut should start: the portable .exe itself, not its temp extraction. */
  const launcherPath = () => process.env.PORTABLE_EXECUTABLE_FILE || process.execPath
  const shortcutPath = () => path.join(app.getPath('desktop'), 'Aimless.lnk')

  const sendWindowState = () => {
    if (!win || win.isDestroyed()) return
    win.webContents.send('window:state', {
      maximized: win.isMaximized(),
      fullScreen: win.isFullScreen(),
      focused: win.isFocused(),
    })
  }

  const createWindow = () => {
    win = new BrowserWindow({
      width: 1360,
      height: 860,
      minWidth: 380,
      minHeight: 560,
      show: false,
      backgroundColor: '#0a0d13',
      title: 'Aimless',
      // Custom title bar. On Windows and Linux, `titleBarStyle: 'hidden'` removes the native caption
      // and its buttons but keeps the resizable frame (all edges and corners), the window shadow,
      // Aero Snap and Alt+F4. The renderer draws macOS-style controls in their place.
      // On macOS the real traffic lights are kept and only inset into our bar.
      titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
      ...(isMac ? { trafficLightPosition: { x: 13, y: 12 } } : {}),
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        spellcheck: false,
        preload: path.join(__dirname, 'preload.cjs'),
      },
    })

    win.once('ready-to-show', () => win.show())
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))

    for (const e of ['maximize', 'unmaximize', 'enter-full-screen', 'leave-full-screen', 'focus', 'blur', 'restore']) {
      win.on(e, sendWindowState)
    }
    win.on('closed', () => {
      win = null
    })

    // The app is fully local: never navigate away from the bundled files.
    win.webContents.on('will-navigate', (event, url) => {
      if (!url.startsWith('file://')) event.preventDefault()
    })
    // External https links open in the default browser; everything else is refused.
    win.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('https://')) shell.openExternal(url)
      return { action: 'deny' }
    })
  }

  /** Only our own window may drive these handlers. */
  const fromOurWindow = (event) => win && !win.isDestroyed() && event.sender === win.webContents

  ipcMain.handle('window:minimize', (event) => {
    if (fromOurWindow(event)) win.minimize()
  })
  ipcMain.handle('window:toggle-maximize', (event) => {
    if (!fromOurWindow(event)) return
    if (win.isFullScreen()) win.setFullScreen(false)
    else if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  })
  ipcMain.handle('window:close', (event) => {
    if (fromOurWindow(event)) win.close()
  })
  ipcMain.handle('window:get-state', (event) =>
    fromOurWindow(event) ? { maximized: win.isMaximized(), fullScreen: win.isFullScreen(), focused: win.isFocused() } : null,
  )

  // Desktop shortcut (Windows). The Setup installer creates one itself; the portable .exe and the
  // no-install ZIP can create one from Settings.
  ipcMain.handle('shortcut:status', (event) => {
    if (!fromOurWindow(event) || !isWindows) return { supported: false, exists: false, portable: false }
    return {
      supported: true,
      exists: fs.existsSync(shortcutPath()),
      portable: Boolean(process.env.PORTABLE_EXECUTABLE_FILE),
    }
  })
  ipcMain.handle('shortcut:create', (event) => {
    if (!fromOurWindow(event) || !isWindows) return false
    const target = launcherPath()
    return shell.writeShortcutLink(shortcutPath(), fs.existsSync(shortcutPath()) ? 'replace' : 'create', {
      target,
      cwd: path.dirname(target),
      icon: target,
      iconIndex: 0,
      description: 'Aimless: FPS sensitivity converter',
      appUserModelId: APP_ID,
    })
  })

  // Live rank lookups. The renderer asks, the main process fetches, so CORS never applies. Only GET
  // requests to these three public APIs are allowed, with a fixed set of headers, a timeout and a size cap.
  const RANK_HOSTS = new Set(['overfast-api.tekrop.fr', 'api.henrikdev.xyz', 'valorant-api.com'])
  const RANK_MAX_BYTES = 2 * 1024 * 1024
  ipcMain.handle('fetch-live-rank', async (event, req) => {
    if (!fromOurWindow(event)) throw new Error('forbidden')
    let url
    try {
      url = new URL(String(req && req.url))
    } catch {
      throw new Error('invalid url')
    }
    if (url.protocol !== 'https:' || !RANK_HOSTS.has(url.hostname)) throw new Error('host not allowed')
    const headers = { Accept: 'application/json', 'User-Agent': `Aimless/${app.getVersion()}` }
    const auth = req.headers && req.headers.Authorization
    if (typeof auth === 'string' && auth.length <= 200 && url.hostname === 'api.henrikdev.xyz') headers.Authorization = auth
    const res = await net.fetch(url.toString(), { method: 'GET', headers, redirect: 'error', signal: AbortSignal.timeout(15000) })
    const body = await res.text()
    if (body.length > RANK_MAX_BYTES) throw new Error('response too large')
    return { status: res.status, body }
  })

  app.on('second-instance', () => {
    if (!win) return
    if (win.isMinimized()) win.restore()
    win.focus()
  })

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null)
    // No camera, microphone, notifications, etc. The app needs none.
    session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false))
    createWindow()
  })

  app.on('window-all-closed', () => app.quit())
}
