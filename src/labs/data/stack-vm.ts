import type { Lab, LabLevel } from '../../core/types'

/** Python source: raw template (backslashes kept as typed), leading newline dropped. */
const py = (s: TemplateStringsArray) => s.raw[0].replace(/^\n/, '')

/* ---------------------------------------------------------------- starter */

const STARTER = py`
def run(program: str) -> list[str]:
    """Run a stack-machine program and return everything it printed.

    program has one instruction per line, for example:

        PUSH 2
        PUSH 3
        ADD
        PRINT      # prints 5

    Returns the printed values as strings, in order: ["5"].
    """
    raise NotImplementedError
`

/* ---------------------------------------------------------------- level 1 */

const L1_TESTS = py`
def _l1_run(*lines):
    return run("\n".join(lines))


def test_l1_empty_program():
    got = run("")
    assert got == [], f"an empty program prints nothing; got {got!r}"


def test_l1_push_print():
    got = _l1_run("PUSH 7", "PRINT")
    assert got == ["7"], f"got {got!r}, expected ['7']"


def test_l1_output_is_strings():
    got = _l1_run("PUSH 5", "PRINT")
    assert isinstance(got, list) and all(isinstance(x, str) for x in got), f"run() returns a list of str (str(value)), got {got!r}"


def test_l1_add():
    got = _l1_run("PUSH 2", "PUSH 3", "ADD", "PRINT")
    assert got == ["5"], f"2 + 3 should print 5; got {got!r}"


def test_l1_sub_operand_order():
    got = _l1_run("PUSH 10", "PUSH 4", "SUB", "PRINT")
    assert got == ["6"], f"SUB computes a - b where b is the top: 10 - 4 = 6; got {got!r}"


def test_l1_mul():
    got = _l1_run("PUSH 6", "PUSH 7", "MUL", "PRINT")
    assert got == ["42"], f"6 * 7 should print 42; got {got!r}"


def test_l1_negative_numbers():
    got = _l1_run("PUSH -3", "PUSH 5", "MUL", "PRINT", "PUSH -2", "PRINT")
    assert got == ["-15", "-2"], f"got {got!r}, expected ['-15', '-2']"


def test_l1_print_pops():
    got = _l1_run("PUSH 1", "PUSH 2", "PRINT", "PRINT")
    assert got == ["2", "1"], f"PRINT pops the top each time; got {got!r}"


def test_l1_pop_discards():
    got = _l1_run("PUSH 1", "PUSH 2", "POP", "PRINT")
    assert got == ["1"], f"POP discards the top (2); got {got!r}"


def test_l1_nested_expression():
    got = _l1_run("PUSH 1", "PUSH 2", "SUB", "PUSH 3", "PUSH 4", "ADD", "MUL", "PRINT")
    assert got == ["-7"], f"(1 - 2) * (3 + 4) should be -7; got {got!r}"


def test_l1_comments_and_blank_lines():
    program = """
# compute (2 + 3) * 4

PUSH 2      # left
PUSH 3
ADD         # 5

PUSH 4
MUL
PRINT       # 20
"""
    got = run(program)
    assert got == ["20"], f"comments and blank lines are ignored; got {got!r}"


def test_l1_whitespace_is_flexible():
    got = run("   PUSH    8   \n\tPUSH 2\t\n  ADD\nPRINT   ")
    assert got == ["10"], f"indentation, tabs and extra spaces are fine; got {got!r}"


def test_l1_big_integers():
    got = _l1_run("PUSH 99999999999", "PUSH 99999999999", "MUL", "PRINT")
    assert got == ["9999999999800000000001"], f"Python ints don't overflow; got {got!r}"


def test_l1_runs_are_independent():
    first = _l1_run("PUSH 5", "PRINT")
    second = _l1_run("PUSH 5", "PRINT")
    assert first == second == ["5"], f"each run() starts fresh (no global stack or output list); got {first!r} then {second!r}"
`

const L1_SOLUTION = py`
import operator

BINARY = {"ADD": operator.add, "SUB": operator.sub, "MUL": operator.mul}


def run(program: str) -> list[str]:
    stack: list[int] = []
    output: list[str] = []
    for raw in program.splitlines():
        line = raw.split("#", 1)[0].strip()  # drop the comment, then whitespace
        if not line:
            continue
        op, *args = line.split()
        if op == "PUSH":
            stack.append(int(args[0]))
        elif op == "POP":
            stack.pop()
        elif op in BINARY:
            b = stack.pop()  # top first
            a = stack.pop()
            stack.append(BINARY[op](a, b))
        elif op == "PRINT":
            output.append(str(stack.pop()))
    return output
`

