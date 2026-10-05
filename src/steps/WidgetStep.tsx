import { useEffect } from 'react'
import type { WidgetStep as T } from '../core/types'
import type { StepProps } from './types'
import './steps.css'

// STUB — replaced by the step-components agent.
export default function WidgetStep({ step, setController }: StepProps<T & { id: string }>) {
  useEffect(() => setController({ ready: true, check: () => ({ correct: true }) }), [setController])
  return <div className="step">TODO: widget step <pre>{JSON.stringify(step).slice(0, 200)}</pre></div>
}
