import type { Lesson } from '../../core/types'

const lesson: Lesson = {
  id: 'conc-executors',
  title: 'Executors and futures',
  summary: 'Fan work out with concurrent.futures, then get every result and every exception back.',
  minutes: 8,
  skills: ['conc.executors'],
  steps: [
    {
      kind: 'concept',
      id: 'hook',
      title: 'The job that failed politely',
      body:
        'Your resize job pushes 10,000 images through a thread pool. It logs `resized 10000 images` and exits 0. Three thumbnails are missing, and there is no traceback anywhere.\n\n' +
        'Nothing crashed. The pool caught each exception and filed it away in a `Future`, and nobody went back to ask. This lesson is about asking.',
      callout: {
        tone: 'insight',
        text: 'Candidates report "now make it concurrent" as a follow-up in nearly every practical coding round: the crawler, the image pipeline, file dedup. `concurrent.futures` is usually the shortest correct route, once you know where it hides things.',
      },
    },
    {
      kind: 'concept',
      id: 'submit',
      title: 'submit hands you a Future',
      body:
        '`pool.submit(fn, *args)` queues one call and returns at once with a `Future`: a handle to a result that does not exist yet.\n\n' +
        '`fut.result()` blocks until the call finishes, then returns its value or ==re-raises its exception in your thread==. Leaving the `with` block calls `shutdown(wait=True)`, so every call has finished by the next line.',
      code: {
        code: `from concurrent.futures import ThreadPoolExecutor

with ThreadPoolExecutor(max_workers=8) as pool:
    fut = pool.submit(fetch, "https://example.com/a")
    other_work()            # main thread is free meanwhile
    body = fut.result()     # blocks; the value, or a re-raise`,
        highlight: [6],
      },
    },
    {
      kind: 'mcq',
      id: 'where-exception',
      prompt: '`fetch` raises `ConnectionError` inside a pool worker. Where does that exception first show up in your program?',
      choices: [
        {
          text: 'At `fut.result()`, re-raised as the same `ConnectionError`',
          correct: true,
          feedback: 'Right. The executor stored it on the future, and `result()` raises it in whichever thread asks.',
        },
        {
          text: 'Right away, as a traceback the worker prints to stderr',
          feedback: 'That is what a bare `threading.Thread` does. An executor catches the exception and keeps it on the future, so nothing prints at all.',
        },
        {
          text: '`fut.result()` returns `None`, since the call produced no value',
          feedback: 'Tempting, because the function never returned. But `result()` re-raises; returning `None` would hide every failure.',
        },
        {
          text: 'At the `pool.submit(...)` call that scheduled it',
          feedback: '`submit` returns before the call even starts, so it cannot know the call will fail.',
        },
      ],
      explanation:
        'The worker wraps your call in a try/except and stores the outcome on the future. `result()` re-raises the original exception, type and traceback intact. If nobody calls `result()` or `exception()`, the error is never seen.',
      hint: 'The worker thread has nobody to hand the exception to. Where could it wait?',
    },
    {
      kind: 'concept',
      id: 'map-vs-completed',
      title: 'map keeps order; as_completed keeps pace',
      body:
        '`pool.map(fn, items)` yields results ==in input order==, however they finish. It blocks on each result in turn, and a failed item raises at the moment you iterate to it, which ends that loop.\n\n' +
        '`as_completed(futures)` yields each future as it finishes. Use it for progress bars, first-good-answer races, and handling errors one item at a time.',
    },
    {
      kind: 'predict',
      id: 'map-order',
      eyebrow: 'Predict',
      prompt: 'Item 2 finishes first, item 0 finishes last, and item 1 raises. What does this print?',
      code: `import time
from concurrent.futures import ThreadPoolExecutor

def work(n):
    time.sleep(0.3 - 0.1 * n)   # higher n finishes sooner
    if n == 1:
        raise ValueError(f"bad {n}")
    return n * 10

with ThreadPoolExecutor(max_workers=3) as pool:
    try:
        for r in pool.map(work, [0, 1, 2]):
            print(r)
    except ValueError as e:
        print("caught", e)`,
      answers: ['0\ncaught bad 1'],
      explanation:
        '`map` hands results back in input order, so it waits the full 0.3 s for item 0 even though the others are done. Next it reaches item 1, and the stored `ValueError` is raised from the `for` loop. Item 2 finished first, yet its `20` is never seen. When you need every result despite failures, use `submit` and catch per future.',
      hint: 'Finishing order does not matter to `map`. What does the loop reach second?',
    },
    {
      kind: 'cloze',
      id: 'as-completed',
      prompt: 'Fetch every URL concurrently. Record each page or failure as it lands, and never let one bad URL end the loop.',
      code: `with ThreadPoolExecutor(max_workers=8) as pool:
    futures = {pool.{{0}}(fetch, url): url for url in urls}
    for fut in {{1}}(futures, timeout=60):
        url = futures[fut]
        try:
            page = fut.{{2}}()
        except Exception as exc:
            failed[url] = exc
        else:
            pages[url] = page`,
      blanks: [
        { options: ['map', 'submit', 'apply'], answer: 1 },
        { options: ['as_completed', 'wait', 'iter'], answer: 0 },
        { options: ['exception', 'done', 'result'], answer: 2 },
      ],
      explanation:
        '`submit` gives one future per URL, and the dict maps each future back to its URL, because `as_completed` yields futures, not inputs. `wait` returns a `(done, not_done)` pair of sets, not a stream. `result()` is the call that re-raises, so it belongs inside the `try`; `exception()` returns the error instead, and the `except` branch would never run.',
      hint: 'You need one future per URL, a stream of futures in finishing order, and the method that raises.',
    },
    {
      kind: 'spotbug',
      id: 'lost-errors',
      eyebrow: 'Find the bug',
      prompt: 'Corrupt files are in the batch. The job logs success, exits 0, and some thumbnails are missing with no traceback. Tap the line that throws the errors away.',
      code: `from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

def resize_one(src: Path, out_dir: Path) -> Path:
    img = load_image(src)           # raises on a corrupt file
    dst = out_dir / src.name
    save_image(resize(img, 256), dst)
    return dst

def resize_all(paths: list[Path], out_dir: Path) -> None:
    with ThreadPoolExecutor(max_workers=8) as pool:
        for p in paths:
            pool.submit(resize_one, p, out_dir)
    log.info("resized %d images", len(paths))`,
      bugLines: [13],
      explanation:
        'Each `submit` returns a future holding the outcome, and this line drops it on the floor. A corrupt file\'s exception is stored on a future nobody keeps, so it is never raised or logged. Keep the futures and call `result()` on every one; that is also where you count real successes.',
      fix: {
        code: `def resize_all(paths, out_dir) -> list[tuple[Path, Exception]]:
    failures = []
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {pool.submit(resize_one, p, out_dir): p for p in paths}
        for fut in as_completed(futures):
            try:
                fut.result()
            except Exception as exc:
                failures.append((futures[fut], exc))
    log.info("resized %d, failed %d", len(paths) - len(failures), len(failures))
    return failures`,
        caption: 'One bad file is recorded, not fatal, and the caller gets the list.',
      },
      hint: 'What does `submit` return, and where does it go?',
    },
    {
      kind: 'concept',
      id: 'timeouts',
      title: 'Timeouts stop waiting, not working',
      body:
        '`fut.result(timeout=5)` raises `TimeoutError` after 5 seconds, but the call keeps running in its worker: Python cannot kill a thread. `fut.cancel()` only succeeds on a call that has not started, and leaving the `with` block still waits for anything running.\n\n' +
        'To bound the work itself, put the deadline inside it, such as a socket or HTTP timeout. `shutdown(cancel_futures=True)` (3.9+) drops calls still queued.',
    },
    {
      kind: 'mcq',
      id: 'hung-server',
      prompt: '`fetch` has no socket timeout, and this server never answers. Which statements are true? Select all that apply.',
      code: {
        code: `with ThreadPoolExecutor(max_workers=4) as pool:
    fut = pool.submit(fetch, url)
    try:
        page = fut.result(timeout=2)
    except TimeoutError:
        page = None
print("finished")`,
      },
      multi: true,
      choices: [
        {
          text: '`fut.result` raises `TimeoutError` after about 2 seconds',
          correct: true,
          feedback: 'Yes. The timeout bounds how long *you* wait. Since 3.11 the executor\'s `TimeoutError` is the built-in one.',
        },
        {
          text: '`"finished"` does not print until `fetch` itself returns',
          correct: true,
          feedback: 'Yes. The `with` block exits through `shutdown(wait=True)`, which waits for the running fetch. Against a hung server, that can be forever.',
        },
        {
          text: 'Calling `fut.cancel()` in the `except` block would stop the fetch',
          feedback: 'The fetch is already running, so `cancel()` returns `False` and changes nothing. It only removes calls still waiting in the queue.',
        },
        {
          text: 'The executor kills the worker thread when the timeout fires',
          feedback: 'Python has no safe way to kill a thread. The worker stays blocked inside `fetch`.',
        },
        {
          text: 'The timeout raises `TimeoutError` inside `fetch`, so it unwinds',
          feedback: 'The exception is raised in the waiting thread, not the worker. `fetch` never hears about it.',
        },
      ],
      explanation:
        'A future\'s timeout is a limit on waiting, not on work. The pool still holds a stuck thread, and the `with` block will not exit until it frees up. A real deadline goes inside the call: a socket timeout or an HTTP client timeout.',
    },
    {
      kind: 'concept',
      id: 'processes',
      title: 'Processes: everything crosses a pickle',
      body:
        'CPU-bound pure Python needs `ProcessPoolExecutor`: separate interpreters, each with its own GIL. The price is that the function, its arguments and its result are ==pickled== across a process boundary.\n\n' +
        'Top-level functions pickle by name. Lambdas and functions defined inside other functions do not. Create the pool under `if __name__ == "__main__":`, because spawned workers re-import your module.',
      callout: {
        tone: 'tip',
        text: 'Thousands of tiny tasks? `pool.map(fn, items, chunksize=100)` ships them in batches instead of one round trip each. Thread pools ignore `chunksize`.',
      },
    },
    {
      kind: 'sort',
      id: 'pickles',
      prompt: 'You hand these to a `ProcessPoolExecutor`. Which reach the worker, and which fail to pickle?',
      buckets: [
        { id: 'ok', label: 'Pickles fine' },
        { id: 'fail', label: 'Fails to pickle' },
      ],
      items: [
        { text: '`thumbnail`, defined at module top level', bucket: 'ok', why: 'Pickled as a module and a name, then looked up again in the worker.' },
        { text: '`functools.partial(thumbnail, size=256)`', bucket: 'ok', why: 'A partial pickles if the function and arguments it wraps do.' },
        { text: '`Resizer(256).run`, a method of a plain instance', bucket: 'ok', why: 'A bound method pickles as its instance plus the method name.' },
        { text: '`lambda p: thumbnail(p, 256)`', bucket: 'fail', why: 'A lambda has no importable name for the worker to look up.' },
        { text: 'A helper `def` written inside `main()`', bucket: 'fail', why: 'A local function cannot be found by name from outside `main`.' },
        { text: 'An open file object passed as an argument', bucket: 'fail', why: 'OS resources like files, locks and sockets do not pickle. Pass the path and open it in the worker.' },
      ],
      explanation:
        'Pickle stores a function as *module + name* and imports it again on the other side. Anything without a findable name fails, and so does any live OS resource. `partial` is the standard fix for "I need to bind an argument".',
    },
    {
      kind: 'numeric',
      id: 'size-pool',
      prompt: 'A `ThreadPoolExecutor(max_workers=16)` fetches 1,000 URLs. Each fetch spends about 200 ms waiting on the network and almost nothing on CPU. Roughly how long does the batch take?',
      answer: 12.5,
      tolerance: 0.1,
      unit: 's',
      explanation:
        'Threads waiting on sockets release the GIL, so 16 waits overlap: 1,000 ÷ 16 ≈ 63 rounds of 0.2 s, about 12.6 s, against 200 s with one worker. That is why I/O pools are sized by how much concurrency the far end tolerates, while CPU pools stop helping past the core count.',
      hint: 'How many fetches are in flight at once, and how long does each round of them take?',
    },
    {
      kind: 'interview',
      id: 'sim',
      eyebrow: 'Interview sim',
      setup: 'Your single-threaded thumbnailer works: a pure-Python transform over 10,000 images. The interviewer asks you to use all 8 cores.',
      turns: [
        {
          interviewer: 'How would you parallelize it?',
          options: [
            {
              text: 'The transform is CPU-bound Python, so threads would take turns on the GIL. `ProcessPoolExecutor` with 8 workers, mapping over *paths* so little data gets pickled, with a `chunksize` so 10,000 small tasks do not each pay a round trip.',
              quality: 'strong',
              feedback: 'Picks the executor from the workload, keeps the pickled payload small, and knows the per-task overhead.',
            },
            {
              text: '`ThreadPoolExecutor` with 64 threads. More workers, more throughput.',
              quality: 'weak',
              feedback: 'Pure-Python CPU work serializes on the GIL in standard CPython. 64 threads add switching overhead and little else.',
            },
            {
              text: '`ProcessPoolExecutor`, one task per image.',
              quality: 'okay',
              feedback: 'The right executor, but no reason given, and no thought about what gets pickled or the cost of 10,000 tiny round trips.',
            },
          ],
        },
        {
          interviewer: 'Three files in the batch are corrupt. What does your code do?',
          options: [
            {
              text: 'Catch the exception inside the worker and return `None` for bad files.',
              quality: 'okay',
              feedback: 'The batch survives, but `None` hides which file failed and why, and callers must remember to filter it.',
            },
            {
              text: 'With `map`, the first bad file raises when I iterate to it and the results after it are lost. I would `submit` each path, loop over `as_completed`, catch per future, and return the successes plus a list of `(path, error)` failures.',
              quality: 'strong',
              feedback: 'Knows exactly how `map` fails, isolates errors per item, and keeps them visible.',
            },
            {
              text: 'Wrap the whole `map` loop in one try/except and log that the batch failed.',
              quality: 'weak',
              feedback: 'One corrupt file then sinks 9,997 good ones, and the log does not say which file.',
            },
          ],
        },
        {
          interviewer: 'How would you test it?',
          options: [
            {
              text: 'Concurrency is hard to test, so I would rely on careful review.',
              quality: 'weak',
              feedback: 'Testing your own implementation is part of what this round looks for. Most of this is easy to test.',
            },
            {
              text: 'Run it on the real folder and check the output count.',
              quality: 'okay',
              feedback: 'Catches gross failures, but slowly, and a missing thumbnail tells you nothing about why.',
            },
            {
              text: 'Unit-test the transform as a pure function. Then run the batch on a tiny folder with one corrupt file and assert the success count and the failure list, with `max_workers=1` and with 4, expecting identical output.',
              quality: 'strong',
              feedback: 'A planted failure, an oracle (the single-worker run), and assertions on exactly what you claimed.',
            },
          ],
        },
      ],
      wrapUp:
        'Choose the executor from the workload, collect every future so failures surface per item, and prove it with a test that plants a failure.',
    },
    {
      kind: 'concept',
      id: 'recap',
      eyebrow: 'Recap',
      title: 'Three things to carry in',
      body:
        '1. **A Future holds the exception until you call `result()`.** Keep every future and check it.\n' +
        '2. **`map` for input order, `as_completed` for pace** and per-item error handling.\n' +
        '3. **Timeouts stop waiting, not working.** Put real deadlines inside the call, and use processes for CPU-bound Python, with picklable top-level functions.',
    },
  ],
  cards: [
    {
      id: 'conc-executors.silent',
      skill: 'conc.executors',
      kind: 'flash',
      front: 'You `submit` 500 jobs to a pool, never keep the futures, and 12 of them raise. What do you see?',
      back: 'Nothing. Each exception is stored on its future and only raised by `result()` (or returned by `exception()`). Keep the futures and check every one, for example with `as_completed`.',
    },
    {
      id: 'conc-executors.cancel',
      skill: 'conc.executors',
      kind: 'predict',
      prompt: 'One worker, two jobs. What does this print?',
      code: `import threading, time
from concurrent.futures import ThreadPoolExecutor

started = threading.Event()

def job():
    started.set()
    time.sleep(0.2)

with ThreadPoolExecutor(max_workers=1) as pool:
    a = pool.submit(job)
    b = pool.submit(job)
    started.wait()
    print(a.cancel(), b.cancel())`,
      answers: ['False True'],
      explanation: '`a` is already running when `cancel()` is called, so it cannot be cancelled. `b` is still queued behind it in the single-worker pool, so it is cancelled and will never run.',
    },
    {
      id: 'conc-executors.apis',
      skill: 'conc.executors',
      kind: 'match',
      prompt: 'Match each call to its behavior.',
      pairs: [
        { left: '`pool.map(fn, items)`', right: 'Results in input order; raises when you reach a failed item' },
        { left: '`as_completed(futures)`', right: 'Yields each future as soon as it finishes' },
        { left: '`fut.result(timeout=5)`', right: 'Stops waiting after 5 s; the call keeps running' },
        { left: '`fut.cancel()`', right: 'Succeeds only if the call has not started' },
        { left: '`pool.shutdown(cancel_futures=True)`', right: 'Drops queued calls that have not started' },
      ],
      explanation: 'Ordered results, finishing-order results, and three different ways of *not* waiting, none of which can stop a call that is already running.',
    },
    {
      id: 'conc-executors.with-timeout',
      skill: 'conc.executors',
      kind: 'spotbug',
      prompt: 'This should give up and return `None` after 2 s. Against a hung server it blocks until `fetch` gives up on its own. Which line causes the wait?',
      code: `from concurrent.futures import ThreadPoolExecutor

def fetch_or_none(url: str, timeout: float = 2.0):
    with ThreadPoolExecutor(max_workers=1) as pool:
        fut = pool.submit(fetch, url)
        try:
            return fut.result(timeout=timeout)
        except TimeoutError:
            return None`,
      bugLines: [4],
      explanation: 'Returning from inside the `with` block runs `shutdown(wait=True)`, which waits for the still-running fetch. The timeout fires on time, and then the function waits anyway. Use a long-lived pool, or better, a timeout on the request itself.',
      fix: {
        code: `def fetch_or_none(url: str, timeout: float = 2.0):
    try:
        return fetch(url, timeout=timeout)   # the socket enforces it
    except TimeoutError:
        return None`,
      },
    },
    {
      id: 'conc-executors.size',
      skill: 'conc.executors',
      kind: 'numeric',
      prompt: 'You must fetch 6,000 pages in about a minute. Each fetch is about 0.5 s of network wait. Roughly how many threads do you need?',
      answer: 50,
      tolerance: 0.15,
      unit: 'threads',
      explanation: 'Total waiting is 6,000 × 0.5 s = 3,000 s. Spread over 60 s that needs about 50 waits in flight at once. Then check the server tolerates 50 concurrent requests from you.',
    },
    {
      id: 'conc-executors.partial',
      skill: 'conc.executors',
      kind: 'cloze',
      prompt: '`thumbnail(path, size)` is a CPU-heavy, pure-Python, top-level function. Complete the parallel call.',
      code: `if __name__ == "__main__":
    with {{0}}() as pool:
        thumbs = list(pool.map({{1}}, paths, chunksize=64))`,
      blanks: [
        { options: ['ThreadPoolExecutor', 'ProcessPoolExecutor'], answer: 1 },
        { options: ['lambda p: thumbnail(p, 256)', 'thumbnail(paths, 256)', 'functools.partial(thumbnail, size=256)'], answer: 2 },
      ],
      explanation: 'CPU-bound Python needs processes to escape the GIL. Processes pickle the callable: a lambda cannot be pickled, while `functools.partial` over a top-level function can. `thumbnail(paths, 256)` calls the function once, right here, instead of passing it.',
    },
    {
      id: 'conc-executors.why-completed',
      skill: 'conc.executors',
      kind: 'compare',
      question: 'Interviewer: *Why did you use `as_completed` here instead of `map`?*',
      a: 'It is faster. `map` waits for every result to finish before it gives you anything back.',
      b: 'Same total work. I wanted each result as soon as it lands, so the progress count is live and a failed URL is caught and recorded on its own instead of ending my loop. If I needed input order, I would use `map`.',
      better: 'b',
      explanation: '**A** is wrong twice: `map` is lazy and yields each result as soon as it and everything before it are done, and neither makes the work faster. **B** names the real differences, finishing order and per-item failure handling, and when the other tool is right.',
    },
  ],
}

export default lesson
