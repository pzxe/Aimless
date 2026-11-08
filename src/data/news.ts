/**
 * The "Latest updates & news" feed on the dashboard: one card per notable feature, newest first. The screenshots are
 * bundled in public/news/ so the feed also works offline. The live release highlights come from GitHub on top of this.
 * Each item needs `news.<id>.title` and `news.<id>.desc` in every language.
 */
export interface NewsItem {
  id: string
  /** The release that shipped it. */
  version: string
  /** File in public/news/. */
  image: string
  /** In-app page to open, if any. */
  to?: string
}

export const NEWS: readonly NewsItem[] = [
  { id: 'padlab', version: '2.5.3', image: 'mousepad-lab.webp', to: '/mousepad' },
  { id: 'accounts', version: '2.5.3', image: 'alt-accounts.webp', to: '/accounts' },
  { id: 'games', version: '2.5.3', image: 'games.webp', to: '/games' },
  { id: 'tools', version: '2.5.3', image: 'tools.webp', to: '/tools' },
  { id: 'bell', version: '2.5.2', image: 'update-bell.webp' },
  { id: 'rawaccel', version: '2.5.1', image: 'raw-accel.webp', to: '/rawaccel' },
  { id: 'live', version: '2.4.0', image: 'live-tournaments.webp', to: '/tournaments' },
]
