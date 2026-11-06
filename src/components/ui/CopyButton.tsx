import { Check, Copy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useT } from '@/i18n'
import { copyText } from '@/utils/clipboard'
import { Button, type ButtonProps } from './Button'

/** Button that copies `text` and briefly shows a check mark. */
export function CopyButton({
  text,
  label,
  showLabel = false,
  disabled,
  ...rest
}: { text: string; label: string; showLabel?: boolean } & Omit<ButtonProps, 'onClick' | 'children'>) {
  const t = useT()
  const [done, setDone] = useState(false)
  useEffect(() => {
    if (!done) return
    const id = setTimeout(() => setDone(false), 1400)
    return () => clearTimeout(id)
  }, [done])
  return (
    <Button
      {...rest}
      disabled={disabled || !text}
      aria-label={label}
      title={label}
      onClick={async () => {
        const ok = await copyText(text, { success: t('common.copied'), failure: t('common.copyFailed') })
        if (ok) setDone(true)
      }}
    >
      {done ? <Check className="text-success" /> : <Copy />}
      {showLabel && <span>{label}</span>}
    </Button>
  )
}
