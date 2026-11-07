import { useEffect, useState } from 'react'
import { bundledTiers, loadValorantTiers, type TierInfo } from '@/utils/rankFetcher'

/** Official Valorant tiers: the bundled snapshot at first, replaced by the cached/fresh valorant-api.com data. */
export function useValorantTiers(): { list: TierInfo[]; byTier: Map<number, TierInfo> } {
  const [list, setList] = useState<TierInfo[]>(bundledTiers)
  useEffect(() => {
    let alive = true
    void loadValorantTiers().then((tiers) => alive && setList(tiers))
    return () => {
      alive = false
    }
  }, [])
  return { list, byTier: new Map(list.map((t) => [t.tier, t])) }
}
