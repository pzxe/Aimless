import { BarChart3 } from 'lucide-react'
import { useState } from 'react'
import { useT } from '@/i18n'
import { isOptedOut, setOptOut, telemetryConfigured } from '@/services/telemetry'

/**
 * The browser version's analytics switch (the desktop app has no analytics, so it never shows this). One click turns
 * analytics off and deletes the visitor cookie; one more turns them back on.
 */
export function AnalyticsChoice({ className = '' }: { className?: string }) {
  const t = useT()
  const [off, setOff] = useState(isOptedOut)
  if (!telemetryConfigured) return null
  return (
    <button
      type="button"
      data-no-track
      onClick={() => {
        setOptOut(!off)
        setOff(!off)
      }}
      className={`flex items-center gap-1.5 text-start text-[11px] text-subtle transition-colors hover:text-text ${className}`}
    >
      <BarChart3 className="size-3.5" />
      {off ? t('web.analytics.off') : t('web.analytics.on')}
    </button>
  )
}
