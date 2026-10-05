import type { DeadlockConfig, WidgetProps } from './specs'

// STUB — replaced by the widget agent.
export default function DeadlockWidget({ config, onComplete }: WidgetProps<DeadlockConfig>) {
  return (
    <div style={{ padding: 16, border: '2px dashed var(--line)', borderRadius: 14 }}>
      <b>deadlock</b> widget (stub) <button onClick={() => onComplete(true)}>complete</button>
      <pre style={{ fontSize: 11 }}>{JSON.stringify(config)}</pre>
    </div>
  )
}
