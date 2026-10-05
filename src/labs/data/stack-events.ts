import type { Lab, LabLevel } from '../../core/types'

/** Python source: raw template (backslashes kept as typed), leading newline dropped. */
const py = (s: TemplateStringsArray) => s.raw[0].replace(/^\n/, '')

/* ---------------------------------------------------------------- starter */

const STARTER = py`
def stack_to_events(samples):
    """Turn stack samples into begin/end trace events.

    samples: a list of (timestamp, stack) pairs in time order. Each stack is a
    list of function names, root first, e.g. ["main", "parse", "lex"].

    Returns a list of event dicts {"ph": "B" or "E", "name": str, "ts": timestamp}.
    """
    raise NotImplementedError
`

/* ---------------------------------------------------------------- level 1 */

const L1_TESTS = py`
def _l1_ev(ph, name, ts):
    return {"ph": ph, "name": name, "ts": ts}


def _l1_fmt(events):
    try:
        return ", ".join(f"{e['ph']} {e['name']}@{e['ts']}" for e in events)
    except Exception:
        return repr(events)


def _l1_check(samples, want):
    got = stack_to_events(samples)
    assert isinstance(got, list), f"stack_to_events should return a list, got {type(got).__name__}"
    assert got == want, f"\n  got:  {_l1_fmt(got)}\n  want: {_l1_fmt(want)}"


def test_l1_no_samples():
    _l1_check([], [])


def test_l1_single_sample():
    _l1_check(
        [(5.0, ["a", "b", "c"])],
        [
            _l1_ev("B", "a", 5.0), _l1_ev("B", "b", 5.0), _l1_ev("B", "c", 5.0),
            _l1_ev("E", "c", 5.0), _l1_ev("E", "b", 5.0), _l1_ev("E", "a", 5.0),
        ],
    )


def test_l1_spec_example():
    _l1_check(
        [(0.0, ["main"]), (1.0, ["main", "parse"]), (2.0, ["main", "eval"]), (3.0, ["main"])],
        [
            _l1_ev("B", "main", 0.0),
            _l1_ev("B", "parse", 1.0),
            _l1_ev("E", "parse", 2.0), _l1_ev("B", "eval", 2.0),
            _l1_ev("E", "eval", 3.0),
            _l1_ev("E", "main", 3.0),
        ],
    )


def test_l1_push_child_then_close():
    _l1_check(
        [(0.0, ["main"]), (1.0, ["main", "work"])],
        [_l1_ev("B", "main", 0.0), _l1_ev("B", "work", 1.0), _l1_ev("E", "work", 1.0), _l1_ev("E", "main", 1.0)],
    )


def test_l1_sibling_switch_ends_before_begins():
    _l1_check(
        [(0.0, ["main", "a"]), (1.0, ["main", "b"])],
        [
            _l1_ev("B", "main", 0.0), _l1_ev("B", "a", 0.0),
            _l1_ev("E", "a", 1.0), _l1_ev("B", "b", 1.0),
            _l1_ev("E", "b", 1.0), _l1_ev("E", "main", 1.0),
        ],
    )


def test_l1_deep_switch():
    _l1_check(
        [(0.0, ["a", "b", "c"]), (1.0, ["a", "x", "y"])],
        [
            _l1_ev("B", "a", 0.0), _l1_ev("B", "b", 0.0), _l1_ev("B", "c", 0.0),
            _l1_ev("E", "c", 1.0), _l1_ev("E", "b", 1.0), _l1_ev("B", "x", 1.0), _l1_ev("B", "y", 1.0),
            _l1_ev("E", "y", 1.0), _l1_ev("E", "x", 1.0), _l1_ev("E", "a", 1.0),
        ],
    )


def test_l1_same_name_under_a_new_parent():
    _l1_check(
        [(0.0, ["a", "x"]), (1.0, ["b", "x"])],
        [
            _l1_ev("B", "a", 0.0), _l1_ev("B", "x", 0.0),
            _l1_ev("E", "x", 1.0), _l1_ev("E", "a", 1.0), _l1_ev("B", "b", 1.0), _l1_ev("B", "x", 1.0),
            _l1_ev("E", "x", 1.0), _l1_ev("E", "b", 1.0),
        ],
    )


def test_l1_root_switch():
    _l1_check(
        [(0.0, ["a", "b"]), (2.0, ["c"])],
        [
            _l1_ev("B", "a", 0.0), _l1_ev("B", "b", 0.0),
            _l1_ev("E", "b", 2.0), _l1_ev("E", "a", 2.0), _l1_ev("B", "c", 2.0),
            _l1_ev("E", "c", 2.0),
        ],
    )


def test_l1_pop_several_innermost_first():
    _l1_check(
        [(0.0, ["a", "b", "c", "d"]), (1.0, ["a"]), (4.0, ["a", "z"])],
        [
            _l1_ev("B", "a", 0.0), _l1_ev("B", "b", 0.0), _l1_ev("B", "c", 0.0), _l1_ev("B", "d", 0.0),
            _l1_ev("E", "d", 1.0), _l1_ev("E", "c", 1.0), _l1_ev("E", "b", 1.0),
            _l1_ev("B", "z", 4.0),
            _l1_ev("E", "z", 4.0), _l1_ev("E", "a", 4.0),
        ],
    )


def test_l1_push_several_outermost_first():
    _l1_check(
        [(0.0, ["a"]), (1.0, ["a", "b", "c"]), (2.0, ["a", "b"])],
        [
            _l1_ev("B", "a", 0.0),
            _l1_ev("B", "b", 1.0), _l1_ev("B", "c", 1.0),
            _l1_ev("E", "c", 2.0),
            _l1_ev("E", "b", 2.0), _l1_ev("E", "a", 2.0),
        ],
    )


def test_l1_event_shape():
    events = stack_to_events([(0.25, ["main"]), (0.75, ["main", "f"])])
    assert len(events) == 4, f"expected 4 events, got {len(events)}: {_l1_fmt(events)}"
    for e in events:
        assert isinstance(e, dict), f"each event should be a dict, got {e!r}"
        assert set(e) == {"ph", "name", "ts"}, f"each event has exactly the keys ph, name, ts; got {sorted(e)}"
        assert e["ph"] in ("B", "E"), f"ph is 'B' or 'E', got {e['ph']!r}"
        assert e["ts"] in (0.25, 0.75), f"ts must be one of the sample timestamps, got {e['ts']!r}"


def test_l1_every_begin_has_an_end():
    samples = [
        (0.0, ["main"]), (1.0, ["main", "load"]), (2.0, ["main", "load", "read"]),
        (3.0, ["main", "parse"]), (4.0, ["main", "parse", "lex"]), (5.0, ["main", "render"]),
    ]
    events = stack_to_events(samples)
    begins = sorted(e["name"] for e in events if e["ph"] == "B")
    ends = sorted(e["name"] for e in events if e["ph"] == "E")
    want = ["lex", "load", "main", "parse", "read", "render"]
    assert begins == want, f"each frame begins exactly once; B names were {begins}"
    assert ends == want, f"each frame ends exactly once; E names were {ends}"
`

