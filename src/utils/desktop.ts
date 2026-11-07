/** The bridge exposed by electron/preload.cjs. Undefined on the web. */
export interface WindowState {
  maximized: boolean
  fullScreen: boolean
  focused: boolean
}

export interface ShortcutStatus {
  supported: boolean
  exists: boolean
  portable: boolean
}

export interface AimlessDesktop {
  platform: string
  window: {
    minimize: () => Promise<void>
    toggleMaximize: () => Promise<void>
    close: () => Promise<void>
    getState: () => Promise<WindowState | null>
    onState: (callback: (state: WindowState) => void) => () => void
  }
  shortcut: {
    status: () => Promise<ShortcutStatus>
    create: () => Promise<boolean>
  }
}

declare global {
  interface Window {
    aimlessDesktop?: AimlessDesktop
  }
}

export const desktop: AimlessDesktop | undefined = typeof window !== 'undefined' ? window.aimlessDesktop : undefined
