import type { ReactNode } from 'react'
import type { CodeBlock, Lang } from '../../core/types'
import { Rich } from '../Rich'
import { tokenLines, type Tok } from './highlight'
import '../ui.css'

export function Toks({ toks }: { toks: Tok[] }) {
  return (
    <>
      {toks.map((t, i) =>
        t.k === 'plain' || t.k === 'op' ? (
          <span key={i}>{t.v}</span>
        ) : (
          <span key={i} className={`tk-${t.k}`}>
            {t.v}
          </span>
        ),
      )}
    </>
  )
}

/**
 * Syntax-highlighted code with line numbers. `renderLine` lets interactive
 * steps (spot-the-bug, cloze) decorate or replace individual lines.
 */
export function Code({
  code,
  lang = 'python',
  highlight,
  caption,
  renderLine,
  lineProps,
  numbers = true,
  className,
}: {
  code: string
  lang?: Lang
  highlight?: number[]
  caption?: string
  /** custom renderer for line content; return undefined to use default */
  renderLine?: (lineNo: number, toks: Tok[], raw: string) => ReactNode | undefined
  /** extra props per line (e.g. onClick, className) */
  lineProps?: (lineNo: number) => React.HTMLAttributes<HTMLDivElement> & { className?: string }
  numbers?: boolean
  className?: string
}) {
  const lines = tokenLines(code.replace(/\s+$/, ''), lang)
  const raw = code.replace(/\s+$/, '').split('\n')
  return (
    <figure className={['code', className].filter(Boolean).join(' ')}>
      <div className="code__scroll">
        <div className="code__lines" role="presentation">
          {lines.map((toks, i) => {
            const n = i + 1
            const extra = lineProps?.(n) ?? {}
            const { className: lc, ...rest } = extra
            return (
              <div key={i} className={['code__line', highlight?.includes(n) && 'code__line--hl', lc].filter(Boolean).join(' ')} {...rest}>
                {numbers && <span className="code__no">{n}</span>}
                <span className="code__src">{renderLine?.(n, toks, raw[i] ?? '') ?? (toks.length ? <Toks toks={toks} /> : ' ')}</span>
              </div>
            )
          })}
        </div>
      </div>
      {caption && (
        <figcaption className="code__cap">
          <Rich text={caption} inline />
        </figcaption>
      )}
    </figure>
  )
}

export function CodeFromBlock({ block }: { block: CodeBlock }) {
  return <Code code={block.code} lang={block.lang} highlight={block.highlight} caption={block.caption} />
}
