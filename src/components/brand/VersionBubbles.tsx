import { cn } from '../../lib/utils'
import { APP_VERSION, versionParts } from '../../lib/version'

const sizes = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-xs',
}

export function VersionBubbles({
  className,
  size = 'sm',
}: {
  className?: string
  size?: keyof typeof sizes
}) {
  const { number, channel } = versionParts()
  const bubble = cn(
    'inline-flex items-center rounded-full border border-gold-500/35 bg-gold-500/10 font-mono font-semibold tracking-wide text-gold-500',
    sizes[size],
  )

  return (
    <span
      className={cn('inline-flex items-center gap-1.5', className)}
      title={`VaultBox ${APP_VERSION}`}
      aria-label={`Version ${APP_VERSION}`}
    >
      <span className={bubble}>v{number}</span>
      {channel ? <span className={cn(bubble, 'uppercase')}>{channel}</span> : null}
    </span>
  )
}
