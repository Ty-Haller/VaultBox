import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useVault } from '../context/VaultContext'
import { HoldingForm } from '../components/forms/HoldingForm'
import { Card } from '../components/ui/Card'

export function HoldingFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getHolding, addHolding, updateHolding, vaults, loading, error } = useVault()
  const isEdit = Boolean(id)
  const holding = isEdit ? getHolding(id!) : undefined

  if (loading && vaults.length === 0 && !error) {
    return <p className="text-sm text-vault-500">Loading...</p>
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Cannot load form — API unavailable. Start the Django backend:{' '}
        <code className="font-mono">python3 manage.py runserver</code>
      </div>
    )
  }

  if (isEdit && !holding) {
    return (
      <p className="text-vault-500">
        Holding not found. <Link to="/inventory" className="text-gold-500">Back to inventory</Link>
      </p>
    )
  }

  if (!isEdit && vaults.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-vault-600">You need at least one vault before adding holdings.</p>
        <Link to="/vaults/new" className="text-gold-500 hover:underline">Create a vault first →</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center gap-3">
        <Link
          to={isEdit ? `/inventory/${id}` : '/inventory'}
          className="rounded-md p-1.5 text-vault-500 hover:bg-vault-100"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-vault-900">
            {isEdit ? 'Edit Holding' : 'Add Holding'}
          </h2>
          <p className="text-sm text-vault-500">
            {isEdit ? holding?.name : 'Create a new bullion inventory record'}
          </p>
        </div>
      </div>

      <Card>
        <HoldingForm
          initial={holding}
          onCancel={() => navigate(isEdit ? `/inventory/${id}` : '/inventory')}
          onSubmit={async (data) => {
            if (isEdit) {
              await updateHolding(id!, data)
              navigate(`/inventory/${id}`)
            } else {
              const created = await addHolding(data)
              navigate(`/inventory/${created.id}`)
            }
          }}
        />
      </Card>
    </div>
  )
}