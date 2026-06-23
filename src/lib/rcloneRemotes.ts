export type RcloneCategory = 'cloud' | 'storage' | 'protocol' | 'local'

export const RCLONE_CATEGORY_LABELS: Record<RcloneCategory, string> = {
  cloud: 'Cloud Storage',
  storage: 'Object Storage',
  protocol: 'Protocols',
  local: 'Local',
}

export type RcloneFieldType = 'text' | 'password' | 'number' | 'select' | 'checkbox'

export interface RcloneRemoteField {
  key: string
  label: string
  type: RcloneFieldType
  required?: boolean
  placeholder?: string
  help?: string
  options?: { value: string; label: string }[]
  rcloneKey?: string
  defaultValue?: string
}

export interface RcloneRemoteDefinition {
  id: string
  name: string
  category: RcloneCategory
  type: string
  example: string
  docUrl: string
  fields: RcloneRemoteField[]
  buildConfig: (values: Record<string, string>) => Record<string, string>
}

function trim(v: string | undefined): string {
  return (v ?? '').trim()
}

function mapFields(
  fields: RcloneRemoteField[],
  values: Record<string, string>,
  extra: Record<string, string> = {}
): Record<string, string> {
  const config: Record<string, string> = { ...extra }
  for (const field of fields) {
    const val = trim(values[field.key])
    if (!val && field.type !== 'checkbox') continue
    const key = field.rcloneKey ?? field.key
    if (field.type === 'checkbox') {
      if (values[field.key] === 'true') config[key] = 'true'
      continue
    }
    config[key] = val
  }
  return config
}

export const RCLONE_REMOTES: RcloneRemoteDefinition[] = [
  {
    id: 's3',
    name: 'Amazon S3',
    category: 'storage',
    type: 's3',
    example: 's3://bucket/vaultbox/',
    docUrl: 'https://rclone.org/s3/',
    fields: [
      { key: 'provider', label: 'Provider', type: 'select', defaultValue: 'AWS', options: [{ value: 'AWS', label: 'AWS' }, { value: 'Wasabi', label: 'Wasabi' }], rcloneKey: 'provider' },
      { key: 'access_key_id', label: 'Access key ID', type: 'text', required: true, rcloneKey: 'access_key_id' },
      { key: 'secret_access_key', label: 'Secret access key', type: 'password', required: true, rcloneKey: 'secret_access_key' },
      { key: 'region', label: 'Region', type: 'text', placeholder: 'us-east-1', rcloneKey: 'region' },
      { key: 'endpoint', label: 'Endpoint', type: 'text', placeholder: 'Optional custom endpoint', rcloneKey: 'endpoint' },
    ],
    buildConfig: (v) => mapFields(RCLONE_REMOTES.find((r) => r.id === 's3')!.fields, v, { provider: v.provider || 'AWS' }),
  },
  {
    id: 'b2',
    name: 'Backblaze B2',
    category: 'storage',
    type: 'b2',
    example: 'b2:bucket/vaultbox/',
    docUrl: 'https://rclone.org/b2/',
    fields: [
      { key: 'account', label: 'Account ID', type: 'text', required: true },
      { key: 'key', label: 'Application key', type: 'password', required: true },
    ],
    buildConfig: (v) => mapFields(RCLONE_REMOTES.find((r) => r.id === 'b2')!.fields, v),
  },
  {
    id: 'gdrive',
    name: 'Google Drive',
    category: 'cloud',
    type: 'drive',
    example: 'drive:VaultBox/backups/',
    docUrl: 'https://rclone.org/drive/',
    fields: [
      { key: 'scope', label: 'Scope', type: 'select', defaultValue: 'drive', options: [{ value: 'drive', label: 'Full drive' }, { value: 'drive.file', label: 'App folder' }], rcloneKey: 'scope' },
      { key: 'token', label: 'Token JSON', type: 'password', required: true, help: 'Paste rclone token JSON from: rclone authorize drive' },
    ],
    buildConfig: (v) => mapFields(RCLONE_REMOTES.find((r) => r.id === 'gdrive')!.fields, v, { scope: v.scope || 'drive' }),
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    category: 'cloud',
    type: 'dropbox',
    example: 'dropbox:VaultBox/backups/',
    docUrl: 'https://rclone.org/dropbox/',
    fields: [
      { key: 'token', label: 'Token JSON', type: 'password', required: true, help: 'Paste rclone token JSON from: rclone authorize dropbox' },
    ],
    buildConfig: (v) => mapFields(RCLONE_REMOTES.find((r) => r.id === 'dropbox')!.fields, v),
  },
  {
    id: 'onedrive',
    name: 'OneDrive',
    category: 'cloud',
    type: 'onedrive',
    example: 'onedrive:backups/',
    docUrl: 'https://rclone.org/onedrive/',
    fields: [
      { key: 'token', label: 'Token JSON', type: 'password', required: true, help: 'Paste rclone token JSON from: rclone authorize onedrive' },
    ],
    buildConfig: (v) => mapFields(RCLONE_REMOTES.find((r) => r.id === 'onedrive')!.fields, v),
  },
  {
    id: 'sftp',
    name: 'SFTP',
    category: 'protocol',
    type: 'sftp',
    example: 'sftp:host:/backups/vaultbox/',
    docUrl: 'https://rclone.org/sftp/',
    fields: [
      { key: 'host', label: 'Host', type: 'text', required: true },
      { key: 'user', label: 'Username', type: 'text', required: true },
      { key: 'pass', label: 'Password', type: 'password', rcloneKey: 'pass' },
      { key: 'port', label: 'Port', type: 'number', placeholder: '22' },
    ],
    buildConfig: (v) => mapFields(RCLONE_REMOTES.find((r) => r.id === 'sftp')!.fields, v),
  },
  {
    id: 'webdav',
    name: 'WebDAV',
    category: 'protocol',
    type: 'webdav',
    example: 'webdav:https://example.com/remote.php/dav/',
    docUrl: 'https://rclone.org/webdav/',
    fields: [
      { key: 'url', label: 'URL', type: 'text', required: true },
      { key: 'vendor', label: 'Vendor', type: 'select', defaultValue: 'other', options: [{ value: 'other', label: 'Other' }, { value: 'nextcloud', label: 'Nextcloud' }, { value: 'owncloud', label: 'ownCloud' }] },
      { key: 'user', label: 'Username', type: 'text', required: true },
      { key: 'pass', label: 'Password', type: 'password', rcloneKey: 'pass' },
    ],
    buildConfig: (v) => mapFields(RCLONE_REMOTES.find((r) => r.id === 'webdav')!.fields, v, { vendor: v.vendor || 'other' }),
  },
  {
    id: 'local',
    name: 'Local path',
    category: 'local',
    type: 'local',
    example: 'local:/mnt/backups/vaultbox/',
    docUrl: 'https://rclone.org/local/',
    fields: [
      { key: 'noconfig', label: 'No config needed', type: 'text', required: false, help: 'Set destination path below (absolute path on server).' },
    ],
    buildConfig: () => ({}),
  },
]

