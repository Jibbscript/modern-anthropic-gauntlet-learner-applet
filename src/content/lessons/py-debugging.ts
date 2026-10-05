import type { Lesson } from '../../core/types'

const TRACEBACK = `Traceback (most recent call last):
  File "main.py", line 7, in <module>
    report = build_report(rows)
  File "report.py", line 9, in build_report
    totals = summarize(r["amount"] for r in rows)
  File "report.py", line 5, in summarize
    return statistics.mean(values) / scale
  File ".../statistics.py", line 430, in mean
    T, total, n = _sum(data)
  File ".../statistics.py", line 193, in _sum
    for n, d in map(_exact_ratio, values):
  File ".../statistics.py", line 330, in _exact_ratio
    raise TypeError(msg)
TypeError: can't convert type 'str' to numerator/denominator`

const lesson: Lesson = {
  id: 'py-debugging',
  title: 'Debug unfamiliar code fast',
  summary: 'Read tracebacks from the bottom, shrink the failure, look around in pdb, and pull what you need from the docs in a minute.',
  minutes: 8,
  skills: ['py.debugging', 'py.docs'],
  steps: [
    {
      kind: 'concept',
      id: 'hook',
      eyebrow: "Code you didn't write",
      title: 'Fourteen lines of noise, one line of signal',
      body: "Someone else's report script crashes. Most people read the traceback top to bottom and land first on `main.py`, the frame that tells them least.\n\nPython prints the oldest call first and the newest last, so the exception's type and message are the **final** line. Candidate reports say the hard part of these practical rounds isn't the algorithm. It's reading APIs, debugging and testing.",
    },
    {
      kind: 'mcq',
      id: 'which-frame',
      eyebrow: 'Read the trace',
      prompt: '`build_report` crashed on a CSV export. Which frame do you read first?',
      code: { code: TRACEBACK, lang: 'text', caption: 'Trimmed: paths shortened, `^^^` markers removed.' },
      choices: [
        {
          text: "`main.py`, line 7: it's at the top, where the program started",
          feedback: 'The top is the oldest frame, the entry point. It tells you how you got here, not what went wrong.',
        },
        {
          text: '`report.py`, line 5, in `summarize`',
          correct: true,
          feedback: "Yes. It's the last frame in your code: the point where your values were handed to the library. Now ask what was in `values`.",
        },
        {
          text: "`statistics.py`, line 330: that's where the exception was raised",
          feedback: "It was raised there, but the standard library is the messenger. `mean()` is complaining about what it was given.",
        },
        {
          text: 'None yet: first search the codebase for *numerator/denominator*',
          feedback: 'That message comes from `statistics.py`, so searching your code finds nothing. Use the message to learn *what* went wrong, then go to your last frame.',
        },
      ],
      explanation: "Read bottom-up. The last line says **what**: a `str` reached code that expects numbers. Your last frame says **where** you handed it over. One frame up, line 9 passes `r[\"amount\"]`, and `csv.DictReader` yields every field as a string. Convert once, where the data enters.",
      hint: 'Which frames belong to code you can edit?',
    },
    {
      kind: 'concept',
      id: 'crash-site',
      title: 'The crash site is not the bug site',
      body: "The line that raises is where Python *noticed*. The bug is wherever the bad value was born, often a few frames up or a few lines earlier. So after the bottom line, ask two questions of your last frame: which value is wrong here, and where did it come from? Follow that value backward, one frame or one assignment at a time.",
      callout: {
        tone: 'tip',
        text: 'Two tracebacks joined by *The above exception was the direct cause of the following exception* print the **original** error first. The bottom one is what surfaced; the top one is why.',
      },
    },
    {
      kind: 'spotbug',
      id: 'shadowed',
      eyebrow: 'Spot the bug',
      prompt: "This raises `TypeError: 'list' object is not callable` on line 11. Tap the line that actually causes it.",
      code: `def summarize(events):
    by_user = {}
    for e in events:
        by_user.setdefault(e["user"], []).append(e)

    list = sorted(by_user, key=lambda u: -len(by_user[u]))
    top = list[:3]

    report = []
    for user in top:
        kinds = list({e["kind"] for e in by_user[user]})
        report.append((user, sorted(kinds)))
    return report`,
      bugLines: [6],
      explanation: "Line 6 rebinds the name `list` to a list of users, shadowing the builtin for the rest of the function. Line 11 is just where that's first noticed. Linters flag it as a redefined builtin; in review, watch for `list`, `dict`, `id`, `type`, `input` and `max` used as variable names.",
      fix: {
        code: `def summarize(events):
    by_user = {}
    for e in events:
        by_user.setdefault(e["user"], []).append(e)

    ranked = sorted(by_user, key=lambda u: -len(by_user[u]))
    top = ranked[:3]

    report = []
    for user in top:
        kinds = list({e["kind"] for e in by_user[user]})
        report.append((user, sorted(kinds)))
    return report`,
        highlight: [6, 7],
      },
      hint: 'Where did the name `list` stop meaning the builtin?',
    },
    {
      kind: 'concept',
      id: 'shrink',
      title: 'Shrink it, then halve it',
      body: "Before theorising, make the failure small and repeatable. Halve the input: if the bug survives in one half, keep that half and repeat. A million-line log shrinks to one bad line in about 20 halvings.\n\nThe same trick works on history. If it worked last week, `git bisect` binary-searches the commits, and `git bisect run` automates it with any command that exits non-zero on failure.",
      code: {
        lang: 'bash',
        code: `git bisect start
git bisect bad             # current commit is broken
git bisect good v1.4       # this tag worked
git bisect run pytest -x tests/test_report.py
git bisect reset`,
      },
    },
    {
      kind: 'numeric',
      id: 'bisect-cost',
      prompt: 'A regression landed somewhere in the last 600 commits. Your repro test takes 3 minutes. Roughly how many minutes does `git bisect run` need in the worst case?',
      answer: 30,
      tolerance: 0.25,
      unit: 'minutes',
      explanation: 'Each run halves the suspects: 600, 300, 150 and so on down to 1 takes 10 runs, because 2⁹ = 512 is too few and 2¹⁰ = 1024 is enough. Ten runs at 3 minutes is 30 minutes. Checking commits one by one could take 30 hours.',
      hint: 'How many times can you halve 600 before you reach 1?',
    },
    {
      kind: 'order',
      id: 'workflow',
      prompt: 'Put a debugging pass on unfamiliar code in order.',
      items: [
        'Read the last line: exception type and message',
        'Find the last frame in your own code and read it',
        'Reproduce it with the smallest input you can',
        'Form one hypothesis; check it with a print, assert or breakpoint',
        'Fix the cause where the bad value is born',
        'Keep the minimal repro as a regression test',
      ],
      explanation: "Read before touching anything, shrink before theorising, and test one hypothesis at a time so each check actually rules something out. People skip the last step, but the minimal repro is already a perfect test, so keep it.",
      hint: "You can't test a hypothesis about a failure you can't reproduce.",
    },
    {
      kind: 'concept',
      id: 'pdb',
      title: 'Stop the program and look',
      body: "`print` is fine for a 30-second check, and `logging` is for signals you'll keep. When you need to look around, put `breakpoint()` just before the trouble: Python stops there in `pdb` with every local in scope. `PYTHONBREAKPOINT=0` disables them all without editing code, and `python -m pdb -c continue app.py` stops at an uncaught crash.",
      code: {
        lang: 'text',
        code: `> report.py(9)build_report()
-> totals = summarize(r["amount"] for r in rows)
(Pdb) p rows[0]
{'id': '1', 'amount': '10'}
(Pdb) p type(rows[0]["amount"])
<class 'str'>`,
        caption: 'Two commands confirm the hypothesis from the traceback.',
      },
    },
    {
      kind: 'match',
      id: 'pdb-commands',
      prompt: 'Match each pdb command to what it does.',
      pairs: [
        { left: '`n`', right: 'Run the current line, stepping over any calls' },
        { left: '`s`', right: 'Step into the function called on this line' },
        { left: '`c`', right: 'Continue until the next breakpoint' },
        { left: '`p expr`', right: 'Print the value of an expression' },
        { left: '`w`', right: 'Show the call stack, marking the current frame' },
        { left: '`l`', right: 'List source around the current line' },
      ],
      explanation: '`n` versus `s` is the one to get right: `n` treats a call as one step, `s` goes inside it. Add `u` and `d` to move up and down the stack and inspect a caller\'s locals, and `pp` to pretty-print big structures.',
    },
    {
      kind: 'predict',
      id: 'predict-chunks',
      eyebrow: 'Predict',
      prompt: 'A helper from the codebase you inherited. What does this print?',
      code: `def chunks(xs, n):
    return [xs[i:i + n] for i in range(0, len(xs) - n, n)]

print(chunks([1, 2, 3, 4, 5, 6], 3))`,
      answers: ['[[1, 2, 3]]'],
      explanation: "`range(0, 6 - 3, 3)` is `range(0, 3, 3)`, which yields only `0`. The second chunk starts at `3`, which the stop value excludes. The fix is `range(0, len(xs), n)`: slicing past the end is safe in Python, so a short last chunk takes care of itself. Off-by-ones hide in stop values.",
      hint: 'Write out `range(0, 3, 3)` by hand.',
    },
    {
      kind: 'concept',
      id: 'read-docs',
      title: 'Read docs like a checklist',
      body: "Under time pressure, don't read docs top to bottom. Scan for:\n\n- **Signature**: required, optional, keyword-only\n- **Returns**: a new object, the same one, or `None`?\n- **Raises**: which exceptions, and when\n- **Mutates**: does it change its input?\n- **Cost** and **version notes** (*Changed in 3.x*)\n- **The example**: often the fastest spec\n\nIn a REPL, `help(x)`, `dir(x)` and `inspect.signature(f)` answer most of these.",
    },
    {
      kind: 'mcq',
      id: 'groupby-docs',
      prompt: 'The `itertools.groupby` docs say: *Generally, the iterable needs to already be sorted on the same key function.* What does this print?',
      code: {
        code: `from itertools import groupby

words = ["apple", "bob", "avocado", "bee"]
print([(k, len(list(g)))
       for k, g in groupby(words, key=lambda w: w[0])])`,
      },
      choices: [
        {
          text: "`[('a', 2), ('b', 2)]`",
          feedback: "That's what a `Counter` or a dict of lists gives. `groupby` only merges *consecutive* items with the same key, which is why the docs ask for sorted input.",
        },
        {
          text: "`[('a', 1), ('b', 1), ('a', 1), ('b', 1)]`",
          correct: true,
          feedback: 'Right. A new group starts every time the key changes. Sort by the same key first, or use a `defaultdict(list)`.',
        },
        {
          text: "`ValueError`, because the input isn't sorted",
          feedback: '`groupby` never checks sortedness. It silently does consecutive grouping, which is how this bug survives into production.',
        },
        {
          text: "`[('a', 1), ('b', 1)]`",
          feedback: 'Groups are not merged by key. Each run of equal keys becomes its own group, so `a` and `b` each appear twice.',
        },
      ],
      explanation: 'One clause in the docs carried the whole behaviour. That is typical: the gotcha usually sits in a short note about input requirements, ordering or mutation, so scan for exactly those.',
    },
    {
      kind: 'interview',
      id: 'debug-out-loud',
      eyebrow: 'Interview sim',
      setup: "Practical round, level 3. Your aggregator from level 2 gives wrong totals on the interviewer's new input. No crash, just wrong numbers. They're watching your screen.",
      turns: [
        {
          interviewer: "What's your first move?",
          options: [
            {
              text: 'Add prints through the aggregation loop and rerun the whole input.',
              quality: 'okay',
              feedback: "It might work, but on the full input you'll drown in output. Shrink first, then probe.",
            },
            {
              text: 'Rewrite the aggregation more cleanly; the bug will probably disappear.',
              quality: 'weak',
              feedback: "Rewriting without understanding trades a known bug for unknown ones, and the interviewer can't see any reasoning.",
            },
            {
              text: 'Turn their input into a failing test with the expected total, then halve the input until I have the smallest case that is still wrong.',
              quality: 'strong',
              feedback: 'Strong. A failing test plus a minimal case makes every later step fast and visible.',
            },
          ],
        },
        {
          interviewer: 'Your smallest failing case: totals go wrong only past 1,000 rows.',
          options: [
            {
              text: "1,000 smells like a batch size. I'll test exactly 1,000 and 1,001 rows and read the batching code's slices and range stop values.",
              quality: 'strong',
              feedback: 'Strong. You turned a number into a hypothesis and a targeted check.',
            },
            {
              text: 'Set a breakpoint at the top and step with `n` until something looks off.',
              quality: 'okay',
              feedback: 'It gets there eventually, but stepping blind through 1,000 rows is slow. Put the breakpoint where your hypothesis points.',
            },
            {
              text: 'Special-case inputs over 1,000 rows so the totals come out right.',
              quality: 'weak',
              feedback: 'That patches the symptom and guarantees the next boundary breaks too.',
            },
          ],
        },
        {
          interviewer: 'Found it: `range(0, len(rows) - size, size)` drops the last batch. Anything else before you move on?',
          options: [
            {
              text: "Fix the stop value and rerun the interviewer's input to confirm.",
              quality: 'okay',
              feedback: 'Necessary but not sufficient. Keep the minimal case as a test, and look for copies of the bug.',
            },
            {
              text: 'Fix it, keep the 1,001-row case as a regression test, and search for the same `len(...) - size` pattern elsewhere.',
              quality: 'strong',
              feedback: 'Strong. A regression test plus a search for siblings is what separates a fix from a patch.',
            },
            {
              text: "Move on. Time is short and it works now.",
              quality: 'weak',
              feedback: 'Keeping the test takes thirty seconds, and saying so shows the interviewer how you work.',
            },
          ],
        },
      ],
      wrapUp: 'Narrate as you go: what you see, what you suspect, and the check that will confirm it. The method is being scored as much as the fix.',
    },
    {
      kind: 'concept',
      id: 'recap',
      title: 'What to remember',
      body: "1. Read tracebacks bottom-up: the last line says what, your last frame says where. Then follow the bad value back to where it was born.\n2. Shrink before you theorise: halve the input, `git bisect` the history, one hypothesis per check.\n3. Scan docs for signature, return value, exceptions, mutation, cost and version notes. The gotcha is usually one clause.",
    },
  ],
  cards: [
    {
      id: 'py-debugging.chained',
      skill: 'py.debugging',
      kind: 'mcq',
      prompt: 'Where is the root cause in this chained traceback?',
      code: {
        lang: 'text',
        code: `Traceback (most recent call last):
  File "config.py", line 6, in load
    return int(cfg["retries"])
KeyError: 'retries'

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "config.py", line 10, in <module>
    load({})
  File "config.py", line 8, in load
    raise ConfigError("missing retries") from e
ConfigError: missing retries`,
      },
      choices: [
        { text: "The first error printed, the `KeyError`", correct: true, feedback: 'Yes. Python prints the original exception first, then the one raised while handling it.' },
        { text: 'The last line, `ConfigError: missing retries`', feedback: "That's what surfaced: a wrapper raised with `raise ... from e`. The cause is printed first." },
        { text: 'Whichever traceback has more frames', feedback: 'Frame count says nothing about causation. The chain order does.' },
      ],
      explanation: '`raise ... from e` prints *direct cause*; raising inside an `except` without `from` prints *During handling of the above exception*. Either way, the original error comes first.',
    },
    {
      id: 'py-debugging.dict-mutation',
      skill: 'py.debugging',
      kind: 'predict',
      prompt: 'What happens? Write the output, or the exception line.',
      code: `d = {"a": 1, "b": 0, "c": 2}
for k in d:
    if d[k] == 0:
        del d[k]
print(d)`,
      answers: ['RuntimeError: dictionary changed size during iteration', 'RuntimeError'],
      explanation: 'Deleting from a dict while iterating over it raises `RuntimeError: dictionary changed size during iteration`. Iterate over a snapshot (`for k in list(d):`) or build a new dict with a comprehension.',
    },
    {
      id: 'py-debugging.floor-div',
      skill: 'py.debugging',
      kind: 'predict',
      prompt: 'What does this print?',
      code: `print(7 // 2, -7 // 2, int(-7 / 2))`,
      answers: ['3 -4 -3'],
      explanation: '`//` floors toward negative infinity, so `-7 // 2` is `-4`. `int()` truncates toward zero, giving `-3`. Mixing the two on negative numbers is a classic bug in bucketing and pagination code.',
    },
    {
      id: 'py-debugging.halvings',
      skill: 'py.debugging',
      kind: 'numeric',
      prompt: 'One line in a 1,000,000-line input crashes your parser. About how many halvings does it take to isolate that line?',
      answer: 20,
      tolerance: 0.1,
      unit: 'halvings',
      explanation: '2²⁰ is about 1.05 million, so roughly 20 halvings. Binary search over inputs or commits turns "somewhere in here" into minutes of work.',
    },
    {
      id: 'py-debugging.sort-none',
      skill: 'py.docs',
      kind: 'mcq',
      prompt: 'After this runs, what is `names`?',
      code: {
        code: `names = ["bo", "al", "cy"]
names = names.sort()`,
      },
      choices: [
        { text: '`None`', correct: true, feedback: 'Yes. `list.sort()` sorts in place and returns `None`; the assignment throws the list away.' },
        { text: "`['al', 'bo', 'cy']`", feedback: "That's what `sorted(names)` returns. The method version returns `None`." },
        { text: "`['bo', 'al', 'cy']`", feedback: 'The sort did happen, in place, but then `names` was rebound to the return value.' },
        { text: 'A `TypeError`', feedback: "Nothing here raises, which is what makes it nasty: it fails later, as `'NoneType' object is not iterable`." },
      ],
      explanation: 'Docs checklist item: **returns**. Methods that mutate in place (`list.sort`, `list.reverse`, `random.shuffle`, `dict.update`) return `None` by convention.',
    },
    {
      id: 'py-debugging.introspect',
      skill: 'py.docs',
      kind: 'match',
      prompt: 'Match each REPL tool to the question it answers fastest.',
      pairs: [
        { left: '`help(obj)`', right: 'What does the docstring say?' },
        { left: '`dir(obj)`', right: 'Which attributes and methods does it have?' },
        { left: '`inspect.signature(f)`', right: 'Which parameters and defaults does it take?' },
        { left: '`inspect.getsource(f)`', right: 'What does the code actually do?' },
        { left: '`type(obj).__mro__`', right: 'Which classes does it inherit from?' },
      ],
      explanation: 'When docs are thin, the object documents itself. `inspect.getsource` raises `TypeError` for builtins written in C, such as `len`; use `help` there.',
    },
    {
      id: 'py-debugging.docs-scan',
      skill: 'py.docs',
      kind: 'flash',
      front: 'You have 60 seconds with an unfamiliar API page. What do you scan for?',
      back: 'Signature (including keyword-only args), return value (new object, same object or `None`), exceptions raised, whether it mutates input, cost, version notes, and the example.',
    },
    {
      id: 'py-debugging.step-into',
      skill: 'py.debugging',
      kind: 'mcq',
      prompt: "You're stopped in pdb on `total = compute(rows)` and suspect the bug is inside `compute`. Which command?",
      choices: [
        { text: '`s`', correct: true, feedback: 'Yes. `s` steps into the call and stops on the first line of `compute`.' },
        { text: '`n`', feedback: '`n` runs `compute` as one step and stops on the next line, so you skip right past the inside.' },
        { text: '`c`', feedback: '`c` runs until the next breakpoint, possibly to the end of the program.' },
        { text: '`w`', feedback: '`w` prints the stack but does not move execution.' },
      ],
      explanation: '`n` steps over a call, `s` steps into it. Once inside, `u` takes you back up to the caller without leaving the debugger.',
    },
  ],
}

export default lesson