const level1: LabLevel = {
  title: 'Arithmetic',
  spec: `Write \`run(program)\`, an interpreter for a tiny **stack machine**. The machine has one stack of integers. \`program\` is a string with one instruction per line, and \`run\` returns everything printed as a list of strings.

- \`PUSH n\` pushes the integer \`n\` (which may be negative).
- \`POP\` discards the top value.
- \`ADD\`, \`SUB\` and \`MUL\` pop \`b\` (the top), then \`a\`, and push \`a + b\`, \`a - b\` or \`a * b\`.
- \`PRINT\` pops the top value and appends \`str(value)\` to the output.

Instructions are uppercase. Extra spaces, tabs and indentation are fine, blank lines are ignored, and \`#\` starts a comment that runs to the end of the line. Each call to \`run\` starts with an empty stack and empty output.

Example:

\`PUSH 10\`
\`PUSH 4\`
\`SUB      # 10 - 4\`
\`PRINT\`
\`PUSH -2\`
\`PRINT\`

returns \`["6", "-2"]\`.

In this level every program is valid: no stack underflows and no unknown instructions.`,
  tests: L1_TESTS,
  hints: [
    '`program.splitlines()`, then for each line cut everything after `#` and `strip()` the rest. Skip the line if nothing is left.',
    '`op, *args = line.split()` separates the instruction from its argument; convert the `PUSH` argument with `int()`.',
    'Pop order matters: `b = stack.pop()` first, then `a = stack.pop()`, then push `a - b`. A dict from name to `operator.add`, `operator.sub` and `operator.mul` keeps the arithmetic in one branch.',
  ],
  solution: L1_SOLUTION,
}

/* ---------------------------------------------------------------- level 2 */

const L2_TESTS = py`
import sys as _l2_sys


class _L2Stuck(BaseException):
    pass


def _l2_run(*lines):
    """run() with a safety net: fails instead of hanging if the program never halts."""
    budget = [500_000]

    def tracer(frame, event, arg):
        budget[0] -= 1
        if budget[0] < 0:
            raise _L2Stuck()
        return tracer

    previous = _l2_sys.gettrace()
    _l2_sys.settrace(tracer)
    try:
        return run("\n".join(lines))
    except _L2Stuck:
        raise AssertionError("run() did not finish: probably an infinite loop (check JMP, JZ and your program counter)") from None
    finally:
        _l2_sys.settrace(previous)


def test_l2_countdown_spec_example():
    got = _l2_run("PUSH 3", "loop:", "DUP", "PRINT", "PUSH 1", "SUB", "DUP", "JZ done", "JMP loop", "done:")
    assert got == ["3", "2", "1"], f"got {got!r}, expected ['3', '2', '1']"


def test_l2_jmp_skips_code():
    got = _l2_run("PUSH 1", "PRINT", "JMP end", "PUSH 2", "PRINT", "end:", "PUSH 3", "PRINT")
    assert got == ["1", "3"], f"JMP should skip PUSH 2 / PRINT; got {got!r}"


def test_l2_jz_jumps_on_zero():
    got = _l2_run("PUSH 0", "JZ yes", "PUSH 1", "PRINT", "JMP end", "yes:", "PUSH 2", "PRINT", "end:")
    assert got == ["2"], f"JZ jumps when the popped value is 0; got {got!r}"


def test_l2_jz_falls_through_on_nonzero():
    got = _l2_run("PUSH 5", "JZ yes", "PUSH 1", "PRINT", "JMP end", "yes:", "PUSH 2", "PRINT", "end:")
    assert got == ["1"], f"JZ continues with the next line when the value isn't 0; got {got!r}"


def test_l2_jz_always_pops():
    got = _l2_run("PUSH 7", "PUSH 0", "JZ next", "next:", "PUSH 3", "JZ never", "PRINT", "never:")
    assert got == ["7"], f"JZ pops its value whether or not it jumps; got {got!r}"


def test_l2_dup():
    got = _l2_run("PUSH 4", "DUP", "MUL", "PRINT")
    assert got == ["16"], f"DUP copies the top, so 4 * 4 = 16; got {got!r}"


def test_l2_swap():
    got = _l2_run("PUSH 1", "PUSH 2", "SWAP", "PRINT", "PRINT")
    assert got == ["1", "2"], f"after SWAP the 1 is on top; got {got!r}"
    got = _l2_run("PUSH 10", "PUSH 3", "SWAP", "SUB", "PRINT")
    assert got == ["-7"], f"SWAP then SUB computes 3 - 10 = -7; got {got!r}"


def test_l2_squares_loop():
    got = _l2_run("PUSH 3", "loop:", "DUP", "DUP", "MUL", "PRINT", "PUSH 1", "SUB", "DUP", "JZ done", "JMP loop", "done:")
    assert got == ["9", "4", "1"], f"got {got!r}, expected ['9', '4', '1']"


def test_l2_label_at_end():
    got = _l2_run("PUSH 1", "JMP end", "PRINT", "end:")
    assert got == [], f"jumping to a label at the very end ends the program; got {got!r}"


def test_l2_label_lines_do_nothing():
    got = _l2_run("PUSH 1", "here:", "PUSH 2", "there:", "ADD", "PRINT")
    assert got == ["3"], f"label lines don't touch the stack; got {got!r}"


def test_l2_labels_with_comments_and_indentation():
    program = (
        "PUSH 2\n"
        "  top:        # loop header\n"
        "    DUP\n"
        "    PRINT\n"
        "    PUSH 1\n"
        "    SUB\n"
        "    DUP\n"
        "    JZ out    # leave at 0\n"
        "    JMP top\n"
        "out:\n"
    )
    got = _l2_run(program)
    assert got == ["2", "1"], f"labels may be indented and followed by a comment; got {got!r}"


def test_l2_label_names():
    got = _l2_run(
        "PUSH 0", "JZ end_2", "PUSH 9", "PRINT", "end_2:",
        "PUSH 0", "JZ Loop", "loop:", "PUSH 1", "PRINT", "Loop:", "PUSH 2", "PRINT",
    )
    assert got == ["2"], f"labels may contain digits and underscores, and are case-sensitive (Loop is not loop); got {got!r}"
`

