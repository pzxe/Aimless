import { ArrowRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CameraScene } from '@/components/tppfpp/PerspectiveStage'
import { useT } from '@/i18n'
import type { Perspective } from '@/services/tppFppEngine'

/** Dashboard teaser for the TPP ⇄ FPP lab. The little camera keeps switching view, as a hint of what the page does. */
export function PerspectiveTeaser() {
  const t = useT()
  const [view, setView] = useState<Perspective>('tpp')
  useEffect(() => {
    const id = window.setInterval(() => setView((v) => (v === 'tpp' ? 'fpp' : 'tpp')), 2600)
    return () => clearInterval(id)
  }, [])
  return (
    <Link
      to="/perspective"
      className="hud group grid items-center gap-4 p-4 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 sm:grid-cols-[minmax(0,1fr)_200px] sm:p-5"
    >
      <div className="relative z-10 min-w-0">
        <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold tracking-[0.18em] text-accent uppercase">v2.5.4</span>
        <h2 className="display mt-2 text-lg">{t('tpp.dash.title')}</h2>
        <p className="mt-1 max-w-md text-sm text-muted">{t('tpp.dash.desc')}</p>
        <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-accent">
          {t('tpp.dash.open')}
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
        </span>
      </div>
      <div className="relative z-10 hidden rounded-xl border border-border bg-bg/60 p-1.5 sm:block" aria-hidden="true">
        <CameraScene active={view} fov={{ tpp: 96, fpp: 74 }} />
      </div>
    </Link>
  )
}
