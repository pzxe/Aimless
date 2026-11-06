import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useConverter, type ConverterForm } from '@/store/converterStore'
import { useSettings } from '@/store/settingsStore'
import type { HistoryEntry, Profile } from '@/store/types'

/** Load a history entry or profile into the converter and open it. */
export function useLoadIntoConverter() {
  const load = useConverter((s) => s.load)
  const pushRecent = useSettings((s) => s.pushRecentGame)
  const navigate = useNavigate()

  const fromHistory = useCallback(
    (e: HistoryEntry) => {
      load({
        sourceGameId: e.sourceGameId,
        sourceSensitivity: String(e.sourceSensitivity),
        sourceDpi: String(e.sourceDpi),
        targetGameId: e.targetGameId,
        targetDpi: String(e.targetDpi),
        linkDpi: e.sourceDpi === e.targetDpi,
      })
      navigate('/converter')
    },
    [load, navigate],
  )

  const fromProfile = useCallback(
    (p: Profile) => {
      const patch: Partial<ConverterForm> = {
        sourceGameId: p.gameId,
        sourceSensitivity: String(p.sensitivity),
        sourceDpi: String(p.dpi),
        targetDpi: String(p.dpi),
        linkDpi: true,
        fov: p.fov !== undefined ? String(p.fov) : '',
      }
      if (p.resolution) {
        patch.resolutionWidth = String(p.resolution.width)
        patch.resolutionHeight = String(p.resolution.height)
      }
      const current = useConverter.getState()
      if (current.targetGameId === p.gameId) {
        patch.targetGameId = current.sourceGameId !== p.gameId ? current.sourceGameId : 'valorant'
      }
      load(patch)
      pushRecent(p.gameId)
      navigate('/converter')
    },
    [load, navigate, pushRecent],
  )

  return { fromHistory, fromProfile }
}