const L2_SOLUTION = py`
import operator

BINARY = {"ADD": operator.add, "SUB": operator.sub, "MUL": operator.mul}


def parse(program: str):
    """Return (code, labels): code is a list of (op, args); labels map name -> index into code."""
    code = []
    labels = {}
    for raw in program.splitlines():
        line = raw.split("#", 1)[0].strip()
        if not line:
            continue
        if line.endswith(":"):
            labels[line[:-1].strip()] = len(code)  # the index of the next instruction
            continue
        op, *args = line.split()
        code.append((op, args))
    return code, labels


def run(program: str) -> list[str]:
    code, labels = parse(program)
    stack: list[int] = []
    output: list[str] = []
    pc = 0
    while pc < len(code):
        op, args = code[pc]
        pc += 1
        if op == "PUSH":
            stack.append(int(args[0]))
        elif op == "POP":
            stack.pop()
        elif op in BINARY:
            b = stack.pop()
            a = stack.pop()
            stack.append(BINARY[op](a, b))
        elif op == "PRINT":
            output.append(str(stack.pop()))
        elif op == "DUP":
            stack.append(stack[-1])
        elif op == "SWAP":
            stack[-1], stack[-2] = stack[-2], stack[-1]
        elif op == "JMP":
            pc = labels[args[0]]
        elif op == "JZ":
            if stack.pop() == 0:
                pc = labels[args[0]]
    return output
`

const level2: LabLevel = {
  title: 'Labels and jumps',
  spec: `Add **control flow**. A line holding just \`name:\` defines a **label**. It marks the position of the next instruction and does nothing itself. Label names are made of letters, digits and underscores, are case-sensitive, and can be used before they are defined.

- \`JMP label\` continues execution at the label.
- \`JZ label\` pops the top value; if it is \`0\` it jumps to the label, otherwise execution continues on the next line.
- \`DUP\` pushes a copy of the top value.
- \`SWAP\` swaps the top two values.

A label at the very end of the program is fine: jumping there ends the program.

Example, a countdown:

\`PUSH 3\`
\`loop:\`
\`DUP\`
\`PRINT\`
\`PUSH 1\`
\`SUB\`
\`DUP\`
\`JZ done\`
\`JMP loop\`
\`done:\`

returns \`["3", "2", "1"]\`. Programs in this level are still valid, and they always halt.`,
  tests: L2_TESTS,
  hints: [
    "You can't jump forward to a line you haven't read yet, so parse first: one pass builds a list of instructions and a dict from each label to the index of the instruction after it.",
    'Replace the for loop with a program counter: `while pc < len(code)`, fetch `code[pc]`, advance `pc += 1`, and let `JMP` and `JZ` overwrite `pc`.',
    '`JZ` pops the value whether or not it jumps. `SWAP` is `stack[-1], stack[-2] = stack[-2], stack[-1]`.',
  ],
  solution: L2_SOLUTION,
}

/* ---------------------------------------------------------------- level 3 */

