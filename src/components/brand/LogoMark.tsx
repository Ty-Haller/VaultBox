import { cn } from '../../lib/utils'

export function LogoMark({
  className,
  alt = 'VaultBox',
}: {
  className?: string
  alt?: string
}) {
  return <img src="/logo.svg" alt={alt} className={cn('block', className)} />
}
