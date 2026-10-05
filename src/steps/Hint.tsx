import { AnimatePresence, motion } from 'motion/react'
import { Lightbulb } from 'lucide-react'
import { useState } from 'react'
import { Callout } from '../ui/Callout'
import { sfx } from '../ui/fx'

/** "Need a hint?" link that expands into a tip callout. Auto-opens after a wrong attempt. */
export function Hint({ text, attempt = 0, onOpen }: { text: string; attempt?: number; onOpen?: () => void }) {
  const [open, setOpen] = useState(attempt > 0)
  return (
    <div className="step__hint">
      <AnimatePresence initial={false} mode="wait">
        {open ? (
          <motion.div key="hint" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Callout callout={{ tone: 'tip', text }} />
          </motion.div>
        ) : (
          <motion.button
            key="btn"
            type="button"
            className="chip"
            onClick={() => {
              sfx('tap')
              setOpen(true)
              onOpen?.()
            }}
            whileTap={{ scale: 0.95 }}
          >
            <Lightbulb size={14} strokeWidth={2.6} /> Need a hint?
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
