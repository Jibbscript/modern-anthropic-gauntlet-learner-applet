import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react'
import './ui.css'

const FOCUSABLE = 'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'

/**
 * Bottom sheet with a scrim. Slides up with a spring; tap the scrim or press
 * Escape to dismiss (unless `dismissable` is false). For keyboard users it
 * takes focus when it opens, keeps Tab inside, and hands focus back on close.
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

  const dialog = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const opener = document.activeElement as HTMLElement | null
    // unless something inside already took focus (an autofocused field)
    if (!dialog.current?.contains(document.activeElement)) dialog.current?.focus({ preventScroll: true })
    return () => {
      if (opener?.isConnected && !opener.closest('[inert]')) opener.focus({ preventScroll: true })
    }
  }, [open])
  const trapTab = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab' || !dialog.current) return
    const items = [...dialog.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null)
    if (!items.length) return e.preventDefault()
    const first = items[0]
    const last = items[items.length - 1]
    const at = document.activeElement
    if (e.shiftKey && (at === first || at === dialog.current)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && at === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="sheet-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="sheet-scrim" onClick={() => dismissable && onClose?.()} />
          <motion.div
            ref={dialog}
            className="sheet safe-bottom"
            role="dialog"
            aria-modal="true"
            aria-label={label}
            tabIndex={-1}
            onKeyDown={trapTab}
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
