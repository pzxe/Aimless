// Preload (sandboxed): exposes a small, fixed API for the custom title bar and the desktop shortcut.
// No Node or Electron objects reach the page; every call is a named IPC message.
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('aimlessDesktop', {
  platform: process.platform,
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    toggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    getState: () => ipcRenderer.invoke('window:get-state'),
    /** Subscribe to maximize / restore / focus changes. Returns an unsubscribe function. */
    onState: (callback) => {
      const listener = (_event, state) => callback(state)
      ipcRenderer.on('window:state', listener)
      return () => ipcRenderer.removeListener('window:state', listener)
    },
  },
  shortcut: {
    status: () => ipcRenderer.invoke('shortcut:status'),
    create: () => ipcRenderer.invoke('shortcut:create'),
  },
  update: {
    getState: () => ipcRenderer.invoke('update:get-state'),
    check: () => ipcRenderer.invoke('update:check'),
    download: () => ipcRenderer.invoke('update:download'),
    cancel: () => ipcRenderer.invoke('update:cancel'),
    install: () => ipcRenderer.invoke('update:install'),
    setPrefs: (prefs) => ipcRenderer.invoke('update:set-prefs', prefs),
    openRelease: () => ipcRenderer.invoke('update:open-release'),
    /** Full state changes (checking, available, downloading, ready, error...). Returns an unsubscribe function. */
    onState: (callback) => {
      const listener = (_event, state) => callback(state)
      ipcRenderer.on('update:state', listener)
      return () => ipcRenderer.removeListener('update:state', listener)
    },
    /** Download progress, about five times a second: { percent, transferredBytes, totalBytes, speed }. */
    onProgress: (callback) => {
      const listener = (_event, progress) => callback(progress)
      ipcRenderer.on('update:progress', listener)
      return () => ipcRenderer.removeListener('update:progress', listener)
    },
  },
  rank: {
    fetch: (url, headers) => ipcRenderer.invoke('fetch-live-rank', { url, headers }),
  },
})
