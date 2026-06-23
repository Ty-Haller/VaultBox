import { cn } from '../../lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: boolean
}

export function Card({ children, className, padding = true }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-vault-200 bg-white shadow-sm dark:border-vault-700 dark:bg-vault-900',
        padding && 'p-5',
        className
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <h3 className="text-sm font-semibold text-vault-900 dark:text-white">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-vault-600 dark:text-vault-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}