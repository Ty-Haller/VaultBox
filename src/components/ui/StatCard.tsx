import { cn, formatCurrency, formatPercent } from '../../lib/utils'
import { TrendingDown, TrendingUp } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string
  subValue?: string
  change?: number
  icon?: React.ReactNode
  accent?: 'gold' | 'default'
}

export function StatCard({ label, value, subValue, change, icon, accent = 'default' }: StatCardProps) {
  const positive = change !== undefined && change >= 0

  return (
    <div
      className={cn(
        'rounded-lg border bg-white p-5 shadow-sm dark:border-vault-700 dark:bg-vault-900',
        accent === 'gold' ? 'border-gold-500/30' : 'border-vault-200'
      )}
    >
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-vault-500">{label}</p>
        {icon && <div className="text-vault-400">{icon}</div>}
      </div>
      <p
        className={cn(
          'mt-2 text-2xl font-bold tabular-nums',
          accent === 'gold' ? 'text-gold-500' : 'text-vault-900 dark:text-vault-100'
        )}
      >
        {value}
      </p>
      <div className="mt-1 flex items-center gap-2">
        {subValue && <span className="text-xs text-vault-500">{subValue}</span>}
        {change !== undefined && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-xs font-medium',
              positive ? 'text-emerald-600' : 'text-red-600'
            )}
          >
            {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {formatPercent(change)}
          </span>
        )}
      </div>
    </div>
  )
}

export function StatCardCurrency({
  label,
  amount,
  change,
  subValue,
  icon,
  accent,
}: {
  label: string
  amount: number
  change?: number
  subValue?: string
  icon?: React.ReactNode
  accent?: 'gold' | 'default'
}) {
  return (
    <StatCard
      label={label}
      value={formatCurrency(amount)}
      change={change}
      subValue={subValue}
      icon={icon}
      accent={accent}
    />
  )
}