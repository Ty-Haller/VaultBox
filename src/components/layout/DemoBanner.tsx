import { useDemo } from '../../context/DemoContext'

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  if (m >= 60) {
    const h = Math.floor(m / 60)
    const mm = m % 60
    return `${h}h ${mm}m`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function DemoBanner() {
  const { publicDemo, remainingMs, resetting, resetsEverySeconds } = useDemo()
  if (!publicDemo) return null

  const warnMs = Math.max(45_000, (resetsEverySeconds || 300) * 200)
  const urgent = resetting || remainingMs <= warnMs

  const timer = resetting
    ? <span className="font-semibold"> Resetting now — you will return to login.</span>
    : remainingMs > 0
      ? <> (next wipe in <span className="font-mono">{formatRemaining(remainingMs)}</span>).</>
      : '.'

  const shell = urgent
    ? 'border-b border-red-700 bg-red-600 text-white'
    : 'border-b border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/70 dark:text-amber-100'
  const link = urgent
    ? 'underline decoration-white/60 hover:decoration-white'
    : 'underline decoration-amber-700/50 hover:decoration-amber-700'

  return (
    <div className={`${shell} px-4 py-2.5 text-sm`}>
      <p className="mx-auto max-w-5xl leading-relaxed">
        <strong>Public demo.</strong> Data is fake and resets every cycle
        {timer}
        Passkeys from this cycle are wiped too.{' '}
        <strong>Do not enter real holdings, seed phrases, or recovery data.</strong>{' '}
        <em>Start demo admin session</em> is Full Admin so you can see the whole app.
        A registered passkey starts as Viewer — raise or lower roles under Admin → Users during this cycle.{' '}
        <a href="https://github.com/Ty-Haller/VaultBox" className={link} target="_blank" rel="noreferrer">
          Run your own
        </a>
        {' · '}
        <a href="https://vaultboxoss.com" className={link} target="_blank" rel="noreferrer">
          vaultboxoss.com
        </a>
      </p>
    </div>
  )
}
