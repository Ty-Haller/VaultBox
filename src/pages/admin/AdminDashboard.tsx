import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell,
  Building,
  Coins,
  DollarSign,
  Settings,
  Shield,
  ClipboardCheck,
  Users,
  KeyRound,
  MapPin,
  Layers,
  Package,
  Store,
  LineChart,
  Bitcoin,
  DatabaseBackup,
  LogIn,
  Globe,
} from 'lucide-react'
import { useAdmin } from '../../context/AdminContext'
import { useAuth } from '../../context/AuthContext'
import { useVault } from '../../context/VaultContext'
import { adminApi } from '../../lib/adminApi'
import { api } from '../../lib/api'
import { Card } from '../../components/ui/Card'

const sections = [
  { to: '/admin/site-types', label: 'Site Types', icon: MapPin, countKey: 'siteTypes' as const, desc: 'Location classifications' },
  { to: '/admin/vault-types', label: 'Vault Types', icon: Shield, countKey: 'vaultTypes' as const, desc: 'Storage container types' },
  { to: '/admin/asset-categories', label: 'Asset Categories', icon: Layers, countKey: 'assetCategories' as const, desc: 'Precious metals, crypto, gems, watches' },
  { to: '/admin/product-types', label: 'Bullion Products', icon: Package, countKey: 'productTypes' as const, desc: 'ASE, Gold Buffalo, Silver Maple…' },
  { to: '/admin/metal-types', label: 'Metal Types', icon: Coins, countKey: 'metalTypes' as const, desc: 'Gold, silver, platinum...' },
  { to: '/admin/dealers', label: 'Dealers', icon: Store, countKey: 'dealers' as const, desc: 'APMEX, JM Bullion, SD Bullion…' },
  { to: '/admin/crypto-tokens', label: 'Crypto Tokens', icon: Bitcoin, countKey: 'cryptoTokens' as const, desc: 'BTC, ETH, Doge, custom…' },
  { to: '/admin/coin-types', label: 'Form Factors', icon: Building, countKey: 'formFactorTypes' as const, desc: 'Bars, coins, rounds' },
  { to: '/admin/currencies', label: 'Currencies', icon: DollarSign, countKey: 'currencies' as const, desc: 'USD, EUR, GBP...' },
  { to: '/admin/site', label: 'Site & Hostname', icon: Globe, countKey: null, desc: 'Public DNS name, URLs, passkeys & SSO' },
  { to: '/admin/settings', label: 'Other Settings', icon: Settings, countKey: 'settings' as const, desc: 'App configuration' },
  { to: '/admin/price-ticker', label: 'Price Ticker', icon: LineChart, countKey: null, desc: 'Metals, crypto, stocks, forex' },
  { to: '/admin/notifications', label: 'Notifications', icon: Bell, countKey: 'notificationOptions' as const, desc: 'Event catalog, role defaults & SMTP' },
  { to: '/admin/backups', label: 'Backups', icon: DatabaseBackup, countKey: null, desc: 'On-demand & scheduled backups, encryption, rclone' },
  { to: '/admin/sso', label: 'SSO / OAuth', icon: LogIn, countKey: null, desc: 'OpenID Connect login providers' },
  { to: '/admin/audit-workflows', label: 'Audit Workflows', icon: ClipboardCheck, countKey: 'auditWorkflows' as const, desc: 'Review schedules' },
  { to: '/admin/users', label: 'Users', icon: Users, countKey: null, desc: 'User accounts' },
  { to: '/admin/groups', label: 'Groups & Roles', icon: KeyRound, countKey: null, desc: 'Roles, groups, site/vault access' },
  { to: '/admin/signup-requests', label: 'Signup Requests', icon: Users, countKey: null, desc: 'Approve new account requests' },
]

