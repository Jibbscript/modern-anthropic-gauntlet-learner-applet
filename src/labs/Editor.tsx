import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode, type Ref, type RefObject } from 'react'
import { IndentDecrease, IndentIncrease, Undo2 } from 'lucide-react'
import { tokenLines } from '../ui/code/highlight'
import { Toks } from '../ui/code/Code'
import './Editor.css'

/**
 * A dependency-free code editor: a transparent <textarea> laid exactly over a
 * syntax-highlighted <pre>, inside one scroller that moves both (so they can
 * never drift apart). Python-aware keys: Tab / Shift-Tab indent, Enter keeps
 * indentation (+4 after a colon), Backspace eats an indent level,
 * Cmd/Ctrl+/ toggles comments, Cmd/Ctrl+Enter runs.
 * Edits go through execCommand('insertText') so native undo keeps working.
 */

export interface EditorHandle {
  focus(): void
  /** put the caret at the start of a 1-based line and scroll it into view */
  gotoLine(line: number): void
  /** insert text at the caret (used by the touch key bar) */
  insert(text: string): void
}

export interface EditorProps {
  value: string
  onChange(value: string): void
  /** Cmd/Ctrl+Enter */
  onRun?(): void
  /** 1-based line to mark as the error location */
  errorLine?: number | null
  label?: string
  /** touch key bar: 'auto' shows it on coarse pointers */
  keys?: 'auto' | 'always' | 'never'
  className?: string
  ref?: Ref<EditorHandle>
}

const INDENT = '    '
const LINE_H = 20
const PAD_Y = 12

const lineStart = (v: string, pos: number) => v.lastIndexOf('\n', pos - 1) + 1
const lineEnd = (v: string, pos: number) => {
  const i = v.indexOf('\n', pos)
  return i === -1 ? v.length : i
}

/** replace [start, end) keeping the browser's undo stack where possible */
function replaceRange(ta: HTMLTextAreaElement, start: number, end: number, text: string, selStart: number, selEnd = selStart) {
  const expected = ta.value.slice(0, start) + text + ta.value.slice(end)
  ta.focus()
  ta.setSelectionRange(start, end)
  let ok = false
  try {
    ok = text ? document.execCommand('insertText', false, text) : start === end || document.execCommand('delete')
  } catch {
    ok = false
  }
  if (!ok || ta.value !== expected) {
    ta.value = expected
    ta.dispatchEvent(new Event('input', { bubbles: true }))
  }
  ta.setSelectionRange(selStart, selEnd)
}

const coarse = () => {
  try {
    return window.matchMedia('(pointer: coarse)').matches
  } catch {
    return false
  }
}

const isIOS = () =>
  typeof navigator !== 'undefined' && (/iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

/**
 * iOS zooms the page when a field with font-size < 16px gets focus. Clamp
 * the viewport's maximum-scale while the editor is focused (pinch zoom still
 * works on iOS 10+), and restore it afterwards.
 */
function useIOSNoZoom(ta: RefObject<HTMLTextAreaElement | null>) {
  useEffect(() => {
    const el = ta.current
    const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]')
    if (!el || !meta || !isIOS() || /maximum-scale/.test(meta.content)) return
    const original = meta.content
    const clamp = () => {
      meta.content = `${original}, maximum-scale=1`
    }
    const restore = () => {
      meta.content = original
    }
    el.addEventListener('touchstart', clamp, { passive: true })
    el.addEventListener('blur', restore)
    return () => {
      el.removeEventListener('touchstart', clamp)
      el.removeEventListener('blur', restore)
      restore()
    }
  }, [ta])
}

const KEYS = [':', '(', ')', '[', ']', '{', '}', '"', "'", '=', '_', '.', ',', '#', '+', '-', '*', '<', '>', '!']

