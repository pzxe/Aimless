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
  rank: {
    fetch: (url, headers) => ipcRenderer.invoke('fetch-live-rank', { url, headers }),
  },
})