const L1_SOLUTION = py`
def stack_to_events(samples):
    events = []
    prev = []
    for ts, stack in samples:
        common = 0
        while common < len(prev) and common < len(stack) and prev[common] == stack[common]:
            common += 1
        for name in reversed(prev[common:]):  # ended frames, innermost first
            events.append({"ph": "E", "name": name, "ts": ts})
        for name in stack[common:]:  # new frames, outermost first
            events.append({"ph": "B", "name": name, "ts": ts})
        prev = list(stack)
    if samples:
        last_ts = samples[-1][0]
        for name in reversed(prev):
            events.append({"ph": "E", "name": name, "ts": last_ts})
    return events
`

const level1: LabLevel = {
  title: 'Diff the stacks',
  spec: `A sampling profiler wakes up every few milliseconds and records the call stack. From those samples, rebuild **when each function started and stopped** as begin/end events a trace viewer can draw.

Write \`stack_to_events(samples)\`. Each sample is \`(timestamp, stack)\`, and \`stack\` lists function names **root first**. Return a list of event dicts: \`{"ph": "B", "name": ..., "ts": ...}\` for a begin and \`{"ph": "E", ...}\` for an end.

Compare each sample's stack with the previous one (the first sample is compared with an empty stack):

- Find the **longest common prefix** of the two stacks. Frames inside it are still running: no events.
- Frames of the previous stack past the prefix have ended: emit \`E\` events, **innermost first**.
- Frames of the new stack past the prefix have started: emit \`B\` events, **outermost first**.
- All of these use the new sample's timestamp, and ends come before begins.

After the last sample, end every frame still open, innermost first, at the **last sample's timestamp**.

Example, writing \`B main@0.0\` for \`{"ph": "B", "name": "main", "ts": 0.0}\`:

\`(0.0, ["main"])\` → \`B main@0.0\`
\`(1.0, ["main", "parse"])\` → \`B parse@1.0\`
\`(2.0, ["main", "eval"])\` → \`E parse@2.0\`, \`B eval@2.0\`
\`(3.0, ["main"])\` → \`E eval@3.0\`
after the last sample → \`E main@3.0\`

Going from \`["a", "x"]\` to \`["b", "x"]\` ends **both** frames and begins two new ones: this \`x\` was called by a different parent, so it's a different call.

In this level stacks are never empty, a name never appears twice in one stack, and consecutive samples always differ. No samples means no events.`,
  tests: L1_TESTS,
  hints: [
    'Walk both stacks from the root while the names match. The first index where they differ (or where one runs out) is the common prefix length.',
    '`reversed(prev[common:])` gives the frames to end, innermost first; `stack[common:]` gives the frames to begin, outermost first.',
    "Don't forget the close-out: after the loop, end everything still in the previous stack at the last sample's timestamp.",
  ],
  solution: L1_SOLUTION,
}

/* ---------------------------------------------------------------- level 2 */

