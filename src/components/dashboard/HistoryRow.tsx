import { ArrowRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { useFormat } from '@/hooks/useFormat'
import type { HistoryEntry } from '@/store/types'
import { AccuracyDot } from '../games/AccuracyBadge'
import { GameBadge, gameName } from '../games/GameBadge'

/** One conversion in a list: source → target with the values. */
export function HistoryRow({ entry, actions, onClick }: { entry: HistoryEntry; actions?: ReactNode; onClick?: () => void }) {
  const f = useFormat()
  const content = (
    <>
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <GameBadge gameId={entry.sourceGameId} size="sm" />
        <div className="min-w-0">
          <div className="truncate text-xs text-muted">{gameName(entry.sourceGameId)}</div>
          <div className="ltr num text-start text-sm font-semibold">
            {f.sens(entry.sourceSensitivity)} <span className="text-xs font-normal text-subtle">@ {entry.sourceDpi}</span>
          </div>
        </div>
      </div>
      <ArrowRight className="size-3.5 shrink-0 text-subtle rtl:rotate-180" />
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <GameBadge gameId={entry.targetGameId} size="sm" />
        <div className="min-w-0">
          <div className="truncate text-xs text-muted">{gameName(entry.targetGameId)}</div>
          <div className="ltr num text-start text-sm font-semibold">
            {f.sens(entry.targetSensitivity)} <span className="text-xs font-normal text-subtle">@ {entry.targetDpi}</span>
          </div>
        </div>
      </div>
      <div className="hidden shrink-0 text-end sm:block">
        <div className="ltr num flex items-center justify-end gap-1.5 text-sm font-medium">
          <AccuracyDot accuracy={entry.accuracy} />
          {f.cm(entry.cm360)} <span className="text-xs font-normal text-subtle">cm</span>
        </div>
        <div className="text-[11px] text-subtle">{f.relativeTime(entry.at)}</div>
      </div>
    </>
  )
  return (
    <div className="flex items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-surface-2">
      {onClick ? (
        <button type="button" onClick={onClick} className="flex min-w-0 flex-1 items-center gap-3 text-start">
          {content}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{content}</div>
      )}
      {actions}
    </div>
  )
}
