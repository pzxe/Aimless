import { ArrowRight, ExternalLink, Newspaper } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CategoryBadge } from '@/components/UpdateNotificationBell'
import { NEWS } from '@/data/news'
import { useT, type TranslationKey } from '@/i18n'
import { classifyVersion, fetchLatestRelease, type ReleaseInfo } from '@/services/githubReleaseChecker'

/**
 * "Latest updates & news": the newest release straight from GitHub (title, category, highlights), then a gallery of the
 * recent features with their screenshots. The gallery is bundled, so it still shows when the release check is offline.
 */
export function NewsFeed() {
  const t = useT()
  const [release, setRelease] = useState<ReleaseInfo | null>(null)
  useEffect(() => {
    let alive = true
    // a short delay keeps the first paint free of network work; the result is cached for 30 minutes
    const id = window.setTimeout(() => {
      void fetchLatestRelease().then((r) => alive && setRelease(r.info))
    }, 800)
    return () => {
      alive = false
      clearTimeout(id)
    }
  }, [])

  return (
    <section aria-labelledby="news-h" className="space-y-3">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-xl border border-accent-line bg-accent-soft text-accent [&_svg]:size-4">
          <Newspaper />
        </span>
        <h2 id="news-h" className="display text-lg">{t('dashboard.news.title')}</h2>
      </div>

      {release && (
        <div className="hud p-4 sm:p-5">
          <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-semibold tracking-[0.2em] text-accent uppercase">{t('dashboard.news.latest')}</span>
                <span className="num display text-lg" dir="ltr">{release.tag}</span>
                <CategoryBadge category={classifyVersion(release.version)} />
              </div>
              <p className="mt-1 text-sm font-semibold">{release.title}</p>
              {release.highlights.length > 0 && (
                <ul className="mt-2 space-y-1 text-[13px] leading-snug text-muted">
                  {release.highlights.slice(0, 3).map((h) => (
                    <li key={h} className="flex gap-2"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent-fill" aria-hidden="true" />{h}</li>
                  ))}
                </ul>
              )}
            </div>
            <a
              href={release.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 shrink-0 items-center gap-1.5 self-start rounded-xl border border-border bg-surface-2/80 px-3 text-xs font-medium whitespace-nowrap transition-colors hover:bg-surface-3 [&_svg]:size-4"
            >
              <ExternalLink /> {t('dashboard.news.viewRelease')}
            </a>
          </div>
        </div>
      )}

      <div className="scrollbar-thin -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2">
        {NEWS.map((n) => {
          const title = t(`news.${n.id}.title` as TranslationKey)
          const body = (
            <>
              <div className="relative aspect-[16/9] overflow-hidden bg-surface-2">
                <img
                  src={`${import.meta.env.BASE_URL}news/${n.image}`}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
                />
                <span className="num absolute start-2 top-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur" dir="ltr">v{n.version}</span>
              </div>
              <div className="p-3.5">
                <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                  {title}
                  {n.to && <ArrowRight className="size-3.5 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-accent rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-muted">{t(`news.${n.id}.desc` as TranslationKey)}</p>
              </div>
            </>
          )
          const cls = 'group card block w-[17.5rem] shrink-0 snap-start overflow-hidden transition-[transform,border-color,box-shadow] duration-200 sm:w-[19rem]'
          return n.to ? (
            <Link key={n.id} to={n.to} aria-label={title} className={`${cls} hover:-translate-y-0.5 hover:border-accent-line hover:shadow-pop focus-visible:-translate-y-0.5`}>
              {body}
            </Link>
          ) : (
            <div key={n.id} className={cls}>
              {body}
            </div>
          )
        })}
      </div>
    </section>
  )
}
