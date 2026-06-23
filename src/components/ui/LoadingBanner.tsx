import { AlertCircle, Loader2 } from 'lucide-react'

export function LoadingBanner({ loading, error }: { loading?: boolean; error?: string | null }) {
  if (error) {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>{error}. Run <code className="font-mono">npm run start</code> from the project root (starts backend + frontend).</span>
      </div>
    )
  }
  if (loading) {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-vault-200 bg-white px-4 py-3 text-sm text-vault-600 dark:border-vault-700 dark:bg-vault-900 dark:text-vault-300">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading inventory data...
      </div>
    )
  }
  return null
}