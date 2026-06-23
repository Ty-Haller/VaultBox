import { cn } from '../../lib/utils'

const variants = {
  default: 'bg-vault-100 text-vault-700 dark:bg-vault-700 dark:text-vault-200',
  gold: 'bg-gold-500/15 text-gold-500 border border-gold-500/30',
  silver: 'bg-silver-400/15 text-vault-600 border border-silver-400/30 dark:text-vault-300',
  platinum: 'bg-platinum-400/15 text-vault-600 border border-platinum-400/30 dark:text-vault-300',
  palladium: 'bg-palladium-400/15 text-vault-600 border border-palladium-400/30 dark:text-vault-300',
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  danger: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
}

interface BadgeProps {
  children: React.ReactNode
  variant?: keyof typeof variants
  className?: string
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}