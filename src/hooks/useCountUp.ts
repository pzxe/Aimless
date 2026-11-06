import { useEffect, useRef, useState } from 'react'

/**
 * Animates from 0 to `target` once the element scrolls into view.
 * Respects the motion setting: reduced/instant show the final value immediately.
 */
export function useCountUp(target: number, durationMs = 1200) {
  const ref = useRef<HTMLElement>(null)
  const [value, setValue] = useState(0)

  useEffect(() => {
    const el = ref.current
    const motion = document.documentElement.dataset.motion
    const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!el || motion !== 'full' || reduced || typeof IntersectionObserver === 'undefined') {
      setValue(target)
      return
    }
    let raf = 0
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        io.disconnect()
        const start = performance.now()
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / durationMs)
          const eased = 1 - Math.pow(1 - p, 3)
          setValue(target * eased)
          if (p < 1) raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
      },
      { threshold: 0.4 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [target, durationMs])

  return { ref, value }
}
