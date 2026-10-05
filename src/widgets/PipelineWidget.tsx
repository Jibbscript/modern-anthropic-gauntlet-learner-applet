import type { PipelineConfig, WidgetProps } from './specs'

// STUB — replaced by the widget agent.
export default function PipelineWidget({ config, onComplete }: WidgetProps<PipelineConfig>) {
  return (
    <div style={{ padding: 16, border: '2px dashed var(--line)', borderRadius: 14 }}>
      <b>pipeline</b> widget (stub) <button onClick={() => onComplete(true)}>complete</button>
      <pre style={{ fontSize: 11 }}>{JSON.stringify(config)}</pre>
    </div>
  )
}
