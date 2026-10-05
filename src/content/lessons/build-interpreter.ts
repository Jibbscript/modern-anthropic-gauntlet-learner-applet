import type { Lesson } from '../../core/types'

const lesson: Lesson = {
  id: 'build-interpreter',
  title: 'A tiny interpreter',
  summary: 'Parse a toy instruction set, run it on a stack machine, and extend it without rewriting the loop.',
  minutes: 8,
  skills: ['build.interpreter', 'py.testing'],
  steps: [
    {
      kind: 'concept',
      id: 'hook',
      eyebrow: 'Build round',
      title: 'A loop and a dict',
      body:
        'Small interpreters show up in a handful of candidate reports, far fewer than crawlers or file dedup: a made-up instruction set, a short spec, make it run.\n\n' +
        "This isn't compiler work. A clean interpreter is three pieces: a parser that turns lines into `(op, args, line_no)`, a dict of handlers, and a loop with a program counter. The test is building them cleanly, then ==extending them without a rewrite==.",
      code: {
        lang: 'text',
        code: `# add two numbers and print the result
PUSH 3
PUSH 4
ADD
PRINT
HALT`,
        caption: 'Prints `7`.',
      },
    },
    {
      kind: 'mcq',
      id: 'parse-edges',
      eyebrow: 'Parsing',
      multi: true,
      prompt:
        'Your parser turns each source line into `(op, args, line_no)`. Which inputs should it accept without raising? Select all.',
      choices: [
        {
          text: '`  push 5` (indented, lower case)',
          correct: true,
          feedback: 'Unless the spec says otherwise, strip whitespace and normalize case. Rejecting this is pedantry, not rigor.',
        },
        {
          text: 'Blank lines and `# comment` lines',
          correct: true,
          feedback: 'Skip them, but keep counting, so later errors report the real source line.',
        },
        {
          text: '`loop:`',
          correct: true,
          feedback: 'A label marks a position. Record it; it is not an instruction.',
        },
        {
          text: '`ADD 7` (an extra argument)',
          feedback: 'Silently ignoring it hides a mistake in the program. Raise: `line 9: ADD takes 0 args, got 1`.',
        },
        {
          text: '`PUSH x` (a non-integer)',
          feedback: 'Fail at parse time with the line number, not three instructions later inside ADD.',
        },
      ],
      explanation:
        'Be lenient about formatting and strict about meaning. Anything that changes what the program does (wrong arity, bad literals) should fail at load time with the line number.',
    },
    {
      kind: 'concept',
      id: 'stack',
      title: 'Pop two, push one',
      body:
        'Operands live on a stack. `PUSH 7` pushes. Binary ops pop two values and push the result, and ==the first pop is the right-hand operand==. So `PUSH 10`, `PUSH 4`, `SUB` pops 4 (b), then 10 (a), and pushes `a - b` = 6.\n\n' +
        'In this lesson `DUP` copies the top, `SWAP` flips the top two, and `JZ` and `PRINT` pop their value.',
      code: {
        code: `def binop(self, fn):
    b = self.pop()  # top: right operand
    a = self.pop()
    self.push(fn(a, b))`,
      },
    },
    {
      kind: 'widget',
      id: 'vm-predict',
      eyebrow: 'Try it',
      prompt:
        'Step through this program. Partway in, the machine pauses and asks what is on top of the stack. Mind the pop order.',
      goal: 'Predict the top of the stack',
      widget: {
        id: 'vm',
        config: {
          program: ['PUSH 10', 'PUSH 4', 'SUB', 'DUP', 'DUP', 'MUL', 'MUL', 'PRINT', 'HALT'],
          predict: { line: 4, options: [6, -6, 14, 216], answer: 6 },
          goal: 'predict',
        },
      },
      explanation:
        'SUB pops 4, then 10, and pushes 10 − 4 = 6. The DUPs copy it and the MULs make 6 × 6 × 6 = 216 for PRINT. If you said −6, you subtracted in pop order. That exact bug turns up later in this lesson.',
    },
    {
      kind: 'concept',
      id: 'dispatch',
      title: 'Dispatch with a dict',
      body:
        'An `if op == "PUSH": … elif …` chain is fine at five ops and rots at fifteen: every new op edits the loop. A dict from op name to handler keeps the loop fixed. Adding an op is one function plus one entry, and an unknown op is a single `None` check.\n\n' +
        'Handlers that jump return a label; everything else returns `None`.',
      code: {
        code: `def op_push(vm, n):
    vm.push(n)

def op_sub(vm):
    vm.binop(operator.sub)

def op_jz(vm, label):
    if vm.pop() == 0:
        return label  # loop jumps there

DISPATCH = {"PUSH": op_push,
            "SUB": op_sub,
            "JZ": op_jz}`,
      },
    },
    {
      kind: 'cloze',
      id: 'core-loop',
      eyebrow: 'Your turn',
      prompt:
        'Fill in the core loop. A parser already produced `program` (a list of `(op, args, line)`) and `labels` (label name → instruction index). HALT sets `vm.halted`.',
      code: `def run(program, labels):
    vm, pc, n = VM(), 0, len(program)
    while pc < n and not vm.halted:
        op, args, line = program[pc]
        handler = DISPATCH.{{0}}(op)
        if handler is None:
            raise VMError(
                f"line {line}: unknown op")
        target = handler(vm, *args)
        if target is None:
            pc = {{1}}
        else:
            pc = {{2}}
    return vm`,
      blanks: [
        { options: ['get', 'pop', 'setdefault'], answer: 0 },
        { options: ['pc + 1', 'pc', 'target'], answer: 0 },
        { options: ['labels[target]', 'target + 1', 'pc + 1'], answer: 0 },
      ],
      explanation:
        '`.get` returns `None` for unknown ops. `.pop` would delete the handler after its first use, and `.setdefault` would quietly write `op: None` into the shared table. With no jump the counter advances by one; with a jump it moves to the index the label maps to.',
      hint: 'Which dict method looks something up without changing the dict?',
    },
    {
      kind: 'order',
      id: 'run-order',
      eyebrow: 'Sequence',
      prompt: 'Put the interpreter’s work in order, from source text to finished run.',
      items: [
        'Parse each line into `(op, args, line_no)`',
        'Pre-pass: map every label to its instruction index',
        'Reject jumps to undefined labels',
        'Set `pc = 0` and loop while it is in range',
        'Fetch the instruction at `pc` and look up its handler',
        'Run it, then set `pc` to the jump target or `pc + 1`',
      ],
      explanation:
        'Labels need their own pass because `JMP end` can point forward to a label the loop has not reached yet. Doing it up front also lets you reject undefined labels before a single instruction runs.',
      hint: 'A forward jump needs to know where its label is before execution gets there.',
    },
    {
      kind: 'predict',
      id: 'countdown',
      eyebrow: 'Predict',
      prompt:
        'Same rules: binary ops compute `a op b` with b from the top; `DUP` copies the top; `JZ` and `PRINT` pop. What does this print? One value per line.',
      lang: 'text',
      code: `PUSH 9
loop:
DUP
JZ end
DUP
PRINT
PUSH 3
SUB
JMP loop
end:
HALT`,
      answers: ['9\n6\n3', '9 6 3', '9, 6, 3'],
      explanation:
        'Each pass: DUP and JZ test the counter without losing it, DUP and PRINT output it, then `PUSH 3`, `SUB` computes n − 3. After printing 3 the counter becomes 0, JZ jumps to `end`, and the machine halts. Nothing prints for 0.',
      hint: 'Track the stack after each line for the first pass. It only ever holds one or two values.',
    },
    {
      kind: 'mcq',
      id: 'never-halts',
      eyebrow: 'What if',
      prompt: 'Change the first line to `PUSH 10` and run it again. What happens?',
      choices: [
        {
          text: 'It prints 10, 7, 4, 1, −2, … and never halts',
          correct: true,
          feedback: 'Yes. JZ only exits on exactly 0, and the counter steps right past it.',
        },
        {
          text: 'It prints 10, 7, 4, 1 and halts',
          feedback: 'There is no check for "below zero". 1 − 3 = −2, which is not 0, so the loop continues.',
        },
        {
          text: 'It prints 10, 7, 4, 1, 0 and halts',
          feedback: 'The counter goes 10, 7, 4, 1, −2. It never lands on 0.',
        },
        {
          text: 'It raises a stack underflow',
          feedback: 'Each pass pushes and pops the same number of values, so the stack stays at one value between passes.',
        },
      ],
      explanation:
        'Programs you are handed can loop forever, and so can programs that hit a bug in your interpreter. A step limit (`max_steps`) turns a hang into an error with a line number. In a timed round, a hung test run eats your remaining minutes.',
    },
    {
      kind: 'concept',
      id: 'errors',
      title: 'Errors that point at the line',
      body:
        'When a program is wrong, say where and why. Carry the source line from the parser into every instruction and raise one exception type with it.\n\n' +
        'Check what you can at **load time**: unknown ops, wrong arg counts, undefined labels. Check the rest at **run time**: stack underflow, unknown variables, the step limit. A bare `IndexError` from `list.pop()` tells the user nothing.',
      code: {
        code: `class VMError(Exception):
    pass

def pop(self):
    if not self.stack:
        raise VMError(
            f"line {self.line}: stack underflow")
    return self.stack.pop()`,
      },
    },
    {
      kind: 'spotbug',
      id: 'sub-order',
      eyebrow: 'Find the bug',
      prompt: '`PUSH 10`, `PUSH 4`, `SUB`, `PRINT` prints `-6`. The tests for ADD and MUL pass. Tap the bug.',
      code: `class VM:
    def __init__(self):
        self.stack = []

    def pop(self):
        if not self.stack:
            raise VMError("stack underflow")
        return self.stack.pop()

    def binop(self, fn):
        b = self.pop()
        a = self.pop()
        self.stack.append(fn(b, a))

OPS = {"ADD": operator.add,
       "SUB": operator.sub,
       "MUL": operator.mul}`,
      bugLines: [13],
      explanation:
        'b is the top (4) and a is below it (10), so `fn(b, a)` computes 4 − 10. ADD and MUL commute, which is why their tests pass and the bug hides. Test every op with asymmetric operands.',
      fix: { code: '        self.stack.append(fn(a, b))' },
      hint: 'Which ops would give the same answer with the operands swapped?',
    },
    {
      kind: 'match',
      id: 'tests',
      eyebrow: 'Test it yourself',
      prompt: 'Match each test to the bug it catches.',
      pairs: [
        { left: '`PUSH 10`, `PUSH 4`, `SUB` leaves 6', right: 'Swapped operand order' },
        { left: '`JZ` on 0 jumps; on 1 it falls through', right: 'A branch that only works one way' },
        { left: '`POP` on an empty stack raises `VMError` naming line 1', right: 'A bare `IndexError` reaching the user' },
        { left: '`JMP nowhere` fails before anything runs', right: 'Labels checked too late' },
        { left: '`top:` then `JMP top` with `max_steps=100` raises', right: 'An interpreter that hangs' },
      ],
      explanation:
        'One small test per op plus one per error path. Each is a three-line program and an expected output or exception, which makes a table-driven test the natural shape.',
    },
    {
      kind: 'interview',
      id: 'extend',
      eyebrow: 'Interview sim',
      setup: 'All the basic ops pass. The interviewer extends the problem.',
      turns: [
        {
          interviewer: 'Add `CALL label` and `RET` so programs can have subroutines. How?',
          options: [
            {
              text: 'Push the return address onto the data stack; RET pops it and jumps there.',
              quality: 'okay',
              feedback:
                'It can work, but a subroutine that leaves an extra value behind makes RET jump to garbage. Name that risk if you choose it.',
            },
            {
              text: 'A separate call stack: CALL pushes `pc + 1` and jumps, RET pops and jumps there. RET on an empty call stack is a `VMError` with the line.',
              quality: 'strong',
              feedback:
                'Keeps values and control flow apart and designs the error path up front. The loop changes in one place: handlers may now return an index as well as a label.',
            },
            {
              text: 'Have CALL recursively invoke `run()` from the label, so Python’s own call stack tracks return addresses for free.',
              quality: 'weak',
              feedback:
                'Clever, but the loop now nests inside itself: Python’s recursion limit caps call depth, and a `JMP` out of the subroutine has nowhere sane to land.',
            },
          ],
        },
        {
          interviewer: 'How do you know CALL and RET work?',
          options: [
            {
              text: 'Run the sample program; if it prints the right answer, it works.',
              quality: 'weak',
              feedback: 'One happy path proves little. It cannot tell you what happens on a bad RET.',
            },
            {
              text: 'A test program where main CALLs a subroutine that returns, asserting on the printed output.',
              quality: 'okay',
              feedback: 'A start, but nested calls and the error path are where the bugs live.',
            },
            {
              text: 'Table tests: a call that returns, nested calls, RET with an empty call stack, recursion hitting the step limit. Then rerun every earlier op test.',
              quality: 'strong',
              feedback: 'Covers the happy path, the depth case, the error path, and regressions.',
            },
          ],
        },
        {
          interviewer: 'A user says big programs run slowly. Where do you look first?',
          options: [
            {
              text: 'Profile first. The likely win is doing name lookups once at load time: store each handler and jump index in the instruction, so the loop does no dict lookups.',
              quality: 'strong',
              feedback: 'Measures before changing anything, then moves work out of the hot loop.',
            },
            {
              text: 'Split the program into chunks and run them on a thread pool, since each instruction is small and does its own work.',
              quality: 'weak',
              feedback:
                'Each instruction reads the stack the previous one left, so nothing is independent. And pure-Python threads do not run bytecode in parallel under the GIL anyway.',
            },
            {
              text: 'Switch to PyPy; its JIT usually speeds up dispatch loops like this one a lot.',
              quality: 'okay',
              feedback: 'Might help, but it skips finding out where the time goes. Lead with a profile.',
            },
          ],
        },
      ],
      wrapUp:
        'Extensions are where a clean structure pays off: CALL/RET is one new data structure and two handlers, not a rewrite. Strong answers also say how they will prove it works.',
    },
    {
      kind: 'concept',
      id: 'recap',
      eyebrow: 'Recap',
      title: 'What to remember',
      body:
        '1. **Three pieces**: a parser that keeps line numbers, a dict from op to handler, a loop with a program counter.\n' +
        '2. **Semantics are precise**: the first pop is the right operand; labels resolve in a pre-pass; jumps return a target.\n' +
        '3. **Fail usefully**: load-time checks, `VMError` with line numbers, a step limit. Then one small test per op and per error.',
      callout: { tone: 'tip', text: 'Build the whole thing in the **Stack machine interpreter** Code Lab on the Practice tab.' },
    },
  ],
  cards: [
    {
      id: 'build-interpreter.swap-sub',
      skill: 'build.interpreter',
      kind: 'predict',
      prompt: 'Binary ops compute `a op b`, where b was on top. `SWAP` flips the top two. What does this print?',
      lang: 'text',
      code: `PUSH 2
PUSH 5
SWAP
SUB
PRINT`,
      answers: ['3'],
      explanation: 'Stack 2 5, SWAP makes it 5 2. SUB pops b = 2, then a = 5, and pushes 5 − 2 = 3.',
    },
    {
      id: 'build-interpreter.prepass',
      skill: 'build.interpreter',
      kind: 'flash',
      front: 'Why resolve labels in a separate pass before running a program?',
      back: 'Jumps can point forward to labels execution has not reached yet. A pre-pass maps every label to an index, and lets you reject undefined labels before anything runs.',
    },
    {
      id: 'build-interpreter.dispatch-payoff',
      skill: 'build.interpreter',
      kind: 'mcq',
      prompt: 'What is the main payoff of `DISPATCH = {op: handler}` over an `if/elif` chain in the run loop?',
      choices: [
        {
          text: 'Adding an op never touches the loop, and unknown ops are one check',
          correct: true,
          feedback: 'Yes: the loop stays fixed while the instruction set grows.',
        },
        {
          text: 'It makes a 10-op interpreter dramatically faster',
          feedback: 'At this size both are fast. The win is structure, not speed.',
        },
        {
          text: 'It lets instructions run in parallel',
          feedback: 'Each instruction depends on the previous stack. Dispatch style changes nothing there.',
        },
        {
          text: 'It removes the need for a program counter',
          feedback: 'You still need `pc` to know which instruction runs next and to jump.',
        },
      ],
      explanation: 'A dict of handlers is the open/closed principle at small scale: extend by adding entries, not by editing control flow.',
    },
    {
      id: 'build-interpreter.when-checked',
      skill: 'build.interpreter',
      kind: 'sort',
      prompt: 'Which errors can an interpreter catch before running, and which only during a run?',
      buckets: [
        { id: 'load', label: 'Load time' },
        { id: 'run', label: 'Run time' },
      ],
      items: [
        { text: 'Unknown op `PSUH`', bucket: 'load' },
        { text: '`JMP` to an undefined label', bucket: 'load' },
        { text: '`PUSH` with a non-integer argument', bucket: 'load' },
        { text: 'Stack underflow on `ADD`', bucket: 'run', why: 'Depends on which path execution took.' },
        { text: 'Step limit exceeded', bucket: 'run' },
        { text: '`RET` with an empty call stack', bucket: 'run', why: 'Depends on the call history at that moment.' },
      ],
      explanation: 'Anything visible in the text alone is a load-time error. Anything that depends on the state of a run can only be caught at run time.',
    },
    {
      id: 'build-interpreter.jz-peek',
      skill: 'build.interpreter',
      kind: 'spotbug',
      prompt: '`JZ` is specified to pop its value. A countdown loop prints the right numbers, but the stack grows by one value every pass. Tap the bug.',
      code: `def op_jmp(vm, label):
    return label

def op_jz(vm, label):
    if vm.stack[-1] == 0:
        return label

def op_dup(vm):
    vm.push(vm.stack[-1])`,
      bugLines: [5],
      explanation: '`vm.stack[-1]` peeks; the value is never removed, so every pass leaks one value. `op_dup` peeks on purpose: copying is its whole job.',
      fix: { code: '    if vm.pop() == 0:' },
    },
    {
      id: 'build-interpreter.error-answer',
      skill: 'build.interpreter',
      kind: 'compare',
      question: 'How does your interpreter report errors in the user’s program?',
      a: 'Python raises `IndexError` if the stack is empty and `KeyError` for a bad label, which is clear enough for now.',
      b: 'One `VMError` type carrying the source line: `line 7: SUB needs 2 values, stack has 1`. Unknown ops, arg counts and labels are checked before the program runs.',
      better: 'b',
      explanation: 'B tells the user where and why, and splits load-time from run-time checks. A leaks interpreter internals to the user.',
    },
    {
      id: 'build-interpreter.call-ret',
      skill: 'build.interpreter',
      kind: 'flash',
      front: 'Why give `CALL`/`RET` their own call stack instead of pushing return addresses onto the data stack?',
      back: 'On a shared stack, a subroutine that leaves one extra value makes `RET` jump to data. Separate stacks keep a data bug from becoming a control-flow bug, and `RET` with no caller becomes a clean error.',
    },
    {
      id: 'build-interpreter.revisit',
      skill: 'build.interpreter',
      kind: 'mcq',
      prompt:
        'An instruction set has only `plus x` (add x to an accumulator), `next x` (do nothing), and `jump x` (move `pc` by x). There are no conditional jumps. Why does reaching an already-executed instruction prove the program loops forever?',
      choices: [
        {
          text: 'The next `pc` depends only on the current `pc`, so the path repeats',
          correct: true,
          feedback: 'Yes. Control flow never reads the accumulator, so the same instruction always leads to the same successor.',
        },
        {
          text: 'The accumulator must hold the same value as last time',
          feedback: 'It usually holds a different value. The loop is proven by control flow, not by data.',
        },
        {
          text: 'Every `jump` in such programs points backward',
          feedback: 'Forward jumps are allowed. A cycle can include any mix of directions.',
        },
        {
          text: 'The step limit has been exceeded by then',
          feedback: 'No step limit is needed here; one revisit is already proof.',
        },
      ],
      explanation:
        'Track a set of visited indices and stop on the first repeat. A rarely reported problem ("repair the bootloader", a few 2026 reports) builds on this: find the one swapped `next`/`jump` that makes the program terminate.',
    },
  ],
}

export default lesson
