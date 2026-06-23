import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  AdminAssetCategory,
  AdminAuditWorkflow,
  AdminCurrency,
  AdminCryptoTokenType,
  AdminDealer,
  AdminFormFactorType,
  AdminMetalType,
  AdminNotificationOption,
  AdminAppSetting,
  AdminProductType,
  AdminSiteType,
  AdminVaultType,
} from '../types/admin'
import { adminApi } from '../lib/adminApi'

interface AdminContextValue {
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  siteTypes: AdminSiteType[]
  vaultTypes: AdminVaultType[]
  metalTypes: AdminMetalType[]
  dealers: AdminDealer[]
  cryptoTokens: AdminCryptoTokenType[]
  assetCategories: AdminAssetCategory[]
  productTypes: AdminProductType[]
  formFactorTypes: AdminFormFactorType[]
  currencies: AdminCurrency[]
  settings: AdminAppSetting[]
  notificationOptions: AdminNotificationOption[]
  auditWorkflows: AdminAuditWorkflow[]
  activeMetalTypes: AdminMetalType[]
  activeDealers: AdminDealer[]
  activeCryptoTokens: AdminCryptoTokenType[]
  activeVaultTypes: AdminVaultType[]
  activeFormFactorTypes: AdminFormFactorType[]
  activeAssetCategories: AdminAssetCategory[]
  activeProductTypes: AdminProductType[]
}

const AdminContext = createContext<AdminContextValue | null>(null)

export function AdminProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [siteTypes, setSiteTypes] = useState<AdminSiteType[]>([])
  const [vaultTypes, setVaultTypes] = useState<AdminVaultType[]>([])
  const [metalTypes, setMetalTypes] = useState<AdminMetalType[]>([])
  const [dealers, setDealers] = useState<AdminDealer[]>([])
  const [cryptoTokens, setCryptoTokens] = useState<AdminCryptoTokenType[]>([])
  const [assetCategories, setAssetCategories] = useState<AdminAssetCategory[]>([])
  const [productTypes, setProductTypes] = useState<AdminProductType[]>([])
  const [formFactorTypes, setFormFactorTypes] = useState<AdminFormFactorType[]>([])
  const [currencies, setCurrencies] = useState<AdminCurrency[]>([])
  const [settings, setSettings] = useState<AdminAppSetting[]>([])
  const [notificationOptions, setNotificationOptions] = useState<AdminNotificationOption[]>([])
  const [auditWorkflows, setAuditWorkflows] = useState<AdminAuditWorkflow[]>([])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    const results = await Promise.allSettled([
      adminApi.list<AdminSiteType>('site-types'),
      adminApi.list<AdminVaultType>('vault-types'),
      adminApi.list<AdminMetalType>('metal-types'),
      adminApi.list<AdminDealer>('dealers'),
      adminApi.list<AdminCryptoTokenType>('crypto-tokens'),
      adminApi.list<AdminAssetCategory>('asset-categories'),
      adminApi.list<AdminProductType>('product-types'),
      adminApi.list<AdminFormFactorType>('form-factor-types'),
      adminApi.list<AdminCurrency>('currencies'),
      adminApi.list<AdminAppSetting>('settings'),
      adminApi.list<AdminNotificationOption>('notification-options'),
      adminApi.list<AdminAuditWorkflow>('audit-workflows'),
    ])
    const [
      stR, vtR, mtR, dlR, ctR, acR, ptR, ffR, curR, setR, notifR, auditR,
    ] = results
    if (stR.status === 'fulfilled') setSiteTypes(stR.value)
    if (vtR.status === 'fulfilled') setVaultTypes(vtR.value)
    if (mtR.status === 'fulfilled') setMetalTypes(mtR.value)
    if (dlR.status === 'fulfilled') setDealers(dlR.value)
    if (ctR.status === 'fulfilled') setCryptoTokens(ctR.value)
    if (acR.status === 'fulfilled') setAssetCategories(acR.value)
    if (ptR.status === 'fulfilled') setProductTypes(ptR.value)
    if (ffR.status === 'fulfilled') setFormFactorTypes(ffR.value)
    if (curR.status === 'fulfilled') setCurrencies(curR.value)
    if (setR.status === 'fulfilled') setSettings(setR.value)
    if (notifR.status === 'fulfilled') setNotificationOptions(notifR.value)
    if (auditR.status === 'fulfilled') setAuditWorkflows(auditR.value)
    const failed = results.filter((r) => r.status === 'rejected')
    if (failed.length === results.length) {
      setError('Cannot load admin configuration — is the backend running on port 8000?')
    } else if (failed.length > 0) {
      setError('Some admin configuration failed to load')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const value = useMemo<AdminContextValue>(
    () => ({
      loading,
      error,
      refresh,
      siteTypes,
      vaultTypes,
      metalTypes,
      dealers,
      cryptoTokens,
      assetCategories,
      productTypes,
      formFactorTypes,
      currencies,
      settings,
      notificationOptions,
      auditWorkflows,
      activeMetalTypes: metalTypes.filter((m) => m.isActive),
      activeDealers: dealers.filter((d) => d.isActive),
      activeCryptoTokens: cryptoTokens.filter((t) => t.isActive),
      activeVaultTypes: vaultTypes.filter((v) => v.isActive),
      activeFormFactorTypes: formFactorTypes.filter((f) => f.isActive),
      activeAssetCategories: assetCategories.filter((c) => c.isActive),
      activeProductTypes: productTypes.filter((p) => p.isActive),
    }),
    [loading, error, refresh, siteTypes, vaultTypes, metalTypes, dealers, cryptoTokens, assetCategories, productTypes, formFactorTypes, currencies, settings, notificationOptions, auditWorkflows]
  )

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
}

export function useAdmin() {
  const ctx = useContext(AdminContext)
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider')
  return ctx
}