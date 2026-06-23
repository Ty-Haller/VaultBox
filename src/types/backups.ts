export type BackupTrigger = 'manual' | 'scheduled' | 'pre_restore'
export type BackupStatus = 'pending' | 'running' | 'completed' | 'failed'
export type BackupFrequency = 'daily' | 'weekly'

export interface BackupRecord {
  id: string
  filename: string
  sizeBytes: number
  trigger: BackupTrigger
  status: BackupStatus
  error: string
  includeMedia: boolean
  encrypted: boolean
  rcloneRemoteId: string
  rcloneUploaded: boolean
  createdAt: string
}

export interface BackupSchedule {
  enabled: boolean
  frequency: BackupFrequency
  hourUtc: number
  keepCount: number
  includeMedia: boolean
  uploadToRclone: boolean
  defaultRemoteId: string | null
  encryptionEnabled: boolean
  hasEncryptionSecret: boolean
}

export interface RcloneRemote {
  id: string
  name: string
  type: string
  config: Record<string, string>
  destinationPath: string
}

export interface RcloneConfig {
  remotes: RcloneRemote[]
}

export interface BackupStorageInfo {
  path: string
  totalSizeBytes: number
  fileCount: number
}

export interface BackupRestoreResult {
  restored: boolean
  backupId: string | null | null
  restartRequired: boolean
  message: string
}