import type { Lesson } from '../../core/types'

const STATS = `import threading

# Shared by all worker threads.
counts: dict[str, int] = {}
lock = threading.Lock()

def record(key: str) -> None:
    # dict ops are atomic under the
    # GIL, so this needs no lock
    counts[key] = counts.get(key, 0) + 1

def snapshot() -> dict[str, int]:
    with lock:
        return dict(counts)`

const LOAD_CONFIGS = `import json

def load_configs(paths):
    """Load each config file.

    Skips files that don't exist.
    """
    configs = []
    for p in paths:
        try:
            with open(p) as f:
                configs.append(json.load(f))
        except:
            pass
    return configs`

const lesson: Lesson = {
  id: 'agents-review',
  title: 'Reviewing AI-written code',
  summary: 'Catch the plausible-but-wrong patterns in generated code, and prove each one by running it.',
  minutes: 8,
  skills: ['agents.review', 'py.debugging'],
  steps: [
    {
      kind: 'concept',
      id: 'hook',
      eyebrow: 'Fluent is not correct',
      title: 'It reads well. Does it run?',
      body: "AI-written code fails differently from a tired colleague's. The names are tidy, the docstrings confident, the structure looks approvable. The bugs are *plausible*: a parameter that almost exists, a comment claiming thread safety, a test that agrees with the code because it was derived from it.\n\nCandidates report newer interview formats experimenting with agentic coding. Either way, reviewing generated code is now part of the job.",
    },
    {
      kind: 'spotbug',
      id: 'almost-api',
      eyebrow: 'Spot the bug',
      prompt: 'An assistant wrote this helper. It looks careful: parent directories, atomic rename, stable output. One line fails on the very first call.',
      code: `import json
from pathlib import Path

def save_snapshot(data, path: Path):
    """Stable, diff-friendly JSON."""
    path.parent.mkdir(parents=True,
                      exist_ok=True)
    text = json.dumps(data, sort=True,
                      indent=2)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(text)
    tmp.replace(path)  # atomic rename`,
      bugLines: [8],
      explanation: "`json.dumps` has no `sort` parameter; it's `sort_keys`. The call raises `TypeError: ... unexpected keyword argument 'sort'`. A hallucinated parameter is the easiest AI bug to catch, but only if you run the code, because it reads perfectly.",
      fix: {
        code: `import json
from pathlib import Path

def save_snapshot(data, path: Path):
    """Stable, diff-friendly JSON."""
    path.parent.mkdir(parents=True,
                      exist_ok=True)
    text = json.dumps(data, sort_keys=True,
                      indent=2)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(text)
    tmp.replace(path)  # atomic rename`,
        highlight: [8],
      },
      hint: 'Check every keyword argument against the real signature.',
    },
    {
      kind: 'concept',
      id: 'run-it',
      title: 'Run it before you read it closely',
      body: "Plausible bugs come in two kinds. **Loud** ones crash on the first call: a made-up function, a wrong keyword, a missing import. One run catches them all. **Quiet** ones run fine and return something wrong, or fail only at a boundary, under load or on bad input. Those need a targeted test or a careful read. Running is cheap, so run first and save your reading for the quiet ones.",
    },
    {
      kind: 'sort',
      id: 'loud-or-quiet',
      prompt: 'Would one quick run with an ordinary input reveal each bug?',
      buckets: [
        { id: 'loud', label: 'A quick run catches it' },
        { id: 'quiet', label: 'Needs a targeted test or a careful read' },
      ],
      items: [
        { text: '`json.dumps(data, sort=True)`', bucket: 'loud', why: '`TypeError` on the first call.' },
        { text: '`from itertools import chunked`', bucket: 'loud', why: '`ImportError` at import time. The real one is `itertools.batched`, new in Python 3.12.' },
        { text: '`range(len(xs) - w)` drops the last window', bucket: 'quiet', why: 'It returns a plausible list that is one element short.' },
        { text: '`except Exception: pass` around a config parse', bucket: 'quiet', why: 'A malformed file is skipped silently; a normal run looks fine.' },
        { text: '`time.sleep(0.5)` inside an `async def`', bucket: 'quiet', why: 'It works, just slowly. Blocking the event loop only shows with many tasks.' },
        { text: 'Unlocked `counts[k] = counts.get(k, 0) + 1` across threads', bucket: 'quiet', why: 'Single-threaded runs are correct; updates go missing only under contention.' },
      ],
      explanation: "Most dangerous patterns are quiet. That's why running is the first step of a review, not the last: it clears the loud bugs in seconds and leaves your attention for boundaries, error paths and shared state.",
    },
    {
      kind: 'spotbug',
      id: 'swallowed',
      prompt: "The docstring says it skips missing files. A teammate's config has a trailing comma, and the service silently starts with defaults. Tap the culprit.",
      code: LOAD_CONFIGS,
      bugLines: [13],
      explanation: "A bare `except:` catches everything: `JSONDecodeError`, typos that raise `NameError`, even `KeyboardInterrupt`. The docstring only promised to skip missing files, so catch exactly that and let parse errors raise with the filename attached.",
      fix: {
        code: `import json

def load_configs(paths):
    """Load each config file.

    Skips files that don't exist.
    """
    configs = []
    for p in paths:
        try:
            with open(p) as f:
                configs.append(json.load(f))
        except FileNotFoundError:
            continue
    return configs`,
        highlight: [13, 14],
      },
      hint: 'Which line decides *what* gets swallowed?',
    },
    {
      kind: 'mcq',
      id: 'blocking-async',
      prompt: 'There are 100 URLs, each with about 200 ms of network wait. The assistant says `gather` runs them concurrently. Roughly how long does `fetch_all` take?',
      code: {
        code: `import asyncio
import time

async def fetch_one(session, url):
    time.sleep(0.5)  # rate limit
    async with session.get(url) as r:
        return await r.text()

async def fetch_all(session, urls):
    tasks = [fetch_one(session, u)
             for u in urls]
    return await asyncio.gather(*tasks)`,
      },
      choices: [
        {
          text: 'About 0.7 seconds: all 100 run concurrently',
          feedback: "That's the author's mental model. It would hold with `await asyncio.sleep(0.5)`, which yields to the event loop.",
        },
        {
          text: 'About 50 seconds: the sleeps run one after another',
          correct: true,
          feedback: 'Right. `time.sleep` blocks the whole event loop, so 100 half-second sleeps run back to back. The network waits still overlap, adding only a fraction of a second.',
        },
        {
          text: 'About 70 seconds: everything runs sequentially',
          feedback: 'Close, but `await` on the network does yield, so the 200 ms waits overlap. Only the blocking sleeps serialise.',
        },
        {
          text: "It raises, because `time.sleep` isn't allowed in `async def`",
          feedback: "Python allows it, and that's the problem. Nothing warns you unless you run asyncio in debug mode, which logs slow steps.",
        },
      ],
      explanation: 'Any blocking call inside `async def` (`time.sleep`, `requests.get`, heavy CPU work) stalls every task on the loop. Use `await asyncio.sleep`, an async client, or `await asyncio.to_thread(...)` for blocking work you cannot avoid.',
      hint: 'While `time.sleep` runs, can the event loop switch to another task?',
    },
    {
      kind: 'concept',
      id: 'hidden-cost',
      title: 'Quadratic in disguise',
      body: "Generated code loves lists. Each of these looks like one cheap operation and is really a scan or a copy:\n\n- `x in some_list` checks every element\n- `queue.pop(0)` shifts every element left\n- `result = result + [x]` copies the whole list\n\nInside a loop over n items, each one turns O(n) into O(n²). Fine on the 10-item example, painful on real data.",
    },
    {
      kind: 'spotbug',
      id: 'quadratic-crawl',
      prompt: 'This BFS is correct, but it takes seconds on 20,000 pages where it should take milliseconds. Two lines each do O(n) work per step. Tap both.',
      code: `def crawl(start, get_links):
    queue = [start]
    seen = [start]
    while queue:
        url = queue.pop(0)
        for link in get_links(url):
            if link not in seen:
                seen.append(link)
                queue.append(link)
    return seen`,
      bugLines: [5, 7],
      explanation: '`queue.pop(0)` shifts the whole list and `link not in seen` scans it. Use a `deque` with `popleft()`, and a `set` for membership, keeping a list only if you need discovery order. In quick benchmarks on 20,000-node graphs, the fix took the crawl from seconds to milliseconds, a speedup of over 100x.',
      fix: {
        code: `from collections import deque

def crawl(start, get_links):
    queue = deque([start])
    seen, order = {start}, [start]
    while queue:
        url = queue.popleft()
        for link in get_links(url):
            if link not in seen:
                seen.add(link)
                order.append(link)
                queue.append(link)
    return order`,
        highlight: [1, 4, 5, 7, 10, 11, 13],
      },
      hint: 'Which operations walk the entire list each time they run?',
    },
    {
      kind: 'concept',
      id: 'mirror-tests',
      title: 'Tests that agree with the bug',
      body: "Ask an assistant for tests and you often get this: the expected value is computed with the same formula as the implementation. If the formula is wrong, both are wrong together and the test passes. Here the spec said prices round to cents, and neither the code nor its first test does. A test needs an independent oracle: a hand-worked value, a property, or a simpler reference implementation.",
      code: {
        code: `def discount(price, pct):
    return price - price * pct / 100

def test_discount():
    price, pct = 19.99, 15
    want = price - price * pct / 100
    assert discount(price, pct) == want

def test_rounds_to_cents():  # by hand
    assert discount(19.99, 15) == 16.99`,
      },
      callout: {
        tone: 'warn',
        text: 'Comments are claims too. *Thread-safe*, *O(1)*, *handles all edge cases*: treat each one as a hypothesis to check, not a fact.',
      },
    },
    {
      kind: 'mcq',
      id: 'red-flags',
      prompt: "You're skimming a 300-line AI-generated PR. Which of these deserve a closer look? Select all that apply.",
      multi: true,
      choices: [
        {
          text: 'A comment saying *safe under the GIL* above an unlocked read-modify-write',
          correct: true,
          feedback: 'Yes. The GIL keeps single operations atomic, not a read followed by a separate write. Updates get lost under contention.',
        },
        {
          text: 'Tests whose expected values come from helpers in the module under test',
          correct: true,
          feedback: 'Yes. If the oracle shares code with the implementation, a shared bug passes.',
        },
        {
          text: 'An abstract `BaseExporter` plus an `ExporterFactory`, with one exporter',
          correct: true,
          feedback: 'Yes. Speculative abstraction is a classic generated-code smell: more to review, no current benefit. Ask for the simple version.',
        },
        {
          text: '`pathlib.Path` used everywhere instead of `os.path`',
          feedback: "A style choice, and a reasonable modern one. Spend review attention on correctness.",
        },
        {
          text: 'Type hints on small private helper functions',
          feedback: 'Harmless and often helpful. Not where the bugs live.',
        },
      ],
      explanation: "Red flags are claims the code can't back up (a safety comment, a test's oracle) and complexity it hasn't earned. Style differences rarely hide bugs.",
    },
    {
      kind: 'compare',
      id: 'review-comment',
      question: 'Two review comments on the `load_configs` change. Which one gets the bug fixed?',
      a: 'This error handling looks a bit fragile. Maybe tighten it up and add some more tests?',
      b: 'Line 13: bare `except:` also swallows `JSONDecodeError`, so a config with a trailing comma is skipped silently and we boot with defaults. Suggest `except FileNotFoundError:` and letting parse errors raise with the path. Failing test attached.',
      better: 'b',
      explanation: 'B gives the line, a concrete failing input, the consequence and a fix, so the author can verify it in a minute. A is a vibe: the author, human or agent, has to rediscover the bug and may fix the wrong thing. The same shape works when your comment is a prompt to an agent.',
    },
    {
      kind: 'order',
      id: 'review-workflow',
      prompt: 'Put a review of an AI-generated change in order.',
      items: [
        'Write down what correct means, edge cases included, before reading the code',
        'Run it: the existing tests, then your own edge-case inputs',
        'Read closely: API calls against docs, error paths, shared state, loops',
        'Write a failing test for each bug you find',
        'Comment with the line, the input, the consequence and a fix',
        'Re-run everything once the fix lands',
      ],
      explanation: "Defining correct first stops fluent code from anchoring you. Running before reading clears the loud bugs cheaply. Failing tests turn opinions into evidence, and the re-run closes the loop, because fixes generated in a hurry have bugs too.",
      hint: 'You can only judge code against a definition of correct you already have.',
    },
    {
      kind: 'spotbug',
      id: 'gil-claim',
      eyebrow: 'Put it together',
      prompt: "Eight worker threads call `record`. The assistant's comment explains why no lock is needed. Tap the line that loses updates.",
      code: STATS,
      bugLines: [10],
      explanation: "Each dict operation is atomic, but line 10 is a read, an add, then a write, and another thread can run in between. In a CPython 3.11 stress run (8 threads × 100,000 calls), one run counted 800,000 and the next 491,463. The comment is half true, which makes it dangerous. The lock already exists; `record` just doesn't use it.",
      fix: {
        code: `def record(key: str) -> None:
    with lock:
        counts[key] = counts.get(key, 0) + 1`,
        highlight: [2, 3],
      },
      hint: 'Is the whole line one atomic step, or several?',
    },
    {
      kind: 'concept',
      id: 'recap',
      title: 'Your review checklist',
      body: "1. Decide what correct means, then run it. Loud bugs like made-up APIs and wrong keywords die on the first call.\n2. Hunt the quiet ones: boundaries, swallowed exceptions, blocking calls in `async`, unlocked shared state, scans inside loops.\n3. Treat comments and generated tests as claims. Check them against an independent oracle, and write review comments with line, input, consequence and fix.",
    },
  ],
  cards: [
    {
      id: 'agents-review.dict-get-kwarg',
      skill: 'agents.review',
      kind: 'spotbug',
      prompt: 'A generated config helper. Which line fails on the first call?',
      code: `def retry_settings(cfg: dict):
    """Retry settings, with defaults."""
    tries = cfg.get("tries", 3)
    wait = cfg.get("wait", default=0.5)
    return int(tries), float(wait)`,
      bugLines: [4],
      explanation: '`dict.get` takes its default positionally. `default=` raises `TypeError: dict.get() takes no keyword arguments`. Line 3 shows the right form. One run would have caught it.',
      fix: {
        code: `def retry_settings(cfg: dict):
    """Retry settings, with defaults."""
    tries = cfg.get("tries", 3)
    wait = cfg.get("wait", 0.5)
    return int(tries), float(wait)`,
        highlight: [4],
      },
    },
    {
      id: 'agents-review.loud',
      skill: 'agents.review',
      kind: 'mcq',
      prompt: 'Which bug will a single run with an ordinary input reliably expose?',
      choices: [
        {
          text: '`random.choice(items, k=3)`',
          correct: true,
          feedback: '`random.choice` has no `k`, so it raises `TypeError` immediately. You wanted `random.sample` (no repeats) or `random.choices` (with repeats).',
        },
        { text: 'An unlocked counter shared by worker threads', feedback: 'Single-threaded or lightly loaded runs come out right. It fails only under contention.' },
        { text: '`range(len(xs) - 1)` skipping the last element', feedback: 'It returns a plausible answer. Only a test with a known expected value catches it.' },
        { text: '`except Exception: pass` around a JSON parse', feedback: 'With good input nothing is thrown, so nothing looks wrong.' },
      ],
      explanation: 'Loud bugs (made-up names and parameters) fail on the first call. Quiet bugs need targeted tests or a careful read.',
    },
    {
      id: 'agents-review.async-sleep',
      skill: 'agents.review',
      kind: 'cloze',
      prompt: 'Make the rate-limit pause yield to the event loop instead of blocking it.',
      code: `async def fetch_one(session, url):
    {{0}} asyncio.{{1}}(0.5)
    async with session.get(url) as r:
        return await r.text()`,
      blanks: [
        { options: ['await', 'yield', 'async'], answer: 0 },
        { options: ['sleep', 'wait', 'timeout'], answer: 0 },
      ],
      explanation: '`await asyncio.sleep(0.5)` suspends only this task. `time.sleep(0.5)` freezes every task on the loop. `asyncio.wait` waits on a set of awaitables, and `asyncio.timeout` is a context manager.',
    },
    {
      id: 'agents-review.fixes',
      skill: 'agents.review',
      kind: 'match',
      prompt: 'Match each generated-code pattern to its fix.',
      pairs: [
        { left: '`queue.pop(0)` in a BFS loop', right: '`collections.deque` with `popleft()`' },
        { left: '`if x not in seen_list` inside a loop', right: 'Keep a `set` for membership' },
        { left: 'Bare `except: pass`', right: 'Catch only the exception you expect' },
        { left: '`time.sleep` inside `async def`', right: '`await asyncio.sleep(...)`' },
        { left: 'Unlocked `d[k] = d.get(k, 0) + 1` across threads', right: 'Hold a lock around the read-modify-write' },
      ],
      explanation: 'Each fix is small. The skill is noticing the pattern in fluent code that looks finished.',
    },
    {
      id: 'agents-review.oracle',
      skill: 'agents.review',
      kind: 'compare',
      question: 'Which test catches a `median` that forgets to sort its input?',
      a: '`xs = [3, 1, 2]`, then `expected = xs[len(xs) // 2]` and `assert median(xs) == expected`',
      b: '`assert median([3, 1, 2]) == 2` and `assert median([5, 1]) == 3.0`',
      better: 'b',
      explanation: "A computes `expected` exactly the way the buggy code does, so it agrees with the bug and passes. B uses hand-worked values, including an even-length case, so the missing sort fails it.",
    },
    {
      id: 'agents-review.window',
      skill: 'py.debugging',
      kind: 'spotbug',
      prompt: 'Generated, documented and validated. Which line is wrong?',
      code: `def moving_average(xs, w):
    """Mean of each size-w window."""
    if w <= 0:
        raise ValueError("w must be > 0")
    out = []
    for i in range(len(xs) - w):
        out.append(sum(xs[i:i + w]) / w)
    return out`,
      bugLines: [6],
      explanation: 'There are `len(xs) - w + 1` windows. `range(len(xs) - w)` drops the last one, so `moving_average([1, 2, 3], 3)` returns `[]` instead of `[2.0]`. Fluent code, tidy validation, classic off-by-one.',
      fix: {
        code: `def moving_average(xs, w):
    """Mean of each size-w window."""
    if w <= 0:
        raise ValueError("w must be > 0")
    out = []
    for i in range(len(xs) - w + 1):
        out.append(sum(xs[i:i + w]) / w)
    return out`,
        highlight: [6],
      },
    },
    {
      id: 'agents-review.checklist',
      skill: 'agents.review',
      kind: 'flash',
      front: 'Your six-step review of an AI-generated change?',
      back: 'Define correct (with edge cases), run it, read closely (APIs against docs, error paths, shared state, loops), write a failing test per bug, comment with line, input, consequence and fix, then re-run after the fix.',
    },
  ],
}

export default lesson
