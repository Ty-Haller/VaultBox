import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react'
import { authApi, type RoleDefinition, type UserGroupInfo } from '../../lib/authApi'
import { useVault } from '../../context/VaultContext'
import { adminApi } from '../../lib/adminApi'
import type { AdminUser } from '../../types/admin'
import { FormField, inputClass } from '../ui/FormField'
import { Card } from '../ui/Card'
import { DataTable } from '../ui/DataTable'
import { Modal } from '../ui/Modal'

type Tab = 'roles' | 'groups'

export function GroupsRolesManager() {
  const { sites, vaults } = useVault()
  const [tab, setTab] = useState<Tab>('roles')
  const [roles, setRoles] = useState<RoleDefinition[]>([])
  const [groups, setGroups] = useState<UserGroupInfo[]>([])
  const [permissions, setPermissions] = useState<{ key: string; label: string }[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showRoleForm, setShowRoleForm] = useState(false)
  const [showGroupForm, setShowGroupForm] = useState(false)
  const [editingRole, setEditingRole] = useState<RoleDefinition | null>(null)
  const [editingGroup, setEditingGroup] = useState<UserGroupInfo | null>(null)
  const [roleForm, setRoleForm] = useState({ name: '', description: '', permissions: [] as string[] })
  const [groupForm, setGroupForm] = useState({
    name: '', description: '', roleId: '', memberIds: [] as number[], siteIds: [] as string[], vaultIds: [] as string[],
  })

  const load = useCallback(async () => {
    setLoading(true)
    const [r, g, p, u] = await Promise.all([
      authApi.listRoles(),
      authApi.listUserGroups(),
      authApi.listPermissionCatalog(),
      adminApi.list<AdminUser>('users'),
    ])
    setRoles(r)
    setGroups(g)
    setPermissions(p)
    setUsers(u)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const saveRole = async () => {
    if (editingRole) await authApi.updateRole(editingRole.id, roleForm)
    else await authApi.createRole(roleForm)
    setShowRoleForm(false)
    await load()
  }

  const saveGroup = async () => {
    if (editingGroup) await authApi.updateUserGroup(editingGroup.id, groupForm)
    else await authApi.createUserGroup(groupForm)
    setShowGroupForm(false)
    await load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/admin" className="rounded-md p-1.5 text-vault-500 hover:bg-vault-100 dark:hover:bg-vault-800"><ArrowLeft className="h-4 w-4" /></Link>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-vault-900 dark:text-white">Groups & Roles</h2>
          <p className="text-sm text-vault-600 dark:text-vault-400">
            Roles define permissions. Groups bundle users with a role and site/vault assignments.
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        {(['roles', 'groups'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-2 text-sm font-medium capitalize ${tab === t ? 'bg-vault-800 text-white' : 'bg-vault-100 text-vault-700 dark:bg-vault-800 dark:text-vault-200'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'roles' && (
        <>
          <div className="flex justify-end">
            <button type="button" onClick={() => { setEditingRole(null); setRoleForm({ name: '', description: '', permissions: [] }); setShowRoleForm(true) }} className="inline-flex items-center gap-2 rounded-md bg-gold-500 px-4 py-2 text-sm font-medium text-white">
              <Plus className="h-4 w-4" /> Add Role
            </button>
          </div>
          <Card>
            {loading ? <p className="text-sm text-vault-600">Loading…</p> : (
              <DataTable
                keyField="id"
                data={roles}
                columns={[
                  { key: 'name', header: 'Role', render: (r) => <span className="font-medium">{r.name}</span> },
                  { key: 'perms', header: 'Permissions', render: (r) => `${r.permissions.length} permissions` },
                  { key: 'sys', header: 'Type', render: (r) => r.isSystem ? 'System' : 'Custom' },
                  {
                    key: 'actions', header: '',
                    render: (r) => (
                      <button type="button" onClick={() => { setEditingRole(r); setRoleForm({ name: r.name, description: r.description, permissions: r.permissions }); setShowRoleForm(true) }} className="rounded p-1 text-vault-500 hover:bg-vault-100"><Pencil className="h-4 w-4" /></button>
                    ),
                  },
                ]}
              />
            )}
          </Card>
        </>
      )}

      {tab === 'groups' && (
        <>
          <div className="flex justify-end">
            <button type="button" onClick={() => { setEditingGroup(null); setGroupForm({ name: '', description: '', roleId: roles[0]?.id ?? '', memberIds: [], siteIds: [], vaultIds: [] }); setShowGroupForm(true) }} className="inline-flex items-center gap-2 rounded-md bg-gold-500 px-4 py-2 text-sm font-medium text-white">
              <Plus className="h-4 w-4" /> Add Group
            </button>
          </div>
          <Card>
            {loading ? <p className="text-sm text-vault-600">Loading…</p> : (
              <DataTable
                keyField="id"
                data={groups}
                columns={[
                  { key: 'name', header: 'Group', render: (g) => <span className="font-medium">{g.name}</span> },
                  { key: 'role', header: 'Role', render: (g) => g.roleName },
                  { key: 'members', header: 'Members', render: (g) => g.memberIds.length },
                  { key: 'scope', header: 'Scope', render: (g) => `${g.siteIds.length} sites, ${g.vaultIds.length} vaults` },
                  {
                    key: 'actions', header: '',
                    render: (g) => (
                      <div className="flex gap-1">
                        <button type="button" onClick={() => { setEditingGroup(g); setGroupForm({ name: g.name, description: g.description, roleId: g.roleId, memberIds: g.memberIds, siteIds: g.siteIds, vaultIds: g.vaultIds }); setShowGroupForm(true) }} className="rounded p-1"><Pencil className="h-4 w-4" /></button>
                        <button type="button" onClick={async () => { if (confirm('Delete group?')) { await authApi.deleteUserGroup(g.id); await load() } }} className="rounded p-1 text-red-500"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    ),
                  },
                ]}
              />
            )}
          </Card>
        </>
      )}

      <Modal open={showRoleForm} onClose={() => setShowRoleForm(false)} title={editingRole ? 'Edit Role' : 'Add Role'} size="lg">
        <FormField label="Name"><input className={inputClass} value={roleForm.name} onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })} /></FormField>
        <FormField label="Description" className="mt-3"><input className={inputClass} value={roleForm.description} onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })} /></FormField>
        <FormField label="Permissions" className="mt-3">
          <div className="max-h-48 overflow-y-auto rounded border border-vault-200 p-2 dark:border-vault-600">
            {permissions.map((p) => (
              <label key={p.key} className="flex items-center gap-2 py-1 text-xs text-vault-800 dark:text-vault-200">
                <input type="checkbox" checked={roleForm.permissions.includes(p.key)} onChange={(e) => setRoleForm({ ...roleForm, permissions: e.target.checked ? [...roleForm.permissions, p.key] : roleForm.permissions.filter((k) => k !== p.key) })} />
                <span className="font-mono">{p.key}</span>
                <span className="text-vault-500">{p.label}</span>
              </label>
            ))}
          </div>
        </FormField>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={() => setShowRoleForm(false)} className="rounded border px-4 py-2 text-sm">Cancel</button>
          <button type="button" onClick={saveRole} className="rounded bg-gold-500 px-4 py-2 text-sm text-white">Save</button>
        </div>
      </Modal>

      <Modal open={showGroupForm} onClose={() => setShowGroupForm(false)} title={editingGroup ? 'Edit Group' : 'Add Group'} size="lg">
        <div className="space-y-3">
          <FormField label="Group name"><input className={inputClass} value={groupForm.name} onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })} /></FormField>
          <FormField label="Role">
            <select className={inputClass} value={groupForm.roleId} onChange={(e) => setGroupForm({ ...groupForm, roleId: e.target.value })}>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </FormField>
          <FormField label="Members">
            <div className="max-h-32 overflow-y-auto rounded border border-vault-200 p-2 dark:border-vault-600">
              {users.map((u) => (
                <label key={u.id} className="flex items-center gap-2 py-1 text-xs">
                  <input type="checkbox" checked={groupForm.memberIds.includes(u.id)} onChange={(e) => setGroupForm({ ...groupForm, memberIds: e.target.checked ? [...groupForm.memberIds, u.id] : groupForm.memberIds.filter((id) => id !== u.id) })} />
                  {u.username}
                </label>
              ))}
            </div>
          </FormField>
          <FormField label="Site assignments">
            <div className="max-h-24 overflow-y-auto rounded border border-vault-200 p-2 dark:border-vault-600">
              {sites.map((s) => (
                <label key={s.id} className="flex items-center gap-2 py-1 text-xs">
                  <input type="checkbox" checked={groupForm.siteIds.includes(s.id)} onChange={(e) => setGroupForm({ ...groupForm, siteIds: e.target.checked ? [...groupForm.siteIds, s.id] : groupForm.siteIds.filter((id) => id !== s.id) })} />
                  {s.name}
                </label>
              ))}
            </div>
          </FormField>
          <FormField label="Vault assignments">
            <div className="max-h-24 overflow-y-auto rounded border border-vault-200 p-2 dark:border-vault-600">
              {vaults.map((v) => (
                <label key={v.id} className="flex items-center gap-2 py-1 text-xs">
                  <input type="checkbox" checked={groupForm.vaultIds.includes(v.id)} onChange={(e) => setGroupForm({ ...groupForm, vaultIds: e.target.checked ? [...groupForm.vaultIds, v.id] : groupForm.vaultIds.filter((id) => id !== v.id) })} />
                  {v.name}
                </label>
              ))}
            </div>
          </FormField>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={() => setShowGroupForm(false)} className="rounded border px-4 py-2 text-sm">Cancel</button>
          <button type="button" onClick={saveGroup} className="rounded bg-gold-500 px-4 py-2 text-sm text-white">Save</button>
        </div>
      </Modal>
    </div>
  )
}