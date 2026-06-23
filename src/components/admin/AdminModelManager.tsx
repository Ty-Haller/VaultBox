import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react'
import { adminApi } from '../../lib/adminApi'
import { useAdmin } from '../../context/AdminContext'
import type { AdminModelConfig, FieldConfig } from './fieldConfig'
import { FormField, inputClass, selectClass } from '../ui/FormField'
import { Card } from '../ui/Card'
import { DataTable } from '../ui/DataTable'
import { Modal } from '../ui/Modal'
import { Badge } from '../ui/Badge'

interface AdminModelManagerProps {
  config: AdminModelConfig
}

function emptyForm(fields: FieldConfig[]): Record<string, unknown> {
  const form: Record<string, unknown> = {}
  for (const f of fields) {
    form[f.key] = f.defaultValue ?? (f.type === 'boolean' ? false : f.type === 'number' ? 0 : '')
  }
  return form
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldConfig
  value: unknown
  onChange: (v: unknown) => void
}) {
  if (field.type === 'boolean') {
    return (
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-vault-300"
        checked={Boolean(value)}
        onChange={(e) => onChange(e.target.checked)}
      />
    )
  }
  if (field.type === 'select') {
    return (
      <select
        className={selectClass}
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
      >
        {field.options?.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    )
  }
  if (field.type === 'textarea') {
    return (
      <textarea
        className={inputClass}
        rows={3}
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }
  if (field.type === 'color') {
    return (
      <input
        type="color"
        className="h-10 w-20 cursor-pointer rounded border border-vault-200"
        value={String(value || '#000000')}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }
  return (
    <input
      type={field.type}
      className={inputClass}
      value={value as string | number}
      onChange={(e) => onChange(field.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
      required={field.required}
    />
  )
}

export function AdminModelManager({ config }: AdminModelManagerProps) {
  const { refresh: refreshAdmin } = useAdmin()
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null)
  const [form, setForm] = useState<Record<string, unknown>>(emptyForm(config.fields))
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminApi.list<Record<string, unknown>>(config.resource)
      setRows(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }, [config.resource])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm(config.fields))
    setShowForm(true)
  }

  const openEdit = (row: Record<string, unknown>) => {
    setEditing(row)
    const f = emptyForm(config.fields)
    for (const field of config.fields) {
      f[field.key] = row[field.key] ?? f[field.key]
    }
    setForm(f)
    setShowForm(true)
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const payload = { ...form }
      if (editing?.id) {
        await adminApi.update(config.resource, editing.id as string | number, payload)
      } else {
        await adminApi.create(config.resource, payload)
      }
      setShowForm(false)
      await load()
      await refreshAdmin()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (row: Record<string, unknown>) => {
    if (!confirm(`Delete "${row.name ?? row.key ?? row.code}"?`)) return
    await adminApi.delete(config.resource, row.id as string | number)
    await load()
    await refreshAdmin()
  }

  const renderCell = (row: Record<string, unknown>, key: string) => {
    const val = row[key]
    if (typeof val === 'boolean') {
      return <Badge variant={val ? 'success' : 'default'}>{val ? 'Yes' : 'No'}</Badge>
    }
    if (key === 'color' && typeof val === 'string') {
      return (
        <span className="inline-flex items-center gap-2">
          <span className="h-4 w-4 rounded border" style={{ backgroundColor: val }} />
          {val}
        </span>
      )
    }
    return String(val ?? '—')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/admin" className="rounded-md p-1.5 text-vault-500 hover:bg-vault-100">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-vault-900">{config.title}</h2>
          <p className="text-sm text-vault-500">{config.description}</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-md bg-gold-500 px-4 py-2 text-sm font-medium text-white hover:bg-gold-400"
        >
          <Plus className="h-4 w-4" />
          Add {config.title.replace(/s$/, '')}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <Card>
        {loading ? (
          <p className="text-sm text-vault-500">Loading...</p>
        ) : (
          <DataTable
            keyField="id"
            data={rows}
            columns={[
              ...config.columns.map((col) => ({
                key: col.key,
                header: col.label,
                render: (row: Record<string, unknown>) => renderCell(row, col.key),
              })),
              {
                key: 'actions',
                header: '',
                className: 'w-24',
                render: (row: Record<string, unknown>) => (
                  <div className="flex gap-1">
                    <button type="button" onClick={() => openEdit(row)} className="rounded p-1 text-vault-500 hover:bg-vault-100">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => remove(row)} className="rounded p-1 text-red-500 hover:bg-red-50">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ),
              },
            ]}
          />
        )}
      </Card>

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? `Edit ${config.title.replace(/s$/, '')}` : `Add ${config.title.replace(/s$/, '')}`}
        size="lg"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {config.fields.map((field) => (
            <FormField
              key={field.key}
              label={field.label}
              required={field.required}
              className={field.type === 'textarea' ? 'sm:col-span-2' : undefined}
            >
              <FieldInput
                field={field}
                value={form[field.key]}
                onChange={(v) => setForm((f) => ({ ...f, [field.key]: v }))}
              />
            </FormField>
          ))}
        </div>
        <div className="mt-6 flex justify-end gap-3 border-t border-vault-100 pt-4">
          <button type="button" onClick={() => setShowForm(false)} className="rounded-md border border-vault-200 px-4 py-2 text-sm text-vault-600">
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-md bg-gold-500 px-4 py-2 text-sm font-medium text-white hover:bg-gold-400 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </Modal>
    </div>
  )
}