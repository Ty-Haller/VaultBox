import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Holding, HoldingTransactPayload, Site, Vault, VaultBoxState } from '../types'
import { api } from '../lib/api'

interface VaultContextValue extends VaultBoxState {
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  addSite: (site: Omit<Site, 'id' | 'slug' | 'createdAt' | 'updatedAt' | 'photos'>) => Promise<Site>
  updateSite: (id: string, updates: Partial<Site>) => Promise<void>
  deleteSite: (id: string) => Promise<void>
  addVault: (vault: Omit<Vault, 'id' | 'slug' | 'createdAt' | 'updatedAt' | 'photos'>) => Promise<Vault>
  updateVault: (id: string, updates: Partial<Vault>) => Promise<void>
  deleteVault: (id: string) => Promise<void>
  addHolding: (holding: Omit<Holding, 'id' | 'createdAt' | 'updatedAt' | 'photos' | 'documents' | 'qrCode'>) => Promise<Holding>
  updateHolding: (id: string, updates: Partial<Holding>) => Promise<void>
  deleteHolding: (id: string) => Promise<void>
  transactHolding: (id: string, data: HoldingTransactPayload) => Promise<Holding>
  resetData: () => Promise<void>
  getSite: (id: string) => Site | undefined
  getVault: (id: string) => Vault | undefined
  getHolding: (id: string) => Holding | undefined
  getVaultsBySite: (siteId: string) => Vault[]
  getHoldingsByVault: (vaultId: string) => Holding[]
}

const VaultContext = createContext<VaultContextValue | null>(null)

export function VaultProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<VaultBoxState>({
    sites: [],
    vaults: [],
    holdings: [],
    portfolioHistory: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    const results = await Promise.allSettled([
      api.getSites(),
      api.getVaults(),
      api.getHoldings({ includeArchived: true }),
      api.getPortfolioHistory(),
    ])
    const labels = ['sites', 'vaults', 'holdings', 'portfolio history']
    const errors: string[] = []
    const [sitesR, vaultsR, holdingsR, historyR] = results
    const sites = sitesR.status === 'fulfilled' ? sitesR.value : []
    const vaults = vaultsR.status === 'fulfilled' ? vaultsR.value : []
    const holdings = holdingsR.status === 'fulfilled' ? holdingsR.value : []
    const portfolioHistory = historyR.status === 'fulfilled' ? historyR.value : []
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        const msg = r.reason instanceof Error ? r.reason.message : String(r.reason)
        errors.push(`${labels[i]}: ${msg}`)
      }
    })
    setState({ sites, vaults, holdings, portfolioHistory })
    if (errors.length === results.length) {
      setError(
        'Cannot reach the VaultBox API. Start both servers with: npm run start'
      )
    } else if (errors.length > 0) {
      setError(`Some data failed to load (${errors.join('; ')})`)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const addSite = useCallback(async (site: Omit<Site, 'id' | 'slug' | 'createdAt' | 'updatedAt' | 'photos'>) => {
    const created = await api.createSite(site)
    setState((prev) => ({ ...prev, sites: [...prev.sites, created] }))
    return created
  }, [])

  const updateSite = useCallback(async (id: string, updates: Partial<Site>) => {
    const updated = await api.updateSite(id, updates)
    setState((prev) => ({
      ...prev,
      sites: prev.sites.map((s) => (s.id === id ? updated : s)),
    }))
  }, [])

  const deleteSite = useCallback(async (id: string) => {
    await api.deleteSite(id)
    const vaultIds = state.vaults.filter((v) => v.siteId === id).map((v) => v.id)
    setState((prev) => ({
      ...prev,
      sites: prev.sites.filter((s) => s.id !== id),
      vaults: prev.vaults.filter((v) => v.siteId !== id),
      holdings: prev.holdings.filter((h) => !vaultIds.includes(h.vaultId)),
    }))
  }, [state.vaults])

  const addVault = useCallback(async (vault: Omit<Vault, 'id' | 'slug' | 'createdAt' | 'updatedAt' | 'photos'>) => {
    const created = await api.createVault(vault)
    setState((prev) => ({ ...prev, vaults: [...prev.vaults, created] }))
    return created
  }, [])

  const updateVault = useCallback(async (id: string, updates: Partial<Vault>) => {
    const updated = await api.updateVault(id, updates)
    setState((prev) => ({
      ...prev,
      vaults: prev.vaults.map((v) => (v.id === id ? updated : v)),
    }))
  }, [])

  const deleteVault = useCallback(async (id: string) => {
    await api.deleteVault(id)
    setState((prev) => ({
      ...prev,
      vaults: prev.vaults.filter((v) => v.id !== id),
      holdings: prev.holdings.filter((h) => h.vaultId !== id),
    }))
  }, [])

  const addHolding = useCallback(async (holding: Omit<Holding, 'id' | 'createdAt' | 'updatedAt' | 'photos' | 'documents' | 'qrCode'>) => {
    const created = await api.createHolding(holding)
    setState((prev) => ({ ...prev, holdings: [...prev.holdings, created] }))
    return created
  }, [])

  const updateHolding = useCallback(async (id: string, updates: Partial<Holding>) => {
    const updated = await api.updateHolding(id, updates)
    setState((prev) => ({
      ...prev,
      holdings: prev.holdings.map((h) => (h.id === id ? updated : h)),
    }))
  }, [])

  const deleteHolding = useCallback(async (id: string) => {
    await api.deleteHolding(id)
    setState((prev) => ({
      ...prev,
      holdings: prev.holdings.filter((h) => h.id !== id),
    }))
  }, [])

  const transactHolding = useCallback(async (id: string, data: HoldingTransactPayload) => {
    const updated = await api.transactHolding(id, data)
    setState((prev) => ({
      ...prev,
      holdings: prev.holdings.map((h) => (h.id === id ? updated : h)),
    }))
    return updated
  }, [])

  const resetData = useCallback(async () => {
    await api.seedData()
    await refresh()
  }, [refresh])

  const value = useMemo<VaultContextValue>(
    () => ({
      ...state,
      loading,
      error,
      refresh,
      addSite,
      updateSite,
      deleteSite,
      addVault,
      updateVault,
      deleteVault,
      addHolding,
      updateHolding,
      deleteHolding,
      transactHolding,
      resetData,
      getSite: (id) => state.sites.find((s) => s.id === id),
      getVault: (id) => state.vaults.find((v) => v.id === id),
      getHolding: (id) => state.holdings.find((h) => h.id === id),
      getVaultsBySite: (siteId) => state.vaults.filter((v) => v.siteId === siteId),
      getHoldingsByVault: (vaultId) =>
        state.holdings.filter((h) => h.vaultId === vaultId && (!h.status || h.status === 'active')),
    }),
    [state, loading, error, refresh, addSite, updateSite, deleteSite, addVault, updateVault, deleteVault, addHolding, updateHolding, deleteHolding, transactHolding, resetData]
  )

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>
}

export function useVault() {
  const ctx = useContext(VaultContext)
  if (!ctx) throw new Error('useVault must be used within VaultProvider')
  return ctx
}