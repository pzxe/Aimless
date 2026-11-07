import { useEffect, useLayoutEffect, useState, type CSSProperties } from 'react'
import { useT } from '@/i18n'
import { cn } from '@/utils/cn'
import { desktop, type WindowState } from '@/utils/desktop'
import { LogoMark } from './Logo'

// Electron reads -webkit-app-region to decide which pixels move the window (HTCAPTION on Windows),
// so dragging, double-click to maximize, Aero Snap and drag-to-restore are native behaviour.
const drag = { WebkitAppRegion: 'drag' } as CSSProperties
const noDrag = { WebkitAppRegion: 'no-drag' } as CSSProperties

const LIGHTS = {
  close: { color: '#FF5F57', edge: '#E0443E' },
  minimize: { color: '#FEBC2E', edge: '#DEA123' },
  maximize: { color: '#28C840', edge: '#1AAB29' },
} as const

function Glyph({ kind, maximized }: { kind: keyof typeof LIGHTS; maximized: boolean }) {
  const common = { stroke: 'currentColor', strokeWidth: 1.25, strokeLinecap: 'round' as const, fill: 'none' }
  return (
    <svg viewBox="0 0 12 12" className="size-3" aria-hidden="true">
      {kind === 'close' && <path d="M3.75 3.75l4.5 4.5M8.25 3.75l-4.5 4.5" {...common} />}
      {kind === 'minimize' && <path d="M3.25 6h5.5" {...common} strokeWidth={1.4} />}
      {kind === 'maximize' &&
        (maximized ? (
          // Restore: two triangles pointing inward.
          <g fill="currentColor">
            <path d="M6.6 2.6v2.8h2.8z" />
            <path d="M5.4 9.4V6.6H2.6z" />
          </g>
        ) : (
          // Maximize: two triangles pointing outward.
          <g fill="currentColor">
            <path d="M3.2 3.2h3.5L3.2 6.7z" />
            <path d="M8.8 8.8H5.3l3.5-3.5z" />
          </g>
        ))}
    </svg>
  )
}

/**
 * macOS-style title bar for the Windows/Linux desktop app: traffic lights on the left,
 * the app name in the centre, and the rest of the bar draggable. Renders nothing on the web.
 * On macOS the native traffic lights are kept (the window uses `hiddenInset`); the bar only
 * reserves space for them.
 */
export function TitleBar() {
  const t = useT()
  const [state, setState] = useState<WindowState>({ maximized: false, fullScreen: false, focused: true })
  const mac = desktop?.platform === 'darwin'

  useLayoutEffect(() => {
    if (!desktop) return
    document.documentElement.setAttribute('data-titlebar', desktop.platform)
    return () => document.documentElement.removeAttribute('data-titlebar')
  }, [])

  useEffect(() => {
    if (!desktop) return
    desktop.window.getState().then((s) => s && setState(s))
    return desktop.window.onState(setState)
  }, [])

  if (!desktop || state.fullScreen) return null

  const buttons = [
    { kind: 'close' as const, label: t('window.close'), run: desktop.window.close },
    { kind: 'minimize' as const, label: t('window.minimize'), run: desktop.window.minimize },
    {
      kind: 'maximize' as const,
      label: state.maximized ? t('window.restore') : t('window.maximize'),
      run: desktop.window.toggleMaximize,
    },
  ]

  return (
    <div
      dir="ltr"
      data-titlebar-root=""
      data-maximized={state.maximized ? '' : undefined}
      className="fixed inset-x-0 top-0 z-[80] flex h-[38px] items-center border-b border-border/70 bg-surface select-none"
      style={drag}
    >
      {mac ? (
        <div className="w-[78px] shrink-0" />
      ) : (
        // Always left-to-right and on the left, as on macOS, in every language.
        <div dir="ltr" className="group/lights flex shrink-0 items-center gap-[7px] ps-[13px] pe-3" style={noDrag} role="group" aria-label={t('window.controls')}>
          {buttons.map((b) => (
            <button
              key={b.kind}
              type="button"
              data-window-control={b.kind}
              aria-label={b.label}
              title={b.label}
              onClick={() => void b.run()}
              onDoubleClick={(e) => e.stopPropagation()}
              style={{ ...noDrag, '--light': LIGHTS[b.kind].color, '--edge': LIGHTS[b.kind].edge } as CSSProperties}
              className={cn(
                'grid size-3 place-items-center rounded-full text-black/60 transition-[filter,background-color] duration-150',
                'hover:brightness-95 active:brightness-75 focus-visible:outline-2 focus-visible:outline-offset-2',
                // Unfocused window: grey lights (as on macOS), coloured again when the pointer is over them.
                state.focused
                  ? 'bg-(--light) shadow-[inset_0_0_0_0.5px_var(--edge)]'
                  : 'bg-border-strong group-hover/lights:bg-(--light)',
              )}
            >
              <span className="opacity-0 transition-opacity duration-100 group-hover/lights:opacity-100 group-focus-within/lights:opacity-100">
                <Glyph kind={b.kind} maximized={state.maximized} />
              </span>
            </button>
          ))}
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-[96px] flex items-center justify-center gap-2 text-[12.5px] font-medium text-muted">
        <LogoMark className="size-4" />
        <span className={cn('truncate', !state.focused && 'opacity-60')}>Aimless</span>
      </div>
    </div>
  )
}