const L2_TESTS = py`
import copy as _l2_copy
import random as _l2_random


def _l2_ev(ph, name, ts):
    return {"ph": ph, "name": name, "ts": ts}


def _l2_fmt(events):
    try:
        return ", ".join(f"{e['ph']} {e['name']}@{e['ts']}" for e in events)
    except Exception:
        return repr(events)


def _l2_check(samples, want):
    got = stack_to_events(samples)
    assert got == want, f"\n  got:  {_l2_fmt(got)}\n  want: {_l2_fmt(want)}"


def _l2_lcp(a, b):
    n = 0
    while n < len(a) and n < len(b) and a[n] == b[n]:
        n += 1
    return n


def test_l2_recursion_push_and_pop():
    _l2_check(
        [(0, ["f"]), (1, ["f", "f"]), (2, ["f", "f", "f"]), (3, ["f"])],
        [
            _l2_ev("B", "f", 0), _l2_ev("B", "f", 1), _l2_ev("B", "f", 2),
            _l2_ev("E", "f", 3), _l2_ev("E", "f", 3),
            _l2_ev("E", "f", 3),
        ],
    )


def test_l2_recursion_switch_innermost():
    _l2_check(
        [(0, ["main", "f", "f"]), (1, ["main", "f", "g"])],
        [
            _l2_ev("B", "main", 0), _l2_ev("B", "f", 0), _l2_ev("B", "f", 0),
            _l2_ev("E", "f", 1), _l2_ev("B", "g", 1),
            _l2_ev("E", "g", 1), _l2_ev("E", "f", 1), _l2_ev("E", "main", 1),
        ],
    )


def test_l2_mutual_recursion():
    _l2_check(
        [(0, ["a", "b"]), (1, ["a", "b", "a", "b"]), (2, ["a", "b", "a"])],
        [
            _l2_ev("B", "a", 0), _l2_ev("B", "b", 0),
            _l2_ev("B", "a", 1), _l2_ev("B", "b", 1),
            _l2_ev("E", "b", 2),
            _l2_ev("E", "a", 2), _l2_ev("E", "b", 2), _l2_ev("E", "a", 2),
        ],
    )


def test_l2_repeated_samples_emit_nothing():
    _l2_check(
        [(0, ["a"]), (1, ["a"]), (2, ["a", "b"]), (3, ["a", "b"]), (4, ["a", "b"])],
        [_l2_ev("B", "a", 0), _l2_ev("B", "b", 2), _l2_ev("E", "b", 4), _l2_ev("E", "a", 4)],
    )


def test_l2_spec_example():
    _l2_check(
        [(0, ["main", "f"]), (1, ["main", "f", "f"]), (2, ["main", "f", "f"]), (3, []), (4, ["main"])],
        [
            _l2_ev("B", "main", 0), _l2_ev("B", "f", 0),
            _l2_ev("B", "f", 1),
            _l2_ev("E", "f", 3), _l2_ev("E", "f", 3), _l2_ev("E", "main", 3),
            _l2_ev("B", "main", 4),
            _l2_ev("E", "main", 4),
        ],
    )


def test_l2_leading_and_trailing_empty_stacks():
    _l2_check(
        [(0, []), (1, ["a"]), (2, []), (3, [])],
        [_l2_ev("B", "a", 1), _l2_ev("E", "a", 2)],
    )


def test_l2_all_empty_stacks():
    _l2_check([(0, []), (1, []), (2, [])], [])


def test_l2_name_reappearing_is_a_new_frame():
    _l2_check(
        [(0, ["a"]), (1, ["b"]), (2, ["a"])],
        [
            _l2_ev("B", "a", 0),
            _l2_ev("E", "a", 1), _l2_ev("B", "b", 1),
            _l2_ev("E", "b", 2), _l2_ev("B", "a", 2),
            _l2_ev("E", "a", 2),
        ],
    )


def test_l2_decreasing_timestamp_raises():
    samples = [(10.0, ["a"]), (30.0, ["b"]), (15.0, ["a"])]
    try:
        stack_to_events(samples)
    except ValueError as err:
        assert "2" in str(err), f"the error should mention the bad sample's index (2); message was {str(err)!r}"
        return
    raise AssertionError("a timestamp going backwards (30.0 then 15.0) should raise ValueError")


def test_l2_equal_timestamps_are_fine():
    _l2_check(
        [(1, ["a"]), (1, ["a", "b"]), (1, ["a"])],
        [_l2_ev("B", "a", 1), _l2_ev("B", "b", 1), _l2_ev("E", "b", 1), _l2_ev("E", "a", 1)],
    )


def test_l2_does_not_mutate_input():
    samples = [(0, ["main", "f"]), (1, ["main"]), (2, ["main", "g", "h"]), (3, [])]
    before = _l2_copy.deepcopy(samples)
    stack_to_events(samples)
    assert samples == before, f"stack_to_events must not modify its input; samples became {samples!r}"


def test_l2_random_profiles_replay_correctly():
    rng = _l2_random.Random(7)
    names = ["main", "f", "g"]
    for trial in range(300):
        samples, stack = [], []
        for i in range(rng.randrange(0, 10)):
            r = rng.random()
            if r < 0.4:
                stack = stack + [rng.choice(names)]
            elif r < 0.7:
                stack = stack[: rng.randrange(len(stack) + 1)]
            elif r < 0.85:
                stack = [rng.choice(names) for _ in range(rng.randrange(4))]
            samples.append((float(i), list(stack)))  # r >= 0.85 repeats the previous stack
        events = stack_to_events(samples)
        where = f"trial {trial}, samples={samples}"
        open_frames, pos, prev, minimum = [], 0, [], 0
        for i, (ts, want) in enumerate(samples):
            minimum += 2 * (len(want) - _l2_lcp(prev, want))
            prev = want
            while pos < len(events) and events[pos]["ts"] == ts:
                e = events[pos]
                if e["ph"] == "B":
                    open_frames.append(e["name"])
                else:
                    assert open_frames and open_frames[-1] == e["name"], f"{where}: event {pos} {e} does not close the innermost open frame {open_frames}"
                    open_frames.pop()
                pos += 1
            if i < len(samples) - 1:
                assert open_frames == want, f"{where}: after t={ts} the open frames are {open_frames}, expected {want}"
        assert pos == len(events), f"{where}: unexpected events {events[pos:]}"
        assert open_frames == [], f"{where}: frames left open at the end: {open_frames}"
        assert len(events) == minimum, f"{where}: {len(events)} events, but only {minimum} are needed"
`

