import { BookMarked, Lightbulb, Quote, Sparkles, TriangleAlert } from 'lucide-react'
import type { Callout as CalloutT } from '../core/types'
import { Rich } from './Rich'
import './ui.css'

const ICON = { tip: Lightbulb, warn: TriangleAlert, insight: Sparkles, quote: Quote, source: BookMarked }

export function Callout({ callout }: { callout: CalloutT }) {
  const I = ICON[callout.tone] ?? Lightbulb
  return (
    <div className={`callout callout--${callout.tone}`}>
      <I size={18} className="callout__icon" strokeWidth={2.4} />
      <Rich text={callout.text} />
    </div>
  )
}
