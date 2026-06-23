import { useLocation } from 'react-router-dom'
import { Search } from 'lucide-react'
import { PriceTicker } from '../charts/PriceTicker'
import { NotificationsPanel } from './NotificationsPanel'
import { UserMenu } from './UserMenu'

const titles: Record<string, string> = {
  '/': 'Dashboard',
  '/inventory': 'Inventory',
  '/vaults': 'Vaults',
  '/sites': 'Sites',
  '/prices': 'Live Prices',
  '/reports': 'Reports & Analytics',
  '/secrets': 'Secrets Vault',
  '/lookup': 'QR Lookup',
  '/admin': 'Administration',
}

export function Header() {
  const { pathname } = useLocation()
  const segments = pathname.split('/').filter(Boolean)
  const base = '/' + (segments[0] || '')
  let title = titles[base] ?? 'VaultBox'
  if (segments[0] === 'prices' && segments.length >= 3) {
    title = 'Price Chart'
  }

  return (
    <header className="border-b border-vault-200 bg-white dark:border-vault-700 dark:bg-vault-900">
      <div className="flex items-center justify-between px-6 py-3">
        <h2 className="text-lg font-semibold text-vault-900 dark:text-white">{title}</h2>
        <div className="flex items-center gap-3">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-vault-400" />
            <input
              type="search"
              placeholder="Search inventory..."
              className="w-64 rounded-md border border-vault-200 bg-vault-50 py-1.5 pl-9 pr-3 text-sm text-vault-900 placeholder:text-vault-400 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 dark:border-vault-600 dark:bg-vault-800 dark:text-vault-100 dark:placeholder:text-vault-500"
            />
          </div>
          <NotificationsPanel />
          <UserMenu />
        </div>
      </div>
      <PriceTicker />
    </header>
  )
}