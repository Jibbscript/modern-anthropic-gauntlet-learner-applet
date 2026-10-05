import type { Course, ReviewCard, Step } from '../core/types'
import { SKILL_BY_ID, STORY_BY_ID } from './skills'
import { WIDGET_IDS } from '../widgets/specs'

export interface Issue {
  where: string
  msg: string
  level: 'error' | 'warn'
}

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/

function richIssues(where: string, text: string | undefined, out: Issue[]) {
  if (text == null) return
  if (typeof text !== 'string') {
    out.push({ where, msg: 'rich text must be a string', level: 'error' })
    return
  }
  // ignore code spans when counting emphasis markers
  const noCode = text.replace(/`[^`\n]*`/g, '')
  const ticks = (text.match(/`/g) ?? []).length
  if (ticks % 2) out.push({ where, msg: 'unbalanced backticks', level: 'error' })
  const bold = (noCode.match(/\*\*/g) ?? []).length
  if (bold % 2) out.push({ where, msg: 'unbalanced ** markers', level: 'error' })
  const hl = (noCode.match(/==/g) ?? []).length
  if (hl % 2) out.push({ where, msg: 'unbalanced == markers', level: 'warn' })
}

function checkBody(where: string, s: Step | ReviewCard, out: Issue[]) {
  const err = (msg: string) => out.push({ where, msg, level: 'error' })
  const r = (k: string, t?: string) => richIssues(`${where}.${k}`, t, out)
  switch (s.kind) {
    case 'concept':
      r('body', s.body)
      if (!s.body?.trim()) err('concept needs a body')
      if (s.widget && !WIDGET_IDS.includes(s.widget.id)) err(`unknown widget ${s.widget.id}`)
      if (s.callout) r('callout', s.callout.text)
      break
    case 'mcq': {
      r('prompt', s.prompt)
      r('explanation', s.explanation)
      if (s.choices.length < 2) err('mcq needs >= 2 choices')
      const n = s.choices.filter((c) => c.correct).length
      if (n === 0) err('mcq has no correct choice')
      if (!s.multi && n !== 1) err(`single-answer mcq has ${n} correct choices`)
      s.choices.forEach((c, i) => {
        r(`choice${i}`, c.text)
        r(`choice${i}.feedback`, c.feedback)
      })
      break
    }
    case 'order':
      r('prompt', s.prompt)
      if (s.items.length < 3) err('order needs >= 3 items')
      if (new Set(s.items).size !== s.items.length) err('order items must be distinct')
      break
    case 'sort': {
      r('prompt', s.prompt)
      const ids = new Set(s.buckets.map((b) => b.id))
      if (s.buckets.length < 2 || s.buckets.length > 3) err('sort needs 2-3 buckets')
      if (s.items.length < 3) err('sort needs >= 3 items')
      s.items.forEach((it, i) => {
        if (!ids.has(it.bucket)) err(`sort item ${i} has unknown bucket ${it.bucket}`)
      })
      for (const b of s.buckets) if (!s.items.some((it) => it.bucket === b.id)) err(`bucket ${b.id} is empty`)
      break
    }
    case 'cloze': {
      r('prompt', s.prompt)
      const marks = [...s.code.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]))
      if (marks.length !== s.blanks.length) err(`cloze has ${marks.length} {{n}} marks but ${s.blanks.length} blanks`)
      marks.forEach((m, i) => {
        if (m !== i) err(`cloze marks must be {{0}}, {{1}}, ... in order (found {{${m}}} at position ${i})`)
      })
      s.blanks.forEach((b, i) => {
        if (b.options.length < 2) err(`blank ${i} needs >= 2 options`)
        if (b.answer < 0 || b.answer >= b.options.length) err(`blank ${i} answer index out of range`)
        if (new Set(b.options).size !== b.options.length) err(`blank ${i} options must be distinct`)
      })
      break
    }
    case 'spotbug': {
      r('prompt', s.prompt)
      const lines = s.code.split('\n').length
      if (!s.bugLines.length) err('spotbug needs bugLines')
      for (const l of s.bugLines) if (l < 1 || l > lines) err(`bug line ${l} outside 1..${lines}`)
      break
    }
    case 'predict':
      r('prompt', s.prompt)
      if (!s.answers.length || s.answers.some((a) => !a.trim())) err('predict needs non-empty answers')
      break
    case 'numeric':
      r('prompt', s.prompt)
      if (!Number.isFinite(s.answer)) err('numeric answer must be finite')
      if (s.tolerance != null && (s.tolerance < 0 || s.tolerance > 1)) err('tolerance must be 0..1')
      break
    case 'match':
      r('prompt', s.prompt)
      if (s.pairs.length < 3 || s.pairs.length > 6) err('match needs 3-6 pairs')
      if (new Set(s.pairs.map((p) => p.right)).size !== s.pairs.length) err('match right sides must be distinct')
      break
    case 'compare':
      r('question', s.question)
      r('a', s.a)
      r('b', s.b)
      if (s.better !== 'a' && s.better !== 'b') err('compare.better must be a or b')
      break
    case 'flash':
      r('front', s.front)
      r('back', s.back)
      break
    case 'interview':
      if (!s.turns.length) err('interview needs turns')
      s.turns.forEach((t, i) => {
        r(`turn${i}`, t.interviewer)
        if (t.options.length < 2) err(`turn ${i} needs >= 2 options`)
        if (!t.options.some((o) => o.quality === 'strong')) err(`turn ${i} needs a strong option`)
      })
      break
    case 'reflect':
      r('prompt', s.prompt)
      if (s.rubric.length < 2) err('reflect needs >= 2 rubric items')
      if (s.slot && !STORY_BY_ID[s.slot]) err(`unknown story slot ${s.slot}`)
      break
    case 'widget':
      r('prompt', s.prompt)
      if (!WIDGET_IDS.includes(s.widget.id)) err(`unknown widget ${s.widget.id}`)
      break
    default:
      err(`unknown kind ${(s as { kind: string }).kind}`)
  }
}

