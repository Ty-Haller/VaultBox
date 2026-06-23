import { NavLink } from 'react-router-dom'
import {
  BarChart3,
  Building2,
  ClipboardCheck,
  Coins,
  History,
  LayoutDashboard,
  MapPin,
  QrCode,
  RefreshCw,
  Lock,
  Settings,
  Shield,
  TrendingUp,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAuth } from '../../context/AuthContext'
import { useVault } from '../../context/VaultContext'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/inventory', label: 'Inventory', icon: Coins },
  { to: '/vaults', label: 'Vaults', icon: Shield },
  { to: '/sites', label: 'Sites', icon: MapPin },
  { to: '/prices', label: 'Live Prices', icon: TrendingUp },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/audits', label: 'Audits', icon: ClipboardCheck },
  { to: '/changelog', label: 'Activity Log', icon: History },
  { to: '/secrets', label: 'Secrets', icon: Lock },
  { to: '/lookup', label: 'QR Lookup', icon: QrCode },
  { to: '/admin', label: 'Admin', icon: Settings },
]

export function Sidebar() {
  const { user } = useAuth()
  const { sites, vaults, holdings, resetData } = useVault()
  const perms = user?.permissions

  const visibleNav = navItems.filter((item) => {
    if (item.to === '/admin') return perms?.canAccessAdmin
    if (item.to === '/secrets') return perms?.isFullAdmin || perms?.globalRole === 'site_admin' || perms?.globalRole === 'vault_admin' || Object.values(perms?.vaultRoles ?? {}).some((r) => r === 'vault_admin' || r === 'site_admin')
    if (item.to === '/reports' || item.to === '/audits' || item.to === '/changelog') return perms?.canViewReports
    return true
  })

  return (
    <aside className="flex w-60 shrink-0 flex-col bg-vault-900 text-vault-200">
      <div className="border-b border-vault-700 px-5 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-500/20">
            <Building2 className="h-5 w-5 text-gold-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">VaultBox</h1>
            <p className="text-[10px] uppercase tracking-widest text-vault-400">
              Bullion DCIM
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {visibleNav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-vault-700 text-white'
                  : 'text-vault-300 hover:bg-vault-800 hover:text-white'
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-vault-700 px-4 py-4">
        <div className="mb-3 space-y-1.5 text-xs text-vault-400">
          <div className="flex justify-between">
            <span>Sites</span>
            <span className="font-mono text-vault-200">{sites.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Vaults</span>
            <span className="font-mono text-vault-200">{vaults.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Holdings</span>
            <span className="font-mono text-vault-200">{holdings.length}</span>
          </div>
        </div>
        {perms?.isFullAdmin && (
          <button
            type="button"
            onClick={() => {
              if (confirm('Reset all data to seed defaults? This cannot be undone.')) resetData()
            }}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-vault-600 px-3 py-1.5 text-xs text-vault-400 transition-colors hover:border-vault-500 hover:text-vault-200"
          >
            <RefreshCw className="h-3 w-3" />
            Reset Data
          </button>
        )}
      </div>
    </aside>
  )
}