import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import type { AdminProductType } from '../../types/admin'
import type { AssetClass, Condition, FormFactor, Holding, KitcoSearchResult, MetalType, StorageType, WalletType } from '../../types'
import { ASSET_CLASS_LABELS, FORM_FACTOR_LABELS, METAL_LABELS, STORAGE_TYPE_LABELS, WALLET_TYPE_LABELS } from '../../types'
import { useAdmin } from '../../context/AdminContext'
import { useVault } from '../../context/VaultContext'
import { api } from '../../lib/api'
import { isFieldVisible } from '../../lib/assetFieldConfig'
import {
  CRYPTO_TOKEN_CONFIG,
  DEALER_CONFIG,
  FORM_FACTOR_CONFIG,
  METAL_TYPE_CONFIG,
  PRODUCT_TYPE_CONFIG,
} from '../admin/fieldConfig'
import { FormField, inputClass, selectClass, TagsInput } from '../ui/FormField'
import { KitcoProductSearch } from './KitcoProductSearch'
import { SelectWithAdd } from './SelectWithAdd'

type HoldingInput = Omit<Holding, 'id' | 'createdAt' | 'updatedAt' | 'photos' | 'documents' | 'qrCode' | 'dealer'>

interface HoldingFormProps {
  initial?: Partial<Holding>
  onSubmit: (data: HoldingInput) => Promise<void>
  onCancel: () => void
}

function fieldsFromProductType(pt: AdminProductType): Partial<HoldingInput> {
  return {
    productTypeId: pt.id,
    name: pt.name,
    metalType: (pt.metalSlug as MetalType) || '',
    formFactor: (pt.formFactorSlug as FormFactor) || '',
    weightOz: pt.standardWeightOz ?? undefined,
    purity: pt.standardPurity ?? undefined,
    mint: pt.mint || undefined,
    country: pt.country || undefined,
  }
}

const empty: HoldingInput = {
  name: '',
  vaultId: '',
  assetClass: 'bullion',
  metalType: 'gold',
  formFactor: 'coin',
  weightOz: 1,
  purity: 0.9999,
  quantity: 1,
  purchaseDate: new Date().toISOString().split('T')[0],
  purchasePrice: 0,
  purchasePricePerOz: 0,
  dealerId: '',
  condition: 'bu',
  insured: false,
  notes: '',
  tags: [],
}

