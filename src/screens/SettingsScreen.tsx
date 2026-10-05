import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Accessibility,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  FileUp,
  Moon,
  Smartphone,
  Sun,
  Trash2,
  TriangleAlert,
  Upload,
  Vibrate,
  Volume2,
  X,
} from 'lucide-react'
import { useStore, exportState, initialState, DEFAULT_SETTINGS, type GauntletState, type Profile, type ThemePref } from '../core/store'
import { dayKey, daysBetween } from '../core/dates'
import { nav, useNav } from '../app/nav'
import { Button, IconButton } from '../ui/Button'
import { Sheet } from '../ui/Sheet'
import { haptic, sfx } from '../ui/fx'
import { version as APP_VERSION } from '../../package.json'
import './SettingsScreen.css'

const ROLES: { value: Profile['role']; label: string }[] = [
  { value: 'swe', label: 'SWE' },
  { value: 'research-eng', label: 'Research Eng' },
  { value: 'infra', label: 'Infra' },
  { value: 'other', label: 'Other' },
]

const GOALS = [
  { xp: 30, label: 'Casual', hint: 'about 5 min' },
  { xp: 60, label: 'Regular', hint: 'about 10 min' },
  { xp: 100, label: 'Serious', hint: 'about 15 min' },
  { xp: 150, label: 'Intense', hint: 'about 25 min' },
]

const RETENTION: { value: number; label: string; why: string }[] = [
  { value: 0.85, label: '85%', why: 'Fewest reviews. About 1 card in 7 slips before it comes back.' },
  { value: 0.9, label: '90%', why: 'Balanced. About 1 card in 10 slips before its review.' },
  { value: 0.95, label: '95%', why: 'Most reviews a day. Only about 1 card in 20 slips.' },
]

const SESSION_SIZES = [10, 15, 25]

const THEMES: { value: ThemePref; label: string; icon: ReactNode }[] = [
  { value: 'system', label: 'System', icon: <Smartphone size={16} strokeWidth={2.4} /> },
  { value: 'light', label: 'Light', icon: <Sun size={16} strokeWidth={2.4} /> },
  { value: 'dark', label: 'Dark', icon: <Moon size={16} strokeWidth={2.4} /> },
]

type SheetKind = null | 'export' | 'import' | 'reset'

