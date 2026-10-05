import { useEffect } from 'react'
import type { ConceptStep as T } from '../core/types'
import { Rich } from '../ui/Rich'
import { CodeFromBlock } from '../ui/code/Code'
import { Callout } from '../ui/Callout'
import { WidgetHost } from '../widgets/WidgetHost'
import type { StepProps } from './types'
import './steps.css'

export default function ConceptStep({ step, setController }: StepProps<T>) {
  useEffect(() => setController({ ready: true, check: () => ({ correct: true }) }), [setController])
  return (
    <div className="step">
      {step.eyebrow && <div className="eyebrow step__eyebrow">{step.eyebrow}</div>}
      {step.title && <h2 className="step__title">{step.title}</h2>}
      <Rich text={step.body} className="step__body" />
      {step.code && <CodeFromBlock block={step.code} />}
      {step.widget && <WidgetHost widget={step.widget} onComplete={() => {}} />}
      {step.callout && <Callout callout={step.callout} />}
    </div>
  )
}
