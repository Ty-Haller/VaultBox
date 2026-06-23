import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { VaultAuditWidget } from '../components/vaults/VaultAuditWidget'
import { useVault } from '../context/VaultContext'
import { ActionBar } from '../components/ui/ActionBar'
import { PhotoGallery } from '../components/media/PhotoGallery'
import { usePrices } from '../hooks/usePrices'
import {
  cryptoPricesToRecord,
  holdingSpotValue,
  pricesToRecord,
  pureMetalOz,
  vaultUtilization,
} from '../lib/calculations'
import { formatCurrency, formatDate, formatOz } from '../lib/utils'
import { ASSET_CLASS_LABELS, FORM_FACTOR_LABELS, METAL_LABELS, VAULT_TYPE_LABELS } from '../types'
import { Badge } from '../components/ui/Badge'
import { Card, CardHeader } from '../components/ui/Card'
import { MetadataGrid } from '../components/ui/MetadataGrid'
import { DataTable } from '../components/ui/DataTable'

export function VaultDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getVault, getSite, getHoldingsByVault, holdings, deleteVault, refresh } = useVault()
  const { prices, cryptoPrices } = usePrices()
  const priceMap = pricesToRecord(prices)
  const cryptoMap = cryptoPricesToRecord(cryptoPrices)

  const vault = getVault(id!)
  if (!vault) {
    return (
      <div className="text-center text-vault-500">
        Vault not found. <Link to="/vaults" className="text-gold-500">Back to vaults</Link>
      </div>
    )
  }

  const site = getSite(vault.siteId)
  const vHoldings = getHoldingsByVault(vault.id)
  const oz = vHoldings.reduce((s, h) => s + pureMetalOz(h), 0)
  const value = vHoldings.reduce((s, h) => s + holdingSpotValue(h, priceMap, cryptoMap), 0)
  const util = vaultUtilization(vault, holdings)

  const handleDelete = async () => {
    if (!confirm(`Delete vault "${vault.name}" and all holdings inside?`)) return
    await deleteVault(vault.id)
    navigate('/vaults')
  }

  return (
    <div className="space-y-6">
      <ActionBar
        addLabel="Add Vault"
        addTo="/vaults/new"
        editTo={`/vaults/${vault.id}/edit`}
        onDelete={handleDelete}
        deleteLabel="Delete Vault"
      />

      <div className="flex items-start gap-4">
        <Link to="/vaults" className="mt-1 rounded-md p-1.5 text-vault-500 hover:bg-vault-100">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-vault-900">{vault.name}</h2>
            <Badge>{VAULT_TYPE_LABELS[vault.type]}</Badge>
            <Badge variant="info">Security L{vault.securityLevel}</Badge>
          </div>
          {site && (
            <p className="mt-1 text-sm text-vault-500">
              Located at{' '}
              <Link to={`/sites/${site.id}`} className="text-gold-500 hover:underline">
                {site.name}
              </Link>
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gold-500">{formatCurrency(value)}</p>
          <p className="text-sm text-vault-500">{formatOz(oz)} · {vHoldings.length} items</p>
        </div>
      </div>

      <VaultAuditWidget vault={vault} />

      {util && (
        <Card>
          <CardHeader title="Capacity Utilization" subtitle={`${util.percent.toFixed(1)}% of rated capacity`} />
          <div className="h-3 overflow-hidden rounded-full bg-vault-100">
            <div
              className="h-full rounded-full bg-gold-500 transition-all"
              style={{ width: `${Math.min(util.percent, 100)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-vault-500">
            {formatOz(util.used)} used of {formatOz(util.capacity)} capacity
          </p>
        </Card>
      )}

      <Card>
        <CardHeader title="Vault Metadata" />
        <MetadataGrid
          columns={4}
          items={[
            { label: 'Manufacturer', value: vault.manufacturer },
            { label: 'Model', value: vault.model },
            { label: 'Serial Number', value: vault.serialNumber, mono: true },
            { label: 'Fire Rating', value: vault.fireRating },
            { label: 'Install Date', value: vault.installDate ? formatDate(vault.installDate) : undefined },
            { label: 'Last Audit', value: vault.lastAuditDate ? formatDate(vault.lastAuditDate) : undefined },
            { label: 'Weight Capacity', value: vault.weightCapacityLbs ? `${vault.weightCapacityLbs} lbs` : undefined },
            { label: 'Capacity (oz)', value: vault.capacityOz ? formatOz(vault.capacityOz) : undefined },
            { label: 'Capacity alert at', value: vault.capacityAlertThresholdPct != null ? `${vault.capacityAlertThresholdPct}%` : 'System default' },
            { label: 'Audit interval', value: vault.auditIntervalDaysOverride != null ? `${vault.auditIntervalDaysOverride} days` : 'Workflow default' },
            { label: 'Audit reminder', value: vault.auditReminderDaysOverride != null ? `${vault.auditReminderDaysOverride} days before` : 'Workflow default' },
            { label: 'Audit refire', value: vault.auditRefireHoursOverride != null ? `${vault.auditRefireHoursOverride}h` : 'Default 72h' },
          ]}
        />
        {vault.description && (
          <p className="mt-4 text-sm text-vault-600">{vault.description}</p>
        )}
      </Card>

      <PhotoGallery photos={vault.photos ?? []} vaultId={vault.id} onChange={refresh} />

      <Card>
        <CardHeader title="Inventory" subtitle={`${vHoldings.length} holdings in this vault`} />
        <DataTable
          keyField="id"
          data={vHoldings}
          onRowClick={(h) => (window.location.href = `/inventory/${h.id}`)}
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
              key: 'class',
              header: 'Class',
              render: (h) => ASSET_CLASS_LABELS[h.assetClass] ?? h.assetClass,
            },
            {
              key: 'metal',
              header: 'Metal',
              render: (h) => h.metalType ? <Badge variant={h.metalType as 'gold'}>{METAL_LABELS[h.metalType as keyof typeof METAL_LABELS]}</Badge> : '—',
            },
            {
              key: 'form',
              header: 'Form',
              render: (h) => h.formFactor ? FORM_FACTOR_LABELS[h.formFactor as keyof typeof FORM_FACTOR_LABELS] : '—',
            },
            {
              key: 'oz',
              header: 'Pure Oz',
              render: (h) => <span className="font-mono text-xs">{formatOz(pureMetalOz(h))}</span>,
            },
            {
              key: 'location',
              header: 'Position',
              render: (h) => h.vaultLocation ?? '—',
            },
            {
              key: 'value',
              header: 'Spot Value',
              render: (h) => formatCurrency(holdingSpotValue(h, priceMap, cryptoMap)),
            },
          ]}
        />
      </Card>

    </div>
  )
}