export function Editor({ value, onChange, onRun, errorLine, label = 'Code editor', keys = 'auto', className, ref }: EditorProps) {
  const taRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const gutterRef = useRef<HTMLDivElement>(null)
  const probeRef = useRef<HTMLSpanElement>(null)
  const charW = useRef(7.8)
  const escapeTab = useRef(false)
  const [showKeys] = useState(() => keys === 'always' || (keys === 'auto' && coarse()))

  useIOSNoZoom(taRef)

  const lines = useMemo(() => tokenLines(value, 'python'), [value])

  // measure the monospace advance once fonts are ready (used for caret scrolling)
  useLayoutEffect(() => {
    const measure = () => {
      const w = probeRef.current?.getBoundingClientRect().width
      if (w) charW.current = w / 10
    }
    measure()
    document.fonts?.ready.then(measure).catch(() => {})
  }, [])

  /** keep the caret inside the visible part of the scroller */
  const revealCaret = useCallback(() => {
    const ta = taRef.current
    const sc = scrollRef.current
    if (!ta || !sc) return
    const pos = ta.selectionDirection === 'backward' ? ta.selectionStart : ta.selectionEnd
    const before = ta.value.slice(0, pos)
    const row = before.split('\n').length - 1
    const col = pos - (before.lastIndexOf('\n') + 1)
    const gutter = gutterRef.current?.offsetWidth ?? 0
    const y = PAD_Y + row * LINE_H
    if (y < sc.scrollTop + 4) sc.scrollTop = Math.max(0, y - 8)
    else if (y + LINE_H > sc.scrollTop + sc.clientHeight - 4) sc.scrollTop = y + LINE_H - sc.clientHeight + 12
    const x = 12 + col * charW.current
    const left = sc.scrollLeft
    const width = sc.clientWidth - gutter
    if (x < left + 8) sc.scrollLeft = Math.max(0, x - 24)
    else if (x > left + width - 16) sc.scrollLeft = x - width + 32
  }, [])

  const reveal = useCallback(() => requestAnimationFrame(revealCaret), [revealCaret])

  const gotoLine = useCallback(
    (line: number) => {
      const ta = taRef.current
      const sc = scrollRef.current
      if (!ta) return
      const ls = ta.value.split('\n')
      const n = Math.max(1, Math.min(line, ls.length))
      let pos = 0
      for (let i = 0; i < n - 1; i++) pos += ls[i].length + 1
      const indent = /^\s*/.exec(ls[n - 1] ?? '')?.[0].length ?? 0
      ta.focus({ preventScroll: true })
      ta.setSelectionRange(pos + indent, pos + indent)
      if (sc) {
        sc.scrollTop = Math.max(0, PAD_Y + (n - 1) * LINE_H - sc.clientHeight / 3)
        sc.scrollLeft = 0
      }
    },
    [],
  )

  const insert = useCallback(
    (text: string) => {
      const ta = taRef.current
      if (!ta) return
      const s = ta.selectionStart
      const e = ta.selectionEnd
      replaceRange(ta, s, e, text, s + text.length)
      reveal()
    },
    [reveal],
  )

  /** indent (dir 1) or dedent (dir -1) every line touched by the selection */
  const shiftLines = useCallback((dir: 1 | -1) => {
    const ta = taRef.current
    if (!ta) return
    const v = ta.value
    const s = ta.selectionStart
    const e = ta.selectionEnd
    const a = lineStart(v, s)
    const endAnchor = e > s && v[e - 1] === '\n' ? e - 1 : e
    const b = lineEnd(v, endAnchor)
    const src = v.slice(a, b).split('\n')
    let firstDelta = 0
    let total = 0
    const out = src.map((l, i) => {
      let d = 0
      let next = l
      if (dir > 0) {
        if (l.trim() || src.length === 1) {
          next = INDENT + l
          d = INDENT.length
        }
      } else {
        const m = /^( {1,4}|\t)/.exec(l)
        if (m) {
          next = l.slice(m[0].length)
          d = -m[0].length
        }
      }
      if (i === 0) firstDelta = d
      total += d
      return next
    })
    const text = out.join('\n')
    if (text === v.slice(a, b)) return
    const ns = Math.max(a, s + firstDelta)
    const ne = s === e ? ns : Math.max(ns, e + total)
    replaceRange(ta, a, b, text, ns, ne)
  }, [])

  const toggleComment = useCallback(() => {
    const ta = taRef.current
    if (!ta) return
    const v = ta.value
    const s = ta.selectionStart
    const e = ta.selectionEnd
    const a = lineStart(v, s)
    const endAnchor = e > s && v[e - 1] === '\n' ? e - 1 : e
    const b = lineEnd(v, endAnchor)
    const src = v.slice(a, b).split('\n')
    const code = src.filter((l) => l.trim())
    if (!code.length) return
    const uncomment = code.every((l) => /^\s*#/.test(l))
    const minIndent = Math.min(...code.map((l) => /^\s*/.exec(l)![0].length))
    let firstDelta = 0
    let total = 0
    const out = src.map((l, i) => {
      if (!l.trim()) return l
      let next: string
      if (uncomment) next = l.replace(/^(\s*)# ?/, '$1')
      else next = l.slice(0, minIndent) + '# ' + l.slice(minIndent)
      const d = next.length - l.length
      if (i === 0) firstDelta = d
      total += d
      return next
    })
    const ns = Math.max(a, s + firstDelta)
    const ne = s === e ? ns : Math.max(ns, e + total)
    replaceRange(ta, a, b, out.join('\n'), ns, ne)
  }, [])

  useImperativeHandle(ref, () => ({ focus: () => taRef.current?.focus(), gotoLine, insert }), [gotoLine, insert])

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget
    if (e.nativeEvent.isComposing) return
    const mod = e.metaKey || e.ctrlKey
    if (e.key === 'Escape') {
      // Esc, then Tab, moves focus out of the editor (keyboard users)
      escapeTab.current = true
      return
    }
    if (e.key === 'Tab' && !mod && !e.altKey) {
      if (escapeTab.current) {
        escapeTab.current = false
        return
      }
      e.preventDefault()
      const { selectionStart: s, selectionEnd: en, value: v } = ta
      const multiLine = v.slice(s, en).includes('\n')
      if (e.shiftKey || multiLine) shiftLines(e.shiftKey ? -1 : 1)
      else {
        const col = s - lineStart(v, s)
        const pad = ' '.repeat(4 - (col % 4))
        replaceRange(ta, s, en, pad, s + pad.length)
      }
      reveal()
      return
    }
    escapeTab.current = false
    if (e.key === 'Enter' && mod) {
      e.preventDefault()
      onRun?.()
      return
    }
    if (mod && (e.key === '/' || e.code === 'Slash')) {
      e.preventDefault()
      toggleComment()
      return
    }
    if (mod && (e.key === ']' || e.key === '[')) {
      e.preventDefault()
      shiftLines(e.key === ']' ? 1 : -1)
      return
    }
    if (e.key === 'Enter' && !e.shiftKey && !e.altKey) {
      e.preventDefault()
      const { selectionStart: s, selectionEnd: en, value: v } = ta
      const before = v.slice(lineStart(v, s), s)
      let indent = /^[ \t]*/.exec(before)![0]
      const code = before.replace(/\s+#[^'"]*$/, '').trimEnd()
      if (code.endsWith(':')) indent += INDENT
      else if (/^\s*(return|pass|break|continue|raise)\b/.test(before) && s === lineEnd(v, s)) indent = indent.slice(0, Math.max(0, indent.length - 4))
      const text = '\n' + indent
      replaceRange(ta, s, en, text, s + text.length)
      reveal()
      return
    }
    if (e.key === 'Backspace' && !mod && !e.altKey) {
      const { selectionStart: s, selectionEnd: en, value: v } = ta
      if (s !== en) return
      const ls = lineStart(v, s)
      const before = v.slice(ls, s)
      if (before.length >= 2 && /^ +$/.test(before)) {
        e.preventDefault()
        const n = ((before.length - 1) % 4) + 1
        replaceRange(ta, s - n, s, '', s - n)
      }
    }
  }

  /** touch Tab: in leading whitespace it types an indent; elsewhere it indents the line(s) */
  const indentKey = () => {
    const ta = taRef.current
    if (!ta) return
    const s = ta.selectionStart
    const before = ta.value.slice(lineStart(ta.value, s), s)
    if (s === ta.selectionEnd && /^ *$/.test(before)) insert(' '.repeat(4 - (before.length % 4)))
    else shiftLines(1)
  }

  const undoKey = () => {
    taRef.current?.focus()
    try {
      document.execCommand('undo')
    } catch {
      /* unsupported */
    }
  }

  return (
    <div className={['ed', className].filter(Boolean).join(' ')}>
      <div ref={scrollRef} className="ed__scroll">
        <div className="ed__inner">
          <div ref={gutterRef} className="ed__gutter" aria-hidden onMouseDown={(e) => e.preventDefault()}>
            {lines.map((_, i) => (
              <div key={i} className={['ed__no', errorLine === i + 1 && 'ed__no--err'].filter(Boolean).join(' ')}>
                {i + 1}
              </div>
            ))}
          </div>
          <div className="ed__code">
            {errorLine != null && errorLine >= 1 && errorLine <= lines.length && (
              <div className="ed__errline" style={{ top: PAD_Y + (errorLine - 1) * LINE_H }} aria-hidden />
            )}
            <pre className="ed__hl" aria-hidden>
              {lines.map((toks, i) => (
                <span key={i}>
                  <Toks toks={toks} />
                  {'\n'}
                </span>
              ))}
              {' '}
            </pre>
            <textarea
              ref={taRef}
              className="ed__ta"
              value={value}
              aria-label={label}
              aria-keyshortcuts="Control+Enter Meta+Enter"
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              translate="no"
              data-gramm="false"
              data-enable-grammarly="false"
              wrap="off"
              enterKeyHint="enter"
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={onKeyDown}
              onKeyUp={(e) => (e.key.startsWith('Arrow') || e.key === 'Home' || e.key === 'End' || e.key === 'PageUp' || e.key === 'PageDown') && reveal()}
              onInput={reveal}
              onScroll={(e) => {
                // the textarea is sized to its content; it must never scroll itself
                e.currentTarget.scrollTop = 0
                e.currentTarget.scrollLeft = 0
              }}
            />
          </div>
        </div>
        <span ref={probeRef} className="ed__probe" aria-hidden>
          0000000000
        </span>
      </div>
      {showKeys && (
        <div className="ed-keys" role="toolbar" aria-label="Code keys">
          <KeyButton label="Indent" wide onPress={indentKey}>
            <IndentIncrease size={17} strokeWidth={2.4} />
          </KeyButton>
          <KeyButton label="Dedent" wide onPress={() => shiftLines(-1)}>
            <IndentDecrease size={17} strokeWidth={2.4} />
          </KeyButton>
          {KEYS.map((k) => (
            <KeyButton key={k} onPress={() => insert(k)}>
              {k}
            </KeyButton>
          ))}
          <KeyButton label="Undo" wide onPress={undoKey}>
            <Undo2 size={17} strokeWidth={2.4} />
          </KeyButton>
        </div>
      )}
    </div>
  )
}

/** a key on the touch bar; mousedown is cancelled so the textarea keeps focus (and the keyboard stays up) */
function KeyButton({ label, wide, onPress, children }: { label?: string; wide?: boolean; onPress: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      className={['ed-keys__key', wide && 'ed-keys__key--wide'].filter(Boolean).join(' ')}
      tabIndex={-1}
      aria-label={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onPress}
    >
      {children}
    </button>
  )
}

export default Editor