const L3_TESTS = py`
import sys as _l3_sys


class _L3Stuck(BaseException):
    pass


def _l3_run(*lines, **kwargs):
    """run() with a safety net: fails instead of hanging if the program never halts."""
    budget = [1_500_000]

    def tracer(frame, event, arg):
        budget[0] -= 1
        if budget[0] < 0:
            raise _L3Stuck()
        return tracer

    previous = _l3_sys.gettrace()
    _l3_sys.settrace(tracer)
    try:
        return run("\n".join(lines), **kwargs)
    except _L3Stuck:
        raise AssertionError("run() did not finish: an infinite loop got past your step limit") from None
    finally:
        _l3_sys.settrace(previous)


def _l3_error(*lines, **kwargs):
    """Run a program that must fail, and return its VMError."""
    try:
        out = _l3_run(*lines, **kwargs)
    except VMError as err:
        return err
    raise AssertionError(f"expected a VMError, but run() returned {out!r}")


def _l3_expect(err, words, line):
    text = str(err).lower()
    assert words in text, f"the error should mention {words!r}; str(error) was {str(err)!r}"
    got_line = getattr(err, "line", None)
    assert got_line == line, f"the error should be on line {line}, but .line is {got_line!r} ({str(err)!r})"


def test_l3_vmerror_shape():
    err = VMError("boom", 3)
    assert isinstance(err, Exception), "VMError must subclass Exception"
    assert getattr(err, "message", None) == "boom", f".message should be 'boom', got {getattr(err, 'message', None)!r}"
    assert getattr(err, "line", None) == 3, f".line should be 3, got {getattr(err, 'line', None)!r}"
    assert "boom" in str(err), f"str(error) should contain the message, got {str(err)!r}"


def test_l3_store_and_load():
    got = _l3_run("PUSH 5", "STORE x", "LOAD x", "LOAD x", "MUL", "PRINT")
    assert got == ["25"], f"got {got!r}, expected ['25']"


def test_l3_store_pops():
    got = _l3_run("PUSH 1", "PUSH 2", "STORE x", "PRINT")
    assert got == ["1"], f"STORE pops the value it stores; got {got!r}"


def test_l3_sum_with_variables():
    got = _l3_run(
        "PUSH 0", "STORE total", "PUSH 10", "STORE n",
        "loop:", "LOAD n", "JZ done",
        "LOAD total", "LOAD n", "ADD", "STORE total",
        "LOAD n", "PUSH 1", "SUB", "STORE n", "JMP loop",
        "done:", "LOAD total", "PRINT",
    )
    assert got == ["55"], f"1 + 2 + ... + 10 = 55; got {got!r}"


def test_l3_stack_underflow_line_number():
    err = _l3_error("PUSH 1", "", "# ADD needs two values", "ADD")
    _l3_expect(err, "stack underflow", 4)


def test_l3_every_popping_instruction_checks():
    cases = [
        (["POP"], 1),
        (["PRINT"], 1),
        (["DUP"], 1),
        (["PUSH 1", "SWAP"], 2),
        (["PUSH 1", "SUB"], 2),
        (["STORE x"], 1),
        (["JZ end", "end:"], 1),
    ]
    for lines, line in cases:
        _l3_expect(_l3_error(*lines), "stack underflow", line)


def test_l3_unknown_instruction():
    _l3_expect(_l3_error("PUSH 1", "FROB"), "unknown instruction", 2)
    _l3_expect(_l3_error("push 1"), "unknown instruction", 1)


def test_l3_checked_before_running():
    err = _l3_error("POP", "PUSH 1", "FROB")
    _l3_expect(err, "unknown instruction", 3)


def test_l3_bad_arguments():
    cases = [
        (["PUSH"], 1),
        (["PUSH x"], 1),
        (["PUSH 1.5"], 1),
        (["PUSH 1 2"], 1),
        (["PUSH 1", "ADD 3"], 2),
        (["JMP"], 1),
        (["a:", "DUP a"], 2),
    ]
    for lines, line in cases:
        _l3_expect(_l3_error(*lines), "bad argument", line)


def test_l3_unknown_label():
    _l3_expect(_l3_error("PUSH 0", "JZ nowhere"), "unknown label", 2)
    _l3_expect(_l3_error("JMP end", "JMP missing", "end:"), "unknown label", 2)


def test_l3_duplicate_label():
    _l3_expect(_l3_error("a:", "PUSH 1", "a:", "PRINT"), "duplicate label", 3)


def test_l3_unknown_variable():
    _l3_expect(_l3_error("PUSH 1", "PRINT", "LOAD y"), "unknown variable", 3)


def test_l3_step_limit_boundary():
    program = ("start:", "PUSH 1", "PUSH 2", "ADD", "PRINT")
    got = _l3_run(*program, max_steps=4)
    assert got == ["3"], f"4 instructions fit in max_steps=4 (labels aren't steps); got {got!r}"
    _l3_expect(_l3_error(*program, max_steps=3), "step limit", 5)


def test_l3_infinite_loop_stops():
    _l3_expect(_l3_error("loop:", "JMP loop"), "step limit", 2)


def test_l3_default_limit_is_10000():
    # straight-line code always halts, so this test skips the hang guard (it's faster without)
    exactly = "\n".join(["PUSH 1", "POP"] * 5000)
    got = run(exactly)
    assert got == [], f"a program of exactly 10,000 instructions must run; got {got!r}"
    try:
        out = run(exactly + "\nPUSH 1")
    except VMError as err:
        _l3_expect(err, "step limit", 10001)
        return
    raise AssertionError(f"10,001 instructions should exceed the default max_steps of 10,000, but run() returned {out!r}")
`

