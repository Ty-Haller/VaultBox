import { useMemo } from 'react'
import { Download } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Holding, Vault } from '../../types'
import { api } from '../../lib/api'
import { buildPurchaseRows, buildSaleRows } from '../../lib/transactionReports'
import { formatCurrency, formatDate } from '../../lib/utils'
import { Card, CardHeader } from '../ui/Card'
import { DataTable } from '../ui/DataTable'
import { DateRangeFilter, formatRangeLabel, useDateRangeState } from './DateRangeFilter'

interface PurchaseSaleReportProps {
  holdings: Holding[]
  vaults: Vault[]
}

export function PurchaseSaleReport({ holdings, vaults }: PurchaseSaleReportProps) {
  const {
    preset,
    setPreset,
    customFrom,
    setCustomFrom,
    customTo,
    setCustomTo,
    range,
  } = useDateRangeState('ytd')

  const vaultName = (vaultId: string) => vaults.find((v) => v.id === vaultId)?.name ?? '—'

  const purchases = useMemo(
    () => buildPurchaseRows(holdings, range, vaultName),
    [holdings, range, vaults]
  )

  const sales = useMemo(
    () => buildSaleRows(holdings, range, vaultName),
    [holdings, range, vaults]
  )

  const totalPurchased = purchases.reduce((sum, p) => sum + p.totalCost, 0)
  const totalSold = sales.reduce((sum, s) => sum + s.proceeds, 0)
  const totalRealizedGain = sales.reduce((sum, s) => sum + s.gain, 0)

  const pdfUrl = api.reportPdfUrl('purchase-sale', { from: range.from, to: range.to })

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <CardHeader
          title="Purchases & Sales"
          subtitle={`Acquisitions and disposals · ${formatRangeLabel(range)}`}
        />
        <a
          href={pdfUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-md border border-vault-200 bg-white px-3 py-1.5 text-sm font-medium text-vault-700 hover:bg-vault-50"
        >
          <Download className="h-4 w-4" />
          Download PDF
        </a>
      </div>

      <DateRangeFilter
        preset={preset}
        onPresetChange={setPreset}
        customFrom={customFrom}
        customTo={customTo}
        onCustomFromChange={setCustomFrom}
        onCustomToChange={setCustomTo}
      />

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-md bg-vault-50 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-vault-400">Purchases</p>
          <p className="mt-1 text-lg font-bold text-vault-900">{formatCurrency(totalPurchased)}</p>
          <p className="text-xs text-vault-500">{purchases.length} items</p>
        </div>
        <div className="rounded-md bg-vault-50 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-vault-400">Sales</p>
          <p className="mt-1 text-lg font-bold text-vault-900">{formatCurrency(totalSold)}</p>
          <p className="text-xs text-vault-500">{sales.length} items</p>
        </div>
        <div className="rounded-md bg-vault-50 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-vault-400">Realized gain/loss</p>
          <p
            className={`mt-1 text-lg font-bold ${
              totalRealizedGain >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            {formatCurrency(totalRealizedGain)}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-vault-800">Purchases</h3>
          {purchases.length === 0 ? (
            <p className="text-sm text-vault-500">No purchases in this period.</p>
          ) : (
            <DataTable
              keyField="id"
              data={purchases}
              exportFilename="vaultbox-purchases"
              columns={[
                {
                  key: 'name',
                  header: 'Item',
                  getCsvValue: (p) => p.holding.name,
                  render: (p) => (
                    <Link
                      to={`/inventory/${p.holding.id}`}
                      className="font-medium text-gold-500 hover:underline"
                    >
                      {p.holding.name}
                    </Link>
                  ),
                },
                {
                  key: 'date',
                  header: 'Purchase Date',
                  getCsvValue: (p) => (p.holding.purchaseDate ? formatDate(p.holding.purchaseDate) : '—'),
                  render: (p) =>
                    p.holding.purchaseDate ? formatDate(p.holding.purchaseDate) : '—',
                },
                {
                  key: 'dealer',
                  header: 'Dealer',
                  getCsvValue: (p) => p.holding.dealer || '—',
                  render: (p) => p.holding.dealer || '—',
                },
                {
                  key: 'vault',
                  header: 'Vault',
                  getCsvValue: (p) => p.vaultLabel,
                  render: (p) => p.vaultLabel,
                },
                {
                  key: 'cost',
                  header: 'Cost',
                  getCsvValue: (p) => formatCurrency(p.totalCost),
                  render: (p) => formatCurrency(p.totalCost),
                },
              ]}
            />
          )}
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-vault-800">Sales</h3>
          {sales.length === 0 ? (
            <p className="text-sm text-vault-500">No sales in this period.</p>
          ) : (
            <DataTable
              keyField="id"
              data={sales}
              exportFilename="vaultbox-sales"
              columns={[
                {
                  key: 'name',
                  header: 'Item',
                  getCsvValue: (s) => s.holding.name,
                  render: (s) => (
                    <Link
                      to={`/inventory/${s.holding.id}`}
                      className="font-medium text-gold-500 hover:underline"
                    >
                      {s.holding.name}
                    </Link>
                  ),
                },
                {
                  key: 'date',
                  header: 'Sale Date',
                  getCsvValue: (s) => (s.holding.transactionDate ? formatDate(s.holding.transactionDate) : '—'),
                  render: (s) =>
                    s.holding.transactionDate ? formatDate(s.holding.transactionDate) : '—',
                },
                {
                  key: 'buyer',
                  header: 'Buyer',
                  getCsvValue: (s) => s.holding.buyerName || '—',
                  render: (s) => s.holding.buyerName || '—',
                },
                {
                  key: 'vault',
                  header: 'Vault',
                  getCsvValue: (s) => s.vaultLabel,
                  render: (s) => s.vaultLabel,
                },
                {
                  key: 'cost',
                  header: 'Cost Basis',
                  getCsvValue: (s) => formatCurrency(s.cost),
                  render: (s) => formatCurrency(s.cost),
                },
                {
                  key: 'proceeds',
                  header: 'Sale Price',
                  getCsvValue: (s) => formatCurrency(s.proceeds),
                  render: (s) => formatCurrency(s.proceeds),
                },
                {
                  key: 'gain',
                  header: 'Gain/Loss',
                  getCsvValue: (s) => formatCurrency(s.gain),
                  render: (s) => (
                    <span className={s.gain >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                      {formatCurrency(s.gain)}
                    </span>
                  ),
                },
              ]}
            />
          )}
        </div>
      </div>
    </Card>
  )
}