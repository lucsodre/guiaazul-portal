import React, { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  hideClose?: boolean
  footer?: React.ReactNode
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
  hideClose = false,
  footer,
}: ModalProps) {
  // Guard against iOS ghost click: the touchend that opens the modal fires a
  // native click ~300ms later at the same coordinates, which now hits the overlay.
  // Ignore overlay clicks for the first 350ms after the modal opens.
  const ignoreCloseRef = useRef(false)

  useEffect(() => {
    if (!open) return
    ignoreCloseRef.current = true
    const timer = setTimeout(() => { ignoreCloseRef.current = false }, 350)
    return () => {
      clearTimeout(timer)
      ignoreCloseRef.current = false
    }
  }, [open])

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

  const sizeMap = { sm: '400px', md: '520px', lg: '680px', xl: '880px', full: '100%' }

  return (
    <div className="modal-overlay" onClick={() => { if (!ignoreCloseRef.current) onClose() }}>
      <div
        className="modal-container animate-slide-up"
        style={{ maxWidth: sizeMap[size] }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
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
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}
