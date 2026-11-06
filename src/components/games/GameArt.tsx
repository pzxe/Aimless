import { useId } from 'react'
import type { Genre } from '@/core/sensitivity'
import { getGame } from '@/core/sensitivity'
import { hueOf } from '@/data/games/catalog'
import { cn } from '@/utils/cn'

/**
 * Original emblem artwork for every game, generated locally from its genre, colour and id.
 * No official logos or key art: the genre symbol, pattern and code make each title distinct.
 */

const GLYPHS: Record<Genre, string> = {
  // crosshair
  tactical: 'M12 4v4M12 16v4M4 12h4M16 12h4M12 7a5 5 0 1 0 0 10a5 5 0 1 0 0-10Z',
  // closing zone
  'battle-royale': 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18ZM13.5 9.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7Z',
  // lightning
  arena: 'M13.5 3 6.5 13h5l-1 8 7-10h-5l1-8Z',
  // shield
  hero: 'M12 3 5 6v5c0 4.4 2.9 8.3 7 10c4.1-1.7 7-5.6 7-10V6l-7-3ZM12 8v7',
  // exit arrow out of a box
  extraction: 'M10 5H6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h4M14 8l5 4-5 4M19 12H10',
  // rank chevrons
  military: 'M5 7l7 4 7-4M5 12l7 4 7-4M5 17l7 4 7-4',
  // two figures
  coop: 'M8.5 7a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5ZM15.5 7a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5ZM4 19c.6-2.9 2.3-4.5 4.5-4.5S12.4 16.1 13 19M11 19c.6-2.9 2.3-4.5 4.5-4.5S19.4 16.1 20 19',
  // single figure with a sight line
  singleplayer: 'M12 4a3 3 0 1 0 0 6a3 3 0 1 0 0-6ZM6 20c.7-3.6 3-5.6 6-5.6s5.3 2 6 5.6M3 12h3M18 12h3',
  // 8-bit cross
  classic: 'M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6V4Z',
}

const FILLED: Partial<Record<Genre, boolean>> = { arena: true, classic: true }

type Variant = 'badge' | 'banner'

export function GameArt({ gameId, variant = 'badge', className }: { gameId: string; variant?: Variant; className?: string }) {
  const uid = useId().replace(/:/g, '')
  const game = getGame(gameId)
  const genre: Genre = game?.genre ?? 'tactical'
  const color = game?.color ?? '#888888'
  const code = game?.short ?? '?'
  const h = hueOf(gameId)
  const pattern = h % 4 // stripes, grid, dots, rings
  const angle = [35, 120, 65, 155][h % 4]!
  const banner = variant === 'banner'
  const W = banner ? 240 : 40
  const H = banner ? 96 : 32
  const glyphSize = banner ? 56 : 18
  const gx = banner ? W - glyphSize - 20 : (W - glyphSize) / 2
  const gy = (H - glyphSize) / 2

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={cn('shrink-0', className)}
      role={banner ? 'img' : undefined}
      aria-hidden={banner ? undefined : true}
      aria-label={banner ? game?.name : undefined}
      preserveAspectRatio={banner ? 'xMidYMid slice' : undefined}
    >
      <defs>
        <linearGradient id={`g${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={color} stopOpacity={banner ? 0.95 : 0.32} />
          <stop offset="1" stopColor="#0b0b0e" stopOpacity={banner ? 0.95 : 0.2} />
        </linearGradient>
        <pattern id={`p${uid}`} width={banner ? 12 : 6} height={banner ? 12 : 6} patternUnits="userSpaceOnUse" patternTransform={`rotate(${angle})`}>
          {pattern === 0 && <rect width={banner ? 2 : 1} height={banner ? 12 : 6} fill="#fff" fillOpacity="0.09" />}
          {pattern === 1 && <path d={banner ? 'M0 0H12M0 0V12' : 'M0 0H6M0 0V6'} stroke="#fff" strokeOpacity="0.08" strokeWidth="1" />}
          {pattern === 2 && <circle cx={banner ? 6 : 3} cy={banner ? 6 : 3} r={banner ? 1.4 : 0.8} fill="#fff" fillOpacity="0.12" />}
        </pattern>
        <clipPath id={`c${uid}`}>
          <rect width={W} height={H} rx={banner ? 0 : 7} />
        </clipPath>
      </defs>
      <g clipPath={`url(#c${uid})`}>
        <rect width={W} height={H} fill={`url(#g${uid})`} />
        <rect width={W} height={H} fill={`url(#p${uid})`} />
        {pattern === 3 && (
          <g fill="none" stroke="#fff" strokeOpacity="0.1">
            {[0.3, 0.55, 0.8].map((k) => (
              <circle key={k} cx={banner ? W - 48 : W - 6} cy={banner ? H / 2 : 4} r={(banner ? 120 : 30) * k} />
            ))}
          </g>
        )}
        {banner && <circle cx={gx + glyphSize / 2} cy={gy + glyphSize / 2} r={glyphSize * 0.95} fill={color} fillOpacity="0.28" />}
      </g>
      {!banner && <rect x="0.5" y="0.5" width={W - 1} height={H - 1} rx="6.5" fill="none" stroke={color} strokeOpacity="0.45" />}
      <g transform={`translate(${gx} ${gy}) scale(${glyphSize / 24})`}>
        <path
          d={GLYPHS[genre]}
          fill={FILLED[genre] ? (banner ? '#ffffff' : color) : 'none'}
          fillOpacity={FILLED[genre] ? (banner ? 0.95 : 0.9) : undefined}
          stroke={FILLED[genre] ? 'none' : banner ? '#ffffff' : color}
          strokeWidth={banner ? 1.6 : 2}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={banner ? 1 : 0.95}
        />
      </g>
      {banner && (
        <text x="20" y={H - 22} fill="#ffffff" fontSize="24" fontWeight="600" fontFamily="Geist Mono Variable, ui-monospace, monospace" letterSpacing="1">
          {code}
        </text>
      )}
    </svg>
  )
}
