import type { CSSProperties, ReactNode } from 'react'
import type { CodeBlock, Lang } from '../../core/types'
import { Rich } from '../Rich'
import { tokenLines, type Tok } from './highlight'
import '../ui.css'

/**
 * Where soft-wrapped code may break besides spaces: after a call's `(` (or a
 * comma with no space) with more code behind it, so a long call wraps as
 * `im.filter(` + `ImageFilter.GaussianBlur(` rather than mid-name.
 */
const SEAM = /[(,](?=[^\s)\]}])/g

function withSeams(v: string, cuts: Set<number>, start: number): ReactNode {
  let out: ReactNode[] | null = null
  let from = 0
  // j = 0: a seam right at this token's start (after a `(` token, say)
  for (let j = start ? 0 : 1; j < v.length; j++) {
    if (!cuts.has(start + j)) continue
    ;(out ??= []).push(v.slice(from, j), <wbr key={j} />)
    from = j
  }
  if (!out) return v
  out.push(v.slice(from))
  return out
}

export function Toks({ toks, wrap = false }: { toks: Tok[]; wrap?: boolean }) {
  const cuts = new Set<number>()
  if (wrap) for (const m of toks.map((t) => t.v).join('').matchAll(SEAM)) cuts.add(m.index + 1)
  let at = 0
  return (
    <>
      {toks.map((t, i) => {
        const start = at
        at += t.v.length
        const v = cuts.size ? withSeams(t.v, cuts, start) : t.v
        return t.k === 'plain' || t.k === 'op' ? (
          <span key={i}>{v}</span>
        ) : (
          <span key={i} className={`tk-${t.k}`}>
            {v}
          </span>
        )
      })}
    </>
  )
}

/**
 * Leading indentation as no-break spaces. Where code soft-wraps (inside a
 * step), a long first word must not break off onto the next row and leave the
 * line's own row holding nothing but its indent.
 */
export function glueIndent(toks: Tok[]): Tok[] {
  const first = toks[0]
  const lead = first && /^[ \t]+/.exec(first.v)
  if (!lead) return toks
  return [{ ...first, v: lead[0].replace(/\t/g, '    ').replace(/ /g, '\u00a0') + first.v.slice(lead[0].length) }, ...toks.slice(1)]
}

/** leading indent in columns (tab = 4); lets a soft-wrapped line hang past its own indent */
function indentOf(line: string) {
  let n = 0
  for (const ch of line) {
    if (ch === ' ') n += 1
    else if (ch === '\t') n += 4
    else break
  }
  return n
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
                <span className="code__src" style={{ '--hang': indentOf(raw[i] ?? '') } as CSSProperties}>
                  {renderLine?.(n, toks, raw[i] ?? '') ?? (toks.length ? <Toks toks={glueIndent(toks)} wrap /> : ' ')}
                </span>
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