const L2_SOLUTION = py`
def _common_prefix(a, b):
    n = 0
    while n < len(a) and n < len(b) and a[n] == b[n]:
        n += 1
    return n


def stack_to_events(samples):
    events = []
    prev = []
    last_ts = None
    for i, (ts, stack) in enumerate(samples):
        if last_ts is not None and ts < last_ts:
            raise ValueError(f"sample {i}: timestamp {ts} is earlier than the previous one ({last_ts})")
        common = _common_prefix(prev, stack)  # position by position, so recursion just works
        for name in reversed(prev[common:]):
            events.append({"ph": "E", "name": name, "ts": ts})
        for name in stack[common:]:
            events.append({"ph": "B", "name": name, "ts": ts})
        prev, last_ts = list(stack), ts  # copy: never hold on to the caller's list
    for name in reversed(prev):
        events.append({"ph": "E", "name": name, "ts": last_ts})
    return events
`

const level2: LabLevel = {
  title: 'Recursion and messy input',
  spec: `Real profiles are messier. Make \`stack_to_events\` handle:

- **Recursion.** The same name can appear at several depths: \`["main", "walk", "walk", "walk"]\`. A frame is identified by its **position** in the stack, not its name, so going from \`["f", "f"]\` to \`["f", "f", "f"]\` begins exactly one new \`f\`.
- **Repeated samples.** If a sample's stack equals the previous one, nothing changed: emit nothing.
- **Empty stacks.** \`[]\` means the program was idle, so everything open ends at that timestamp. Leading or trailing empty samples are fine, and all-empty input gives \`[]\`.
- **Bad input.** Timestamps must never decrease (equal is fine). If one does, raise \`ValueError\` with a message that includes the bad sample's index.
- **Ownership.** Don't modify the caller's samples or stacks.

Example:

\`(0, ["main", "f"])\` → \`B main@0\`, \`B f@0\`
\`(1, ["main", "f", "f"])\` → \`B f@1\`
\`(2, ["main", "f", "f"])\` → nothing
\`(3, [])\` → \`E f@3\`, \`E f@3\`, \`E main@3\`
\`(4, ["main"])\` → \`B main@4\`
after the last sample → \`E main@4\``,
  tests: L2_TESTS,
  hints: [
    'If you compared names with a set or a dict, recursion breaks it: `["f"]` and `["f", "f"]` contain the same set of names. Compare position by position.',
    'A position-by-position common-prefix walk already does the right thing for repeated samples (the prefix is everything) and empty stacks (the prefix is empty).',
    "Remember the previous timestamp and raise when the new one is smaller. Keep `list(stack)` as your previous stack rather than the caller's list itself.",
  ],
  solution: L2_SOLUTION,
}

/* ---------------------------------------------------------------- level 3 */

const L3_TESTS = py`
import random as _l3_random


def _l3_ev(ph, name, ts):
    return {"ph": ph, "name": name, "ts": ts}


def _l3_fmt(events):
    try:
        return ", ".join(f"{e['ph']} {e['name']}@{e['ts']}" for e in events) or "(no events)"
    except Exception:
        return repr(events)


def _l3_check(samples, min_samples, want):
    got = stack_to_events(samples, min_samples=min_samples)
    assert got == want, f"min_samples={min_samples}\n  got:  {_l3_fmt(got)}\n  want: {_l3_fmt(want)}"


def _l3_is_subsequence(small, big):
    it = iter(big)
    return all(any(x == y for y in it) for x in small)


def _l3_assert_nested(events, where):
    open_frames = []
    for i, e in enumerate(events):
        if e["ph"] == "B":
            open_frames.append(e["name"])
        else:
            assert open_frames and open_frames[-1] == e["name"], f"{where}: event {i} {e} does not close the innermost open frame {open_frames}"
            open_frames.pop()
    assert not open_frames, f"{where}: frames never closed: {open_frames}"


def test_l3_default_changes_nothing():
    samples = [(0, ["a"]), (1, ["a", "b"]), (2, ["a"]), (3, ["a", "c", "d"])]
    got = stack_to_events(samples, min_samples=1)
    want = stack_to_events(samples)
    assert got == want, f"min_samples=1 should give the level 2 output\n  got:  {_l3_fmt(got)}\n  want: {_l3_fmt(want)}"


def test_l3_spec_example():
    samples = [(0, ["main"]), (1, ["main", "log"]), (2, ["main", "work"]), (3, ["main", "work"]), (4, ["main"])]
    _l3_check(samples, 2, [_l3_ev("B", "main", 0), _l3_ev("B", "work", 2), _l3_ev("E", "work", 4), _l3_ev("E", "main", 4)])


def test_l3_drops_one_sample_child():
    _l3_check([(0, ["a"]), (1, ["a", "b"]), (2, ["a"])], 2, [_l3_ev("B", "a", 0), _l3_ev("E", "a", 2)])


def test_l3_repeated_samples_count():
    samples = [(0, ["a"]), (1, ["a", "b"]), (2, ["a", "b"]), (3, ["a"])]
    _l3_check(samples, 2, [_l3_ev("B", "a", 0), _l3_ev("B", "b", 1), _l3_ev("E", "b", 3), _l3_ev("E", "a", 3)])
    _l3_check(samples, 3, [_l3_ev("B", "a", 0), _l3_ev("E", "a", 3)])


def test_l3_last_sample_counts():
    _l3_check(
        [(0, ["a"]), (1, ["a", "b"]), (2, ["a", "b"])],
        2,
        [_l3_ev("B", "a", 0), _l3_ev("B", "b", 1), _l3_ev("E", "b", 2), _l3_ev("E", "a", 2)],
    )


def test_l3_root_frame_can_be_dropped():
    _l3_check([(0, ["a"]), (1, ["b"]), (2, ["b"])], 2, [_l3_ev("B", "b", 1), _l3_ev("E", "b", 2)])


def test_l3_empty_stack_breaks_a_run():
    _l3_check([(0, ["a"]), (1, []), (2, ["a"])], 2, [])


def test_l3_recursion_counts_each_frame():
    samples = [(0, ["f"]), (1, ["f", "f"]), (2, ["f"]), (3, ["f", "f"]), (4, ["f", "f"])]
    _l3_check(samples, 2, [_l3_ev("B", "f", 0), _l3_ev("B", "f", 3), _l3_ev("E", "f", 4), _l3_ev("E", "f", 4)])


def test_l3_new_parent_means_new_child():
    samples = [(0, ["a", "x"]), (1, ["a", "x"]), (2, ["b", "x"]), (3, ["b", "x"])]
    _l3_check(
        samples,
        2,
        [
            _l3_ev("B", "a", 0), _l3_ev("B", "x", 0),
            _l3_ev("E", "x", 2), _l3_ev("E", "a", 2), _l3_ev("B", "b", 2), _l3_ev("B", "x", 2),
            _l3_ev("E", "x", 3), _l3_ev("E", "b", 3),
        ],
    )
    _l3_check(samples, 3, [])


def test_l3_min_samples_longer_than_input():
    _l3_check([(0, ["a"]), (1, ["a"])], 5, [])


def test_l3_invalid_min_samples():
    for bad in (0, -1):
        try:
            stack_to_events([(0, ["a"])], min_samples=bad)
        except ValueError:
            continue
        raise AssertionError(f"min_samples={bad} should raise ValueError")


def test_l3_validation_still_applies():
    try:
        stack_to_events([(1, ["a"]), (0, ["a"])], min_samples=2)
    except ValueError:
        return
    raise AssertionError("a decreasing timestamp should still raise ValueError when min_samples is given")


def test_l3_random_profiles_keep_valid_nesting():
    rng = _l3_random.Random(31)
    for trial in range(200):
        samples, stack = [], []
        for i in range(rng.randrange(0, 12)):
            r = rng.random()
            if r < 0.35:
                stack = stack + [rng.choice("fgh")]
            elif r < 0.6:
                stack = stack[: rng.randrange(len(stack) + 1)]
            samples.append((float(i), list(stack)))
        previous = stack_to_events(samples)
        for k in range(1, 5):
            got = stack_to_events(samples, min_samples=k)
            where = f"trial {trial}, min_samples={k}, samples={samples}"
            _l3_assert_nested(got, where)
            assert _l3_is_subsequence(got, previous), f"{where}: the output must be the min_samples={k - 1} output with some B/E pairs removed"
            previous = got
`

