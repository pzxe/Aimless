import { useEffect, useState } from 'react'

/**
 * Header visibility from scroll direction: hidden while scrolling down (past `offset`),
 * shown again on any upward scroll or near the top. `atTop` lets the header stay fully
 * transparent at the top of the page.
 */
export function useAutoHideHeader(offset = 80) {
  const [hidden, setHidden] = useState(false)
  const [atTop, setAtTop] = useState(true)

  useEffect(() => {
    let last = window.scrollY
    let frame = 0
    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        const y = Math.max(0, window.scrollY)
        const delta = y - last
        setAtTop(y < 8)
        if (y < offset) setHidden(false)
        else if (delta > 4) setHidden(true)
        else if (delta < -4) setHidden(false)
        last = y
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [offset])

  return { hidden, atTop }
}
