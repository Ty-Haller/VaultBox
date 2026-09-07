import { Outlet } from 'react-router-dom'
import { useVault } from '../../context/VaultContext'
import { LoadingBanner } from '../ui/LoadingBanner'
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
      </div>
    </div>
  )
}