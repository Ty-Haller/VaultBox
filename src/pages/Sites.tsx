import { Link } from 'react-router-dom'
import { MapPin, Building } from 'lucide-react'
import { useVault } from '../context/VaultContext'
import { ActionBar } from '../components/ui/ActionBar'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'

export function Sites() {
  const { sites, getVaultsBySite } = useVault()

  return (
    <div className="space-y-4">
      <ActionBar addLabel="Add Site" addTo="/sites/new" />
      <p className="text-sm text-vault-500">{sites.length} physical locations</p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {sites.map((site) => {
          const siteVaults = getVaultsBySite(site.id)
          return (
            <Link key={site.id} to={`/sites/${site.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-vault-100">
                    <Building className="h-6 w-6 text-vault-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-vault-900">{site.name}</h3>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-vault-500">
                      <MapPin className="h-3 w-3" />
                      {site.city}, {site.state} {site.country}
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm text-vault-600">{site.description}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-vault-500">
                        {siteVaults.length} vault{siteVaults.length !== 1 ? 's' : ''}
                      </span>
                      {site.tags.map((t) => <Badge key={t}>{t}</Badge>)}
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}