const L3_SOLUTION = py`
import operator

BINARY = {"ADD": operator.add, "SUB": operator.sub, "MUL": operator.mul}
# the argument each instruction takes: None, an integer, a label or a variable name
ARG_KIND = {
    "PUSH": "int", "POP": None, "ADD": None, "SUB": None, "MUL": None, "PRINT": None,
    "DUP": None, "SWAP": None, "JMP": "label", "JZ": "label", "STORE": "name", "LOAD": "name",
}
# how many values each instruction needs on the stack
NEEDS = {"POP": 1, "ADD": 2, "SUB": 2, "MUL": 2, "PRINT": 1, "DUP": 1, "SWAP": 2, "JZ": 1, "STORE": 1}


class VMError(Exception):
    def __init__(self, message: str, line: int) -> None:
        super().__init__(f"line {line}: {message}")
        self.message = message
        self.line = line


def parse(program: str):
    """Check the whole program, then return (code, labels).

    code is a list of (op, arg, line); labels map a name to an index into code.
    """
    code = []
    labels = {}
    for line_no, raw in enumerate(program.splitlines(), start=1):
        text = raw.split("#", 1)[0].strip()
        if not text:
            continue
        if text.endswith(":"):
            name = text[:-1].strip()
            if name in labels:
                raise VMError(f"duplicate label {name!r}", line_no)
            labels[name] = len(code)
            continue
        op, *args = text.split()
        if op not in ARG_KIND:
            raise VMError(f"unknown instruction {op!r}", line_no)
        kind = ARG_KIND[op]
        if len(args) != (0 if kind is None else 1):
            raise VMError(f"bad argument count for {op}: {args}", line_no)
        arg = args[0] if args else None
        if kind == "int":
            try:
                arg = int(arg)
            except ValueError:
                raise VMError(f"bad argument {arg!r}: {op} needs an integer", line_no) from None
        code.append((op, arg, line_no))
    for op, arg, line_no in code:  # every label is known now, so check jump targets
        if ARG_KIND[op] == "label" and arg not in labels:
            raise VMError(f"unknown label {arg!r}", line_no)
    return code, labels


def run(program: str, max_steps: int = 10_000) -> list[str]:
    code, labels = parse(program)
    stack: list[int] = []
    output: list[str] = []
    variables: dict[str, int] = {}
    pc = 0
    steps = 0
    while pc < len(code):
        op, arg, line = code[pc]
        steps += 1
        if steps > max_steps:
            raise VMError(f"step limit of {max_steps} exceeded", line)
        if len(stack) < NEEDS.get(op, 0):
            raise VMError(f"stack underflow: {op} needs {NEEDS[op]} value(s)", line)
        pc += 1
        if op == "PUSH":
            stack.append(arg)
        elif op == "POP":
            stack.pop()
        elif op in BINARY:
            b = stack.pop()
            a = stack.pop()
            stack.append(BINARY[op](a, b))
        elif op == "PRINT":
            output.append(str(stack.pop()))
        elif op == "DUP":
            stack.append(stack[-1])
        elif op == "SWAP":
            stack[-1], stack[-2] = stack[-2], stack[-1]
        elif op == "JMP":
            pc = labels[arg]
        elif op == "JZ":
            if stack.pop() == 0:
                pc = labels[arg]
        elif op == "STORE":
            variables[arg] = stack.pop()
        elif op == "LOAD":
            if arg not in variables:
                raise VMError(f"unknown variable {arg!r}", line)
            stack.append(variables[arg])
    return output
`

