/** True inside the packaged Electron desktop app. */
export const isDesktopApp = typeof navigator !== 'undefined' && /\bElectron\//.test(navigator.userAgent)

export const RELEASES_URL = 'https://github.com/pzxe/Aimless/releases/latest'
export const REPO_URL = 'https://github.com/pzxe/Aimless'
export const ISSUES_URL = 'https://github.com/pzxe/Aimless/issues'