const L3_SOLUTION = py`
def _common_prefix(a, b):
    n = 0
    while n < len(a) and n < len(b) and a[n] == b[n]:
        n += 1
    return n


def stack_to_events(samples, min_samples=1):
    if min_samples < 1:
        raise ValueError(f"min_samples must be at least 1, got {min_samples}")
    # Pass 1: the level 2 diff, but tag each event with the frame it belongs to
    # and record how many samples each frame stayed on the stack.
    tagged = []  # (frame_id, event) in output order
    lasted = []  # lasted[frame_id] = samples the frame was on the stack
    open_frames = []  # (frame_id, first_sample_index) for the current stack, root first
    prev = []
    last_ts = None

    def end_frames_above(depth, ts, sample_index):
        while len(open_frames) > depth:
            fid, first = open_frames.pop()
            lasted[fid] = sample_index - first
            tagged.append((fid, {"ph": "E", "name": prev[len(open_frames)], "ts": ts}))

    for i, (ts, stack) in enumerate(samples):
        if last_ts is not None and ts < last_ts:
            raise ValueError(f"sample {i}: timestamp {ts} is earlier than the previous one ({last_ts})")
        common = _common_prefix(prev, stack)
        end_frames_above(common, ts, i)
        for name in stack[common:]:
            fid = len(lasted)
            lasted.append(0)
            open_frames.append((fid, i))
            tagged.append((fid, {"ph": "B", "name": name, "ts": ts}))
        prev, last_ts = list(stack), ts
    end_frames_above(0, last_ts, len(samples))

    # Pass 2: drop frames that were too short. A child is only on the stack
    # while its parent is, so a kept child always has a kept parent.
    return [event for fid, event in tagged if lasted[fid] >= min_samples]
`

const level3: LabLevel = {
  title: 'Filter short frames',
  spec: `A trace full of one-sample blips is noise. Add a parameter: \`stack_to_events(samples, min_samples=1)\`.

A **frame** is one continuous stay of a function at one stack position: it starts at its \`B\` and finishes at its \`E\`. Count the **samples it was on the stack for**; repeated identical samples count, and an empty stack or any change at its position or nearer the root ends it. Emit a frame's \`B\` and \`E\` only if that count is at least \`min_samples\`; otherwise drop both. Kept events keep their order and timestamps, and the output must still be properly nested.

\`min_samples\` must be at least 1, else raise \`ValueError\`. With the default of 1 the output is exactly the level 2 output, and level 2's validation still applies.

Example with \`min_samples=2\`:

\`(0, ["main"])\`
\`(1, ["main", "log"])\`   log is on the stack for 1 sample: dropped
\`(2, ["main", "work"])\`
\`(3, ["main", "work"])\`   work is on the stack for 2 samples: kept
\`(4, ["main"])\`

Result: \`B main@0\`, \`B work@2\`, \`E work@4\`, \`E main@4\`.`,
  tests: L3_TESTS,
  hints: [
    "You can't know whether to keep a `B` until its frame ends, so you can't stream. Run the level 2 diff as a first pass, tagging each event with a frame id, then filter in a second pass.",
    'Give a frame an id when it begins and remember the sample index it began at. If it ends while processing sample `i`, it lasted `i - start` samples; frames still open after the last sample lasted `len(samples) - start`.',
    'Why nesting stays valid: a child can only be on the stack while its parent is, so the child never lasts longer than its parent. If the child is kept, so is the parent.',
  ],
  solution: L3_SOLUTION,
}

