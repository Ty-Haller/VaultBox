import { Bitcoin, Coins, Shield, TrendingUp, Vault } from 'lucide-react'
import { useVault } from '../context/VaultContext'
import { usePrices } from '../hooks/usePrices'
import {
  activeHoldings,
  aggregateByMetal,
  cryptoPortfolioValue,
  cryptoPricesToRecord,
  holdingSpotValue,
  portfolioTotals,
  pricesToRecord,
  pureMetalOz,
} from '../lib/calculations'
import { formatCurrency, formatOz } from '../lib/utils'
import { ASSET_CLASS_LABELS, METAL_LABELS, type MetalType } from '../types'
import { PortfolioChart } from '../components/charts/PortfolioChart'
import { AllocationChart } from '../components/charts/AllocationChart'
import { VaultChart } from '../components/charts/VaultChart'
import { StatCardCurrency } from '../components/ui/StatCard'
import { Card, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { DataTable } from '../components/ui/DataTable'
import { Link } from 'react-router-dom'

export function Dashboard() {
  const { holdings: rawHoldings, vaults, sites, portfolioHistory } = useVault()
  const holdings = rawHoldings ?? []
  const { prices, cryptoPrices } = usePrices()
  const priceMap = pricesToRecord(prices)
  const cryptoMap = cryptoPricesToRecord(cryptoPrices)

  const totals = portfolioTotals(holdings, priceMap, cryptoMap)
  const byMetal = aggregateByMetal(holdings)
  const cryptoHoldings = activeHoldings(holdings).filter((h) => h.assetClass === 'crypto')
  const cryptoStats = cryptoPortfolioValue(holdings, cryptoMap)

  const allocation = (Object.keys(byMetal) as MetalType[]).map((metal) => ({
    metal,
    oz: byMetal[metal].oz,
    value: activeHoldings(holdings)
      .filter((h) => h.metalType === metal)
      .reduce((sum, h) => sum + holdingSpotValue(h, priceMap, cryptoMap), 0),
  }))

  const vaultData = vaults.map((v) => {
    const vHoldings = activeHoldings(holdings).filter((h) => h.vaultId === v.id)
    const oz = vHoldings.reduce((s, h) => s + pureMetalOz(h), 0)
    const value = vHoldings.reduce((s, h) => s + holdingSpotValue(h, priceMap, cryptoMap), 0)
    return { name: v.name, value, oz }
  })

  const recentHoldings = [...activeHoldings(holdings)]
    .sort((a, b) => {
      const da = a.purchaseDate ? new Date(a.purchaseDate).getTime() : 0
      const db = b.purchaseDate ? new Date(b.purchaseDate).getTime() : 0
      return db - da
    })
    .slice(0, 5)

  const totalOz = activeHoldings(holdings).reduce((s, h) => s + pureMetalOz(h), 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCardCurrency
          label="Portfolio Value"
          amount={totals.totalSpot}
          change={totals.gainPercent}
          icon={<TrendingUp className="h-4 w-4" />}
          accent="gold"
        />
        <StatCardCurrency
          label="Cost Basis"
          amount={totals.totalCost}
          subValue={`Gain: ${formatCurrency(totals.gain)}`}
          icon={<Coins className="h-4 w-4" />}
        />
        <div className="rounded-lg border border-vault-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-vault-500">
              Total Pure Metal
            </p>
            <Vault className="h-4 w-4 text-vault-400" />
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-vault-900">
            {formatOz(totalOz)}
          </p>
          <p className="mt-1 text-xs text-vault-500">
            {sites.length} sites · {vaults.length} vaults · {holdings.length} holdings
          </p>
        </div>
        <StatCardCurrency
          label="Unrealized Gain"
          amount={totals.gain}
          change={totals.gainPercent}
          icon={<Shield className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <PortfolioChart data={portfolioHistory} />
        </div>
        <AllocationChart data={allocation} />
      </div>

      {(cryptoHoldings.length > 0 || cryptoStats.totalCount > 0) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCardCurrency
            label="Crypto Portfolio"
            amount={cryptoStats.totalValue}
            subValue={`${cryptoStats.totalCount} cold-wallet holding${cryptoStats.totalCount === 1 ? '' : 's'}`}
            icon={<Bitcoin className="h-4 w-4" />}
            accent="gold"
          />
          {Object.entries(cryptoStats.bySymbol).map(([sym, data]) => (
            <div key={sym} className="rounded-lg border border-vault-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-vault-500">{sym}</p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-vault-900">
                {data.quantity > 0 ? data.quantity.toLocaleString(undefined, { maximumFractionDigits: 8 }) : '—'}
              </p>
              <p className="mt-1 text-xs text-vault-500">
                {formatCurrency(data.value)} · {data.count} wallet{data.count === 1 ? '' : 's'}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <VaultChart data={vaultData} />
        <Card>
          <CardHeader title="Metal Holdings" subtitle="Pure troy ounces by metal" />
          <div className="space-y-3">
            {(Object.keys(byMetal) as MetalType[]).map((metal) => (
              <div key={metal} className="flex items-center gap-3">
                <Badge variant={metal}>{METAL_LABELS[metal]}</Badge>
                <div className="flex-1">
                  <div className="h-2 overflow-hidden rounded-full bg-vault-100">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${totalOz > 0 ? (byMetal[metal].oz / totalOz) * 100 : 0}%`,
                        backgroundColor:
                          metal === 'gold'
                            ? '#d4a017'
                            : metal === 'silver'
                              ? '#a8b0b8'
                              : metal === 'platinum'
                                ? '#8e9aaf'
                                : '#9aa5b1',
                      }}
                    />
                  </div>
                </div>
                <span className="font-mono text-sm text-vault-700">
                  {byMetal[metal].oz.toFixed(2)} oz
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {cryptoHoldings.length > 0 && (
        <Card>
          <CardHeader
            title="Crypto Holdings"
            subtitle="Cold-wallet assets tracked in VaultBox"
            action={
              <Link to="/inventory" className="text-xs font-medium text-gold-500 hover:underline">
                View all →
              </Link>
            }
          />
          <DataTable
            keyField="id"
            data={cryptoHoldings}
            columns={[
              {
                key: 'name',
                header: 'Wallet / Asset',
                render: (h) => (
                  <Link to={`/inventory/${h.id}`} className="font-medium text-gold-500 hover:underline">
                    {h.name}
                  </Link>
                ),
              },
              {
                key: 'symbol',
                header: 'Symbol',
                render: (h) => <span className="font-mono text-xs">{h.cryptoSymbol ?? '—'}</span>,
              },
              {
                key: 'qty',
                header: 'Quantity',
                render: (h) => (
                  <span className="font-mono text-xs">
                    {h.cryptoQuantity != null ? h.cryptoQuantity : '—'}
                  </span>
                ),
              },
              {
                key: 'value',
                header: 'Value',
                render: (h) => formatCurrency(holdingSpotValue(h, priceMap, cryptoMap)),
              },
              {
                key: 'wallet',
                header: 'Wallet Type',
                render: (h) => h.walletType || '—',
              },
            ]}
          />
        </Card>
      )}

      <Card>
        <CardHeader
          title="Recent Acquisitions"
          subtitle="Latest inventory additions"
          action={
            <Link to="/inventory" className="text-xs font-medium text-gold-500 hover:underline">
              View all →
            </Link>
          }
        />
        <DataTable
          keyField="id"
          data={recentHoldings}
          columns={[
            {
              key: 'name',
              header: 'Item',
              render: (h) => (
                <Link to={`/inventory/${h.id}`} className="font-medium text-gold-500 hover:underline">
                  {h.name}
                </Link>
              ),
            },
            {
              key: 'type',
              header: 'Type',
              render: (h) =>
                h.assetClass === 'bullion' && h.metalType ? (
                  <Badge variant={h.metalType as 'gold'}>{METAL_LABELS[h.metalType as keyof typeof METAL_LABELS]}</Badge>
                ) : (
                  <Badge>{ASSET_CLASS_LABELS[h.assetClass]}</Badge>
                ),
            },
            {
              key: 'oz',
              header: 'Weight',
              render: (h) => (
                <span className="font-mono text-xs">
                  {formatOz(pureMetalOz(h))}
                </span>
              ),
            },
            {
              key: 'cost',
              header: 'Cost',
              render: (h) => formatCurrency((h.purchasePrice ?? 0) * h.quantity),
            },
            {
              key: 'spot',
              header: 'Spot Value',
              render: (h) => formatCurrency(holdingSpotValue(h, priceMap, cryptoMap)),
            },
          ]}
          onRowClick={(h) => (window.location.href = `/inventory/${h.id}`)}
        />
      </Card>
    </div>
  )
}