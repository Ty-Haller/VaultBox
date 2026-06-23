import { Link } from 'react-router-dom'
import { Shield, Lock } from 'lucide-react'
import { useVault } from '../context/VaultContext'
import { usePrices } from '../hooks/usePrices'
import { holdingSpotValue, pricesToRecord, pureMetalOz, vaultUtilization } from '../lib/calculations'
import { formatCurrency } from '../lib/utils'
import { VAULT_TYPE_LABELS } from '../types'
import { ActionBar } from '../components/ui/ActionBar'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'

export function Vaults() {
  const { vaults, sites, holdings, getSite, getHoldingsByVault } = useVault()
  const { prices } = usePrices()
  const priceMap = pricesToRecord(prices)

  return (
    <div className="space-y-4">
      <ActionBar addLabel="Add Vault" addTo="/vaults/new" />
      <p className="text-sm text-vault-500">{vaults.length} vaults across {sites.length} sites</p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {vaults.map((vault) => {
          const vHoldings = getHoldingsByVault(vault.id)
          const site = getSite(vault.siteId)
          const oz = vHoldings.reduce((s, h) => s + pureMetalOz(h), 0)
          const value = vHoldings.reduce((s, h) => s + holdingSpotValue(h, priceMap), 0)
          const util = vaultUtilization(vault, holdings)

          return (
            <Link key={vault.id} to={`/vaults/${vault.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-vault-100">
                      <Shield className="h-5 w-5 text-vault-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-vault-900">{vault.name}</h3>
                      <p className="text-xs text-vault-500">{site?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-vault-500">
                    <Lock className="h-3 w-3" />L{vault.securityLevel}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge>{VAULT_TYPE_LABELS[vault.type]}</Badge>
                  {vault.tags.slice(0, 2).map((t) => <Badge key={t}>{t}</Badge>)}
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-vault-100 pt-4 text-center">
                  <div><p className="text-xs text-vault-500">Holdings</p><p className="font-mono text-sm font-semibold">{vHoldings.length}</p></div>
                  <div><p className="text-xs text-vault-500">Metal</p><p className="font-mono text-sm font-semibold">{oz.toFixed(1)} oz</p></div>
                  <div><p className="text-xs text-vault-500">Value</p><p className="font-mono text-sm font-semibold text-gold-500">{formatCurrency(value, true)}</p></div>
                </div>
                {util && (
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-vault-100">
                    <div className="h-full rounded-full bg-gold-500" style={{ width: `${Math.min(util.percent, 100)}%` }} />
                  </div>
                )}
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}