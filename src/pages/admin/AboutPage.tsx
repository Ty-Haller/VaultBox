import { Link } from 'react-router-dom'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { LogoMark } from '../../components/brand/LogoMark'
import { VersionBubbles } from '../../components/brand/VersionBubbles'
import { Card } from '../../components/ui/Card'
import { APP_VERSION } from '../../lib/version'

const rows: { label: string; value: string; href?: string }[] = [
  { label: 'Version', value: APP_VERSION },
  {
    label: 'License',
    value: 'Apache License 2.0',
    href: 'https://github.com/Ty-Haller/VaultBox/blob/main/LICENSE',
  },
  {
    label: 'Source',
    value: 'github.com/Ty-Haller/VaultBox',
    href: 'https://github.com/Ty-Haller/VaultBox',
  },
  {
    label: 'Project site',
    value: 'vaultboxoss.com',
    href: 'https://vaultboxoss.com',
  },
]

export function AboutPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/admin" className="rounded-md p-1.5 text-vault-500 hover:bg-vault-100">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-vault-900">About</h2>
          <p className="text-sm text-vault-500">Version and project information</p>
        </div>
      </div>

      <Card>
        <div className="flex items-center gap-3">
          <LogoMark className="h-12 w-12 rounded-lg" alt="" />
          <div>
            <h3 className="text-lg font-semibold text-vault-900 dark:text-white">VaultBox</h3>
            <p className="text-xs uppercase tracking-widest text-vault-400">Hard asset inventory</p>
          </div>
        </div>
        <div className="mt-4">
          <VersionBubbles size="md" />
        </div>
        <p className="mt-4 text-sm text-vault-600 dark:text-vault-300">
          Local-first inventory for bullion, crypto, and vaulted goods. You run it on your machine.
          It is not a public internet service.
        </p>
      </Card>

      <Card>
        <ul className="divide-y divide-vault-100 dark:divide-vault-700">
          {rows.map((row) => (
            <li key={row.label} className="flex items-baseline justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <span className="text-xs font-semibold uppercase tracking-wider text-vault-400">{row.label}</span>
              {row.href ? (
                <a
                  href={row.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-sm text-gold-500 hover:underline"
                >
                  {row.value}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span className="font-mono text-sm text-vault-800 dark:text-vault-100">{row.value}</span>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
