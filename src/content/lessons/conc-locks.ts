import type { Lesson } from '../../core/types'

const lesson: Lesson = {
  id: 'conc-locks',
  title: 'Locks and deadlock',
  summary: 'Make two threads deadlock, learn the four conditions, then break the cycle with lock ordering, timeouts and short critical sections.',
  minutes: 8,
  skills: ['conc.locks'],
  steps: [
    {
      kind: 'concept',
      id: 'hook',
      eyebrow: 'Production mystery',
      title: 'Zero CPU, zero progress',
      body:
        'Alice pays Bob and Bob pays Alice, at the same moment. Each `transfer` locks the sender, then the receiver. The service stops answering. CPU sits at 0%. No exception, no log line.\n\n' +
        'Each thread holds one account lock and waits forever for the other. That is a ==deadlock==, and per-account locks are what made it possible.',
      code: {
        code: `def transfer(src: Account, dst: Account, amount: int) -> None:
    with src.lock:
        with dst.lock:
            src.balance -= amount
            dst.balance += amount`,
      },
    },
    {
      kind: 'widget',
      id: 'make-deadlock',
      eyebrow: 'Your turn',
      prompt: 'Thread A takes L1 then L2. Thread B takes L2 then L1. Step them so that both get stuck.',
      goal: 'Reach a deadlock',
      widget: { id: 'deadlock', config: { scenario: 'opposite', goal: 'deadlock' } },
      explanation:
        'A holds L1 and waits for L2; B holds L2 and waits for L1. The wait-for graph is a cycle, and nothing in a cycle can move. Most schedules finish fine, which is how deadlocks ship: it takes one unlucky interleaving.',
    },
    {
      kind: 'concept',
      id: 'four-conditions',
      title: 'Four conditions, all required',
      body:
        'A deadlock needs all four at once (Coffman et al., 1971):\n\n' +
        '1. **Mutual exclusion**: a lock has one holder.\n' +
        '2. **Hold and wait**: a thread keeps one lock while waiting for another.\n' +
        '3. **No preemption**: nobody can take a lock from its holder.\n' +
        '4. **Circular wait**: a cycle of threads, each waiting on the next.\n\n' +
        '==Break any one and deadlock is impossible.==',
    },
    {
      kind: 'match',
      id: 'break-one',
      prompt: 'Match each condition to a way of breaking it.',
      pairs: [
        { left: 'Mutual exclusion', right: 'Do not share: give each thread its own copy, or use immutable data' },
        { left: 'Hold and wait', right: 'Request every lock you need up front, all or nothing' },
        { left: 'No preemption', right: 'Acquire with a timeout; on failure, release what you hold and retry' },
        { left: 'Circular wait', right: 'Acquire locks in one global order' },
      ],
      explanation:
        'Lock ordering is the cheapest fix when you know the locks up front. Timeouts with back-off are the fallback when you discover locks as you go. Removing sharing is the best fix of all when the design allows it.',
    },
    {
      kind: 'concept',
      id: 'ordering',
      title: 'Fix 1: one global order. Fix 2: back off',
      body:
        'If every thread acquires locks in the same order, no cycle can form: nobody holds a later lock while waiting for an earlier one. For accounts, rank by id and always lock the lower id first, whichever way the money moves.\n\n' +
        'When locks cannot be ranked up front, try with a timeout, and on failure release everything, sleep a random moment, and retry.',
      callout: {
        tone: 'tip',
        text: '`lock.acquire(timeout=0.05)` returns `True` or `False` instead of waiting forever. The random sleep matters: without it, two threads can retry in lockstep and collide again and again (livelock).',
      },
    },
    {
      kind: 'order',
      id: 'order-fix',
      eyebrow: 'Build the fix',
      prompt: 'Put the steps of a deadlock-free `transfer(src, dst, amount)` in order, so it is safe to run alongside `transfer(dst, src, ...)`.',
      items: [
        'Rank the two accounts by a key every thread agrees on, such as `account.id`',
        'Acquire the lock of the lower-ranked account',
        'Acquire the lock of the higher-ranked account',
        'Check the balance and move the money',
        'Release both locks',
      ],
      explanation:
        'The order depends on the accounts, not on which is the sender, so both directions lock the lower id first. In code: `first, second = sorted((src, dst), key=lambda a: a.id)`, then `with first.lock, second.lock:`. Reject `src is dst` before any of this: a plain `Lock` acquired twice by one thread blocks forever. Release order does not matter for deadlock.',
      hint: 'The ranking has to happen before the first lock is taken.',
    },
    {
      kind: 'widget',
      id: 'ordered-finish',
      eyebrow: 'Try to break it',
      prompt: 'Same two threads, but now both take L1 before L2. Try any schedule you like and run both threads to the end.',
      goal: 'Both threads finish',
      widget: { id: 'deadlock', config: { scenario: 'ordered', goal: 'finish' } },
      explanation:
        'Whoever gets L1 first can always get L2 too, because nobody takes L2 without already holding L1. One thread may wait, but never in a cycle. Contention still costs time; it just cannot cost forever.',
    },
    {
      kind: 'concept',
      id: 'granularity',
      title: 'One big lock, or one per account?',
      body:
        'One lock around the whole bank is simple and cannot deadlock. It is also a queue: every transfer waits for every other, even on unrelated accounts.\n\n' +
        'Per-account locks let unrelated transfers run in parallel. The price is the ordering rule, applied everywhere, forever. Start coarse; split when you can show contention.',
      code: {
        code: `def transfer(src: Account, dst: Account, amount: int) -> None:
    if src is dst:
        raise ValueError("cannot transfer to the same account")
    first, second = sorted((src, dst), key=lambda acc: acc.id)
    with first.lock, second.lock:
        if src.balance < amount:
            raise ValueError("insufficient funds")
        src.balance -= amount
        dst.balance += amount`,
        highlight: [4, 5],
        caption: '`with a, b:` acquires left to right and releases in reverse, even on an exception.',
      },
    },
    {
      kind: 'mcq',
      id: 'contention',
      prompt: 'A payments service guards all accounts with one global lock. It is correct, but under load p99 latency climbs while most threads sit waiting on that lock. Best next move?',
      choices: [
        {
          text: 'Profile to confirm, then use per-account locks taken in id order',
          correct: true,
          feedback: 'Finer locks let unrelated transfers proceed, and the ordering rule keeps them deadlock-free.',
        },
        {
          text: 'Swap the global `Lock` for an `RLock`, which handles contention better',
          feedback: 'An `RLock` only lets one thread re-enter. It still has one holder at a time, so the queue is just as long.',
        },
        {
          text: 'Keep the lock for same-account transfers, drop it for all others',
          feedback: 'Two "different" transfers can share an account, such as A to B and B to C. Without a lock, B\'s balance races.',
        },
        {
          text: 'Add more worker threads so the lock queue drains faster',
          feedback: 'More threads waiting on the same lock make the queue longer, not shorter.',
        },
      ],
      explanation:
        'Contention is about what the lock covers, not about the type of lock. Narrow the lock to the data that actually conflicts, then pay for it with an ordering rule.',
      hint: 'Which option changes how much of the system one lock covers?',
    },
    {
      kind: 'predict',
      id: 'rlock',
      eyebrow: 'Reentrancy',
      prompt: 'A plain `Lock` does not track who holds it. An `RLock` does, and lets its owner acquire it again. What does this print?',
      code: `import threading

lock = threading.Lock()
lock.acquire()
print(lock.acquire(timeout=0.1))

rlock = threading.RLock()
rlock.acquire()
print(rlock.acquire(timeout=0.1))`,
      answers: ['False\nTrue', 'False True'],
      explanation:
        'The `Lock` is held, so even its holder waits, then gives up after 0.1 s: `False`. Without a timeout that thread would deadlock with itself. The `RLock` recognises its owner and bumps a counter: `True`, and it now needs two releases. Reach for it when a locked method calls another locked method, though an unlocked `_helper` called under one lock is often cleaner.',
      hint: 'Who holds `lock` when the second `acquire` runs, and does a plain `Lock` care?',
    },
    {
      kind: 'concept',
      id: 'outside',
      title: 'Do the slow and the unknown outside',
      body:
        'Every millisecond you hold a lock, other threads queue behind it. So never hold one across I/O: a network call, a disk write, a `sleep`.\n\n' +
        'Callbacks are worse. Code you do not control, run under your lock, might take *your* lock (self-deadlock with a plain `Lock`) or someone else\'s (a lock order you never checked). Copy what you need under the lock, release it, then call out.',
    },
    {
      kind: 'spotbug',
      id: 'callback',
      eyebrow: 'Find the hang',
      prompt: 'A listener that reads `config.get("timeout")` hangs the whole service the first time anyone calls `set`. Tap the two lines responsible.',
      code: `import threading

class Config:
    def __init__(self, listeners):
        self._lock = threading.Lock()
        self._data = {}
        self._fns = list(listeners)

    def get(self, key):
        with self._lock:
            return self._data.get(key)

    def set(self, key, value):
        with self._lock:
            self._data[key] = value
            for fn in self._fns:
                fn(key, value)`,
      bugLines: [16, 17],
      explanation:
        'The listener loop runs inside `with self._lock`. The listener calls `get`, which tries to take the same non-reentrant lock its own thread already holds, and waits forever. Even without re-entry, a slow listener would stall every reader.',
      fix: {
        code: `    def set(self, key, value):
        with self._lock:
            self._data[key] = value
            fns = list(self._fns)  # snapshot
        for fn in fns:  # no lock held now
            fn(key, value)`,
        caption: 'An `RLock` would stop this particular hang, but the listener would still run under your lock, free to block everyone or take other locks.',
      },
      hint: 'Find where code you did not write gets called. What is held at that moment?',
    },
    {
      kind: 'interview',
      id: 'lru-sim',
      eyebrow: 'Interview sim',
      setup:
        'Candidates report an LRU cache coding question with thread safety as a follow-up. Your single-threaded `LRUCache` uses an `OrderedDict`: `get` calls `move_to_end`, and `put` may `popitem(last=False)` to evict.',
      turns: [
        {
          interviewer: 'Now several threads share the cache. What do you change?',
          options: [
            {
              text: 'Wrap `put` in a lock, since it inserts and evicts. `get` only looks things up, so it can stay lock-free and fast.',
              quality: 'okay',
              feedback: 'Half right. `get` calls `move_to_end`, which mutates the order. In an LRU, every read is a write.',
            },
            {
              text: 'Nothing. `OrderedDict` is implemented in C and its operations are atomic under the GIL, so the cache is already safe.',
              quality: 'weak',
              feedback: 'Single calls may be, but `get` is a lookup plus a reorder and `put` is an insert plus an eviction. Those sequences race.',
            },
            {
              text: 'One lock around both `get` and `put`, since `get` reorders too. Coarse but clearly correct; finer only if profiling shows contention.',
              quality: 'strong',
              feedback: 'You named the non-obvious write and chose the coarse, correct lock first: correct now, faster later with evidence.',
            },
          ],
        },
        {
          interviewer: 'On a miss, `get` calls a loader that takes 200 ms. Threads pile up behind the lock.',
          options: [
            {
              text: 'Stop holding the lock during the load: check under it, release, load, re-take it to insert. Per-key locks if duplicate loads matter.',
              quality: 'strong',
              feedback: 'Shortest critical section, plus the check-then-act follow-up handled before they ask.',
            },
            {
              text: 'Shard into 16 caches by key hash, each with its own lock, so threads only queue behind misses in their own shard.',
              quality: 'okay',
              feedback: 'It cuts contention, but each shard still blocks for 200 ms per miss, and LRU order becomes per-shard. Fix the hold time first.',
            },
            {
              text: 'Switch to an `RLock`. It is built for locks taken over and over, so threads waiting on it get through faster.',
              quality: 'weak',
              feedback: 'An `RLock` allows re-entry by the same thread. It does not shorten the queue and it is not faster.',
            },
          ],
        },
        {
          interviewer: 'You added an `on_evict` callback. Some callbacks call `cache.get()`, and the service hangs.',
          options: [
            {
              text: 'Use `acquire(timeout=1)` in `get`, and skip the operation when it times out, so nothing can hang for long.',
              quality: 'weak',
              feedback: 'That turns a hang into silently dropped cache operations. The cause is still there.',
            },
            {
              text: 'The callback runs under our lock and re-enters `get` on the same plain `Lock`. Collect evictions under the lock; call `on_evict` after release.',
              quality: 'strong',
              feedback: 'Precise diagnosis and the structural fix: no foreign code under your lock.',
            },
            {
              text: 'Use an `RLock` instead, so a callback running on the same thread can re-enter `get` without blocking.',
              quality: 'okay',
              feedback: 'It stops this self-deadlock, but slow callbacks still block every thread, and a callback that takes another lock can still form a cycle.',
            },
          ],
        },
      ],
      wrapUp: 'Lock the invariant, not the method you assume is a read. Hold locks briefly, never across a slow load, and never call code you do not control while holding one.',
    },
    {
      kind: 'concept',
      id: 'recap',
      title: 'What to remember',
      body:
        '1. Deadlock needs all four conditions. Break circular wait with ==one global lock order==. Cannot rank the locks? `acquire(timeout=...)`, release all on failure, back off randomly.\n' +
        '2. Granularity is a trade: one lock is simple and serial; per-key locks run in parallel but need ordering.\n' +
        '3. Keep critical sections short: no I/O, no callbacks. A plain `Lock` is not reentrant; `RLock` is, but needing it is often a design smell.',
    },
  ],
  cards: [
    {
      id: 'conc-locks.coffman',
      skill: 'conc.locks',
      kind: 'flash',
      front: 'Name the four conditions that must all hold for a deadlock.',
      back: 'Mutual exclusion, hold and wait, no preemption, circular wait. Break any one, most often circular wait via a global lock order.',
    },
    {
      id: 'conc-locks.which-rule',
      skill: 'conc.locks',
      kind: 'mcq',
      prompt: 'A transfer must lock accounts 7 and 3, and transfers run in both directions. Which rule prevents deadlock while keeping the transfer atomic?',
      choices: [
        { text: 'Lock the lower account id first, in both directions', correct: true, feedback: 'One global order means no cycle can form.' },
        { text: 'Always lock the sender first, then the receiver', feedback: 'That is the bug: 7-to-3 and 3-to-7 take the locks in opposite orders.' },
        { text: 'Give each account an `RLock` instead of a `Lock`', feedback: 'Reentrancy helps one thread re-acquire its own lock. Two threads can still wait on each other in a cycle.' },
        { text: 'Release the first lock before acquiring the second', feedback: 'No deadlock, but the transfer is no longer atomic: another thread can see money that has left one account and not arrived in the other.' },
      ],
      explanation: 'Ordering by a stable key every thread agrees on breaks circular wait without giving up atomicity.',
    },
    {
      id: 'conc-locks.order-cloze',
      skill: 'conc.locks',
      kind: 'cloze',
      prompt: 'Complete the deadlock-free transfer.',
      code: `def transfer(src: Account, dst: Account, amount: int) -> None:
    if src is dst:
        raise ValueError("same account")
    first, second = {{0}}((src, dst), key=lambda acc: acc.{{1}})
    with first.lock, second.lock:
        src.balance -= amount
        dst.balance += amount`,
      blanks: [
        { options: ['sorted', 'reversed', 'tuple'], answer: 0 },
        { options: ['id', 'balance', 'lock'], answer: 0 },
      ],
      explanation: 'Sort by a stable key every thread agrees on. Balances change between calls, so two threads could rank the same pair differently. Lock objects are not orderable at all: sorting by them raises `TypeError`.',
    },
    {
      id: 'conc-locks.nonblocking',
      skill: 'conc.locks',
      kind: 'predict',
      prompt: 'What does this print?',
      code: `import threading

lock = threading.Lock()
print(lock.acquire(blocking=False))
print(lock.acquire(blocking=False))
lock.release()
print(lock.locked())`,
      answers: ['True\nFalse\nFalse', 'True False False'],
      explanation: 'The first non-blocking acquire succeeds. The second fails at once because the lock is held, by this same thread, and a plain `Lock` does not care who holds it. One release frees it.',
    },
    {
      id: 'conc-locks.leak',
      skill: 'conc.locks',
      kind: 'spotbug',
      prompt: 'After one malformed job, every later call to `handle` hangs forever. Which line starts the hang?',
      code: `import threading

lock = threading.Lock()
processed = 0

def handle(job) -> None:
    global processed
    lock.acquire()
    result = parse(job)        # raises ValueError on bad input
    processed += 1
    lock.release()
    save(result)`,
      bugLines: [9],
      explanation: 'When `parse` raises, `lock.release()` never runs and the lock stays held forever. `with lock:` releases on any exit. Better still, parse outside the lock: only the counter needs it.',
    },
    {
      id: 'conc-locks.callbacks',
      skill: 'conc.locks',
      kind: 'flash',
      front: 'Why not call a user-supplied callback while holding a lock?',
      back: 'It may take your lock again (self-deadlock with a plain `Lock`), take another lock in an order you never checked, or just be slow and block everyone. Snapshot under the lock, release, then call.',
    },
    {
      id: 'conc-locks.tools',
      skill: 'conc.locks',
      kind: 'match',
      prompt: 'Match each tool to what it does.',
      pairs: [
        { left: '`threading.Lock()`', right: 'One holder at a time; the holder cannot re-acquire it' },
        { left: '`threading.RLock()`', right: 'Its owner may re-acquire; needs one release per acquire' },
        { left: '`lock.acquire(timeout=0.05)`', right: 'Waits briefly, then returns `False` instead of blocking forever' },
        { left: '`with first.lock, second.lock:`', right: 'Acquires left to right, releases in reverse, even on exceptions' },
      ],
      explanation: 'Locks for exclusion, `RLock` for re-entry, timeouts for back-off, and `with` so a raised exception never leaks a held lock.',
    },
  ],
}

export default lesson
