import { useEffect } from 'react'
import type { SortStep as T } from '../core/types'
import type { StepProps } from './types'
import './steps.css'

// STUB — replaced by the step-components agent.
export default function SortStep({ step, setController }: StepProps<T & { id: string }>) {
  useEffect(() => setController({ ready: true, check: () => ({ correct: true }) }), [setController])
  return <div className="step">TODO: sort step <pre>{JSON.stringify(step).slice(0, 200)}</pre></div>
}
