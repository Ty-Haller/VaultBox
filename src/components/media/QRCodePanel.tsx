import { Download, QrCode } from 'lucide-react'
import { api } from '../../lib/api'
import { Card, CardHeader } from '../ui/Card'

interface QRCodePanelProps {
  holdingId: string
  qrCode?: string
  name: string
}

export function QRCodePanel({ holdingId, qrCode, name }: QRCodePanelProps) {
  const qrUrl = api.qrImageUrl(holdingId)
  const lookupUrl = qrCode ? `${window.location.origin}/lookup/${qrCode}` : undefined

  return (
    <Card>
      <CardHeader title="QR Label" subtitle="Scan to look up this holding" />
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="rounded-lg border border-vault-200 bg-white p-3">
          <img src={qrUrl} alt={`QR code for ${name}`} className="h-36 w-36" />
        </div>
        <div className="flex-1 space-y-3 text-sm">
          {qrCode && (
            <div>
              <p className="text-xs font-medium uppercase text-vault-500">QR Code</p>
              <p className="font-mono text-lg font-bold text-vault-900">{qrCode}</p>
            </div>
          )}
          {lookupUrl && (
            <div>
              <p className="text-xs font-medium uppercase text-vault-500">Lookup URL</p>
              <a href={lookupUrl} className="break-all text-gold-500 hover:underline">{lookupUrl}</a>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <a
              href={api.reportPdfUrl('labels', { holdings: [holdingId] })}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-vault-200 px-3 py-1.5 text-xs font-medium text-vault-700 hover:bg-vault-50"
            >
              <Download className="h-3.5 w-3.5" />
              Print Label PDF
            </a>
            <a
              href={qrUrl}
              download={`qr-${qrCode ?? holdingId}.png`}
              className="inline-flex items-center gap-1.5 rounded-md border border-vault-200 px-3 py-1.5 text-xs font-medium text-vault-700 hover:bg-vault-50"
            >
              <QrCode className="h-3.5 w-3.5" />
              Download QR PNG
            </a>
          </div>
        </div>
      </div>
    </Card>
  )
}