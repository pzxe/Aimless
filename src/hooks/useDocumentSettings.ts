import { useEffect, useState } from 'react'
import { translate } from '@/i18n'
import { useSettings } from '@/store/settingsStore'
import { LANGUAGES } from '@/store/types'
import { installClickSound } from '@/utils/sound'

/** Keeps <html> lang/dir/theme/accent/density/motion in sync with settings. Returns the resolved theme. */
export function useDocumentSettings(): 'dark' | 'light' {
  const theme = useSettings((s) => s.theme)
  const language = useSettings((s) => s.language)
  const accent = useSettings((s) => s.accent)
  const density = useSettings((s) => s.density)
  const motion = useSettings((s) => s.motion)
  const sound = useSettings((s) => s.sound)
  const [systemDark, setSystemDark] = useState(() =>
    typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)').matches : true,
  )

  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const resolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', resolved === 'dark')
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#09090b' : '#f4f4f6')
  }, [resolved])

  useEffect(() => {
    const root = document.documentElement
    root.dataset.accent = accent
    root.dataset.density = density
    root.dataset.motion = motion
  }, [accent, density, motion])

  useEffect(() => {
    const root = document.documentElement
    root.lang = language
    root.dir = LANGUAGES.find((l) => l.code === language)?.dir ?? 'ltr'
    document.title = `${translate(language, 'app.name')} · ${translate(language, 'app.tagline')}`
  }, [language])

  useEffect(() => (sound ? installClickSound() : undefined), [sound])

  return resolved
}
