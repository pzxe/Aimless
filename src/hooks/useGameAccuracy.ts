import { useCallback } from 'react'
import { getGame, resolveFormula, type ResultAccuracy } from '@/core/sensitivity'
import { useSettings } from '@/store/settingsStore'

/** Effective accuracy of a game, taking the user's calibrations into account. */
export function useGameAccuracy() {
  const calibrations = useSettings((s) => s.calibrations)
  return useCallback(
    (gameId: string): ResultAccuracy => {
      const game = getGame(gameId)
      if (!game) return 'unsupported'
      return resolveFormula(game, calibrations)?.accuracy ?? 'unsupported'
    },
    [calibrations],
  )
}
