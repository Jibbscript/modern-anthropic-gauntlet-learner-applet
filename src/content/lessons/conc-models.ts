import type { Lesson } from '../../core/types'

const lesson: Lesson = {
  id: 'conc-models',
  title: 'Threads, processes, asyncio',
  summary: 'Ask where the time goes, then pick the model that overlaps the waiting or parallelizes the computing, and know what each one costs.',
  minutes: 8,
  skills: ['conc.models', 'conc.executors'],
  steps: [
    {
      kind: 'concept',
      id: 'hook',
      eyebrow: 'Same pool, opposite result',
      title: 'Eight threads, no speedup',
      body:
        'You speed up a pure-Python log parser with `ThreadPoolExecutor(8)` on an 8-core laptop. Wall time: unchanged. That afternoon the same pool fetches 8 pages from a slow API, and the batch finishes nearly 8x faster.\n\n' +
        'Same code, opposite results. The difference is ==where the time goes==: computing in Python, or waiting on something outside it. That one question picks your concurrency model.',
      callout: {
        tone: 'insight',
        text: 'Candidates report a concurrency follow-up on nearly every practical coding question: make the crawler concurrent, parallelize the image pipeline, say which parts of file dedup are I/O-bound. The diagnosis comes before the code.',
      },
    },
    {
      kind: 'mcq',
      id: 'which-io',
      eyebrow: 'Warm-up',
      prompt: 'A job is **I/O-bound** when most of its wall time goes to waiting on something outside the CPU: network, disk, another service. Select every I/O-bound job.',
      multi: true,
      choices: [
        { text: 'Fetching 300 pages through a rate-limited API', correct: true, feedback: 'Your CPU idles between responses. The network sets the pace.' },
        { text: 'Copying 2 GB of logs off a network drive', correct: true, feedback: 'The drive and the link set the pace, not your code.' },
        { text: 'Running 40 slow SQL queries on a remote database', correct: true, feedback: 'The database does the work; your process waits for rows.' },
        {
          text: 'Scoring 1M log lines with regexes, all in memory',
          feedback: 'Tempting because it sounds like log *processing* near files. But the data is already in RAM, so every second goes to the regex engine. CPU-bound.',
        },
        {
          text: 'A pure-Python checksum over bytes already in RAM',
          feedback: 'Nothing to wait for. The interpreter is busy the whole time, so this is CPU-bound.',
        },
      ],
      explanation:
        'Quick test: would a faster CPU make it much faster? Then it is CPU-bound. Would a faster network or disk? I/O-bound. Real jobs mix both, which is why you time the stages before choosing.',
      hint: 'For each job, ask what the CPU is doing most of the time.',
    },
    {
      kind: 'concept',
      id: 'gil',
      title: 'The GIL: one thread runs Python at a time',
      body:
        'In standard CPython, a thread must hold the **Global Interpreter Lock** to execute Python bytecode. One holder at a time, so two threads crunching Python take turns instead of using two cores. The holder is asked to hand off every 5 ms by default (`sys.getswitchinterval()`).\n\n' +
        'Threads still pay off where the GIL is released: during blocking I/O, and inside many C extensions while they crunch (`hashlib` on large buffers, `zlib`, much of NumPy).',
      callout: {
        tone: 'warn',
        text: '"Python threads can\'t run in parallel" overstates it. Only *Python bytecode* is serialized. C code that has released the GIL runs on other cores at the same time.',
      },
    },
    {
      kind: 'widget',
      id: 'pool-cpu',
      eyebrow: 'Your turn',
      prompt: 'Eight tasks, each 1 s of pure-Python CPU work, on a 4-core machine. Try threads, processes and async with different worker counts. Find the fastest setup.',
      goal: 'Within 10% of the fastest for CPU-bound tasks',
      widget: { id: 'pool', config: { kind: 'cpu', tasks: 8, cores: 4, lockControls: ['kind'], goal: 'fastest' } },
      explanation:
        'Threads take 8 s at any count: the GIL lane passes one token around. Async also takes 8 s, because a coroutine that never awaits never yields. Processes with 4 or more workers land near 3.3 s, not the ideal 2 s: each worker takes 0.3 s to spawn and every task pays to pickle its arguments. That gap is the price of parallelism.',
    },
    {
      kind: 'mcq',
      id: 'hashlib',
      prompt: 'A teammate hashes 64 MB chunks with `hashlib.sha256` on 4 threads and gets a real speedup. Another says that is impossible because of the GIL. Who is right?',
      choices: [
        {
          text: 'The first: `hashlib` releases the GIL while it hashes a large buffer, so the C code runs on several cores at once.',
          correct: true,
          feedback: 'Right. The docs say the GIL is released while hashing more than 2047 bytes passed at once. Only bytecode is serialized.',
        },
        {
          text: 'The second: with a GIL only one thread runs at a time, so the speedup must be measurement noise.',
          feedback: 'That is the usual one-line summary of the GIL, and it is too strong. The lock serializes Python bytecode, not C code that has let go of it.',
        },
        {
          text: 'The first, because hashing is I/O-bound and threads overlap I/O waits.',
          feedback: 'The bytes are already in memory, so there is nothing to wait on. Hashing is CPU work; the speedup comes from the GIL being released.',
        },
        {
          text: 'The first, because CPython switches threads every 5 ms and spreads them across cores.',
          feedback: 'Switching interleaves threads on one GIL; it does not run them in parallel. Taking turns faster is still taking turns.',
        },
      ],
      explanation:
        'Check the library before ruling threads out. `hashlib`, `zlib`, much of NumPy and blocking I/O calls drop the GIL during long C operations. A pure-Python loop never does.',
      hint: 'Where does the hashing actually run: in bytecode, or in C?',
    },
    {
      kind: 'concept',
      id: 'processes',
      title: 'Processes: real parallelism, with a bill',
      body:
        'Each process has its own interpreter and its own GIL, so CPU-bound Python runs on every core. The bill has two parts. Starting a worker costs a fresh interpreter and its imports. And everything crossing the boundary is pickled: each argument in, each result out.\n\n' +
        'So send small things (a file path), not big ones (decoded pixels), and make each task chunky enough to pay for its trip.',
      code: {
        code: `import glob
from concurrent.futures import ProcessPoolExecutor

def score(path: str) -> int:
    ...  # pure-Python, CPU-bound work on one file

if __name__ == "__main__":   # workers may re-import this module
    paths = sorted(glob.glob("logs/*.log"))
    with ProcessPoolExecutor() as pool:
        totals = list(pool.map(score, paths, chunksize=16))`,
        caption: '`chunksize` ships tasks in batches, which cuts per-task overhead when there are many small ones.',
      },
      callout: {
        tone: 'tip',
        text: 'Lambdas and nested functions are pickled by reference and cannot be found by name, so a process pool fails with `PicklingError`. Define workers at module top level.',
      },
    },
    {
      kind: 'numeric',
      id: 'cpu-math',
      eyebrow: 'Back of the envelope',
      prompt: 'You have 4 cores and 40 tasks, each 0.5 s of pure-Python CPU work, on `ProcessPoolExecutor(max_workers=4)`. Ignoring startup and pickling, about how long does the batch take?',
      answer: 5,
      tolerance: 0.2,
      unit: 's',
      explanation:
        '40 x 0.5 s = 20 s of CPU work, split across 4 cores: 5 s. The same batch on `ThreadPoolExecutor(8)` takes about 20 s on standard CPython: eight threads, one GIL. Real runs land a bit above 5 s once spawning and pickling are counted.',
      hint: 'Total CPU seconds, divided by how many tasks can truly run at once.',
    },
    {
      kind: 'concept',
      id: 'asyncio',
      title: 'asyncio: one thread, many waits',
      body:
        '`asyncio` runs many tasks on one thread. Each `await` is a coroutine saying *I am waiting, run someone else*, and the event loop switches to a task that is ready. Overlapping 10,000 network waits is cheap; 10,000 threads would cost memory and scheduling.\n\n' +
        'The catch is the word ==cooperative==. Code between two `await`s runs uninterrupted, so a blocking call or a long CPU loop stalls every task on the loop.',
      code: {
        code: `import asyncio

async def fetch_all(client, urls, limit=50):
    sem = asyncio.Semaphore(limit)        # cap requests in flight

    async def one(url):
        async with sem:
            return await client.get(url)  # yields while waiting

    return await asyncio.gather(*(one(u) for u in urls))`,
        caption: '`client` is any async HTTP client, such as `httpx.AsyncClient`.',
      },
      callout: {
        tone: 'tip',
        text: 'Stuck with a blocking library? `await asyncio.to_thread(fn, *args)` runs it on a worker thread so the loop keeps moving.',
      },
    },
    {
      kind: 'predict',
      id: 'blocking-loop',
      prompt: '`time.sleep` blocks the thread; `asyncio.sleep` would yield to the loop. What does this print?',
      code: `import asyncio, time

async def job(name):
    print(name, "start")
    time.sleep(0.1)          # blocking call
    print(name, "end")

async def main():
    await asyncio.gather(job("a"), job("b"))

asyncio.run(main())`,
      answers: ['a start\na end\nb start\nb end', 'a start a end b start b end'],
      explanation:
        '`gather` schedules both coroutines, but `a` never awaits, so it holds the loop until it returns. `b` cannot even start. Swap in `await asyncio.sleep(0.1)` and both start before either ends. One stray blocking call inside a coroutine quietly turns async code back into sequential code.',
      hint: 'Between the two `print` calls in `job`, is there any `await`?',
    },
    {
      kind: 'widget',
      id: 'pool-io',
      eyebrow: 'Flip the workload',
      prompt: 'Now each task is a network call: a little CPU around a 1 s wait. Same machine. Find the fastest setup.',
      goal: 'Within 10% of the fastest for I/O-bound tasks',
      widget: { id: 'pool', config: { kind: 'io', tasks: 8, cores: 4, lockControls: ['kind'], goal: 'fastest' } },
      explanation:
        'Async finishes in about 1.9 s on one thread: every wait overlaps. Eight threads tie it, because a thread blocked on I/O releases the GIL. Processes overlap the waits too, but their best is about 3.1 s: you paid spawn and pickling for CPU parallelism these tasks never needed.',
    },
    {
      kind: 'sort',
      id: 'pick-model',
      eyebrow: 'Combine',
      prompt: 'Which model would you reach for first, on standard CPython?',
      buckets: [
        { id: 'thread', label: 'Threads' },
        { id: 'process', label: 'Processes' },
        { id: 'async', label: 'asyncio' },
      ],
      items: [
        {
          text: '500 calls to a slow API with the blocking `requests` library',
          bucket: 'thread',
          why: 'I/O-bound, and the library blocks. A thread pool overlaps the waits without rewriting the client.',
        },
        {
          text: 'Reading thousands of files from a network drive',
          bucket: 'thread',
          why: 'Blocking reads release the GIL, so a bounded pool keeps many in flight. asyncio has no native async file I/O.',
        },
        {
          text: 'Per-pixel filters written in pure Python over 10,000 images',
          bucket: 'process',
          why: 'CPU-bound bytecode. Only separate interpreters run it on several cores. Send paths, not pixels.',
        },
        {
          text: 'Brute-force search over 100 million candidates in pure Python',
          bucket: 'process',
          why: 'All computing, no waiting. Split the range into chunks, one per core.',
        },
        {
          text: 'Holding 10,000 mostly idle websocket connections',
          bucket: 'async',
          why: 'Huge numbers of concurrent waits are where one event loop beats thousands of threads.',
        },
        {
          text: 'A request handler that fans out to three backends with an async HTTP client',
          bucket: 'async',
          why: 'Already async end to end: `gather` the three calls.',
        },
      ],
      explanation:
        'First question: waiting or computing? For waiting, ask how many waits and whether your libraries are async. Hundreds with blocking libraries: threads. Thousands, or an async stack: asyncio. Computing in Python: processes.',
    },
    {
      kind: 'concept',
      id: 'free-threaded',
      title: 'The GIL is becoming optional',
      body:
        'PEP 703 added a CPython build without the GIL. It was experimental in 3.13 and is officially supported but still optional in 3.14; it is not the default build. You opt in by installing the separate build, often named `python3.14t`.\n\n' +
        'The trade: real thread parallelism for Python code, some single-threaded overhead, and extensions that have not declared support switch the GIL back on. Races the GIL used to hide show up fast.',
      callout: {
        tone: 'source',
        text: '[PEP 779](https://peps.python.org/pep-0779/) defines the phases and says making it the default needs a future PEP. The [free-threading HOWTO](https://docs.python.org/3/howto/free-threading-python.html) covers extension support and `sys._is_gil_enabled()`. Checked October 2026.',
      },
    },
    {
      kind: 'interview',
      id: 'dedup-sim',
      eyebrow: 'Interview sim',
      setup:
        'Candidates report a file-dedup coding question whose follow-ups ask which parts are I/O-bound vs CPU-bound and which concurrency fits. Your single-threaded version works: group by size, hash the first 4 KB, then hash full files.',
      turns: [
        {
          interviewer: 'On a big directory this takes 40 minutes. How would you make it faster?',
          options: [
            {
              text: 'Hashing is CPU work, so I would move it into a `ProcessPoolExecutor`.',
              quality: 'okay',
              feedback: 'Plausible, but a guess. In many dedup runs reading dominates, and `hashlib` already releases the GIL on large buffers.',
            },
            {
              text: 'First I would time the stages on a sample. Walking and reading are I/O; hashing is CPU, though `hashlib` releases the GIL on big buffers. The fix depends on which dominates.',
              quality: 'strong',
              feedback: 'Measure, then name the bottleneck. You also showed you know the GIL detail that changes the answer.',
            },
            {
              text: 'Rewrite it with asyncio. Async is faster than threads.',
              quality: 'weak',
              feedback: 'asyncio does not speed up CPU work, and it has no native async file I/O. "Faster" without a bottleneck is a slogan.',
            },
          ],
        },
        {
          interviewer: 'Timing says 85% of the run is reading files off a network drive. What now?',
          options: [
            {
              text: 'One process per file, so each read gets its own GIL.',
              quality: 'weak',
              feedback: 'Thousands of spawns, and the GIL was never the bottleneck: blocked reads already release it.',
            },
            {
              text: 'asyncio with an async file library.',
              quality: 'okay',
              feedback: 'It can work, but async file libraries generally hand reads to a thread pool anyway. More machinery than a thread pool, same mechanism.',
            },
            {
              text: 'A `ThreadPoolExecutor`: blocked reads release the GIL, so 16-32 threads keep many reads in flight. I would make the count a parameter and measure, because past some point the drive is the limit.',
              quality: 'strong',
              feedback: 'Right model, a bounded pool, and an honest limit. Saying you would tune it by measurement is the senior move.',
            },
          ],
        },
        {
          interviewer: "Didn't Python get rid of the GIL recently? Doesn't that make all this moot?",
          options: [
            {
              text: 'Only in the optional free-threaded build; the default still has a GIL. Here it barely matters, since the drive is the bottleneck. If we did run free-threaded, I would audit shared state first.',
              quality: 'strong',
              feedback: 'Accurate, hedged, and tied back to this problem. The audit point shows you know what the GIL was quietly doing for you.',
            },
            {
              text: 'Yes, since 3.13 there is no GIL, so threads win for everything now.',
              quality: 'weak',
              feedback: '3.13 shipped an experimental, opt-in build; 3.14 made it supported but still optional. Overclaiming a fact the interviewer can check costs trust.',
            },
            {
              text: 'I am not sure of the current status, so I would go with what the profile shows.',
              quality: 'okay',
              feedback: 'Honest, and the instinct is right. Knowing the facts (optional build, extensions must opt in) would make it strong.',
            },
          ],
        },
      ],
      wrapUp: 'Measure, name the bottleneck, pick the model that overlaps or parallelizes that thing, and say what it costs. Facts about the GIL earn trust when they are precise.',
    },
    {
      kind: 'concept',
      id: 'recap',
      title: 'What to remember',
      body:
        '1. Ask ==where the time goes==. Waiting: threads or asyncio overlap it. Computing in Python: processes parallelize it.\n' +
        '2. The GIL serializes Python bytecode, not everything. Blocking I/O and many C extensions release it. The free-threaded build removes it, but it is optional.\n' +
        '3. Every model sends a bill: GIL turn-taking for threads, startup and pickling for processes, a stalled loop for asyncio when anything blocks.',
    },
  ],
  cards: [
    {
      id: 'conc-models.gil-parallel',
      skill: 'conc.models',
      kind: 'flash',
      front: 'On standard CPython (with a GIL), what work *can* run in parallel across threads?',
      back: 'Blocking I/O, which releases the GIL while it waits, and C code that releases it while it crunches: `hashlib` on large buffers, `zlib`, much of NumPy. Pure-Python bytecode runs one thread at a time.',
    },
    {
      id: 'conc-models.threads-cpu',
      skill: 'conc.models',
      kind: 'numeric',
      prompt: '8 tasks, each 2 s of pure-Python CPU work, on `ThreadPoolExecutor(8)` on an 8-core machine, standard CPython. Roughly how long is the wall time?',
      answer: 16,
      tolerance: 0.25,
      unit: 's',
      explanation: 'One GIL means one thread executes bytecode at a time: 8 x 2 s = 16 s, no faster than a plain loop. `ProcessPoolExecutor(8)` would take about 2 s plus startup.',
    },
    {
      id: 'conc-models.sleep0',
      skill: 'conc.models',
      kind: 'predict',
      prompt: '`await asyncio.sleep(0)` yields to the event loop without waiting. What does this print?',
      code: `import asyncio

async def worker(name):
    for i in range(2):
        print(name, i)
        await asyncio.sleep(0)

async def main():
    await asyncio.gather(worker("a"), worker("b"))

asyncio.run(main())`,
      answers: ['a 0\nb 0\na 1\nb 1', 'a 0 b 0 a 1 b 1'],
      explanation: 'Each `await` hands the loop to the next ready coroutine, so the two workers alternate. Without the `await`, `a` would print both lines before `b` started.',
    },
    {
      id: 'conc-models.pool-cloze',
      skill: 'conc.executors',
      kind: 'cloze',
      prompt: 'Parallelize a pure-Python grayscale filter over many image files.',
      code: `from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

def to_grayscale(path: Path) -> Path:
    ...  # pure-Python pixel loop: CPU-bound
    return path.with_suffix(".gray.png")

def main(paths: list[Path]) -> None:
    with {{0}}(max_workers=4) as pool:
        for out in pool.map(to_grayscale, {{1}}, chunksize=8):
            print("wrote", out)

if __name__ == {{2}}:
    main(sorted(Path("imgs").glob("*.png")))`,
      blanks: [
        { options: ['ProcessPoolExecutor', 'ThreadPoolExecutor', 'asyncio.TaskGroup'], answer: 0 },
        { options: ['paths', '[p.read_bytes() for p in paths]', '[str(p) for p in paths]'], answer: 0 },
        { options: ['"__main__"', '"main"', '__file__'], answer: 0 },
      ],
      explanation: 'CPU-bound Python needs processes. Send paths, which pickle in a few bytes, not file contents; the function also expects a `Path`, so strings would break `with_suffix`. The `__main__` guard stops workers that re-import the module from launching pools of their own.',
    },
    {
      id: 'conc-models.bills',
      skill: 'conc.models',
      kind: 'match',
      prompt: 'Match each model to the cost you pay for it.',
      pairs: [
        { left: 'Threads (standard CPython)', right: 'Python bytecode takes turns on one GIL' },
        { left: 'Processes', right: 'Worker startup, plus pickling every argument and result' },
        { left: 'asyncio', right: 'One blocking call stalls every task on the loop' },
        { left: 'Free-threaded build', right: 'Optional install, some single-thread overhead, extensions must opt in' },
      ],
      explanation: 'Name the bill when you propose a model. "Processes, and here is how I keep pickling cheap" is a much stronger answer than "processes, to avoid the GIL".',
    },
    {
      id: 'conc-models.to-thread',
      skill: 'conc.executors',
      kind: 'mcq',
      prompt: 'Your asyncio service must call a blocking SDK function 2,000 times. Least disruptive option?',
      choices: [
        { text: '`await asyncio.to_thread(sdk_call, arg)` under an `asyncio.Semaphore`', correct: true, feedback: 'The blocking call runs on a worker thread while the loop keeps serving, and the semaphore caps how many run at once.' },
        { text: 'Call `sdk_call(arg)` directly inside the coroutine', feedback: 'Every call blocks the whole loop, so all other tasks freeze while it runs.' },
        { text: 'Submit each call to a new `ProcessPoolExecutor`', feedback: 'The work is waiting, not computing. Processes add startup and pickling for nothing.' },
        { text: 'Wrap the call in `asyncio.wait_for(...)` to make it async', feedback: '`wait_for` needs an awaitable. It cannot make a blocking function yield.' },
      ],
      explanation: 'Blocking code inside an event loop goes to a thread. `asyncio.to_thread` is the standard bridge (Python 3.9+).',
    },
    {
      id: 'conc-models.free-threaded',
      skill: 'conc.models',
      kind: 'flash',
      front: 'Status of free-threaded (no-GIL) CPython, as of Python 3.14?',
      back: 'A separate build from PEP 703: experimental in 3.13, officially supported but optional in 3.14 (PEP 779). Not the default. Extensions without declared support re-enable the GIL.',
    },
  ],
}

export default lesson
