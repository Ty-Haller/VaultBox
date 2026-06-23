import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { useVault } from '../context/VaultContext'
import { api } from '../lib/api'
import { usePrices } from '../hooks/usePrices'
import type { AuditReport } from '../types'
import {
  aggregateByMetal,
  cryptoPricesToRecord,
  holdingSpotValue,
  portfolioTotals,
  pricesToRecord,
  pureMetalOz,
} from '../lib/calculations'
import { formatDate } from '../lib/utils'
import { formatCurrency, formatOz } from '../lib/utils'
import { type MetalType } from '../types'
import { PortfolioChart } from '../components/charts/PortfolioChart'
import { AllocationChart } from '../components/charts/AllocationChart'
import { VaultChart } from '../components/charts/VaultChart'
import { Card, CardHeader } from '../components/ui/Card'
import { DataTable } from '../components/ui/DataTable'
import { PurchaseSaleReport } from '../components/reports/PurchaseSaleReport'
import { ProfitLossReport } from '../components/reports/ProfitLossReport'

export function Reports() {
  const { holdings, vaults, portfolioHistory } = useVault()
  const { prices, cryptoPrices } = usePrices()
  const priceMap = pricesToRecord(prices)
  const cryptoMap = cryptoPricesToRecord(cryptoPrices)
  const totals = portfolioTotals(holdings, priceMap, cryptoMap)
  const [auditReports, setAuditReports] = useState<AuditReport[]>([])

  useEffect(() => {
    api.getAuditReports().then(setAuditReports).catch(() => setAuditReports([]))
  }, [])
  const byMetal = aggregateByMetal(holdings)

  const allocation = (Object.keys(byMetal) as MetalType[]).map((metal) => ({
    metal,
    oz: byMetal[metal].oz,
    value: holdings
      .filter((h) => h.metalType === metal)
      .reduce((sum, h) => sum + holdingSpotValue(h, priceMap, cryptoMap), 0),
  }))

  const vaultData = vaults.map((v) => {
    const vHoldings = holdings.filter((h) => h.vaultId === v.id)
    return {
      name: v.name,
      oz: vHoldings.reduce((s, h) => s + pureMetalOz(h), 0),
      value: vHoldings.reduce((s, h) => s + holdingSpotValue(h, priceMap, cryptoMap), 0),
    }
  })

  const dealerBreakdown = holdings.reduce(
    (acc, h) => {
      const key = h.dealer ?? 'Unknown'
      if (!acc[key]) acc[key] = { dealer: key, count: 0, cost: 0, oz: 0 }
      acc[key].count += h.quantity
      acc[key].cost += (h.purchasePrice ?? 0) * h.quantity
      acc[key].oz += pureMetalOz(h)
      return acc
    },
    {} as Record<string, { dealer: string; count: number; cost: number; oz: number }>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <a
          href={api.reportPdfUrl('portfolio')}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-md border border-vault-200 bg-white px-4 py-2 text-sm font-medium text-vault-700 hover:bg-vault-50"
        >
          <Download className="h-4 w-4" />
          Portfolio PDF
        </a>
        <a
          href={api.reportPdfUrl('inventory')}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-md border border-vault-200 bg-white px-4 py-2 text-sm font-medium text-vault-700 hover:bg-vault-50"
        >
          <Download className="h-4 w-4" />
          Inventory PDF
        </a>
        <a
          href={api.reportPdfUrl('labels')}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-md bg-gold-500 px-4 py-2 text-sm font-medium text-white hover:bg-gold-400"
        >
          <Download className="h-4 w-4" />
          QR Label Sheet PDF
        </a>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <p className="text-xs uppercase text-vault-500">Total Spot Value</p>
          <p className="mt-1 text-xl font-bold text-gold-500">{formatCurrency(totals.totalSpot)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-vault-500">Total Cost Basis</p>
          <p className="mt-1 text-xl font-bold">{formatCurrency(totals.totalCost)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-vault-500">Unrealized Gain</p>
          <p className={`mt-1 text-xl font-bold ${totals.gain >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatCurrency(totals.gain)}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-vault-500">ROI</p>
          <p className={`mt-1 text-xl font-bold ${totals.gainPercent >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {totals.gainPercent.toFixed(1)}%
          </p>
        </Card>
      </div>

      <PurchaseSaleReport holdings={holdings} vaults={vaults} />

      <ProfitLossReport holdings={holdings} vaults={vaults} />

      <PortfolioChart data={portfolioHistory} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AllocationChart data={allocation} />
        <VaultChart data={vaultData} />
      </div>

      <Card>
        <CardHeader title="Saved Audit Reports" subtitle="Completed vault count verifications" />
        {auditReports.length === 0 ? (
          <p className="text-sm text-vault-500">No audit reports yet. Use Perform Audit on a vault to create one.</p>
        ) : (
          <DataTable
            keyField="id"
            data={auditReports}
            exportFilename="vaultbox-audit-reports"
            columns={[
              { key: 'vault', header: 'Vault', render: (r) => r.vaultName, getCsvValue: (r) => r.vaultName },
              {
                key: 'date',
                header: 'Completed',
                render: (r) => formatDate(r.createdAt.split('T')[0]),
                getCsvValue: (r) => formatDate(r.createdAt.split('T')[0]),
              },
              {
                key: 'discrepancies',
                header: 'Discrepancies',
                render: (r) => {
                  const d = (r.reportData as { discrepancyCount?: number }).discrepancyCount ?? 0
                  return d === 0 ? <span className="text-emerald-600">None</span> : <span className="text-amber-600">{d}</span>
                },
                getCsvValue: (r) => {
                  const d = (r.reportData as { discrepancyCount?: number }).discrepancyCount ?? 0
                  return d === 0 ? 'None' : String(d)
                },
              },
              {
                key: 'by',
                header: 'Performed By',
                render: (r) => (r.reportData as { performedBy?: string }).performedBy || '—',
                getCsvValue: (r) => (r.reportData as { performedBy?: string }).performedBy || '—',
              },
            ]}
          />
        )}
      </Card>

      <Card>
        <CardHeader title="Acquisition by Dealer" subtitle="Cost basis breakdown by source" />
        <DataTable
          keyField="dealer"
          data={Object.values(dealerBreakdown)}
          exportFilename="vaultbox-dealer-acquisitions"
          columns={[
            { key: 'dealer', header: 'Dealer', render: (d) => d.dealer, getCsvValue: (d) => d.dealer },
            { key: 'count', header: 'Items', render: (d) => d.count, getCsvValue: (d) => String(d.count) },
            { key: 'oz', header: 'Pure Oz', render: (d) => formatOz(d.oz), getCsvValue: (d) => formatOz(d.oz) },
            { key: 'cost', header: 'Total Cost', render: (d) => formatCurrency(d.cost), getCsvValue: (d) => formatCurrency(d.cost) },
          ]}
        />
      </Card>
    </div>
  )
}