export function AdminDashboard() {
  const admin = useAdmin()
  const { user } = useAuth()
  const { refresh } = useVault()
  const [resetConfirm, setResetConfirm] = useState('')
  const [resetting, setResetting] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const [resetOk, setResetOk] = useState<string | null>(null)
  const [purgeConfirm, setPurgeConfirm] = useState('')
  const [purging, setPurging] = useState(false)
  const [purgeError, setPurgeError] = useState<string | null>(null)
  const [purgeOk, setPurgeOk] = useState<string | null>(null)
  const [stale, setStale] = useState<{
    currentRpId: string
    currentCount: number
    staleCount: number
    staleByRpId: { rpId: string; count: number }[]
  } | null>(null)

  const canReset = user?.permissions?.isFullAdmin

  const loadStale = useCallback(async () => {
    if (!canReset) return
    try {
      setStale(await adminApi.getStalePasskeys())
    } catch {
      setStale(null)
    }
  }, [canReset])

  useEffect(() => {
    void loadStale()
  }, [loadStale])

  const handleReset = async () => {
    if (resetting) return
    if (resetConfirm.trim().toUpperCase() !== 'RESET') {
      setResetOk(null)
      setResetError('Type RESET to confirm.')
      return
    }
    setResetting(true)
    setResetError(null)
    setResetOk(null)
    try {
      const result = await api.seedData()
      await refresh()
      await admin.refresh()
      setResetConfirm('')
      const sites = result?.sites
      const vaults = result?.vaults
      const holdings = result?.holdings
      setResetOk(
        typeof sites === 'number'
          ? `Demo seed restored — ${sites} sites, ${vaults} vaults, ${holdings} holdings.`
          : 'Demo seed restored.'
      )
    } catch (e) {
      setResetError(e instanceof Error ? e.message : 'Reset failed')
    } finally {
      setResetting(false)
    }
  }

  const handlePurgeStalePasskeys = async () => {
    if (purging) return
    if (purgeConfirm.trim().toUpperCase() !== 'PURGE') {
      setPurgeOk(null)
      setPurgeError('Type PURGE to confirm.')
      return
    }
    setPurging(true)
    setPurgeError(null)
    setPurgeOk(null)
    try {
      const result = await adminApi.purgeStalePasskeys()
      setStale(result)
      setPurgeConfirm('')
      setPurgeOk(
        result.deleted === 0
          ? 'No old-host passkeys to remove.'
          : `Removed ${result.deleted} passkey${result.deleted === 1 ? '' : 's'} from previous hosts.`
      )
    } catch (e) {
      setPurgeError(e instanceof Error ? e.message : 'Purge failed')
    } finally {
      setPurging(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-vault-900">Administration</h2>
        <p className="text-sm text-vault-500">
          Configure asset taxonomy, product catalog, workflows, integrations, and users
        </p>
      </div>

      {admin.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {admin.error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map(({ to, label, icon: Icon, countKey, desc }) => {
          const count = countKey ? admin[countKey].length : undefined
          return (
            <Link key={to} to={to}>
              <Card className="transition-shadow hover:shadow-md">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-vault-100">
                    <Icon className="h-5 w-5 text-vault-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-vault-900">{label}</h3>
                    <p className="mt-0.5 text-xs text-vault-500">{desc}</p>
                    {count !== undefined && (
                      <p className="mt-2 font-mono text-sm text-gold-500">{count} records</p>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          )
        })}
      </div>

      {canReset && (
        <Card className="bg-red-50 dark:bg-red-950/30">
          <h3 className="text-sm font-semibold text-red-700 dark:text-red-300">Danger zone</h3>
          <p className="mt-1 text-sm text-vault-500">
            Replace all sites, vaults, and holdings with the demo seed. This cannot be undone.
            Type <code className="font-mono text-vault-700 dark:text-vault-200">RESET</code> to confirm.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={resetConfirm}
              onChange={(e) => {
                setResetConfirm(e.target.value)
                setResetError(null)
                setResetOk(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void handleReset()
                }
              }}
              placeholder="RESET"
              autoComplete="off"
              className="w-40 rounded-md border border-vault-200 bg-vault-50 px-3 py-1.5 text-sm dark:border-vault-600 dark:bg-vault-800 dark:text-white"
            />
            <button
              type="button"
              onClick={() => void handleReset()}
              disabled={resetting}
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {resetting ? 'Resetting…' : 'Reset to demo seed'}
            </button>
          </div>
          {resetError && <p className="mt-2 text-sm text-red-600">{resetError}</p>}
          {resetOk && <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">{resetOk}</p>}

          <div className="mt-6 border-t border-red-200 pt-4 dark:border-red-900">
            <p className="text-sm font-medium text-red-700 dark:text-red-300">Remove old-host passkeys</p>
            <p className="mt-1 text-sm text-vault-500">
              After a hostname / RP ID change, passkeys for previous hosts stay in the database so you can revert.
              Once you have enrolled on this host, purge the leftovers. Type{' '}
              <code className="font-mono text-vault-700 dark:text-vault-200">PURGE</code> to confirm.
            </p>
            {stale && (
              <p className="mt-2 font-mono text-xs text-vault-600 dark:text-vault-400">
                This host ({stale.currentRpId}): {stale.currentCount} passkey{stale.currentCount === 1 ? '' : 's'}
                {stale.staleCount > 0
                  ? ` · old hosts: ${stale.staleByRpId.map((r) => `${r.rpId} (${r.count})`).join(', ')}`
                  : ' · no old-host passkeys'}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={purgeConfirm}
                onChange={(e) => {
                  setPurgeConfirm(e.target.value)
                  setPurgeError(null)
                  setPurgeOk(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void handlePurgeStalePasskeys()
                  }
                }}
                placeholder="PURGE"
                autoComplete="off"
                className="w-40 rounded-md border border-vault-200 bg-vault-50 px-3 py-1.5 text-sm dark:border-vault-600 dark:bg-vault-800 dark:text-white"
              />
              <button
                type="button"
                onClick={() => void handlePurgeStalePasskeys()}
                disabled={purging || (stale != null && stale.staleCount === 0)}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {purging ? 'Removing…' : 'Remove old RP ID passkeys'}
              </button>
            </div>
            {purgeError && <p className="mt-2 text-sm text-red-600">{purgeError}</p>}
            {purgeOk && <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">{purgeOk}</p>}
          </div>
        </Card>
      )}
    </div>
  )
}