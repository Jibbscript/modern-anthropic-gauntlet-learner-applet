import { motion } from 'motion/react'
import { BookOpen, Brain, NotebookPen, User } from 'lucide-react'
import { useNav, type Tab } from '../app/nav'
import { haptic, sfx } from './fx'
import './tabbar.css'

const TABS: { id: Tab; label: string; Icon: typeof BookOpen }[] = [
  { id: 'learn', label: 'Learn', Icon: BookOpen },
  { id: 'practice', label: 'Practice', Icon: Brain },
  { id: 'stories', label: 'Stories', Icon: NotebookPen },
  { id: 'me', label: 'Me', Icon: User },
]

export function TabBar({ badges }: { badges?: Partial<Record<Tab, number>> }) {
  const tab = useNav((s) => s.tab)
  const setTab = useNav((s) => s.setTab)
  return (
    <nav className="tabbar safe-bottom" aria-label="Main">
      {TABS.map(({ id, label, Icon }) => {
        const active = tab === id
        const badge = badges?.[id]
        const shown = badge ? (badge > 99 ? '99+' : String(badge)) : ''
        return (
          <button
            key={id}
            type="button"
            className={`tabbar__item ${active ? 'is-active' : ''}`}
            aria-current={active ? 'page' : undefined}
            // the badge is decoration: read "Practice, 3 due", not "3 Practice"
            aria-label={shown ? `${label}, ${shown} due` : undefined}
            onClick={() => {
              if (!active) {
                sfx('tap')
                haptic('light')
              }
              setTab(id)
            }}
          >
            <span className="tabbar__icon">
              {active && <motion.span layoutId="tab-pill" className="tabbar__pill" transition={{ type: 'spring', stiffness: 500, damping: 34 }} />}
              <Icon size={24} strokeWidth={active ? 2.7 : 2.2} />
              {shown && (
                <span className="tabbar__badge tabular" aria-hidden="true">
                  {shown}
                </span>
              )}
            </span>
            <span className="tabbar__label">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
