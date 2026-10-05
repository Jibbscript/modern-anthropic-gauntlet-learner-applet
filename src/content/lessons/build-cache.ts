import type { Lesson } from '../../core/types'

const lesson: Lesson = {
  id: 'build-cache',
  title: 'Caches: LRU, TTL, thread-safe',
  summary: 'Build an O(1) LRU, add expiry you can test without sleeping, then make it safe for twenty threads without serializing them.',
  minutes: 9,
  skills: ['build.cache', 'conc.locks'],
  steps: [
    {
      kind: 'concept',
      id: 'hook',
      eyebrow: 'Commonly reported',
      title: 'A dict is a memory leak with a hit rate',
      body:
        'You put a dict in front of a slow API and latency drops. A week later the process is at 14 GB, because nothing ever leaves.\n\n' +
        'Every cache answers one question: ==what do I throw away?== Least recently used, expired, or both. The follow-up: what happens when twenty threads ask at once?',
      callout: {
        tone: 'insight',
        text: 'Caches are among the practical problems candidates report. The commonly reported shape (build it, extend it, make it concurrent, test it) maps neatly onto LRU, then TTL, then thread safety.',
      },
    },
    {
      kind: 'concept',
      id: 'ordereddict',
      title: 'LRU in a dozen lines',
      body:
        '`OrderedDict` remembers order and can reorder in O(1). Keep the ==least recently used key at the front==: every use calls `move_to_end`, and eviction is `popitem(last=False)`.\n\n' +
        'Both `get` and `put` count as a use. Forgetting one of them is the classic bug.',
      code: {
        code: `from collections import OrderedDict

class LRU:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.data = OrderedDict()

    def get(self, key, default=None):
        if key not in self.data:
            return default
        self.data.move_to_end(key)
        return self.data[key]

    def put(self, key, value):
        self.data[key] = value
        self.data.move_to_end(key)
        if len(self.data) > self.capacity:
            self.data.popitem(last=False)`,
        highlight: [11, 16, 18],
      },
    },
    {
      kind: 'predict',
      id: 'od-sequence',
      prompt: 'What does this print?',
      code: `from collections import OrderedDict

c = OrderedDict()
for k in "abc":
    c[k] = k.upper()
c.move_to_end("a")
c["b"] = "B2"
c.popitem(last=False)
print("".join(c))`,
      answers: ['ca'],
      explanation:
        'After the loop the order is `a b c`. `move_to_end("a")` gives `b c a`. Assigning to an existing key ==does not move it==, so `b` stays at the front and `popitem(last=False)` evicts it, leaving `c a`. That is why `put` calls `move_to_end` explicitly.',
      hint: 'Does updating an existing key\'s value change its position?',
    },
    {
      kind: 'widget',
      id: 'evictions',
      eyebrow: 'Your turn',
      prompt: 'Capacity 3, most recently used on the left. Replay the sequence, and before each eviction tap the key that is about to go.',
      goal: 'Predict every eviction',
      widget: {
        id: 'lru',
        config: {
          capacity: 3,
          sequence: ['put A', 'put B', 'put C', 'get A', 'put D', 'get C', 'put E', 'get D', 'put F'],
          predict: true,
          goal: 'predict',
        },
      },
      explanation:
        'The evictions go B, A, C. Each `get` rescued its key: `get A` saved A from the first eviction, so B went instead. Recency decides, not insertion order.',
    },
    {
      kind: 'spotbug',
      id: 'get-recency',
      eyebrow: 'Find the bug',
      prompt: 'Users report that their most-read item keeps getting evicted while one-off items survive. Tap the bug.',
      code: `class LRU:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.data = OrderedDict()

    def get(self, key, default=None):
        return self.data.get(key, default)

    def put(self, key, value):
        self.data[key] = value
        self.data.move_to_end(key)
        if len(self.data) > self.capacity:
            self.data.popitem(last=False)`,
      bugLines: [7],
      explanation:
        '`get` reads without refreshing recency, so this evicts by *last write*, not last use. A key read a thousand times goes as soon as it is the oldest write. Every hit must `move_to_end`.',
      fix: {
        code: `    def get(self, key, default=None):
        if key not in self.data:
            return default
        self.data.move_to_end(key)
        return self.data[key]`,
      },
      hint: 'Which operations should count as a "use"?',
    },
    {
      kind: 'concept',
      id: 'linked-list',
      title: 'No OrderedDict allowed',
      body:
        'Some interviewers ask you to build the ordering yourself. The standard answer: a dict from key to node, plus a ==doubly linked list== of nodes in recency order. The dict finds a node in O(1); the list unlinks and relinks it in O(1).\n\n' +
        'Two sentinel nodes, `head` and `tail`, remove every `None` check at the ends.',
      code: {
        code: `class Node:
    __slots__ = ("key", "val", "prev", "next")

    def __init__(self, key=None, val=None):
        self.key, self.val = key, val
        self.prev = self.next = None

# head.next is the most recent; tail.prev is the next to evict
head, tail = Node(), Node()
head.next, tail.prev = tail, head`,
      },
    },
    {
      kind: 'cloze',
      id: 'dll-moves',
      prompt: 'Fill in the two O(1) moves every hit needs: unlink a node, then push it right after `head`.',
      code: `def unlink(node):
    node.prev.next = {{0}}
    node.next.prev = {{1}}

def push_front(head, node):
    node.prev, node.next = head, head.next
    head.next.prev = {{2}}
    head.next = node`,
      blanks: [
        { options: ['node.prev', 'node.next', 'None'], answer: 1 },
        { options: ['node.next', 'node', 'node.prev'], answer: 2 },
        { options: ['node', 'head', 'node.next'], answer: 0 },
      ],
      explanation:
        'Unlinking points each neighbor past the node. Pushing wires the node between `head` and the old first node, whose `prev` must now point back at the new one. `head.next = node` goes last, because the line above still needs the old `head.next`.',
      hint: 'Draw three boxes, A ⇄ node ⇄ B, and decide where A\'s forward arrow and B\'s back arrow should point.',
    },
    {
      kind: 'concept',
      id: 'ttl',
      title: 'TTL: expire on read, test without sleeping',
      body:
        'Store `(value, expires_at)`. On `get`, if the clock has passed `expires_at`, delete and miss. That is ==lazy expiry==: no extra thread, and exact at read time.\n\n' +
        'Use `time.monotonic`, not `time.time`; wall clocks can jump. And take the clock as a parameter, so a test moves time by changing a variable instead of sleeping.',
      code: {
        code: `class TTLCache:
    def __init__(self, ttl: float, clock=time.monotonic):
        self.ttl, self.clock, self.data = ttl, clock, {}

    def put(self, key, value):
        self.data[key] = (value, self.clock() + self.ttl)
    def get(self, key, default=None):
        item = self.data.get(key)
        if item is None or self.clock() >= item[1]:
            self.data.pop(key, None)
            return default
        return item[0]

now = 0.0
cache = TTLCache(ttl=60, clock=lambda: now)
cache.put("k", "v")
now = 59.9; assert cache.get("k") == "v"
now = 60.0; assert cache.get("k") is None`,
        highlight: [15],
      },
    },
    {
      kind: 'sort',
      id: 'lazy-vs-sweep',
      prompt: 'Lazy expiry checks on read. A background sweeper is a thread that scans and deletes expired entries every few seconds. Sort each property.',
      buckets: [
        { id: 'lazy', label: 'Lazy expiry' },
        { id: 'sweep', label: 'Background sweep' },
      ],
      items: [
        { text: 'No extra thread to start, stop, or test', bucket: 'lazy' },
        { text: 'Expired keys that nobody reads again stay in memory', bucket: 'lazy', why: 'Nothing ever looks at them, so nothing deletes them.' },
        { text: 'Memory is reclaimed even for keys nobody reads', bucket: 'sweep' },
        { text: 'Touches the same data as `get` and `put`, so it needs the same lock', bucket: 'sweep', why: 'It runs on its own thread, concurrently with requests.' },
        { text: 'Readers never see an expired value, not even a moment late', bucket: 'lazy', why: 'The check happens at the moment of the read; a sweeper only runs every few seconds.' },
      ],
      explanation:
        'Real caches often combine them: check expiry on every read for correctness, and bound memory with occasional sweeps or a size limit like LRU. Name both, then say which you would build first.',
    },
    {
      kind: 'mcq',
      id: 'lru-cache-limits',
      eyebrow: 'Read the docs',
      prompt: 'When is `@functools.lru_cache` the wrong tool?',
      multi: true,
      choices: [
        {
          text: 'Entries must expire after 60 seconds',
          correct: true,
          feedback: 'Yes. There is no TTL; you would need a wrapper or your own cache.',
        },
        {
          text: 'One argument is a dict of request options',
          correct: true,
          feedback: 'Yes. Arguments become the key, so they must be hashable. A dict raises `TypeError: unhashable type`.',
        },
        {
          text: 'Twenty threads may miss on one key at once, and the backend must see only one call',
          correct: true,
          feedback: 'Yes. The cache stays consistent across threads, but the function can run again if a second call arrives before the first finishes.',
        },
        {
          text: 'A pure function of two ints, called millions of times',
          feedback: 'This is the ideal case: hashable arguments, deterministic results, no expiry needed.',
        },
        {
          text: 'You want hit and miss counts',
          feedback: '`cache_info()` reports hits, misses, maxsize, and current size for free.',
        },
      ],
      explanation:
        '`lru_cache` defaults to `maxsize=128`; `functools.cache` is the unbounded version. Both key on hashable arguments, never expire, and do not deduplicate concurrent misses. On methods they also keep `self` alive until evicted.',
    },
    {
      kind: 'concept',
      id: 'threads',
      title: 'Twenty threads, one cache',
      body:
        '`get` is a check followed by `move_to_end`. If another thread evicts that key in between, `move_to_end` raises `KeyError`. So put ==one lock== around each `get` and `put`. They take microseconds, so contention is cheap.\n\n' +
        'The trap is the slow part. A `get_or_load` that calls a 300 ms backend while holding the lock stalls every thread, hits included.',
      callout: {
        tone: 'warn',
        text: 'Releasing the lock during the load fixes the stall, but now twenty threads that miss the same key all call the backend at once: a cache stampede.',
      },
    },
    {
      kind: 'compare',
      id: 'load-design',
      question: 'Interviewer: *Twenty threads call `get_or_load(key)`. A miss costs a 300 ms backend call. How do you make it thread-safe?*',
      a: 'One `threading.Lock` around the whole method, backend call included. It is obviously correct, and the backend never sees duplicate requests for a key.',
      b: 'A lock guards the dict and recency order only. On a miss, I park a `Future` for that key under the lock, then call the backend outside it. Other threads missing the same key wait on that future, and different keys load in parallel.',
      better: 'b',
      explanation:
        '**A** is correct but serializes everything: one miss blocks every hit for 300 ms, and the cache tops out near three loads per second. **B** keeps the critical section tiny and still sends one request per key (single-flight). The follow-ups to expect: set the exception on the future if the load fails, and remove the in-flight entry either way.',
    },
    {
      kind: 'interview',
      id: 'sim',
      eyebrow: 'Interview sim',
      setup: 'The prompt: build a cache in front of a slow user-profile service.',
      turns: [
        {
          interviewer: 'Start with `get` and `put` and a fixed capacity.',
          options: [
            {
              text: 'I would decorate the fetch function with `@lru_cache(maxsize=1000)` and move on.',
              quality: 'weak',
              feedback: 'Reasonable in production, but it dodges the exercise, and the TTL and threading follow-ups need control it does not give you. Mention it, then build.',
            },
            {
              text: 'A dict plus a list of keys in usage order: on each hit, remove the key from the list and append it.',
              quality: 'okay',
              feedback: 'Correct behavior, but `list.remove` is O(n), so every hit scans the whole cache.',
            },
            {
              text: 'An `OrderedDict`: `get` moves the key to the end; `put` assigns, moves to the end, and pops the oldest past capacity. All O(1). If you would rather I not lean on it, I will use a dict plus a doubly linked list.',
              quality: 'strong',
              feedback: 'Structure, complexity, and an offer to go a level deeper. Exactly the right altitude.',
            },
          ],
        },
        {
          interviewer: 'Profiles change. Entries should expire after 60 seconds. How do you test that?',
          options: [
            {
              text: 'Inject the clock: the cache takes a `clock` callable, defaulting to `time.monotonic`. Tests pass a fake and check that 59.9 s is a hit and 60 s is a miss. No sleeping.',
              quality: 'strong',
              feedback: 'Deterministic, fast, and it tests the exact boundary.',
            },
            {
              text: 'Expiry is simple enough that I would check it by hand.',
              quality: 'weak',
              feedback: 'Off-by-one at the boundary is the most likely bug here, and the round explicitly values testing your own code.',
            },
            {
              text: 'Set the TTL to 0.1 s in the test and `time.sleep(0.2)` before asserting.',
              quality: 'okay',
              feedback: 'It works, but sleeps make the suite slow and flaky on a loaded CI machine, and you cannot hit the exact boundary.',
            },
          ],
        },
        {
          interviewer: 'Twenty threads share this cache now.',
          options: [
            {
              text: 'Wrap `get` and `put` in one lock.',
              quality: 'okay',
              feedback: 'Necessary, and enough for those two. But you have not said where the slow backend call happens, which is where the real trouble is.',
            },
            {
              text: 'One lock around `get` and `put`, since check-then-move is two steps. The backend call stays outside the lock, and concurrent misses on one key wait on a per-key future, so the service sees one request instead of twenty.',
              quality: 'strong',
              feedback: 'Correctness, throughput, and the stampede, in three sentences.',
            },
            {
              text: 'Nothing changes: dict operations are atomic under the GIL.',
              quality: 'weak',
              feedback: 'Single operations are; check-then-`move_to_end` is two. Another thread can evict in between and you get a `KeyError`.',
            },
          ],
        },
      ],
      wrapUp:
        'Name the structure and its cost, make time a dependency you control, and keep the slow load out of the critical section.',
    },
    {
      kind: 'concept',
      id: 'recap',
      eyebrow: 'Recap',
      title: 'Three things to carry in',
      body:
        '1. **LRU = order plus O(1) moves.** `move_to_end` on every use, `popitem(last=False)` to evict, or a dict plus a doubly linked list.\n' +
        '2. **TTL = store the deadline, check it on read.** Inject the clock so tests move time.\n' +
        '3. **Thread-safe = short lock, slow work outside it.** Dedupe concurrent misses with per-key futures.',
    },
  ],
  cards: [
    {
      id: 'build-cache.od-front',
      skill: 'build.cache',
      kind: 'predict',
      prompt: 'What does this print?',
      code: `from collections import OrderedDict

d = OrderedDict.fromkeys("wxyz")
d.move_to_end("y", last=False)
d.popitem()
print("".join(d))`,
      answers: ['ywx'],
      explanation: '`move_to_end(..., last=False)` moves `y` to the front: `y w x z`. `popitem()` defaults to `last=True`, removing `z` from the end.',
    },
    {
      id: 'build-cache.load-under-lock',
      skill: 'conc.locks',
      kind: 'spotbug',
      prompt: 'This is correct, but under load every request, hits included, stalls behind each 300 ms backend call. Which line causes the stall?',
      code: `def get_or_load(self, key):
    with self.lock:
        if key in self.data:
            self.data.move_to_end(key)
            return self.data[key]
        value = self.load(key)
        self.data[key] = value
        if len(self.data) > self.capacity:
            self.data.popitem(last=False)
        return value`,
      bugLines: [6],
      explanation: '`self.load(key)` runs while holding the lock, so one miss blocks every thread for 300 ms: about three misses per second, total. Load outside the lock, and dedupe concurrent misses on the same key with a per-key future.',
    },
    {
      id: 'build-cache.hit-rate',
      skill: 'build.cache',
      kind: 'numeric',
      prompt: 'A cache hit costs 1 ms. A miss costs the 1 ms lookup plus a 200 ms backend call. At a 90% hit rate, what is the average latency?',
      answer: 21,
      tolerance: 0.1,
      unit: 'ms',
      explanation: '0.9 × 1 + 0.1 × 201 = 0.9 + 20.1 = 21 ms. Misses dominate: pushing the hit rate to 95% roughly halves it, to 11 ms.',
    },
    {
      id: 'build-cache.assign-order',
      skill: 'build.cache',
      kind: 'mcq',
      prompt: 'In an `OrderedDict`, `d[k] = v` where `k` already exists…',
      choices: [
        { text: 'updates the value and leaves `k` where it was', correct: true },
        { text: 'moves `k` to the end', feedback: 'Only new keys go to the end. That is why an LRU `put` calls `move_to_end` explicitly.' },
        { text: 'moves `k` to the front', feedback: 'Nothing moves to the front unless you call `move_to_end(k, last=False)`.' },
        { text: 'raises unless you delete `k` first', feedback: 'Assignment to an existing key is always allowed; it just does not reorder.' },
      ],
      explanation: 'Order reflects first insertion. Updating a value does not count as reinsertion, so an LRU must refresh recency itself.',
    },
    {
      id: 'build-cache.clock',
      skill: 'build.cache',
      kind: 'flash',
      front: 'Why should a TTL cache take `clock` as a constructor parameter?',
      back: 'So tests control time: pass a lambda reading a variable, advance it, and check the exact boundary (59.9 s vs 60 s) without `sleep`. Default it to `time.monotonic`, which never jumps backwards.',
    },
    {
      id: 'build-cache.single-flight',
      skill: 'conc.locks',
      kind: 'order',
      prompt: 'Order the steps of a single-flight `get_or_load(key)`.',
      items: [
        'Under the lock: if the key is cached, return it',
        'Under the lock: join the in-flight future for this key, or create one and become its owner',
        'Outside the lock: the owner calls the backend',
        'The owner stores the value, then resolves the future',
        'Every caller returns `future.result()`',
      ],
      explanation: 'Only bookkeeping happens under the lock; the slow call happens outside it, once per key. The owner must also set the exception and clear the in-flight entry if the load fails.',
    },
    {
      id: 'build-cache.tools',
      skill: 'build.cache',
      kind: 'match',
      prompt: 'Match each tool to its job in a cache.',
      pairs: [
        { left: '`move_to_end(k)`', right: 'Mark `k` as most recently used' },
        { left: '`popitem(last=False)`', right: 'Evict the least recently used entry' },
        { left: '`time.monotonic`', right: 'A clock that never jumps backwards' },
        { left: '`functools.cache`', right: 'Unbounded memoization, no eviction' },
        { left: 'A per-key `Future`', right: 'One backend call per burst of misses' },
      ],
      explanation: 'Recency, eviction, expiry, memoization, and stampede control: the five moving parts of a practical cache.',
    },
  ],
}

export default lesson
