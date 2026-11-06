import { History as HistoryIcon, RotateCcw, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { HistoryRow } from '@/components/dashboard/HistoryRow'
import { EmptyState, PageHeader } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/Dialog'
import { useLoadIntoConverter } from '@/hooks/useLoadIntoConverter'
import { useT } from '@/i18n'
import { useHistory } from '@/store/historyStore'

export default function HistoryPage() {
  const t = useT()
  const entries = useHistory((s) => s.entries)
  const remove = useHistory((s) => s.remove)
  const clear = useHistory((s) => s.clear)
  const { fromHistory } = useLoadIntoConverter()
  const [confirm, setConfirm] = useState(false)

  return (
    <>
      <PageHeader
        title={t('history.title')}
        description={t('history.subtitle')}
        actions={
          <Button variant="danger" disabled={entries.length === 0} onClick={() => setConfirm(true)}>
            <Trash2 />
            {t('history.clear')}
          </Button>
        }
      />
      {entries.length === 0 ? (
        <EmptyState icon={<HistoryIcon />} title={t('history.empty')} hint={t('dashboard.recentEmpty')} />
      ) : (
        <Card className="p-2">
          {entries.map((e) => (
            <HistoryRow
              key={e.id}
              entry={e}
              actions={
                <div className="flex shrink-0 items-center">
                  <Button variant="ghost" size="sm" onClick={() => fromHistory(e)}>
                    <RotateCcw />
                    <span className="hidden sm:inline">{t('history.reuse')}</span>
                  </Button>
                  <Button variant="ghost" size="icon-sm" aria-label={t('history.remove')} title={t('history.remove')} onClick={() => remove(e.id)}>
                    <X />
                  </Button>
                </div>
              }
            />
          ))}
        </Card>
      )}
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title={t('history.clear')}
        description={t('history.clearConfirm')}
        confirmLabel={t('history.clear')}
        onConfirm={() => {
          clear()
          toast.success(t('history.cleared'))
        }}
      />
    </>
  )
}
