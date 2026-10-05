import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'motion/react'
import {
  ArrowRight,
  Check,
  CircleCheck,
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileText,
  FileVideo,
  Fingerprint,
  FolderOpen,
  Info,
  RotateCcw,
  Ruler,
  ScanSearch,
  Target,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Button } from '../ui/Button'
import { Ticker } from '../ui/Ticker'
import { haptic, sfx } from '../ui/fx'
import type { DedupConfig, WidgetProps } from './specs'
import { formatBytes, kindOf, naiveBytes, normalizeFiles, reclaimable, runFunnel, type DFile, type Group, type Kind, type Stage } from './dedup/model'
import './DedupWidget.css'

const SPRING = { type: 'spring', stiffness: 420, damping: 34 } as const
const POP = { type: 'spring', stiffness: 560, damping: 18 } as const

const KIND: Record<Kind, { icon: LucideIcon; hue: string }> = {
  image: { icon: FileImage, hue: 'teal' },
  doc: { icon: FileText, hue: 'blue' },
  audio: { icon: FileAudio, hue: 'violet' },
  video: { icon: FileVideo, hue: 'rose' },
  archive: { icon: FileArchive, hue: 'orange' },
  code: { icon: FileCode, hue: 'indigo' },
  other: { icon: File, hue: 'slate' },
}

const STAGES: { short: string; title: string; icon: LucideIcon; action: string }[] = [
  { short: 'Folder', title: 'The folder', icon: FolderOpen, action: 'Group by size' },
  { short: 'Size', title: 'Stage 1 · group by size', icon: Ruler, action: 'Hash the first 4 KB' },
  { short: 'First 4 KB', title: 'Stage 2 · hash the first 4 KB', icon: ScanSearch, action: 'Full hash' },
  { short: 'Full hash', title: 'Stage 3 · full hash', icon: Fingerprint, action: '' },
]

function useReduced(): boolean {
  const pref = useReducedMotion()
  return !!pref || (typeof document !== 'undefined' && document.documentElement.dataset.reduceMotion === 'true')
}

function kindVars(name: string): CSSProperties {
  const h = KIND[kindOf(name)].hue
  return {
    ['--k' as string]: `var(--c-${h})`,
    ['--k-soft' as string]: `var(--c-${h}-soft)`,
    ['--k-ink' as string]: `var(--c-${h}-ink)`,
  }
}

