import { cn } from '../../lib/utils'

interface FormFieldProps {
  label: string
  children: React.ReactNode
  className?: string
  required?: boolean
  help?: string
}

export function FormField({ label, children, className, required, help }: FormFieldProps) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1 block text-xs font-medium text-vault-800 dark:text-vault-200">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
      {help && <p className="mt-1 text-xs text-vault-500">{help}</p>}
    </label>
  )
}

export const inputClass =
  'w-full rounded-md border border-vault-300 bg-white px-3 py-2 text-sm text-vault-900 placeholder:text-vault-500 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 dark:border-vault-600 dark:bg-vault-800 dark:text-vault-100 dark:placeholder:text-vault-400'

export const selectClass = inputClass

export function TagsInput({
  value,
  onChange,
}: {
  value: string[]
  onChange: (tags: string[]) => void
}) {
  const text = value.join(', ')
  return (
    <input
      type="text"
      className={inputClass}
      value={text}
      onChange={(e) =>
        onChange(
          e.target.value
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        )
      }
      placeholder="comma, separated, tags"
    />
  )
}