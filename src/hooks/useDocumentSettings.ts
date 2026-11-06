import { useEffect, useState } from 'react'
import { translate } from '@/i18n'
import { useSettings } from '@/store/settingsStore'

/** Keeps <html> lang/dir/theme in sync with settings. Returns the resolved theme. */
export function useDocumentSettings(): 'dark' | 'light' {
  const theme = useSettings((s) => s.theme)
  const language = useSettings((s) => s.language)
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
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#0a0d13' : '#f5f6fa')
  }, [resolved])

  useEffect(() => {
    const root = document.documentElement
    root.lang = language
    root.dir = language === 'ar' ? 'rtl' : 'ltr'
    document.title = translate(language, 'app.name')
  }, [language])

  return resolved
}
