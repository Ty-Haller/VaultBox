import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useVault } from '../context/VaultContext'
import { VaultForm } from '../components/forms/VaultForm'
import { Card } from '../components/ui/Card'

export function VaultFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getVault, addVault, updateVault, sites, loading, error } = useVault()
  const isEdit = Boolean(id)
  const vault = isEdit ? getVault(id!) : undefined

  if (loading && sites.length === 0 && !error) {
    return <p className="text-sm text-vault-500">Loading...</p>
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Cannot load form — start the Django backend on port 8000.
      </div>
    )
  }

  if (isEdit && !vault) {
    return <p className="text-vault-500">Vault not found. <Link to="/vaults" className="text-gold-500">Back</Link></p>
  }

  if (!isEdit && sites.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-vault-600">You need at least one site before creating vaults.</p>
        <Link to="/sites/new" className="text-gold-500 hover:underline">Create a site first →</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <Link to={isEdit ? `/vaults/${id}` : '/vaults'} className="rounded-md p-1.5 text-vault-500 hover:bg-vault-100">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h2 className="text-xl font-bold text-vault-900">{isEdit ? 'Edit Vault' : 'Add Vault'}</h2>
      </div>
      <Card>
        <VaultForm
          initial={vault}
          onCancel={() => navigate(isEdit ? `/vaults/${id}` : '/vaults')}
          onSubmit={async (data) => {
            if (isEdit) {
              await updateVault(id!, data)
              navigate(`/vaults/${id}`)
            } else {
              const created = await addVault(data)
              navigate(`/vaults/${created.id}`)
            }
          }}
        />
      </Card>
    </div>
  )
}