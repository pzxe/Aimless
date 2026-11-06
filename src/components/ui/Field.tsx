import { ChevronDown } from 'lucide-react'
import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

export const inputClass =
  'h-10 w-full rounded-xl border border-border bg-surface-2/70 px-3 text-sm text-text placeholder:text-subtle ' +
  'transition-[border-color,box-shadow] duration-150 outline-none hover:border-border-strong ' +
  'focus:border-accent focus:ring-3 focus:ring-ring aria-invalid:border-danger aria-invalid:focus:ring-danger/25'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(inputClass, className)} {...props} />
})

export function Label({ children, htmlFor, hint }: { children: ReactNode; htmlFor?: string; hint?: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 flex items-baseline justify-between gap-2 text-xs font-medium text-muted">
      <span>{children}</span>
      {hint && <span className="font-normal text-subtle">{hint}</span>}
    </label>
  )
}

export function FieldError({ id, children }: { id?: string; children?: ReactNode }) {
  if (!children) return null
  return (
    <p id={id} role="alert" className="mt-1.5 text-xs text-danger">
      {children}
    </p>
  )
}

interface NumberFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label: ReactNode
  value: string
  onValueChange: (value: string) => void
  error?: string | null
  suffix?: ReactNode
  hint?: ReactNode
  large?: boolean
}

/**
 * Text input for numbers. Uses inputMode="decimal" instead of type="number" so partial
 * values and localized separators are preserved while typing.
 */
export function NumberField({ label, value, onValueChange, error, suffix, hint, large, className, id, ...rest }: NumberFieldProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const errorId = `${inputId}-error`
  return (
    <div className={className}>
      <Label htmlFor={inputId} hint={hint}>
        {label}
      </Label>
      <div className="relative">
        <input
          id={inputId}
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          dir="ltr"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(inputClass, 'num text-start', large && 'h-12 text-lg font-semibold', suffix && 'pe-14')}
          {...rest}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-xs text-subtle">{suffix}</span>
        )}
      </div>
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  )
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={cn('relative', className)}>
      <select className={cn(inputClass, 'cursor-pointer appearance-none pe-9')} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
    </div>
  )
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputClass, 'h-auto min-h-20 resize-y py-2 leading-relaxed', className)} {...props} />
}
