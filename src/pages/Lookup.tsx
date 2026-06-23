import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { QrCode, Search } from 'lucide-react'
import { api } from '../lib/api'
import type { Holding } from '../types'
import { METAL_LABELS, FORM_FACTOR_LABELS } from '../types'
import { formatCurrency, formatDate, formatOz } from '../lib/utils'
import { pureMetalOz } from '../lib/calculations'
import { Badge } from '../components/ui/Badge'
import { Card, CardHeader } from '../components/ui/Card'
import { MetadataGrid } from '../components/ui/MetadataGrid'
import { useVault } from '../context/VaultContext'

export function Lookup() {
  const { code } = useParams<{ code: string }>()
  const { getVault, getSite, refresh } = useVault()
  const [holding, setHolding] = useState<Holding | null>(null)
  const [searchCode, setSearchCode] = useState(code ?? '')
  const [loading, setLoading] = useState(!!code)
  const [error, setError] = useState<string | null>(null)

  const lookup = async (qr: string) => {
    if (!qr.trim()) return
    setLoading(true)
    setError(null)
    try {
      const result = await api.lookupByQR(qr.trim())
      setHolding(result)
      await refresh()
    } catch {
      setHolding(null)
      setError(`No holding found for code "${qr}"`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (code) lookup(code)
  }, [code])

  const vault = holding ? getVault(holding.vaultId) : undefined
  const site = vault ? getSite(vault.siteId) : undefined

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <QrCode className="mx-auto h-10 w-10 text-gold-500" />
        <h2 className="mt-2 text-xl font-bold text-vault-900">QR Code Lookup</h2>
        <p className="text-sm text-vault-500">Scan a VaultBox label or enter a QR code</p>
      </div>

      <Card>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-vault-400" />
            <input
              type="text"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && lookup(searchCode)}
              placeholder="Enter QR code (e.g. A1B2C3D4E5F6)"
              className="w-full rounded-md border border-vault-200 py-2 pl-9 pr-3 font-mono text-sm uppercase focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500"
            />
          </div>
          <button
            type="button"
            onClick={() => lookup(searchCode)}
            disabled={loading}
            className="rounded-md bg-gold-500 px-4 py-2 text-sm font-medium text-white hover:bg-gold-400 disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Lookup'}
          </button>
        </div>
      </Card>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {holding && (
        <>
          <Card>
            <CardHeader title={holding.name} subtitle={`QR: ${holding.qrCode}`} />
            <div className="mb-4 flex flex-wrap gap-2">
              {holding.metalType && <Badge variant={holding.metalType}>{METAL_LABELS[holding.metalType]}</Badge>}
              {holding.formFactor && <Badge>{FORM_FACTOR_LABELS[holding.formFactor]}</Badge>}
              {holding.insured && <Badge variant="success">Insured</Badge>}
            </div>
            <MetadataGrid
              items={[
                { label: 'Pure Metal', value: formatOz(pureMetalOz(holding)) },
                { label: 'Quantity', value: holding.quantity },
                { label: 'Serial Number', value: holding.serialNumber, mono: true },
                { label: 'Purchase Date', value: holding.purchaseDate ? formatDate(holding.purchaseDate) : undefined },
                { label: 'Cost Basis', value: (holding.purchasePrice ?? 0) > 0 ? formatCurrency((holding.purchasePrice ?? 0) * holding.quantity) : undefined },
                { label: 'Vault', value: vault ? <Link to={`/vaults/${vault.id}`} className="text-gold-500 hover:underline">{vault.name}</Link> : '—' },
                { label: 'Site', value: site ? <Link to={`/sites/${site.id}`} className="text-gold-500 hover:underline">{site.name}</Link> : '—' },
                { label: 'Position', value: holding.vaultLocation },
              ]}
            />
            <div className="mt-4 text-center">
              <Link to={`/inventory/${holding.id}`} className="text-sm font-medium text-gold-500 hover:underline">
                View full record →
              </Link>
            </div>
          </Card>

          {holding.photos && holding.photos.length > 0 && (
            <Card>
              <CardHeader title="Photos" />
              <div className="grid grid-cols-2 gap-3">
                {holding.photos.map((p) => (
                  <img key={p.id} src={p.url} alt={p.caption} className="rounded-lg border border-vault-200" />
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}