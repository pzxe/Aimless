import { create } from 'zustand'
import { isNewerVersion, LATEST_RELEASE_URL, parseRelease, pickAsset } from '../../electron/update-core.mjs'
import { desktop, type UpdateProgress, type UpdateState } from '@/utils/desktop'
import { useSettings } from './settingsStore'

/** The desktop state, or the web variant (`kind: 'web'`, with the Windows installer link). */
export interface UpdateView extends Omit<UpdateState, 'kind'> {
  kind: UpdateState['kind'] | 'web'
  /** Web only: direct link to the newest Windows installer. */
  installerUrl?: string
  installerName?: string
}

interface UpdateStore {
  state: UpdateView
  init: () => void
  check: () => Promise<void>
  download: () => Promise<void>
  cancel: () => Promise<void>
  install: () => Promise<void>
  /** Web: clear the app's Cache Storage and reload, so a stale copy is replaced by the deployed one. */
  reloadFresh: () => Promise<void>
}

declare const __APP_VERSION__: string

const initial = (): UpdateView => ({
  status: 'idle',
  current: __APP_VERSION__,
  kind: desktop ? 'dev' : 'web',
  checkedAt: null,
  latest: null,
  progress: null,
  error: null,
})

/** Deletes every Cache Storage entry (a service worker or stale asset cache). Never throws. */
export async function clearWebCaches(): Promise<number> {
  try {
    if (typeof caches === 'undefined') return 0
    const keys = await caches.keys()
    await Promise.all(keys.map((k) => caches.delete(k)))
    return keys.length
  } catch {
    return 0
  }
}

let started = false

export const useUpdates = create<UpdateStore>()((set, get) => ({
  state: initial(),

  init: () => {
    if (started) return
    started = true
    if (!desktop) return
    const u = desktop.update
    void u.getState().then((s) => set({ state: s }))
    u.onState((s) => set({ state: s }))
    u.onProgress((p: UpdateProgress) => set((cur) => ({ state: { ...cur.state, progress: p } })))
    // The main process runs the startup check itself, so it needs the saved preferences right away and on every change.
    const push = () => {
      const { autoCheckUpdates, autoDownloadUpdates } = useSettings.getState()
      void u.setPrefs({ autoCheck: autoCheckUpdates, autoDownload: autoDownloadUpdates })
    }
    push()
    useSettings.subscribe((s, prev) => {
      if (s.autoCheckUpdates !== prev.autoCheckUpdates || s.autoDownloadUpdates !== prev.autoDownloadUpdates) push()
    })
  },

  check: async () => {
    if (desktop) {
      await desktop.update.check()
      return
    }
    if (get().state.status === 'checking') return
    set((c) => ({ state: { ...c.state, status: 'checking', error: null } }))
    try {
      const res = await fetch(LATEST_RELEASE_URL, { headers: { Accept: 'application/vnd.github+json' } })
      if (res.status === 403 || res.status === 429) throw Object.assign(new Error('rate'), { code: 'rate-limited' })
      if (res.status === 404) throw Object.assign(new Error('none'), { code: 'no-release' })
      if (!res.ok) throw Object.assign(new Error('http'), { code: 'http', status: res.status })
      const release = parseRelease(await res.json())
      if (!release) throw Object.assign(new Error('bad'), { code: 'bad-response' })
      const setup = pickAsset(release, 'setup')
      const newer = isNewerVersion(release.version, __APP_VERSION__)
      // Up to date: this is also the moment to drop any stale cached copy of the app.
      if (!newer) await clearWebCaches()
      set({
        state: {
          ...initial(),
          status: newer ? 'available' : 'uptodate',
          checkedAt: Date.now(),
          latest: {
            version: release.version,
            tag: release.tag,
            name: release.name,
            notes: release.notes.slice(0, 8000),
            htmlUrl: release.htmlUrl,
            publishedAt: release.publishedAt,
            size: setup?.size ?? 0,
            assetName: setup?.name ?? null,
            canInstall: false,
          },
          installerUrl: setup?.url,
          installerName: setup?.name,
        },
      })
    } catch (e) {
      const code = (e as { code?: string }).code ?? 'network'
      set((c) => ({ state: { ...c.state, status: 'error', error: { code, status: (e as { status?: number }).status } } }))
    }
  },

  download: async () => {
    if (desktop) await desktop.update.download()
  },
  cancel: async () => {
    if (desktop) await desktop.update.cancel()
  },
  install: async () => {
    if (desktop) await desktop.update.install()
  },
  reloadFresh: async () => {
    await clearWebCaches()
    location.reload()
  },
}))

/** True while an update needs attention (shown as a dot on the Settings entry in the sidebar). */
export const useUpdateBadge = () => useUpdates((s) => ['available', 'downloading', 'ready'].includes(s.state.status))
