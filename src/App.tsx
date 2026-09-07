import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { DemoProvider } from './context/DemoContext'
import { VaultProvider } from './context/VaultContext'
import { PricesProvider } from './context/PricesContext'
import { AdminProvider } from './context/AdminContext'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { Layout } from './components/layout/Layout'
import { UnsupportedClientGate } from './components/layout/UnsupportedClientGate'
import { LoginPage } from './pages/LoginPage'
import { SignupPage } from './pages/SignupPage'
import { SetupPasskeyPage } from './pages/SetupPasskeyPage'
import { UserSettingsPage } from './pages/UserSettingsPage'
import { Dashboard } from './pages/Dashboard'
import { Inventory } from './pages/Inventory'
import { HoldingDetail } from './pages/HoldingDetail'
import { HoldingFormPage } from './pages/HoldingFormPage'
import { Vaults } from './pages/Vaults'
import { VaultDetail } from './pages/VaultDetail'
import { VaultFormPage } from './pages/VaultFormPage'
import { Sites } from './pages/Sites'
import { SiteDetail } from './pages/SiteDetail'
import { SiteFormPage } from './pages/SiteFormPage'
import { Prices } from './pages/Prices'
import { PriceChartPage } from './pages/PriceChartPage'
import { Reports } from './pages/Reports'
import { Lookup } from './pages/Lookup'
import { AuditFormPage } from './pages/AuditFormPage'
import { AuditStartPage } from './pages/AuditStartPage'
import { Secrets } from './pages/Secrets'
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { PriceTickerSettings } from './pages/admin/PriceTickerSettings'
import { AppSettingsPage } from './pages/admin/AppSettingsPage'
import { NotificationDefaultsPage } from './pages/admin/NotificationDefaultsPage'
import { RoleNotificationDefaultsPage } from './pages/admin/RoleNotificationDefaultsPage'
import { NotificationDeliveryPage } from './pages/admin/NotificationDeliveryPage'
import { BackupsPage } from './pages/admin/BackupsPage'
import { SsoSettingsPage } from './pages/admin/SsoSettingsPage'
import { SiteSettingsPage } from './pages/admin/SiteSettingsPage'
import { Audits } from './pages/Audits'
import { AuditDetailPage } from './pages/AuditDetailPage'
import { ChangeLog } from './pages/ChangeLog'
import { AdminModelPage } from './pages/admin/AdminModelPage'
import { UserManager } from './components/admin/UserManager'
import { GroupsRolesManager } from './components/admin/GroupsRolesManager'
import { SignupRequestsManager } from './components/admin/SignupRequestsManager'
import {
  SITE_TYPE_CONFIG,
  VAULT_TYPE_CONFIG,
  METAL_TYPE_CONFIG,
  DEALER_CONFIG,
  CRYPTO_TOKEN_CONFIG,
  ASSET_CATEGORY_CONFIG,
  PRODUCT_TYPE_CONFIG,
  FORM_FACTOR_CONFIG,
  CURRENCY_CONFIG,
  AUDIT_CONFIG,
} from './components/admin/fieldConfig'

function AppProviders() {
  return (
    <VaultProvider>
      <AdminProvider>
        <PricesProvider>
          <Outlet />
        </PricesProvider>
      </AdminProvider>
    </VaultProvider>
  )
}

export default function App() {
  return (
    <UnsupportedClientGate>
    <AuthProvider>
      <DemoProvider>
        <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/setup-passkey" element={<SetupPasskeyPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppProviders />}>
              <Route path="lookup/:code" element={<Layout />}>
                <Route index element={<Lookup />} />
              </Route>
              <Route element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="lookup" element={<Lookup />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="inventory/new" element={<HoldingFormPage />} />
                <Route path="inventory/:id/edit" element={<HoldingFormPage />} />
                <Route path="inventory/:id" element={<HoldingDetail />} />
                <Route path="vaults" element={<Vaults />} />
                <Route path="vaults/new" element={<VaultFormPage />} />
                <Route path="vaults/:id/edit" element={<VaultFormPage />} />
                <Route path="vaults/:id/audit/:sessionId" element={<AuditFormPage />} />
                <Route path="vaults/:id/audit" element={<AuditStartPage />} />
                <Route path="vaults/:id" element={<VaultDetail />} />
                <Route path="sites" element={<Sites />} />
                <Route path="sites/new" element={<SiteFormPage />} />
                <Route path="sites/:id/edit" element={<SiteFormPage />} />
                <Route path="sites/:id" element={<SiteDetail />} />
                <Route path="prices" element={<Prices />} />
                <Route path="prices/:type/:symbol" element={<PriceChartPage />} />
                <Route path="reports" element={<Reports />} />
                <Route path="audits" element={<Audits />} />
                <Route path="audits/:id" element={<AuditDetailPage />} />
                <Route path="changelog" element={<ChangeLog />} />
                <Route path="secrets" element={<Secrets />} />
                <Route path="settings" element={<UserSettingsPage />} />
                <Route path="admin" element={<AdminDashboard />} />
                <Route path="admin/site-types" element={<AdminModelPage config={SITE_TYPE_CONFIG} />} />
                <Route path="admin/vault-types" element={<AdminModelPage config={VAULT_TYPE_CONFIG} />} />
                <Route path="admin/metal-types" element={<AdminModelPage config={METAL_TYPE_CONFIG} />} />
                <Route path="admin/dealers" element={<AdminModelPage config={DEALER_CONFIG} />} />
                <Route path="admin/crypto-tokens" element={<AdminModelPage config={CRYPTO_TOKEN_CONFIG} />} />
                <Route path="admin/asset-categories" element={<AdminModelPage config={ASSET_CATEGORY_CONFIG} />} />
                <Route path="admin/product-types" element={<AdminModelPage config={PRODUCT_TYPE_CONFIG} />} />
                <Route path="admin/coin-types" element={<AdminModelPage config={FORM_FACTOR_CONFIG} />} />
                <Route path="admin/currencies" element={<AdminModelPage config={CURRENCY_CONFIG} />} />
                <Route path="admin/settings" element={<AppSettingsPage />} />
                <Route path="admin/price-ticker" element={<PriceTickerSettings />} />
                <Route path="admin/notifications" element={<NotificationDefaultsPage />} />
                <Route path="admin/notification-roles" element={<RoleNotificationDefaultsPage />} />
                <Route path="admin/notification-delivery" element={<NotificationDeliveryPage />} />
                <Route path="admin/backups" element={<BackupsPage />} />
                <Route path="admin/site" element={<SiteSettingsPage />} />
                <Route path="admin/sso" element={<SsoSettingsPage />} />
                <Route path="admin/audit-workflows" element={<AdminModelPage config={AUDIT_CONFIG} />} />
                <Route path="admin/users" element={<UserManager />} />
                <Route path="admin/groups" element={<GroupsRolesManager />} />
                <Route path="admin/signup-requests" element={<SignupRequestsManager />} />
              </Route>
            </Route>
          </Route>
        </Routes>
        </BrowserRouter>
      </DemoProvider>
    </AuthProvider>
    </UnsupportedClientGate>
  )
}