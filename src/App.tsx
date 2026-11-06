import { lazy, Suspense } from 'react'
import { HashRouter, Link, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { useDocumentSettings } from '@/hooks/useDocumentSettings'
import { useT } from '@/i18n'
import { useSettings } from '@/store/settingsStore'
import DashboardPage from '@/pages/Dashboard'
import ConverterPage from '@/pages/Converter'

// The two most used pages ship in the main bundle; the rest load on demand.
const ComparePage = lazy(() => import('@/pages/Compare'))
const ProfilesPage = lazy(() => import('@/pages/Profiles'))
const HistoryPage = lazy(() => import('@/pages/History'))
const ToolsPage = lazy(() => import('@/pages/Tools'))
const GamesPage = lazy(() => import('@/pages/Games'))
const SettingsPage = lazy(() => import('@/pages/Settings'))

function NotFound() {
  const t = useT()
  return (
    <div className="py-24 text-center">
      <p className="ltr num text-5xl font-semibold text-subtle">404</p>
      <h1 className="mt-3 text-lg font-semibold">{t('notFound.title')}</h1>
      <Link to="/" className="mt-4 inline-block text-sm text-accent hover:underline">
        {t('notFound.back')}
      </Link>
    </div>
  )
}

export default function App() {
  const resolvedTheme = useDocumentSettings()
  const language = useSettings((s) => s.language)
  return (
    <HashRouter>
      <AppShell resolvedTheme={resolvedTheme}>
        <Suspense fallback={<div className="h-64" aria-busy="true" />}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/converter" element={<ConverterPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/profiles" element={<ProfilesPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/tools" element={<ToolsPage />} />
            <Route path="/games" element={<GamesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </AppShell>
      <Toaster
        theme={resolvedTheme}
        position={language === 'ar' ? 'bottom-left' : 'bottom-right'}
        dir={language === 'ar' ? 'rtl' : 'ltr'}
        toastOptions={{
          classNames: {
            toast: '!bg-surface !border-border !text-text !shadow-pop !rounded-xl',
            description: '!text-muted ltr num',
          },
        }}
      />
    </HashRouter>
  )
}
