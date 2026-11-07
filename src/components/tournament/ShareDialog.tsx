import { Eye, PenLine, Radio, Tv, UserPlus, X } from 'lucide-react'
import { useState } from 'react'
import type { Tournament } from '@/core/tournament'
import { MAX_EDITORS, editorLink, obsLink, viewerLink } from '@/services/tournamentSync'
import { useLiveStatus, useShares } from '@/store/shareStore'
import { useT } from '@/i18n'
import { Button } from '../ui/Button'
import { CopyButton } from '../ui/CopyButton'
import { ConfirmDialog, Dialog } from '../ui/Dialog'
import { Input, Label } from '../ui/Field'
import { LiveStatusBadge, RoleBadge } from './LiveBadges'

function LinkRow({ icon, title, desc, url, hint }: { icon: React.ReactNode; title: string; desc: string; url: string; hint?: string }) {
  const t = useT()
  return (
    <div className="rounded-2xl border border-border bg-surface-2/50 p-3.5">
      <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
        <span className="text-accent [&_svg]:size-4">{icon}</span>
        {title}
      </div>
      <p className="mb-2.5 text-xs leading-relaxed text-muted">{desc}</p>
      <div className="flex items-center gap-2">
        <Input readOnly dir="ltr" value={url} aria-label={title} onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 font-mono text-[11px]" />
        <CopyButton text={url} label={t('share.copy')} showLabel size="sm" />
      </div>
      {hint && <p className="ltr mt-2 text-[11px] text-subtle">{hint}</p>}
    </div>
  )
}

/** Host dashboard: go live, copy the viewer / editor / OBS links, manage editor tokens. */
export function ShareDialog({ tournament, open, onClose }: { tournament: Tournament; open: boolean; onClose: () => void }) {
  const t = useT()
  const record = useShares((s) => s.shares[tournament.id])
  const { startHosting, addEditor, revokeEditor, stop } = useShares()
  const info = useLiveStatus((s) => s.info[tournament.id])
  const [name, setName] = useState('')
  const [confirmStop, setConfirmStop] = useState(false)
  const [revoking, setRevoking] = useState<{ id: string; label: string } | null>(null)
  const isHost = record?.role === 'host'

  return (
    <>
    <Dialog
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2.5">
          {t('share.title')}
          {record && <RoleBadge role={record.role} />}
        </span>
      }
      description={t('share.desc')}
      className="max-w-2xl"
      footer={
        <>
          {record && isHost && (
            <Button variant="ghost" className="me-auto hover:text-danger" onClick={() => setConfirmStop(true)}>
              {t('share.stop')}
            </Button>
          )}
          <Button variant="primary" onClick={onClose}>
            {t('common.close')}
          </Button>
        </>
      }
    >
      {!record ? (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-muted">{t('share.startDesc')}</p>
          <Button
            variant="primary"
            size="lg"
            onClick={async () => {
              await startHosting(tournament.id)
            }}
          >
            <Radio />
            {t('share.start')}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <LiveStatusBadge status={info?.status ?? 'connecting'} lastSync={info?.lastSync} />
            {info?.publishError && <span className="text-xs text-warning">{t('live.publishError')}</span>}
          </div>

          {isHost ? (
            <>
              <LinkRow icon={<Eye />} title={t('share.viewer')} desc={t('share.viewerDesc')} url={viewerLink(record.share)} />
              <LinkRow icon={<Tv />} title={t('share.obs')} desc={t('share.obsDesc')} url={obsLink(record.share)} hint={t('share.obsOptions')} />

              <div className="rounded-2xl border border-border bg-surface-2/50 p-3.5">
                <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
                  <PenLine className="size-4 text-accent" />
                  {t('share.editor')}
                </div>
                <p className="mb-3 text-xs leading-relaxed text-muted">{t('share.editorDesc')}</p>
                {record.editors.length === 0 ? (
                  <p className="mb-3 text-xs text-subtle">{t('share.noEditors')}</p>
                ) : (
                  <ul className="mb-3 space-y-2">
                    {record.editors.map((e) => (
                      <li key={e.id} className="flex items-center gap-2 rounded-xl border border-border bg-surface px-2.5 py-2">
                        <RoleBadge role="editor" />
                        <span className="min-w-0 flex-1 truncate text-sm">{e.label}</span>
                        <CopyButton text={editorLink(record.share, e.keys)} label={t('share.copy')} showLabel size="sm" />
                        <Button size="icon-sm" variant="ghost" aria-label={`${t('share.revoke')}: ${e.label}`} title={t('share.revoke')} className="hover:text-danger" onClick={() => setRevoking({ id: e.id, label: e.label })}>
                          <X />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                {record.editors.length < MAX_EDITORS ? (
                  <form
                    className="flex items-end gap-2"
                    onSubmit={async (e) => {
                      e.preventDefault()
                      const grant = await addEditor(tournament.id, name)
                      if (grant) setName('')
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <Label htmlFor="editor-name">{t('share.editorName')}</Label>
                      <Input id="editor-name" value={name} maxLength={30} onChange={(e) => setName(e.target.value)} placeholder={t('share.editorName')} />
                    </div>
                    <Button type="submit">
                      <UserPlus />
                      {t('share.addEditor')}
                    </Button>
                  </form>
                ) : (
                  <p className="text-xs text-subtle">{t('share.editorLimit', { n: MAX_EDITORS })}</p>
                )}
              </div>
            </>
          ) : (
            <>
              <LinkRow icon={<Eye />} title={t('share.viewer')} desc={t('share.viewerDesc')} url={viewerLink(record.share)} />
              <p className="text-sm text-muted">{t('role.editorHint')}</p>
              <Button
                variant="ghost"
                className="hover:text-danger"
                onClick={() => {
                  stop(tournament.id)
                  onClose()
                }}
              >
                {t('share.stop')}
              </Button>
            </>
          )}
          <p className="text-[11px] leading-relaxed text-subtle">{t('share.limits')}</p>
        </div>
      )}

    </Dialog>
      <ConfirmDialog
        open={confirmStop}
        onClose={() => setConfirmStop(false)}
        title={t('share.stop')}
        description={t('share.stopConfirm')}
        confirmLabel={t('share.stop')}
        onConfirm={() => stop(tournament.id)}
      />
      <ConfirmDialog
        open={!!revoking}
        onClose={() => setRevoking(null)}
        title={t('share.revoke')}
        description={revoking ? t('share.revokeConfirm', { name: revoking.label }) : ''}
        confirmLabel={t('share.revoke')}
        onConfirm={() => revoking && revokeEditor(tournament.id, revoking.id)}
      />
    </>
  )
}
