import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import type { Holding, Vault } from '../../types'
import {
  cryptoPricesToRecord,
  holdingGainLoss,
  holdingSpotValue,
  pricesToRecord,
} from '../../lib/calculations'
import { usePrices } from '../../hooks/usePrices'
import { buildSaleRows, buildUnrealizedHoldings } from '../../lib/transactionReports'
import { formatCurrency } from '../../lib/utils'
import { METAL_LABELS } from '../../types'
import { Card, CardHeader } from '../ui/Card'
import { DataTable } from '../ui/DataTable'
import { Badge } from '../ui/Badge'
import { DateRangeFilter, formatRangeLabel, useDateRangeState } from './DateRangeFilter'

interface ProfitLossReportProps {
  holdings: Holding[]
  vaults: Vault[]
}

export function ProfitLossReport({ holdings, vaults }: ProfitLossReportProps) {
  const { prices, cryptoPrices } = usePrices()
  const priceMap = pricesToRecord(prices)
  const cryptoMap = cryptoPricesToRecord(cryptoPrices)

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

  const sales = useMemo(
    () => buildSaleRows(holdings, range, vaultName),
    [holdings, range, vaults]
  )

  const unrealizedRows = useMemo(() => {
    return buildUnrealizedHoldings(holdings, range)
      .map((h) => {
        const spot = holdingSpotValue(h, priceMap, cryptoMap)
        const { cost, gain, gainPercent } = holdingGainLoss(h, spot)
        return {
          id: h.id,
          holding: h,
          spot,
          cost,
          gain,
          gainPercent,
          vaultLabel: vaultName(h.vaultId),
        }
      })
      .sort((a, b) => b.gain - a.gain)
  }, [holdings, range, vaults, priceMap, cryptoMap])

  const realizedPl = sales.reduce((sum, s) => sum + s.gain, 0)
  const unrealizedPl = unrealizedRows.reduce((sum, r) => sum + r.gain, 0)
  const totalPl = realizedPl + unrealizedPl

  const unrealizedCost = unrealizedRows.reduce((sum, r) => sum + r.cost, 0)
  const totalRoi = unrealizedCost > 0 ? (unrealizedPl / unrealizedCost) * 100 : 0

  const [includeCharts, setIncludeCharts] = useState(false)
  const pdfUrl = api.reportPdfUrl('profit-loss', {
    from: range.from,
    to: range.to,
    charts: includeCharts,
  })

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <CardHeader
          title="Profit & Loss"
          subtitle={`Realized from sales and unrealized on holdings acquired · ${formatRangeLabel(range)}`}
        />
        <div className="flex flex-col items-end gap-2">
          <label className="flex items-center gap-2 text-sm text-vault-600">
            <input
              type="checkbox"
              checked={includeCharts}
              onChange={(e) => setIncludeCharts(e.target.checked)}
              className="rounded border-vault-300 text-gold-500 focus:ring-gold-400"
            />
            Include charts
          </label>
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
      </div>

      <DateRangeFilter
        preset={preset}
        onPresetChange={setPreset}
        customFrom={customFrom}
        customTo={customTo}
        onCustomFromChange={setCustomFrom}
        onCustomToChange={setCustomTo}
      />

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="rounded-md bg-vault-50 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-vault-400">Realized P/L</p>
          <p
            className={`mt-1 text-lg font-bold ${
              realizedPl >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            {formatCurrency(realizedPl)}
          </p>
          <p className="text-xs text-vault-500">{sales.length} sales</p>
        </div>
        <div className="rounded-md bg-vault-50 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-vault-400">Unrealized P/L</p>
          <p
            className={`mt-1 text-lg font-bold ${
              unrealizedPl >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            {formatCurrency(unrealizedPl)}
          </p>
          <p className="text-xs text-vault-500">{unrealizedRows.length} holdings</p>
        </div>
        <div className="rounded-md bg-vault-50 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-vault-400">Total P/L</p>
          <p
            className={`mt-1 text-lg font-bold ${
              totalPl >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            {formatCurrency(totalPl)}
          </p>
        </div>
        <div className="rounded-md bg-vault-50 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-vault-400">Unrealized ROI</p>
          <p
            className={`mt-1 text-lg font-bold ${
              totalRoi >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            {totalRoi.toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-vault-800">Realized (sales)</h3>
          {sales.length === 0 ? (
            <p className="text-sm text-vault-500">No sales in this period.</p>
          ) : (
            <DataTable
              keyField="id"
              data={sales}
              exportFilename="vaultbox-realized-pl"
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
                  key: 'cost',
                  header: 'Cost Basis',
                  getCsvValue: (s) => formatCurrency(s.cost),
                  render: (s) => formatCurrency(s.cost),
                },
                {
                  key: 'proceeds',
                  header: 'Proceeds',
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

        <div>
          <h3 className="mb-2 text-sm font-semibold text-vault-800">
            Unrealized (active holdings acquired in period)
          </h3>
          {unrealizedRows.length === 0 ? (
            <p className="text-sm text-vault-500">No active holdings acquired in this period.</p>
          ) : (
            <DataTable
              keyField="id"
              data={unrealizedRows}
              exportFilename="vaultbox-unrealized-pl"
              columns={[
                {
                  key: 'name',
                  header: 'Item',
                  getCsvValue: (r) => r.holding.name,
                  render: (r) => (
                    <Link
                      to={`/inventory/${r.holding.id}`}
                      className="font-medium text-gold-500 hover:underline"
                    >
                      {r.holding.name}
                    </Link>
                  ),
                },
                {
                  key: 'metal',
                  header: 'Metal',
                  getCsvValue: (r) =>
                    r.holding.metalType
                      ? METAL_LABELS[r.holding.metalType as keyof typeof METAL_LABELS]
                      : '—',
                  render: (r) =>
                    r.holding.metalType ? (
                      <Badge variant={r.holding.metalType as 'gold'}>
                        {METAL_LABELS[r.holding.metalType as keyof typeof METAL_LABELS]}
                      </Badge>
                    ) : (
                      '—'
                    ),
                },
                {
                  key: 'cost',
                  header: 'Cost',
                  getCsvValue: (r) => formatCurrency(r.cost),
                  render: (r) => formatCurrency(r.cost),
                },
                {
                  key: 'spot',
                  header: 'Spot',
                  getCsvValue: (r) => formatCurrency(r.spot),
                  render: (r) => formatCurrency(r.spot),
                },
                {
                  key: 'gain',
                  header: 'Gain/Loss',
                  getCsvValue: (r) => `${formatCurrency(r.gain)} (${r.gainPercent.toFixed(1)}%)`,
                  render: (r) => (
                    <span className={r.gain >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                      {formatCurrency(r.gain)} ({r.gainPercent.toFixed(1)}%)
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