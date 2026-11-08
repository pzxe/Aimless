import { CheckCircle2, ExternalLink, MessageSquarePlus, Send } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { FieldError, Input, Label } from '@/components/ui/Field'
import { Segmented } from '@/components/ui/Segmented'
import { useT, type TranslationKey } from '@/i18n'
import {
  FEEDBACK_LIMITS,
  isDirectFeedback,
  submitFeedback,
  validateFeedback,
  type FeedbackError,
  type FeedbackMeta,
  type FeedbackType,
} from '@/services/feedback'
import { useSettings } from '@/store/settingsStore'
import { copyText } from '@/utils/clipboard'
import { isDesktopApp } from '@/utils/platform'

declare const __APP_VERSION__: string

/** The pause between two submissions from the same app, so the form cannot be used to flood the issue tracker. */
const COOLDOWN_MS = 30_000

/** A feedback form that files a GitHub issue (directly through the project's proxy, or via a pre-filled issue page). */
export function FeedbackCard() {
  const t = useT()
  const language = useSettings((s) => s.language)
  const direct = isDirectFeedback()
  const [type, setType] = useState<FeedbackType>('bug')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [system, setSystem] = useState(true)
  const [busy, setBusy] = useState(false)
  const [touched, setTouched] = useState(false)
  const [error, setError] = useState<FeedbackError | null>(null)
  const [done, setDone] = useState<{ number?: number; url?: string; mode: 'direct' | 'github-page' } | null>(null)
  const last = useRef(0)

  const issue = validateFeedback({ type, title, body })
  // each field reports its own problem, so an empty form shows both messages at once
  const titleIssue = validateFeedback({ type, title, body: 'x'.repeat(FEEDBACK_LIMITS.bodyMin) })
  const bodyIssue = validateFeedback({ type, title: 'x'.repeat(FEEDBACK_LIMITS.titleMin), body })
  const say = (i: typeof issue) => (i ? t(`feedback.invalid.${i}` as TranslationKey, { min: i.startsWith('title') ? FEEDBACK_LIMITS.titleMin : FEEDBACK_LIMITS.bodyMin, max: i.startsWith('title') ? FEEDBACK_LIMITS.titleMax : FEEDBACK_LIMITS.bodyMax }) : null)
  const meta = (): FeedbackMeta | null =>
    system ? { version: __APP_VERSION__, platform: `${isDesktopApp ? 'Aimless desktop, ' : 'Web, '}${navigator.platform || 'unknown'}`, language } : null

  const submit = async () => {
    setTouched(true)
    if (issue || busy) return
    if (Date.now() - last.current < COOLDOWN_MS) {
      setError('rate-limited')
      return
    }
    setBusy(true)
    setError(null)
    const input = { type, title, body }
    const r = await submitFeedback(input, meta())
    setBusy(false)
    if (!r.ok) {
      setError(r.error)
      return
    }
    last.current = Date.now()
    setDone(r.mode === 'direct' ? { mode: 'direct', number: r.number, url: r.url } : { mode: 'github-page', url: r.url })
    if (r.mode === 'direct') {
      toast.success(t('feedback.success'))
    } else {
      // no proxy in this build: keep the text safe on the clipboard, then open the pre-filled issue in the browser
      await copyText(`${title.trim()}\n\n${body.trim()}`, { success: t('feedback.copied'), failure: t('common.copyFailed') })
      window.open(r.url, '_blank', 'noopener,noreferrer')
    }
    setTitle('')
    setBody('')
    setTouched(false)
  }

  const errorText = (code: FeedbackError) => t(`feedback.error.${code}` as TranslationKey)

  return (
    <Card>
      <CardHeader title={t('feedback.title')} description={t('feedback.desc')} icon={<MessageSquarePlus />} />
      <CardBody className="space-y-3">
        {done ? (
          <div role="status" className="flex flex-col items-start gap-3 rounded-2xl border border-success/30 bg-success/10 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-success">
              <CheckCircle2 className="size-4" />
              {done.mode === 'direct' ? t('feedback.success') : t('feedback.opened')}
            </p>
            <div className="flex flex-wrap gap-2">
              {done.url && (
                <a href={done.url} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-border bg-surface-2/80 px-3 text-xs font-medium hover:bg-surface-3 [&_svg]:size-4">
                  <ExternalLink /> {done.mode === 'direct' && done.number ? t('feedback.viewIssue', { n: done.number }) : t('feedback.viewOnGithub')}
                </a>
              )}
              <Button size="sm" variant="ghost" onClick={() => setDone(null)}>
                {t('feedback.another')}
              </Button>
            </div>
          </div>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              void submit()
            }}
          >
            <Segmented<FeedbackType>
              label={t('feedback.type')}
              value={type}
              onChange={setType}
              options={[
                { value: 'bug', label: t('feedback.type.bug') },
                { value: 'feature', label: t('feedback.type.feature') },
                { value: 'other', label: t('feedback.type.other') },
              ]}
            />
            <div>
              <Label htmlFor="fb-title" hint={`${title.trim().length}/${FEEDBACK_LIMITS.titleMax}`}>{t('feedback.titleLabel')}</Label>
              <Input id="fb-title" value={title} maxLength={FEEDBACK_LIMITS.titleMax + 20} onChange={(e) => setTitle(e.target.value)} placeholder={t('feedback.titlePlaceholder')} aria-invalid={touched && titleIssue ? true : undefined} />
              {touched && titleIssue && <FieldError>{say(titleIssue)}</FieldError>}
            </div>
            <div>
              <Label htmlFor="fb-body" hint={`${body.trim().length}/${FEEDBACK_LIMITS.bodyMax}`}>{t('feedback.bodyLabel')}</Label>
              <textarea
                id="fb-body"
                value={body}
                rows={5}
                onChange={(e) => setBody(e.target.value)}
                placeholder={t('feedback.bodyPlaceholder')}
                aria-invalid={touched && bodyIssue ? true : undefined}
                className="w-full resize-y rounded-xl border border-border bg-surface-2/70 px-3 py-2.5 text-sm text-text transition-[border-color,box-shadow] duration-150 outline-none placeholder:text-subtle hover:border-border-strong focus:border-accent focus:ring-3 focus:ring-ring aria-invalid:border-danger"
              />
              {touched && bodyIssue && <FieldError>{say(bodyIssue)}</FieldError>}
            </div>
            <label className="flex cursor-pointer items-start gap-2.5 text-xs text-muted">
              <input type="checkbox" checked={system} onChange={(e) => setSystem(e.target.checked)} className="mt-0.5 size-4 accent-[var(--c-accent)]" />
              <span>{t('feedback.includeSystem')}</span>
            </label>
            {error && <FieldError>{errorText(error)}</FieldError>}
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" variant="primary" disabled={busy} aria-busy={busy}>
                <Send /> {busy ? t('feedback.sending') : t('feedback.submit')}
              </Button>
              <p className="min-w-0 flex-1 text-xs text-subtle">{direct ? t('feedback.privacy.direct') : t('feedback.privacy.page')}</p>
            </div>
          </form>
        )}
      </CardBody>
    </Card>
  )
}
