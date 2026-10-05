import { Component, Suspense, type ReactNode } from 'react'
import type { WidgetRef } from '../core/types'
import { WIDGETS } from './registry'
import './widgets.css'

class Boundary extends Component<{ children: ReactNode }, { err: Error | null }> {
  state = { err: null as Error | null }
  static getDerivedStateFromError(err: Error) {
    return { err }
  }
  render() {
    if (this.state.err) return <div className="widget-error">This simulation failed to load. You can continue without it.</div>
    return this.props.children
  }
}

/** Renders a widget by id inside a framed stage with error + loading states. */
export function WidgetHost({ widget, onComplete }: { widget: WidgetRef; onComplete: (ok: boolean) => void }) {
  const W = WIDGETS[widget.id]
  if (!W) return <div className="widget-error">Unknown simulation “{widget.id}”.</div>
  return (
    <div className="widget-stage">
      <Boundary>
        <Suspense fallback={<div className="widget-loading" aria-label="Loading simulation" />}>
          <W config={widget.config ?? {}} onComplete={onComplete} />
        </Suspense>
      </Boundary>
    </div>
  )
}
