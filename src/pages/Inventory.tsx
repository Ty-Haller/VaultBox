import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Filter } from 'lucide-react'
import { useVault } from '../context/VaultContext'
import { useAdmin } from '../context/AdminContext'
import { usePrices } from '../hooks/usePrices'
import {
  cryptoPricesToRecord,
  holdingGainLoss,
  holdingSpotValue,
  pricesToRecord,
  pureMetalOz,
} from '../lib/calculations'
import { holdingBaseName, holdingDisplayName } from '../lib/holdingDisplay'
import {
  loadVisibleColumns,
  type InventoryColumnKey,
} from '../lib/inventoryColumns'
import { ColumnPicker } from '../components/inventory/ColumnPicker'
import { formatCurrency, formatDate, formatOz } from '../lib/utils'
import {
  ASSET_CLASS_LABELS,
  FORM_FACTOR_LABELS,
  HOLDING_STATUS_LABELS,
  METAL_LABELS,
  STORAGE_TYPE_LABELS,
  type Holding,
  type InventoryStatusFilter,
  type MetalType,
} from '../types'
import { ActionBar } from '../components/ui/ActionBar'
import { FilterableDataTable, type FilterableColumn } from '../components/ui/FilterableDataTable'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'

const STATUS_OPTIONS: { value: InventoryStatusFilter; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'sold', label: 'Sold' },
  { value: 'stolen', label: 'Stolen' },
  { value: 'archived', label: 'Archived' },
]

function matchesStatus(holding: { status?: string }, status: InventoryStatusFilter): boolean {
  const s = holding.status ?? 'active'
  if (status === 'active') return s === 'active'
  if (status === 'sold') return s === 'sold'
  if (status === 'stolen') return s === 'stolen'
  if (status === 'archived') return s === 'deleted'
  return true
}

