import { MonitorDown } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { useT } from '@/i18n'
import { desktop, type ShortcutStatus } from '@/utils/desktop'

const PROMPTED_KEY = 'sc.desktop.shortcutPrompted'

async function createShortcut(t: ReturnType<typeof useT>) {
  const ok = await desktop?.shortcut.create().catch(() => false)
  if (ok) toast.success(t('settings.shortcutDone'))
  else toast.error(t('settings.shortcutFailed'))
  return Boolean(ok)
}

/** The shortcut status, or null on the web / non-Windows desktop. */
export function useShortcutStatus() {
  const [status, setStatus] = useState<ShortcutStatus | null>(null)
  const refresh = () => {
    desktop?.shortcut
      .status()
      .then((s) => setStatus(s.supported ? s : null))
      .catch(() => setStatus(null))
  }
  useEffect(refresh, [])
  return { status, refresh }
}

/** Settings control: create (or recreate) the desktop shortcut. */
export function DesktopShortcutButton() {
  const t = useT()
  const { status, refresh } = useShortcutStatus()
  if (!status) return null
  return (
    <div className="flex flex-col items-start gap-1.5 md:items-end">
      <Button
        onClick={async () => {
          await createShortcut(t)
          refresh()
        }}
      >
        <MonitorDown />
        {status.exists ? t('settings.shortcutRecreate') : t('settings.shortcutCreate')}
      </Button>
      {(status.exists || status.portable) && (
        <p className="max-w-xs text-xs text-subtle md:text-end">
          {status.exists ? t('settings.shortcutExists') : ''} {status.portable ? t('settings.shortcutPortableNote') : ''}
        </p>
      )}
    </div>
  )
}

/** First run of the portable .exe without a desktop shortcut: offer one, once. */
export function DesktopShortcutPrompt() {
  const t = useT()
  useEffect(() => {
    if (!desktop) return
    let prompted = false
    try {
      prompted = localStorage.getItem(PROMPTED_KEY) === '1'
    } catch {
      prompted = true
    }
    if (prompted) return
    desktop.shortcut
      .status()
      .then((s) => {
        if (!s.supported || s.exists || !s.portable) return
        try {
          localStorage.setItem(PROMPTED_KEY, '1')
        } catch {
          /* ignore */
        }
        toast(t('settings.shortcutPrompt'), {
          duration: 12000,
          action: { label: t('settings.shortcutCreate'), onClick: () => void createShortcut(t) },
        })
      })
      .catch(() => {})
    // Once per launch at most.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}
