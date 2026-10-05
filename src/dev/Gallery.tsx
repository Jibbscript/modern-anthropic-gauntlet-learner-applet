import { useState } from 'react'
import type { Step, WidgetId } from '../core/types'
import { StepRunner } from '../lesson/StepRunner'
import { WidgetHost } from '../widgets/WidgetHost'
import { WIDGET_IDS } from '../widgets/specs'
import { courseStyle } from '../ui/course'
import { FIXTURES } from './fixtures'

/**
 * Dev-only gallery for visual QA. Open with:
 *   /?gallery=steps            every step fixture, stacked
 *   /?gallery=step&kind=mcq    one step kind in a full lesson frame
 *   /?gallery=widgets          every widget with its default config
 *   /?gallery=widget&id=race   one widget
 * Append &theme=dark to force dark mode.
 */
export function Gallery() {
  const q = new URLSearchParams(location.search)
  const mode = q.get('gallery')
  if (q.get('theme')) document.documentElement.dataset.theme = q.get('theme')!

  if (mode === 'step') {
    const kind = q.get('kind') ?? 'mcq'
    const steps = FIXTURES.filter((f) => f.kind === kind)
    return <SingleStep steps={steps} />
  }
  if (mode === 'widget') {
    const id = (q.get('id') ?? 'race') as WidgetId
    return (
      <div className="app-frame" style={courseStyle('teal')}>
        <div className="scroll" style={{ padding: 20 }}>
          <h3 style={{ marginBottom: 12 }}>{id}</h3>
          <WidgetHost widget={{ id, config: q.get('config') ? JSON.parse(q.get('config')!) : {} }} onComplete={(ok) => console.log('widget complete', ok)} />
        </div>
      </div>
    )
  }
  if (mode === 'widgets') {
    return (
      <div className="app-frame" style={courseStyle('teal')}>
        <div className="scroll" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 28 }}>
          {WIDGET_IDS.map((id) => (
            <section key={id}>
              <h3 style={{ marginBottom: 8 }}>{id}</h3>
              <WidgetHost widget={{ id }} onComplete={() => {}} />
            </section>
          ))}
        </div>
      </div>
    )
  }
  return (
    <div className="app-frame" style={courseStyle('violet')}>
      <div className="scroll">
        {FIXTURES.map((s, i) => (
          <section key={i} style={{ borderBottom: '6px solid var(--line)', minHeight: 300, display: 'flex' }}>
            <StepRunner step={s} mode="lesson" lessonId="gallery" onResolved={() => {}} onNext={() => {}} />
          </section>
        ))}
      </div>
    </div>
  )
}

function SingleStep({ steps }: { steps: Step[] }) {
  const [i, setI] = useState(0)
  const s = steps[i]
  if (!s) return <div>No fixture for this kind.</div>
  return (
    <div className="app-frame" style={courseStyle('violet')}>
      <div className="screen">
        <StepRunner key={i} step={s} mode="lesson" lessonId="gallery" onResolved={(o) => console.log('resolved', o)} onNext={() => setI((i + 1) % steps.length)} />
      </div>
    </div>
  )
}
