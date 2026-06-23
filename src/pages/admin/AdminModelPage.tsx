import { AdminModelManager } from '../../components/admin/AdminModelManager'
import type { AdminModelConfig } from '../../components/admin/fieldConfig'

export function AdminModelPage({ config }: { config: AdminModelConfig }) {
  return <AdminModelManager config={config} />
}