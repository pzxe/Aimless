import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { fromValorantRegion, toValorantRegion, type Account } from '@/core/accounts/types'
import { useT } from '@/i18n'
import { useAccounts } from '@/store/accountsStore'
import { useRankSettings } from '@/store/rankSettingsStore'
import { fetchOverwatchRank, fetchValorantRank, RankError } from '@/utils/rankFetcher'

export const LIVE_RANK_GAMES = ['valorant', 'overwatch2'] as const
export const supportsLiveRank = (gameId: string) => (LIVE_RANK_GAMES as readonly string[]).includes(gameId)

/** Refreshes an account's live rank. `busy` holds the ids being fetched. */
export function useRankRefresh() {
  const t = useT()
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set())

  const refresh = useCallback(
    async (account: Account, opts: { quiet?: boolean } = {}) => {
      if (!supportsLiveRank(account.gameId) || busy.has(account.id)) return
      setBusy((s) => new Set(s).add(account.id))
      try {
        const store = useAccounts.getState()
        if (account.gameId === 'valorant') {
          const live = await fetchValorantRank({
            riotId: account.inGameId,
            region: toValorantRegion(account.region),
            apiKey: useRankSettings.getState().henrikKey,
          })
          store.setLive(account.id, live)
          const detected = fromValorantRegion(live.region)
          if (!account.region && detected) store.update(account.id, { region: detected })
        } else {
          store.setLive(account.id, await fetchOverwatchRank(account.inGameId))
        }
      } catch (e) {
        const kind = e instanceof RankError ? e.kind : 'network'
        if (!opts.quiet) toast.error(t(`rank.error.${kind}`))
      } finally {
        setBusy((s) => {
          const n = new Set(s)
          n.delete(account.id)
          return n
        })
      }
    },
    [busy, t],
  )

  return { refresh, busy }
}
