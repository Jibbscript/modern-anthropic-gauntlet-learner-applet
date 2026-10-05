import type { Lesson } from '../../core/types'

const RETRY = `import pytest

def fetch(url, transport, sleep, attempts=3, base=0.5):
    tries = 0
    while True:
        tries += 1
        try:
            return transport.get(url)
        except ConnectionError:
            if tries > attempts:
                raise
            sleep(base * 2 ** (tries - 1))

def test_gives_up_after_three_attempts():
    t = FakeTransport(fail_times=5)
    with pytest.raises(ConnectionError):
        fetch("http://x", t, sleep=lambda s: None)
    assert t.calls == 4`

const RETRY_FIXED = `import pytest

def fetch(url, transport, sleep, attempts=3, base=0.5):
    tries = 0
    while True:
        tries += 1
        try:
            return transport.get(url)
        except ConnectionError:
            if tries >= attempts:
                raise
            sleep(base * 2 ** (tries - 1))

def test_gives_up_after_three_attempts():
    t = FakeTransport(fail_times=5)
    with pytest.raises(ConnectionError):
        fetch("http://x", t, sleep=lambda s: None)
    assert t.calls == 3`

const lesson: Lesson = {
  id: 'agents-workflow',
  title: 'Driving a coding agent',
  summary: 'Decompose, brief, verify every diff, and take the wheel when the agent loops. The agent types; you judge.',
  minutes: 9,
  skills: ['agents.workflow', 'agents.review'],
  steps: [
    {
      kind: 'concept',
      id: 'hook',
      eyebrow: 'Newer formats',
      title: "When the agent types, what's left to watch?",
      body: "In August 2026 a candidate reported an onsite round with a twist: online VS Code, four TypeScript pull requests, and Claude Code available. Part one: review and explain all four PRs. Part two: improve one.\n\nThey weren't sure what was being assessed. A working assumption: if the tool types faster than you, typing isn't the signal. Your judgment is.",
      callout: {
        tone: 'source',
        text: "Candidate report on [PracHub](https://prachub.com/interview-experiences/anthropic-software-engineer-interview-experience-reviewing-and-improving-pull-requests-with-claude-code), Aug 2026. Anthropic hasn't published a rubric for agent-assisted rounds, and formats change.",
      },
    },
    {
      kind: 'mcq',
      id: 'first-moves',
      prompt: "Agent-assisted round: a small repo, Claude Code, 45 minutes. What's the strongest first five minutes?",
      choices: [
        {
          text: 'Read the task and the code it touches, say a plan of small slices out loud, then brief the agent on the first',
          correct: true,
          feedback: 'Right. You build your own model of the code first, and your plan is visible from minute one.',
        },
        {
          text: 'Paste the whole task into the agent and let it run while you watch',
          feedback: "Fast to start, slow to finish: one giant diff you can't review, and nothing for the interviewer to see but waiting.",
        },
        {
          text: 'Ignore the agent and code it yourself to prove you can',
          feedback: 'Tempting if you type faster than you delegate. But the tool is part of the round; refusing it skips what they set up to observe.',
        },
        {
          text: 'Ask the agent for a plan and follow it step by step',
          feedback: 'A generated plan is a fine draft. Following it unread hands over the part that is most clearly your job.',
        },
      ],
      explanation: "Front-load understanding. A few minutes of reading gives you a model of the code, which you need anyway to judge every diff that follows. Saying the plan out loud turns invisible judgment into something the interviewer can score.",
    },
    {
      kind: 'concept',
      id: 'slices',
      title: 'Small slices, running plan',
      body: "Big asks produce big diffs, and big diffs get skimmed. Cut the task into slices that each end in a check you can run: a test goes green, a command prints the right thing.\n\nRough rule: if you can't review the diff in a couple of minutes, the slice was too big. Keep the plan as a checklist in a notes file. Tick items off, and rewrite it when reality changes.",
      callout: {
        tone: 'tip',
        text: 'Say each slice out loud as you start it. The interviewer can see your screen, not your reasons.',
      },
    },
    {
      kind: 'order',
      id: 'workflow',
      prompt: 'Put the workflow for one task with an agent in order.',
      items: [
        'Read the task and the code it touches; restate the goal out loud',
        'Write a short plan of slices, each with a check',
        'Brief the agent on one slice: context, constraints, done-when',
        'Read the diff, then run the tests yourself',
        'Tick the plan, adjust it, brief the next slice',
        'Before submitting, reread the whole diff for stray edits',
      ],
      explanation: "Understanding first, because you can't judge a diff against a goal you haven't stated. Then loop: brief, review, verify, update. The final full-diff read catches what slipped in along the way: a debug print, a loosened test, a file you never asked it to touch.",
      hint: "You can't review a change against a goal you haven't stated yet.",
    },
    {
      kind: 'concept',
      id: 'brief',
      title: 'A brief has four parts',
      body: "An agent knows only what it can see and what you tell it. Anything you leave out, it guesses. A good brief covers:\n\n1. **Context**: where the code lives, what already exists\n2. **Task**: one slice, stated as behaviour\n3. **Constraints**: what not to touch, no new dependencies, keep the API\n4. **Done when**: the check it must run, and the output it must show you",
    },
    {
      kind: 'compare',
      id: 'two-briefs',
      question: "You want retries in a crawler's fetcher. Which brief do you send the agent?",
      a: 'Add retries to the fetcher so it handles flaky networks. Make it robust and production quality.',
      b: 'In `crawler/fetch.py`, make `fetch(url)` retry `ConnectionError` and HTTP 5xx: 3 attempts, sleeping 0.5 s then 1 s. Never retry 4xx. Keep the signature; no new dependencies. Add tests in `tests/test_fetch.py` with a fake transport and an injected `sleep`, run them, and paste the output.',
      better: 'b',
      explanation: "B covers all four parts: file and function (context), exact behaviour (task), what stays fixed (constraints) and a test run with output (done when). A leaves every decision to the agent: which errors, how many tries, which files. *Robust* and *production quality* are vibes, not specs, so the minute you saved writing it goes on reviewing guesses.",
    },
    {
      kind: 'concept',
      id: 'claims',
      title: 'The summary is a claim. The diff is evidence.',
      body: "Agents end with a confident summary: *fixed the bug, all tests pass*. Often that's true. Sometimes it ran a subset, or ran the tests before its last edit, or reached green by changing the test instead of the code.\n\nSo read every diff. And treat test output you saw, from a run after the last change, as the only proof that tests pass.",
    },
    {
      kind: 'spotbug',
      id: 'test-edit',
      eyebrow: 'Read the diff',
      prompt: "Your brief said *up to 3 attempts*. A test failed, so you asked the agent to fix it. It changed one line and reports: *Fixed, all tests pass.* (`FakeTransport` raises `ConnectionError` for its first `fail_times` calls and counts calls.) Tap the line it changed and the line it should have changed.",
      code: RETRY,
      bugLines: [10, 18],
      explanation: "Line 18 is the agent's edit: it made the test agree with the code. The test was right. `tries > attempts` lets a fourth call through, so with `attempts=3` the fetcher tries 4 times. Fix line 10 to `>=` and put the test back to 3. A green run after a test edit is evidence about the new test, not about the code.",
      fix: { code: RETRY_FIXED, highlight: [10, 18] },
      hint: 'The test name states the spec. Which side disagrees with it?',
    },
    {
      kind: 'mcq',
      id: 'unseen-green',
      prompt: "The agent reports: *Added backoff. All 31 tests pass.* Scrolling back, you can't find a test command anywhere in its output. What do you do?",
      choices: [
        {
          text: 'Run the suite yourself, or have it run while you watch, and read the output before moving on',
          correct: true,
          feedback: 'Right. Seconds of cost, and the claim becomes evidence.',
        },
        {
          text: 'Trust it: agents report their own tool results accurately, and re-running wastes time',
          feedback: 'Usually accurate is not always accurate. A summary can describe an earlier run, a subset, or a hope.',
        },
        {
          text: "Ask the agent: 'Are you sure every test passed?'",
          feedback: 'Asking for the claim again gets you the claim again, often more confidently. You want output, not reassurance.',
        },
        {
          text: 'Keep going and run everything once at the end',
          feedback: 'Then a failure could come from any of several changes. Verifying each slice keeps the search to one diff.',
        },
      ],
      explanation: "Evidence beats assertion. The only proof is output from a run after the last edit. In an interview, say it: *It says green; I'll check.* That sentence shows the verification habit these rounds most plausibly reward.",
    },
    {
      kind: 'concept',
      id: 'loops',
      title: 'Notice the loop, take the wheel',
      body: "Agents get stuck in ways that look like progress. Watch for:\n\n- the same fix tried twice\n- errors that change but don't shrink\n- green bought by editing tests or adding a broad `except`\n- diffs that grow each round, or wander outside the slice\n\nWhen you see one, stop delegating. Read the error yourself and form a hypothesis. Then fix it by hand, or re-brief with that hypothesis.",
    },
    {
      kind: 'sort',
      id: 'delegate-or-drive',
      prompt: 'Keep delegating, or take the wheel?',
      buckets: [
        { id: 'keep', label: 'Keep delegating' },
        { id: 'wheel', label: 'Take the wheel' },
      ],
      items: [
        {
          text: 'Second attempt at the same import fix; the error is identical',
          bucket: 'wheel',
          why: 'Repeating a failed fix is the clearest loop signal. Read the error yourself.',
        },
        {
          text: 'First draft of a parser: 2 of 5 tests fail with clear messages',
          bucket: 'keep',
          why: 'Normal first-draft progress. Re-brief with the failures.',
        },
        {
          text: 'To get green, it wrapped the call in `try/except Exception: pass`',
          bucket: 'wheel',
          why: "It's optimising for green, not correctness. Revert and fix the cause.",
        },
        {
          text: 'It asks which HTTP status codes count as retryable',
          bucket: 'keep',
          why: "A good clarifying question. Answer it; that's spec it needs.",
        },
        {
          text: 'Each attempt adds more code, and now touches 3 unrelated files',
          bucket: 'wheel',
          why: 'Scope creep under failure. Stop, re-scope, re-brief.',
        },
        {
          text: 'It needs six more table-driven test cases following a pattern you wrote',
          bucket: 'keep',
          why: 'Well specified and cheap to check: ideal delegation.',
        },
      ],
      explanation: "Delegate work that is well specified and cheap to verify. Take over when attempts stop converging or start gaming the check. Saying which one you're doing, and why, is itself signal.",
    },
    {
      kind: 'interview',
      id: 'timeouts-round',
      eyebrow: 'Interview sim',
      setup: 'Agent-assisted round. A small Python job scheduler runs jobs in a `ThreadPoolExecutor`. Task: add per-job timeouts. Claude Code is available; 40 minutes.',
      turns: [
        {
          interviewer: 'How do you want to start?',
          options: [
            {
              text: 'Hand it the whole task and let it run. It types faster than I do, so that is the best use of time.',
              quality: 'weak',
              feedback: "You'll get one large diff you can't fully review, and the interviewer sees nothing of how you think.",
            },
            {
              text: "Five minutes reading the scheduler and its tests. Then a plan, out loud: a timeout field on jobs, enforcement in the runner, tests for each. I'll brief the agent one slice at a time.",
              quality: 'strong',
              feedback: 'Strong. You build a model of the code, decompose, and make the plan visible before anything is generated.',
            },
            {
              text: 'Ask the agent to summarise the codebase and propose a plan, then follow it.',
              quality: 'okay',
              feedback: "A reasonable accelerator, but now it's the agent's plan. Read enough code to judge the summary, and edit the plan before following it.",
            },
          ],
        },
        {
          interviewer: "Its runner diff uses `signal.alarm` with a handler, and the tests pass. Thoughts?",
          options: [
            {
              text: "Jobs run in pool threads, and Python only lets you install signal handlers from the main thread, so this can't work there. The tests probably call the runner on the main thread. I'd add a test that runs a slow job through the pool first.",
              quality: 'strong',
              feedback: 'Strong. You caught a plausible-but-wrong mechanism, explained why the tests miss it, and turned that into a test.',
            },
            {
              text: "Tests pass, and `signal.alarm` is a standard way to time out a call in Python. I'd accept it.",
              quality: 'weak',
              feedback: "Standard on the main thread only. In a pool worker, `signal.signal` raises `ValueError`. Green here says nothing about the workers.",
            },
            {
              text: "I'm not sure `signal` plays well with threads. I'd ask the agent to double-check, and read the docs if it hedges.",
              quality: 'okay',
              feedback: 'Right instinct, slow route. A five-line experiment or the docs settle it faster than another round of agent opinion.',
            },
          ],
        },
        {
          interviewer: "Its third attempt at cancelling a timed-out job fails with a new error. Now what?",
          options: [
            {
              text: 'Paste the full traceback back in and ask it to try again.',
              quality: 'okay',
              feedback: 'Sometimes fine. On a fourth attempt with errors that keep changing, it is more likely a loop than progress.',
            },
            {
              text: 'Ask it for a completely different approach, and keep going until something passes.',
              quality: 'weak',
              feedback: "That's the loop, accelerated. 'Until something passes' invites a green that games the test.",
            },
            {
              text: "Take the wheel. Three different errors means neither of us has a model of the bug. Python has no safe way to kill a thread, so real cancellation needs a cooperative check or a process. I'd decide which we need, then build it or re-brief.",
              quality: 'strong',
              feedback: 'Strong. You stopped the loop, named the real constraint, and turned it into a decision the interviewer can see.',
            },
          ],
        },
        {
          interviewer: 'Five minutes left. What do you do?',
          options: [
            {
              text: "Squeeze in one more feature with the agent. There's time for a quick one.",
              quality: 'weak',
              feedback: 'An unreviewed change in the last five minutes is how stray edits ship. Finishing cleanly beats finishing more.',
            },
            {
              text: "Reread the full diff for stray edits, run the whole suite, and tell you where it stands: what works, what's untested, and what I'd do next.",
              quality: 'strong',
              feedback: 'Strong. A verified, honest status is the best last five minutes of any round.',
            },
            {
              text: 'Ask the agent to write a summary of everything that changed.',
              quality: 'okay',
              feedback: 'A useful draft, but a summary of your work should come from you, checked against the diff.',
            },
          ],
        },
      ],
      wrapUp: 'Every strong answer did the same three things: kept your own model of the problem, checked claims against evidence, and said the reasoning out loud. The agent did the typing; you did the judging.',
    },
    {
      kind: 'reflect',
      id: 'your-workflow',
      eyebrow: 'Story Bank',
      prompt: "How do you use AI coding tools today, and where don't you trust them?",
      guidance: "Write it as you'd say it in an interview: your real workflow, not an ideal one. Include one time a tool was confidently wrong and how you caught it. If you rarely use these tools, say so and say why. That's an answer too.",
      rubric: [
        'Names a specific tool and a specific kind of task',
        'Says how you verify output: tests you run, diffs you read',
        'Includes one concrete time it was wrong, and how you noticed',
        'Names something you would not delegate, with a reason',
      ],
      slot: 'agent-workflow',
      placeholder: "I mostly use … for … I don't trust it with … Last month it …",
    },
    {
      kind: 'concept',
      id: 'recap',
      title: 'Driving, not riding',
      body: "1. **Decompose and brief**: small slices, each with context, constraints and a done-when check.\n2. **Verify everything yourself**: read every diff, and believe only test output you saw after the last edit.\n3. **Take the wheel when it loops**, and narrate your reasoning throughout. ==The agent types; the round is about how you judge.==",
    },
  ],
  cards: [
    {
      id: 'agents-workflow.brief-cloze',
      skill: 'agents.workflow',
      kind: 'cloze',
      prompt: 'Complete the brief so every line is checkable.',
      lang: 'text',
      code: `Context: cache.py holds an LRU cache shared by 8 worker threads.
Task: make get() and put() {{0}}.
Constraints: keep the public API; {{1}} new dependencies.
Done when: pytest tests/test_cache.py passes, incl. a new {{2}} test.
Then {{3}} the test output here.`,
      blanks: [
        { options: ['robust', 'thread-safe', 'faster'], answer: 1 },
        { options: ['no', 'minimal', 'any needed'], answer: 0 },
        { options: ['comprehensive', 'basic', 'multi-threaded stress'], answer: 2 },
        { options: ['summarise', 'paste', 'describe'], answer: 1 },
      ],
      explanation: "Each blank swaps a vibe for something checkable. *Thread-safe* is the property the context implies; *no* new dependencies is a hard line; a stress test actually exercises the threads; and pasted output is evidence where a summary is only a claim.",
    },
    {
      id: 'agents-workflow.agent-moves',
      skill: 'agents.workflow',
      kind: 'match',
      prompt: 'Match what the agent did to your next move.',
      pairs: [
        { left: "Reports *all tests pass* with no output shown", right: 'Run the suite and read the output' },
        { left: "Edited a test's expected value to get green", right: 'Revert the test; fix the code' },
        { left: 'Tried the same fix twice; same error', right: 'Read the error; form your own hypothesis' },
        { left: 'Diff touches files outside the slice', right: 'Reject the strays and re-scope the brief' },
        { left: 'Asks which errors count as retryable', right: "Answer it: that's spec it needs" },
      ],
      explanation: 'Claims get verified, gamed checks get reverted, loops get a human hypothesis, scope creep gets re-scoped, and good questions get answers.',
    },
    {
      id: 'agents-workflow.vacuous-test',
      skill: 'agents.review',
      kind: 'spotbug',
      prompt: "An agent says it 'fixed the flaky duplicate-files test'. The new version passes. Which line makes the test useless?",
      code: `def test_finds_duplicate_pair(tmp_path):
    (tmp_path / "a.txt").write_text("same")
    (tmp_path / "b.txt").write_text("same")
    (tmp_path / "c.txt").write_text("other")
    groups = find_duplicates(tmp_path)
    assert isinstance(groups, list)`,
      bugLines: [6],
      explanation: '`isinstance(groups, list)` also passes for `[]`, which is exactly what a broken `find_duplicates` would return. Pin the behaviour: one group holding a.txt and b.txt, with names sorted so file order cannot make it flaky.',
      fix: {
        code: `    assert [sorted(p.name for p in g) for g in groups] == [["a.txt", "b.txt"]]`,
      },
    },
    {
      id: 'agents-workflow.evidence',
      skill: 'agents.review',
      kind: 'mcq',
      prompt: 'An agent says *All 31 tests pass.* Which of these actually shows that?',
      choices: [
        { text: 'Test output from a run after its last edit, which you saw', correct: true, feedback: 'Right. Fresh output you saw is evidence; everything else is a claim.' },
        { text: "Its answer when you ask 'Are you sure?'", feedback: 'Repeating a claim, even more confidently, is still a claim.' },
        { text: 'A diff that looks right on a careful read', feedback: 'Reading finds a lot, but it does not run the code. Both, not either.' },
        { text: 'Its summary listing each test it fixed', feedback: 'A detailed claim is still a claim. It may describe an earlier run.' },
      ],
      explanation: 'The only proof that tests pass is output from a run after the last change. In a round, say out loud that you are checking.',
    },
    {
      id: 'agents-workflow.narrate',
      skill: 'agents.workflow',
      kind: 'compare',
      question: "Interviewer: 'Why did you reject that diff?'",
      a: "It didn't feel right, so I asked for another version.",
      b: "It changed `fetch`'s signature, and three callers depend on it. The brief said keep the API, so I'm re-briefing with that constraint spelled out.",
      better: 'b',
      explanation: 'B names the evidence (a signature change), the consequence (three callers) and the next move. A might be the same judgment, but nobody can score a feeling.',
    },
    {
      id: 'agents-workflow.loop-signs',
      skill: 'agents.workflow',
      kind: 'flash',
      front: 'Name four signs a coding agent is looping and you should take the wheel.',
      back: "The same fix tried twice. Errors that change but don't shrink. Green bought by editing tests or adding a broad `except`. Diffs that grow each round or wander outside the slice.",
    },
    {
      id: 'agents-workflow.brief-parts',
      skill: 'agents.workflow',
      kind: 'flash',
      front: 'What four parts make a good brief to a coding agent?',
      back: 'Context (where the code is, what exists), one task slice stated as behaviour, constraints (what not to touch), and a done-when check it must run and show you.',
    },
  ],
}

export default lesson
