import { Check, ChevronsUpDown, Search, Star } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { getAllGames, getGame, type GameDefinition } from '@/core/sensitivity'
import { useGameAccuracy } from '@/hooks/useGameAccuracy'
import { useT } from '@/i18n'
import { useSettings } from '@/store/settingsStore'
import { cn } from '@/utils/cn'
import { AccuracyDot } from './AccuracyBadge'
import { GameBadge } from './GameBadge'

interface Section {
  key: string
  title: string
  games: GameDefinition[]
}

/**
 * Searchable game combobox with favorites and recently used games.
 * Keyboard: ↑/↓ move, Enter selects, Escape closes, typing searches.
 */
export function GameSelector({
  value,
  onChange,
  label,
  className,
}: {
  value: string
  onChange: (id: string) => void
  label: string
  className?: string
}) {
  const t = useT()
  const favorites = useSettings((s) => s.favoriteGames)
  const recent = useSettings((s) => s.recentGames)
  const toggleFavorite = useSettings((s) => s.toggleFavoriteGame)
  const pushRecent = useSettings((s) => s.pushRecentGame)
  const accuracyOf = useGameAccuracy()

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const listId = useId()
  const pendingQuery = useRef('')

  const selected = getGame(value)

  const sections = useMemo<Section[]>(() => {
    const all = getAllGames()
    const q = query.trim().toLowerCase()
    if (q) {
      const matches = all.filter(
        (g) => g.name.toLowerCase().includes(q) || g.short.toLowerCase().includes(q) || g.id.includes(q),
      )
      return [{ key: 'results', title: t('gameSelector.all'), games: matches }]
    }
    const byIds = (ids: string[]) => ids.map((id) => getGame(id)).filter((g): g is GameDefinition => !!g)
    const out: Section[] = []
    const fav = byIds(favorites)
    if (fav.length) out.push({ key: 'fav', title: t('gameSelector.favorites'), games: fav })
    const rec = byIds(recent).filter((g) => !favorites.includes(g.id)).slice(0, 4)
    if (rec.length) out.push({ key: 'recent', title: t('gameSelector.recent'), games: rec })
    out.push({ key: 'all', title: t('gameSelector.all'), games: [...all] })
    return out
  }, [query, favorites, recent, t])

  const flat = useMemo(() => sections.flatMap((s) => s.games.map((g) => ({ game: g, section: s.key }))), [sections])

  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number; width: number; maxHeight: number } | null>(null)

  useEffect(() => {
    if (!open) return
    setQuery(pendingQuery.current)
    pendingQuery.current = ''

    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    // Fixed positioning so the popover is never clipped by scrolling containers (e.g. dialogs).
    const place = () => {
      const r = buttonRef.current?.getBoundingClientRect()
      if (!r) return
      const vw = window.innerWidth
      const vh = window.innerHeight
      const width = Math.min(Math.max(r.width, 320), vw - 16)
      const isRtl = document.documentElement.dir === 'rtl'
      let left = isRtl ? r.right - width : r.left
      left = Math.max(8, Math.min(left, vw - width - 8))
      const below = vh - r.bottom - 12
      const above = r.top - 12
      if (below >= 280 || below >= above) setPos({ top: r.bottom + 6, left, width, maxHeight: Math.min(420, below) })
      else setPos({ bottom: vh - r.top + 6, left, width, maxHeight: Math.min(420, above) })
    }
    place()
    document.addEventListener('mousedown', onDown)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  const placed = pos !== null
  useEffect(() => {
    if (open && placed) inputRef.current?.focus()
    if (!open) setPos(null)
  }, [open, placed])

  // Highlight the current game when opening, the first result while searching.
  useEffect(() => {
    if (!open) return
    if (query) setActive(0)
    else {
      const idx = flat.findIndex((f) => f.game.id === value)
      setActive(idx >= 0 ? idx : 0)
    }
  }, [open, query])

  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  const choose = (id: string) => {
    onChange(id)
    pushRecent(id)
    setOpen(false)
    buttonRef.current?.focus()
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(flat.length - 1, a + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(0, a - 1))
    } else if (e.key === 'Home') {
      e.preventDefault()
      setActive(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setActive(flat.length - 1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = flat[active]
      if (item) choose(item.game.id)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      setOpen(false)
      buttonRef.current?.focus()
    } else if (e.key === 'Tab') {
      setOpen(false)
    }
  }

  let index = -1
  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${selected?.name ?? t('gameSelector.placeholder')}`}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault()
            setOpen(true)
          } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && e.key !== ' ') {
            // Type-to-search: start a query straight from the button.
            e.preventDefault()
            pendingQuery.current += e.key
            setOpen(true)
          }
        }}
        className={cn(
          'flex h-12 w-full items-center gap-3 rounded-lg border border-border bg-surface-2 ps-2 pe-3 text-start',
          'transition-[border-color,box-shadow] duration-150 hover:border-border-strong',
          open && 'border-accent ring-3 ring-ring',
        )}
      >
        {selected ? <GameBadge gameId={selected.id} /> : <span className="h-8 w-10 rounded-md bg-surface-3" />}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{selected?.name ?? t('gameSelector.placeholder')}</span>
        </span>
        {selected && <AccuracyDot accuracy={accuracyOf(selected.id)} />}
        <ChevronsUpDown className="size-4 shrink-0 text-subtle" />
      </button>

      {open && pos && (
        <div
          className="fixed z-[60] flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-pop animate-[pop-in_140ms_cubic-bezier(0.2,0.8,0.2,1)]"
          style={{ top: pos.top, bottom: pos.bottom, left: pos.left, width: pos.width, maxHeight: pos.maxHeight }}
          onKeyDown={onKeyDown}
        >
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search className="size-4 shrink-0 text-subtle" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('gameSelector.search')}
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-activedescendant={flat[active] ? `${listId}-${active}` : undefined}
              aria-autocomplete="list"
              className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-subtle"
            />
          </div>
          <ul ref={listRef} id={listId} role="listbox" aria-label={label} className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-1.5">
            {flat.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-muted">{t('gameSelector.noResults', { q: query })}</li>
            )}
            {sections.map((section) =>
              section.games.length === 0 ? null : (
                <li key={section.key} role="presentation">
                  <div className="px-2.5 pt-2 pb-1 text-[11px] font-medium tracking-wide text-subtle uppercase">{section.title}</div>
                  <ul role="presentation">
                    {section.games.map((g) => {
                      index += 1
                      const i = index
                      const isFav = favorites.includes(g.id)
                      return (
                        <li
                          key={`${section.key}-${g.id}`}
                          id={`${listId}-${i}`}
                          data-index={i}
                          role="option"
                          aria-selected={g.id === value}
                          onMouseMove={() => setActive(i)}
                          onClick={() => choose(g.id)}
                          className={cn(
                            'group flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5',
                            i === active && 'bg-surface-2',
                          )}
                        >
                          <GameBadge gameId={g.id} size="sm" />
                          <span className="min-w-0 flex-1 truncate text-sm">{g.name}</span>
                          <AccuracyDot accuracy={accuracyOf(g.id)} />
                          {g.id === value && <Check className="size-4 text-accent" />}
                          <button
                            type="button"
                            tabIndex={-1}
                            aria-label={isFav ? t('gameSelector.unfavorite') : t('gameSelector.favorite')}
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleFavorite(g.id)
                            }}
                            className={cn(
                              'rounded p-1 transition-opacity',
                              isFav ? 'text-warning' : 'text-subtle opacity-0 group-hover:opacity-100 hover:text-text',
                              i === active && 'opacity-100',
                            )}
                          >
                            <Star className={cn('size-3.5', isFav && 'fill-current')} />
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </li>
              ),
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
