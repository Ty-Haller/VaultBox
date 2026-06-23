export interface SiteConfig {
  hostname: string
  effectiveHostname: string
  detectedHostname: string
  requestHostname: string | null
  useHttps: boolean
  frontendBaseUrl: string
  backendBaseUrl: string
  webauthnRpId: string
  webauthnOrigin: string
  isDevHostname: boolean
}