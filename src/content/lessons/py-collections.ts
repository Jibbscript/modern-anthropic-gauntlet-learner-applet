import type { Lesson } from '../../core/types'

const lesson: Lesson = {
  id: 'py-collections',
  title: 'The right container',
  summary: 'deque, Counter, defaultdict, heapq, OrderedDict, bisect and sets: pick by the operation you do most, and know what it costs.',
  minutes: 9,
  skills: ['py.collections'],
  steps: [
    {
      kind: 'concept',
      id: 'hook',
      eyebrow: 'Warm-up',
      title: 'Correct is not done',
      body: "Candidates report that practical rounds rarely stop at \"it works\". The next prompt is \"now make it scale\" or \"now make it concurrent\". What breaks first is rarely the algorithm. It's a container doing something linear inside a loop you assumed was cheap.\n\nThe same few characters can hide very different costs:",
      code: {
        code: `# list: compares against every element
x in items

# set: one hash lookup, on average
x in seen`,
      },
    },
    {
      kind: 'spotbug',
      id: 'bfs-pop0',
      eyebrow: 'Find the bug',
      prompt: 'This BFS returns the right order. On a graph with a million pages, it crawls. Tap the line that makes it quadratic.',
      code: `def bfs_order(start, links):
    seen = {start}
    queue = [start]
    order = []
    while queue:
        page = queue.pop(0)
        order.append(page)
        for nxt in links.get(page, ()):
            if nxt not in seen:
                seen.add(nxt)
                queue.append(nxt)
    return order`,
      bugLines: [6],
      explanation:
        '`list.pop(0)` removes the first slot and shifts every remaining element left: O(n) per pop, O(n²) for the crawl. A performance bug is still a bug. In a quick test, a 400,000-page frontier took about 20 s this way and under 0.1 s with a deque. `seen` is already a set, so membership is fine.',
      fix: {
        code: `from collections import deque

queue = deque([start])
...
page = queue.popleft()   # O(1)`,
      },
      hint: "Which operation's cost grows with the length of the queue?",
    },
    {
      kind: 'numeric',
      id: 'shifts',
      eyebrow: 'Estimate',
      prompt:
        '`pop(0)` on a list of length *k* moves the *k − 1* elements behind it. Your frontier holds 10,000 URLs and you drain it with `pop(0)`, adding nothing new. About how many element moves in total?',
      answer: 49995000,
      tolerance: 0.1,
      unit: 'moves',
      explanation:
        '9,999 + 9,998 + … + 0 = n(n − 1)/2 = 49,995,000: about 50 million moves for 10,000 pops. A `deque` is a doubly linked list of fixed-size blocks, so `append`, `appendleft`, `pop` and `popleft` are all O(1) and draining costs 10,000 steps. Use it for every FIFO queue and BFS frontier.',
      hint: "Add up 9,999 + 9,998 + … + 1. There's a formula for that.",
    },
    {
      kind: 'concept',
      id: 'count-group',
      title: 'Count and group without ceremony',
      body: '`defaultdict(factory)` calls `factory()` for a missing key, so grouping is one line. `Counter` is a dict of counts: missing keys read as 0, `update` adds counts, and `most_common(k)` returns the top k, highest first, with ties in first-seen order.',
      code: {
        code: `from collections import Counter, defaultdict

by_host = defaultdict(list)
for url in urls:
    by_host[host(url)].append(url)

first = (ln.split()[0] for ln in log)
codes = Counter(first)
codes.most_common(3)  # [(code, n), ...]`,
      },
      callout: {
        tone: 'warn',
        text: 'Reading a missing key from a `defaultdict` *inserts* it. Test membership with `in`, not `if d[key]:`.',
      },
    },
    {
      kind: 'predict',
      id: 'counter',
      eyebrow: 'Predict',
      prompt: 'What does this print? (Two lines.)',
      code: `from collections import Counter

c = Counter("mississippi")
print(c.most_common(2))
c.update("sip")
print(c["s"], c["z"])`,
      answers: ["[('i', 4), ('s', 4)]\n5 0"],
      explanation:
        '`i` and `s` both appear 4 times; ties come out in first-seen order, and `i` shows up before `s`. `update` *adds* counts (unlike `dict.update`, which replaces), so `s` becomes 5. A missing key reads as 0 and, unlike with `defaultdict`, is not inserted.',
      hint: 'Count m, i, s, p. Which of the tied letters appears first in the word?',
    },
    {
      kind: 'concept',
      id: 'heap',
      title: 'Always the smallest next',
      body: "`heapq` turns a plain list into a **min-heap**: push and pop are O(log n), and `h[0]` is always the smallest. Push tuples to order by priority, with a counter as tie-breaker so Python never compares two payloads. There's no max-heap: negate the key. `nlargest(k, xs)` gives the top k in O(n log k); `heappushpop` pushes, then pops the smallest, in one step.",
      code: {
        code: `import heapq, itertools

h, tie = [], itertools.count()
item = (deadline, next(tie), job)
heapq.heappush(h, item)
deadline, _, job = heapq.heappop(h)
soonest = h[0]       # peek, O(1)
top3 = heapq.nlargest(3, scores)`,
      },
    },
    {
      kind: 'predict',
      id: 'heap-ops',
      eyebrow: 'Predict',
      prompt: 'What does this print? (Three lines.)',
      code: `import heapq

h = []
for x in [5, 1, 8, 3, 9, 2]:
    heapq.heappush(h, x)
print(h[0], len(h))
print([heapq.heappop(h) for _ in range(3)])
print(heapq.heappushpop(h, 4))`,
      answers: ['1 6\n[1, 2, 3]\n4'],
      explanation:
        '`h[0]` peeks at the minimum without removing it. Three pops come out in ascending order. The heap now holds 5, 8 and 9, so `heappushpop(h, 4)` pushes 4 and immediately pops the smallest, which is 4 itself; the heap is unchanged. That is exactly the move for keeping a running top-k.',
      hint: "After three pops, what's the smallest item left? Compare it with 4.",
    },
    {
      kind: 'concept',
      id: 'lru',
      title: 'Recency order: OrderedDict',
      body: 'An LRU cache needs two things fast: lookup by key, and finding the least recently used entry. `OrderedDict` does both. `move_to_end(key)` marks a key most recent; `popitem(last=False)` removes the oldest. Both are O(1). A plain dict keeps insertion order too, but has no `move_to_end` and no `popitem(last=False)`.',
      code: {
        code: `from collections import OrderedDict

class LRU:
    def __init__(self, capacity):
        self.capacity = capacity
        self.data = OrderedDict()

    def get(self, key):
        if key not in self.data:
            return None
        self.data.move_to_end(key)
        return self.data[key]

    def put(self, key, value):
        self.data[key] = value
        self.data.move_to_end(key)
        if len(self.data) > self.capacity:
            self.data.popitem(last=False)`,
      },
    },
    {
      kind: 'widget',
      id: 'lru-predict',
      eyebrow: 'Try it',
      prompt: 'Capacity 3. Replay the sequence, and before each eviction, tap the key that will be evicted.',
      goal: 'Predict every eviction',
      widget: {
        id: 'lru',
        config: {
          capacity: 3,
          sequence: ['put A', 'put B', 'put C', 'get A', 'put D', 'get C', 'put E'],
          predict: true,
          goal: 'predict',
        },
      },
      explanation:
        '`get A` refreshes A, so `put D` evicts B, the least recently used. `get C` then refreshes C, which leaves A as the oldest when `put E` arrives. Reads move keys just as much as writes do.',
    },
    {
      kind: 'concept',
      id: 'bisect-sets',
      title: 'Sorted lists and set algebra',
      body: 'On a sorted list, `bisect` finds positions in O(log n): `bisect_left` lands before the first equal item, `bisect_right` just after the last. "How many events before t?" is one call. Inserting still shifts elements, so `insort` is O(n). Sets answer whole-collection questions in one expression: `-`, `&`, `|`, `^`.',
      code: {
        code: `import bisect

ts = [3, 7, 7, 12, 20]
bisect.bisect_left(ts, 7)   # 1
bisect.bisect_right(ts, 7)  # 3
bisect.insort(ts, 10)       # O(n)

found - visited   # not yet crawled
found & visited   # in both
found | visited   # in either
found ^ visited   # in exactly one`,
      },
    },
    {
      kind: 'cloze',
      id: 'window',
      eyebrow: 'Fill in',
      prompt: "Count timestamps in the **inclusive** range [lo, hi] of a sorted list, then return the links you haven't visited.",
      code: `from bisect import bisect_left, bisect_right

def count_between(ts, lo, hi):
    # ts is sorted; count lo <= t <= hi
    upper = {{0}}(ts, hi)
    lower = {{1}}(ts, lo)
    return upper - lower

def new_links(found, visited):
    # both are sets
    return found {{2}} visited`,
      blanks: [
        { options: ['bisect_left', 'bisect_right', 'insort'], answer: 1 },
        { options: ['bisect_right', 'insort', 'bisect_left'], answer: 2 },
        { options: ['&', '-', '|', '^'], answer: 1 },
      ],
      explanation:
        '`bisect_right(ts, hi)` counts everything ≤ hi; `bisect_left(ts, lo)` counts everything < lo. The difference is the inclusive range, duplicates included: for `[1, 4, 4, 9, 15, 22]` with lo=4 and hi=15 it is 4. Swap either side and you lose the 4s or the 15. `found - visited` keeps only new links; `^` would also return visited pages that were not found.',
      hint: 'For the upper bound you want to count items equal to hi; for the lower bound you want to exclude only items below lo.',
    },
    {
      kind: 'match',
      id: 'pick',
      eyebrow: 'Match',
      prompt: 'Match each problem to the container that makes it easy.',
      pairs: [
        { left: 'Frontier for a breadth-first crawl', right: '`deque`' },
        { left: 'Top 10 most frequent error codes', right: '`Counter`' },
        { left: 'Group log lines by request id', right: '`defaultdict(list)`' },
        { left: 'Always run the job with the earliest deadline next', right: '`heapq`' },
        { left: 'Evict the least recently used entry', right: '`OrderedDict`' },
        { left: 'Count events between two times in a sorted log', right: '`bisect`' },
      ],
      explanation:
        'Pick by the operation you do most: pop from the front (deque), count (Counter), group (defaultdict), take the next smallest (heapq), reorder by recency (OrderedDict), binary-search sorted data (bisect).',
    },
    {
      kind: 'sort',
      id: 'costs',
      eyebrow: 'Sort',
      prompt: 'Sort each operation by its cost, where n is the size of the container.',
      buckets: [
        { id: 'o1', label: 'O(1)' },
        { id: 'logn', label: 'O(log n)' },
        { id: 'on', label: 'O(n)' },
      ],
      items: [
        { text: '`dq.popleft()`', bucket: 'o1', why: 'Deques are O(1) at both ends.' },
        { text: '`x in a_set`', bucket: 'o1', why: 'One hash lookup, on average.' },
        { text: '`a_list.append(x)`', bucket: 'o1', why: 'Amortised O(1): occasional resizes are spread across appends.' },
        { text: '`heapq.heappush(h, x)`', bucket: 'logn', why: 'Sifts up one path of the tree.' },
        { text: '`bisect.bisect_left(a, x)`', bucket: 'logn', why: 'Binary search on a sorted list.' },
        { text: '`heapq.heappop(h)`', bucket: 'logn', why: 'Moves the last item to the root and sifts it down.' },
        { text: '`a_list.pop(0)`', bucket: 'on', why: 'Shifts every remaining element left.' },
        { text: '`bisect.insort(a, x)`', bucket: 'on', why: 'Finding the slot is O(log n); inserting shifts the tail.' },
        { text: '`dq[len(dq) // 2]`', bucket: 'on', why: 'Deque indexing is O(1) at the ends but O(n) in the middle.' },
      ],
      explanation:
        'The traps are the ones that look cheap: `pop(0)`, `insort`, and indexing into the middle of a deque. When an interviewer asks you to scale something, scan your hot loops for these first.',
    },
    {
      kind: 'concept',
      id: 'recap',
      eyebrow: 'Recap',
      title: 'The cheat sheet',
      body: 'Choose by the operation you do most, then check what it costs inside your hottest loop. A perf bug is still a bug, and "now scale it" is a commonly reported follow-up in practical rounds.',
      code: {
        lang: 'text',
        code: `BFS frontier   deque        O(1) ends
counting       Counter      O(1)
grouping       defaultdict  O(1)
next smallest  heapq        O(log n)
LRU order      OrderedDict  O(1)
sorted search  bisect       O(log n)
membership     set          O(1) avg`,
      },
    },
  ],
  cards: [
    {
      id: 'py-collections.insert-front',
      skill: 'py.collections',
      kind: 'numeric',
      prompt:
        'You build a 1,000-item list with `items.insert(0, x)`, starting from empty. Each front insert shifts every existing element right by one. Roughly how many shifts in total?',
      answer: 499500,
      tolerance: 0.1,
      unit: 'shifts',
      explanation: '0 + 1 + … + 999 = 999 × 1000 / 2 = 499,500. `deque.appendleft` does each insert in O(1).',
    },
    {
      id: 'py-collections.counter-sub',
      skill: 'py.collections',
      kind: 'predict',
      prompt: 'What does this print?',
      code: `from collections import Counter
print(Counter("aab") - Counter("abc"))`,
      answers: ["Counter({'a': 1})"],
      explanation: 'Counter subtraction keeps only positive counts: a is 2 − 1 = 1; b drops to 0 and c to −1, so both are discarded.',
    },
    {
      id: 'py-collections.heap-ties',
      skill: 'py.collections',
      kind: 'predict',
      prompt: 'What does this print?',
      code: `import heapq

h = []
heapq.heappush(h, (2, "write"))
heapq.heappush(h, (1, "read"))
heapq.heappush(h, (2, "audit"))
while h:
    print(heapq.heappop(h)[1])`,
      answers: ['read\naudit\nwrite'],
      explanation:
        'Tuples compare left to right: priority 1 first, then the two priority-2 items fall back to comparing their strings. If payloads are not comparable, put a counter in the middle as a tie-breaker.',
    },
    {
      id: 'py-collections.lru-calls',
      skill: 'py.collections',
      kind: 'flash',
      front: 'Which two `OrderedDict` methods make an LRU cache, and when do you call each?',
      back: '`move_to_end(key)` on every hit or update (marks it most recent). `popitem(last=False)` when over capacity (evicts the least recent). Both are O(1).',
    },
    {
      id: 'py-collections.insort',
      skill: 'py.collections',
      kind: 'mcq',
      prompt: '`bisect.insort(a, x)` on a sorted list of n items costs…',
      choices: [
        { text: 'O(log n)', feedback: 'That is only the binary search. The insertion still shifts everything after the slot.' },
        { text: 'O(n)', correct: true, feedback: 'Right: O(log n) to find the slot, O(n) to shift the tail.' },
        { text: 'O(1)', feedback: 'Only appends at the end are (amortised) O(1).' },
        { text: 'O(n log n)', feedback: 'That would be a full re-sort. `insort` never re-sorts.' },
      ],
      explanation:
        'Search is O(log n), but `list.insert` shifts the tail, so the total is O(n). Fine for thousands of items; if you only ever need the minimum, a heap is cheaper.',
    },
    {
      id: 'py-collections.match-more',
      skill: 'py.collections',
      kind: 'match',
      prompt: 'Match each need to the tool.',
      pairs: [
        { left: 'Undo stack: push and pop the latest action', right: '`list` with `append` / `pop()`' },
        { left: 'Users who are in both groups', right: '`a & b`' },
        { left: 'The 5 smallest of 10 million numbers', right: '`heapq.nsmallest(5, xs)`' },
        { left: 'Word frequencies in a document', right: '`Counter(words)`' },
      ],
      explanation:
        'A list is a fine stack: both ends of the action happen at the tail, O(1). `&` intersects sets. `nsmallest` keeps a small heap, O(n log k). `Counter` counts in one pass.',
    },
    {
      id: 'py-collections.defaultdict',
      skill: 'py.collections',
      kind: 'cloze',
      prompt: 'Group URLs by host in one pass.',
      code: `from collections import defaultdict

by_host = defaultdict({{0}})
for url in urls:
    by_host[host(url)].{{1}}(url)`,
      blanks: [
        { options: ['[]', 'list', 'list()'], answer: 1 },
        { options: ['add', 'extend', 'append'], answer: 2 },
      ],
      explanation:
        '`defaultdict` needs a *callable* factory: `list`, not `[]` or `list()` (both raise `TypeError`). Lists `append`; `add` is for sets, and `extend` would add the URL one character at a time.',
    },
  ],
}

export default lesson