const level3: LabLevel = {
  title: 'Variables, errors, step limit',
  spec: `Give the machine memory, and make it safe to run programs you didn't write.

**Variables.** \`STORE name\` pops the top value into variable \`name\`; \`LOAD name\` pushes its value. Variables are global.

**Errors.** Define \`class VMError(Exception)\` whose \`__init__(self, message, line)\` stores \`.message\` and \`.line\`: the 1-based line number in \`program\`, counting blank and comment lines. \`str(error)\` must contain the message.

Each error's message must contain the phrase shown in code below.

Checked **before anything runs**, for the whole program, including code that would never execute:

- an unknown instruction, including lowercase ones like \`push\`: \`unknown instruction\`
- the wrong number of arguments, or a \`PUSH\` argument that isn't an integer: \`bad argument\`
- a jump to a label that doesn't exist, on the jump's line: \`unknown label\`
- a label defined twice, on the second definition's line: \`duplicate label\`

Checked **while running**:

- an instruction that needs more values than the stack holds (\`SWAP\` and \`ADD\` need two, \`DUP\` one): \`stack underflow\`
- \`LOAD\` of a variable that was never stored: \`unknown variable\`
- running too long: \`step limit\`

The step limit is a new parameter: \`run(program, max_steps=10_000)\`. Every executed instruction is one step; labels are not instructions. A program may execute at most \`max_steps\` instructions; trying to execute one more raises, on that instruction's line.

Example: for the two-line program \`PUSH 1\` / \`ADD\`, \`run\` raises \`VMError\` with line 2 and a message like \`stack underflow: ADD needs 2 value(s)\`. Tests use one problem per program.`,
  tests: L3_TESTS,
  hints: [
    'Split checking from running. Your parser validates every line (known instruction, argument count and type) and, once it has seen every label, every jump target. Only then does execution start.',
    'Keep the source line number next to each parsed instruction. A table of how many values each instruction needs (`ADD`: 2, `DUP`: 1, `JZ`: 1, ...) lets you check underflow in one place, before executing.',
    'Count steps at the top of the loop: `steps += 1`, and if `steps > max_steps`, raise with the line of the instruction you were about to run.',
  ],
  solution: L3_SOLUTION,
}

/* ---------------------------------------------------------------- level 4 */

const L4_TESTS = py`
import sys as _l4_sys


class _L4Stuck(BaseException):
    pass


_L4_FACT = (
    "PUSH 5", "CALL fact", "PRINT", "HALT",
    "fact:", "DUP", "JZ base", "DUP", "PUSH 1", "SUB", "CALL fact", "MUL", "RET",
    "base:", "POP", "PUSH 1", "RET",
)


def _l4_run(*lines, **kwargs):
    """run() with a safety net: fails instead of hanging if the program never halts."""
    budget = [2_000_000]

    def tracer(frame, event, arg):
        budget[0] -= 1
        if budget[0] < 0:
            raise _L4Stuck()
        return tracer

    previous = _l4_sys.gettrace()
    _l4_sys.settrace(tracer)
    try:
        return run("\n".join(lines), **kwargs)
    except _L4Stuck:
        raise AssertionError("run() did not finish: check CALL/RET, and that they count as steps") from None
    finally:
        _l4_sys.settrace(previous)


def _l4_error(*lines, **kwargs):
    """Run a program that must fail, and return its VMError."""
    try:
        out = _l4_run(*lines, **kwargs)
    except VMError as err:
        return err
    raise AssertionError(f"expected a VMError, but run() returned {out!r}")


def _l4_expect(err, words, line):
    text = str(err).lower()
    assert words in text, f"the error should mention {words!r}; str(error) was {str(err)!r}"
    got_line = getattr(err, "line", None)
    assert got_line == line, f"the error should be on line {line}, but .line is {got_line!r} ({str(err)!r})"


def test_l4_call_and_ret():
    got = _l4_run("CALL greet", "PUSH 2", "PRINT", "HALT", "greet:", "PUSH 1", "PRINT", "RET")
    assert got == ["1", "2"], f"CALL runs the subroutine, and RET resumes after the CALL; got {got!r}"


def test_l4_halt_stops_immediately():
    got = _l4_run("PUSH 1", "PRINT", "HALT", "PUSH 2", "PRINT")
    assert got == ["1"], f"HALT stops the program and keeps the output so far; got {got!r}"


def test_l4_halt_inside_subroutine():
    got = _l4_run("CALL f", "PUSH 9", "PRINT", "f:", "PUSH 1", "PRINT", "HALT")
    assert got == ["1"], f"HALT inside a subroutine stops everything; got {got!r}"


def test_l4_arguments_and_results_on_data_stack():
    got = _l4_run("PUSH 7", "CALL square", "PRINT", "HALT", "square:", "DUP", "MUL", "RET")
    assert got == ["49"], f"got {got!r}, expected ['49']"


def test_l4_nested_calls():
    got = _l4_run(
        "CALL a", "PUSH 0", "PRINT", "HALT",
        "a:", "PUSH 1", "PRINT", "CALL b", "PUSH 3", "PRINT", "RET",
        "b:", "PUSH 2", "PRINT", "RET",
    )
    assert got == ["1", "2", "3", "0"], f"each RET returns to its own caller; got {got!r}"


def test_l4_recursive_factorial():
    got = _l4_run(*_L4_FACT)
    assert got == ["120"], f"5! = 120; got {got!r}"
    got = _l4_run("PUSH 10", *_L4_FACT[1:])
    assert got == ["3628800"], f"10! = 3628800; got {got!r}"


def test_l4_ret_with_empty_call_stack():
    _l4_expect(_l4_error("PUSH 1", "RET"), "call stack", 2)


def test_l4_falling_into_a_subroutine():
    _l4_expect(_l4_error("CALL f", "f:", "RET"), "call stack", 3)


def test_l4_call_target_checked_before_running():
    _l4_expect(_l4_error("PUSH 1", "PRINT", "HALT", "CALL nowhere"), "unknown label", 4)


def test_l4_bad_arguments():
    for lines, line in [(["CALL"], 1), (["f:", "RET 1"], 2), (["HALT now"], 1)]:
        _l4_expect(_l4_error(*lines), "bad argument", line)


def test_l4_return_addresses_stay_off_the_data_stack():
    got = _l4_run("PUSH 1", "PUSH 2", "CALL drop2", "PUSH 3", "PRINT", "HALT", "drop2:", "POP", "POP", "RET")
    assert got == ["3"], f"a subroutine that pops all its arguments must still return correctly; got {got!r}"
    _l4_expect(_l4_error("CALL f", "HALT", "f:", "POP", "RET"), "stack underflow", 4)


def test_l4_steps_include_call_ret_and_halt():
    program = ("CALL f", "HALT", "f:", "RET")
    got = _l4_run(*program, max_steps=3)
    assert got == [], f"CALL, RET and HALT are 3 steps and fit in max_steps=3; got {got!r}"
    _l4_expect(_l4_error(*program, max_steps=2), "step limit", 2)


def test_l4_infinite_recursion_hits_step_limit():
    _l4_expect(_l4_error("f:", "CALL f"), "step limit", 2)


def test_l4_deep_recursion_without_python_recursion():
    program = (
        "PUSH 3000", "CALL down", "PRINT", "HALT",
        "down:", "DUP", "JZ zero", "PUSH 1", "SUB", "CALL down", "RET",
        "zero:", "RET",
    )
    try:
        got = _l4_run(*program, max_steps=100_000)
    except RecursionError:
        raise AssertionError("RecursionError: keep return addresses in a list instead of recursing in Python on each CALL") from None
    assert got == ["0"], f"a 3,000-deep recursion should finish and print 0; got {got!r}"
`

