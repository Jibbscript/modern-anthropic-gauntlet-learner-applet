import { useEffect } from 'react'
import type { CompareStep as T } from '../core/types'
import type { StepProps } from './types'
import './steps.css'

// STUB — replaced by the step-components agent.
export default function CompareStep({ step, setController }: StepProps<T & { id: string }>) {
  useEffect(() => setController({ ready: true, check: () => ({ correct: true }) }), [setController])
  return <div className="step">TODO: compare step <pre>{JSON.stringify(step).slice(0, 200)}</pre></div>
}
