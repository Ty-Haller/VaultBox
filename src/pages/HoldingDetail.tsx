import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Tag } from 'lucide-react'
import { useVault } from '../context/VaultContext'
import { useAdmin } from '../context/AdminContext'
import { usePrices } from '../hooks/usePrices'
import {
  holdingGainLoss,
  holdingSpotValue,
  isActiveHolding,
  pricesToRecord,
  pureMetalOz,
  cryptoPricesToRecord,
} from '../lib/calculations'
import { holdingDisplayName } from '../lib/holdingDisplay'
import { formatCurrency, formatDate, formatDateTime, formatOz } from '../lib/utils'
import {
  ASSET_CLASS_LABELS,
  FORM_FACTOR_LABELS,
  STORAGE_TYPE_LABELS,
  HOLDING_STATUS_LABELS,
  METAL_LABELS,
  VAULT_TYPE_LABELS,
  WALLET_TYPE_LABELS,
} from '../types'
import { ActionBar } from '../components/ui/ActionBar'
import { TransactModal } from '../components/holdings/TransactModal'
import { DocumentSection } from '../components/media/DocumentSection'
import { PhotoGallery } from '../components/media/PhotoGallery'
import { QRCodePanel } from '../components/media/QRCodePanel'
import { Badge } from '../components/ui/Badge'
import { Card, CardHeader } from '../components/ui/Card'
import { MetadataGrid } from '../components/ui/MetadataGrid'

