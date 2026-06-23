import { useRef, useState } from 'react'
import { Download, FileText, Trash2, Upload } from 'lucide-react'
import type { Document, DocumentType } from '../../types'
import { api } from '../../lib/api'
import { formatDateTime } from '../../lib/utils'
import { Card, CardHeader } from '../ui/Card'
import { Badge } from '../ui/Badge'

interface DocumentSectionProps {
  documents: Document[]
  holdingId: string
  onChange: () => void
}

export function DocumentSection({ documents, holdingId, onChange }: DocumentSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [docType, setDocType] = useState<DocumentType>('invoice')
  const [uploading, setUploading] = useState(false)

  const upload = async (files: FileList | null) => {
    if (!files?.length) return
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        await api.uploadDocument(file, holdingId, docType)
      }
      onChange()
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this document?')) return
    await api.deleteDocument(id)
    onChange()
  }

  return (
    <Card>
      <CardHeader title="Documents" subtitle="Invoices, certificates, assay reports" />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value={docType}
          onChange={(e) => setDocType(e.target.value as DocumentType)}
          className="rounded-md border border-vault-200 px-2 py-1.5 text-xs"
        >
          <option value="invoice">Invoice</option>
          <option value="certificate">Certificate</option>
          <option value="assay">Assay</option>
          <option value="insurance">Insurance</option>
          <option value="other">Other</option>
        </select>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 rounded-md bg-vault-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-vault-700 disabled:opacity-50"
        >
          <Upload className="h-3.5 w-3.5" />
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
        <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
      </div>

      {documents.length === 0 ? (
        <p className="text-sm text-vault-500">No documents attached.</p>
      ) : (
        <ul className="divide-y divide-vault-100">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center gap-3 py-2.5">
              <FileText className="h-4 w-4 shrink-0 text-vault-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-vault-800">{doc.filename}</p>
                <p className="text-[10px] text-vault-500">{formatDateTime(doc.uploadedAt)}</p>
              </div>
              <Badge>{doc.docType}</Badge>
              <a href={doc.url} target="_blank" rel="noreferrer" className="rounded p-1 text-vault-500 hover:bg-vault-100">
                <Download className="h-4 w-4" />
              </a>
              <button type="button" onClick={() => remove(doc.id)} className="rounded p-1 text-red-500 hover:bg-red-50">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}