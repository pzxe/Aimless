import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { isKnownGame } from '@/core/sensitivity'
import { persistStorage, STORAGE_KEYS } from '@/utils/storage'

/**
 * Converter form state. Numeric fields are kept as the text the user typed so that
 * partially typed values ("0.", "") are preserved; parsing happens in the hook.
 */
export interface ConverterForm {
  sourceGameId: string
  sourceSensitivity: string
  sourceDpi: string
  targetGameId: string
  targetDpi: string
  /** When true, target DPI follows source DPI. */
  linkDpi: boolean
  resolutionWidth: string
  resolutionHeight: string
  fov: string
}

interface ConverterState extends ConverterForm {
  setField: <K extends keyof ConverterForm>(key: K, value: ConverterForm[K]) => void
  load: (patch: Partial<ConverterForm>) => void
  swap: () => void
  reset: (defaultDpi: number) => void
}

export const initialForm = (dpi = 800): ConverterForm => ({
  sourceGameId: 'cs2',
  sourceSensitivity: '',
  sourceDpi: String(dpi),
  targetGameId: 'valorant',
  targetDpi: String(dpi),
  linkDpi: true,
  resolutionWidth: '1920',
  resolutionHeight: '1080',
  fov: '',
})

export const useConverter = create<ConverterState>()(
  persist(
    (set) => ({
      ...initialForm(),
      setField: (key, value) =>
        set((s) => {
          const patch: Partial<ConverterForm> = { [key]: value }
          if (key === 'sourceDpi' && s.linkDpi) patch.targetDpi = value as string
          if (key === 'targetDpi' && s.linkDpi && value !== s.sourceDpi) patch.linkDpi = false
          if (key === 'linkDpi' && value === true) patch.targetDpi = s.sourceDpi
          return patch
        }),
      load: (patch) => set(patch),
      swap: () =>
        set((s) => ({
          sourceGameId: s.targetGameId,
          targetGameId: s.sourceGameId,
          sourceDpi: s.targetDpi,
          targetDpi: s.sourceDpi,
        })),
      reset: (defaultDpi) => set(initialForm(defaultDpi)),
    }),
    {
      name: STORAGE_KEYS.converter,
      storage: persistStorage,
      version: 1,
      partialize: (s) => {
        const { setField: _a, load: _b, swap: _c, reset: _d, ...form } = s
        return form
      },
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<ConverterForm>
        const str = (v: unknown, fallback: string) => (typeof v === 'string' && v.length <= 32 ? v : fallback)
        return {
          ...current,
          sourceGameId: typeof p.sourceGameId === 'string' && isKnownGame(p.sourceGameId) ? p.sourceGameId : current.sourceGameId,
          targetGameId: typeof p.targetGameId === 'string' && isKnownGame(p.targetGameId) ? p.targetGameId : current.targetGameId,
          sourceSensitivity: str(p.sourceSensitivity, current.sourceSensitivity),
          sourceDpi: str(p.sourceDpi, current.sourceDpi),
          targetDpi: str(p.targetDpi, current.targetDpi),
          linkDpi: typeof p.linkDpi === 'boolean' ? p.linkDpi : current.linkDpi,
          resolutionWidth: str(p.resolutionWidth, current.resolutionWidth),
          resolutionHeight: str(p.resolutionHeight, current.resolutionHeight),
          fov: str(p.fov, current.fov),
        }
      },
    },
  ),
)
