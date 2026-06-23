import type { SsoProviderType } from '../types/sso'

export interface SsoProviderTemplate {
  type: SsoProviderType
  name: string
  authorizeUrl: string
  tokenUrl: string
  userinfoUrl: string
  scope: string
  help?: string
}

export const SSO_PROVIDER_TEMPLATES: SsoProviderTemplate[] = [
  {
    type: 'google',
    name: 'Google',
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userinfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
    scope: 'openid email profile',
    help: 'Create OAuth credentials in Google Cloud Console (Web application).',
  },
  {
    type: 'microsoft',
    name: 'Microsoft Entra ID',
    authorizeUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    userinfoUrl: 'https://graph.microsoft.com/oidc/userinfo',
    scope: 'openid email profile',
    help: 'Register an app in Azure Portal → App registrations. Use the common tenant or your tenant ID in URLs.',
  },
  {
    type: 'okta',
    name: 'Okta',
    authorizeUrl: 'https://{yourOktaDomain}/oauth2/default/v1/authorize',
    tokenUrl: 'https://{yourOktaDomain}/oauth2/default/v1/token',
    userinfoUrl: 'https://{yourOktaDomain}/oauth2/default/v1/userinfo',
    scope: 'openid email profile',
    help: 'Replace {yourOktaDomain} with your Okta org domain (e.g. dev-123456.okta.com).',
  },
  {
    type: 'generic',
    name: 'Generic OIDC',
    authorizeUrl: '',
    tokenUrl: '',
    userinfoUrl: '',
    scope: 'openid email profile',
    help: 'Any OpenID Connect provider — enter authorize, token, and userinfo endpoints.',
  },
]

export function getSsoTemplate(type: SsoProviderType): SsoProviderTemplate {
  return SSO_PROVIDER_TEMPLATES.find((t) => t.type === type) ?? SSO_PROVIDER_TEMPLATES[3]
}