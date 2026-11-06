import { toast } from 'sonner'
import { playSound } from './sound'

/** Copy text and show a toast. Falls back to execCommand for non-secure contexts. */
export async function copyText(text: string, messages: { success: string; failure: string }): Promise<boolean> {
  let ok = false
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      ok = true
    }
  } catch {
    ok = false
  }
  if (!ok) {
    try {
      const area = document.createElement('textarea')
      area.value = text
      area.setAttribute('readonly', '')
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.appendChild(area)
      area.select()
      ok = document.execCommand('copy')
      area.remove()
    } catch {
      ok = false
    }
  }
  if (ok) playSound('success')
  if (ok) toast.success(messages.success, { description: text.length <= 40 ? text : undefined })
  else toast.error(messages.failure)
  return ok
}
