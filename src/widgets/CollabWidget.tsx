import type { CollabConfig, WidgetProps } from './specs'

// STUB — replaced by the widget agent.
export default function CollabWidget({ config, onComplete }: WidgetProps<CollabConfig>) {
  return (
    <div style={{ padding: 16, border: '2px dashed var(--line)', borderRadius: 14 }}>
      <b>collab</b> widget (stub) <button onClick={() => onComplete(true)}>complete</button>
      <pre style={{ fontSize: 11 }}>{JSON.stringify(config)}</pre>
    </div>
  )
}
