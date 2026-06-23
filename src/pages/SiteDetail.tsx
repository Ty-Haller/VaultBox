import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, MapPin } from 'lucide-react'
import { useVault } from '../context/VaultContext'
import { usePrices } from '../hooks/usePrices'
import { holdingSpotValue, pricesToRecord, pureMetalOz } from '../lib/calculations'
import { formatCurrency, formatOz } from '../lib/utils'
import { VAULT_TYPE_LABELS } from '../types'
import { ActionBar } from '../components/ui/ActionBar'
import { PhotoGallery } from '../components/media/PhotoGallery'
import { Badge } from '../components/ui/Badge'
import { Card, CardHeader } from '../components/ui/Card'
import { MetadataGrid } from '../components/ui/MetadataGrid'

export function SiteDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getSite, getVaultsBySite, getHoldingsByVault, deleteSite, refresh } = useVault()
  const { prices } = usePrices()
  const priceMap = pricesToRecord(prices)

  const site = getSite(id!)
  if (!site) {
    return (
      <div className="text-center text-vault-500">
        Site not found. <Link to="/sites" className="text-gold-500">Back to sites</Link>
      </div>
    )
  }

  const siteVaults = getVaultsBySite(site.id)

  const handleDelete = async () => {
    if (!confirm(`Delete site "${site.name}" and all its vaults/holdings?`)) return
    await deleteSite(site.id)
    navigate('/sites')
  }

  return (
    <div className="space-y-6">
      <ActionBar
        addLabel="Add Site"
        addTo="/sites/new"
        editTo={`/sites/${site.id}/edit`}
        onDelete={handleDelete}
        deleteLabel="Delete Site"
      />

      <div className="flex items-start gap-4">
        <Link to="/sites" className="mt-1 rounded-md p-1.5 text-vault-500 hover:bg-vault-100">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-vault-900">{site.name}</h2>
          <p className="mt-1 flex items-center gap-1 text-sm text-vault-500">
            <MapPin className="h-3.5 w-3.5" />
            {site.address}, {site.city}, {site.state} {site.postalCode}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader title="Site Metadata" />
        <MetadataGrid columns={3} items={[
          { label: 'Address', value: site.address },
          { label: 'City', value: site.city },
          { label: 'State', value: site.state },
          { label: 'Country', value: site.country },
          { label: 'Postal Code', value: site.postalCode },
          { label: 'Coordinates', value: site.latitude ? `${site.latitude}, ${site.longitude}` : undefined, mono: true },
          { label: 'Contact', value: site.contactName },
          { label: 'Phone', value: site.contactPhone },
        ]} />
        {site.description && <p className="mt-4 text-sm text-vault-600">{site.description}</p>}
        {site.notes && <p className="mt-2 text-sm italic text-vault-500">{site.notes}</p>}
      </Card>

      <PhotoGallery photos={site.photos ?? []} siteId={site.id} onChange={refresh} />

      <div>
        <h3 className="mb-3 text-sm font-semibold text-vault-700">Vaults at this Site ({siteVaults.length})</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {siteVaults.map((vault) => {
            const vHoldings = getHoldingsByVault(vault.id)
            const oz = vHoldings.reduce((s, h) => s + pureMetalOz(h), 0)
            const value = vHoldings.reduce((s, h) => s + holdingSpotValue(h, priceMap), 0)
            return (
              <Link key={vault.id} to={`/vaults/${vault.id}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-vault-900">{vault.name}</h4>
                      <Badge className="mt-1">{VAULT_TYPE_LABELS[vault.type]}</Badge>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-semibold text-gold-500">{formatCurrency(value, true)}</p>
                      <p className="text-xs text-vault-500">{formatOz(oz)}</p>
                    </div>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>

    </div>
  )
}