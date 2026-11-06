import { lazy, Suspense } from 'react'
import { HashRouter, Link, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { useDocumentSettings } from '@/hooks/useDocumentSettings'
import { useT } from '@/i18n'
import { useSettings } from '@/store/settingsStore'
import ConverterPage from '@/pages/Converter'
import DashboardPage from '@/pages/Dashboard'
import LandingPage from '@/pages/Landing'

// The entry views ship in the main bundle; the rest load on demand.
const ComparePage = lazy(() => import('@/pages/Compare'))
const ProfilesPage = lazy(() => import('@/pages/Profiles'))
const HistoryPage = lazy(() => import('@/pages/History'))
const ToolsPage = lazy(() => import('@/pages/Tools'))
const GamesPage = lazy(() => import('@/pages/Games'))
const SettingsPage = lazy(() => import('@/pages/Settings'))
const MousepadPage = lazy(() => import('@/pages/Mousepad'))
const TournamentsPage = lazy(() => import('@/pages/Tournaments'))
const TournamentViewPage = lazy(() => import('@/pages/TournamentView'))

const STARTUP_PATHS = { landing: '/welcome', dashboard: '/dashboard', converter: '/converter', tournaments: '/tournaments' } as const

function StartupRedirect() {
  const view = useSettings((s) => s.startupView)
  return <Navigate to={STARTUP_PATHS[view]} replace />
}

function NotFound() {
  const t = useT()
  return (
    <div className="py-24 text-center">
      <p className="display text-7xl text-subtle">404</p>
      <h1 className="mt-3 text-lg font-semibold">{t('notFound.title')}</h1>
      <Link to="/dashboard" className="mt-4 inline-block text-sm text-accent hover:underline">
        {t('notFound.back')}
      </Link>
    </div>
  )
}

function Workspace({ resolvedTheme }: { resolvedTheme: 'dark' | 'light' }) {
  return (
    <AppShell resolvedTheme={resolvedTheme}>
      <Suspense fallback={<div className="h-64" aria-busy="true" />}>
        <Outlet />
      </Suspense>
    </AppShell>
  )
}

export default function App() {
  const resolvedTheme = useDocumentSettings()
  const language = useSettings((s) => s.language)
  const rtl = language === 'ar'
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<StartupRedirect />} />
        <Route path="/welcome" element={<LandingPage resolvedTheme={resolvedTheme} />} />
        <Route element={<Workspace resolvedTheme={resolvedTheme} />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/converter" element={<ConverterPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/tournaments" element={<TournamentsPage />} />
          <Route path="/tournaments/:id" element={<TournamentViewPage />} />
          <Route path="/mousepad" element={<MousepadPage />} />
          <Route path="/profiles" element={<ProfilesPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/tools" element={<ToolsPage />} />
          <Route path="/games" element={<GamesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      <Toaster
        theme={resolvedTheme}
        position={rtl ? 'bottom-left' : 'bottom-right'}
        dir={rtl ? 'rtl' : 'ltr'}
        toastOptions={{
          classNames: {
            toast: '!bg-surface !border-border !text-text !shadow-pop !rounded-2xl',
            description: '!text-muted ltr num',
          },
        }}
      />
    </HashRouter>
  )
}