const L4_SOLUTION = py`
import operator

BINARY = {"ADD": operator.add, "SUB": operator.sub, "MUL": operator.mul}
ARG_KIND = {
    "PUSH": "int", "POP": None, "ADD": None, "SUB": None, "MUL": None, "PRINT": None,
    "DUP": None, "SWAP": None, "JMP": "label", "JZ": "label", "STORE": "name", "LOAD": "name",
    "CALL": "label", "RET": None, "HALT": None,
}
NEEDS = {"POP": 1, "ADD": 2, "SUB": 2, "MUL": 2, "PRINT": 1, "DUP": 1, "SWAP": 2, "JZ": 1, "STORE": 1}


class VMError(Exception):
    def __init__(self, message: str, line: int) -> None:
        super().__init__(f"line {line}: {message}")
        self.message = message
        self.line = line


def parse(program: str):
    """Check the whole program, then return (code, labels).

    code is a list of (op, arg, line); labels map a name to an index into code.
    """
    code = []
    labels = {}
    for line_no, raw in enumerate(program.splitlines(), start=1):
        text = raw.split("#", 1)[0].strip()
        if not text:
            continue
        if text.endswith(":"):
            name = text[:-1].strip()
            if name in labels:
                raise VMError(f"duplicate label {name!r}", line_no)
            labels[name] = len(code)
            continue
        op, *args = text.split()
        if op not in ARG_KIND:
            raise VMError(f"unknown instruction {op!r}", line_no)
        kind = ARG_KIND[op]
        if len(args) != (0 if kind is None else 1):
            raise VMError(f"bad argument count for {op}: {args}", line_no)
        arg = args[0] if args else None
        if kind == "int":
            try:
                arg = int(arg)
            except ValueError:
                raise VMError(f"bad argument {arg!r}: {op} needs an integer", line_no) from None
        code.append((op, arg, line_no))
    for op, arg, line_no in code:
        if ARG_KIND[op] == "label" and arg not in labels:
            raise VMError(f"unknown label {arg!r}", line_no)
    return code, labels


def run(program: str, max_steps: int = 10_000) -> list[str]:
    code, labels = parse(program)
    stack: list[int] = []
    calls: list[int] = []  # return addresses: separate from the data stack
    output: list[str] = []
    variables: dict[str, int] = {}
    pc = 0
    steps = 0
    while pc < len(code):
        op, arg, line = code[pc]
        steps += 1
        if steps > max_steps:
            raise VMError(f"step limit of {max_steps} exceeded", line)
        if len(stack) < NEEDS.get(op, 0):
            raise VMError(f"stack underflow: {op} needs {NEEDS[op]} value(s)", line)
        pc += 1
        if op == "PUSH":
            stack.append(arg)
        elif op == "POP":
            stack.pop()
        elif op in BINARY:
            b = stack.pop()
            a = stack.pop()
            stack.append(BINARY[op](a, b))
        elif op == "PRINT":
            output.append(str(stack.pop()))
        elif op == "DUP":
            stack.append(stack[-1])
        elif op == "SWAP":
            stack[-1], stack[-2] = stack[-2], stack[-1]
        elif op == "JMP":
            pc = labels[arg]
        elif op == "JZ":
            if stack.pop() == 0:
                pc = labels[arg]
        elif op == "STORE":
            variables[arg] = stack.pop()
        elif op == "LOAD":
            if arg not in variables:
                raise VMError(f"unknown variable {arg!r}", line)
            stack.append(variables[arg])
        elif op == "CALL":
            calls.append(pc)  # pc already points at the instruction after the CALL
            pc = labels[arg]
        elif op == "RET":
            if not calls:
                raise VMError("RET with an empty call stack", line)
            pc = calls.pop()
        elif op == "HALT":
            break
    return output
`

