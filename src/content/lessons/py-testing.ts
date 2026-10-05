import type { Lesson } from '../../core/types'

const lesson: Lesson = {
  id: 'py-testing',
  title: 'Test your own code',
  summary: 'Find the inputs that break your code before the interviewer does, then prove it with tests that can actually fail.',
  minutes: 8,
  skills: ['py.testing'],
  steps: [
    {
      kind: 'concept',
      id: 'hook',
      eyebrow: 'The last level',
      title: 'It passed the example',
      body: "You wrote `top_k`, ran the prompt's example, and got the right answer. Then the interviewer asks: *how do you know it works?*\n\nCandidates report that Anthropic's practical rounds often end right there: build it, extend it, make it concurrent, then test it yourself. There's no hidden test suite. The prompt's example is your weakest test, because it's the case you were already thinking about.",
      code: {
        code: `from collections import Counter

def top_k(words: list[str], k: int) -> list[str]:
    """The k most frequent words, most frequent first."""
    counts = Counter(words)
    return [w for w, _ in counts.most_common(k)]

top_k(["a", "b", "a", "c"], 1)  # ['a']`,
      },
    },
    {
      kind: 'mcq',
      id: 'which-inputs',
      eyebrow: 'Your turn',
      prompt: 'You have time for three more tests of `top_k`. Which inputs are worth it? Select all that apply.',
      multi: true,
      choices: [
        {
          text: 'Two words tied for the last slot, like `top_k(["a", "b"], 1)`',
          correct: true,
          feedback: "Yes. The docstring never says who wins a tie. `most_common` keeps first-seen order for equal counts, so you get `['a']`, but you should decide that on purpose and pin it down.",
        },
        {
          text: '`k` larger than the number of distinct words',
          correct: true,
          feedback: 'Yes. It quietly returns fewer than `k` items. Is that the contract, or should it raise? Writing the test forces the decision.',
        },
        {
          text: 'An empty list',
          correct: true,
          feedback: 'Yes. Empty input is the cheapest test there is, and it catches a surprising number of crashes in code that indexes or divides.',
        },
        {
          text: "The prompt's example again, run 100 times to check it's stable",
          feedback: '`top_k` is pure and deterministic, so repetition adds nothing. Repeating a test only helps when something is nondeterministic, like threads or time.',
        },
        {
          text: 'A longer list, with `expected` computed by calling `top_k`',
          feedback: 'That compares `top_k` with itself, so it can never fail. Expected values must come from the spec or from working it out by hand.',
        },
      ],
      explanation: "Good tests hunt for **equivalence classes** the example didn't cover. A checklist: empty, one item, duplicates and ties, boundaries (`0`, `1`, `n`, `n + 1`), unicode and case, huge inputs, concurrent callers. You won't test them all. Pick the ones where the code or the spec is ambiguous.",
      hint: "Look for inputs where the docstring doesn't tell you the answer.",
    },
    {
      kind: 'concept',
      id: 'plain-assert',
      title: 'Plain assert is a test suite',
      body: "You don't need a framework to start. Write `assert` lines under the function as you go, then move them into `test_` functions as the file grows. pytest collects every `test_*` function in `test_*.py` files and rewrites plain `assert` so a failure shows both sides. To check for an error, wrap the call in `pytest.raises`.",
      code: {
        code: `import pytest
from textstats import top_k

def test_empty():
    assert top_k([], 3) == []

def test_tie_keeps_first_seen():
    assert top_k(["b", "a", "a", "b"], 1) == ["b"]

def test_negative_k_is_an_error():
    with pytest.raises(ValueError):
        top_k(["a"], -1)`,
      },
      callout: {
        tone: 'insight',
        text: "The last test fails today: `most_common(-1)` silently returns `[]`. That's the point. A test records a decision. Now go add the check to `top_k`.",
      },
    },
    {
      kind: 'predict',
      id: 'predict-pytest',
      eyebrow: 'Predict',
      prompt: "You run `pytest` on this file. What's the summary line? Answer in pytest's format, like `3 passed`.",
      code: `import pytest

def parse_port(s):
    n = int(s)
    if not 0 < n < 65536:
        raise ValueError(f"bad port: {n}")
    return n

def test_ok():
    assert parse_port("8080") == 8080

def test_zero():
    with pytest.raises(ValueError):
        parse_port("0")

def test_junk():
    with pytest.raises(TypeError):
        parse_port("http")`,
      answers: ['1 failed, 2 passed', '2 passed, 1 failed', '1 failed 2 passed', '2 passed 1 failed'],
      explanation: "pytest prints `1 failed, 2 passed`. `test_junk` fails because `int(\"http\")` raises `ValueError`, not `TypeError`. `pytest.raises` only catches the type you name, so the `ValueError` escapes and fails the test. Check what a call actually raises before you write the assertion.",
      hint: "What does `int()` raise when it can't parse a string?",
    },
    {
      kind: 'concept',
      id: 'tables',
      title: 'One table, many cases',
      body: "When cases share a shape, write a table. `@pytest.mark.parametrize` runs one test per row, names each row in the output, and turns a new edge case into a one-line change.\n\nSetup that tests share goes in **fixtures**: arguments pytest fills in by name. The built-in `tmp_path` gives each test its own fresh directory, so file tests never collide.",
      code: {
        code: `def test_reads_file(tmp_path):
    p = tmp_path / "words.txt"
    p.write_text("a b a")
    assert top_k_file(p, 1) == ["a"]`,
      },
    },
    {
      kind: 'cloze',
      id: 'cloze-parametrize',
      eyebrow: 'Fill it in',
      prompt: 'Turn three `top_k` cases into one table-driven test.',
      code: `import pytest
from textstats import top_k

@pytest.mark.{{0}}(
    "words, k, expected",
    [
        ([], 3, []),
        (["a"], 1, ["a"]),
        (["b", "a", "b"], 5, ["b", "a"]),
    ],
)
def test_top_k({{1}}):
    assert top_k(words, k) == {{2}}`,
      blanks: [
        { options: ['parametrize', 'parameterize', 'fixture', 'params'], answer: 0 },
        { options: ['words, k, expected', '*args', 'case', 'self, words, k'], answer: 0 },
        { options: ['expected', 'top_k(words, k)', 'sorted(words)[:k]'], answer: 0 },
      ],
      explanation: "pytest spells it `parametrize`. The common typo `parameterize` fails at collection with *Unknown mark*. The test's parameters must match the names in the first string, and the assert compares against `expected` from the table. Comparing with `top_k(words, k)` passes for any implementation.",
      hint: 'The test function receives one argument per column name.',
    },
    {
      kind: 'spotbug',
      id: 'never-fails',
      eyebrow: 'Spot the bug',
      prompt: 'Two of these tests pass for *any* deterministic `dedupe`, even one that returns its input unchanged. Tap the line that makes each one toothless.',
      code: `from textstats import dedupe

def test_empty():
    assert dedupe([]) == []

def test_keeps_first_occurrence():
    result = dedupe(["b", "a", "b", "c"])
    assert (result == ["b", "a", "c"], "order lost")

def test_no_duplicates_left():
    result = dedupe(["x", "y", "x"])
    assert len(result) == len(set(result))

def test_matches_reference():
    data = ["q", "p", "q"]
    assert dedupe(data) == dedupe(list(data))`,
      bugLines: [8, 16],
      explanation: "Line 8 asserts a tuple, and a non-empty tuple is always truthy. pytest does warn *assertion is always true*, but warnings scroll past. Line 16 compares `dedupe` with itself, so the code under test is also the oracle. Line 12 is a weak but real property test: it fails for the identity bug.",
      fix: {
        code: `def test_keeps_first_occurrence():
    result = dedupe(["b", "a", "b", "c"])
    assert result == ["b", "a", "c"], "order lost"

def test_matches_reference():
    assert dedupe(["q", "p", "q"]) == ["q", "p"]`,
        highlight: [3, 6],
      },
      hint: 'Imagine `dedupe = lambda xs: xs`. Which asserts still hold?',
    },
    {
      kind: 'concept',
      id: 'inject-clock',
      title: 'Never sleep in a test',
      body: "Code that reads the clock is awkward to test. Long sleeps make the suite slow; short ones make it flaky. Instead, take the clock as a parameter with the real one as the default. Production calls `TTLCache(10)`. The test passes a fake it controls and jumps time to exactly the boundary.",
      code: {
        code: `class TTLCache:
    def __init__(self, ttl, clock=time.monotonic):
        self.ttl, self.clock = ttl, clock
        ...

def test_expires_at_ttl():
    now = 100.0
    cache = TTLCache(ttl=10, clock=lambda: now)
    cache.put("a", 1)
    now = 109.9
    assert cache.get("a") == 1
    now = 110.0
    with pytest.raises(KeyError):
        cache.get("a")`,
      },
    },
    {
      kind: 'mcq',
      id: 'flaky-ttl',
      prompt: "A teammate's test puts a key in a 1-second TTL cache, sleeps 0.9 s and asserts it's still there. On busy CI it fails about once in 50 runs. The cache reads `time.monotonic()`. Best fix?",
      choices: [
        {
          text: 'Inject the clock and drive it from the test',
          correct: true,
          feedback: 'Right. The test controls time exactly, runs in microseconds, and can hit the boundary (`109.9` vs `110.0`) that real sleeps never land on reliably.',
        },
        {
          text: 'Sleep 0.5 s instead, to leave more margin',
          feedback: "Less flaky, still nondeterministic: a loaded machine can oversleep by any amount. And it never tests the boundary you actually care about.",
        },
        {
          text: 'Patch `time.time` with `monkeypatch` to freeze it',
          feedback: 'Tempting, but the cache calls `time.monotonic`, so patching `time.time` changes nothing. Patching also ties the test to which clock function the code happens to call.',
        },
        {
          text: 'Mark it flaky and let CI retry it three times',
          feedback: "Retries hide the symptom. If the flakiness is ever a real timing bug, you've taught CI to ignore it.",
        },
      ],
      explanation: '`time.sleep` can overshoot on a busy machine, so 0.9 s sometimes becomes more than 1 s. Time, randomness, network and threads are all inputs. Make them parameters (a `clock`, a seeded `random.Random`, a fetch function) and a test can pin them down.',
      hint: 'Which option takes real time out of the test entirely?',
    },
    {
      kind: 'concept',
      id: 'concurrent-tests',
      title: 'Testing code with threads',
      body: "A race might show up once in 10,000 runs, so one green run proves little. Three tools:\n\n- **Stress loop**: many threads and iterations, then assert an invariant. It raises the odds; it never proves absence.\n- **Forced interleaving**: a test seam (a hook, a `threading.Barrier`) makes both threads read before either writes, every run.\n- **Pure core**: keep the logic single-threaded and testable, and the threaded shell thin.",
    },
    {
      kind: 'widget',
      id: 'be-the-scheduler',
      eyebrow: 'Be the scheduler',
      prompt: 'Here you choose the interleaving, which is exactly what a deterministic test does. Make two increments produce the wrong count.',
      goal: 'Lose an update',
      widget: { id: 'race', config: { threads: 2, goal: 'lose-update' } },
      explanation: 'A stress loop hopes the scheduler does what you just did. A forced-interleaving test does it on purpose: put `Barrier(2)` between the read and the write and both threads read `0` before either stores `1`, every run. Without that, a stress test of this pattern on CPython can pass one run and lose a third of its updates the next.',
    },
    {
      kind: 'sort',
      id: 'unit-or-integration',
      prompt: 'Where does each test belong? **Unit**: one piece of logic, no real files, sockets or threads, milliseconds. **Integration**: real IO, or several components working together.',
      buckets: [
        { id: 'unit', label: 'Unit' },
        { id: 'integration', label: 'Integration' },
      ],
      items: [
        { text: '`top_k` breaks ties by first appearance', bucket: 'unit', why: 'Pure function, plain inputs.' },
        { text: 'A TTL entry expires at exactly `ttl`, with a fake clock', bucket: 'unit', why: 'Injecting the clock is what keeps this a unit test.' },
        { text: 'URL normaliser drops `#fragment` and lowercases the host', bucket: 'unit', why: 'String in, string out.' },
        { text: 'Crawler follows links served by a local test HTTP server', bucket: 'integration', why: 'Real sockets, real HTTP, several components.' },
        { text: 'Dedup finds duplicate files in a real `tmp_path` tree', bucket: 'integration', why: 'It exercises the filesystem, directory walking and hashing together.' },
        { text: 'Eight threads drain a shared queue of 10,000 jobs, none lost', bucket: 'integration', why: 'Real threads and a real queue: a stress test of the composition.' },
      ],
      explanation: "In an interview, lead with fast unit tests on the logic you just wrote, then add one or two integration tests that prove the pieces fit. If a unit test seems to need a real clock, network or thread, that's a hint to add a seam.",
    },
    {
      kind: 'interview',
      id: 'how-would-you-test',
      eyebrow: 'Interview sim',
      setup: "Practical round, final stretch. Your LRU cache works and you've just made it thread-safe with a lock. Twelve minutes left.",
      turns: [
        {
          interviewer: 'How would you test this?',
          options: [
            {
              text: "I'd write tests for get and put with a few different keys and check the results.",
              quality: 'okay',
              feedback: "Fine but generic. It doesn't say which cases are risky or why, so the interviewer learns little about your judgment.",
            },
            {
              text: "Riskiest first: eviction at exactly capacity, `get` refreshing recency, overwriting a key, capacity 1. One parametrized table for those, then a threaded stress test.",
              quality: 'strong',
              feedback: "Strong. You named cases, ranked them by risk and said how you'd structure them, all in one breath.",
            },
            {
              text: "The logic is simple and I traced it carefully, so I'm fairly confident it's correct.",
              quality: 'weak',
              feedback: 'Confidence is not evidence. The round is explicitly checking whether you verify your own work.',
            },
          ],
        },
        {
          interviewer: 'And the thread safety?',
          options: [
            {
              text: "Eight threads doing random gets and puts, then assert invariants: size never exceeds capacity, and the dict and recency list hold the same keys. A green run doesn't prove safety, so I'd also check every shared-state path holds the lock.",
              quality: 'strong',
              feedback: "Strong. Invariants instead of exact outputs, plus an honest statement of what a stress test can't prove.",
            },
            {
              text: "Concurrency bugs can't really be unit tested, so I'd rely on code review here.",
              quality: 'weak',
              feedback: 'Half true and fully unhelpful. Stress tests raise the odds, and test seams can force a specific interleaving every run.',
            },
            {
              text: 'Run a bunch of threads against it and make sure nothing crashes.',
              quality: 'okay',
              feedback: "A start, but 'nothing crashed' misses lost updates and corrupted state. Assert invariants, not just survival.",
            },
          ],
        },
        {
          interviewer: 'Your stress test failed once in 30 runs. What now?',
          options: [
            {
              text: "Rerun it a few times to confirm it's a real failure before digging in.",
              quality: 'okay',
              feedback: 'A reasonable instinct, but you already have the signal. More reruns spend time without adding information.',
            },
            {
              text: 'Add a retry so CI stays green, and note it as flaky.',
              quality: 'weak',
              feedback: 'A threaded test that fails 1 in 30 is usually reporting a real race. Retrying teaches everyone to ignore it.',
            },
            {
              text: "Treat it as a real race: log the broken invariant, look for a shared-state path outside the lock, then write a test that forces that interleaving so the fix is provable.",
              quality: 'strong',
              feedback: 'Strong. Turning a probabilistic failure into a deterministic test is the only way to know the fix worked.',
            },
          ],
        },
      ],
      wrapUp: 'The pattern: name risky cases out loud and rank them, cover the logic with a table, then test concurrency with invariants plus a forced interleaving. Say what each test can and cannot prove.',
    },
    {
      kind: 'concept',
      id: 'recap',
      title: 'What to remember',
      body: "1. Hunt equivalence classes, not more examples: empty, one, ties, boundaries, unicode, huge, concurrent.\n2. A test must be able to fail. Expected values come from the spec or your own hand calculation, never from the code under test.\n3. Make time, randomness and threads injectable, then test them deterministically. Say out loud what each test proves.",
    },
  ],
  cards: [
    {
      id: 'py-testing.checklist',
      skill: 'py.testing',
      kind: 'flash',
      front: 'You just wrote a function. Which edge-case families do you check?',
      back: 'Empty, one item, duplicates and ties, boundaries (`0`, `1`, `n`, `n + 1`), unicode and case, huge inputs, concurrent callers. Test first where the spec is ambiguous.',
    },
    {
      id: 'py-testing.collection',
      skill: 'py.testing',
      kind: 'predict',
      prompt: 'What does `pytest` report for this file?',
      code: `def add(a, b):
    return a + b

def test_add():
    assert add(2, 2) == 4

def check_add_negative():
    assert add(-1, -1) == 0`,
      answers: ['1 passed'],
      explanation: "pytest only collects functions whose names start with `test`. `check_add_negative` would fail (`-1 + -1` is `-2`), but it never runs.",
      hint: 'Which functions does pytest actually collect?',
    },
    {
      id: 'py-testing.raises-match',
      skill: 'py.testing',
      kind: 'cloze',
      prompt: 'Assert that `parse_port("70000")` raises *your* range error, not any `ValueError` from deeper down.',
      code: `def test_port_out_of_range():
    with pytest.{{0}}(ValueError, {{1}}="bad port"):
        parse_port("70000")`,
      blanks: [
        { options: ['raises', 'warns', 'fails'], answer: 0 },
        { options: ['match', 'message', 'expected'], answer: 0 },
      ],
      explanation: '`match` is a regex searched in `str(exc)`. Without it, the `ValueError` that `int("http")` raises inside `parse_port` would satisfy the test too.',
    },
    {
      id: 'py-testing.dead-assert',
      skill: 'py.testing',
      kind: 'spotbug',
      prompt: 'This test passes even though `cache_size()` returns 999. Tap the problem line.',
      code: `def test_rejects_negative_k():
    with pytest.raises(ValueError):
        top_k(["a"], -1)
        assert cache_size() == 0`,
      bugLines: [4],
      explanation: 'Once `top_k` raises, the rest of the `with` block is skipped, so the assert never executes. Put follow-up checks after the block.',
      fix: {
        code: `def test_rejects_negative_k():
    with pytest.raises(ValueError):
        top_k(["a"], -1)
    assert cache_size() == 0`,
        highlight: [4],
      },
    },
    {
      id: 'py-testing.why-inject',
      skill: 'py.testing',
      kind: 'mcq',
      prompt: 'Why give `TTLCache.__init__` a `clock=time.monotonic` parameter?',
      choices: [
        {
          text: 'So tests can swap in a fake clock and hit exact expiry boundaries without sleeping',
          correct: true,
          feedback: 'Yes. Production never passes it; tests pass a lambda over a variable they advance.',
        },
        {
          text: 'Because `time.monotonic` is faster to call than `time.time`',
          feedback: "Speed isn't the point. The parameter exists so a test can control time.",
        },
        {
          text: 'Because defaults are re-evaluated on every call, keeping the time fresh',
          feedback: 'Defaults are evaluated once, at definition. That is fine here: the default is the *function* `time.monotonic`, not a timestamp.',
        },
        {
          text: 'So the cache can be pickled and sent to worker processes',
          feedback: 'Unrelated. (A lambda clock would actually make pickling harder.)',
        },
      ],
      explanation: 'Dependency injection for time: the real clock in production, a controllable one in tests. Deterministic, fast and exact at the boundary.',
    },
    {
      id: 'py-testing.conc-tools',
      skill: 'py.testing',
      kind: 'match',
      prompt: 'Match each concurrency-testing technique to what it buys you.',
      pairs: [
        { left: 'Stress loop with an invariant check', right: "Raises the odds of hitting a race; can't prove there is none" },
        { left: '`threading.Barrier` between read and write', right: 'Forces one specific bad interleaving on every run' },
        { left: 'Pure core, thin threaded shell', right: 'Most logic gets fast single-threaded tests' },
        { left: 'Injected clock', right: 'Time-dependent behaviour becomes deterministic' },
      ],
      explanation: "Use them together: unit-test the pure core, force the interleavings you're worried about, then stress the whole thing and assert invariants.",
    },
    {
      id: 'py-testing.narrate',
      skill: 'py.testing',
      kind: 'compare',
      question: 'Interviewer: "You have five minutes. What will you test?"',
      a: "I'll add a few more tests to make sure everything works, then clean up the code.",
      b: "Two things. Ties first, because the spec doesn't say who wins, so I'll pin first-seen order. Then `k` larger than the vocabulary, where I'd expect a shorter list rather than an error.",
      better: 'b',
      explanation: 'B names the cases, why each is risky and what behaviour it expects. A could describe any test anyone has ever written, so it shows no judgment.',
    },
  ],
}

export default lesson
