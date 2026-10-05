import type { CrawlerConfig, WidgetProps } from './specs'

// STUB — replaced by the widget agent.
export default function CrawlerWidget({ config, onComplete }: WidgetProps<CrawlerConfig>) {
  return (
    <div style={{ padding: 16, border: '2px dashed var(--line)', borderRadius: 14 }}>
      <b>crawler</b> widget (stub) <button onClick={() => onComplete(true)}>complete</button>
      <pre style={{ fontSize: 11 }}>{JSON.stringify(config)}</pre>
    </div>
  )
}
