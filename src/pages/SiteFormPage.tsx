import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useVault } from '../context/VaultContext'
import { SiteForm } from '../components/forms/SiteForm'
import { Card } from '../components/ui/Card'

export function SiteFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getSite, addSite, updateSite, sites, loading, error } = useVault()
  const isEdit = Boolean(id)
  const site = isEdit ? getSite(id!) : undefined

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

  if (isEdit && !site) {
    return <p className="text-vault-500">Site not found. <Link to="/sites" className="text-gold-500">Back</Link></p>
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <Link to={isEdit ? `/sites/${id}` : '/sites'} className="rounded-md p-1.5 text-vault-500 hover:bg-vault-100">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h2 className="text-xl font-bold text-vault-900">{isEdit ? 'Edit Site' : 'Add Site'}</h2>
      </div>
      <Card>
        <SiteForm
          initial={site}
          onCancel={() => navigate(isEdit ? `/sites/${id}` : '/sites')}
          onSubmit={async (data) => {
            if (isEdit) {
              await updateSite(id!, data)
              navigate(`/sites/${id}`)
            } else {
              const created = await addSite(data)
              navigate(`/sites/${created.id}`)
            }
          }}
        />
      </Card>
    </div>
  )
}