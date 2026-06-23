import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { authApi, type VaultBoxRole } from '../../lib/authApi'
import { useVault } from '../../context/VaultContext'
import { FormField, inputClass } from '../ui/FormField'

const ROLE_OPTIONS: { value: VaultBoxRole; label: string }[] = [
  { value: 'full_admin', label: 'Full Admin' },
  { value: 'site_admin', label: 'Site Admin' },
  { value: 'vault_admin', label: 'Vault Admin' },
  { value: 'viewer', label: 'Viewer' },
  { value: 'audit_reporting', label: 'Audit & Reporting' },
]

interface Props {
  userId: number
}

export function RoleAssignmentPanel({ userId }: Props) {
  const { sites, vaults } = useVault()
  const [globalRole, setGlobalRole] = useState<VaultBoxRole | ''>('')
  const [siteRoles, setSiteRoles] = useState<{ siteId: string; role: VaultBoxRole }[]>([])
  const [vaultRoles, setVaultRoles] = useState<{ vaultId: string; role: VaultBoxRole }[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    authApi.getRoleAssignment(userId).then((data) => {
      setGlobalRole(data.globalRole ?? '')
      setSiteRoles(data.siteRoles.map((r) => ({ siteId: r.siteId, role: r.role })))
      setVaultRoles(data.vaultRoles.map((r) => ({ vaultId: r.vaultId, role: r.role })))
      setLoaded(true)
    }).catch((e) => setError(e instanceof Error ? e.message : 'Failed to load roles'))
  }, [userId])

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      await authApi.updateRoleAssignment(userId, {
        globalRole: globalRole || null,
        siteRoles,
        vaultRoles,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (!loaded) return <p className="text-sm text-vault-500">Loading roles…</p>

  return (
    <div className="space-y-4 rounded-lg border border-vault-200 p-4 dark:border-vault-600">
      <h3 className="text-sm font-semibold text-vault-900 dark:text-white">Role Assignments</h3>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <FormField label="Global role">
        <select
          className={inputClass}
          value={globalRole}
          onChange={(e) => setGlobalRole(e.target.value as VaultBoxRole | '')}
        >
          <option value="">None</option>
          {ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </FormField>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-vault-700 dark:text-vault-200">Site roles</span>
          <button
            type="button"
            onClick={() => setSiteRoles([...siteRoles, { siteId: sites[0]?.id ?? '', role: 'viewer' }])}
            className="flex items-center gap-1 text-xs text-vault-500 hover:text-vault-800"
          >
            <Plus className="h-3 w-3" /> Add
          </button>
        </div>
        {siteRoles.map((sr, i) => (
          <div key={i} className="mb-2 flex gap-2">
            <select
              className={inputClass}
              value={sr.siteId}
              onChange={(e) => {
                const next = [...siteRoles]
                next[i] = { ...next[i], siteId: e.target.value }
                setSiteRoles(next)
              }}
            >
              {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select
              className={inputClass}
              value={sr.role}
              onChange={(e) => {
                const next = [...siteRoles]
                next[i] = { ...next[i], role: e.target.value as VaultBoxRole }
                setSiteRoles(next)
              }}
            >
              {ROLE_OPTIONS.filter((r) => r.value !== 'full_admin').map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <button type="button" onClick={() => setSiteRoles(siteRoles.filter((_, j) => j !== i))}>
              <Trash2 className="h-4 w-4 text-vault-400" />
            </button>
          </div>
        ))}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-vault-700 dark:text-vault-200">Vault roles</span>
          <button
            type="button"
            onClick={() => setVaultRoles([...vaultRoles, { vaultId: vaults[0]?.id ?? '', role: 'viewer' }])}
            className="flex items-center gap-1 text-xs text-vault-500 hover:text-vault-800"
          >
            <Plus className="h-3 w-3" /> Add
          </button>
        </div>
        {vaultRoles.map((vr, i) => (
          <div key={i} className="mb-2 flex gap-2">
            <select
              className={inputClass}
              value={vr.vaultId}
              onChange={(e) => {
                const next = [...vaultRoles]
                next[i] = { ...next[i], vaultId: e.target.value }
                setVaultRoles(next)
              }}
            >
              {vaults.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
            <select
              className={inputClass}
              value={vr.role}
              onChange={(e) => {
                const next = [...vaultRoles]
                next[i] = { ...next[i], role: e.target.value as VaultBoxRole }
                setVaultRoles(next)
              }}
            >
              {ROLE_OPTIONS.filter((r) => r.value !== 'full_admin').map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <button type="button" onClick={() => setVaultRoles(vaultRoles.filter((_, j) => j !== i))}>
              <Trash2 className="h-4 w-4 text-vault-400" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="rounded-md bg-vault-800 px-4 py-2 text-sm text-white hover:bg-vault-700 disabled:opacity-50"
      >
        Save role assignments
      </button>
    </div>
  )
}