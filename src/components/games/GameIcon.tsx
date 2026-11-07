import { useState } from 'react'
import { getGame } from '@/core/sensitivity'
import { GAME_ICON_IDS } from '@/data/games/gameIcons'
import { cn } from '@/utils/cn'
import { GameArt } from './GameArt'

/** URL of a game's bundled icon (relative, so it works from file:// in the desktop app and on any web sub-path). */
export function gameIconUrl(gameId: string): string {
  return `${import.meta.env.BASE_URL}game-icons/${gameId}.webp`
}

/**
 * A game's real icon, bundled locally (public/game-icons, fetched by scripts/fetch-game-icons.mjs).
 * Games without an icon, or an image that fails to load, fall back to the generated GameArt badge.
 */
export function GameIcon({ gameId, className }: { gameId: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  if (failed || !GAME_ICON_IDS.has(gameId)) return <GameArt gameId={gameId} className={className} />
  const color = getGame(gameId)?.color ?? '#888888'
  return (
    <span
      aria-hidden="true"
      className={cn('relative inline-flex aspect-[5/4] shrink-0 items-center justify-center overflow-hidden rounded-[7px]', className)}
      style={{ background: `linear-gradient(145deg, ${color}38, #0b0b0e)`, boxShadow: `inset 0 0 0 1px ${color}73` }}
    >
      <img
        src={gameIconUrl(gameId)}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        onError={() => setFailed(true)}
        className="h-full w-auto max-w-full object-contain"
      />
    </span>
  )
}