/* ---------------------------------------------------------------- level 4 */

const L4_TESTS = py`
import json as _l4_json
import random as _l4_random


def _l4_ev(ph, name, ts):
    return {"ph": ph, "name": name, "ts": ts}


def _l4_rejects(events, why):
    try:
        validate_events(events)
    except ValueError:
        return
    raise AssertionError(f"validate_events should raise ValueError: {why}")


def _l4_trace(threads, **kwargs):
    out = to_chrome_trace(threads, **kwargs)
    assert isinstance(out, str), f"to_chrome_trace should return a JSON string, got {type(out).__name__}"
    data = _l4_json.loads(out)
    assert isinstance(data, dict) and isinstance(data.get("traceEvents"), list), f"expected a JSON object with a traceEvents list, got {out[:200]}"
    return data


def _l4_short(events):
    return [(e.get("ph"), e.get("name"), e.get("ts"), e.get("tid")) for e in events]


def _l4_frames(events, scale):
    """(name, begin, end) for each B/E pair in order of the B events, timestamps scaled and rounded."""
    frames, open_idx = [], []
    for e in events:
        ts = round(e["ts"] * scale)
        if e["ph"] == "B":
            open_idx.append(len(frames))
            frames.append([e["name"], ts, None])
        else:
            frames[open_idx.pop()][2] = ts
    return [tuple(f) for f in frames]


def test_l4_validate_accepts_good_events():
    events = stack_to_events([(0.0, ["main"]), (1.0, ["main", "f", "f"]), (2.0, [])])
    assert validate_events(events) is None, "validate_events returns None for valid events"
    assert validate_events([]) is None, "an empty list is valid"
    zero = [_l4_ev("B", "a", 1.0), _l4_ev("B", "b", 1.0), _l4_ev("E", "b", 1.0), _l4_ev("E", "a", 1.0)]
    assert validate_events(zero) is None, "frames that begin and end at the same ts are valid"


def test_l4_validate_rejects_backwards_time():
    _l4_rejects([_l4_ev("B", "a", 2.0), _l4_ev("E", "a", 1.0)], "the second event's ts is earlier than the first's")


def test_l4_validate_rejects_end_without_begin():
    _l4_rejects([_l4_ev("E", "a", 0.0)], "an E with no open frame")
    _l4_rejects([_l4_ev("B", "a", 0.0), _l4_ev("E", "a", 1.0), _l4_ev("E", "a", 2.0)], "a second E after the frame was closed")


def test_l4_validate_rejects_wrong_name():
    events = [_l4_ev("B", "a", 0.0), _l4_ev("B", "b", 1.0), _l4_ev("E", "a", 2.0), _l4_ev("E", "b", 2.0)]
    _l4_rejects(events, "E a arrives while b is the innermost open frame")


def test_l4_validate_rejects_unclosed():
    _l4_rejects([_l4_ev("B", "a", 0.0), _l4_ev("B", "b", 1.0), _l4_ev("E", "b", 2.0)], "frame a is never closed")


def test_l4_validate_rejects_bad_phase():
    _l4_rejects([_l4_ev("B", "a", 0.0), _l4_ev("E", "a", 1.0), _l4_ev("X", "a", 2.0)], "ph 'X' is neither B nor E")


def test_l4_trace_format():
    data = _l4_trace({1: [_l4_ev("B", "main", 0.5), _l4_ev("E", "main", 1.25)]})
    unit = data.get("displayTimeUnit")
    assert unit == "ms", f"displayTimeUnit should be 'ms', got {unit!r}"
    want = [
        {"name": "main", "ph": "B", "ts": 500000, "pid": 1, "tid": 1},
        {"name": "main", "ph": "E", "ts": 1250000, "pid": 1, "tid": 1},
    ]
    got = data["traceEvents"]
    assert got == want, f"traceEvents is {got!r}, expected {want!r}"
    assert all(type(e["ts"]) is int for e in got), "ts must be an integer number of microseconds (500000, not 500000.0)"


def test_l4_trace_pid_and_tids():
    threads = {
        7: [_l4_ev("B", "a", 0.0), _l4_ev("E", "a", 1.0)],
        9: [_l4_ev("B", "b", 2.0), _l4_ev("E", "b", 3.0)],
    }
    got = [(e["pid"], e["tid"], e["name"]) for e in _l4_trace(threads, pid=42)["traceEvents"]]
    want = [(42, 7, "a"), (42, 7, "a"), (42, 9, "b"), (42, 9, "b")]
    assert got == want, f"(pid, tid, name) per event was {got}, expected {want}"


def test_l4_trace_spec_example():
    threads = {
        1: stack_to_events([(0.0, ["main"]), (0.002, [])]),
        2: stack_to_events([(0.001, ["io"]), (0.002, [])]),
    }
    got = _l4_short(_l4_trace(threads)["traceEvents"])
    want = [("B", "main", 0, 1), ("B", "io", 1000, 2), ("E", "main", 2000, 1), ("E", "io", 2000, 2)]
    assert got == want, f"(ph, name, ts, tid) was {got}, expected {want}"


def test_l4_trace_ends_before_begins_at_equal_ts():
    threads = {
        1: [_l4_ev("B", "next", 1.0), _l4_ev("E", "next", 2.0)],
        2: [_l4_ev("B", "prev", 0.0), _l4_ev("E", "prev", 1.0)],
    }
    got = _l4_short(_l4_trace(threads)["traceEvents"])
    want = [("B", "prev", 0, 2), ("E", "prev", 1000000, 2), ("B", "next", 1000000, 1), ("E", "next", 2000000, 1)]
    assert got == want, f"at equal ts every E comes before any B, even from a lower tid; got {got}"


def test_l4_trace_ties_by_tid_then_original_order():
    threads = {
        2: [_l4_ev("B", "x", 0.0), _l4_ev("E", "x", 1.0)],
        1: [_l4_ev("B", "outer", 0.0), _l4_ev("B", "inner", 0.0), _l4_ev("E", "inner", 1.0), _l4_ev("E", "outer", 1.0)],
    }
    got = _l4_short(_l4_trace(threads)["traceEvents"])
    want = [
        ("B", "outer", 0, 1), ("B", "inner", 0, 1), ("B", "x", 0, 2),
        ("E", "inner", 1000000, 1), ("E", "outer", 1000000, 1), ("E", "x", 1000000, 2),
    ]
    assert got == want, f"ties go by tid, then by original order within the thread; got {got}"


def test_l4_trace_drops_zero_length_frames():
    events = stack_to_events([(0.0, ["main"]), (1.0, ["main", "blip"])])
    got = _l4_short(_l4_trace({1: events})["traceEvents"])
    want = [("B", "main", 0, 1), ("E", "main", 1000000, 1)]
    assert got == want, f"'blip' begins and ends at 1.0 and should be dropped; got {got}"
    got = _l4_trace({1: stack_to_events([(2.0, ["a", "b"])])})["traceEvents"]
    assert got == [], f"a single sample makes only zero-length frames, so the trace is empty; got {got}"


def test_l4_trace_rounds_to_microseconds():
    events = [_l4_ev("B", "a", 1.234567), _l4_ev("E", "a", 2.0000004)]
    got = [e["ts"] for e in _l4_trace({1: events})["traceEvents"]]
    assert got == [1234567, 2000000], f"ts should be round(seconds * 1_000_000); got {got}"


def test_l4_trace_validates_each_thread():
    threads = {1: [_l4_ev("B", "a", 0.0), _l4_ev("E", "a", 1.0)], 2: [_l4_ev("B", "b", 0.0)]}
    try:
        to_chrome_trace(threads)
    except ValueError:
        return
    raise AssertionError("to_chrome_trace should raise ValueError when a thread's events are invalid (b is never closed)")


def test_l4_random_profiles_export_cleanly():
    rng = _l4_random.Random(2024)
    for trial in range(150):
        threads = {}
        for tid in range(1, rng.randrange(2, 5)):
            samples, stack, ts = [], [], 0.0
            for _ in range(rng.randrange(1, 10)):
                ts = round(ts + rng.choice([0.0, 0.001, 0.002]), 3)
                r = rng.random()
                if r < 0.45:
                    stack = stack + [rng.choice("abc")]
                elif r < 0.8:
                    stack = stack[: rng.randrange(len(stack) + 1)]
                samples.append((ts, list(stack)))
            threads[tid] = stack_to_events(samples)
            validate_events(threads[tid])
        out = _l4_trace(threads)["traceEvents"]
        keys = [(e["ts"], 0 if e["ph"] == "E" else 1) for e in out]
        assert keys == sorted(keys), f"trial {trial}: events must be sorted by ts, with E before B at equal ts"
        for tid, events in threads.items():
            want = [f for f in _l4_frames(events, 1_000_000) if f[1] != f[2]]
            got = _l4_frames([e for e in out if e["tid"] == tid], 1)
            assert got == want, f"trial {trial}, tid {tid}: frames {got}, expected the non-zero-length frames {want}"
`

