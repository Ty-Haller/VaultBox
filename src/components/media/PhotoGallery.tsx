import { useRef, useState } from 'react'
import { ImagePlus, Star, Trash2 } from 'lucide-react'
import type { Photo } from '../../types'
import { api } from '../../lib/api'
import { Card, CardHeader } from '../ui/Card'

interface PhotoGalleryProps {
  photos: Photo[]
  holdingId?: string
  vaultId?: string
  siteId?: string
  onChange: () => void
}

export function PhotoGallery({ photos, holdingId, vaultId, siteId, onChange }: PhotoGalleryProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const upload = async (files: FileList | null) => {
    if (!files?.length) return
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        await api.uploadPhoto(file, {
          holding: holdingId,
          vault: vaultId,
          site: siteId,
          isPrimary: photos.length === 0,
        })
      }
      onChange()
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this photo?')) return
    await api.deletePhoto(id)
    onChange()
  }

  return (
    <Card>
      <CardHeader
        title="Photos"
        subtitle={`${photos.length} image${photos.length !== 1 ? 's' : ''}`}
        action={
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 rounded-md border border-vault-200 px-3 py-1.5 text-xs font-medium text-vault-600 hover:bg-vault-50 disabled:opacity-50"
          >
            <ImagePlus className="h-3.5 w-3.5" />
            {uploading ? 'Uploading...' : 'Add Photo'}
          </button>
        }
      />
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => upload(e.target.files)} />

      {photos.length === 0 ? (
        <div
          className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-vault-300 bg-vault-50 py-10 text-sm text-vault-500"
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus className="mb-2 h-8 w-8 text-vault-400" />
          Click to upload photos
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {photos.map((photo) => (
            <div key={photo.id} className="group relative overflow-hidden rounded-lg border border-vault-200">
              <img src={photo.url} alt={photo.caption || 'Holding photo'} className="aspect-square w-full object-cover" />
              {photo.isPrimary && (
                <span className="absolute left-2 top-2 rounded bg-gold-500 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  <Star className="inline h-3 w-3" /> Primary
                </span>
              )}
              <button
                type="button"
                onClick={() => remove(photo.id)}
                className="absolute right-2 top-2 rounded bg-red-600/80 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              {photo.caption && (
                <p className="truncate px-2 py-1 text-[10px] text-vault-500">{photo.caption}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}