export function Inventory() {
  const navigate = useNavigate()
  const { holdings, vaults, getVault } = useVault()
  const { activeProductTypes, activeMetalTypes, activeCryptoTokens, activeAssetCategories } = useAdmin()
  const { prices, cryptoPrices } = usePrices()
  const priceMap = pricesToRecord(prices)
  const cryptoMap = cryptoPricesToRecord(cryptoPrices)

  const [statusFilter, setStatusFilter] = useState<InventoryStatusFilter>('active')
  const [vaultFilter, setVaultFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [visibleColumns, setVisibleColumns] = useState<InventoryColumnKey[]>(loadVisibleColumns)

  const statusPool = useMemo(
    () => holdings.filter((h) => matchesStatus(h, statusFilter)),
    [holdings, statusFilter]
  )

  const vaultOptions = useMemo(() => {
    const ids = new Set(statusPool.map((h) => h.vaultId))
    return vaults.filter((v) => ids.has(v.id))
  }, [statusPool, vaults])

  const vaultPool = useMemo(() => {
    if (vaultFilter === 'all') return statusPool
    return statusPool.filter((h) => h.vaultId === vaultFilter)
  }, [statusPool, vaultFilter])

  const categoryOptions = useMemo(() => {
    const ids = new Set(vaultPool.map((h) => h.assetCategoryId).filter(Boolean))
    const cats = activeAssetCategories.filter((c) => ids.has(c.id))
    const hasUncategorized = vaultPool.some((h) => !h.assetCategoryId)
    return { cats, hasUncategorized }
  }, [vaultPool, activeAssetCategories])

  useEffect(() => {
    if (vaultFilter !== 'all' && !vaultOptions.some((v) => v.id === vaultFilter)) {
      setVaultFilter('all')
    }
  }, [vaultFilter, vaultOptions])

  useEffect(() => {
    if (categoryFilter === 'all' || categoryFilter === 'none') return
    if (!categoryOptions.cats.some((c) => c.id === categoryFilter)) {
      setCategoryFilter('all')
    }
    if (categoryFilter === 'none' && !categoryOptions.hasUncategorized) {
      setCategoryFilter('all')
    }
  }, [categoryFilter, categoryOptions])

  const metalLabel = (slug: string) =>
    activeMetalTypes.find((m) => m.slug === slug)?.name
    ?? METAL_LABELS[slug as MetalType]
    ?? slug

  const productLabel = (h: Holding) => {
    if (h.assetClass === 'crypto') {
      return h.cryptoSymbol ?? activeCryptoTokens.find((t) => t.id === h.cryptoTokenTypeId)?.symbol ?? '—'
    }
    const pt = activeProductTypes.find((p) => p.id === h.productTypeId)
    return pt?.name ?? (h.metalType ? metalLabel(h.metalType) : '—')
  }

  const storageLabel = (h: Holding) => {
    if (h.assetClass !== 'bullion' || !h.storageType) return '—'
    const base = STORAGE_TYPE_LABELS[h.storageType as keyof typeof STORAGE_TYPE_LABELS] ?? h.storageType
    return h.storageType === 'other' && h.storageNotes ? `${base}: ${h.storageNotes}` : base
  }

  const filtered = useMemo(() => {
    return vaultPool.filter((h) => {
      if (categoryFilter === 'none' && h.assetCategoryId) return false
      if (categoryFilter !== 'all' && categoryFilter !== 'none' && h.assetCategoryId !== categoryFilter) {
        return false
      }
      if (search) {
        const q = search.toLowerCase()
        const display = holdingDisplayName(h, activeProductTypes, activeCryptoTokens)
        const token = activeCryptoTokens.find((t) => t.id === h.cryptoTokenTypeId)
        const category = activeAssetCategories.find((c) => c.id === h.assetCategoryId)
        return (
          display.toLowerCase().includes(q) ||
          (h.subName ?? '').toLowerCase().includes(q) ||
          (h.name ?? '').toLowerCase().includes(q) ||
          (h.dealer ?? '').toLowerCase().includes(q) ||
          (h.cryptoSymbol ?? '').toLowerCase().includes(q) ||
          (token?.symbol ?? '').toLowerCase().includes(q) ||
          (category?.name ?? '').toLowerCase().includes(q) ||
          h.serialNumber?.toLowerCase().includes(q) ||
          h.tags.some((t) => t.toLowerCase().includes(q))
        )
      }
      return true
    })
  }, [vaultPool, categoryFilter, search, activeProductTypes, activeCryptoTokens, activeAssetCategories])

  const counts = useMemo(() => ({
    active: holdings.filter((h) => matchesStatus(h, 'active')).length,
    sold: holdings.filter((h) => matchesStatus(h, 'sold')).length,
    stolen: holdings.filter((h) => matchesStatus(h, 'stolen')).length,
    archived: holdings.filter((h) => matchesStatus(h, 'archived')).length,
  }), [holdings])

  const allColumns: FilterableColumn<Holding>[] = useMemo(() => [
    {
      key: 'name',
      header: 'Item',
      sortable: true,
      filterable: true,
      getSortValue: (h) => holdingBaseName(h, activeProductTypes, activeCryptoTokens),
      getFilterValue: (h) => holdingBaseName(h, activeProductTypes, activeCryptoTokens),
      getCsvValue: (h) => {
        const base = holdingBaseName(h, activeProductTypes, activeCryptoTokens)
        return h.serialNumber ? `${base} (${h.serialNumber})` : base
      },
      render: (h) => {
        const display = holdingBaseName(h, activeProductTypes, activeCryptoTokens)
        return (
          <div>
            <Link
              to={`/inventory/${h.id}`}
              className="font-medium text-gold-500 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {display}
            </Link>
            {h.serialNumber && <p className="font-mono text-[10px] text-vault-400">{h.serialNumber}</p>}
          </div>
        )
      },
    },
    {
      key: 'subName',
      header: 'Sub-name',
      sortable: true,
      filterable: true,
      getSortValue: (h) => h.subName ?? '—',
      getFilterValue: (h) => h.subName?.trim() || '—',
      render: (h) => h.subName?.trim() || '—',
    },
    {
      key: 'class',
      header: 'Type',
      sortable: true,
      filterable: true,
      getSortValue: (h) => ASSET_CLASS_LABELS[h.assetClass],
      getFilterValue: (h) => ASSET_CLASS_LABELS[h.assetClass],
      getCsvValue: (h) =>
        h.status && h.status !== 'active'
          ? `${ASSET_CLASS_LABELS[h.assetClass]} (${HOLDING_STATUS_LABELS[h.status]})`
          : ASSET_CLASS_LABELS[h.assetClass],
      render: (h) => (
        <div className="flex flex-wrap gap-1">
          <Badge>{ASSET_CLASS_LABELS[h.assetClass]}</Badge>
          {h.status && h.status !== 'active' && (
            <Badge variant="warning">{HOLDING_STATUS_LABELS[h.status]}</Badge>
          )}
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      sortable: true,
      filterable: true,
      getSortValue: (h) => activeAssetCategories.find((c) => c.id === h.assetCategoryId)?.name ?? '—',
      getFilterValue: (h) => activeAssetCategories.find((c) => c.id === h.assetCategoryId)?.name ?? '—',
      render: (h) => activeAssetCategories.find((c) => c.id === h.assetCategoryId)?.name ?? '—',
    },
    {
      key: 'detail',
      header: 'Product / Token',
      sortable: true,
      filterable: true,
      getSortValue: (h) => productLabel(h),
      getFilterValue: (h) => productLabel(h),
      render: (h) => {
        const label = productLabel(h)
        return h.assetClass === 'crypto'
          ? <span className="font-mono text-xs font-semibold">{label}</span>
          : label
      },
    },
    {
      key: 'weight',
      header: 'Qty / Oz',
      sortable: true,
      filterable: true,
      getSortValue: (h) => h.assetClass === 'crypto' ? (h.cryptoQuantity ?? 0) : h.quantity,
      getFilterValue: (h) => {
        if (h.assetClass === 'crypto') return h.cryptoQuantity != null ? String(h.cryptoQuantity) : '—'
        return `${h.quantity} × ${formatOz(pureMetalOz(h) / (h.quantity || 1))}`
      },
      render: (h) => {
        if (h.assetClass === 'crypto') {
          return <span className="font-mono text-xs">{h.cryptoQuantity != null ? h.cryptoQuantity : '—'}</span>
        }
        return (
          <span className="font-mono text-xs">
            {h.quantity} × {formatOz(pureMetalOz(h) / (h.quantity || 1))}
          </span>
        )
      },
    },
    {
      key: 'form',
      header: 'Form',
      sortable: true,
      filterable: true,
      getSortValue: (h) => h.formFactor ? FORM_FACTOR_LABELS[h.formFactor] : '—',
      getFilterValue: (h) => h.formFactor ? FORM_FACTOR_LABELS[h.formFactor] : '—',
      render: (h) => h.assetClass === 'crypto' ? '—' : (h.formFactor ? FORM_FACTOR_LABELS[h.formFactor] : '—'),
    },
    {
      key: 'storage',
      header: 'Storage',
      sortable: true,
      filterable: true,
      getSortValue: (h) => storageLabel(h),
      getFilterValue: (h) => storageLabel(h),
      render: (h) => storageLabel(h),
    },
    {
      key: 'vault',
      header: 'Vault',
      sortable: true,
      filterable: true,
      getSortValue: (h) => getVault(h.vaultId)?.name ?? '—',
      getFilterValue: (h) => getVault(h.vaultId)?.name ?? '—',
      render: (h) => {
        const v = getVault(h.vaultId)
        return v ? (
          <Link to={`/vaults/${v.id}`} className="text-vault-600 hover:text-gold-500" onClick={(e) => e.stopPropagation()}>
            {v.name}
          </Link>
        ) : '—'
      },
    },
    {
      key: 'purchase',
      header: 'Acquired',
      sortable: true,
      filterable: true,
      getSortValue: (h) => h.purchaseDate ?? '',
      getFilterValue: (h) => h.purchaseDate ? formatDate(h.purchaseDate) : '—',
      render: (h) => h.purchaseDate ? formatDate(h.purchaseDate) : '—',
    },
    {
      key: 'cost',
      header: 'Cost',
      sortable: true,
      filterable: true,
      getSortValue: (h) => (h.purchasePrice ?? 0) * h.quantity,
      getFilterValue: (h) => (h.purchasePrice ?? 0) > 0 ? formatCurrency((h.purchasePrice ?? 0) * h.quantity) : '—',
      render: (h) => (h.purchasePrice ?? 0) > 0 ? formatCurrency((h.purchasePrice ?? 0) * h.quantity) : '—',
    },
    {
      key: 'spot',
      header: 'Value',
      sortable: true,
      filterable: true,
      getSortValue: (h) => holdingSpotValue(h, priceMap, cryptoMap),
      getFilterValue: (h) => formatCurrency(holdingSpotValue(h, priceMap, cryptoMap)),
      getCsvValue: (h) => {
        const spot = holdingSpotValue(h, priceMap, cryptoMap)
        const { gainPercent } = holdingGainLoss(h, spot)
        return `${formatCurrency(spot)} (${gainPercent >= 0 ? '+' : ''}${gainPercent.toFixed(1)}%)`
      },
      render: (h) => {
        const spot = holdingSpotValue(h, priceMap, cryptoMap)
        const { gainPercent } = holdingGainLoss(h, spot)
        return (
          <div>
            <span className="font-mono text-xs">{formatCurrency(spot)}</span>
            <span className={`ml-2 text-[10px] ${gainPercent >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {gainPercent >= 0 ? '+' : ''}{gainPercent.toFixed(1)}%
            </span>
          </div>
        )
      },
    },
    {
      key: 'dealer',
      header: 'Dealer',
      sortable: true,
      filterable: true,
      getSortValue: (h) => h.dealer ?? '—',
      getFilterValue: (h) => h.dealer ?? '—',
      render: (h) => h.dealer ?? '—',
    },
  ], [activeProductTypes, activeCryptoTokens, activeAssetCategories, activeMetalTypes, getVault, priceMap, cryptoMap])

  const columns = useMemo(
    () => allColumns.filter((c) => visibleColumns.includes(c.key as InventoryColumnKey)),
    [allColumns, visibleColumns]
  )

  return (
    <div className="space-y-4">
      <ActionBar addLabel="Add Holding" addTo="/inventory/new" />

      <div className="flex flex-wrap gap-3 text-sm text-vault-500">
        <span>{filtered.length} shown</span>
        <span>
          {counts.active} active · {counts.sold} sold · {counts.stolen} stolen · {counts.archived} archived
        </span>
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Filter className="h-4 w-4 shrink-0 text-vault-400" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as InventoryStatusFilter)
              setVaultFilter('all')
              setCategoryFilter('all')
            }}
            className="rounded-md border border-vault-200 px-3 py-1.5 text-sm font-medium"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={vaultFilter}
            onChange={(e) => {
              setVaultFilter(e.target.value)
              setCategoryFilter('all')
            }}
            className="rounded-md border border-vault-200 px-3 py-1.5 text-sm"
          >
            <option value="all">All Vaults</option>
            {vaultOptions.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-md border border-vault-200 px-3 py-1.5 text-sm"
          >
            <option value="all">All Categories</option>
            {categoryOptions.cats.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
            {categoryOptions.hasUncategorized && (
              <option value="none">Uncategorized</option>
            )}
          </select>
          <input
            type="search"
            placeholder="Search sub-name, dealer, serial, tags…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-[200px] flex-1 rounded-md border border-vault-200 px-3 py-1.5 text-sm focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500"
          />
          <ColumnPicker visible={visibleColumns} onChange={setVisibleColumns} />
        </div>

        <p className="mb-3 text-xs text-vault-400">
          Choose visible columns, then use column header menus to sort or filter within the current results.
        </p>

        <FilterableDataTable
          keyField="id"
          data={filtered}
          columns={columns}
          exportFilename="vaultbox-inventory"
          onRowClick={(h) => navigate(`/inventory/${h.id}`)}
        />
      </Card>
    </div>
  )
}