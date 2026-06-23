import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'md' | 'lg' | 'xl'
}

export function Modal({ open, onClose, title, children, size = 'lg' }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-16">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn(
          'relative z-10 w-full rounded-lg border border-vault-200 bg-white shadow-xl dark:border-vault-700 dark:bg-vault-900',
          size === 'md' && 'max-w-lg',
          size === 'lg' && 'max-w-2xl',
          size === 'xl' && 'max-w-4xl'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-vault-200 px-5 py-4 dark:border-vault-700">
          <h2 id="modal-title" className="text-lg font-semibold text-vault-900 dark:text-vault-100">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-vault-500 hover:bg-vault-100 dark:hover:bg-vault-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>,
    document.body
  )
}