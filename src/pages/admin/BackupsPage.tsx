import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  CloudUpload,
  Database,
  Download,
  FileUp,
  HardDrive,
  Lock,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { RcloneRemoteBuilderModal } from '../../components/admin/RcloneRemoteBuilderModal'
import { Badge } from '../../components/ui/Badge'
import { Card, CardHeader } from '../../components/ui/Card'
import { FormField, inputClass, selectClass } from '../../components/ui/FormField'
import { Modal } from '../../components/ui/Modal'
import { adminApi } from '../../lib/adminApi'
import { useDemo } from '../../context/DemoContext'
import { formatBytes, formatDateTime } from '../../lib/utils'
import type { BackupRecord, BackupSchedule, BackupStorageInfo, RcloneRemote } from '../../types/backups'

const STATUS_VARIANT: Record<BackupRecord['status'], 'success' | 'danger' | 'warning' | 'info'> = {
  completed: 'success',
  failed: 'danger',
  running: 'warning',
  pending: 'info',
}

export function BackupsPage() {
  const { publicDemo } = useDemo()
  const [backups, setBackups] = useState<BackupRecord[]>([])
  const [, setSchedule] = useState<BackupSchedule | null>(null)
  const [remotes, setRemotes] = useState<RcloneRemote[]>([])
  const [storage, setStorage] = useState<BackupStorageInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [creating, setCreating] = useState(false)
  const [includeMedia, setIncludeMedia] = useState(true)
  const [encrypt, setEncrypt] = useState(false)
  const [password, setPassword] = useState('')
  const [uploadToRclone, setUploadToRclone] = useState(false)
  const [remoteId, setRemoteId] = useState('')

  const [savingSchedule, setSavingSchedule] = useState(false)
  const [scheduleDraft, setScheduleDraft] = useState<BackupSchedule & { encryptionPassword?: string } | null>(null)

  const [savingRemotes, setSavingRemotes] = useState(false)
  const [remoteModalOpen, setRemoteModalOpen] = useState(false)
  const [testingRemoteId, setTestingRemoteId] = useState<string | null>(null)

  const [restoreTarget, setRestoreTarget] = useState<BackupRecord | null>(null)
  const [restoreConfirm, setRestoreConfirm] = useState('')
  const [restorePassword, setRestorePassword] = useState('')
  const [restoring, setRestoring] = useState(false)

  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadConfirm, setUploadConfirm] = useState('')
  const [uploadPassword, setUploadPassword] = useState('')
  const [uploadRestoring, setUploadRestoring] = useState(false)

  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [backupList, sched, rclone, stor] = await Promise.all([
        adminApi.listBackups(),
        adminApi.getBackupSchedule(),
        adminApi.getBackupRclone(),
        adminApi.getBackupStorage(),
      ])
      setBackups(backupList)
      setSchedule(sched)
      setScheduleDraft({ ...sched, encryptionPassword: '' })
      setRemotes(rclone.remotes)
      setStorage(stor)
      setRemoteId((prev) => {
        if (prev) return prev
        if (rclone.remotes.length === 0) return prev
        return sched.defaultRemoteId ?? rclone.remotes[0].id
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load backup settings')
    } finally {
      setLoading(false)
    }
  }, [publicDemo])

  useEffect(() => { load() }, [load])

  const flash = (message: string) => {
    setSuccess(message)
    setTimeout(() => setSuccess(null), 6000)
  }

  const createBackup = async () => {
    setCreating(true)
    setError(null)
    try {
      const record = await adminApi.createBackup({
        includeMedia,
        encrypt,
        password: encrypt ? password : undefined,
        uploadToRclone,
        remoteId: uploadToRclone ? remoteId : undefined,
      })
      setPassword('')
      await load()
      if (record.status === 'completed') {
        flash(`Backup created: ${record.filename}`)
      } else {
        setError(record.error || 'Backup failed')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Backup failed')
    } finally {
      setCreating(false)
    }
  }

  const saveSchedule = async () => {
    if (!scheduleDraft) return
    setSavingSchedule(true)
    setError(null)
    try {
      const payload: Record<string, unknown> = {
        enabled: scheduleDraft.enabled,
        frequency: scheduleDraft.frequency,
        hourUtc: scheduleDraft.hourUtc,
        keepCount: scheduleDraft.keepCount,
        includeMedia: scheduleDraft.includeMedia,
        uploadToRclone: scheduleDraft.uploadToRclone,
        defaultRemoteId: scheduleDraft.defaultRemoteId,
        encryptionEnabled: scheduleDraft.encryptionEnabled,
      }
      if (scheduleDraft.encryptionPassword) {
        payload.encryptionPassword = scheduleDraft.encryptionPassword
      }
      const updated = await adminApi.updateBackupSchedule(payload)
      setSchedule(updated)
      setScheduleDraft({ ...updated, encryptionPassword: '' })
      flash('Backup schedule saved')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save schedule')
    } finally {
      setSavingSchedule(false)
    }
  }

  const saveRemotes = async (next: RcloneRemote[]) => {
    setSavingRemotes(true)
    setError(null)
    try {
      const updated = await adminApi.updateBackupRclone({ remotes: next })
      setRemotes(updated.remotes)
      flash('rclone remotes saved')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save remotes')
    } finally {
      setSavingRemotes(false)
    }
  }

  const addRemote = (remote: Omit<RcloneRemote, 'id'>) => {
    const next = [...remotes, { ...remote, id: crypto.randomUUID() }]
    setRemotes(next)
    void saveRemotes(next)
  }

  const removeRemote = (id: string) => {
    if (!confirm('Remove this rclone remote?')) return
    const next = remotes.filter((r) => r.id !== id)
    setRemotes(next)
    void saveRemotes(next)
  }

  const testRemote = async (id: string) => {
    setTestingRemoteId(id)
    setError(null)
    try {
      const result = await adminApi.testBackupRclone(id)
      if (result.ok) flash('rclone connection successful')
      else setError(result.error || 'rclone test failed')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'rclone test failed')
    } finally {
      setTestingRemoteId(null)
    }
  }

  const downloadBackup = async (id: string) => {
    setBusyId(id)
    setError(null)
    try {
      await adminApi.downloadBackup(id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed')
    } finally {
      setBusyId(null)
    }
  }

  const deleteBackup = async (id: string) => {
    if (!confirm('Delete this backup file?')) return
    setBusyId(id)
    setError(null)
    try {
      await adminApi.deleteBackup(id)
      await load()
      flash('Backup deleted')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setBusyId(null)
    }
  }

  const runRestore = async () => {
    if (!restoreTarget) return
    setRestoring(true)
    setError(null)
    try {
      const result = await adminApi.restoreBackup(restoreTarget.id, {
        confirm: restoreConfirm,
        password: restoreTarget.encrypted ? restorePassword : undefined,
      })
      setRestoreTarget(null)
      setRestoreConfirm('')
      setRestorePassword('')
      await load()
      flash(result.message)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Restore failed')
    } finally {
      setRestoring(false)
    }
  }

  const uploadEncrypted = uploadFile?.name.toLowerCase().endsWith('.vaultbox') ?? false

  const runUploadRestore = async () => {
    if (!uploadFile) return
    setUploadRestoring(true)
    setError(null)
    try {
      const result = await adminApi.restoreBackupUpload(uploadFile, {
        confirm: uploadConfirm,
        password: uploadEncrypted ? uploadPassword : undefined,
      })
      setUploadFile(null)
      setUploadConfirm('')
      setUploadPassword('')
      await load()
      flash(result.message)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Restore failed')
    } finally {
      setUploadRestoring(false)
    }
  }

  if (loading && !scheduleDraft) {
    return <p className="text-sm text-vault-500">Loading backups…</p>
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/admin" className="rounded-md p-1.5 text-vault-500 hover:bg-vault-100">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h2 className="text-xl font-bold text-vault-900">Backups</h2>
            <p className="text-sm text-vault-500">On-demand and scheduled database backups with optional encryption and off-site upload</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => load()}
          className="flex items-center gap-2 rounded-md border border-vault-200 px-3 py-2 text-sm hover:bg-vault-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {publicDemo && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          Public demo locks backups. This instance is wiped on a timer and must not export or restore operator data.
        </div>
      )}

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {success && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>}

      <fieldset disabled={publicDemo} className={publicDemo ? 'space-y-6 opacity-60' : 'contents'}>

      {storage && (
        <Card>
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <HardDrive className="h-5 w-5 text-vault-500" />
              <div>
                <p className="text-xs text-vault-500">Local storage</p>
                <p className="font-mono text-sm text-vault-800">{storage.path}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-vault-500">Files</p>
              <p className="text-sm font-medium text-vault-900">{storage.fileCount}</p>
            </div>
            <div>
              <p className="text-xs text-vault-500">Total size</p>
              <p className="text-sm font-medium text-vault-900">{formatBytes(storage.totalSizeBytes)}</p>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title="Restore from upload" subtitle="Import a .tar.gz or .vaultbox file from another server or off-site copy" />
        <div className="space-y-4">
          <p className="text-sm text-vault-600">
            A safety backup of the current database is created automatically before restore.
            Restart the VaultBox server afterward to reload the database.
          </p>
          <FormField label="Backup file" help="Accepts vaultbox-backup-*.tar.gz or vaultbox-backup-*.vaultbox">
            <input
              type="file"
              accept=".tar.gz,.vaultbox,application/gzip,application/octet-stream"
              className={inputClass}
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null
                setUploadFile(file)
                setUploadPassword('')
                setUploadConfirm('')
              }}
            />
          </FormField>
          {uploadFile && (
            <p className="text-xs text-vault-500">
              Selected: <span className="font-mono text-vault-700">{uploadFile.name}</span> ({formatBytes(uploadFile.size)})
            </p>
          )}
          {uploadEncrypted && (
            <FormField label="Decryption password">
              <input
                type="password"
                className={inputClass}
                value={uploadPassword}
                onChange={(e) => setUploadPassword(e.target.value)}
                autoComplete="current-password"
              />
            </FormField>
          )}
          <FormField label='Type RESTORE to confirm'>
            <input
              className={inputClass}
              value={uploadConfirm}
              onChange={(e) => setUploadConfirm(e.target.value)}
              placeholder="RESTORE"
            />
          </FormField>
          <button
            type="button"
            onClick={runUploadRestore}
            disabled={
              uploadRestoring
              || !uploadFile
              || uploadConfirm !== 'RESTORE'
              || (uploadEncrypted && !uploadPassword)
            }
            className="flex w-full items-center justify-center gap-2 rounded-md bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50 sm:w-auto"
          >
            <FileUp className="h-4 w-4" />
            {uploadRestoring ? 'Restoring…' : 'Upload and restore'}
          </button>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Create backup" subtitle="SQLite database and optional media files" />
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm text-vault-700">
              <input type="checkbox" checked={includeMedia} onChange={(e) => setIncludeMedia(e.target.checked)} />
              Include uploaded media files
            </label>
            <label className="flex items-center gap-2 text-sm text-vault-700">
              <input type="checkbox" checked={encrypt} onChange={(e) => setEncrypt(e.target.checked)} />
              Encrypt with password (.vaultbox)
            </label>
            {encrypt && (
              <FormField label="Encryption password" help="Store this password securely — it cannot be recovered.">
                <input
                  type="password"
                  className={inputClass}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </FormField>
            )}
            <label className="flex items-center gap-2 text-sm text-vault-700">
              <input type="checkbox" checked={uploadToRclone} onChange={(e) => setUploadToRclone(e.target.checked)} disabled={remotes.length === 0} />
              Upload to rclone remote
            </label>
            {uploadToRclone && remotes.length > 0 && (
              <FormField label="Remote">
                <select className={selectClass} value={remoteId} onChange={(e) => setRemoteId(e.target.value)}>
                  {remotes.map((r) => (
                    <option key={r.id} value={r.id}>{r.name} ({r.type})</option>
                  ))}
                </select>
              </FormField>
            )}
            <button
              type="button"
              onClick={createBackup}
              disabled={creating || (encrypt && !password)}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-gold-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-gold-600 disabled:opacity-50"
            >
              <Database className="h-4 w-4" />
              {creating ? 'Creating backup…' : 'Create backup now'}
            </button>
          </div>
        </Card>

        {scheduleDraft && (
          <Card>
            <CardHeader title="Scheduled backups" subtitle="Cron-driven retention (keep N newest)" />
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-sm text-vault-700">
                <input
                  type="checkbox"
                  checked={scheduleDraft.enabled}
                  onChange={(e) => setScheduleDraft((s) => s && { ...s, enabled: e.target.checked })}
                />
                Enable scheduled backups
              </label>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Frequency">
                  <select
                    className={selectClass}
                    value={scheduleDraft.frequency}
                    onChange={(e) => setScheduleDraft((s) => s && { ...s, frequency: e.target.value as BackupSchedule['frequency'] })}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </FormField>
                <FormField label="Hour (UTC)">
                  <input
                    type="number"
                    min={0}
                    max={23}
                    className={inputClass}
                    value={scheduleDraft.hourUtc}
                    onChange={(e) => setScheduleDraft((s) => s && { ...s, hourUtc: Number(e.target.value) })}
                  />
                </FormField>
              </div>
              <FormField label="Keep count" help="Older completed backups are deleted automatically.">
                <input
                  type="number"
                  min={1}
                  max={365}
                  className={inputClass}
                  value={scheduleDraft.keepCount}
                  onChange={(e) => setScheduleDraft((s) => s && { ...s, keepCount: Number(e.target.value) })}
                />
              </FormField>
              <label className="flex items-center gap-2 text-sm text-vault-700">
                <input
                  type="checkbox"
                  checked={scheduleDraft.includeMedia}
                  onChange={(e) => setScheduleDraft((s) => s && { ...s, includeMedia: e.target.checked })}
                />
                Include media
              </label>
              <label className="flex items-center gap-2 text-sm text-vault-700">
                <input
                  type="checkbox"
                  checked={scheduleDraft.uploadToRclone}
                  onChange={(e) => setScheduleDraft((s) => s && { ...s, uploadToRclone: e.target.checked })}
                  disabled={remotes.length === 0}
                />
                Upload to rclone
              </label>
              {scheduleDraft.uploadToRclone && remotes.length > 0 && (
                <FormField label="Default remote">
                  <select
                    className={selectClass}
                    value={scheduleDraft.defaultRemoteId ?? ''}
                    onChange={(e) => setScheduleDraft((s) => s && { ...s, defaultRemoteId: e.target.value || null })}
                  >
                    <option value="">— Select —</option>
                    {remotes.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </FormField>
              )}
              <label className="flex items-center gap-2 text-sm text-vault-700">
                <input
                  type="checkbox"
                  checked={scheduleDraft.encryptionEnabled}
                  onChange={(e) => setScheduleDraft((s) => s && { ...s, encryptionEnabled: e.target.checked })}
                />
                Encrypt scheduled backups
              </label>
              {scheduleDraft.encryptionEnabled && (
                <FormField
                  label="Schedule encryption password"
                  help={scheduleDraft.hasEncryptionSecret ? 'Leave blank to keep the current password.' : 'Required when enabling encryption.'}
                >
                  <input
                    type="password"
                    className={inputClass}
                    value={scheduleDraft.encryptionPassword ?? ''}
                    onChange={(e) => setScheduleDraft((s) => s && { ...s, encryptionPassword: e.target.value })}
                    autoComplete="new-password"
                  />
                </FormField>
              )}
              <button
                type="button"
                onClick={saveSchedule}
                disabled={savingSchedule}
                className="rounded-md border border-vault-200 px-4 py-2 text-sm font-medium hover:bg-vault-50 disabled:opacity-50"
              >
                {savingSchedule ? 'Saving…' : 'Save schedule'}
              </button>
            </div>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader
          title="rclone remotes"
          subtitle="Off-site upload destinations (requires rclone on server PATH)"
          action={
            <button
              type="button"
              onClick={() => setRemoteModalOpen(true)}
              className="flex items-center gap-1.5 rounded-md border border-vault-200 px-3 py-1.5 text-sm hover:bg-vault-50"
            >
              <Plus className="h-4 w-4" />
              Add remote
            </button>
          }
        />
        {remotes.length === 0 ? (
          <p className="text-sm text-vault-500">No remotes configured. Add one to enable off-site uploads.</p>
        ) : (
          <div className="space-y-3">
            {remotes.map((remote) => (
              <div
                key={remote.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-vault-200 px-4 py-3 dark:border-vault-700"
              >
                <div>
                  <p className="font-medium text-vault-900">{remote.name}</p>
                  <p className="font-mono text-xs text-vault-500">
                    {remote.type} · {remote.destinationPath || '(root)'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => testRemote(remote.id)}
                    disabled={testingRemoteId === remote.id || savingRemotes}
                    className="rounded-md border border-vault-200 px-3 py-1.5 text-xs hover:bg-vault-50 disabled:opacity-50"
                  >
                    {testingRemoteId === remote.id ? 'Testing…' : 'Test'}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeRemote(remote.id)}
                    disabled={savingRemotes}
                    className="rounded-md border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card padding={false}>
        <div className="border-b border-vault-200 px-5 py-4 dark:border-vault-700">
          <h3 className="text-sm font-semibold text-vault-900">Backup history</h3>
          <p className="mt-0.5 text-xs text-vault-500">Last 100 backups (pre-restore safety copies hidden)</p>
        </div>
        {backups.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-vault-500">No backups yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-vault-200 text-xs uppercase tracking-wide text-vault-500 dark:border-vault-700">
                  <th className="px-5 py-3 font-medium">File</th>
                  <th className="px-3 py-3 font-medium">Size</th>
                  <th className="px-3 py-3 font-medium">Trigger</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Created</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((b) => (
                  <tr key={b.id} className="border-b border-vault-100 dark:border-vault-800">
                    <td className="px-5 py-3">
                      <p className="font-mono text-xs text-vault-800">{b.filename}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {b.encrypted && (
                          <Badge variant="gold"><Lock className="mr-1 inline h-3 w-3" />encrypted</Badge>
                        )}
                        {b.rcloneUploaded && (
                          <Badge variant="info"><CloudUpload className="mr-1 inline h-3 w-3" />rclone</Badge>
                        )}
                        {!b.includeMedia && <Badge>db only</Badge>}
                      </div>
                      {b.error && b.status === 'failed' && (
                        <p className="mt-1 text-xs text-red-600">{b.error}</p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-vault-600">{formatBytes(b.sizeBytes)}</td>
                    <td className="px-3 py-3 capitalize text-vault-600">{b.trigger}</td>
                    <td className="px-3 py-3">
                      <Badge variant={STATUS_VARIANT[b.status]}>{b.status}</Badge>
                    </td>
                    <td className="px-3 py-3 text-vault-600">{formatDateTime(b.createdAt)}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        {b.status === 'completed' && (
                          <>
                            <button
                              type="button"
                              title="Download"
                              onClick={() => downloadBackup(b.id)}
                              disabled={busyId === b.id}
                              className="rounded p-1.5 text-vault-500 hover:bg-vault-100 disabled:opacity-50"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              title="Restore"
                              onClick={() => { setRestoreTarget(b); setRestoreConfirm(''); setRestorePassword('') }}
                              disabled={busyId === b.id}
                              className="rounded p-1.5 text-amber-600 hover:bg-amber-50 disabled:opacity-50"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          title="Delete"
                          onClick={() => deleteBackup(b.id)}
                          disabled={busyId === b.id}
                          className="rounded p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <RcloneRemoteBuilderModal open={remoteModalOpen} onClose={() => setRemoteModalOpen(false)} onAdd={addRemote} />

      <Modal
        open={!!restoreTarget}
        onClose={() => !restoring && setRestoreTarget(null)}
        title="Restore backup"
        size="md"
      >
        {restoreTarget && (
          <div className="space-y-4">
            <p className="text-sm text-vault-600">
              This will replace the current database{restoreTarget.includeMedia ? ' and media files' : ''} with the
              contents of <span className="font-mono text-vault-800">{restoreTarget.filename}</span>.
              A safety backup is created automatically before restore.
            </p>
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              You must restart the VaultBox server after restore to reload the database.
            </p>
            {restoreTarget.encrypted && (
              <FormField label="Decryption password">
                <input
                  type="password"
                  className={inputClass}
                  value={restorePassword}
                  onChange={(e) => setRestorePassword(e.target.value)}
                  autoComplete="current-password"
                />
              </FormField>
            )}
            <FormField label='Type RESTORE to confirm'>
              <input
                className={inputClass}
                value={restoreConfirm}
                onChange={(e) => setRestoreConfirm(e.target.value)}
                placeholder="RESTORE"
              />
            </FormField>
            <div className="flex justify-end gap-2 border-t border-vault-200 pt-4">
              <button type="button" onClick={() => setRestoreTarget(null)} disabled={restoring} className="rounded-md border border-vault-200 px-4 py-2 text-sm">
                Cancel
              </button>
              <button
                type="button"
                onClick={runRestore}
                disabled={restoring || restoreConfirm !== 'RESTORE' || (restoreTarget.encrypted && !restorePassword)}
                className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {restoring ? 'Restoring…' : 'Restore'}
              </button>
            </div>
          </div>
        )}
      </Modal>
      </fieldset>
    </div>
  )
}