export default function SettingsScreen() {
  const profile = useStore((s) => s.profile)
  const settings = useStore((s) => s.settings)
  const setProfile = useStore((s) => s.setProfile)
  const setSettings = useStore((s) => s.setSettings)
  const [sheet, setSheet] = useState<SheetKind>(null)
  const [exportText, setExportText] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(t)
  }, [toast])

  const today = dayKey(Date.now())
  const daysLeft = profile.interviewDate ? daysBetween(today, profile.interviewDate) : null
  const retention = RETENTION.find((r) => Math.abs(r.value - settings.retention) < 0.001)

  const exportProgress = async () => {
    const json = JSON.stringify(exportState(), null, 2)
    try {
      if (!navigator.clipboard?.writeText) throw new Error('no clipboard')
      await navigator.clipboard.writeText(json)
      sfx('correct')
      haptic('success')
      setToast('Progress copied as JSON')
    } catch {
      setExportText(json)
      setSheet('export')
    }
  }

  return (
    <div className="set">
      <header className="set-head safe-top">
        <IconButton label="Back" className="set-head__back" onClick={nav.back}>
          <ChevronLeft size={28} strokeWidth={2.6} />
        </IconButton>
        <h1>Settings</h1>
        <span />
      </header>

      <div className="set-scroll scroll">
        <div className="set-body">
          {/* ----------------------------------------------------- profile */}
          <Section title="Profile">
            <div className="set-card set-card--pad">
              <label className="set-field">
                <span className="set-field__label">Name</span>
                <input
                  className="set-input"
                  type="text"
                  value={profile.name}
                  placeholder="What should we call you?"
                  maxLength={40}
                  autoComplete="given-name"
                  onChange={(e) => setProfile({ name: e.target.value })}
                />
              </label>
              <div className="set-field">
                <span className="set-field__label" id="set-role">
                  Role you are interviewing for
                </span>
                <Segmented label="Role" className="set-seg--roles" value={profile.role} options={ROLES} onChange={(role) => setProfile({ role })} />
              </div>
              <div className="set-field">
                <label className="set-field__label" htmlFor="set-date">
                  Interview date
                </label>
                <div className="set-date">
                  <CalendarDays className="set-date__icon" size={18} strokeWidth={2.4} />
                  <input
                    id="set-date"
                    className={`set-input set-input--date ${profile.interviewDate ? '' : 'is-empty'}`}
                    type="date"
                    value={profile.interviewDate}
                    min={today}
                    aria-describedby="set-date-hint"
                    onChange={(e) => setProfile({ interviewDate: e.target.value })}
                  />
                  {!profile.interviewDate && (
                    <span className="set-date__ph" aria-hidden>
                      Not set
                    </span>
                  )}
                  {profile.interviewDate && (
                    <IconButton label="Clear interview date" className="set-date__clear" onClick={() => setProfile({ interviewDate: '' })}>
                      <X size={18} strokeWidth={2.6} />
                    </IconButton>
                  )}
                </div>
                <p className="set-hint" id="set-date-hint">
                  {daysLeft == null
                    ? 'Add it and Gauntlet times your reviews so everything is fresh on the day.'
                    : daysLeft > 1
                      ? `${daysLeft} days to go. Reviews tighten in the final two weeks so nothing goes stale.`
                      : daysLeft === 1
                        ? 'Tomorrow. Keep reviews light tonight and get some sleep.'
                        : daysLeft === 0
                          ? 'Today. You have done the work.'
                          : 'This date has passed. Set your next one, or clear it.'}
                </p>
              </div>
            </div>
          </Section>

          {/* ---------------------------------------------------- learning */}
          <Section title="Learning">
            <div className="set-card set-card--pad">
              <div className="set-field">
                <span className="set-field__label">Daily XP goal</span>
                <div className="set-goals" role="radiogroup" aria-label="Daily XP goal">
                  {GOALS.map((g) => {
                    const on = settings.dailyXpGoal === g.xp
                    return (
                      <motion.button
                        key={g.xp}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        className={`set-goal ${on ? 'is-on' : ''}`}
                        whileTap={{ y: 2 }}
                        onClick={() => {
                          if (on) return
                          sfx('select')
                          haptic('light')
                          setSettings({ dailyXpGoal: g.xp })
                        }}
                      >
                        <span className="set-goal__top">
                          <span className="set-goal__name">{g.label}</span>
                          <span className="set-goal__check" aria-hidden>
                            {on && <Check size={14} strokeWidth={3.4} />}
                          </span>
                        </span>
                        <span className="set-goal__xp tabular">{g.xp} XP a day</span>
                        <span className="set-goal__hint">{g.hint}</span>
                      </motion.button>
                    )
                  })}
                </div>
              </div>

              <div className="set-field">
                <span className="set-field__label">Target retention</span>
                <Segmented
                  label="Target retention"
                  value={retention?.value ?? -1}
                  options={RETENTION.map((r) => ({ value: r.value, label: r.label }))}
                  onChange={(v) => setSettings({ retention: v })}
                />
                <p className="set-hint">
                  {retention?.why ?? `Currently ${Math.round(settings.retention * 100)}%. Pick a preset to change it.`}
                  {daysLeft != null && daysLeft >= 0 && daysLeft < 14 ? ' Inside two weeks of your interview, Gauntlet holds at least 92%.' : ''}
                </p>
              </div>

              <div className="set-field">
                <span className="set-field__label">Review session size</span>
                <Segmented
                  label="Review session size"
                  value={settings.sessionSize}
                  options={SESSION_SIZES.map((n) => ({ value: n, label: `${n} cards` }))}
                  onChange={(n) => setSettings({ sessionSize: n })}
                />
                <p className="set-hint">A full session takes about {Math.max(1, Math.round((settings.sessionSize * 20) / 60))} minutes.</p>
              </div>
            </div>
          </Section>

          {/* -------------------------------------------------------- feel */}
          <Section title="Feel">
            <div className="set-card">
              <ToggleRow
                icon={<Volume2 size={18} strokeWidth={2.4} />}
                tone="orange"
                label="Sound effects"
                on={settings.sound}
                onChange={(sound) => {
                  setSettings({ sound })
                  if (sound) sfx('select')
                }}
              />
              <ToggleRow
                icon={<Vibrate size={18} strokeWidth={2.4} />}
                tone="violet"
                label="Haptics"
                hint="On devices that support vibration"
                on={settings.haptics}
                onChange={(haptics) => {
                  setSettings({ haptics })
                  if (haptics) haptic('light')
                }}
              />
              <ToggleRow
                icon={<Accessibility size={18} strokeWidth={2.4} />}
                tone="teal"
                label="Reduce motion"
                hint="Calmer transitions, no confetti"
                on={settings.reduceMotion}
                onChange={(reduceMotion) => setSettings({ reduceMotion })}
              />
              <div className="set-row set-row--stack">
                <span className="set-row__text">
                  <span className="set-row__label">Appearance</span>
                </span>
                <Segmented label="Appearance" value={settings.theme} options={THEMES} onChange={(theme) => setSettings({ theme })} />
              </div>
            </div>
          </Section>

          {/* -------------------------------------------------------- data */}
          <Section title="Your data" note="Progress lives on this device only. Export it to move to another browser or keep a backup.">
            <div className="set-card">
              <ActionRow icon={<Download size={18} strokeWidth={2.4} />} tone="blue" label="Export progress" hint="Copies a JSON backup" onClick={exportProgress} />
              <ActionRow icon={<Upload size={18} strokeWidth={2.4} />} tone="green" label="Import progress" hint="Replace this device’s progress" onClick={() => setSheet('import')} />
              <ActionRow icon={<Trash2 size={18} strokeWidth={2.4} />} tone="bad" label="Reset all progress" onClick={() => setSheet('reset')} danger />
            </div>
          </Section>

          {/* ------------------------------------------------------- about */}
          <Section title="About">
            <div className="set-card">
              <div className="set-row">
                <span className="set-row__text">
                  <span className="set-row__label">Version</span>
                </span>
                <span className="set-row__value tabular">{APP_VERSION}</span>
              </div>
              <p className="set-about">
                Gauntlet is an unofficial study tool. It is not affiliated with, endorsed by, or sponsored by Anthropic or Brilliant. Interview patterns come from
                public candidate reports and may differ from your loop.
              </p>
            </div>
          </Section>
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            className="set-toast"
            role="status"
            initial={{ y: 30, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 520, damping: 32 }}
          >
            <span className="set-toast__icon">
              <Check size={16} strokeWidth={3.2} />
            </span>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <Sheet open={sheet === 'export'} onClose={() => setSheet(null)} label="Export progress">
        <ExportSheet text={exportText} onDone={() => setSheet(null)} onCopied={() => setToast('Progress copied as JSON')} />
      </Sheet>
      <Sheet open={sheet === 'import'} onClose={() => setSheet(null)} label="Import progress">
        <ImportSheet
          onCancel={() => setSheet(null)}
          onDone={() => {
            setSheet(null)
            setToast('Progress imported')
          }}
        />
      </Sheet>
      <Sheet open={sheet === 'reset'} onClose={() => setSheet(null)} label="Reset all progress">
        <ResetSheet onCancel={() => setSheet(null)} />
      </Sheet>
    </div>
  )
}

