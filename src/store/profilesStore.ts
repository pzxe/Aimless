import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createId } from '@/utils/id'
import { sanitizeProfile } from '@/utils/importExport'
import { persistStorage, STORAGE_KEYS } from '@/utils/storage'
import type { Profile, ProfileDraft } from './types'

interface ProfilesState {
  profiles: Profile[]
  create: (draft: ProfileDraft) => Profile
  update: (id: string, patch: Partial<ProfileDraft>) => void
  remove: (id: string) => void
  duplicate: (id: string, copySuffix: string) => Profile | undefined
  toggleFavorite: (id: string) => void
  /** Add already-sanitized profiles, skipping exact duplicates. Returns how many were added. */
  importMany: (drafts: ProfileDraft[]) => number
  clear: () => void
}

const sameSetting = (a: ProfileDraft, b: ProfileDraft) =>
  a.name === b.name && a.gameId === b.gameId && a.dpi === b.dpi && a.sensitivity === b.sensitivity

export const useProfiles = create<ProfilesState>()(
  persist(
    (set, get) => ({
      profiles: [],
      create: (draft) => {
        const now = Date.now()
        const profile: Profile = { ...draft, id: createId(), createdAt: now, updatedAt: now }
        set((s) => ({ profiles: [profile, ...s.profiles] }))
        return profile
      },
      update: (id, patch) =>
        set((s) => ({ profiles: s.profiles.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p)) })),
      remove: (id) => set((s) => ({ profiles: s.profiles.filter((p) => p.id !== id) })),
      duplicate: (id, copySuffix) => {
        const original = get().profiles.find((p) => p.id === id)
        if (!original) return undefined
        const { id: _id, createdAt: _c, updatedAt: _u, ...draft } = original
        return get().create({ ...draft, name: `${original.name} ${copySuffix}`.slice(0, 80), favorite: false })
      },
      toggleFavorite: (id) =>
        set((s) => ({ profiles: s.profiles.map((p) => (p.id === id ? { ...p, favorite: !p.favorite } : p)) })),
      importMany: (drafts) => {
        const existing = get().profiles
        const fresh = drafts.filter((d) => !existing.some((e) => sameSetting(e, d)))
        const now = Date.now()
        const created = fresh.map((d, i) => ({ ...d, id: createId(), createdAt: now + i, updatedAt: now + i }))
        set((s) => ({ profiles: [...created, ...s.profiles] }))
        return created.length
      },
      clear: () => set({ profiles: [] }),
    }),
    {
      name: STORAGE_KEYS.profiles,
      storage: persistStorage,
      version: 1,
      merge: (persisted, current) => {
        const raw = (persisted as { profiles?: unknown })?.profiles
        const profiles: Profile[] = []
        if (Array.isArray(raw)) {
          for (const item of raw) {
            const draft = sanitizeProfile(item)
            if (!draft) continue
            const r = item as Partial<Profile>
            profiles.push({
              ...draft,
              id: typeof r.id === 'string' && r.id.length <= 64 ? r.id : createId(),
              createdAt: typeof r.createdAt === 'number' ? r.createdAt : Date.now(),
              updatedAt: typeof r.updatedAt === 'number' ? r.updatedAt : Date.now(),
            })
          }
        }
        return { ...current, profiles }
      },
    },
  ),
)
