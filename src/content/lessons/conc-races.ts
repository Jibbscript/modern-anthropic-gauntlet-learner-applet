import type { Lesson } from '../../core/types'

const lesson: Lesson = {
  id: 'conc-races',
  title: 'Race conditions',
  summary: 'Find the interleaving that loses an update, learn the two shapes races take, then close the window with a lock.',
  minutes: 8,
  skills: ['conc.races', 'conc.locks'],
  steps: [
    {
      kind: 'concept',
      id: 'hook',
      eyebrow: 'Production mystery',
      title: '1 + 1 = 1',
      body:
        'Four worker threads count requests per route with the method below. Unit tests pass. In production the dashboard shows 9,412 hits on `/api`; the load balancer logged 9,780.\n\n' +
        'No exception, no warning. Just increments that never landed. Nothing in these two lines looks wrong, which is exactly what makes races expensive.',
      code: {
        code: `def record(self, route: str) -> None:
    n = self.counts.get(route, 0)
    self.counts[route] = n + 1`,
      },
    },
    {
      kind: 'concept',
      id: 'rmw',
      title: 'Read, modify, write',
      body:
        '`record` reads the count, adds 1 privately, and writes it back. `x += 1` is the same shape in bytecode: load, add, store.\n\n' +
        'The GIL lets one thread run bytecode at a time, and CPython may switch threads ==between== bytecodes. Switch after one thread reads and before it writes, and two threads add 1 to the same old value. One increment vanishes.',
      code: {
        lang: 'text',
        code: `LOAD_GLOBAL   x     # read shared value
LOAD_CONST    1
BINARY_OP     +=    # add, privately
STORE_GLOBAL  x     # write it back`,
        caption: '`dis` output for `x += 1` on CPython 3.11 (simplified).',
      },
      callout: {
        tone: 'insight',
        text: 'How often a switch lands inside the window depends on the build. In quick tests on CPython 3.11-3.13, a bare `x += 1` on an int never split, while the `get`-then-store version lost 6-26% of 800,000 updates. A free-threaded 3.14 build lost updates on both. Neither is promised atomic.',
      },
    },
    {
      kind: 'widget',
      id: 'lose-one',
      eyebrow: 'Your turn',
      prompt: 'Two threads each increment `x` once. You are the scheduler: tap a thread to run its next instruction. Finish with `x` below 2.',
      goal: 'Lose an update',
      widget: { id: 'race', config: { threads: 2, increments: 1, goal: 'lose-update' } },
      explanation:
        'Any schedule where both threads LOAD before either STOREs loses one: both read 0, both write 1. Here you pick where the switch lands. In CPython the interpreter picks, at moments you do not control and rarely see in a test.',
    },
    {
      kind: 'mcq',
      id: 'why-gil-fails',
      prompt: 'Standard CPython has a GIL, so only one thread runs Python at a time. How did `record()` still lose updates?',
      choices: [
        {
          text: 'The GIL makes each bytecode atomic, not the sequence. It can change hands between the read and the write.',
          correct: true,
          feedback: 'Exactly. One thread at a time, but which thread can change mid-method.',
        },
        {
          text: 'The GIL is held only during I/O, so CPU work like this runs unprotected.',
          feedback: 'Backwards. Blocking I/O *releases* the GIL; Python code holds it. The protection is real, just per bytecode.',
        },
        {
          text: 'Dicts are not thread-safe, so `get` returned a corrupted value.',
          feedback: 'Each dict operation is atomic in CPython, so nothing was corrupted. The value read was correct and then went *stale* before the write.',
        },
        {
          text: 'On a multi-core machine the two threads run on two cores at once, despite the GIL.',
          feedback: 'On a GIL build they interleave rather than run in parallel. Even a single core loses updates: interleaving is enough.',
        },
      ],
      explanation:
        'A race needs only interleaving, not parallelism. Any time two threads can both be between a read and the write that depends on it, an update can be lost.',
      hint: 'What exactly does the GIL guarantee is uninterrupted?',
    },
    {
      kind: 'concept',
      id: 'lock-fix',
      title: 'A lock makes the window exclusive',
      body:
        'A lock does not make the steps faster or fewer. It makes them ==exclusive==: a thread reaching `with self._lock` while another holds it waits until the holder leaves the block. `with` releases the lock even if the body raises.\n\n' +
        'Every path that touches `counts` must take the same lock. One unguarded writer reopens the window.',
      code: {
        code: `import threading

class Stats:
    def __init__(self) -> None:
        self.counts: dict[str, int] = {}
        self._lock = threading.Lock()

    def record(self, route: str) -> None:
        with self._lock:
            n = self.counts.get(route, 0)
            self.counts[route] = n + 1`,
        highlight: [9],
      },
    },
    {
      kind: 'widget',
      id: 'locked',
      eyebrow: 'Try to break it',
      prompt: 'Same race, but each increment is now wrapped in ACQUIRE and RELEASE. Interleave however you like and run both threads to the end.',
      goal: 'Every increment counted',
      widget: { id: 'race', config: { threads: 2, increments: 2, mode: 'lock', goal: 'correct' } },
      explanation:
        'A thread that reaches ACQUIRE while the other holds the lock is blocked, so no LOAD can sneak between another thread\'s LOAD and STORE. You still choose the order of whole increments. You just cannot split one.',
    },
    {
      kind: 'concept',
      id: 'check-then-act',
      title: 'The other shape: check-then-act',
      body:
        'You test a condition, then act on it, assuming it still holds.\n\n' +
        'Each dict operation below is atomic in CPython; the pair is not. Two threads both see the key missing and both call `load`. If `load` takes 30 s and 8 GB of memory, that is an outage. If it charges a card, it is an incident report.',
      code: {
        code: `if key not in cache:          # check
    cache[key] = load(key)    # act, on a check that may be stale`,
      },
    },
    {
      kind: 'spotbug',
      id: 'thumbnail-cache',
      eyebrow: 'Find the race',
      prompt: 'Ten requests for the same new image arrive together, and the server renders it ten times. There is a lock right there. Tap the line that lets the duplicates through.',
      code: `import threading

_cache: dict[str, bytes] = {}
_lock = threading.Lock()

def get_thumbnail(path: str) -> bytes:
    if path not in _cache:
        data = render_thumbnail(path)   # ~2 s of work
        with _lock:
            _cache[path] = data
    return _cache[path]`,
      bugLines: [7],
      explanation:
        'The lock guards the write, which was already atomic. The check runs unguarded, so all ten threads see a miss before the first render finishes. Check and act must happen under the same lock.',
      fix: {
        code: `_cache: dict[str, bytes] = {}
_key_locks: dict[str, threading.Lock] = {}
_registry = threading.Lock()

def get_thumbnail(path: str) -> bytes:
    with _registry:
        key_lock = _key_locks.setdefault(path, threading.Lock())
    with key_lock:                 # only callers for THIS path wait
        if path not in _cache:
            _cache[path] = render_thumbnail(path)
        return _cache[path]`,
        caption: 'One lock per key: same-path callers wait for one render, different images still render in parallel. A single global lock around the render would also be correct, but it would serialize every render.',
      },
      hint: 'The lock protects one line. Which line actually decides whether to render?',
    },
    {
      kind: 'mcq',
      id: 'green-tests',
      prompt: 'Your test calls `record()` from 2 threads, 1,000 calls each, 50 runs in a row. All green. Why is that weak evidence of thread safety?',
      choices: [
        {
          text: 'Losing an update needs a switch inside a window a few bytecodes wide. Short runs often finish one thread before the next starts, and timing varies by machine and Python version.',
          correct: true,
          feedback: 'Right. Passing runs sample a few interleavings. They do not rule out the bad ones.',
        },
        {
          text: 'It is strong evidence: 50 runs of 2,000 calls is 100,000 chances to fail.',
          feedback: 'The chances are not independent. The scheduler tends to repeat similar interleavings, and 1,000 fast calls can finish within one 5 ms switch interval.',
        },
        {
          text: 'pytest runs threads one at a time, so the test was never concurrent.',
          feedback: 'pytest does nothing of the sort; threads run as usual. The concurrency was real, but the bad timing never happened.',
        },
        {
          text: 'The GIL protects code in tests but not in production servers.',
          feedback: 'Same interpreter, same GIL in both places. What differs is load, timing, and sometimes the Python build.',
        },
      ],
      explanation:
        'In a quick test, this exact counter passed 50 of 50 short runs on CPython 3.11-3.13, then lost 6-26% of its updates at 4 threads x 200,000 calls. Reason about the window; let stress tests back you up.',
      hint: 'How long do 1,000 dictionary updates take, compared to a thread switch interval of 5 ms?',
    },
    {
      kind: 'concept',
      id: 'atomic-list',
      title: 'What the GIL does make atomic',
      body:
        "CPython's FAQ lists single operations on built-ins that are atomic: `L.append(x)`, `x = L.pop()`, `D[x] = y`, `D1.update(D2)`. And some that are not: `i = i + 1`, `L[i] = L[j]`, `D[x] = D[x] + 1`.\n\n" +
        'Rule of thumb: ==one operation on a built-in is safe; a read then a dependent write is not==, even on one line. That is a CPython detail, not a language promise.',
      callout: {
        tone: 'source',
        text: 'Python FAQ: [What kinds of global value mutation are thread-safe?](https://docs.python.org/3/faq/library.html#what-kinds-of-global-value-mutation-are-thread-safe) Its closing advice: "When in doubt, use a mutex!"',
      },
    },
    {
      kind: 'sort',
      id: 'atomic-or-not',
      prompt: 'Several threads share these objects on standard CPython. Sort each line.',
      buckets: [
        { id: 'atomic', label: 'One atomic operation' },
        { id: 'race', label: 'Racy: read, then act' },
      ],
      items: [
        { text: '`results.append(item)`', bucket: 'atomic', why: 'One C call on a list. The FAQ lists it as atomic.' },
        { text: '`cache[key] = value`', bucket: 'atomic', why: 'A single store. Safe, as long as the value did not come from reading shared state.' },
        { text: '`job = jobs.pop()` inside `try / except IndexError`', bucket: 'atomic', why: 'One call: it either returns an item or raises. The race-free way to drain a shared list.' },
        { text: '`counts[word] += 1`', bucket: 'race', why: 'Read, add, write. The FAQ lists `D[x] = D[x] + 1` as not atomic.' },
        { text: '`if jobs: job = jobs.pop()`', bucket: 'race', why: 'Another thread can take the last job between the check and the pop, and you get `IndexError`.' },
        { text: '`if url not in seen: seen.add(url)`', bucket: 'race', why: 'Each call is atomic; the decision between them is not.' },
        { text: '`total = total + n`', bucket: 'race', why: 'The classic read-modify-write.' },
      ],
      explanation:
        'Ask one question: does this line act on a value it read from shared state? If so, someone else can change that value in between, however short the line looks.',
    },
    {
      kind: 'cloze',
      id: 'withdraw',
      eyebrow: 'Fix it',
      prompt: 'Under load, two threads can both pass the balance check and the account goes negative. Make `withdraw` race-free.',
      code: `import threading

class Account:
    def __init__(self, balance: int) -> None:
        self.balance = balance
        self._lock = {{0}}

    def withdraw(self, amount: int) -> bool:
        {{1}}:
            if self.balance >= amount:
                self.balance -= amount
                return True
        return False`,
      blanks: [
        { options: ['threading.Lock()', 'threading.Lock', 'threading.local()'], answer: 0 },
        { options: ['with self._lock', 'with threading.Lock()', 'if self._lock.acquire()'], answer: 0 },
      ],
      explanation:
        'Create one lock per account, once. `threading.Lock` without parentheses is the factory, so `with` on it raises `TypeError`; `threading.local()` is per-thread storage, the opposite of sharing. `with threading.Lock()` makes a fresh lock on every call, so no two threads ever contend. `if self._lock.acquire()` never releases, so the second withdrawal hangs forever.',
      hint: 'Every thread has to wait on the *same* lock, and the lock has to come back.',
    },
    {
      kind: 'compare',
      id: 'crawler-set',
      eyebrow: 'Interview moment',
      question: 'Interviewer, about your concurrent crawler: *Your workers share `visited`, a plain set. Set operations are atomic under the GIL, so you do not need a lock, right?*',
      a: 'Right. `set.add` is a single C call, so it cannot be interrupted. My `if url not in visited: visited.add(url)` followed by `frontier.put(url)` is safe as written, and skipping the lock keeps the workers fast.',
      b: 'Each call is atomic in CPython, but my code makes two: the `in` check, then `add`. Two workers can both pass the check and both enqueue the page. I will do check-and-add under one lock when a link is enqueued, and I would rather not rest correctness on an implementation detail.',
      better: 'b',
      explanation:
        'Candidates report this probe on the concurrent crawler question: a thread-safe set can still race in a separate check-then-add. **A** is right about each call and wrong about the sequence. **B** names the interleaving, gives the fix, and says where it goes.',
    },
    {
      kind: 'concept',
      id: 'recap',
      title: 'What to remember',
      body:
        '1. A race is two threads both inside a read-then-write window. Two shapes: ==read-modify-write== (`+=`, get-then-store) and ==check-then-act== (`if missing: insert`).\n' +
        '2. The GIL makes single operations atomic, not your sequence of them. Free-threaded builds make that gap wider.\n' +
        '3. Fix: one lock that covers the whole check-and-act, taken by every path that touches the data. A green test is a sample, not a proof.',
    },
  ],
  cards: [
    {
      id: 'conc-races.rmw',
      skill: 'conc.races',
      kind: 'flash',
      front: 'Why can `n = d.get(k, 0)` followed by `d[k] = n + 1` lose updates across threads on standard CPython, GIL and all?',
      back: 'The GIL makes each operation atomic, not the pair. It can switch threads between the read and the write; another thread updates `d[k]`, and the stale `n + 1` overwrites it.',
    },
    {
      id: 'conc-races.interleave',
      skill: 'conc.races',
      kind: 'predict',
      prompt: 'This replays one interleaving of two threads, each doing `x += 1`, by hand. What does it print?',
      code: `x = 0
a = x        # thread A: LOAD
b = x        # thread B: LOAD
x = a + 1    # thread A: ADD, STORE
x = b + 1    # thread B: ADD, STORE
print(x)`,
      answers: ['1'],
      explanation: 'Both threads loaded 0 before either stored, so both wrote 1. B\'s store overwrote A\'s increment: a lost update.',
    },
    {
      id: 'conc-races.min-value',
      skill: 'conc.races',
      kind: 'numeric',
      prompt: 'Three threads each run `x += 1` once on a shared `x = 0`, with no lock. Assuming a switch can land between any two bytecodes, what is the smallest possible final value?',
      answer: 1,
      tolerance: 0,
      explanation: 'All three LOAD 0 before any of them STOREs; each then stores 1. Two of the three increments are lost.',
    },
    {
      id: 'conc-races.fresh-lock',
      skill: 'conc.locks',
      kind: 'spotbug',
      prompt: 'This counter must be safe on any CPython build, including free-threaded. Tap the line that makes its lock useless.',
      code: `import threading

class Counter:
    def __init__(self) -> None:
        self.value = 0

    def increment(self) -> None:
        with threading.Lock():
            self.value += 1`,
      bugLines: [8],
      explanation: 'A new lock is created on every call, so each thread acquires its own and nobody ever waits. Create the lock once in `__init__` and use `with self._lock:`.',
    },
    {
      id: 'conc-races.faq-atomic',
      skill: 'conc.races',
      kind: 'mcq',
      prompt: 'Which of these is a single atomic operation on standard CPython, per the Python FAQ?',
      choices: [
        { text: '`L.append(x)`', correct: true, feedback: 'One C call on a built-in list.' },
        { text: '`D[x] = D[x] + 1`', feedback: 'A read, an add, then a write: another thread can update `D[x]` in between.' },
        { text: '`if L: L.pop()`', feedback: 'Check-then-act: the list can empty between the check and the pop.' },
        { text: '`i = i + 1`', feedback: 'Load, add, store. The FAQ lists it as not atomic.' },
      ],
      explanation: 'A single operation on a built-in is atomic in CPython. Anything that reads shared state and then acts on what it read is not.',
    },
    {
      id: 'conc-races.evidence',
      skill: 'conc.races',
      kind: 'compare',
      question: 'Interviewer: *How do you know your shared counter is thread-safe?*',
      a: 'I ran the threaded test 100 times and it passed every time.',
      b: 'Every read-then-write on the shared dict happens under one lock, and nothing touches it outside that lock. A stress test with many threads and a tiny switch interval backs that up, but the reasoning is the proof.',
      better: 'b',
      explanation: 'Races depend on timing, so green runs only sample interleavings. **B** argues from the invariant (no unguarded window) and treats testing as support.',
    },
    {
      id: 'conc-races.repro',
      skill: 'conc.races',
      kind: 'flash',
      front: 'Name three ways to make a suspected race show up in a test.',
      back: 'More threads and iterations; a `threading.Barrier` so threads start together; `sys.setswitchinterval(1e-6)`; a `time.sleep(0)` inside the suspect window. Or run on a free-threaded build.',
    },
  ],
}

export default lesson
