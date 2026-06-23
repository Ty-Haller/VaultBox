import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Check, X } from 'lucide-react'
import { authApi, type SignupRequestInfo } from '../../lib/authApi'
import { Card } from '../ui/Card'
import { DataTable } from '../ui/DataTable'
import { Badge } from '../ui/Badge'

export function SignupRequestsManager() {
  const [requests, setRequests] = useState<SignupRequestInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [setupUrl, setSetupUrl] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setRequests(await authApi.listSignupRequests())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const approve = async (req: SignupRequestInfo) => {
    const result = await authApi.approveSignup(req.id, { globalRole: 'viewer' })
    setSetupUrl(result.setupUrl)
    await load()
  }

  const reject = async (req: SignupRequestInfo) => {
    const notes = prompt('Rejection reason (optional)') ?? ''
    await authApi.rejectSignup(req.id, notes)
    await load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/admin/users" className="rounded-md p-1.5 text-vault-500 hover:bg-vault-100"><ArrowLeft className="h-4 w-4" /></Link>
        <div>
          <h2 className="text-xl font-bold text-vault-900 dark:text-white">Signup Requests</h2>
          <p className="text-sm text-vault-600 dark:text-vault-400">Review and approve new account requests</p>
        </div>
      </div>

      {setupUrl && (
        <div className="rounded-md border border-gold-500/40 bg-gold-500/10 p-4 text-sm dark:text-vault-100">
          <p className="font-medium">Passkey setup link (send to user):</p>
          <code className="mt-2 block break-all text-xs">{setupUrl}</code>
        </div>
      )}

      <Card>
        {loading ? <p className="text-sm text-vault-600">Loading…</p> : (
          <DataTable
            keyField="id"
            data={requests}
            columns={[
              { key: 'user', header: 'User', render: (r) => <span className="font-medium">{r.username}</span> },
              { key: 'email', header: 'Email', render: (r) => r.email },
              { key: 'status', header: 'Status', render: (r) => <Badge variant={r.status === 'pending' ? 'warning' : r.status === 'approved' ? 'success' : 'danger'}>{r.status}</Badge> },
              { key: 'created', header: 'Requested', render: (r) => new Date(r.createdAt).toLocaleDateString() },
              {
                key: 'actions', header: '',
                render: (r) => r.status === 'pending' ? (
                  <div className="flex gap-1">
                    <button type="button" onClick={() => approve(r)} className="rounded p-1 text-green-600" title="Approve"><Check className="h-4 w-4" /></button>
                    <button type="button" onClick={() => reject(r)} className="rounded p-1 text-red-500" title="Reject"><X className="h-4 w-4" /></button>
                  </div>
                ) : null,
              },
            ]}
          />
        )}
      </Card>
    </div>
  )
}