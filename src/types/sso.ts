export type SsoProviderType = 'google' | 'microsoft' | 'okta' | 'generic'

export interface SsoProvider {
  id: string
  name: string
  enabled: boolean
  type: SsoProviderType
  clientId: string
  authorizeUrl: string
  tokenUrl: string
  userinfoUrl: string
  scope: string
  redirectUri: string
  hasClientSecret: boolean
}

export interface SsoConfig {
  providers: SsoProvider[]
  callbackUrlTemplate: string
  exampleCallbackUrl: string
}

export interface SsoProviderDraft extends Omit<SsoProvider, 'hasClientSecret'> {
  clientSecret?: string
}