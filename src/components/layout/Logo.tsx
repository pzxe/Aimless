export function LogoMark({ className = 'size-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" className="fill-accent-soft" />
      <circle cx="16" cy="16" r="8.5" fill="none" className="stroke-accent" strokeWidth="2.2" />
      <path d="M16 4.5v6M16 21.5v6M4.5 16h6M21.5 16h6" className="stroke-accent" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="16" cy="16" r="1.8" className="fill-text" />
    </svg>
  )
}
