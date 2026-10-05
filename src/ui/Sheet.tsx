import { AnimatePresence, motion } from 'motion/react'
import { useEffect, type ReactNode } from 'react'
import './ui.css'

/**
 * Bottom sheet with a scrim. Slides up with a spring; tap the scrim or press
 * Escape to dismiss (unless `dismissable` is false).
 */
export function Sheet({
  open,
  onClose,
  children,
  dismissable = true,
  label,
}: {
  open: boolean
  onClose?: () => void
  children: ReactNode
  dismissable?: boolean
  label?: string
}) {
  useEffect(() => {
    if (!open || !dismissable) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, dismissable, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="sheet-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="sheet-scrim" onClick={() => dismissable && onClose?.()} />
          <motion.div
            className="sheet safe-bottom"
            role="dialog"
            aria-modal="true"
            aria-label={label}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 38 }}
          >
            <div className="sheet__grip" />
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