function list(names: string[]): string {
  if (names.length <= 1) return names.join('')
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

function groupLabel(stage: Stage, g: Group, files: DFile[]): { main: string; sub?: string } {
  const f = files[g.files[0]]
  if (stage === 0) return { main: 'Folder' }
  if (stage === 1) return { main: formatBytes(f.size), sub: 'same size' }
  if (stage === 2) return { main: f.head || 'empty', sub: `first 4 KB · ${formatBytes(f.size)}` }
  return { main: `${f.head.slice(0, 4)}${f.body}` || 'empty', sub: 'full hash' }
}

export default function DedupWidget({ config, onComplete }: WidgetProps<DedupConfig>) {
  // keyed by content so an equal config from a parent re-render doesn't restart the run
  const filesKey = JSON.stringify(config.files ?? null)
  const files = useMemo(() => normalizeFiles(JSON.parse(filesKey)), [filesKey])
  const goal = config.goal ?? 'groups'
  const funnel = useMemo(() => runFunnel(files), [files])
  const naive = naiveBytes(files)
  const reduce = useReduced()
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')

  const [stage, setStage] = useState<Stage>(0)
  const [confirmed, setConfirmed] = useState<Set<string>>(() => new Set())
  const [reached, setReached] = useState(false)
  const firedRef = useRef(false)

  const r = funnel[stage]
  const dups = funnel[3].groups
  const final = stage === 3
  const allConfirmed = final && dups.every((g) => confirmed.has(g.key))

  function resetState() {
    setStage(0)
    setConfirmed(new Set())
  }
  useEffect(resetState, [files])

  function complete() {
    if (firedRef.current) return
    firedRef.current = true
    setReached(true)
    sfx('correct')
    haptic('success')
    onComplete(true)
  }

  function advance() {
    if (stage >= 3) return
    const next = (stage + 1) as Stage
    setStage(next)
    sfx('flip')
    haptic('light')
    if (next === 3 && (goal === 'explore' || funnel[3].groups.length === 0)) complete()
  }

  function confirm(g: Group) {
    if (!final || confirmed.has(g.key)) return
    const next = new Set(confirmed)
    next.add(g.key)
    setConfirmed(next)
    sfx('select')
    haptic('light')
    if (dups.every((d) => next.has(d.key))) complete()
  }

  /* ------------------------------------------------------------- copy */
  const outNames = r.newlyRuledOut.map((i) => files[i].name)
  let note: string
  if (stage === 0) note = `${files.length} files. Find the byte-for-byte duplicates without reading everything.`
  else if (stage === 1)
    note = outNames.length
      ? `Sizes come from stat(), so this read 0 bytes. ${list(outNames)} ${outNames.length === 1 ? 'has a unique size and' : 'have unique sizes and'} can't have a twin.`
      : 'Sizes come from stat(), so this read 0 bytes. Every file shares its size with another.'
  else if (stage === 2)
    note = `Read 4 KB from each of ${r.filesRead} file${r.filesRead === 1 ? '' : 's'} (${formatBytes(r.bytesThisStage)}). ${
      outNames.length ? `${list(outNames)} started differently, so ${outNames.length === 1 ? "it's" : "they're"} out.` : 'Every start matched, so nothing is ruled out yet.'
    }`
  else
    note = `Read ${r.filesRead} file${r.filesRead === 1 ? '' : 's'} in full (${formatBytes(r.bytesThisStage)}). ${
      outNames.length ? `${list(outNames)} matched on size and first 4 KB, but the full hash differs.` : 'Every candidate matched all the way through.'
    }`

  const saved = naive > 0 ? 1 - r.bytesTotal / naive : 0
  const freed = reclaimable(files, dups)
  const goalText = goal === 'explore' ? 'Goal: run all three stages' : 'Goal: find and tap every duplicate group'
  const goalCount = final && goal !== 'explore' ? `${confirmed.size}/${dups.length}` : `${stage}/3`
  const doneText = goal === 'explore' ? 'Goal reached: all three stages run' : dups.length ? 'Goal reached: every duplicate group found' : 'Goal reached: no duplicates here'

  const pile = [...r.ruledOut.entries()].sort((a, b) => a[1] - b[1] || a[0] - b[0])

  return (
    <div className="dd">
      <AnimatePresence mode="wait" initial={false}>
        {reached ? (
          <motion.div key="done" className="w-goal dd-goal" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={POP}>
            <CircleCheck size={18} strokeWidth={2.6} />
            <span className="dd-goal__text">{doneText}</span>
          </motion.div>
        ) : (
          <motion.div key="todo" className="w-goal dd-goal dd-goal--todo" exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.12 }}>
            <Target size={16} strokeWidth={2.6} />
            <span className="dd-goal__text">{goalText}</span>
            <span className="dd-goal__count tabular">{goalCount}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* -------------------------------------------------- stage card */}
      <section className="dd-stage">
        <ol className="dd-steps" aria-label="Stages">
          {STAGES.map((s, i) => {
            const Icon = s.icon
            return (
              <li key={i} className={['dd-step', i < stage ? 'is-done' : '', i === stage ? 'is-cur' : ''].join(' ')}>
                <span className="dd-step__dot">{i < stage ? <Check size={13} strokeWidth={3.2} /> : <Icon size={13} strokeWidth={2.6} />}</span>
                <span className="dd-step__label">{s.short}</span>
              </li>
            )
          })}
        </ol>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={stage} className="dd-stage__body" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.08 } }} transition={{ duration: 0.2 }}>
            <span className="dd-stage__title">{STAGES[stage].title}</span>
            <span className="dd-stage__note">{note}</span>
          </motion.div>
        </AnimatePresence>
        {!final ? (
          <Button size="sm" variant="course" block iconRight={<ArrowRight size={15} strokeWidth={2.8} />} onClick={advance}>
            {STAGES[stage].action}
          </Button>
        ) : dups.length ? (
          <div className={['dd-tapcue', allConfirmed ? 'is-done' : ''].join(' ')}>
            {allConfirmed ? (
              <>
                <CircleCheck size={16} strokeWidth={2.6} />
                {dups.length} group{dups.length === 1 ? '' : 's'} confirmed: keeping one copy each frees {formatBytes(freed)}.
              </>
            ) : (
              <>Tap each duplicate group to confirm it.</>
            )}
          </div>
        ) : (
          <div className="dd-tapcue is-done">
            <CircleCheck size={16} strokeWidth={2.6} />
            No duplicates: every file was ruled out.
          </div>
        )}
      </section>

      {/* ------------------------------------------------- bytes meter */}
      <section className="dd-meter" aria-label="Bytes read">
        <div className="dd-meter__head">
          <span className="w-label">Bytes read</span>
          <AnimatePresence>
            {final && saved > 0 && (
              <motion.span key="save" className="dd-save tabular" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} transition={POP}>
                {Math.round(saved * 100)}% less
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <div className="dd-bar">
          <div className="dd-bar__row">
            <span className="dd-bar__name">This funnel</span>
            <span className="dd-bar__val tabular">
              <Ticker value={r.bytesTotal} duration={reduce ? 0 : 0.7} format={(v) => formatBytes(Math.round(v))} />
            </span>
          </div>
          <div className="dd-bar__track">
            <motion.div
              className="dd-bar__fill dd-bar__fill--funnel"
              initial={false}
              animate={{ width: `${naive > 0 ? Math.max(r.bytesTotal > 0 ? 1.2 : 0, (r.bytesTotal / naive) * 100) : 0}%` }}
              transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 120, damping: 22 }}
            />
          </div>
        </div>
        <div className="dd-bar">
          <div className="dd-bar__row">
            <span className="dd-bar__name">Hash everything</span>
            <span className="dd-bar__val tabular">{formatBytes(naive)}</span>
          </div>
          <div className="dd-bar__track">
            <div className="dd-bar__fill dd-bar__fill--naive" style={{ width: naive > 0 ? '100%' : '0%' }} />
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- bins */}
      <LayoutGroup id={uid}>
        <div className="dd-bins">
          {r.groups.map((g, gi) => {
            const lab = groupLabel(stage, g, files)
            const isDup = final
            const ok = confirmed.has(g.key)
            const size = files[g.files[0]].size
            const body = (
              <>
                <span className="dd-bin__head">
                  <span className="dd-bin__key">{lab.main}</span>
                  {lab.sub && <span className="dd-bin__sub">{lab.sub}</span>}
                  <span className="dd-bin__count tabular">
                    {isDup ? (
                      ok ? (
                        <motion.span className="dd-bin__ok" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={POP}>
                          <Check size={12} strokeWidth={3.4} /> dupes
                        </motion.span>
                      ) : (
                        'tap'
                      )
                    ) : (
                      `×${g.files.length}`
                    )}
                  </span>
                </span>
                <span className="dd-bin__files">
                  {g.files.map((i) => (
                    <FileCard key={i} f={files[i]} layoutId={`${uid}-f${i}`} reduce={reduce} />
                  ))}
                </span>
                {isDup && (
                  <span className="dd-bin__foot">
                    {ok ? `Keep one, free ${formatBytes(size * (g.files.length - 1))}` : `${g.files.length} identical copies · ${formatBytes(size)} each`}
                  </span>
                )}
              </>
            )
            return isDup ? (
              <motion.button
                type="button"
                key={g.key}
                layout={!reduce}
                className={['dd-bin', 'dd-bin--dup', ok ? 'is-ok' : ''].join(' ')}
                initial={reduce ? false : { opacity: 0, scale: 0.96 }}
                animate={ok && !reduce ? { opacity: 1, scale: [1, 1.03, 1] } : { opacity: 1, scale: 1 }}
                transition={ok ? { duration: 0.3 } : { ...SPRING, delay: reduce ? 0 : 0.05 * gi }}
                whileTap={ok ? undefined : { scale: 0.98 }}
                aria-pressed={ok}
                aria-label={`Duplicate group: ${g.files.map((i) => files[i].name).join(', ')}`}
                onClick={() => confirm(g)}
              >
                {body}
              </motion.button>
            ) : (
              <motion.div
                key={g.key}
                layout={!reduce}
                className={['dd-bin', stage === 0 ? 'dd-bin--folder' : ''].join(' ')}
                initial={reduce ? false : { opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ...SPRING, delay: reduce ? 0 : 0.05 * gi }}
              >
                {body}
              </motion.div>
            )
          })}
        </div>

        {/* -------------------------------------------------- ruled out */}
        <section className={['dd-pile', pile.length ? '' : 'is-empty'].join(' ')} aria-label="Ruled out">
          <div className="dd-pile__head">
            <span className="w-label">Unique · ruled out</span>
            <span className="dd-pile__legend">
              <span className="dd-tag dd-tag--1" /> size
              <span className="dd-tag dd-tag--2" /> 4 KB
              <span className="dd-tag dd-tag--3" /> hash
            </span>
          </div>
          {pile.length === 0 ? (
            <p className="dd-pile__empty">Files that can't have a twin land here.</p>
          ) : (
            <div className="dd-pile__chips">
              {pile.map(([i, s]) => (
                <motion.span
                  key={i}
                  layoutId={`${uid}-f${i}`}
                  className={['dd-chip', s === stage ? 'is-new' : ''].join(' ')}
                  style={kindVars(files[i].name)}
                  transition={reduce ? { duration: 0 } : SPRING}
                  title={files[i].name}
                >
                  <span className={`dd-tag dd-tag--${s}`} />
                  <span className="dd-chip__name">{files[i].name}</span>
                </motion.span>
              ))}
            </div>
          )}
        </section>
      </LayoutGroup>

      <div className="dd-foot">
        <span className="dd-foot__note">
          <Info size={13} strokeWidth={2.6} />
          Real tools also skip empty files and hardlinks to the same inode.
        </span>
        <Button size="sm" variant="ghost" icon={<RotateCcw size={14} strokeWidth={2.6} />} onClick={resetState} disabled={stage === 0}>
          Reset
        </Button>
      </div>
    </div>
  )
}

function FileCard({ f, layoutId, reduce }: { f: DFile; layoutId: string; reduce: boolean }) {
  const Icon = KIND[kindOf(f.name)].icon
  return (
    <motion.span layoutId={layoutId} className="dd-file" style={kindVars(f.name)} transition={reduce ? { duration: 0 } : SPRING} title={f.name}>
      <span className="dd-file__icon">
        <Icon size={16} strokeWidth={2.4} />
      </span>
      <span className="dd-file__text">
        <span className="dd-file__name">{f.name}</span>
        <span className="dd-file__size tabular">{formatBytes(f.size)}</span>
      </span>
    </motion.span>
  )
}