const L4_SOLUTION = py`
import json


def _common_prefix(a, b):
    n = 0
    while n < len(a) and n < len(b) and a[n] == b[n]:
        n += 1
    return n


def stack_to_events(samples, min_samples=1):
    if min_samples < 1:
        raise ValueError(f"min_samples must be at least 1, got {min_samples}")
    tagged = []  # (frame_id, event) in output order
    lasted = []  # lasted[frame_id] = samples the frame was on the stack
    open_frames = []  # (frame_id, first_sample_index), root first
    prev = []
    last_ts = None

    def end_frames_above(depth, ts, sample_index):
        while len(open_frames) > depth:
            fid, first = open_frames.pop()
            lasted[fid] = sample_index - first
            tagged.append((fid, {"ph": "E", "name": prev[len(open_frames)], "ts": ts}))

    for i, (ts, stack) in enumerate(samples):
        if last_ts is not None and ts < last_ts:
            raise ValueError(f"sample {i}: timestamp {ts} is earlier than the previous one ({last_ts})")
        common = _common_prefix(prev, stack)
        end_frames_above(common, ts, i)
        for name in stack[common:]:
            fid = len(lasted)
            lasted.append(0)
            open_frames.append((fid, i))
            tagged.append((fid, {"ph": "B", "name": name, "ts": ts}))
        prev, last_ts = list(stack), ts
    end_frames_above(0, last_ts, len(samples))
    return [event for fid, event in tagged if lasted[fid] >= min_samples]


def validate_events(events):
    open_names = []
    last_ts = None
    for i, e in enumerate(events):
        ph, name, ts = e.get("ph"), e.get("name"), e.get("ts")
        if ph not in ("B", "E"):
            raise ValueError(f"event {i}: ph must be 'B' or 'E', got {ph!r}")
        if last_ts is not None and ts < last_ts:
            raise ValueError(f"event {i}: ts {ts} is earlier than the previous event's {last_ts}")
        last_ts = ts
        if ph == "B":
            open_names.append(name)
        elif not open_names:
            raise ValueError(f"event {i}: E {name!r} but no frame is open")
        elif open_names[-1] != name:
            raise ValueError(f"event {i}: E {name!r} but the innermost open frame is {open_names[-1]!r}")
        else:
            open_names.pop()
    if open_names:
        raise ValueError(f"frames never closed: {open_names}")


def to_chrome_trace(threads, pid=1):
    rows = []  # (ts, 0 for E / 1 for B, tid, index in thread, event)
    for tid, events in threads.items():
        validate_events(events)
        out = [
            {"name": e["name"], "ph": e["ph"], "ts": round(e["ts"] * 1_000_000), "pid": pid, "tid": tid}
            for e in events
        ]
        keep = [True] * len(out)
        open_at = []  # indexes of B events still open
        for i, e in enumerate(out):
            if e["ph"] == "B":
                open_at.append(i)
            else:
                begin = open_at.pop()
                if out[begin]["ts"] == e["ts"]:  # zero-length frame
                    keep[begin] = keep[i] = False
        for i, e in enumerate(out):
            if keep[i]:
                ts = e["ts"]
                rows.append((ts, 0 if e["ph"] == "E" else 1, tid, i, e))
    # With zero-length frames gone, every E at a given ts already precedes every
    # B at that ts within one thread, so this sort never breaks a thread's nesting.
    rows.sort(key=lambda row: row[:4])
    return json.dumps({"traceEvents": [row[4] for row in rows], "displayTimeUnit": "ms"})
`