export function HoldingForm({ initial, onSubmit, onCancel }: HoldingFormProps) {
  const { vaults } = useVault()
  const {
    activeMetalTypes,
    activeFormFactorTypes,
    activeProductTypes,
    activeDealers,
    activeCryptoTokens,
  } = useAdmin()

  const metalOptions = activeMetalTypes.length > 0
    ? activeMetalTypes.map((m) => ({ value: m.slug, label: m.name }))
    : (Object.keys(METAL_LABELS) as MetalType[]).map((m) => ({ value: m, label: METAL_LABELS[m] }))
  const formOptions = activeFormFactorTypes.length > 0
    ? activeFormFactorTypes.map((f) => ({ value: f.slug, label: f.name }))
    : (Object.keys(FORM_FACTOR_LABELS) as FormFactor[]).map((f) => ({ value: f, label: FORM_FACTOR_LABELS[f] }))

  const [form, setForm] = useState<HoldingInput>({
    ...empty,
    ...initial,
    dealerId: initial?.dealerId ?? '',
    vaultId: initial?.vaultId ?? vaults[0]?.id ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [chainLoading, setChainLoading] = useState(false)
  const [chainWarning, setChainWarning] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const selectedCryptoToken = useMemo(
    () => activeCryptoTokens.find((t) => t.id === form.cryptoTokenTypeId),
    [activeCryptoTokens, form.cryptoTokenTypeId]
  )
  const chainLookupSupported = Boolean(
    selectedCryptoToken &&
      (['bitcoin', 'ethereum', 'dogecoin', 'litecoin'].includes((selectedCryptoToken.chain || '').toLowerCase()) ||
        ['BTC', 'ETH', 'DOGE', 'LTC'].includes((selectedCryptoToken.symbol || '').toUpperCase()))
  )

  const ac = form.assetClass
  const show = (field: Parameters<typeof isFieldVisible>[1]) => isFieldVisible(ac, field)

  const products = useMemo(
    () => (ac === 'bullion' ? activeProductTypes : []),
    [activeProductTypes, ac]
  )

  const set = <K extends keyof HoldingInput>(key: K, value: HoldingInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const fetchChainBalance = async () => {
    const token = activeCryptoTokens.find((t) => t.id === form.cryptoTokenTypeId)
    if (!form.publicAddress || !token) {
      setError('Enter a public address and select a token type first.')
      return
    }
    setChainLoading(true)
    setError(null)
    setChainWarning(null)
    try {
      const result = await api.fetchChainBalance(form.publicAddress, token.symbol, token.chain)
      if (result.balance != null) {
        set('cryptoQuantity', result.balance)
      } else if ((result.error ?? '').toLowerCase().includes('not supported')) {
        setChainWarning(result.error ?? 'Chain lookup is not supported for this token.')
      } else {
        setError(result.error ?? 'Could not fetch on-chain balance')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chain lookup failed')
    } finally {
      setChainLoading(false)
    }
  }

  const applyKitco = (r: KitcoSearchResult) => {
    const pt = r.productTypeId
      ? activeProductTypes.find((p) => p.id === r.productTypeId)
      : undefined
    setForm((f) => ({
      ...f,
      name: f.name || r.name,
      productTypeId: r.productTypeId ?? f.productTypeId,
      metalType: (pt?.metalSlug as MetalType) || (r.metalSlug as MetalType) || f.metalType,
      formFactor: (pt?.formFactorSlug as FormFactor) || (r.formFactorSlug as FormFactor) || f.formFactor,
      weightOz: r.standardWeightOz ?? pt?.standardWeightOz ?? f.weightOz,
      purity: r.standardPurity ?? pt?.standardPurity ?? f.purity,
      mint: r.mint || pt?.mint || f.mint,
      country: r.country || pt?.country || f.country,
      ...(pt ? fieldsFromProductType(pt) : {}),
    }))
  }

  const selectedProduct = form.productTypeId
    ? activeProductTypes.find((p) => p.id === form.productTypeId)
    : undefined

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const pt = form.productTypeId
        ? activeProductTypes.find((p) => p.id === form.productTypeId)
        : undefined
      const token = form.cryptoTokenTypeId
        ? activeCryptoTokens.find((t) => t.id === form.cryptoTokenTypeId)
        : undefined
      const baseName = pt?.name ?? token?.name ?? form.name ?? ''
      const payload = {
        ...form,
        name: baseName,
        subName: form.subName?.trim() || undefined,
        assetCategoryId: pt?.categoryId ?? undefined,
        cryptoSymbol: token?.symbol ?? form.cryptoSymbol,
        dealerId: form.dealerId || undefined,
      }
      await onSubmit(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
      setSaving(false)
    }
  }

  if (vaults.length === 0) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        No vaults available. <Link to="/vaults/new" className="font-medium text-gold-600 underline">Create a vault</Link> before adding holdings.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {(ac === 'bullion' || ac === 'crypto') ? (
          show('subName') && (
            <FormField label="Sub-name (optional)" className="sm:col-span-2">
              <input
                className={inputClass}
                value={form.subName ?? ''}
                onChange={(e) => set('subName', e.target.value)}
                placeholder="e.g. Tube #3, Lot A, Cold wallet 1 — product type provides the base name"
              />
            </FormField>
          )
        ) : (
          <FormField label="Name" required className="sm:col-span-2">
            <input className={inputClass} value={form.name} onChange={(e) => set('name', e.target.value)} required />
          </FormField>
        )}
        <FormField label="Vault" required>
          <select className={selectClass} value={form.vaultId} onChange={(e) => set('vaultId', e.target.value)} required>
            <option value="">Select vault...</option>
            {vaults.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Asset Class" required>
          <select
            className={selectClass}
            value={form.assetClass}
            onChange={(e) => {
              const next = e.target.value as AssetClass
              set('assetClass', next)
              if (next === 'crypto') {
                setForm((f) => ({
                  ...f,
                  assetClass: next,
                  metalType: '',
                  formFactor: '',
                  weightOz: undefined,
                  purchasePrice: undefined,
                  purchasePricePerOz: undefined,
                  purchaseDate: undefined,
                  dealerId: '',
                  name: '',
                }))
              }
            }}
          >
            {(Object.keys(ASSET_CLASS_LABELS) as AssetClass[]).map((c) => (
              <option key={c} value={c}>{ASSET_CLASS_LABELS[c]}</option>
            ))}
          </select>
        </FormField>

        {show('kitcoSearch') && (
          <KitcoProductSearch className="sm:col-span-2" onSelect={applyKitco} />
        )}

        {show('productTypeId') && (
          <SelectWithAdd
            label="Product Type"
            value={form.productTypeId ?? ''}
            onChange={(v) => {
              const pt = activeProductTypes.find((p) => p.id === v)
              if (pt) {
                setForm((f) => ({
                  ...f,
                  ...fieldsFromProductType(pt),
                  subName: f.subName,
                }))
              } else {
                set('productTypeId', undefined)
              }
            }}
            options={products.map((p) => ({ value: p.id, label: p.name }))}
            addConfig={PRODUCT_TYPE_CONFIG}
          />
        )}

        {show('metalType') && selectedProduct ? (
          <FormField label="Metal">
            <input
              className={inputClass}
              readOnly
              value={
                activeMetalTypes.find((m) => m.slug === selectedProduct.metalSlug)?.name
                ?? METAL_LABELS[(selectedProduct.metalSlug ?? form.metalType) as MetalType]
                ?? selectedProduct.metalSlug
                ?? '—'
              }
            />
          </FormField>
        ) : show('metalType') && (
          <SelectWithAdd
            label="Metal"
            value={form.metalType}
            onChange={(v) => set('metalType', v as MetalType)}
            options={metalOptions}
            addConfig={METAL_TYPE_CONFIG}
          />
        )}

        {show('formFactor') && selectedProduct ? (
          <FormField label="Form Factor">
            <input
              className={inputClass}
              readOnly
              value={
                activeFormFactorTypes.find((f) => f.slug === selectedProduct.formFactorSlug)?.name
                ?? FORM_FACTOR_LABELS[(selectedProduct.formFactorSlug ?? form.formFactor) as FormFactor]
                ?? selectedProduct.formFactorSlug
                ?? '—'
              }
            />
          </FormField>
        ) : show('formFactor') && (
          <SelectWithAdd
            label="Form Factor"
            value={form.formFactor}
            onChange={(v) => set('formFactor', v as FormFactor)}
            options={formOptions}
            addConfig={FORM_FACTOR_CONFIG}
          />
        )}

        {show('weightOz') && (
          <FormField label="Weight (oz per unit)" required>
            <input type="number" step="any" className={inputClass} value={form.weightOz} onChange={(e) => set('weightOz', parseFloat(e.target.value))} required />
          </FormField>
        )}
        {show('purity') && (
          <FormField label="Purity (0-1)" required>
            <input type="number" step="any" min={0} max={1} className={inputClass} value={form.purity} onChange={(e) => set('purity', parseFloat(e.target.value))} required />
          </FormField>
        )}
        {show('quantity') && (
          <FormField label="Quantity" required={ac === 'bullion' || ac === 'currency'}>
            <input type="number" min={1} className={inputClass} value={form.quantity} onChange={(e) => set('quantity', parseInt(e.target.value))} required={ac === 'bullion'} />
          </FormField>
        )}
        {show('condition') && (
          <FormField label="Condition" required={ac === 'bullion'}>
            <select className={selectClass} value={form.condition} onChange={(e) => set('condition', e.target.value as Condition)}>
              {(['mint', 'proof', 'bu', 'au', 'xf', 'vf', 'raw'] as Condition[]).map((c) => (
                <option key={c} value={c}>{c.toUpperCase()}</option>
              ))}
            </select>
          </FormField>
        )}

        {show('cryptoTokenTypeId') && (
          <p className="sm:col-span-2 text-xs font-semibold uppercase tracking-wide text-vault-500">Cold Wallet</p>
        )}
        {show('cryptoTokenTypeId') && (
          <SelectWithAdd
            label="Token Type"
            value={form.cryptoTokenTypeId ?? ''}
            onChange={(v) => {
              const token = activeCryptoTokens.find((t) => t.id === v)
              set('cryptoTokenTypeId', v || undefined)
              if (token) {
                setForm((f) => ({
                  ...f,
                  cryptoTokenTypeId: token.id,
                  cryptoSymbol: token.symbol,
                  name: token.name,
                  subName: f.subName,
                }))
              }
            }}
            options={activeCryptoTokens.map((t) => ({ value: t.id, label: `${t.name} (${t.symbol})` }))}
            placeholder="Select token…"
            required
            addConfig={CRYPTO_TOKEN_CONFIG}
          />
        )}
        {show('publicAddress') && (
          <FormField label="Public Address">
            <input className={inputClass} value={form.publicAddress ?? ''} onChange={(e) => set('publicAddress', e.target.value)} placeholder="0x… or bc1…" />
          </FormField>
        )}
        {show('cryptoQuantity') && (
          <FormField label="On-Chain Quantity">
            <div className="flex gap-2">
              <input type="number" step="any" className={inputClass} value={form.cryptoQuantity ?? ''} onChange={(e) => set('cryptoQuantity', e.target.value ? parseFloat(e.target.value) : undefined)} />
              <button
                type="button"
                onClick={fetchChainBalance}
                disabled={chainLoading || !chainLookupSupported}
                title={
                  chainLookupSupported
                    ? 'Fetch balance from blockchain'
                    : 'On-chain lookup is only supported for BTC, ETH, DOGE, and LTC'
                }
                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-vault-200 px-3 text-sm text-vault-600 hover:bg-vault-50 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${chainLoading ? 'animate-spin' : ''}`} />
                Chain
              </button>
            </div>
            <p className="mt-1 text-xs text-vault-500">
              Automatic balance lookup supports Bitcoin, Ethereum, Dogecoin, and Litecoin only. Enter quantity manually for other tokens.
            </p>
            {chainWarning && (
              <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {chainWarning}
              </p>
            )}
          </FormField>
        )}
        {show('walletType') && (
          <FormField label="Wallet Type">
            <select className={selectClass} value={form.walletType ?? ''} onChange={(e) => set('walletType', e.target.value as WalletType)}>
              <option value="">—</option>
              {Object.entries(WALLET_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </FormField>
        )}
        {show('walletLocation') && ac === 'crypto' && (
          <FormField label="Offline Wallet Location">
            <input className={inputClass} value={form.walletLocation ?? ''} onChange={(e) => set('walletLocation', e.target.value)} placeholder="Safe drawer, bank box #…" />
          </FormField>
        )}
        {show('seedPhrase') && (
          <FormField label="Seed Phrase (encrypted)" className="sm:col-span-2">
            <textarea className={inputClass} rows={2} value={form.seedPhrase ?? ''} onChange={(e) => set('seedPhrase', e.target.value)} placeholder="Encrypted at rest" />
          </FormField>
        )}
        {show('reportedValue') && (
          <FormField label="Reported Value ($)" className={ac === 'crypto' ? undefined : 'sm:col-span-2'}>
            <input type="number" step="any" className={inputClass} value={form.reportedValue ?? ''} onChange={(e) => set('reportedValue', e.target.value ? parseFloat(e.target.value) : undefined)} />
          </FormField>
        )}

        {(show('purchaseDate') || show('dealerId')) && (
          <p className="sm:col-span-2 text-xs font-semibold uppercase tracking-wide text-vault-500">Acquisition</p>
        )}
        {show('purchaseDate') && (
          <FormField label="Purchase Date" required={ac !== 'crypto'}>
            <input
              type="date"
              className={inputClass}
              value={form.purchaseDate ?? ''}
              onChange={(e) => set('purchaseDate', e.target.value || undefined)}
              required={ac !== 'crypto'}
            />
          </FormField>
        )}
        {show('dealerId') && (
          <SelectWithAdd
            label="Dealer / Source"
            value={form.dealerId ?? ''}
            onChange={(v) => set('dealerId', v)}
            options={activeDealers.map((d) => ({ value: d.id, label: d.name }))}
            placeholder="Select dealer…"
            addConfig={DEALER_CONFIG}
          />
        )}
        {show('purchasePrice') && (
          <FormField label="Unit Cost ($)" required={ac !== 'crypto'}>
            <input
              type="number"
              step="any"
              className={inputClass}
              value={form.purchasePrice ?? ''}
              onChange={(e) => set('purchasePrice', e.target.value ? parseFloat(e.target.value) : undefined)}
              required={ac !== 'crypto'}
            />
          </FormField>
        )}
        {show('purchasePricePerOz') && (
          <FormField label="Cost per Oz ($)" required={ac === 'bullion'}>
            <input type="number" step="any" className={inputClass} value={form.purchasePricePerOz} onChange={(e) => set('purchasePricePerOz', parseFloat(e.target.value))} required={ac === 'bullion'} />
          </FormField>
        )}
        {show('invoiceNumber') && (
          <FormField label="Invoice Number">
            <input className={inputClass} value={form.invoiceNumber ?? ''} onChange={(e) => set('invoiceNumber', e.target.value)} />
          </FormField>
        )}

        {(show('serialNumber') || show('mint')) && (
          <p className="sm:col-span-2 text-xs font-semibold uppercase tracking-wide text-vault-500">Identification</p>
        )}
        {show('serialNumber') && (
          <FormField label="Serial Number">
            <input className={inputClass} value={form.serialNumber ?? ''} onChange={(e) => set('serialNumber', e.target.value)} />
          </FormField>
        )}
        {show('mint') && (
          <FormField label="Mint / Maker">
            <input className={inputClass} value={form.mint ?? ''} onChange={(e) => set('mint', e.target.value)} />
          </FormField>
        )}
        {show('year') && (
          <FormField label="Year">
            <input type="number" className={inputClass} value={form.year ?? ''} onChange={(e) => set('year', e.target.value ? parseInt(e.target.value) : undefined)} />
          </FormField>
        )}
        {show('country') && (
          <FormField label="Country">
            <input className={inputClass} value={form.country ?? ''} onChange={(e) => set('country', e.target.value)} />
          </FormField>
        )}
        {show('vaultLocation') && (
          <FormField label="Vault Position">
            <input className={inputClass} value={form.vaultLocation ?? ''} onChange={(e) => set('vaultLocation', e.target.value)} />
          </FormField>
        )}
        {show('storageType') && (
          <FormField label="Storage">
            <select
              className={selectClass}
              value={form.storageType ?? ''}
              onChange={(e) => set('storageType', e.target.value as StorageType)}
            >
              <option value="">—</option>
              {(Object.keys(STORAGE_TYPE_LABELS) as Array<keyof typeof STORAGE_TYPE_LABELS>).map((k) => (
                <option key={k} value={k}>{STORAGE_TYPE_LABELS[k]}</option>
              ))}
            </select>
          </FormField>
        )}
        {show('storageNotes') && form.storageType === 'other' && (
          <FormField label="Storage Details">
            <input
              className={inputClass}
              value={form.storageNotes ?? ''}
              onChange={(e) => set('storageNotes', e.target.value)}
              placeholder="Describe storage container"
            />
          </FormField>
        )}

        {(show('gradingService') || show('insured')) && (
          <p className="sm:col-span-2 text-xs font-semibold uppercase tracking-wide text-vault-500">Grading & Insurance</p>
        )}
        {show('gradingService') && (
          <FormField label="Grading Service">
            <input className={inputClass} value={form.gradingService ?? ''} onChange={(e) => set('gradingService', e.target.value)} />
          </FormField>
        )}
        {show('grade') && (
          <FormField label="Grade">
            <input className={inputClass} value={form.grade ?? ''} onChange={(e) => set('grade', e.target.value)} />
          </FormField>
        )}
        {show('certificateNumber') && (
          <FormField label="Certificate Number">
            <input className={inputClass} value={form.certificateNumber ?? ''} onChange={(e) => set('certificateNumber', e.target.value)} />
          </FormField>
        )}
        {show('insured') && (
          <FormField label="Insured">
            <input type="checkbox" className="mt-2 h-4 w-4 rounded border-vault-300" checked={form.insured} onChange={(e) => set('insured', e.target.checked)} />
          </FormField>
        )}
        {show('insuranceValue') && (
          <FormField label="Insurance Value ($)">
            <input type="number" step="any" className={inputClass} value={form.insuranceValue ?? ''} onChange={(e) => set('insuranceValue', e.target.value ? parseFloat(e.target.value) : undefined)} />
          </FormField>
        )}

        <p className="sm:col-span-2 text-xs font-semibold uppercase tracking-wide text-vault-500">Value Alert Thresholds</p>
        <p className="sm:col-span-2 -mt-2 text-xs text-vault-500">
          Enable holding value alerts in User Settings. Set % thresholds here.
        </p>
        <FormField label="Gain alert threshold (%)">
          <input
            type="number"
            step="0.1"
            className={inputClass}
            value={form.valueGainAlertPct ?? ''}
            onChange={(e) => set('valueGainAlertPct', e.target.value ? parseFloat(e.target.value) : undefined)}
            placeholder="e.g. 10"
          />
        </FormField>
        <FormField label="Loss alert threshold (%)">
          <input
            type="number"
            step="0.1"
            className={inputClass}
            value={form.valueLossAlertPct ?? ''}
            onChange={(e) => set('valueLossAlertPct', e.target.value ? parseFloat(e.target.value) : undefined)}
            placeholder="e.g. 10"
          />
        </FormField>

        {show('tags') && (
          <FormField label="Tags" className="sm:col-span-2">
            <TagsInput value={form.tags} onChange={(tags) => set('tags', tags)} />
          </FormField>
        )}
        {show('notes') && (
          <FormField label="Notes" className="sm:col-span-2">
            <textarea className={inputClass} rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </FormField>
        )}
      </div>

      <div className="flex justify-end gap-3 border-t border-vault-100 pt-4">
        <button type="button" onClick={onCancel} className="rounded-md border border-vault-200 px-4 py-2 text-sm text-vault-600 hover:bg-vault-50">Cancel</button>
        <button type="submit" disabled={saving} className="rounded-md bg-gold-500 px-4 py-2 text-sm font-medium text-white hover:bg-gold-400 disabled:opacity-50">
          {saving ? 'Saving...' : initial?.id ? 'Update Holding' : 'Create Holding'}
        </button>
      </div>
    </form>
  )
}