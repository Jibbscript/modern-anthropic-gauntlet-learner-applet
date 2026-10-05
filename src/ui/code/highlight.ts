/**
 * Tiny Python tokenizer for syntax colouring. Not a parser: it only needs to
 * colour keywords, strings, numbers, comments, builtins, decorators and
 * function names well enough for short interview-sized snippets.
 */

export type TokKind = 'kw' | 'str' | 'num' | 'com' | 'fn' | 'builtin' | 'deco' | 'op' | 'plain'
export interface Tok {
  k: TokKind
  v: string
}

const KW = new Set(
  'False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case'.split(
    ' ',
  ),
)
const BUILTIN = new Set(
  'print len range enumerate zip map filter sorted reversed sum min max abs any all dict list set tuple str int float bool bytes open iter next isinstance hasattr getattr setattr super object type self cls Exception ValueError KeyError TypeError RuntimeError StopIteration'.split(
    ' ',
  ),
)

const RE =
  /(#[^\n]*)|("""[\s\S]*?"""|'''[\s\S]*?'''|[rbfu]{0,2}"(?:[^"\\\n]|\\.)*"|[rbfu]{0,2}'(?:[^'\\\n]|\\.)*')|(@[A-Za-z_][\w.]*)|(\b\d[\d_]*(?:\.\d+)?(?:e[+-]?\d+)?\b)|([A-Za-z_]\w*)|([^\sA-Za-z_\d]+)|(\s+)/g

export function tokenizePython(src: string): Tok[] {
  const out: Tok[] = []
  let m: RegExpExecArray | null
  let prevWord = ''
  RE.lastIndex = 0
  while ((m = RE.exec(src))) {
    const v = m[0]
    if (m[1]) out.push({ k: 'com', v })
    else if (m[2]) out.push({ k: 'str', v })
    else if (m[3]) out.push({ k: 'deco', v })
    else if (m[4]) out.push({ k: 'num', v })
    else if (m[5]) {
      if (KW.has(v)) out.push({ k: 'kw', v })
      else if (prevWord === 'def' || prevWord === 'class') out.push({ k: 'fn', v })
      else if (BUILTIN.has(v)) out.push({ k: 'builtin', v })
      else {
        // name followed by "(" = call
        const rest = src.slice(RE.lastIndex)
        out.push({ k: /^\s*\(/.test(rest) ? 'fn' : 'plain', v })
      }
      prevWord = v
      continue
    } else if (m[6]) out.push({ k: 'op', v })
    else out.push({ k: 'plain', v })
    if (!m[7]) prevWord = ''
  }
  return out
}

/** split a token stream into per-line token arrays (strings spanning lines are split) */
export function tokenLines(src: string, lang: string = 'python'): Tok[][] {
  const toks: Tok[] = lang === 'python' ? tokenizePython(src) : [{ k: 'plain', v: src }]
  const lines: Tok[][] = [[]]
  for (const t of toks) {
    const parts = t.v.split('\n')
    parts.forEach((p, i) => {
      if (i > 0) lines.push([])
      if (p) lines[lines.length - 1].push({ k: t.k, v: p })
    })
  }
  return lines
}