export function getRcloneRemoteDef(id: string): RcloneRemoteDefinition | undefined {
  return RCLONE_REMOTES.find((r) => r.id === id)
}

export function searchRcloneRemotes(query: string): RcloneRemoteDefinition[] {
  const q = query.trim().toLowerCase()
  if (!q) return RCLONE_REMOTES
  return RCLONE_REMOTES.filter(
    (r) =>
      r.name.toLowerCase().includes(q) ||
      r.type.toLowerCase().includes(q) ||
      RCLONE_CATEGORY_LABELS[r.category].toLowerCase().includes(q)
  )
}

export function defaultRemoteFieldValues(def: RcloneRemoteDefinition): Record<string, string> {
  const values: Record<string, string> = { displayName: '', destinationPath: '' }
  for (const field of def.fields) {
    if (field.type === 'select' && field.options?.[0]) {
      values[field.key] = field.defaultValue ?? field.options[0].value
    } else if (field.type === 'checkbox') {
      values[field.key] = 'false'
    } else {
      values[field.key] = ''
    }
  }
  return values
}

export function buildRcloneRemote(
  def: RcloneRemoteDefinition,
  values: Record<string, string>
): { name: string; type: string; config: Record<string, string>; destinationPath: string } | { error: string } {
  const name = trim(values.displayName)
  const destinationPath = trim(values.destinationPath)
  if (!name) return { error: 'Display name is required.' }
  for (const field of def.fields) {
    if (field.required !== false && field.type !== 'checkbox' && field.key !== 'noconfig' && !trim(values[field.key])) {
      return { error: `${field.label} is required.` }
    }
  }
  return {
    name,
    type: def.type,
    config: def.buildConfig(values),
    destinationPath,
  }
}

export function remotesByCategory(
  remotes: RcloneRemoteDefinition[]
): Record<RcloneCategory, RcloneRemoteDefinition[]> {
  const grouped: Record<RcloneCategory, RcloneRemoteDefinition[]> = {
    cloud: [],
    storage: [],
    protocol: [],
    local: [],
  }
  for (const r of remotes) grouped[r.category].push(r)
  return grouped
}