/* ---------------------------------------------------------- building blocks */

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="set-sec">
      <h2 className="set-sec__title">{title}</h2>
      {children}
      {note && <p className="set-sec__note">{note}</p>}
    </section>
  )
}

function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T
  options: { value: T; label: string; icon?: ReactNode }[]
  onChange: (v: T) => void
  label: string
  className?: string
}) {
  return (
    <div className={['set-seg', className].filter(Boolean).join(' ')} role="radiogroup" aria-label={label}>
      {options.map((o) => {
        const on = o.value === value
        return (
          <motion.button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={on}
            className={`set-seg__opt ${on ? 'is-on' : ''}`}
            whileTap={{ y: 2 }}
            onClick={() => {
              if (on) return
              sfx('select')
              haptic('light')
              onChange(o.value)
            }}
          >
            {o.icon}
            <span>{o.label}</span>
          </motion.button>
        )
      })}
    </div>
  )
}

/** iOS-style switch; the whole row is the hit target. */
function ToggleRow({
  icon,
  tone,
  label,
  hint,
  on,
  onChange,
}: {
  icon: ReactNode
  tone: string
  label: string
  hint?: string
  on: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button type="button" role="switch" aria-checked={on} className="set-row set-row--tap" onClick={() => onChange(!on)}>
      <span className={`set-row__icon set-row__icon--${tone}`}>{icon}</span>
      <span className="set-row__text">
        <span className="set-row__label">{label}</span>
        {hint && <span className="set-row__hint">{hint}</span>}
      </span>
      <span className={`set-switch ${on ? 'is-on' : ''}`} aria-hidden>
        <motion.span className="set-switch__knob" layout transition={{ type: 'spring', stiffness: 700, damping: 38 }} />
      </span>
    </button>
  )
}

