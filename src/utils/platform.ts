/** True inside the packaged Electron desktop app. */
export const isDesktopApp = typeof navigator !== 'undefined' && /\bElectron\//.test(navigator.userAgent)

/**
 * The browser version (1usl.one/aimless). Deliberately a different product from the desktop app: it is the accessible,
 * marketing-driven edge with a smaller feature set and analytics, while the desktop app keeps every feature and sends
 * no telemetry at all.
 */
export const isWebApp = !isDesktopApp

/** Routes that exist only in the desktop app. On the web they show a "download the desktop app" notice instead. */
export const DESKTOP_ONLY_PATHS = ['/mousepad', '/profiles', '/accounts', '/games', '/settings'] as const

export const RELEASES_URL = 'https://github.com/pzxe/Aimless/releases/latest'
export const REPO_URL = 'https://github.com/pzxe/Aimless'
export const ISSUES_URL = 'https://github.com/pzxe/Aimless/issues'
