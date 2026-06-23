import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react'
import { adminApi } from '../../lib/adminApi'
import type { AdminGroup, AdminPermission } from '../../types/admin'
import { FormField, inputClass } from '../ui/FormField'
import { Card } from '../ui/Card'
import { DataTable } from '../ui/DataTable'
import { Modal } from '../ui/Modal'

export function GroupManager() {
  const [groups, setGroups] = useState<AdminGroup[]>([])
  const [permissions, setPermissions] = useState<AdminPermission[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<AdminGroup | null>(null)
  const [name, setName] = useState('')
  const [permissionIds, setPermissionIds] = useState<number[]>([])
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [g, p] = await Promise.all([
      adminApi.list<AdminGroup>('groups'),
      adminApi.list<AdminPermission>('permissions'),
    ])
    setGroups(g)
    setPermissions(p)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setEditing(null); setName(''); setPermissionIds([]); setShowForm(true) }
  const openEdit = (g: AdminGroup) => { setEditing(g); setName(g.name); setPermissionIds(g.permissions.map((p) => p.id)); setShowForm(true) }

  const save = async () => {
    setSaving(true)
    const payload = { name, permissionIds }
    if (editing) await adminApi.update('groups', editing.id, payload)
    else await adminApi.create('groups', payload)
    setShowForm(false)
    setSaving(false)
    await load()
  }

  const remove = async (g: AdminGroup) => {
    if (!confirm(`Delete group "${g.name}"?`)) return
    await adminApi.delete('groups', g.id)
    await load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/admin" className="rounded-md p-1.5 text-vault-500 hover:bg-vault-100"><ArrowLeft className="h-4 w-4" /></Link>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-vault-900">Groups & Permissions</h2>
          <p className="text-sm text-vault-500">Role-based access control</p>
        </div>
        <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-md bg-gold-500 px-4 py-2 text-sm font-medium text-white hover:bg-gold-400">
          <Plus className="h-4 w-4" /> Add Group
        </button>
      </div>

      <Card>
        {loading ? <p className="text-sm text-vault-500">Loading...</p> : (
          <DataTable
            keyField="id"
            data={groups}
            columns={[
              { key: 'name', header: 'Group', render: (g) => <span className="font-medium">{g.name}</span> },
              { key: 'perms', header: 'Permissions', render: (g) => `${g.permissions.length} permissions` },
              {
                key: 'actions', header: '',
                render: (g) => (
                  <div className="flex gap-1">
                    <button type="button" onClick={() => openEdit(g)} className="rounded p-1 text-vault-500 hover:bg-vault-100"><Pencil className="h-4 w-4" /></button>
                    <button type="button" onClick={() => remove(g)} className="rounded p-1 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ),
              },
            ]}
          />
        )}
      </Card>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Group' : 'Add Group'} size="lg">
        <FormField label="Group Name" required>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        </FormField>
        <FormField label="Permissions" className="mt-4">
          <div className="max-h-60 overflow-y-auto rounded-md border border-vault-200 p-3">
            {permissions.map((p) => (
              <label key={p.id} className="flex items-center gap-2 py-1 text-xs">
                <input
                  type="checkbox"
                  checked={permissionIds.includes(p.id)}
                  onChange={(e) => setPermissionIds(
                    e.target.checked ? [...permissionIds, p.id] : permissionIds.filter((id) => id !== p.id)
                  )}
                />
                <span className="font-mono text-vault-600">{p.codename}</span>
                <span className="text-vault-400">{p.name}</span>
              </label>
            ))}
          </div>
        </FormField>
        <div className="mt-6 flex justify-end gap-3 border-t border-vault-100 pt-4">
          <button type="button" onClick={() => setShowForm(false)} className="rounded-md border border-vault-200 px-4 py-2 text-sm">Cancel</button>
          <button type="button" onClick={save} disabled={saving} className="rounded-md bg-gold-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </Modal>
    </div>
  )
}