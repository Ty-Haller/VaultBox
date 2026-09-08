import { Link, Outlet } from 'react-router-dom'
import { useVault } from '../../context/VaultContext'
import { LoadingBanner } from '../ui/LoadingBanner'
import { VersionBubbles } from '../brand/VersionBubbles'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { DemoBanner } from './DemoBanner'

export function Layout() {
  const { loading, error } = useVault()

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DemoBanner />
        <Header />
        <main className="flex-1 overflow-y-auto bg-vault-50 p-6 dark:bg-vault-950 dark:text-vault-100">
          <LoadingBanner loading={loading} error={error} />
          <Outlet />
        </main>
        <footer className="shrink-0 border-t border-vault-200 bg-white px-6 py-2 dark:border-vault-700 dark:bg-vault-900">
          <div className="flex items-center justify-between gap-3">
            <Link to="/admin/about" className="text-xs text-vault-400 hover:text-gold-500">
              VaultBox
            </Link>
            <VersionBubbles />
          </div>
        </footer>
      </div>
    </div>
  )
}