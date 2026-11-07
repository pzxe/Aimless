import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { persistStorage, STORAGE_KEYS } from '@/utils/storage'

interface RankSettingsState {
  /** Optional free HenrikDev community key (`HDEV-...`) for Valorant live rank. Stored only on this device. */
  henrikKey: string
  setHenrikKey: (key: string) => void
}

export const useRankSettings = create<RankSettingsState>()(
  persist(
    (set) => ({
      henrikKey: '',
      setHenrikKey: (key) => set({ henrikKey: key.trim().slice(0, 200) }),
    }),
    { name: STORAGE_KEYS.rankSettings, storage: persistStorage, version: 1, partialize: (s) => ({ henrikKey: s.henrikKey }) as RankSettingsState },
  ),
)
