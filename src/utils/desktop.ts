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

export interface RankFetchResult {
  status: number
  body: string
}

export type UpdateStatus = 'idle' | 'checking' | 'uptodate' | 'available' | 'downloading' | 'ready' | 'installing' | 'error'

export interface UpdateProgress {
  percent: number
  transferredBytes: number
  totalBytes: number
  /** Bytes per second, smoothed. */
  speed: number
}

export interface UpdateLatest {
  version: string
  tag: string
  name: string
  notes: string
  htmlUrl: string
  publishedAt: string | null
  /** Size of the file that would be downloaded for this install, 0 if unknown. */
  size: number
  assetName: string | null
  /** False when the release has no matching file or no published checksum (then only a manual download is offered). */
  canInstall: boolean
}

export interface UpdateState {
  status: UpdateStatus
  current: string
  /** How this copy runs: the NSIS install, the portable .exe, the extracted ZIP, or an unpackaged dev run. */
  kind: 'setup' | 'portable' | 'zip' | 'dev'
  checkedAt: number | null
  latest: UpdateLatest | null
  progress: UpdateProgress | null
  error: { code: string; status?: number } | null
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
  update: {
    getState: () => Promise<UpdateState>
    check: () => Promise<UpdateState>
    download: () => Promise<UpdateState>
    cancel: () => Promise<UpdateState>
    install: () => Promise<UpdateState>
    setPrefs: (prefs: { autoCheck: boolean; autoDownload: boolean }) => Promise<unknown>
    openRelease: () => Promise<void>
    onState: (callback: (state: UpdateState) => void) => () => void
    onProgress: (callback: (progress: UpdateProgress) => void) => () => void
  }
  /** Live rank requests made by the main process (no browser CORS). Only a fixed list of hosts is allowed. */
  rank: {
    fetch: (url: string, headers?: Record<string, string>) => Promise<RankFetchResult>
  }
}

declare global {
  interface Window {
    aimlessDesktop?: AimlessDesktop
  }
}

export const desktop: AimlessDesktop | undefined = typeof window !== 'undefined' ? window.aimlessDesktop : undefined
