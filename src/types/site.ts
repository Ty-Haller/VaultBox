export type HostnameSource = 'admin' | 'env' | 'request' | 'system'
export type UseHttpsSource = 'admin' | 'env' | 'default'

export interface SiteConfig {
  hostname: string
  effectiveHostname: string
  detectedHostname: string
  requestHostname: string | null
  envHostname: string
  envUseHttps: boolean
  hostnameSource: HostnameSource
  useHttpsSource: UseHttpsSource
  useHttps: boolean
  frontendBaseUrl: string
  backendBaseUrl: string
  webauthnRpId: string
  webauthnOrigin: string
  isDevHostname: boolean
}