export function HoldingDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getHolding, getVault, getSite, transactHolding, refresh } = useVault()
  const { activeCryptoTokens, activeProductTypes } = useAdmin()
  const { prices, cryptoPrices } = usePrices()
  const priceMap = pricesToRecord(prices)
  const cryptoMap = cryptoPricesToRecord(cryptoPrices)
  const [showTransact, setShowTransact] = useState(false)

  const holding = getHolding(id!)
  if (!holding) {
    return (
      <div className="text-center text-vault-500">
        Holding not found. <Link to="/inventory" className="text-gold-500">Back to inventory</Link>
      </div>
    )
  }

  const vault = getVault(holding.vaultId)
  const site = vault ? getSite(vault.siteId) : undefined
  const isCrypto = holding.assetClass === 'crypto'
  const isArchived = !isActiveHolding(holding)
  const spot = holdingSpotValue(holding, priceMap, cryptoMap)
  const { cost, gain, gainPercent } = holdingGainLoss(holding, spot)
  const token = activeCryptoTokens.find((t) => t.id === holding.cryptoTokenTypeId)

  const handleTransact = async (data: Parameters<typeof transactHolding>[1]) => {
    await transactHolding(holding.id, data)
    navigate('/inventory')
  }

  return (
    <div className="space-y-6">
      <ActionBar
        addLabel="Add Holding"
        addTo="/inventory/new"
        editTo={isArchived ? undefined : `/inventory/${holding.id}/edit`}
        onTransact={isArchived ? undefined : () => setShowTransact(true)}
        transactLabel="Transact"
      />

      {isArchived && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>Archived</strong> — {HOLDING_STATUS_LABELS[holding.status ?? 'deleted']}
          {holding.transactionDate && <> on {formatDate(holding.transactionDate)}</>}
          {holding.archivedAt && <> (recorded {formatDateTime(holding.archivedAt)})</>}
        </div>
      )}

      <div className="flex items-start gap-4">
        <Link to="/inventory" className="mt-1 rounded-md p-1.5 text-vault-500 hover:bg-vault-100">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-vault-900">
              {holdingDisplayName(holding, activeProductTypes, activeCryptoTokens)}
            </h2>
            <Badge>{ASSET_CLASS_LABELS[holding.assetClass]}</Badge>
            {holding.metalType && !isCrypto && <Badge variant={holding.metalType}>{METAL_LABELS[holding.metalType]}</Badge>}
            {isCrypto && (holding.cryptoSymbol || token?.symbol) && (
              <Badge variant="info">{holding.cryptoSymbol ?? token?.symbol}</Badge>
            )}
            {holding.formFactor && !isCrypto && <Badge>{FORM_FACTOR_LABELS[holding.formFactor]}</Badge>}
            {holding.insured && <Badge variant="success">Insured</Badge>}
            {isArchived && <Badge variant="warning">{HOLDING_STATUS_LABELS[holding.status ?? 'deleted']}</Badge>}
          </div>
          <p className="mt-1 text-sm text-vault-500">
            {vault && (
              <>
                <Link to={`/vaults/${vault.id}`} className="text-gold-500 hover:underline">{vault.name}</Link>
                {site && <> at <Link to={`/sites/${site.id}`} className="text-gold-500 hover:underline">{site.name}</Link></>}
              </>
            )}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gold-500">{formatCurrency(spot)}</p>
          {(holding.purchasePrice ?? 0) > 0 && (
            <p className={`text-sm ${gain >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {gain >= 0 ? '+' : ''}{formatCurrency(gain)} ({gainPercent.toFixed(1)}%)
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {isCrypto ? (
          <Card>
            <CardHeader title="Wallet & Token" />
            <MetadataGrid items={[
              { label: 'Token Type', value: token ? `${token.name} (${token.symbol})` : holding.cryptoSymbol },
              { label: 'Public Address', value: holding.publicAddress, mono: true },
              { label: 'On-Chain Quantity', value: holding.cryptoQuantity?.toString() },
              { label: 'Wallet Type', value: holding.walletType ? WALLET_TYPE_LABELS[holding.walletType] : undefined },
              { label: 'Wallet Location', value: holding.walletLocation },
              { label: 'Reported Value', value: holding.reportedValue != null ? formatCurrency(holding.reportedValue) : undefined },
              { label: 'Seed Phrase Stored', value: holding.hasSeedPhrase ? 'Yes (encrypted)' : 'No' },
            ]} />
          </Card>
        ) : (
          <Card>
            <CardHeader title="Physical Properties" />
            <MetadataGrid items={[
              { label: 'Weight (per unit)', value: holding.weightOz != null ? formatOz(holding.weightOz) : undefined },
              { label: 'Purity', value: holding.purity != null ? `${(holding.purity * 100).toFixed(2)}%` : undefined },
              { label: 'Pure Metal (total)', value: holding.weightOz != null ? formatOz(pureMetalOz(holding)) : undefined },
              { label: 'Quantity', value: holding.quantity },
              { label: 'Form Factor', value: holding.formFactor ? FORM_FACTOR_LABELS[holding.formFactor] : undefined },
              { label: 'Condition', value: holding.condition?.toUpperCase() },
              { label: 'Mint', value: holding.mint },
              { label: 'Year', value: holding.year },
              { label: 'Country', value: holding.country },
              { label: 'Serial Number', value: holding.serialNumber, mono: true },
              { label: 'Vault Location', value: holding.vaultLocation },
              {
                label: 'Storage',
                value: holding.storageType
                  ? (holding.storageType === 'other' && holding.storageNotes
                    ? `Other: ${holding.storageNotes}`
                    : (STORAGE_TYPE_LABELS[holding.storageType as keyof typeof STORAGE_TYPE_LABELS] ?? holding.storageType))
                  : undefined,
              },
            ]} />
          </Card>
        )}

        <Card>
          <CardHeader title={isCrypto ? 'Acquisition (optional)' : 'Acquisition & Valuation'} />
          <MetadataGrid items={[
            { label: 'Purchase Date', value: holding.purchaseDate ? formatDate(holding.purchaseDate) : undefined },
            { label: 'Dealer / Source', value: holding.dealer },
            { label: 'Invoice Number', value: holding.invoiceNumber, mono: true },
            { label: 'Unit Cost', value: holding.purchasePrice != null ? formatCurrency(holding.purchasePrice) : undefined },
            { label: 'Cost per Oz', value: !isCrypto && holding.purchasePricePerOz != null ? formatCurrency(holding.purchasePricePerOz) : undefined },
            { label: 'Total Cost Basis', value: (holding.purchasePrice ?? 0) > 0 ? formatCurrency(cost) : undefined },
            { label: 'Current Value', value: formatCurrency(spot) },
            { label: 'Unrealized Gain/Loss', value: (holding.purchasePrice ?? 0) > 0 ? formatCurrency(gain) : undefined },
            { label: 'Insured', value: holding.insured ? 'Yes' : 'No' },
            { label: 'Insurance Value', value: holding.insuranceValue ? formatCurrency(holding.insuranceValue) : undefined },
          ]} />
        </Card>

        {!isCrypto && (holding.gradingService || holding.certificateNumber) && (
          <Card>
            <CardHeader title="Grading & Certification" />
            <MetadataGrid items={[
              { label: 'Grading Service', value: holding.gradingService },
              { label: 'Grade', value: holding.grade },
              { label: 'Certificate #', value: holding.certificateNumber, mono: true },
            ]} />
          </Card>
        )}

        {isArchived && (
          <Card>
            <CardHeader title="Transaction Record" />
            <MetadataGrid items={[
              { label: 'Type', value: holding.transactionType ? HOLDING_STATUS_LABELS[holding.transactionType as keyof typeof HOLDING_STATUS_LABELS] : undefined },
              { label: 'Date', value: holding.transactionDate ? formatDate(holding.transactionDate) : undefined },
              { label: 'Sale Price', value: holding.salePrice != null ? formatCurrency(holding.salePrice) : undefined },
              { label: 'Buyer', value: holding.buyerName },
              { label: 'Insurance Claim', value: holding.insuranceClaimNumber, mono: true },
              { label: 'Notes', value: holding.transactionNotes },
            ]} />
          </Card>
        )}

        {vault && (
          <Card>
            <CardHeader title="Storage Location" />
            <MetadataGrid items={[
              { label: 'Vault', value: <Link to={`/vaults/${vault.id}`} className="text-gold-500 hover:underline">{vault.name}</Link> },
              { label: 'Vault Type', value: VAULT_TYPE_LABELS[vault.type] },
              { label: 'Site', value: site ? <Link to={`/sites/${site.id}`} className="text-gold-500 hover:underline">{site.name}</Link> : undefined },
              { label: 'Position in Vault', value: holding.vaultLocation },
              { label: 'Security Level', value: `${vault.securityLevel}/5` },
              { label: 'Last Audit', value: vault.lastAuditDate ? formatDate(vault.lastAuditDate) : undefined },
            ]} />
          </Card>
        )}
      </div>

      {(holding.valueGainAlertPct != null || holding.valueLossAlertPct != null) && (
        <Card>
          <CardHeader title="Value Alert Thresholds" />
          <MetadataGrid items={[
            { label: 'Gain alert', value: holding.valueGainAlertPct != null ? `${holding.valueGainAlertPct}%` : '—' },
            { label: 'Loss alert', value: holding.valueLossAlertPct != null ? `${holding.valueLossAlertPct}%` : '—' },
          ]} />
          <p className="mt-2 text-xs text-vault-500">Enable delivery in User Settings → Notification Preferences → Holding Value Alerts.</p>
        </Card>
      )}

      <QRCodePanel holdingId={holding.id} qrCode={holding.qrCode} name={holding.name} />

      <PhotoGallery
        photos={holding.photos ?? []}
        holdingId={holding.id}
        onChange={refresh}
      />

      <DocumentSection
        documents={holding.documents ?? []}
        holdingId={holding.id}
        onChange={refresh}
      />

      {(holding.notes || holding.tags.length > 0) && (
        <Card>
          <CardHeader title="Notes & Tags" />
          {holding.notes && <p className="mb-3 text-sm text-vault-700">{holding.notes}</p>}
          {holding.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {holding.tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-vault-100 px-2.5 py-0.5 text-xs text-vault-600">
                  <Tag className="h-3 w-3" />{tag}
                </span>
              ))}
            </div>
          )}
        </Card>
      )}

      <p className="text-xs text-vault-400">
        Created {formatDateTime(holding.createdAt)} · Updated {formatDateTime(holding.updatedAt)}
      </p>

      {showTransact && (
        <TransactModal
          holding={holding}
          onClose={() => setShowTransact(false)}
          onSubmit={handleTransact}
        />
      )}
    </div>
  )
}