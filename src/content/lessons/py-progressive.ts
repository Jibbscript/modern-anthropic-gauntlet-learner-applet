import type { Lesson } from '../../core/types'

const lesson: Lesson = {
  id: 'py-progressive',
  title: 'Build in levels',
  summary: 'Design level 1 so levels 2-4 extend it instead of forcing a rewrite, then manage the clock and narrate as you go.',
  minutes: 9,
  skills: ['py.progressive', 'build.kvstore'],
  steps: [
    {
      kind: 'concept',
      id: 'hook',
      eyebrow: 'Warm-up',
      title: 'The spec grows under you',
      body: "Candidates (2025-2026) commonly describe the online assessment as one CodeSignal problem in four levels, usually revealed one at a time, within 90 minutes. The most reported: an in-memory database.\n\n1. `set`, `get`, `delete`\n2. scans, e.g. by prefix\n3. timestamps and TTL expiry\n4. varies: backup/restore or past-time reads\n\nYour level-1 choices decide whether level 3 is a ten-minute change or a rewrite against the clock.",
      callout: {
        tone: 'source',
        text: 'Candidate reports, not official: [Hello Interview\'s Anthropic guide](https://www.hellointerview.com/guides/anthropic/swe) (2026). Level specs are prep-site reconstructions, some 2026 reports describe six levels, and formats change. Live coding rounds reportedly follow the same arc: build, extend, make it concurrent or scalable, test.',
      },
    },
    {
      kind: 'mcq',
      id: 'model',
      eyebrow: 'Design',
      prompt:
        "Level 1 only needs `set`/`get`/`delete` on string values, and you can't see level 3 yet. Which model makes adding per-key expiry the smallest change?",
      choices: [
        {
          text: '`dict[str, str]`: each key maps straight to its value',
          feedback:
            "The simplest thing for level 1, which is why it's tempting. When TTL arrives, every method that reads a value changes, and expiry needs a home.",
        },
        {
          text: '`dict[str, Entry]`, where `Entry` is a small dataclass holding the value',
          correct: true,
          feedback: 'Expiry becomes one new field and one check. The record is also where any later per-key metadata goes.',
        },
        {
          text: 'Two dicts: `values[key]` now, and `expiry[key]` added later',
          feedback:
            'It works, but now every `delete`, scan and backup has to keep two structures in sync. Desync bugs love a time limit.',
        },
        {
          text: '`list[tuple[str, str]]` of key-value pairs, in insertion order',
          feedback: 'Every lookup is a linear scan, deletes are awkward, and prefix scans still need sorting. It fights you at every level.',
        },
      ],
      explanation:
        "Put a record behind each key from the start. It costs two lines at level 1 and turns \"add TTL\" into \"add a field\". That's the whole trick: cheap flexibility in the data model, not speculative architecture.",
    },
    {
      kind: 'concept',
      id: 'one-door',
      title: 'One clock, one door',
      body: 'Two habits keep later levels cheap. **One source of time**: take `now` as a parameter (or one `_now()` method), never scattered `time.time()` calls, so expiry is testable without sleeping. **One door for reads**: every public read goes through `_live`, so "is this key alive?" lives in exactly one function. When a level changes the rule, you edit one place.',
      code: {
        code: `@dataclass
class Entry:
    value: str
    expires_at: int | None = None

    def alive(self, now: int) -> bool:
        exp = self.expires_at
        return exp is None or now < exp

class KV:
    def __init__(self):
        self._data: dict[str, Entry] = {}

    def _live(self, key, now):
        e = self._data.get(key)
        if e is None or not e.alive(now):
            return None
        return e`,
      },
    },
    {
      kind: 'predict',
      id: 'boundary',
      eyebrow: 'Predict',
      prompt: 'Using the `alive` rule above, a key set at t=5 with ttl=10 gets `expires_at = 15`. What does this print?',
      code: `e = Entry("v", expires_at=5 + 10)
times = (5, 14, 15, 16)
print([t for t in times if e.alive(t)])`,
      answers: ['[5, 14]'],
      explanation:
        '`now < expires_at` makes the lifetime half-open: alive for [5, 15), gone at exactly 15. That is the commonly reported rule, but check the examples and test the exact edge: it is where TTL off-by-ones live.',
      hint: 'Is the comparison `<` or `<=`?',
    },
    {
      kind: 'cloze',
      id: 'scan',
      eyebrow: 'Fill in',
      prompt:
        'Level 2: `scan_by_prefix(prefix, now)` returns `"key(value)"` strings for live keys that start with `prefix`, sorted by key. (Reported versions nest fields under each key; one level keeps the idea visible.)',
      code: `def scan_by_prefix(self, prefix, now):
    items = {{0}}(self._data.items())
    return [
        f"{k}({e.value})"
        for k, e in items
        if k.{{1}}(prefix)
        and e.{{2}}(now)
    ]`,
      blanks: [
        { options: ['list', 'sorted', 'reversed', 'set'], answer: 1 },
        { options: ['find', 'endswith', 'startswith', '__contains__'], answer: 2 },
        { options: ['alive', 'expires_at', 'get'], answer: 0 },
      ],
      explanation:
        "`sorted` orders by key (keys are unique, so two `Entry`s are never compared). `startswith` is the prefix test; `find` returns 0 for a prefix match, which is falsy, so it would drop exactly the keys you want. Expiry goes through `alive`, the one place that knows the rule. Mind string order: `user:10` sorts before `user:2`.",
      hint: 'Dict iteration order is insertion order, not key order.',
    },
    {
      kind: 'concept',
      id: 'green-first',
      title: 'Green first, then the next level',
      body: "Finished levels beat beautiful code. Get each level passing with the simplest code that fits your model. Rerun every earlier test, because level 3 changes love to break level 1. Add one edge case of your own. Then spend two minutes on cleanup the next level will touch. Perfect naming can wait; an unfinished level can't.",
      code: {
        code: `def test_level1():
    db = KV()
    db.set("a", "1", now=0)
    assert db.get("a", now=0) == "1"
    assert db.delete("a", now=0) is True
    assert db.get("a", now=0) is None
    # edge case: delete a missing key
    assert db.delete("a", now=0) is False

def test_level3_ttl_boundary():
    db = KV()
    db.set("k", "v", now=5, ttl=10)
    assert db.get("k", now=14) == "v"
    assert db.get("k", now=15) is None`,
      },
      callout: {
        tone: 'source',
        text: 'A [public practice repo](https://github.com/PaulLockett/CodeSignal_Practice_Industry_Coding_Framework) budgets 10-15 min for level 1, 20-30 for level 2 and 30-60 each for levels 3 and 4: more than 90 minutes in total, on purpose. Prep guides name time management as the main failure mode.',
      },
    },
    {
      kind: 'order',
      id: 'workflow',
      eyebrow: 'Order',
      prompt: 'Put one level of a progressive build in a good order.',
      items: [
        "Read the level's spec, examples and tests; note the exact return formats",
        'Decide what changes in the data model, if anything',
        'Write the simplest code that passes this level',
        'Run every test so far, plus one edge case of your own',
        'Two-minute cleanup, then start the next level',
      ],
      explanation:
        'Reading carefully is the cheapest step: a misread return format fails every test at once. Model before code, because the model is what has to survive the next level. Rerun old tests because new levels break old behaviour. Cleanup comes last and stays short.',
    },
    {
      kind: 'sort',
      id: 'now-or-later',
      eyebrow: 'Sort',
      prompt: "You're on level 1 with the clock running. Do it now, or defer it until a level asks?",
      buckets: [
        { id: 'now', label: 'Do now' },
        { id: 'later', label: 'Defer' },
      ],
      items: [
        { text: 'Store a small record per key, not a bare value', bucket: 'now', why: 'Two lines now; TTL and metadata become fields later.' },
        { text: 'Route every read through one helper', bucket: 'now', why: 'The next rule change edits one function.' },
        { text: "Match the spec's method names and return formats exactly", bucket: 'now', why: 'Tests check exact output; a near-miss scores like a miss.' },
        { text: 'Read time from one place (a `now` parameter or one helper)', bucket: 'now', why: 'Deterministic tests, and time-based levels slot straight in.' },
        { text: 'Put a lock around every method', bucket: 'later', why: 'Wait until concurrency is asked. A small public API makes it a quick add.' },
        { text: 'Build a trie for prefix scans', bucket: 'later', why: 'A sorted scan passes. Optimise when a level or the interviewer demands it.' },
        { text: 'Persist the store to disk', bucket: 'later', why: 'Nobody asked. Every unrequested feature is time off the clock.' },
        { text: 'Polish docstrings and names on every helper', bucket: 'later', why: 'Worth doing if time remains after the last level you can finish.' },
      ],
      explanation:
        'Do what keeps the next level cheap and the current one correct. Defer what no level has asked for: it costs the time you need to finish levels.',
    },
    {
      kind: 'concept',
      id: 'narrate',
      title: 'Narrate decisions, not keystrokes',
      body: "In a live round the interviewer sees your typing, not your plan. Say the plan before you type. Name a decision when you make it, and the option you rejected. Say out loud what you're deferring. When debugging, say what you're checking and why, then go quiet and check. Silence is fine; mystery isn't.",
      callout: { tone: 'tip', text: 'A usable template: "I\'m going to X, because Y. Not doing Z yet."' },
    },
    {
      kind: 'compare',
      id: 'narration',
      eyebrow: 'Which is stronger?',
      question: 'Live round, halfway through level 1. The interviewer says: "Talk me through what you\'re doing."',
      a: '"So I\'m making a dict here… now a for loop… now checking if the key is in it… returning None… okay, now the delete method…"',
      b: '"Plan: one `Entry` per key, so expiry can be a field later instead of a second dict. I\'ll get set/get/delete passing, then test deleting a missing key. Not handling concurrency yet; flagging it."',
      better: 'b',
      explanation:
        "A narrates keystrokes the interviewer can already see. B gives what they can't see: the plan, a decision with its rejected alternative, and what is deliberately deferred. It's also shorter.",
    },
    {
      kind: 'spotbug',
      id: 'backup-alias',
      eyebrow: 'Find the bug',
      prompt:
        'Level 4. You back up at t=5, set a new key at t=6, then restore the t=5 backup, and the new key is still there. Tap the line that causes it.',
      code: `class KV:
    def __init__(self):
        self._data = {}  # key -> Entry
        self._backups = {}  # ts -> state

    def set(self, key, value, now, ttl=None):
        e = Entry(value)
        if ttl is not None:
            e.expires_at = now + ttl
        self._data[key] = e

    def backup(self, now):
        self._backups[now] = self._data

    def restore(self, now, backup_ts):
        snap = self._backups[backup_ts]
        self._data = dict(snap)`,
      bugLines: [13],
      explanation:
        '`self._backups[now] = self._data` stores a reference to the live dict, not a snapshot, so every later `set` writes into the "backup" too. Copy at backup time. A shallow copy is enough here because `set` stores a new `Entry` instead of mutating a stored one. Line 17 already copies, so restoring the same backup twice is safe.',
      fix: { code: `self._backups[now] = dict(self._data)` },
      hint: 'After line 13 runs, how many dicts exist?',
    },
    {
      kind: 'interview',
      id: 'level-four',
      eyebrow: 'Interview',
      setup: 'Live round, in-memory store. Levels 1-3 pass, including TTL. The interviewer extends the problem.',
      turns: [
        {
          interviewer: 'Next: `backup(now)` saves the current state, and `restore(now, backup_ts)` brings it back. Go ahead.',
          options: [
            {
              text: "I'll copy `_data` into a dict keyed by timestamp on backup, and swap it back in on restore.",
              quality: 'okay',
              feedback: 'Fast and mostly right, but it silently picks an answer to the one question that changes the design: what happens to TTLs across a restore?',
            },
            {
              text: 'One question first: after a restore, does a key keep its *remaining* TTL from backup time, or its original expiry timestamp? That decides what the snapshot stores.',
              quality: 'strong',
              feedback: 'The ambiguity that changes the data model, asked before typing. Thirty seconds now saves a rewrite later.',
            },
            {
              text: "This needs history, so I'll restructure the store as an append-only event log and replay it.",
              quality: 'weak',
              feedback: 'A rewrite of passing levels, under a clock, for a requirement two methods can meet. Extend; don\'t rebuild.',
            },
          ],
        },
        {
          interviewer: 'Remaining TTL. How will you test it?',
          options: [
            {
              text: "The logic is simple enough that I'm confident it works.",
              quality: 'weak',
              feedback: 'Confidence is not evidence. Testing your own implementation is a reported part of these rounds, not an optional extra.',
            },
            {
              text: "Run the provided tests, and move on if they pass.",
              quality: 'okay',
              feedback: 'Necessary, not sufficient. The provided tests may not hit the boundary you just designed.',
            },
            {
              text: 'Set `k` with ttl=10 at t=0, back up at t=4, restore at t=100: `get` returns it at 105 and `None` at 106. Then a key that expired before the backup, and an unknown `backup_ts`.',
              quality: 'strong',
              feedback: "Concrete numbers, the exact boundary (6 remaining ticks, so alive until 106, half-open), and two edge cases. That's what testing it yourself looks like.",
            },
          ],
        },
        {
          interviewer: 'Now several threads call these methods at once. What changes?',
          options: [
            {
              text: 'One `threading.Lock` held for the body of every public method, reads included; private helpers assume it is held. All access already goes through a few methods, so it is a small change. Then a test with threads hammering `set`/`backup` while checking invariants.',
              quality: 'strong',
              feedback: 'Simple, correct, and it cashes in the small-API design. Keeping helpers lock-free avoids a public method deadlocking when it calls another. Go finer-grained only if contention actually shows up.',
            },
            {
              text: 'Nothing. The GIL makes dict operations atomic.',
              quality: 'weak',
              feedback:
                'The GIL makes many single dict operations atomic in CPython, but a method is several operations. A snapshot that loops over `_data` in Python can raise "dictionary changed size during iteration" if another thread inserts mid-loop. And free-threaded builds (optional since 3.13) have no GIL at all.',
            },
            {
              text: "Lock `set`, `delete` and `restore`. Reads don't change anything, so they can skip the lock.",
              quality: 'okay',
              feedback:
                'Close, but `backup` and scans iterate while writers mutate, and `restore` swaps `_data` underneath readers. One lock everywhere is easier to get right; tune later.',
            },
          ],
        },
      ],
      wrapUp:
        'Clarify the semantics that change your model, test the boundary with real numbers, and let a small public API make the concurrency follow-up cheap. That is the build, extend, scale, test arc candidates describe, in three answers.',
    },
    {
      kind: 'concept',
      id: 'recap',
      eyebrow: 'Recap',
      title: 'What to carry in',
      body: '- **Model first**: a record per key, small methods, one helper per rule.\n- **One source of time**, passed in, so expiry is testable without sleeping.\n- **Finish levels before polishing**; rerun every earlier test as you go, and narrate decisions, not keystrokes.\n\nThen do it for real: the **In-memory database** lab under Code Labs in the Practice tab runs this format level by level, with tests.',
    },
  ],
  cards: [
    {
      id: 'py-progressive.model',
      skill: 'build.kvstore',
      kind: 'mcq',
      prompt: "Level 1 of a leveled problem; later levels are hidden. What's the cheapest hedge against them?",
      choices: [
        {
          text: 'A small record per key, even though level 1 only needs the value',
          correct: true,
          feedback: 'Two lines now, and an unknown requirement like expiry becomes a new field plus one check.',
        },
        {
          text: 'An abstract storage interface, so the backend can be swapped later',
          feedback: 'It hedges against a change these problems rarely ask for, and costs time you need to finish levels.',
        },
        {
          text: 'Guess the likely later levels and build them now',
          feedback: 'Guesses are often wrong in the details (return formats, boundaries), and unasked work earns nothing until a level asks.',
        },
        {
          text: 'The bare minimum now: rewriting at each level is fine',
          feedback: 'A rewrite under the clock is how levels go unfinished. Cheap flexibility in the data model costs almost nothing.',
        },
      ],
      explanation: 'Cheap flexibility in the data model beats speculative architecture and guesswork.',
    },
    {
      id: 'py-progressive.time-param',
      skill: 'py.progressive',
      kind: 'flash',
      front: 'Why pass `now` into your store\'s methods instead of calling `time.time()` inside them?',
      back: 'Tests become deterministic (no sleeping to test expiry), time logic lives in one place, and specs that pass timestamps slot straight in.',
    },
    {
      id: 'py-progressive.ttl-boundary',
      skill: 'build.kvstore',
      kind: 'predict',
      prompt: 'What does this print?',
      code: `def alive(now, set_at, ttl):
    return now < set_at + ttl

print(alive(104, 100, 5))
print(alive(105, 100, 5))`,
      answers: ['True\nFalse'],
      explanation: '`now < set_at + ttl` is half-open: alive for [100, 105), gone at exactly 105. That is the commonly reported rule, but test the boundary against the examples anyway.',
    },
    {
      id: 'py-progressive.next-level',
      skill: 'py.progressive',
      kind: 'order',
      prompt: 'Level 3 just went green with 20 minutes left. Put your next moves in order.',
      items: [
        'Rerun the level 1 and 2 tests',
        "Read level 4's spec and examples",
        'Sketch what level 4 changes in the model',
        'Write the simplest code that passes level 4',
        'Clean up names if time remains',
      ],
      explanation:
        'Lock in what passes, read before you design, design before you type, and polish only with time to spare.',
    },
    {
      id: 'py-progressive.history-alias',
      skill: 'py.progressive',
      kind: 'spotbug',
      prompt: '`write("a")`, `write("b")`, `undo()`: `lines` is still `["a", "b"]`. A renderer holds a reference to `lines`, so every method updates it in place. Tap the bug.',
      code: `class Editor:
    def __init__(self):
        self.lines = []
        self.history = []

    def write(self, line):
        self.history.append(self.lines)
        self.lines.append(line)

    def undo(self):
        self.lines[:] = self.history.pop()`,
      bugLines: [7],
      explanation:
        '`history` stores references to the one list that `write` keeps mutating, so every saved "snapshot" is the current state. Copy when you save.',
      fix: { code: `self.history.append(list(self.lines))` },
    },
    {
      id: 'py-progressive.defer',
      skill: 'py.progressive',
      kind: 'sort',
      prompt: 'Mid-assessment, nothing has asked for concurrency or performance yet. Now, or later?',
      buckets: [
        { id: 'now', label: 'Now' },
        { id: 'later', label: 'Later' },
      ],
      items: [
        { text: 'A helper that decides whether a key is live', bucket: 'now' },
        { text: "Rerunning earlier levels' tests", bucket: 'now' },
        { text: 'One quick edge-case test for this level', bucket: 'now' },
        { text: 'Per-key locks for higher throughput', bucket: 'later' },
        { text: 'An eviction policy nobody asked for', bucket: 'later' },
        { text: 'Rewriting a passing level in a cleaner style', bucket: 'later' },
      ],
      explanation: 'Do what keeps the next level cheap and passing levels green. Defer what no level has asked for.',
    },
    {
      id: 'py-progressive.narrate',
      skill: 'py.progressive',
      kind: 'flash',
      front: 'In a live coding round, what should your narration cover, and what should it skip?',
      back: "Cover the plan, each real decision and what you rejected, what you're deferring, and what you're checking when debugging. Skip keystrokes the interviewer can already see.",
    },
  ],
}

export default lesson
