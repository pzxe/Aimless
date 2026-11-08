import { useCallback, useEffect, useRef, useState } from 'react'
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
  // the ref is the source of truth for "already running": the `busy` state in this closure can be one render behind
  const inflight = useRef(new Set<string>())
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const refresh = useCallback(
    async (account: Account, opts: { quiet?: boolean } = {}) => {
      if (!supportsLiveRank(account.gameId) || inflight.current.has(account.id)) return
      inflight.current.add(account.id)
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
        inflight.current.delete(account.id)
        if (mounted.current) {
          setBusy((s) => {
            const n = new Set(s)
            n.delete(account.id)
            return n
          })
        }
      }
    },
    [t],
  )

  return { refresh, busy }
}
