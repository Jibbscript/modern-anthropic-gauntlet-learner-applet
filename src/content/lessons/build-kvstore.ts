import type { Lesson } from '../../core/types'

const lesson: Lesson = {
  id: 'build-kvstore',
  title: 'In-memory store, level by level',
  summary: 'Grow a key-field-value store through scans, TTLs and backups without rewriting level 1.',
  minutes: 9,
  skills: ['build.kvstore', 'py.progressive'],
  steps: [
    {
      kind: 'concept',
      id: 'hook',
      eyebrow: 'Build round',
      title: 'Level 1 is the trap',
      body:
        'Candidates describe practical rounds that keep growing one program: build it, make it work, extend it, scale it, test it. A leveled in-memory store is the classic practice problem for that shape: each level adds a spec to the same code.\n\n' +
        'Level 1 takes ten minutes. What decides levels 3 and 4 is whether your level 1 data model can ==absorb new requirements without a rewrite==.',
      callout: {
        tone: 'warn',
        text: 'The spec below is a typical practice version, not a leaked question. Real prompts vary; the habits transfer.',
      },
    },
    {
      kind: 'mcq',
      id: 'data-model',
      eyebrow: 'Level 1',
      prompt:
        'Level 1: `set(key, field, value)`, `get(key, field)`, `delete(key, field)`. Level 2, which you have not seen yet, will ask for all fields of one key, sorted. Which structure do you pick?',
      choices: [
        {
          text: '`dict[str, dict[str, str]]`: key → {field: value}',
          correct: true,
          feedback: 'Every operation names a key first, so it touches one small dict.',
        },
        {
          text: '`dict[tuple[str, str], str]` keyed by `(key, field)`',
          feedback:
            'Level 1 is easy, but listing one key’s fields means scanning every entry in the store. Flat is tempting; it fights level 2.',
        },
        {
          text: 'A list of `(key, field, value)` tuples',
          feedback: 'Every get is a linear search, and updates mean finding and replacing tuples.',
        },
        {
          text: 'A dataclass per record with one attribute per field',
          feedback: 'Field names are arbitrary strings from the caller. Fixed attributes cannot hold them.',
        },
      ],
      explanation:
        'Pick the structure shaped like the queries. Later levels add per-field metadata (an expiry), so the innermost value becomes a small object and nothing else moves.',
    },
    {
      kind: 'concept',
      id: 'level-one',
      title: 'Level 1 in a few lines',
      body:
        '`setdefault` creates a record on first write. The other habit worth having from minute one: when `delete` removes the last field, remove the record too. Then "empty record" never needs special handling in scans or backups.\n\n' +
        'Write a test per method now. You will rerun them every time a level unlocks.',
      code: {
        code: `class Store:
    def __init__(self):
        self.data: dict[str, dict[str, str]] = {}

    def set(self, key, field, value):
        self.data.setdefault(key, {})[field] = value`,
      },
    },
    {
      kind: 'cloze',
      id: 'get-delete',
      eyebrow: 'Your turn',
      prompt: 'Finish `get` and `delete`. `get` returns `None` for anything missing; `delete` returns whether it removed something.',
      code: `def get(self, key, field):
    return self.data.get(key, {}).{{0}}(field)

def delete(self, key, field):
    rec = self.data.get(key)
    if rec is None or field not in rec:
        return False
    del rec[field]
    if not rec:
        {{1}}
    return True`,
      blanks: [
        { options: ['get', 'pop', 'setdefault'], answer: 0 },
        { options: ['del self.data[key]', 'rec.clear()', 'return False'], answer: 0 },
      ],
      explanation:
        '`.pop` would delete the field on read, and `.setdefault` would insert a `None` field just by looking. After removing the last field, drop the whole record so no empty dicts linger; `rec.clear()` leaves one behind, and `return False` lies about the delete.',
      hint: 'Reads should never change the store.',
    },
    {
      kind: 'concept',
      id: 'formatting',
      title: 'Level 2: the formatting tax',
      body:
        'Scans return one string like `age(31), name(Ada)`: fields sorted, `field(value)` pairs joined by `", "`, and `""` for a missing key. Points here are lost on formatting, not algorithms: sorting by value, a trailing comma, forgetting that string sort is case-sensitive. Build the string in one helper and have both scans call it.',
      code: {
        code: `def _fmt(self, rec, prefix=""):
    items = sorted((f, v) for f, v in rec.items()
                   if f.startswith(prefix))
    return ", ".join(f"{f}({v})" for f, v in items)

def scan(self, key):
    return self._fmt(self.data.get(key, {}))

def scan_by_prefix(self, key, prefix):
    return self._fmt(self.data.get(key, {}), prefix)`,
      },
    },
    {
      kind: 'predict',
      id: 'scan-output',
      eyebrow: 'Predict',
      prompt: 'What does this print? Two lines.',
      code: `rec = {"b2": "x", "a10": "y", "a2": "z", "B": "w"}

def fmt(rec, prefix=""):
    items = sorted((f, v) for f, v in rec.items()
                   if f.startswith(prefix))
    return ", ".join(f"{f}({v})" for f, v in items)

print(fmt(rec, "a"))
print(fmt(rec))`,
      answers: ['a10(y), a2(z)\nB(w), a10(y), a2(z), b2(x)'],
      explanation:
        'Strings sort character by character, so `"a10"` comes before `"a2"` (`"1"` < `"2"`). Uppercase letters sort before lowercase, so `"B"` leads. If a spec wants numeric or case-insensitive order it will say so; otherwise plain `sorted` is what the tests expect.',
      hint: 'Compare `"a10"` and `"a2"` one character at a time. Where does `"B"` sit relative to `"a"`?',
    },
    {
      kind: 'concept',
      id: 'time',
      title: 'Level 3: time is an argument',
      body:
        'Every call gains a `timestamp`, and sets can take a `ttl`. A field set at `t` is alive for timestamps in ==[t, t + ttl)==: alive at `t`, gone at exactly `t + ttl`.\n\n' +
        'Store `expires` next to the value and put the rule in one helper every read calls. Expire lazily at read time; no cleanup timer. Timestamps come from the caller, never `time.time()`.',
      code: {
        code: `@dataclass
class Entry:
    value: str
    expires: int | None = None

def _alive(self, e: Entry, ts: int) -> bool:
    return e.expires is None or ts < e.expires`,
        caption: 'The level 1 dict now maps fields to `Entry` objects. Nothing else in the structure changes.',
      },
    },
    {
      kind: 'numeric',
      id: 'ttl-boundary',
      eyebrow: 'Boundary check',
      prompt:
        'A call `set_at_with_ttl("u1", "token", "abc", 10, 5)` stores a field at timestamp 10 with ttl 5. What is the first timestamp at which `get_at("u1", "token", ts)` returns `None`?',
      answer: 15,
      explanation:
        'Alive at 10, 11, 12, 13 and 14: five timestamps, which is what a ttl of 5 should mean. At 15 it is gone. If you said 16, you were picturing `<=`, which keeps it alive for six.',
      hint: 'The interval is half-open: [t, t + ttl).',
    },
    {
      kind: 'spotbug',
      id: 'ttl-bug',
      eyebrow: 'Find the bug',
      prompt:
        'A test sets a field at 10 with ttl 5, then expects `get_at(…, 15)` to return `None`. It gets `"abc"` back. Tap the bug.',
      code: `def _alive(self, e, ts):
    return e.expires is None or ts <= e.expires

def set_at_with_ttl(self, key, field, value, ts, ttl):
    rec = self.data.setdefault(key, {})
    rec[field] = Entry(value, ts + ttl)

def get_at(self, key, field, ts):
    e = self.data.get(key, {}).get(field)
    if e is None or not self._alive(e, ts):
        return None
    return e.value

def scan_at(self, key, ts):
    rec = self.data.get(key, {})
    live = {f: e.value for f, e in rec.items()
            if self._alive(e, ts)}
    return self._fmt(live)`,
      bugLines: [2],
      explanation:
        '`expires` is `t + ttl`, the first timestamp at which the field is dead, so the check must be strict. Because every read goes through `_alive`, one character fixes get, scan and backup together. That is the payoff of keeping time logic in one place.',
      fix: { code: '    return e.expires is None or ts < e.expires' },
      hint: 'What does `expires` mean: the last alive timestamp, or the first dead one?',
    },
    {
      kind: 'concept',
      id: 'backup',
      title: 'Level 4: backups carry remaining TTL',
      body:
        '`backup(ts)` snapshots every alive field. `restore(ts, ts_to_restore)` loads the latest backup taken at or before `ts_to_restore`.\n\n' +
        'The catch is TTL. A field with 30 ticks left at backup time should have 30 left after restore, ==counted from the restore timestamp==. So save remaining TTL, not absolute expiry, and copy: later writes must not reach into the snapshot.',
      code: {
        code: `def backup(self, ts):
    snap = {}
    for key, rec in self.data.items():
        live = {f: (e.value, None if e.expires is None
                    else e.expires - ts)
                for f, e in rec.items() if self._alive(e, ts)}
        if live:
            snap[key] = live
    self.backups.append((ts, snap))
    return len(snap)`,
        caption: 'Returns the number of non-empty records saved, a common spec detail.',
      },
    },
    {
      kind: 'mcq',
      id: 'restore-expiry',
      eyebrow: 'Level 4',
      prompt:
        'A field is set at 100 with ttl 50. Then `backup(120)` runs. Much later, `restore(400, 130)` runs. When does the restored field expire?',
      choices: [
        {
          text: 'At 430',
          correct: true,
          feedback: 'Remaining at backup: 150 − 120 = 30. Re-anchored at restore: 400 + 30.',
        },
        {
          text: 'At 150',
          feedback: 'That copies the absolute expiry. At timestamp 400 the field is dead on arrival.',
        },
        {
          text: 'At 450',
          feedback: 'That reapplies the full ttl from restore time, but the field had already used 20 of its 50 ticks.',
        },
        {
          text: 'Never: restored fields lose their TTL',
          feedback: 'Dropping the TTL resurrects data that was meant to expire.',
        },
      ],
      explanation:
        '`restore(400, 130)` picks the backup from 120, the latest one at or before 130. Remaining TTL there was 30, so the field lives until 400 + 30 = 430.',
    },
    {
      kind: 'order',
      id: 'new-level',
      eyebrow: 'Process',
      prompt: 'A new level unlocks with 25 minutes left. Put your moves in order.',
      items: [
        'Read the whole new spec, examples included',
        'List which existing methods change behavior',
        'Turn the spec’s examples into tests',
        'Make the smallest data-model change that fits',
        'Implement, then rerun every earlier level’s tests',
      ],
      explanation:
        'Reading first stops you building the wrong thing, and the examples are free test cases. A minimal model change (wrap the value in an `Entry`) keeps earlier levels passing, and rerunning old tests catches regressions before they cost you a level.',
      hint: 'Tests come from the spec, so the spec comes first. Regression checks come last.',
    },
    {
      kind: 'interview',
      id: 'pushback',
      eyebrow: 'Interview sim',
      setup: 'You passed level 3. The interviewer pauses to talk before level 4.',
      turns: [
        {
          interviewer: 'Suppose many threads share this store. What breaks, and what do you do first?',
          options: [
            {
              text: 'Give each key its own lock so writers to different keys never contend.',
              quality: 'okay',
              feedback:
                'A reasonable second step, but now the dict of locks needs guarding, and scans and backups span keys. Lead with the simple correct version.',
            },
            {
              text: 'Nothing. The GIL makes dict operations thread-safe.',
              quality: 'weak',
              feedback:
                'Single dict operations are atomic in CPython, but `delete` is check-then-act: another thread can run between `field in rec` and `del rec[field]`.',
            },
            {
              text: 'Compound operations like delete’s check-then-remove can interleave. First, one lock around each public method. It is obviously correct; I would measure contention before going finer.',
              quality: 'strong',
              feedback: 'Names the actual race, picks the simplest correct fix, and makes finer locking a measured decision.',
            },
          ],
        },
        {
          interviewer: 'How do you test the TTL logic?',
          options: [
            {
              text: 'Table tests at the boundaries: reads at `t`, `t + ttl - 1` and `t + ttl`, a scan mixing live and expired fields, and an overwrite that resets the TTL.',
              quality: 'strong',
              feedback: 'Off-by-one bugs live at the boundary, and these cases pin it from both sides.',
            },
            {
              text: 'Set a 2-second TTL, `time.sleep(2)`, and check the value is gone.',
              quality: 'weak',
              feedback: 'Slow, flaky, and pointless: the API takes timestamps as arguments, so there is no clock to wait for.',
            },
            {
              text: 'One test that sets a TTL and checks the field is gone much later.',
              quality: 'okay',
              feedback: 'It passes even with the `<=` bug. Test the boundary itself.',
            },
          ],
        },
        {
          interviewer: 'Level 4 is half done and you have 8 minutes left. What now?',
          options: [
            {
              text: 'Rethink the data model; backups would be cleaner with a different structure.',
              quality: 'weak',
              feedback: 'A rewrite with 8 minutes left risks every level you have already passed.',
            },
            {
              text: 'Check levels 1–3 still pass, get the simplest backup working, and tell you exactly what restore is missing and how I would finish it.',
              quality: 'strong',
              feedback: 'Protects what works, ships a coherent subset, and shows the rest of your plan.',
            },
            {
              text: 'Keep coding; finishing level 4 is worth the risk.',
              quality: 'okay',
              feedback: 'Maybe, if you are close. But a half-wired feature can break earlier tests too.',
            },
          ],
        },
      ],
      wrapUp:
        'Each answer leans on the same structure: one place for each rule, tests at the edges, and earlier levels kept green while you extend.',
    },
    {
      kind: 'concept',
      id: 'recap',
      eyebrow: 'Recap',
      title: 'What to remember',
      body:
        '1. **Model the queries**: key → field → `Entry`. Later levels change the `Entry`, not the structure.\n' +
        '2. **One place per rule**: one formatter for scans, one `_alive` for [t, t + ttl), one conversion from expiry to remaining TTL.\n' +
        '3. **Test the edges per level** and rerun everything when a level unlocks.',
      callout: { tone: 'tip', text: 'Now do it against the clock: the **In-memory database** Code Lab on the Practice tab.' },
    },
  ],
  cards: [
    {
      id: 'build-kvstore.levels',
      skill: 'py.progressive',
      kind: 'order',
      prompt: 'Order the levels of the classic in-memory store exercise.',
      items: [
        'Records with fields: set, get, delete',
        'Sorted scans and prefix scans',
        'Timestamps and TTL',
        'Backup and restore with remaining TTL',
      ],
      explanation: 'Each level builds on the last: scans read the records, TTL changes what scans see, and backups must save what TTL left.',
    },
    {
      id: 'build-kvstore.shallow-backup',
      skill: 'build.kvstore',
      kind: 'spotbug',
      prompt: 'Ignore TTL here. After `backup(5)`, a `set` at 6 changes the value that `restore(7, 5)` brings back. Tap the bug.',
      code: `def backup(self, ts):
    snap = dict(self.data)
    self.backups.append((ts, snap))
    return len(snap)

def restore(self, ts, ts_to_restore):
    for t, snap in reversed(self.backups):
        if t <= ts_to_restore:
            self.data = {k: dict(r)
                         for k, r in snap.items()}
            return`,
      bugLines: [2],
      explanation: '`dict(self.data)` copies only the outer dict; each record dict is shared with the live store, so later sets write into the backup.',
      fix: { code: '    snap = {k: dict(r) for k, r in self.data.items()}' },
    },
    {
      id: 'build-kvstore.alive-predict',
      skill: 'build.kvstore',
      kind: 'predict',
      prompt: 'What does this print? Three lines.',
      code: `def alive(expires, ts):
    return expires is None or ts < expires

set_at, ttl = 10, 3
for ts in (10, 12, 13):
    print(ts, alive(set_at + ttl, ts))`,
      answers: ['10 True\n12 True\n13 False'],
      explanation: 'Alive in [10, 13): true at 10 and 12, false at exactly 13.',
    },
    {
      id: 'build-kvstore.ttl-math',
      skill: 'build.kvstore',
      kind: 'cloze',
      prompt: 'Fill in the three TTL rules: the alive check, remaining TTL at backup, and expiry after restore.',
      code: `def _alive(e, ts):
    return e.expires is None or ts {{0}} e.expires

def remaining(e, backup_ts):
    if e.expires is None:
        return None
    return e.expires {{1}} backup_ts

def restored_expiry(rem, restore_ts):
    return None if rem is None else restore_ts {{2}} rem`,
      blanks: [
        { options: ['<', '<=', '>'], answer: 0 },
        { options: ['-', '+', '//'], answer: 0 },
        { options: ['+', '-', '*'], answer: 0 },
      ],
      explanation: 'Alive in [t, t + ttl) means strictly less than expiry. Remaining is expiry minus backup time, re-anchored by adding it to the restore time.',
    },
    {
      id: 'build-kvstore.flat-cost',
      skill: 'build.kvstore',
      kind: 'mcq',
      prompt: 'Level 1 was stored as one flat `dict[(key, field)] → value`. With N fields across all keys, what does `scan(key)` cost?',
      choices: [
        { text: 'O(N): every entry in the store must be checked', correct: true, feedback: 'Nothing groups one key’s fields together.' },
        {
          text: 'O(k log k) for the key’s k fields',
          feedback: 'That is the nested-dict cost: find the key’s dict, sort its k fields.',
        },
        { text: 'O(1) thanks to hashing', feedback: 'Hashing finds one exact `(key, field)`. A scan does not know the fields in advance.' },
        { text: 'O(log N) by binary search', feedback: 'A dict is not ordered for searching. You would need a sorted structure.' },
      ],
      explanation: 'The flat model makes per-key queries scan everything. Nested dicts make them proportional to that key’s size.',
    },
    {
      id: 'build-kvstore.remaining-why',
      skill: 'build.kvstore',
      kind: 'flash',
      front: 'Why should a backup save remaining TTL instead of each field’s absolute expiry?',
      back: 'Restore runs at a later timestamp. An absolute expiry would already be in the past, so fields die on arrival. Remaining TTL, added to the restore timestamp, preserves each field’s lifetime.',
    },
    {
      id: 'build-kvstore.restore-number',
      skill: 'build.kvstore',
      kind: 'numeric',
      prompt: 'A field is set at 5 with ttl 20. Then `backup(15)`. Later, `restore(100, 15)`. At what timestamp does the restored field expire?',
      answer: 110,
      explanation: 'Expiry 25, so 25 − 15 = 10 remaining at backup. Restored at 100, it expires at 110.',
    },
  ],
}

export default lesson
