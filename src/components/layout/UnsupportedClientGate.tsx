import { useEffect, useState, type ReactNode } from 'react'
import { LogoMark } from '../brand/LogoMark'
import { isUnsupportedClient } from '../../lib/browser'

export function UnsupportedClientGate({ children }: { children: ReactNode }) {
  const [blocked, setBlocked] = useState(() => isUnsupportedClient())

  useEffect(() => {
    const sync = () => setBlocked(isUnsupportedClient())
    sync()
    window.addEventListener('resize', sync)
    window.addEventListener('orientationchange', sync)
    return () => {
      window.removeEventListener('resize', sync)
      window.removeEventListener('orientationchange', sync)
    }
  }, [])

  if (!blocked) return children

  return (
    <div className="flex min-h-screen items-center justify-center bg-vault-50 px-6 py-12 dark:bg-vault-950">
      <div className="w-full max-w-md rounded-lg border border-vault-200 bg-white p-8 text-center shadow-sm dark:border-vault-800 dark:bg-vault-900">
        <LogoMark className="mx-auto mb-5 h-12 w-12" />
        <h1 className="text-xl font-semibold text-vault-900 dark:text-white">Desktop browser required</h1>
        <p className="mt-3 text-sm leading-6 text-vault-600 dark:text-vault-300">
          VaultBox does not render on phones or tablets yet. Open this URL on a desktop or laptop.
        </p>
        <p className="mt-4 text-sm text-vault-500">
          Project site:{' '}
          <a className="font-medium text-gold-500 hover:underline" href="https://vaultboxoss.com">
            vaultboxoss.com
          </a>
        </p>
      </div>
    </div>
  )
}
