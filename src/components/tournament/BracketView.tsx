import { Check, Pencil } from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'
import { bestOfFor, type BracketSide, type ResolvedMatch, type ResolvedTournament, type Tournament } from '@/core/tournament'
import { useT } from '@/i18n'
import { cn } from '@/utils/cn'
import { roundName, seedOf } from './labels'

const CARD_H = 78
const GAP = 18

interface Props {
  tournament: Tournament
  resolved: ResolvedTournament
  side: BracketSide
  onOpen: (matchId: string) => void
  onRename: (side: BracketSide, round: number, label: string) => void
}

/** One side of a bracket: rounds as columns, with connector lines between matches. */
export function BracketView({ tournament, resolved, side, onOpen, onRename }: Props) {
  const t = useT()
  const matches = tournament.matches.filter((m) => m.side === side)
  const rounds = [...new Set(matches.map((m) => m.round))].sort((a, b) => a - b)
  const perRound = rounds.map((r) => matches.filter((m) => m.round === r))
  const maxCount = Math.max(...perRound.map((r) => r.length), 1)
  const height = maxCount * CARD_H + (maxCount - 1) * GAP

  const containerRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef(new Map<string, HTMLElement>())
  const [paths, setPaths] = useState<string[]>([])
  const [size, setSize] = useState({ w: 0, h: 0 })

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    const compute = () => {
      const base = container.getBoundingClientRect()
      const ids = new Set(matches.map((m) => m.id))
      const out: string[] = []
      for (const m of matches) {
        const target = cardRefs.current.get(m.id)?.getBoundingClientRect()
        if (!target) continue
        for (const src of m.sources) {
          if (src.type !== 'winner' || !ids.has(src.matchId)) continue
          const from = cardRefs.current.get(src.matchId)?.getBoundingClientRect()
          if (!from) continue
          const forward = target.left > from.left
          const x1 = (forward ? from.right : from.left) - base.left + container.scrollLeft
          const y1 = from.top + from.height / 2 - base.top
          const x2 = (forward ? target.left : target.right) - base.left + container.scrollLeft
          const y2 = target.top + target.height / 2 - base.top
          const mid = (x1 + x2) / 2
          out.push(`M ${x1} ${y1} H ${mid} V ${y2} H ${x2}`)
        }
      }
      setPaths(out)
      setSize({ w: container.scrollWidth, h: container.scrollHeight })
    }
    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(container)
    return () => ro.disconnect()
    // Recompute whenever results or language/direction change.
  }, [tournament, side, t]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={containerRef} className="scrollbar-thin relative overflow-x-auto pb-3">
      <svg className="pointer-events-none absolute top-0 left-0" width={size.w} height={size.h} aria-hidden="true">
        {paths.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="var(--c-border-strong)" strokeWidth="1.5" />
        ))}
      </svg>
      <div className="relative flex gap-10">
        {rounds.map((round, ri) => (
          <div key={round} className="w-[216px] shrink-0">
            <RoundHeader
              bo={bestOfFor(tournament, { side, round })}
              label={roundName(t, tournament, side, round)}
              onRename={(label) => onRename(side, round, label)}
              editLabel={t('tournament.renameRound')}
            />
            <div className="flex flex-col justify-around" style={{ height }}>
              {perRound[ri]!.map((m) => {
                const r = resolved.matches.get(m.id)!
                return (
                  <MatchCard
                    key={m.id}
                    tournament={tournament}
                    match={r}
                    ref={(el) => {
                      if (el) cardRefs.current.set(m.id, el)
                      else cardRefs.current.delete(m.id)
                    }}
                    onOpen={() => onOpen(m.id)}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RoundHeader({ label, onRename, editLabel, bo }: { label: string; onRename: (label: string) => void; editLabel: string; bo: number }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(label)
  if (editing) {
    return (
      <form
        className="mb-3 flex h-7 items-center gap-1"
        onSubmit={(e) => {
          e.preventDefault()
          onRename(value)
          setEditing(false)
        }}
      >
        <input
          autoFocus
          value={value}
          maxLength={40}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => {
            onRename(value)
            setEditing(false)
          }}
          onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}
          className="h-7 w-full rounded-lg border border-accent-line bg-surface-2 px-2 text-xs outline-none"
        />
        <Check className="size-3.5 text-accent" />
      </form>
    )
  }
  return (
    <button
      type="button"
      onClick={() => {
        setValue(label)
        setEditing(true)
      }}
      title={editLabel}
      className="group mb-3 flex h-7 w-full items-center gap-1.5 text-start text-[11px] font-semibold tracking-[0.16em] text-subtle uppercase hover:text-text"
    >
      <span className="truncate">{label}</span>
      <span className="ltr num shrink-0 rounded-md bg-surface-3 px-1.5 py-0.5 text-[9px] tracking-wider text-muted">Bo{bo}</span>
      <Pencil className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  )
}

const MatchCard = ({
  tournament,
  match,
  onOpen,
  ref,
}: {
  tournament: Tournament
  match: ResolvedMatch
  onOpen: () => void
  ref: (el: HTMLElement | null) => void
}) => {
  const t = useT()
  const clickable = match.status === 'ready' || match.status === 'done'
  const isVoid = match.status === 'void'
  const Row = ({ i }: { i: 0 | 1 }) => {
    const slot = match.slots[i]
    const id = slot.kind === 'filled' ? slot.id : null
    const name = id ? tournament.participants.find((p) => p.id === id)?.name : null
    const won = id !== null && id === match.winnerId && (match.status === 'done' || match.status === 'walkover')
    const lost = match.status === 'done' && id !== null && id === match.loserId
    const score = match.result?.score[i]
    return (
      <div className={cn('flex h-[30px] items-center gap-2 px-2.5', lost && 'opacity-50')}>
        <span className="ltr num w-5 shrink-0 text-[10px] text-subtle">{id ? seedOf(tournament, id) : ''}</span>
        <span className={cn('min-w-0 flex-1 truncate text-[13px]', won ? 'font-semibold text-text' : 'text-muted', !name && 'text-subtle italic')}>
          {name ?? (slot.kind === 'empty' ? t('tournament.bye') : t('tournament.tbd'))}
        </span>
        <span
          className={cn(
            'ltr num flex h-5 min-w-6 items-center justify-center rounded-md px-1 text-xs font-semibold',
            won ? 'bg-accent-fill text-accent-fg' : 'bg-surface-3 text-muted',
            score === undefined && 'bg-transparent',
          )}
        >
          {score ?? ''}
        </span>
      </div>
    )
  }
  return (
    <button
      ref={ref}
      type="button"
      disabled={!clickable}
      data-status={match.status}
      onClick={onOpen}
      aria-label={t('tournament.openMatch')}
      className={cn(
        'card relative flex w-full flex-col justify-center overflow-hidden rounded-xl text-start transition-[transform,border-color,box-shadow] duration-200',
        clickable && 'lift cursor-pointer',
        match.status === 'ready' && 'border-accent-line shadow-[0_0_0_1px_var(--c-accent-line),0_10px_30px_-18px_var(--c-accent-glow)]',
        isVoid && 'opacity-35',
        match.status === 'walkover' && 'opacity-70',
      )}
      style={{ height: CARD_H - 8 }}
    >
      {match.status === 'ready' && (
        <span className="absolute top-1.5 end-1.5 flex size-2">
          <span className="absolute inset-0 animate-[pulse-ring_1.6s_ease-out_infinite] rounded-full bg-accent-fill" />
          <span className="relative size-2 rounded-full bg-accent-fill" />
        </span>
      )}
      <Row i={0} />
      <div className="mx-2.5 h-px bg-border" />
      <Row i={1} />
    </button>
  )
}
