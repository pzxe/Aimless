import { getGame } from '@/core/sensitivity'
import { cn } from '@/utils/cn'
import { GameArt } from './GameArt'

/**
 * A game's emblem with its short code: original, locally generated artwork
 * (see GameArt), never copyrighted game art.
 */
export function GameBadge({ gameId, size = 'md', className }: { gameId: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const game = getGame(gameId)
  const dims = size === 'sm' ? 'h-6 w-[30px]' : size === 'md' ? 'h-8 w-10' : 'h-11 w-14'
  return (
    <span aria-hidden="true" className={cn('relative inline-flex shrink-0', dims, className)}>
      <GameArt gameId={gameId} className="size-full" />
      {size !== 'sm' && (
        <span
          className="ltr absolute inset-x-0 -bottom-1 mx-auto w-fit rounded px-1 text-[8px] leading-[11px] font-bold tracking-wide whitespace-nowrap"
          style={{ color: '#fff', background: game?.color ?? '#888' }}
        >
          {game?.short ?? '?'}
        </span>
      )}
    </span>
  )
}

export function gameName(gameId: string): string {
  return getGame(gameId)?.name ?? gameId
}
