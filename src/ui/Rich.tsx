import { Fragment, type ReactNode } from 'react'
import type { Rich as RichText } from '../core/types'
import './ui.css'

/**
 * Renders the markdown-lite dialect described in core/types.ts.
 * Inline: **bold** *italic* `code` ==highlight== [text](url)
 * Blocks: paragraphs, "- " bullets, "1. " numbered items, "> " quotes.
 */

// a highlight may hold a lone '=' ("==throughput = min(...)=="), just not '=='
const INLINE_SRC = /(`[^`\n]+`)|(\*\*[^*]+?\*\*)|(==(?:[^=\n]|=(?!=))+?==)|(\[[^\]]+\]\([^)\s]+\))|(\*[^*\n]+?\*)/.source

/**
 * Inline code may wrap (narrow tiles, 320px screens). Offer break points at the
 * seams of an identifier (after `.` `(` `,` `/`, between snake_case words), so
 * `defaultdict(list)` wraps as `defaultdict(` + `list)` rather than mid-word.
 */
// no lookbehind: it is a parse error on iOS Safari before 16.4. Match the char before the seam instead.
const SEAM = /[.](?=[A-Za-z_])|[(](?=[^)\s])|[,/](?=\S)|[A-Za-z0-9]_(?=[A-Za-z0-9])/g
function seams(code: string): ReactNode {
  const out: ReactNode[] = []
  let from = 0
  for (const m of code.matchAll(SEAM)) {
    const at = m.index + m[0].length
    out.push(code.slice(from, at), <wbr key={at} />)
    from = at
  }
  if (!out.length) return code
  out.push(code.slice(from))
  return out
}

export function renderInline(text: string, keyBase = 'i'): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  let m: RegExpExecArray | null
  let n = 0
  // fresh regex per call: renderInline recurses, so a shared global regex would clobber lastIndex
  const INLINE = new RegExp(INLINE_SRC, 'g')
  while ((m = INLINE.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const tok = m[0]
    const key = `${keyBase}${n++}`
    if (m[1]) out.push(<code key={key} className="rich-code">{seams(tok.slice(1, -1))}</code>)
    else if (m[2]) out.push(<strong key={key}>{renderInline(tok.slice(2, -2), key)}</strong>)
    else if (m[3]) out.push(<mark key={key} className="rich-mark">{renderInline(tok.slice(2, -2), key)}</mark>)
    else if (m[4]) {
      const close = tok.indexOf('](')
      const label = tok.slice(1, close)
      const href = tok.slice(close + 2, -1)
      out.push(
        <a key={key} href={href} target="_blank" rel="noreferrer noopener" className="rich-link">
          {renderInline(label, key)}
        </a>,
      )
    } else if (m[5]) out.push(<em key={key}>{renderInline(tok.slice(1, -1), key)}</em>)
    last = m.index + tok.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

type Block =
  | { t: 'p'; lines: string[] }
  | { t: 'ul'; items: string[] }
  | { t: 'ol'; items: string[] }
  | { t: 'quote'; lines: string[] }

function parseBlocks(src: string): Block[] {
  const blocks: Block[] = []
  const lines = src.replace(/\r/g, '').split('\n')
  let cur: Block | null = null
  const flush = () => {
    if (cur) blocks.push(cur)
    cur = null
  }
  for (const raw of lines) {
    const line = raw.trimEnd()
    if (!line.trim()) {
      flush()
      continue
    }
    const ul = /^\s*[-•]\s+(.*)$/.exec(line)
    const ol = /^\s*\d+[.)]\s+(.*)$/.exec(line)
    const q = /^\s*>\s?(.*)$/.exec(line)
    if (ul) {
      if (cur?.t !== 'ul') {
        flush()
        cur = { t: 'ul', items: [] }
      }
      ;(cur as { items: string[] }).items.push(ul[1])
    } else if (ol) {
      if (cur?.t !== 'ol') {
        flush()
        cur = { t: 'ol', items: [] }
      }
      ;(cur as { items: string[] }).items.push(ol[1])
    } else if (q) {
      if (cur?.t !== 'quote') {
        flush()
        cur = { t: 'quote', lines: [] }
      }
      ;(cur as { lines: string[] }).lines.push(q[1])
    } else {
      if (cur?.t !== 'p') {
        flush()
        cur = { t: 'p', lines: [] }
      }
      ;(cur as { lines: string[] }).lines.push(line.trim())
    }
  }
  flush()
  return blocks
}

export function Rich({ text, className, inline }: { text: RichText | undefined; className?: string; inline?: boolean }) {
  if (!text) return null
  if (inline) return <span className={className}>{renderInline(text)}</span>
  const blocks = parseBlocks(text)
  return (
    <div className={['rich', className].filter(Boolean).join(' ')}>
      {blocks.map((b, i) => {
        if (b.t === 'p')
          return (
            <p key={i}>
              {b.lines.map((l, j) => (
                <Fragment key={j}>
                  {j > 0 && <br />}
                  {renderInline(l, `p${i}-${j}-`)}
                </Fragment>
              ))}
            </p>
          )
        if (b.t === 'ul')
          return (
            <ul key={i}>
              {b.items.map((it, j) => (
                <li key={j}>{renderInline(it, `u${i}-${j}-`)}</li>
              ))}
            </ul>
          )
        if (b.t === 'ol')
          return (
            <ol key={i}>
              {b.items.map((it, j) => (
                <li key={j}>{renderInline(it, `o${i}-${j}-`)}</li>
              ))}
            </ol>
          )
        return (
          <blockquote key={i}>
            {b.lines.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {renderInline(l, `q${i}-${j}-`)}
              </Fragment>
            ))}
          </blockquote>
        )
      })}
    </div>
  )
}
