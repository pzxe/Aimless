import { Code2, ExternalLink } from 'lucide-react'
import type { ReactNode } from 'react'
import { DiscordMark, TwitchMark, XMark } from '@/components/layout/BrandMarks'
import { GitHubMark } from '@/components/layout/GitHubLink'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { useT, type TranslationKey } from '@/i18n'
import { copyText } from '@/utils/clipboard'
import { LINKS } from '@/utils/links'

const STACK: { name: string; href: string; color: string }[] = [
  { name: 'TypeScript', href: 'https://www.typescriptlang.org', color: '#3178c6' },
  { name: 'React 19', href: 'https://react.dev', color: '#61dafb' },
  { name: 'Electron', href: 'https://www.electronjs.org', color: '#47848f' },
  { name: 'Tailwind CSS 4', href: 'https://tailwindcss.com', color: '#38bdf8' },
  { name: 'Vite', href: 'https://vite.dev', color: '#a855f7' },
  { name: 'Zustand', href: 'https://github.com/pmndrs/zustand', color: '#e8a34a' },
  { name: 'Node.js', href: 'https://nodejs.org', color: '#5fa04e' },
  { name: 'Vitest', href: 'https://vitest.dev', color: '#6da13f' },
]

const tile =
  'group flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-surface-2/50 p-3 text-start transition-[border-color,background-color,transform] duration-150 hover:-translate-y-px hover:border-border-strong hover:bg-surface-2 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2'

function Tile({ icon, title, handle, hint, tint }: { icon: ReactNode; title: string; handle: string; hint: string; tint: string }) {
  return (
    <>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl text-white" style={{ background: tint }}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{title}</span>
        <span dir="ltr" className="block truncate text-start text-xs text-muted">
          {handle}
        </span>
        <span className="block truncate text-[11px] text-subtle">{hint}</span>
      </span>
    </>
  )
}

/** "Developer & Tech Stack": what Aimless is built with, and clickable ways to reach the developer. */
export function DeveloperCard() {
  const t = useT()
  const link = (href: string, icon: ReactNode, title: string, handle: string, hintKey: TranslationKey, tint: string) => (
    <a key={href} href={href} target="_blank" rel="noopener noreferrer" className={tile} aria-label={`${title} ${handle}`}>
      <Tile icon={icon} title={title} handle={handle} hint={t(hintKey)} tint={tint} />
      <ExternalLink className="size-4 shrink-0 text-subtle transition-colors group-hover:text-text" aria-hidden="true" />
    </a>
  )

  return (
    <Card>
      <CardHeader title={t('dev.title')} description={t('dev.intro')} icon={<Code2 />} />
      <CardBody className="space-y-5">
        <div>
          <h3 className="mb-2 text-xs font-medium text-muted">{t('dev.builtWith')}</h3>
          <ul className="flex flex-wrap gap-2">
            {STACK.map((s) => (
              <li key={s.name}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 items-center gap-2 rounded-full border border-border bg-surface-2/60 px-3 text-xs font-medium text-text transition-[border-color,transform] duration-150 hover:-translate-y-px hover:border-(--tint)"
                  style={{ ['--tint' as string]: s.color }}
                >
                  <span aria-hidden="true" className="size-2 rounded-full" style={{ background: s.color }} />
                  <span dir="ltr">{s.name}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-2 text-xs font-medium text-muted">{t('dev.connect')}</h3>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {link(LINKS.twitch, <TwitchMark className="size-5" />, 'Twitch', '1usl', 'dev.twitchHint', '#9146ff')}
            {link(LINKS.x, <XMark className="size-[18px]" />, 'X / Twitter', '@87lx', 'dev.xHint', '#14171a')}
            {/* Discord has no public profile URL for a username, so the card copies it and a second button opens Discord. */}
            <div className="flex min-w-0 items-stretch gap-1.5">
              <button
                type="button"
                className={`${tile} flex-1`}
                aria-label={`Discord ${LINKS.discordUser}: ${t('dev.discordHint')}`}
                onClick={() =>
                  void copyText(LINKS.discordUser, {
                    success: t('dev.discordCopied', { name: LINKS.discordUser }),
                    failure: t('common.copyFailed'),
                    secret: true,
                  })
                }
              >
                <Tile icon={<DiscordMark className="size-5" />} title="Discord" handle={LINKS.discordUser} hint={t('dev.discordHint')} tint="#5865f2" />
              </button>
              <a
                href={LINKS.discordApp}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('dev.discordOpen')}
                title={t('dev.discordOpen')}
                className="grid w-11 shrink-0 place-items-center rounded-2xl border border-border bg-surface-2/50 text-subtle transition-colors hover:border-border-strong hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <ExternalLink className="size-4" />
              </a>
            </div>
            {link(LINKS.github, <GitHubMark className="size-5" />, 'GitHub', 'pzxe', 'dev.githubHint', '#24292f')}
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