const level4: LabLevel = {
  title: 'Export a Chrome trace',
  spec: `Ship it: produce JSON that Chrome's trace viewer (or ui.perfetto.dev) can open, for a profile with **several threads**.

**Part 1.** \`validate_events(events)\` returns \`None\` if the events are well formed and raises \`ValueError\` (saying what's wrong and at which index) unless:

- every \`ph\` is \`"B"\` or \`"E"\`;
- timestamps never decrease;
- every \`E\` closes the innermost open frame, with the same name (so one must be open);
- nothing is left open at the end.

An empty list is valid.

**Part 2.** \`to_chrome_trace(threads, pid=1)\` takes \`{tid: events}\`, where each value is a \`stack_to_events\` result, and returns a **JSON string**: \`{"traceEvents": [...], "displayTimeUnit": "ms"}\`.

- Validate each thread's events first.
- Each output event is a dict with keys \`name\`, \`ph\`, \`ts\`, \`pid\` and \`tid\`, with \`ts\` in **integer microseconds**: \`round(ts * 1_000_000)\`, since input timestamps are seconds.
- Drop **zero-length frames**: a \`B\` and its matching \`E\` with the same microsecond timestamp. The viewer can't draw them anyway.
- Merge all threads into one list sorted by \`ts\`. At equal \`ts\`, **every \`E\` comes before any \`B\`**; remaining ties go by \`tid\` (ascending), then by original order within the thread.

Example: thread 1 runs \`main\` from 0.0 s to 0.002 s, and thread 2 runs \`io\` from 0.001 s to 0.002 s. In order, the trace events are \`B main 0\` (tid 1), \`B io 1000\` (tid 2), \`E main 2000\` (tid 1), \`E io 2000\` (tid 2).`,
  tests: L4_TESTS,
  hints: [
    '`validate_events` is a stack check: push the name on `B`; on `E`, make sure the stack is non-empty and its top matches, then pop. Keep the previous `ts` for the ordering rule.',
    'Find zero-length frames with the same stack trick on the converted events: when an `E` pops the index of its `B`, compare their microsecond timestamps and mark both for dropping if equal.',
    'Collect rows of `(ts, 0 if E else 1, tid, index, event)` from every thread, sort on the first four fields, then `json.dumps` the events. Once zero-length frames are gone, E-before-B at equal ts never reorders events within one thread.',
  ],
  solution: L4_SOLUTION,
}

/* -------------------------------------------------------------------- lab */

const lab: Lab = {
  id: 'stack-events',
  title: 'Stack samples to trace events',
  area: 'builds',
  summary:
    "Turn a sampling profiler's stack snapshots into **begin/end trace events**, then survive recursion and messy input, filter out noise, and export a multi-thread **Chrome trace**.",
  minutes: 75,
  starter: STARTER,
  levels: [level1, level2, level3, level4],
  followUps: [
    "Samples now stream in from a live process and you can't keep them all. Which levels still work in one pass with memory proportional to stack depth, and exactly what does `min_samples` force you to buffer?",
    'A real profile has 64 threads and a billion samples. How would you split the conversion across processes, and where do the per-thread results have to be merged?',
    "Sampling misses short calls entirely and blurs every start and end by up to one interval. How would you explain a frame's error bars to someone reading the trace?",
    'How would you property-test this? Name the invariants (replaying events reproduces every sample, every `E` closes the innermost `B`, no event is unnecessary) and how you would generate random profiles that hit recursion and empty stacks.',
  ],
}

export default lab
