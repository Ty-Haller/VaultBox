import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Pencil, Plus, Trash2, UserPlus } from 'lucide-react'
import { adminApi } from '../../lib/adminApi'
import type { AdminUser } from '../../types/admin'
import { FormField, inputClass } from '../ui/FormField'
import { Card } from '../ui/Card'
import { DataTable } from '../ui/DataTable'
import { Modal } from '../ui/Modal'
import { Badge } from '../ui/Badge'
import { RoleAssignmentPanel } from './RoleAssignmentPanel'

export function UserManager() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [form, setForm] = useState({
    username: '', email: '', first_name: '', last_name: '',
    isActive: true, displayName: '', phone: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setUsers(await adminApi.list<AdminUser>('users'))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm({ username: '', email: '', first_name: '', last_name: '', isActive: true, displayName: '', phone: '' })
    setShowForm(true)
  }

  const openEdit = (user: AdminUser) => {
    setEditing(user)
    setForm({
      username: user.username,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      isActive: user.isActive,
      displayName: user.displayName,
      phone: user.phone,
    })
    setShowForm(true)
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      if (editing) await adminApi.update('users', editing.id, form)
      else await adminApi.create('users', form)
      setShowForm(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (user: AdminUser) => {
    if (!confirm(`Delete user "${user.username}"?`)) return
    await adminApi.delete('users', user.id)
    await load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/admin" className="rounded-md p-1.5 text-vault-500 hover:bg-vault-100 dark:hover:bg-vault-800">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-vault-900 dark:text-white">Users</h2>
          <p className="text-sm text-vault-600 dark:text-vault-400">
            Manage accounts, roles, and group membership via Groups & Roles
          </p>
        </div>
        <Link to="/admin/signup-requests" className="inline-flex items-center gap-2 rounded-md border border-vault-300 px-4 py-2 text-sm font-medium text-vault-700 dark:border-vault-600 dark:text-vault-200">
          <UserPlus className="h-4 w-4" /> Signup Requests
        </Link>
        <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-md bg-gold-500 px-4 py-2 text-sm font-medium text-white hover:bg-gold-400">
          <Plus className="h-4 w-4" /> Add User
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">{error}</div>}

      <Card>
        {loading ? <p className="text-sm text-vault-600">Loading...</p> : (
          <DataTable
            keyField="id"
            data={users}
            columns={[
              { key: 'username', header: 'Username', render: (u) => <span className="font-medium">{u.username}</span> },
              { key: 'email', header: 'Email', render: (u) => u.email || '—' },
              { key: 'displayName', header: 'Display Name', render: (u) => u.displayName || '—' },
              { key: 'isActive', header: 'Active', render: (u) => <Badge variant={u.isActive ? 'success' : 'danger'}>{u.isActive ? 'Yes' : 'No'}</Badge> },
              {
                key: 'actions', header: '',
                render: (u) => (
                  <div className="flex gap-1">
                    <button type="button" onClick={() => openEdit(u)} className="rounded p-1 text-vault-500 hover:bg-vault-100"><Pencil className="h-4 w-4" /></button>
                    <button type="button" onClick={() => remove(u)} className="rounded p-1 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ),
              },
            ]}
          />
        )}
      </Card>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit User' : 'Add User'} size="lg">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Username" required><input className={inputClass} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} disabled={!!editing} /></FormField>
          <FormField label="Email"><input type="email" className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></FormField>
          <FormField label="First Name"><input className={inputClass} value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></FormField>
          <FormField label="Last Name"><input className={inputClass} value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></FormField>
          <FormField label="Display Name"><input className={inputClass} value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} /></FormField>
          <FormField label="Phone"><input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></FormField>
          <FormField label="Active" className="sm:col-span-2"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /></FormField>
          <div className="sm:col-span-2 rounded-md bg-vault-50 p-3 text-sm text-vault-700 dark:bg-vault-800 dark:text-vault-200">
            <p className="font-medium">VaultBox access model</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-vault-600 dark:text-vault-400">
              <li><strong>Roles</strong> define what actions a user can perform (view inventory, manage secrets, etc.)</li>
              <li><strong>Groups</strong> bundle users with a role and site/vault assignments — configure under Groups & Roles</li>
              <li><strong>Direct assignments</strong> below override or supplement group access per site/vault</li>
              <li>Authentication is <strong>passkey-only</strong> — no passwords. New users need a setup link or self-registration request.</li>
            </ul>
            <p className="mt-2 text-xs text-vault-500">Legacy Django Staff/Superuser flags are not used by VaultBox and have been removed.</p>
          </div>
        </div>
        {editing && <RoleAssignmentPanel userId={editing.id} />}
        <div className="mt-6 flex justify-end gap-3 border-t border-vault-100 pt-4 dark:border-vault-700">
          <button type="button" onClick={() => setShowForm(false)} className="rounded-md border border-vault-200 px-4 py-2 text-sm">Cancel</button>
          <button type="button" onClick={save} disabled={saving} className="rounded-md bg-gold-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </Modal>
    </div>
  )
}