// Electron entry point: wraps the static Vite build (dist/) as an offline desktop app.
const path = require('node:path')
const { app, BrowserWindow, Menu, session, shell } = require('electron')

// One window per user; a second launch focuses the existing one.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  let win = null

  const createWindow = () => {
    win = new BrowserWindow({
      width: 1360,
      height: 860,
      minWidth: 380,
      minHeight: 560,
      show: false,
      backgroundColor: '#0a0d13',
      title: 'Aimless',
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        spellcheck: false,
      },
    })

    win.once('ready-to-show', () => win.show())
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))

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
