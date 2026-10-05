import type { Lesson } from '../../core/types'

const lesson: Lesson = {
  id: 'build-stacktrace',
  title: 'Stack traces and profiles',
  summary: 'Parse tracebacks into frames, group crashes by signature, and turn profiler samples into begin/end events.',
  minutes: 9,
  skills: ['build.stacktrace'],
  steps: [
    {
      kind: 'concept',
      id: 'hook',
      eyebrow: 'Commonly reported',
      title: 'Fifty thousand crashes, four bugs',
      body:
        'Overnight your service logged 50,000 tracebacks. Nobody reads 50,000 tracebacks. Someone needs to say: these are four bugs, and this one is 80% of them.\n\n' +
        'That is stack-trace processing: parse text into frames, then turn frames into something a person can act on. This lesson does it twice, for crash reports and for profiler samples.',
      callout: {
        tone: 'insight',
        text: 'Stack-trace processing is among the practical problems candidates report. The exact prompt varies; the parsing, grouping, and diffing skills here carry over to whichever version you get.',
      },
    },
    {
      kind: 'concept',
      id: 'anatomy',
      title: 'Read a traceback bottom-up',
      body:
        'Python prints frames ==most recent call last==. The first `File` line is where the program started; the last one is where the exception was raised. The final line is the exception type and message.\n\n' +
        'Since 3.11, a frame can carry `^^^^` or `~~~~` markers under the failing expression. Your parser should skip them.',
      code: {
        lang: 'text',
        code: `Traceback (most recent call last):
  File "/srv/app/main.py", line 6, in <module>
    handle({"id": 48213})
  File "/srv/app/main.py", line 4, in handle
    return get_user(req["id"])
           ^^^^^^^^^^^^^^^^^^^
  File "/srv/app/api.py", line 5, in get_user
    return fetch(rows, user_id)
           ^^^^^^^^^^^^^^^^^^^^
  File "/srv/app/db.py", line 2, in fetch
    return rows[user_id]
           ~~~~^^^^^^^^^
KeyError: 48213`,
        highlight: [10, 13],
      },
    },
    {
      kind: 'mcq',
      id: 'which-frame',
      prompt: 'Which function raised this exception?',
      code: {
        lang: 'text',
        code: `Traceback (most recent call last):
  File "/srv/app/jobs.py", line 7, in <module>
    run([])
  File "/srv/app/jobs.py", line 4, in run
    total = summarize(batch)
            ^^^^^^^^^^^^^^^^
  File "/srv/app/report.py", line 2, in summarize
    return sum(r["amount"] for r in rows) / len(rows)
           ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^~~~~~~~~~~
ZeroDivisionError: division by zero`,
      },
      choices: [
        {
          text: '`run`',
          feedback: '`run` called the function that failed. It is one frame further from the crash.',
        },
        {
          text: '`summarize`',
          correct: true,
          feedback: 'Right. The last `File` line is the innermost frame, and the `^` marker points at the division.',
        },
        {
          text: '`<module>`',
          feedback: 'That is the outermost frame, where the script started. Tracebacks print most recent call last, so read from the bottom.',
        },
        {
          text: '`sum`',
          feedback: '`sum` returned 0 just fine; the division by `len(rows)` failed. And C builtins do not get `File` lines of their own.',
        },
      ],
      explanation: 'Read from the bottom: the exception line, then the frame just above it. The `^` under `/` pins the failing operation within that line.',
    },
    {
      kind: 'concept',
      id: 'parse',
      title: 'Parse lines into frames',
      body:
        'One regex covers the `File "…", line N, in func` lines. The exception is the last unindented line that is not the header. Everything else, source lines and markers, gets skipped.\n\n' +
        'Keep frames in printed order, outermost first, so `frames[-1]` is where it blew up.',
      code: {
        code: `import re

FRAME = re.compile(r'^\\s*File "(?P<file>[^"]+)", line (?P<line>\\d+), in (?P<func>.+)$')

def parse(tb: str) -> tuple[str, list[tuple[str, int, str]]]:
    frames, exc_type = [], ""
    for line in tb.splitlines():
        if m := FRAME.match(line):
            frames.append((m["file"], int(m["line"]), m["func"]))
        elif line and not line[0].isspace() and not line.startswith("Traceback"):
            exc_type = line.split(":", 1)[0]
    return exc_type, frames`,
      },
    },
    {
      kind: 'sort',
      id: 'signature',
      eyebrow: 'Group them',
      prompt: 'To group crash reports you build a *signature*: the parts that stay the same every time the same bug fires. Sort each piece.',
      buckets: [
        { id: 'in', label: 'In the signature' },
        { id: 'out', label: 'Leave it out' },
      ],
      items: [
        { text: 'Exception type, e.g. `KeyError`', bucket: 'in', why: 'Different types are almost always different bugs.' },
        { text: 'File and function of the 2-3 innermost frames in your own code', bucket: 'in', why: 'Where in *your* code it failed, which is what an owner fixes.' },
        { text: 'The message `user 48213 not found`', bucket: 'out', why: 'IDs vary per occurrence, so every crash would become its own group.' },
        { text: 'Exact line numbers', bucket: 'out', why: 'An unrelated edit above the function shifts them and splits one bug across releases. Some tools accept that; say which you chose.' },
        { text: 'The `0x7f3a…` in `<Session object at 0x7f3a…>`', bucket: 'out', why: 'Memory addresses change on every run.' },
      ],
      explanation:
        'Keep what identifies the *bug*; drop what identifies the *occurrence*. Too specific and one bug splinters into thousands of groups; too vague (type only) and unrelated bugs merge. Innermost in-app frames are the usual middle ground.',
    },
    {
      kind: 'predict',
      id: 'group',
      prompt: 'Each crash is `(exception type, frames)`, innermost frame last. What does this print?',
      code: `from collections import Counter

crashes = [
    ("KeyError", ["api.py:get_user", "db.py:fetch"]),
    ("KeyError", ["api.py:get_user", "db.py:fetch"]),
    ("TimeoutError", ["api.py:get_user", "http.py:call"]),
    ("KeyError", ["api.py:list_users", "db.py:fetch"]),
]
groups = Counter((exc, tuple(frames[-2:])) for exc, frames in crashes)
print(len(groups), groups.most_common(1)[0][1])`,
      answers: ['3 2'],
      explanation:
        'Three signatures: the two identical `get_user → fetch` KeyErrors share one group (count 2), the TimeoutError differs by type, and `list_users → fetch` differs by frame. Note the `tuple(...)`: a list is unhashable, so it cannot be part of a dict key.',
      hint: 'A signature here is the exception type plus the last two frames.',
    },
    {
      kind: 'concept',
      id: 'samples',
      title: 'From samples to begin/end events',
      body:
        'A sampling profiler records the whole stack every few milliseconds. To draw a timeline (Chrome\'s trace format uses `B` and `E` events), diff each sample against the one before.\n\n' +
        'Find the ==common prefix==, comparing position by position from the root. Frames past it in the old stack *end*, innermost first. Frames past it in the new stack *begin*, outermost first.',
      code: {
        lang: 'text',
        code: `t=0   main > parse > lex
t=10  main > render
      common prefix: [main]
      at t=10: E lex, E parse, B render`,
      },
    },
    {
      kind: 'widget',
      id: 'sampler',
      eyebrow: 'Your turn',
      prompt: 'Step through these samples. For each one, mark which frames end and which begin compared with the previous sample.',
      goal: 'Mark every sample correctly',
      widget: {
        id: 'sampler',
        config: {
          samples: [
            ['main'],
            ['main', 'parse'],
            ['main', 'parse', 'lex'],
            ['main', 'parse', 'lex'],
            ['main', 'render'],
            ['main', 'render', 'render'],
            ['main'],
          ],
          goal: 'events',
        },
      },
      explanation:
        'Two edge cases hid in there. The repeated `lex` sample produces no events: the open frames simply continue. And `render > render` is recursion: the second `render` sits at a new depth, so it begins even though the name is already on the stack.',
    },
    {
      kind: 'cloze',
      id: 'prefix-loop',
      prompt: 'Complete the converter. Events are `("B" or "E", name, time)`, and `end` is when the last sample stops.',
      code: `def to_events(samples: list[list[str]], ts: list[float], end: float):
    events, prev = [], []
    for t, stack in zip(ts, samples):
        i = 0
        while i < min(len(prev), len(stack)) and {{0}}:
            i += 1
        for name in {{1}}:
            events.append(("E", name, t))
        for name in stack[i:]:
            events.append(("B", name, t))
        prev = stack
    for name in {{2}}:
        events.append(("E", name, end))
    return events`,
      blanks: [
        { options: ['prev[i] in stack', 'prev[i] == stack[i]', 'prev[-1] == stack[-1]'], answer: 1 },
        { options: ['prev[i:]', 'reversed(prev[i:])', 'reversed(stack[i:])'], answer: 1 },
        { options: ['reversed(prev)', 'prev', 'stack[i:]'], answer: 0 },
      ],
      explanation:
        'Compare by ==position==, `prev[i] == stack[i]`; membership breaks on recursion. Old frames end innermost first, so walk `prev[i:]` reversed. After the last sample, everything still open closes at `end`, again innermost first, so the events nest like a stack.',
      hint: 'Ends must come out in the opposite order to how those frames began.',
    },
    {
      kind: 'predict',
      id: 'events',
      prompt: 'Using `to_events` from the last step, with `+name` for a begin and `-name` for an end, what does this print?',
      code: `samples = [["main"], ["main", "f"], ["main", "f", "f"], ["main", "g"]]
events = to_events(samples, [0, 10, 20, 30], end=40)
print(" ".join(("+" if kind == "B" else "-") + name
               for kind, name, _ in events))`,
      answers: ['+main +f +f -f -f +g -g -main'],
      explanation:
        't=0 begins `main`; t=10 begins `f`. t=20 is recursion: the prefix is `[main, f]`, so a second `f` begins. t=30 shares only `main`, so both `f`s end, innermost first, and `g` begins. At t=40 the open stack closes: `g`, then `main`.',
      hint: 'At t=20, how long is the common prefix of `[main, f]` and `[main, f, f]`?',
    },
    {
      kind: 'spotbug',
      id: 'by-name',
      eyebrow: 'Find the bug',
      prompt: 'A teammate skipped the prefix loop. Simple stacks look fine, but `[main, f] → [main, f, f] → [main, g]` produces two `-f` events and only one `+f`. Tap the lines responsible.',
      code: `def to_events(samples, ts, end):
    events, prev = [], []
    for t, stack in zip(ts, samples):
        for name in reversed(prev):
            if name not in stack:
                events.append(("E", name, t))
        for name in stack:
            if name not in prev:
                events.append(("B", name, t))
        prev = stack
    for name in reversed(prev):
        events.append(("E", name, end))
    return events`,
      bugLines: [5, 8],
      explanation:
        'Membership compares by ==name==, not position. The recursive `f` is already "in" the previous stack, so it never begins, yet both copies end later, and the events stop nesting. A stack is a sequence: find the common prefix by index, then slice.',
      fix: {
        code: `        i = 0
        while i < min(len(prev), len(stack)) and prev[i] == stack[i]:
            i += 1
        for name in reversed(prev[i:]):
            events.append(("E", name, t))
        for name in stack[i:]:
            events.append(("B", name, t))`,
      },
      hint: 'Which comparison cannot tell two frames with the same name apart?',
    },
    {
      kind: 'concept',
      id: 'edges',
      title: 'Edge cases interviewers poke',
      body:
        '- **Identical samples**: no events; the open frames just get longer.\n' +
        '- **Recursion**: compare by position, so `f > f` is two frames.\n' +
        '- **The last sample**: close every open frame at a real end time, such as last timestamp plus one interval.\n' +
        '- **Many threads**: keep a separate `prev` per thread id.\n' +
        '- **Precision**: a frame seen in 3 samples ran for about 3 intervals, give or take one.',
    },
    {
      kind: 'interview',
      id: 'sim',
      eyebrow: 'Interview sim',
      setup: 'Your converter reproduces the example in the prompt. The interviewer keeps going.',
      turns: [
        {
          interviewer: 'How do you know the output is right beyond this one example?',
          options: [
            {
              text: 'I would add a few more hand-written examples and compare against expected output.',
              quality: 'okay',
              feedback: 'Useful, but examples only cover the cases you thought of. An invariant checks every input you throw at it.',
            },
            {
              text: 'Check invariants on every output: events nest like a stack, nothing is left open, and replaying the events rebuilds each sample. Then targeted cases: recursion, identical samples, empty input.',
              quality: 'strong',
              feedback: 'Properties that must hold for any input, plus the specific edge cases. That is testing your own implementation.',
            },
            {
              text: 'It matches the expected output, so I am fairly confident.',
              quality: 'weak',
              feedback: 'One example hides exactly the bugs this problem is about: recursion and the final close.',
            },
          ],
        },
        {
          interviewer: 'Samples now arrive from 8 threads, interleaved in one stream.',
          options: [
            {
              text: 'Sort everything by timestamp and run the same function.',
              quality: 'weak',
              feedback: 'Two threads\' stacks alternating would look like a full unwind and rewind at every switch: nonsense events.',
            },
            {
              text: 'Split the input by thread first, then run the converter once per thread.',
              quality: 'okay',
              feedback: 'Correct output, but it needs the whole stream in memory before it starts.',
            },
            {
              text: 'Key the state by thread id: a separate `prev` per thread, and events tagged with the thread. The diff logic does not change, and it still works in one streaming pass.',
              quality: 'strong',
              feedback: 'Minimal change, streaming, and it names what is per-thread (the state) versus shared (the logic).',
            },
          ],
        },
        {
          interviewer: 'Back to crash reports: one bug is showing up as thousands of separate groups. Why?',
          options: [
            {
              text: 'Something occurrence-specific leaked into the signature: a message with an ID, a line number that shifted across deploys, or an address. I would diff two groups that should be one and see which field differs.',
              quality: 'strong',
              feedback: 'A ranked set of suspects and a cheap experiment to tell them apart.',
            },
            {
              text: 'The grouping is too strict. I would group on exception type only.',
              quality: 'okay',
              feedback: 'That fixes the split, but now every `KeyError` in the codebase lands in one group.',
            },
            {
              text: 'Users trigger it in different ways, so they are probably different bugs.',
              quality: 'weak',
              feedback: 'The premise says it is one bug. Explaining away the data instead of checking the signature misses the point.',
            },
          ],
        },
      ],
      wrapUp:
        'Invariants for testing, state keyed by thread, and diagnosing grouping from the data: each strong answer reasons from the structure of the problem, not from one example.',
    },
    {
      kind: 'concept',
      id: 'recap',
      eyebrow: 'Recap',
      title: 'Three things to carry in',
      body:
        '1. **Tracebacks print most recent call last.** Parse `File` lines into frames; skip source and marker lines.\n' +
        '2. **Signature = exception type + innermost in-app frames.** Drop messages, addresses, anything that varies per occurrence.\n' +
        '3. **Samples to events = common-prefix diff by position.** End old frames innermost first, begin new ones outermost first, close everything at the end.',
    },
  ],
  cards: [
    {
      id: 'build-stacktrace.read-order',
      skill: 'build.stacktrace',
      kind: 'flash',
      front: 'In what order does a Python traceback list frames, and which `File` line is where the exception was raised?',
      back: 'Outermost first, most recent call last. The last `File` line, just above `Type: message`, is the frame that raised.',
    },
    {
      id: 'build-stacktrace.unwind-rewind',
      skill: 'build.stacktrace',
      kind: 'predict',
      prompt: '`to_events` diffs consecutive stacks by common prefix (compared by position), ends old frames innermost first, begins new ones outermost first, and closes everything at `end`. What does this print?',
      code: `events = to_events([["main", "a", "b"], ["main", "b"]], [0, 1], end=2)
print(" ".join(("+" if k == "B" else "-") + n for k, n, _ in events))`,
      answers: ['+main +a +b -b -a +b -b -main'],
      explanation: 'The prefix is only `[main]`, because position 1 holds `a` before and `b` after. So `b` and `a` both end, and a new `b` begins one level higher, even though a `b` was already open.',
    },
    {
      id: 'build-stacktrace.event-count',
      skill: 'build.stacktrace',
      kind: 'numeric',
      prompt: 'The previous sample is `[main, a, b, c]` and the next is `[main, a, x, y]`. How many begin and end events does the diff emit at the second sample?',
      answer: 4,
      tolerance: 0,
      unit: 'events',
      explanation: 'Common prefix `[main, a]`. End `c` and `b` (2), begin `x` and `y` (2): 4 events.',
    },
    {
      id: 'build-stacktrace.message-in-sig',
      skill: 'build.stacktrace',
      kind: 'spotbug',
      prompt: 'This signature splits one `KeyError` bug into 9,000 groups. Which line?',
      code: `def signature(exc_type: str, message: str, frames: list[Frame]) -> tuple:
    app = [f for f in frames if "site-packages" not in f.file]
    top = app[-3:]
    return (exc_type, message, tuple((f.file, f.func) for f in top))`,
      bugLines: [4],
      explanation: 'The message carries per-occurrence data (`KeyError: 48213`), so every user ID becomes its own group. Keep the type and innermost in-app frames; show messages as samples inside a group.',
    },
    {
      id: 'build-stacktrace.diff-steps',
      skill: 'build.stacktrace',
      kind: 'order',
      prompt: 'Order the work done for each new stack sample.',
      items: [
        'Find the common-prefix length `i`, comparing by position',
        'Emit `E` for `prev[i:]`, innermost first',
        'Emit `B` for `stack[i:]`, outermost first',
        'Set `prev = stack`',
      ],
      explanation: 'Ends before begins keeps the events properly nested: a frame closes before its replacement opens at the same depth.',
    },
    {
      id: 'build-stacktrace.why-position',
      skill: 'build.stacktrace',
      kind: 'mcq',
      prompt: 'Why diff profiler stacks by position rather than by checking whether a function name is present?',
      choices: [
        { text: 'Recursion: `f` calling `f` is two frames with one name', correct: true },
        { text: 'Indexing is faster than set membership', feedback: 'Speed is not the issue here; name-based diffs give wrong answers.' },
        { text: 'Samples do not record function names', feedback: 'They do: a sample is a list of frame names, root first.' },
        { text: 'Python reuses frame objects between samples', feedback: 'Frame identity is not what the diff compares; the sampled stacks are plain lists of names.' },
      ],
      explanation: 'A stack is a sequence. The same name can appear at several depths, so only position tells you whether a frame continued or a new one began.',
    },
    {
      id: 'build-stacktrace.anatomy',
      skill: 'build.stacktrace',
      kind: 'match',
      prompt: 'Match each traceback line to what it tells you.',
      pairs: [
        { left: '`Traceback (most recent call last):`', right: 'Header: frames follow, outermost first' },
        { left: '`File "db.py", line 2, in fetch`', right: 'One frame: file, line number, function' },
        { left: '`    return rows[user_id]`', right: 'The source line that frame was running' },
        { left: '`~~~~^^^^^^^^^`', right: 'Marker under the failing expression (3.11+)' },
        { left: '`KeyError: 48213`', right: 'Exception type, then its message' },
      ],
      explanation: 'A parser keeps the `File` lines and the final exception line, and skips source and marker lines.',
    },
  ],
}

export default lesson
