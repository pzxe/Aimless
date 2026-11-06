import { ChevronDown, Monitor } from 'lucide-react'
import { useState } from 'react'
import { actualFov, getGame, isValidFov, isValidResolution, parseNumber } from '@/core/sensitivity'
import { useFormat } from '@/hooks/useFormat'
import { useT } from '@/i18n'
import { useConverter } from '@/store/converterStore'
import { useSettings } from '@/store/settingsStore'
import { cn } from '@/utils/cn'
import { NumberField } from '../ui/Field'

/** Optional resolution + FOV inputs for the source game, with the real FOV they produce. */
export function DisplaySettings() {
  const t = useT()
  const f = useFormat()
  const fovDisplay = useSettings((s) => s.fovDisplay)
  const { sourceGameId, resolutionWidth, resolutionHeight, fov, setField } = useConverter()
  const [open, setOpen] = useState(false)
  const game = getGame(sourceGameId)

  const w = parseNumber(resolutionWidth)
  const h = parseNumber(resolutionHeight)
  const fovValue = fov.trim() === '' ? game?.fov?.default : parseNumber(fov)
  const resOk = isValidResolution(w, h)
  const fovOk = fovValue !== undefined && isValidFov(fovValue)
  const real = resOk && fovOk && game?.fov ? actualFov(fovValue!, game.fov.type, w, h) : null

  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-xs font-medium text-muted transition-colors hover:text-text"
      >
        <Monitor className="size-3.5" />
        <span className="flex-1 text-start">{t('converter.advanced')}</span>
        <span className="ltr num text-subtle">
          {resOk ? `${w}×${h}` : ''}
          {fovOk ? ` · ${fovValue}°` : ''}
        </span>
        <ChevronDown className={cn('size-3.5 transition-transform duration-200', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-border px-3 pt-3 pb-3.5">
          <div className="grid grid-cols-3 gap-2">
            <NumberField
              label={t('common.width')}
              value={resolutionWidth}
              onValueChange={(v) => setField('resolutionWidth', v)}
              inputMode="numeric"
            />
            <NumberField
              label={t('common.height')}
              value={resolutionHeight}
              onValueChange={(v) => setField('resolutionHeight', v)}
              inputMode="numeric"
            />
            <NumberField
              label={t('common.fov')}
              value={fov}
              placeholder={game?.fov ? String(game.fov.default) : ''}
              onValueChange={(v) => setField('fov', v)}
              error={fov.trim() !== '' && !isValidFov(parseNumber(fov)) ? t('validation.fov') : null}
            />
          </div>
          {!resOk && <p className="text-xs text-danger">{t('validation.resolution')}</p>}
          {game?.fov && (
            <p className="text-xs text-subtle">
              {t('converter.defaultFov', { value: game.fov.default, type: t(`fovType.${game.fov.type}`) })}
            </p>
          )}
          {real && (
            <p className="ltr num text-xs font-medium text-text">
              {fovDisplay === 'vertical'
                ? `${t('fovType.vertical')} ${f.num(real.vertical)}° · ${t('fovType.horizontal')} ${f.num(real.horizontal)}°`
                : t('converter.realFov', { h: f.num(real.horizontal), v: f.num(real.vertical) })}
            </p>
          )}
          <p className="text-xs leading-relaxed text-subtle">{t('converter.advancedHint')}</p>
        </div>
      )}
    </div>
  )
}
