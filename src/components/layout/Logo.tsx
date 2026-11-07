import { useId } from 'react'

/**
 * The Aimless emblem: a three-segment rotation ring, three crosshair ticks at 120° and a core
 * diamond on a dark tile. No text. Same geometry as public/favicon.svg and the desktop icon;
 * here the ring and core follow the user's accent colour.
 */
export function LogoMark({ className = 'size-8' }: { className?: string }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 64 64" className={`text-accent ${className}`} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#22101a" />
          <stop offset="1" stopColor="#07080c" />
        </linearGradient>
        <radialGradient id={`${id}glow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.5" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill={`url(#${id}bg)`} />
      <rect x="0.75" y="0.75" width="62.5" height="62.5" rx="14.25" fill="none" stroke="#fff" strokeOpacity="0.09" strokeWidth="1.5" />
      <circle cx="32" cy="32" r="24" fill={`url(#${id}glow)`} />
      <circle
        cx="32"
        cy="32"
        r="19"
        fill="none"
        stroke="currentColor"
        strokeWidth="4.5"
        strokeLinecap="round"
        pathLength={360}
        strokeDasharray="88 32"
        transform="rotate(166 32 32)"
      />
      <g stroke="#ffe4e9" strokeWidth="3" strokeLinecap="round">
        <path d="M32 7v11" />
        <path d="M32 7v11" transform="rotate(120 32 32)" />
        <path d="M32 7v11" transform="rotate(240 32 32)" />
      </g>
      <path d="M32 24.5 39.5 32 32 39.5 24.5 32Z" fill="currentColor" />
      <path d="M32 24.5 39.5 32H24.5Z" fill="#fff" fillOpacity="0.22" />
    </svg>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return <span className={`display text-[19px] tracking-[0.02em] ${className ?? ''}`}>Aimless</span>
}