const level4: LabLevel = {
  title: 'Subroutines',
  spec: `Add **subroutines**.

- \`CALL label\` pushes the return address (the instruction after the \`CALL\`) onto a **call stack**, then jumps to \`label\`.
- \`RET\` pops a return address from the call stack and continues there. \`RET\` with an empty call stack raises \`VMError\` with a message containing \`call stack\`.
- \`HALT\` stops the program immediately; \`run\` returns the output so far.

The call stack is **separate from the data stack**. Arguments and results travel on the data stack; return addresses never do. So a subroutine that pops everything it was given still returns to the right place, and \`POP\` on an empty data stack is still a \`stack underflow\`, even inside a call.

\`CALL\` takes exactly one label; \`RET\` and \`HALT\` take no arguments. The level 3 checks apply to them too, so \`RET 1\` is a \`bad argument\` and \`CALL\` targets are checked before running, like jump targets. \`CALL\`, \`RET\` and \`HALT\` each count as one step. Don't use Python recursion for \`CALL\`: a program 3,000 calls deep must work (given a big enough \`max_steps\`).

Example, a recursive factorial:

\`PUSH 5\`
\`CALL fact\`
\`PRINT\`
\`HALT\`
\`fact:       # n -> n!\`
\`DUP\`
\`JZ base\`
\`DUP\`
\`PUSH 1\`
\`SUB\`
\`CALL fact\`
\`MUL\`
\`RET\`
\`base:\`
\`POP\`
\`PUSH 1\`
\`RET\`

returns \`["120"]\`.`,
  tests: L4_TESTS,
  hints: [
    'A call stack is just a second list. `CALL` appends `pc` (which already points at the next instruction) and jumps; `RET` pops it back into `pc`.',
    '`HALT` is a `break` out of the run loop. `CALL` targets go through the same unknown-label check as `JMP` and `JZ`.',
    "Don't implement `CALL` by calling your interpreter recursively: Python's default recursion limit is about 1,000 frames, and the tests go 3,000 deep.",
  ],
  solution: L4_SOLUTION,
}

/* -------------------------------------------------------------------- lab */

const lab: Lab = {
  id: 'stack-vm',
  title: 'Stack machine interpreter',
  area: 'builds',
  summary:
    'Interpret a tiny stack-machine language: arithmetic, then **jumps**, variables, **errors with line numbers** and a step limit, and finally **subroutines** with their own call stack.',
  minutes: 75,
  starter: STARTER,
  levels: [level1, level2, level3, level4],
  followUps: [
    'You are running untrusted programs. Besides `max_steps`, what else can a program exhaust (data-stack size, call depth, integers that grow with every `MUL`)? Add a limit for each and say what error a user should see.',
    'You need to run 10,000 user programs per second. Threads or processes, and where does the GIL bite? How do you stop one runaway program from hurting the others: a step limit, a wall-clock timeout, or both?',
    'Make it faster. Decode once into tuples or small closures, resolve labels to indexes before running, and avoid string compares in the hot loop. What would you measure before and after?',
    'How would you test an interpreter beyond these cases? Think golden-output tests, one test per error path with exact line numbers, and fuzzing random programs against a second, simpler implementation.',
  ],
}

export default lab
