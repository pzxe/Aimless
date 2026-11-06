import { useEffect, useRef } from 'react'

/**
 * Staggered entrance for descendants marked `data-reveal` (optionally with style `--i`).
 * Elements are shown when they scroll into view. Elements mounted later (re-renders,
 * tab switches) are picked up too. Without IntersectionObserver, or when motion is not
 * "full", everything is shown immediately, so nothing can stay hidden.
 */
export function useReveal<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T>(null)
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const motion = document.documentElement.dataset.motion
    const prefersReduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
    const animate = typeof IntersectionObserver !== 'undefined' && motion === 'full' && !prefersReduced
    const show = (el: Element) => el.setAttribute('data-shown', '')

    const io = animate
      ? new IntersectionObserver(
          (entries) => {
            for (const e of entries) {
              if (e.isIntersecting) {
                show(e.target)
                io!.unobserve(e.target)
              }
            }
          },
          { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
        )
      : null
    const track = (el: Element) => {
      if (el.hasAttribute('data-shown')) return
      if (io) io.observe(el)
      else show(el)
    }
    root.querySelectorAll('[data-reveal]').forEach(track)

    // Pick up elements added after mount.
    const mo = new MutationObserver((records) => {
      for (const r of records) {
        r.addedNodes.forEach((n) => {
          if (!(n instanceof Element)) return
          if (n.hasAttribute('data-reveal')) track(n)
          n.querySelectorAll('[data-reveal]').forEach(track)
        })
      }
    })
    mo.observe(root, { childList: true, subtree: true })

    // Safety net: never leave content hidden (headless capture, print, odd layouts).
    const fallback = window.setTimeout(() => root.querySelectorAll('[data-reveal]').forEach(show), 4000)
    return () => {
      io?.disconnect()
      mo.disconnect()
      window.clearTimeout(fallback)
    }
  }, [])
  return ref
}
