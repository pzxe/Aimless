import { useSettings } from '@/store/settingsStore'

/** Subtle UI feedback with the Web Audio API. Off by default; nothing is loaded from the network. */
let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  ctx ??= new Ctor()
  return ctx
}

export type SoundKind = 'click' | 'success'

export function playSound(kind: SoundKind = 'click') {
  if (!useSettings.getState().sound) return
  const a = audio()
  if (!a) return
  try {
    const now = a.currentTime
    const osc = a.createOscillator()
    const gain = a.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(kind === 'success' ? 880 : 520, now)
    if (kind === 'success') osc.frequency.exponentialRampToValueAtTime(1320, now + 0.08)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(kind === 'success' ? 0.06 : 0.035, now + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (kind === 'success' ? 0.16 : 0.06))
    osc.connect(gain).connect(a.destination)
    osc.start(now)
    osc.stop(now + 0.18)
    if ('vibrate' in navigator && kind === 'success') navigator.vibrate?.(8)
  } catch {
    /* audio is optional */
  }
}

/** Click feedback for every button, attached once at the app root. */
export function installClickSound(): () => void {
  const onClick = (e: MouseEvent) => {
    const el = (e.target as Element | null)?.closest('button, a[href], [role="option"], [role="radio"]')
    if (el && !(el as HTMLButtonElement).disabled) playSound('click')
  }
  document.addEventListener('click', onClick, true)
  return () => document.removeEventListener('click', onClick, true)
}
