import type { Lesson } from '../../core/types'

const lesson: Lesson = {
  id: 'py-idioms',
  title: 'Idioms that read well',
  summary: 'Comprehensions, unpacking, generators, context managers, and the two evaluation-time traps that bite in interviews.',
  minutes: 9,
  skills: ['py.idioms', 'py.design'],
  steps: [
    {
      kind: 'concept',
      id: 'hook',
      eyebrow: 'Warm-up',
      title: 'Fewer places to hide',
      body: "In a practical round the interviewer reads your code as you type it. Both versions below do the same job. The second has no index arithmetic, no accumulator to forget, and fails loudly if the two lists ever disagree in length.\n\nIdioms aren't style points. They're fewer places for bugs to hide, and less to explain.",
      code: {
        code: `# index juggling
passed = []
for i in range(len(names)):
    if scores[i] >= 50:
        passed.append(names[i].title())

# says what it means
passed = [
    name.title()
    for name, score in zip(names, scores, strict=True)
    if score >= 50
]`,
      },
    },
    {
      kind: 'predict',
      id: 'dict-comp',
      eyebrow: 'Predict',
      prompt: 'Comprehensions build dicts too. What does this print?',
      code: `words = ["apple", "avocado", "banana", "blueberry", "cherry"]
first = {w[0]: w for w in words}
print(first)`,
      answers: ["{'a': 'avocado', 'b': 'blueberry', 'c': 'cherry'}"],
      explanation:
        "A dict comprehension assigns in order, so a repeated key keeps the **last** value: `apple` is overwritten by `avocado`. If you wanted the first, use `setdefault` in a loop. Silent overwrites are a classic source of \"where did my data go?\" bugs.",
      hint: 'What happens when the same key is assigned twice?',
    },
    {
      kind: 'concept',
      id: 'when-not',
      title: 'When a loop is better',
      body: "Use a comprehension when you're *building a collection* from another one. Use a plain loop when:\n\n- the point is a side effect (printing, writing, mutating state)\n- each item needs its own `try`/`except`\n- you'd nest more than two `for`s, or need a comment to explain it\n\nIf you only need an aggregate, skip the list: `sum(x * x for x in nums)` streams through a generator expression.",
    },
    {
      kind: 'mcq',
      id: 'loop-or-comp',
      eyebrow: 'Your call',
      multi: true,
      prompt: 'Which of these should be a plain `for` loop instead? Select all that apply.',
      choices: [
        {
          text: '`[print(row) for row in rows]`',
          correct: true,
          feedback: 'Right: it builds a throwaway list of `None`s just to print. A loop says what you mean.',
        },
        {
          text: '`[line.strip() for line in f if line.strip()]`',
          feedback: 'This one is fine: it builds a new collection from an existing one, and the filter reads clearly.',
        },
        {
          text: '`[int(s) for s in fields]`, when some fields are malformed and should be skipped',
          correct: true,
          feedback: "Right: there's no `try`/`except` inside a comprehension. A loop (or a helper that returns `None`) handles bad items honestly.",
        },
        {
          text: '`{u.id: u for u in users}`',
          feedback: 'Fine as is: a lookup table keyed by id is exactly what dict comprehensions are for.',
        },
        {
          text: '`[c for row in grid for cell in row for c in cell.split() if c != "#"]`',
          correct: true,
          feedback: 'Right: past two `for`s, the reader has to simulate it in their head. Unroll it.',
        },
      ],
      explanation:
        'Comprehensions are for building collections. Side effects, per-item error handling, and deep nesting read better as loops, and picking the right one is part of writing usable code.',
    },
    {
      kind: 'concept',
      id: 'unpack',
      title: 'Unpack instead of index',
      body: "Indexing (`row[0]`, `row[2]`) makes readers count. Unpacking names things, and a starred target grabs \"the rest\". `enumerate` gives you the index without `range(len(...))`. And `zip(..., strict=True)` (Python 3.10+) raises `ValueError` when inputs differ in length, where plain `zip` silently stops at the shortest.",
      code: {
        code: `host, port = addr.split(":")   # ValueError unless exactly 2 parts
first, *middle, last = path.split("/")

for lineno, line in enumerate(lines, start=1):
    ...

for name, score in zip(names, scores, strict=True):
    ...`,
      },
    },
    {
      kind: 'predict',
      id: 'unpack-zip',
      eyebrow: 'Predict',
      prompt: 'What does this print? (Two lines.)',
      code: `head, *rest = "abc"
print(head, rest)
print(list(zip([1, 2, 3], "xy")))`,
      answers: ["a ['b', 'c']\n[(1, 'x'), (2, 'y')]"],
      explanation:
        "Strings are iterable, so `head` gets `'a'` and the starred target always gets a **list**: `['b', 'c']`. Plain `zip` stops at the shortest input and drops `3` without a word. With `strict=True` that line raises `ValueError` instead, which is what you want when lengths *should* match.",
      hint: 'A starred target always collects into the same type, whatever you unpack.',
    },
    {
      kind: 'concept',
      id: 'generators',
      title: "Stream, don't load",
      body: "A function containing `yield` returns a generator: it produces one item each time you ask, and remembers where it stopped. Memory stays flat whether the log has a hundred lines or a hundred million, and stages compose like a pipeline.\n\nThe catch: a generator is **single-use**. Once consumed, it's empty, and it won't tell you.",
      code: {
        code: `def records(path):
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#"):
                yield line.split(",")

errors = (r for r in records("app.log") if r[1] == "ERROR")
print(sum(1 for _ in errors))`,
      },
    },
    {
      kind: 'predict',
      id: 'exhausted',
      eyebrow: 'Predict',
      prompt: 'What does this print? (Three lines.)',
      code: `def evens(n):
    for i in range(n):
        if i % 2 == 0:
            yield i

g = evens(7)
print(sum(g))
print(sum(g))
print(list(evens(7))[-1])`,
      answers: ['12\n0\n6'],
      explanation:
        'The first `sum` consumes `g`: 0 + 2 + 4 + 6 = 12. The second `sum` gets an exhausted generator and quietly returns 0, no error. A fresh call to `evens(7)` starts over; its last value is 6. Need two passes? Rebuild the generator, or materialise a list once.',
      hint: "What's left in `g` after the first `sum`?",
    },
    {
      kind: 'cloze',
      id: 'ctxmgr',
      eyebrow: 'Fill in',
      prompt:
        '`with` guarantees cleanup, even when the body raises. `@contextmanager` lets you write one as a generator: setup before the `yield`, teardown after. Complete this helper that temporarily changes directory.',
      code: `import os
from contextlib import {{0}}

@contextmanager
def working_dir(path):
    old = os.getcwd()
    os.chdir(path)
    {{1}}:
        {{2}} path
    finally:
        os.chdir(old)

with working_dir("/tmp") as p:
    print("inside", p)`,
      blanks: [
        { options: ['closing', 'contextmanager', 'suppress', 'ExitStack'], answer: 1 },
        { options: ['with', 'while True', 'try'], answer: 2 },
        { options: ['yield', 'return', 'raise'], answer: 0 },
      ],
      explanation:
        'The decorator has to be imported by name. `try`/`finally` around the `yield` is what makes teardown run when the `with` body raises: the exception is re-raised at the `yield`, and `finally` still restores the directory. `yield path` is also what `as p` receives.',
      hint: 'Which statement pairs with `finally`?',
    },
    {
      kind: 'cloze',
      id: 'report',
      eyebrow: 'Fill in',
      prompt:
        'Small tools, one function: an early return, `setdefault` to group, `sorted` with a `key`, and `any`. Rank customers by **total** spend, then add a line if **any** order is over 7 days late.',
      code: `def report(orders):
    if not orders:
        return ["no orders"]
    groups = {}
    for o in orders:
        groups.{{0}}(o.customer, []).append(o.total)
    ranked = sorted(groups.items(), key={{1}}, reverse=True)
    lines = [f"{name}: {sum(ts):.2f}" for name, ts in ranked]
    if {{2}}(o.days > 7 for o in orders):
        lines.append("some orders are late")
    return lines`,
      blanks: [
        { options: ['get', 'setdefault', 'pop', 'update'], answer: 1 },
        { options: ['lambda kv: kv[1]', 'len', 'lambda kv: sum(kv[1])', 'sum'], answer: 2 },
        { options: ['all', 'next', 'list', 'any'], answer: 3 },
      ],
      explanation:
        "`get(k, [])` hands back a fresh list that's never stored, so the appends vanish; `setdefault` inserts it first. The key must compute the *total*: `kv[1]` would compare the lists element by element. `any` stops at the first late order. `all` asks a different question, `list(...)` is always truthy here, and `next` only checks the first order.",
      hint: 'You need the list to be stored in `groups`, and the ranking to use a single number per customer.',
    },
    {
      kind: 'concept',
      id: 'when-evaluated',
      title: 'Evaluated when?',
      body: "Two classic traps, one question: *when* does Python evaluate this?\n\nA default value is evaluated **once**, when `def` runs, so a mutable default (`[]`, `{}`, `set()`) is shared by every call. A closure reads its variables when it's **called**, not when it's created, so lambdas made in a loop all see the loop's final value.",
      code: {
        code: `def add(item, bucket=[]):     # one list, shared by every call
    bucket.append(item)
    return bucket

def add(item, bucket=None):   # the fix
    if bucket is None:
        bucket = []
    bucket.append(item)
    return bucket`,
      },
      callout: {
        tone: 'tip',
        text: '`@dataclass` refuses `tags: list = []` outright. Use `field(default_factory=list)` for a fresh list per instance, and `@dataclass(frozen=True)` for immutable, hashable records you can use as dict keys.',
      },
    },
    {
      kind: 'spotbug',
      id: 'shared-seen',
      eyebrow: 'Find the bug',
      prompt: "The first call prints `['a', 'b', 'c']`. The second, identical call prints `['a']`. Tap the line that causes it.",
      code: `from collections import deque

def crawl_order(start, links, seen=set()):
    order = []
    queue = deque([start])
    seen.add(start)
    while queue:
        page = queue.popleft()
        order.append(page)
        for nxt in links.get(page, []):
            if nxt not in seen:
                seen.add(nxt)
                queue.append(nxt)
    return order

links = {"a": ["b", "c"], "b": ["c"]}
print(crawl_order("a", links))
print(crawl_order("a", links))`,
      bugLines: [3],
      explanation:
        "`seen=set()` is evaluated once, when `def` runs. The first call fills that one set; the second call starts with every page already \"seen\". Tests that call the function once pass, which is how this survives into an interview.",
      fix: {
        code: `def crawl_order(start, links, seen=None):
    if seen is None:
        seen = set()
    ...`,
      },
      hint: 'Which object outlives a single call?',
    },
    {
      kind: 'spotbug',
      id: 'late-binding',
      eyebrow: 'Find the bug',
      prompt: 'A 50-character title should fail the 10-character limit, yet `validate` returns `[]`. Tap the buggy line.',
      code: `def make_validators(limits):
    """Map each field to a check: is the value short enough?"""
    checks = {}
    for name, max_len in limits.items():
        checks[name] = lambda value: len(value) <= max_len
    return checks


def validate(record, checks):
    return [f for f, ok in checks.items() if not ok(record.get(f, ""))]


checks = make_validators({"title": 10, "body": 200})
print(validate({"title": "x" * 50, "body": "hi"}, checks))`,
      bugLines: [5],
      explanation:
        'Each lambda looks up `max_len` when it is *called*. By then the loop has finished and `max_len` is 200, so every field gets the body\'s limit. Bind the value at creation time with a default argument, or use `functools.partial`.',
      fix: { code: `checks[name] = lambda value, limit=max_len: len(value) <= limit` },
      hint: 'When does the lambda read `max_len`?',
    },
    {
      kind: 'concept',
      id: 'recap',
      eyebrow: 'Recap',
      title: 'Keep these',
      body: "- Comprehensions build collections; loops do things. Generators stream, once.\n- Let structure carry meaning: unpacking, `enumerate`, `zip(strict=True)`, `with`, early returns.\n- Know *when* Python evaluates: defaults at `def` time, closures at call time.\n\nIdiomatic code is also easier to narrate, and easier for an interviewer to trust at a glance.",
    },
  ],
  cards: [
    {
      id: 'py-idioms.dict-dupes',
      skill: 'py.idioms',
      kind: 'predict',
      prompt: 'What does this print?',
      code: `pairs = [("a", 1), ("b", 2), ("a", 3)]
print({k: v for k, v in pairs})`,
      answers: ["{'a': 3, 'b': 2}"],
      explanation: "The last assignment to a key wins. The key keeps its original position (first inserted), but holds the latest value.",
    },
    {
      id: 'py-idioms.zip-strict',
      skill: 'py.idioms',
      kind: 'flash',
      front: "Two lists *should* be the same length. What does plain `zip` do if they aren't, and what's the safer call?",
      back: 'Plain `zip` silently stops at the shortest input. `zip(a, b, strict=True)` (Python 3.10+) raises `ValueError` on a length mismatch.',
    },
    {
      id: 'py-idioms.default-factory',
      skill: 'py.design',
      kind: 'cloze',
      prompt: 'Each `Crawl` needs its own list of seeds. Fill in the default.',
      code: `from dataclasses import dataclass, field

@dataclass
class Crawl:
    name: str
    seeds: list[str] = {{0}}`,
      blanks: [{ options: ['[]', 'list()', 'field(default_factory=list)', 'field(default=[])'], answer: 2 }],
      explanation:
        '`@dataclass` rejects mutable defaults like `[]`, `list()` or `field(default=[])` with a `ValueError` when the class is defined. `default_factory` calls `list()` once per instance.',
    },
    {
      id: 'py-idioms.thread-lambda',
      skill: 'py.idioms',
      kind: 'spotbug',
      prompt: '`fetch_all(["a", "b", "c"], fetch)` fetches `"c"` three times. Tap the bug.',
      code: `import threading

def fetch_all(urls, fetch):
    threads = []
    for url in urls:
        threads.append(threading.Thread(target=lambda: fetch(url)))
    for t in threads:
        t.start()
    for t in threads:
        t.join()`,
      bugLines: [6],
      explanation:
        'The lambda reads `url` when the thread runs, after the loop has moved on (late binding). Pass the value explicitly so it is captured now.',
      fix: { code: `threads.append(threading.Thread(target=fetch, args=(url,)))` },
    },
    {
      id: 'py-idioms.genexp-twice',
      skill: 'py.idioms',
      kind: 'predict',
      prompt: 'What does this print?',
      code: `squares = (x * x for x in range(4))
print(list(squares), list(squares))`,
      answers: ['[0, 1, 4, 9] []'],
      explanation: 'A generator expression is single-use. The first `list` drains it; the second gets nothing, silently.',
    },
    {
      id: 'py-idioms.any-short',
      skill: 'py.idioms',
      kind: 'predict',
      prompt: 'What does this print?',
      code: `def check(x):
    print("check", x)
    return x > 1

print(any(check(x) for x in [0, 2, 5]))`,
      answers: ['check 0\ncheck 2\nTrue'],
      explanation:
        '`any` stops at the first truthy result, and the generator expression is lazy, so `check(5)` never runs. With a list comprehension inside `any(...)`, all three calls would happen first.',
    },
    {
      id: 'py-idioms.frozen-key',
      skill: 'py.design',
      kind: 'predict',
      prompt: 'What does this print?',
      code: `from dataclasses import dataclass

@dataclass(frozen=True)
class Url:
    host: str
    path: str = "/"

seen = {Url("a.com"), Url("a.com", "/"), Url("b.com")}
print(len(seen))`,
      answers: ['2'],
      explanation:
        '`frozen=True` (with the default `eq=True`) generates `__hash__` from the fields, so equal records collapse in a set. `Url("a.com")` equals `Url("a.com", "/")`.',
    },
    {
      id: 'py-idioms.ctx-finally',
      skill: 'py.idioms',
      kind: 'flash',
      front: 'In a `@contextmanager` function, why wrap the `yield` in `try`/`finally`?',
      back: 'If the `with` body raises, the exception is re-raised at the `yield`. Without `finally`, your teardown (close, unlock, restore) never runs.',
    },
  ],
}

export default lesson
