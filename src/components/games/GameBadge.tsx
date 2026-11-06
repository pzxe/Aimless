import { getGame } from '@/core/sensitivity'
import { cn } from '@/utils/cn'

/**
 * Text-based game identifier. Original placeholder instead of copyrighted artwork.
 */
export function GameBadge({ gameId, size = 'md', className }: { gameId: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const game = getGame(gameId)
  const label = game?.short ?? '?'
  const color = game?.color ?? '#888'
  return (
    <span
      aria-hidden="true"
      className={cn(
        'ltr inline-flex shrink-0 items-center justify-center rounded-md font-bold tracking-tight',
        size === 'sm' && 'h-6 w-8 text-[9px]',
        size === 'md' && 'h-8 w-10 text-[10px]',
        size === 'lg' && 'h-11 w-14 text-xs',
        className,
      )}
      style={{
        color,
        backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${color} 28%, transparent)`,
      }}
    >
      {label}
    </span>
  )
}

export function gameName(gameId: string): string {
  return getGame(gameId)?.name ?? gameId
}
