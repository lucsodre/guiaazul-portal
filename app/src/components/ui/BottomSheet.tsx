import React, { useEffect } from 'react'
import { X } from 'lucide-react'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  hideClose?: boolean
  maxHeight?: string
}

export default function BottomSheet({
  open,
  onClose,
  title,
  children,
  hideClose = false,
  maxHeight = '85dvh',
}: BottomSheetProps) {
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="bottom-sheet-container animate-slide-up"
        style={{ maxHeight }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="bottom-sheet-handle" />
        {(title || !hideClose) && (
          <div className="modal-header">
            {title && <h2 className="modal-title">{title}</h2>}
            {!hideClose && (
              <button className="modal-close" onClick={onClose} aria-label="Fechar">
                <X size={20} />
              </button>
            )}
          </div>
        )}
        <div className="bottom-sheet-body">{children}</div>
      </div>
    </div>
  )
}
