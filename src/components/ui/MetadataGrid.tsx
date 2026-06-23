import { cn } from '../../lib/utils'

interface MetadataItem {
  label: string
  value: React.ReactNode
  mono?: boolean
}

interface MetadataGridProps {
  items: MetadataItem[]
  columns?: 2 | 3 | 4
}

export function MetadataGrid({ items, columns = 3 }: MetadataGridProps) {
  return (
    <dl
      className={cn(
        'grid gap-4',
        columns === 2 && 'grid-cols-1 sm:grid-cols-2',
        columns === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        columns === 4 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="rounded-md border border-vault-100 bg-vault-50 px-3 py-2.5">
          <dt className="text-xs font-medium uppercase tracking-wide text-vault-500">
            {item.label}
          </dt>
          <dd
            className={cn(
              'mt-1 text-sm text-vault-900',
              item.mono && 'font-mono text-xs'
            )}
          >
            {item.value ?? '—'}
          </dd>
        </div>
      ))}
    </dl>
  )
}