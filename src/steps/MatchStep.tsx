import { useEffect } from 'react'
import type { MatchStep as T } from '../core/types'
import type { StepProps } from './types'
import './steps.css'

// STUB — replaced by the step-components agent.
export default function MatchStep({ step, setController }: StepProps<T & { id: string }>) {
  useEffect(() => setController({ ready: true, check: () => ({ correct: true }) }), [setController])
  return <div className="step">TODO: match step <pre>{JSON.stringify(step).slice(0, 200)}</pre></div>
}