function ActionRow({ icon, tone, label, hint, onClick, danger }: { icon: ReactNode; tone: string; label: string; hint?: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      className={`set-row set-row--tap ${danger ? 'set-row--danger' : ''}`}
      onClick={() => {
        sfx('tap')
        haptic('light')
        onClick()
      }}
    >
      <span className={`set-row__icon set-row__icon--${tone}`}>{icon}</span>
      <span className="set-row__text">
        <span className="set-row__label">{label}</span>
        {hint && <span className="set-row__hint">{hint}</span>}
      </span>
      <ChevronRight className="set-row__chev" size={20} strokeWidth={2.6} />
    </button>
  )
}

/* ------------------------------------------------------------------ sheets */

function ExportSheet({ text, onDone, onCopied }: { text: string; onDone: () => void; onCopied: () => void }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    const el = ref.current
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      onCopied()
      return
    } catch {
      /* fall through to a manual selection */
    }
    if (el) {
      el.focus()
      el.select()
      try {
        if (document.execCommand('copy')) {
          setCopied(true)
          onCopied()
        }
      } catch {
        /* the text stays selected for a manual copy */
      }
    }
  }
  const download = () => {
    try {
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `gauntlet-progress-${dayKey(Date.now())}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      /* downloads blocked: the textarea is still there */
    }
  }
  return (
    <div className="set-sheet">
      <h3>Your progress</h3>
      <p>Copying was blocked here, so select the text below and copy it, or save it as a file.</p>
      <textarea ref={ref} className="set-textarea" readOnly value={text} rows={8} onFocus={(e) => e.currentTarget.select()} aria-label="Progress JSON" spellCheck={false} />
      <div className="set-sheet__row">
        <Button variant="secondary" size="md" icon={<Copy size={18} strokeWidth={2.4} />} onClick={copy}>
          {copied ? 'Copied' : 'Copy'}
        </Button>
        <Button variant="secondary" size="md" icon={<Download size={18} strokeWidth={2.4} />} onClick={download}>
          Save file
        </Button>
      </div>
      <Button block size="lg" onClick={onDone}>
        Done
      </Button>
    </div>
  )
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

/**
 * Accepts an export, or the raw localStorage blob ({ state, version }).
 * Fields an older or hand-edited export lacks fall back to defaults, and
 * fields of the wrong shape are rejected, so a bad file cannot break the app.
 */
function parseImport(text: string): GauntletState {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('That is not valid JSON. Paste the whole export, from the first { to the last }.')
  }
  if (isObj(data) && isObj(data.state)) data = data.state
  if (!isObj(data)) throw new Error('This does not look like a Gauntlet export.')
  if (!('profile' in data) && !('lessons' in data) && !('cards' in data)) throw new Error('This does not look like a Gauntlet export: it has no profile, lessons or cards.')
  const maps = ['profile', 'settings', 'lessons', 'cards', 'stories', 'reflections', 'days', 'streak', 'achievements', 'labs'] as const
  const bad = maps.filter((k) => k in data && !isObj(data[k]))
  if (bad.length) throw new Error(`This export is damaged: "${bad[0]}" has the wrong shape.`)
  if ('version' in data && data.version !== 1) throw new Error('This export comes from a different version of Gauntlet and cannot be imported here.')
  if ('xp' in data && typeof data.xp !== 'number') throw new Error('This export is damaged: "xp" is not a number.')
  const base = initialState()
  const d = data as Partial<GauntletState>
  return {
    ...base,
    ...d,
    version: 1,
    profile: { ...base.profile, ...(d.profile ?? {}) },
    settings: { ...DEFAULT_SETTINGS, ...(d.settings ?? {}) },
    streak: { ...base.streak, ...(d.streak ?? {}) },
    unseenAchievements: [],
  }
}

function ImportSheet({ onCancel, onDone }: { onCancel: () => void; onDone: () => void }) {
  const importState = useStore((s) => s.importState)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const run = () => {
    try {
      importState(parseImport(text.trim()))
      sfx('complete')
      haptic('success')
      onDone()
    } catch (e) {
      sfx('wrong')
      haptic('error')
      setError(e instanceof Error ? e.message : 'Import failed.')
    }
  }

  return (
    <div className="set-sheet">
      <h3>Import progress</h3>
      <p>Paste an export from Gauntlet. This replaces everything on this device, including your streak.</p>
      <textarea
        className={`set-textarea ${error ? 'is-error' : ''}`}
        rows={6}
        value={text}
        placeholder={'{\n  "version": 1,\n  "profile": { … }\n}'}
        onChange={(e) => {
          setText(e.target.value)
          setError(null)
        }}
        aria-label="Progress JSON to import"
        spellCheck={false}
      />
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json,text/plain"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0]
          if (!f) return
          try {
            setText(await f.text())
            setFileName(f.name)
            setError(null)
          } catch {
            setError('Could not read that file.')
          }
          e.target.value = ''
        }}
      />
      <button type="button" className="set-file" onClick={() => fileRef.current?.click()}>
        <FileUp size={18} strokeWidth={2.4} />
        <span>{fileName ? fileName : 'Or choose a .json file'}</span>
      </button>
      <AnimatePresence>
        {error && (
          <motion.div className="set-error" role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <TriangleAlert size={18} strokeWidth={2.4} />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="set-sheet__actions">
        <Button block size="lg" disabled={!text.trim()} onClick={run}>
          Import
        </Button>
        <Button block size="lg" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

function ResetSheet({ onCancel }: { onCancel: () => void }) {
  const resetAll = useStore((s) => s.resetAll)
  return (
    <div className="set-sheet set-sheet--center">
      <span className="set-sheet__warn" aria-hidden>
        <Trash2 size={28} strokeWidth={2.4} />
      </span>
      <h3>Reset all progress?</h3>
      <p>This deletes your lessons, review cards, streak, XP, stories and settings on this device. It cannot be undone. Export first if you might want it back.</p>
      <div className="set-sheet__actions">
        <Button
          block
          size="lg"
          variant="bad"
          onClick={() => {
            resetAll()
            useNav.getState().setTab('learn')
          }}
        >
          Reset everything
        </Button>
        <Button block size="lg" variant="secondary" onClick={onCancel}>
          Keep my progress
        </Button>
      </div>
    </div>
  )
}