export interface ValidateOptions {
  /** minimum steps per lesson (default 6) */
  minSteps?: number
  /** minimum review cards per lesson (default 3) */
  minCards?: number
}

export function validateCourses(courses: Course[], opts: ValidateOptions = {}): Issue[] {
  const out: Issue[] = []
  const lessonIds = new Set<string>()
  const cardIds = new Set<string>()
  const minSteps = opts.minSteps ?? 6
  const minCards = opts.minCards ?? 3

  for (const c of courses) {
    const cw = `course:${c.id}`
    if (!c.lessons.length) out.push({ where: cw, msg: 'course has no lessons', level: 'error' })
    richIssues(`${cw}.why`, c.why, out)
    for (const l of c.lessons) {
      const lw = `${cw}/lesson:${l.id}`
      if (!KEBAB.test(l.id)) out.push({ where: lw, msg: 'lesson id must be kebab-case', level: 'error' })
      if (lessonIds.has(l.id)) out.push({ where: lw, msg: 'duplicate lesson id', level: 'error' })
      lessonIds.add(l.id)
      if (!l.skills.length) out.push({ where: lw, msg: 'lesson needs skills', level: 'error' })
      for (const sk of l.skills) if (!SKILL_BY_ID[sk]) out.push({ where: lw, msg: `unknown skill ${sk}`, level: 'error' })
      if (l.steps.length < minSteps) out.push({ where: lw, msg: `only ${l.steps.length} steps (min ${minSteps})`, level: 'error' })
      if (l.cards.length < minCards) out.push({ where: lw, msg: `only ${l.cards.length} cards (min ${minCards})`, level: 'error' })
      const graded = l.steps.filter((s) => s.kind !== 'concept' && s.kind !== 'reflect').length
      if (graded < 2) out.push({ where: lw, msg: 'lesson needs >= 2 interactive graded steps', level: 'error' })
      if (l.steps[0]?.kind !== 'concept') out.push({ where: lw, msg: 'first step should be a concept hook', level: 'warn' })

      const stepIds = new Set<string>()
      l.steps.forEach((s, i) => {
        const sw = `${lw}/step:${s.id ?? i}`
        if (!s.id || !KEBAB.test(s.id)) out.push({ where: sw, msg: 'step id must be kebab-case', level: 'error' })
        if (stepIds.has(s.id)) out.push({ where: sw, msg: 'duplicate step id', level: 'error' })
        stepIds.add(s.id)
        checkBody(sw, s, out)
      })
      for (const card of l.cards) {
        const kw = `${lw}/card:${card.id}`
        if (!card.id.startsWith(`${l.id}.`)) out.push({ where: kw, msg: `card id must start with "${l.id}."`, level: 'error' })
        if (cardIds.has(card.id)) out.push({ where: kw, msg: 'duplicate card id', level: 'error' })
        cardIds.add(card.id)
        if (!SKILL_BY_ID[card.skill]) out.push({ where: kw, msg: `unknown skill ${card.skill}`, level: 'error' })
        if ((card as { kind: string }).kind === 'concept' || (card as { kind: string }).kind === 'reflect' || (card as { kind: string }).kind === 'widget' || (card as { kind: string }).kind === 'interview')
          out.push({ where: kw, msg: `card kind ${(card as { kind: string }).kind} not allowed`, level: 'error' })
        checkBody(kw, card, out)
      }
    }
  }
  return out
}
