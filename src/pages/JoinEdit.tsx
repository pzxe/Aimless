import { Loader2, PenLine, TriangleAlert } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { useT } from '@/i18n'
import { NtfyTransport, SyncSession, parseEditorId } from '@/services/tournamentSync'
import { useShares } from '@/store/shareStore'
import { useTournaments } from '@/store/tournamentStore'

const TIMEOUT_MS = 15000

/** `/edit/:id`: join a shared tournament as an editor with the key in the link, then open it like any local tournament. */
export default function JoinEditPage() {
  const t = useT()
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const parsed = useMemo(() => parseEditorId(id), [id])
  const [failed, setFailed] = useState(!parsed)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!parsed) return
    setFailed(false)
    const topic = parsed.share.topic
    const existing = Object.values(useShares.getState().shares).find((r) => r.share.topic === topic)
    if (existing && useTournaments.getState().tournaments.some((x) => x.id === existing.tournamentId)) {
      navigate(`/tournaments/${existing.tournamentId}`, { replace: true })
      return
    }
    let done = false
    const session = new SyncSession({
      transport: new NtfyTransport(),
      share: parsed.share,
      role: 'guest',
      onState: (state) => {
        if (done) return
        done = true
        session.stop()
        // Keep an existing local tournament untouched: the shared one always gets its own id here.
        const local = { ...state.tournament, id: `live-${topic.slice(3, 11)}` }
        useTournaments.getState().applyRemote(local)
        useShares.getState().joinAsEditor(local.id, parsed.share, parsed.keys)
        toast.success(t('live.join.ok', { name: local.name }))
        navigate(`/tournaments/${local.id}`, { replace: true })
      },
    })
    session.start()
    const timer = setTimeout(() => {
      if (done) return
      done = true
      session.stop()
      setFailed(true)
    }, TIMEOUT_MS)
    return () => {
      done = true
      clearTimeout(timer)
      session.stop()
    }
  }, [parsed, attempt, navigate, t])

  return (
    <div className="grid min-h-dvh place-items-center p-6 text-center">
      <div className="max-w-sm">
        <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-surface-2 text-accent">
          {failed ? <TriangleAlert className="size-6" /> : <PenLine className="size-6" />}
        </span>
        {failed ? (
          <>
            <p className="text-sm text-muted">{parsed ? t('live.join.failed') : t('live.invalid')}</p>
            {parsed && (
              <Button className="mt-4" variant="primary" onClick={() => setAttempt((n) => n + 1)}>
                {t('live.join.retry')}
              </Button>
            )}
          </>
        ) : (
          <>
            <h1 className="display text-2xl">{t('live.join.title')}</h1>
            <Loader2 className="mx-auto mt-4 size-5 animate-spin text-muted" />
          </>
        )}
      </div>
    </div>
  )
}
