import type { Lesson } from '../../core/types'

const lesson: Lesson = {
  id: 'conc-async',
  title: 'asyncio and rate limits',
  summary: 'Run thousands of waits on one thread, keep blocking calls off the loop, and cap both concurrency and rate.',
  minutes: 9,
  skills: ['conc.async', 'conc.limits'],
  steps: [
    {
      kind: 'concept',
      id: 'hook',
      title: 'One line, 500 tasks, no concurrency',
      body:
        'You port a crawler to asyncio: 500 fetch coroutines, `asyncio.gather`, an async HTTP client. It runs slower than the threaded version.\n\n' +
        'The culprit is one line in a retry helper: `time.sleep(1)`. asyncio runs every coroutine on ==one thread==, and a blocking call holds that thread. While it sleeps, all 500 coroutines wait.',
      callout: {
        tone: 'insight',
        text: 'Prep guides built from 2026 candidate reports list asyncio among the concurrency topics to drill, and a rate limiter appears among reported system-design prompts. Treat both as likely probes, not guarantees.',
      },
    },
    {
      kind: 'concept',
      id: 'coroutines-tasks',
      title: 'Coroutines wait; tasks run',
      body:
        'Calling an `async def` function runs nothing; it returns a coroutine object. `await coro` runs it to completion before your next line, so awaiting in a loop is sequential.\n\n' +
        'To overlap, schedule coroutines as tasks: `asyncio.create_task(coro)`, or `asyncio.gather(*coros)`, which wraps each in a task and returns results ==in argument order==.',
      code: {
        code: `async def main(urls):
    async with httpx.AsyncClient() as client:
        # sequential: one request at a time
        for u in urls:
            await client.get(u)
        # concurrent: all in flight together
        return await asyncio.gather(
            *(client.get(u) for u in urls)
        )`,
        highlight: [7, 8, 9],
      },
    },
    {
      kind: 'predict',
      id: 'gather-order',
      eyebrow: 'Predict',
      prompt: 'Three jobs sleep 0.3 s, 0.1 s and 0.2 s. What does this print?',
      code: `import asyncio

order = []

async def job(name, delay):
    await asyncio.sleep(delay)
    order.append(name)
    return name

async def main():
    results = await asyncio.gather(
        job("a", 0.3),
        job("b", 0.1),
        job("c", 0.2),
    )
    print("".join(order), "".join(results))

asyncio.run(main())`,
      answers: ['bca abc'],
      explanation:
        '`gather` starts all three, so each finishes after its own delay: b, then c, then a, which is the order they append. The result list is always in argument order, whoever finished first. The whole run takes about 0.3 s, not 0.6.',
      hint: 'Two different orders are printed. Which one does `gather` control?',
    },
    {
      kind: 'concept',
      id: 'blocking',
      title: 'Never block the loop',
      body:
        'The event loop switches coroutines only at an `await`. Anything that blocks without awaiting freezes every task: `time.sleep`, `requests.get`, a long CPU loop.\n\n' +
        'Use async versions: `asyncio.sleep`, an async client such as `httpx.AsyncClient` or `aiohttp`. For a blocking library you cannot replace, `await asyncio.to_thread(fn, *args)` runs it in a worker thread while the loop keeps going.',
    },
    {
      kind: 'spotbug',
      id: 'sync-sleep',
      eyebrow: 'Find the bug',
      prompt: 'Under load the server returns some 503s, and the whole crawl stalls for seconds at a time, not just the failing URLs. Tap the bug.',
      code: `import asyncio
import time
import httpx

async def fetch(client, url, tries=3):
    for attempt in range(tries):
        try:
            resp = await client.get(url, timeout=10)
            resp.raise_for_status()
            return resp.text
        except httpx.HTTPError:
            if attempt == tries - 1:
                raise
            time.sleep(2 ** attempt)  # back off

async def crawl(urls):
    async with httpx.AsyncClient() as client:
        return await asyncio.gather(*(fetch(client, u) for u in urls))`,
      bugLines: [14],
      explanation:
        '`time.sleep` blocks the event-loop thread, so every other fetch freezes while one URL backs off, and the back-offs run one after another. With eight URLs that each fail once, that is 8 s of frozen loop; with `await asyncio.sleep` the waits overlap and the run takes about 1 s.',
      fix: { code: `            await asyncio.sleep(2 ** attempt)` },
      hint: 'Which line holds the thread without an `await`?',
    },
    {
      kind: 'sort',
      id: 'loop-safe',
      prompt: 'Inside a coroutine running on the event loop, which calls stall every other task?',
      buckets: [
        { id: 'blocks', label: 'Blocks the loop' },
        { id: 'safe', label: 'Lets the loop run' },
      ],
      items: [
        { text: '`time.sleep(2)`', bucket: 'blocks', why: 'Sleeps the thread itself. No `await`, so no switch.' },
        { text: '`requests.get(url)`', bucket: 'blocks', why: '`requests` is synchronous: the thread waits on the socket.' },
        { text: '`hashlib.sha256(two_gb).hexdigest()`', bucket: 'blocks', why: 'CPU work runs on the loop thread until it is done.' },
        { text: '`await asyncio.sleep(2)`', bucket: 'safe', why: 'Suspends this coroutine and hands the loop to the others.' },
        { text: '`await client.get(url)` on an `httpx.AsyncClient`', bucket: 'safe', why: 'Awaits non-blocking socket I/O.' },
        { text: '`await asyncio.to_thread(requests.get, url)`', bucket: 'safe', why: 'The blocking call runs in a worker thread; this coroutine just awaits it.' },
      ],
      explanation:
        'The test: does the call give control back to the loop while it waits? Only an `await` on something non-blocking does. Heavy CPU work blocks too, so move it to a thread or a process pool.',
    },
    {
      kind: 'concept',
      id: 'semaphore',
      title: 'Cap what is in flight',
      body:
        '`gather` over 10,000 URLs starts 10,000 requests at once. Depending on the client, the server answers with 429s, you run out of sockets, or requests time out waiting for a pooled connection.\n\n' +
        'An `asyncio.Semaphore(20)` holds 20 permits. Each request takes one with `async with sem:` and returns it when done, so at most 20 are ever in flight. A semaphore caps ==concurrency==, not requests per second.',
      callout: {
        tone: 'warn',
        text: '`httpx.AsyncClient` caps its pool at 100 connections by default, so a 10,000-wide `gather` does not open 10,000 sockets. The rest queue for a slot, and after the default 5 s they fail with `PoolTimeout`, which looks like a flaky server. Cap concurrency yourself.',
      },
    },
    {
      kind: 'cloze',
      id: 'semaphore-cloze',
      prompt: 'Fetch every URL with at most `limit` requests in flight.',
      code: `async def fetch_all(urls, limit=20):
    sem = asyncio.{{0}}(limit)
    async with httpx.AsyncClient() as client:
        async def one(url):
            {{1}} sem:
                resp = await client.get(url)
                return resp.status_code
        return await asyncio.{{2}}(*(one(u) for u in urls))`,
      blanks: [
        { options: ['Lock', 'Semaphore', 'Queue'], answer: 1 },
        { options: ['with', 'await', 'async with'], answer: 2 },
        { options: ['run', 'gather', 'wait'], answer: 1 },
      ],
      explanation:
        '`Semaphore(limit)` hands out `limit` permits; a `Lock` is a single permit and takes no count. An asyncio semaphore is entered with `async with`, because acquiring may have to wait, and a plain `with` raises `TypeError`. `gather` runs every wrapper and returns status codes in URL order. `wait` takes one collection of tasks and returns `(done, pending)` sets, not results, and `asyncio.run` cannot start inside a running loop.',
      hint: 'The primitive that counts permits, the context-manager form that can await, and the call that collects results in order.',
    },
    {
      kind: 'widget',
      id: 'bucket',
      eyebrow: 'Your turn',
      prompt: 'A semaphore caps how many requests are in flight. A **token bucket** caps how fast they start. This bucket holds 5 tokens and refills 1 per second; each request spends a token or is rejected with a 429. Hold the button to fire a burst.',
      goal: 'Absorb a burst, then get throttled',
      widget: { id: 'tokenbucket', config: { capacity: 5, rate: 1, compareFixedWindow: true, goal: 'burst' } },
      explanation:
        'A full bucket lets 5 requests straight through, then admits about one per second: ==bursts up to capacity, long-run rate equal to the refill==. Flip to the fixed window and burst across a reset: up to 10 can pass in a moment, which a bucket never allows.',
    },
    {
      kind: 'numeric',
      id: 'bucket-math',
      prompt: 'A bucket holds 10 tokens, refills 2 per second, and starts full. A client fires requests nonstop, far faster than 2 per second, for 5 seconds. Rejected requests are dropped. How many get through?',
      answer: 20,
      tolerance: 0.1,
      unit: 'requests',
      explanation:
        'The stored burst plus the refill: 10 + 2 × 5 = 20 (19 if the client stops just before the 20th token lands). After the first instant the client is held to exactly the refill rate. In general, the most a bucket admits in any `t` seconds is `capacity + rate × t`.',
      hint: 'What was in the bucket at the start, and how much flowed in during the 5 seconds?',
    },
    {
      kind: 'concept',
      id: 'failures-deadlines',
      title: 'Failures and deadlines',
      body:
        'If one task in `gather` raises, you get that exception, but the other tasks keep running unsupervised. Python 3.11\'s `asyncio.TaskGroup` cancels the siblings instead, waits for them, then raises an `ExceptionGroup`.\n\n' +
        'For deadlines, `async with asyncio.timeout(10):` (3.11) or `asyncio.wait_for(coro, 10)` raises `TimeoutError` and ==cancels the work==, unlike a thread future\'s timeout.',
      code: {
        code: `async def fetch(client, url):
    async with asyncio.timeout(10):
        return await client.get(url)

async def fetch_all(client, urls):
    async with asyncio.TaskGroup() as tg:
        tasks = [tg.create_task(fetch(client, u))
                 for u in urls]
    return [t.result() for t in tasks]`,
      },
    },
    {
      kind: 'mcq',
      id: 'taskgroup',
      prompt: 'Inside one `TaskGroup`: task A sleeps 0.5 s, task B raises `ValueError` after 0.1 s, task C finishes after 0.05 s. What happens?',
      choices: [
        {
          text: 'C finishes, A is cancelled, and the block raises an `ExceptionGroup` holding the `ValueError`',
          correct: true,
          feedback: 'Yes. C was done before anything failed. A was still running, so the group cancelled it, waited for it to unwind, then raised.',
        },
        {
          text: 'The `ValueError` is raised at once from the block, and A keeps running in the background',
          feedback: 'That is plain `gather`. TaskGroup exists so that no task outlives the block.',
        },
        {
          text: 'A and C both run to completion, then the bare `ValueError` is raised from the block',
          feedback: 'A TaskGroup does not wait out a failed task\'s siblings; it cancels them. And it raises an `ExceptionGroup`, which you catch with `except*`.',
        },
        {
          text: 'All three are cancelled, C included, and the group logs the error and swallows it',
          feedback: 'C had already finished, so there was nothing to cancel, and a TaskGroup never swallows a failure.',
        },
      ],
      explanation:
        'Structured concurrency: on the first failure, a TaskGroup cancels the remaining tasks, waits for them, and raises every failure together as an `ExceptionGroup`. Catch it with `except* ValueError`.',
      hint: 'C was done before B failed. What does a TaskGroup do with tasks still running?',
    },
    {
      kind: 'interview',
      id: 'sim',
      eyebrow: 'Interview sim',
      setup: 'You need to send 50,000 documents to an external summarization API. Its documented limits: 50 requests per second and at most 100 concurrent connections. Each call takes 1 to 4 seconds.',
      turns: [
        {
          interviewer: 'How do you structure the client?',
          options: [
            {
              text: '`asyncio.gather` over all 50,000 calls with an async HTTP client. asyncio can hold that many pending requests on one thread, and the client pools connections.',
              quality: 'okay',
              feedback: 'The async client is right, but nothing here enforces 50 per second, and 50,000 calls queued behind one connection pool start failing with pool timeouts.',
            },
            {
              text: 'One async client, a token bucket at 50/s, a `Semaphore(100)`. At 1 to 4 s per call, 50/s means 50 to 200 in flight, so when calls slow down the cap binds.',
              quality: 'strong',
              feedback: 'Two limits, two mechanisms, and a quick Little\'s-law check of which one binds when.',
            },
            {
              text: 'One thread per document, 50,000 threads. The work is I/O-bound, so the GIL is released while they wait, and every document is in flight from the start.',
              quality: 'weak',
              feedback: '50,000 OS threads cost a lot of memory and ignore both limits. The bottleneck is the API\'s rules, not your parallelism.',
            },
          ],
        },
        {
          interviewer: 'Some calls come back 429 anyway. Now what?',
          options: [
            {
              text: 'Honor `Retry-After` if sent, else exponential backoff with jitter and a retry cap, logging failures per document. Repeated 429s mean my bucket is too fast.',
              quality: 'strong',
              feedback: 'Listens to the server, spreads retries out, bounds them, and adapts the limiter.',
            },
            {
              text: 'Retry each failed call immediately, in a loop, until it succeeds. The batch must be complete, so no document can ever be dropped from it.',
              quality: 'weak',
              feedback: 'Immediate retries arrive while you are still over the limit and earn more 429s: a load spike you caused yourself.',
            },
            {
              text: 'Retry each failed call up to three times, waiting a fixed one second between attempts, then log the document as failed and move on.',
              quality: 'okay',
              feedback: 'Bounded, which is good. But fixed waits make failed calls retry in lockstep, and you ignore what the server told you.',
            },
          ],
        },
        {
          interviewer: 'A teammate\'s helper inside your coroutine calls `requests.post`. Problem?',
          options: [
            {
              text: 'Wrap it in `asyncio.to_thread(requests.post, ...)` so the call runs in a worker thread, then move on to the next item on the list.',
              quality: 'okay',
              feedback: 'It works: the call leaves the loop. But you did not say why it was a problem, and the real fix is an async client.',
            },
            {
              text: 'Raise the semaphore limit from 100 to 500, so more requests can run in parallel while that one call is busy and make up the lost time.',
              quality: 'weak',
              feedback: 'More permits do nothing while the loop thread is stuck inside a blocking call, and 500 would break the 100-connection limit anyway.',
            },
            {
              text: 'It blocks the loop thread, so every task stalls while it runs. Use the async client, `to_thread` as a stopgap. Tell: 1 vs 50 permits, same speed.',
              quality: 'strong',
              feedback: 'Names the mechanism, a fix, a stopgap, and a cheap way to detect it. asyncio\'s debug mode, `asyncio.run(main(), debug=True)`, also logs any step that holds the loop over 100 ms.',
            },
          ],
        },
      ],
      wrapUp:
        'Keep the two limits apart (in flight vs per second), treat 429s as feedback rather than noise, and recognize a blocking call by its symptom: concurrency that does not speed anything up.',
    },
    {
      kind: 'concept',
      id: 'recap',
      eyebrow: 'Recap',
      title: 'Three things to carry in',
      body:
        '1. **One thread, switching only at `await`.** Any blocking call freezes every task; use async libraries or `to_thread`.\n' +
        '2. **`gather` returns results in argument order.** `TaskGroup` cancels siblings on failure, and `asyncio.timeout` cancels the work.\n' +
        '3. **Two different limits.** A semaphore caps requests in flight; a token bucket caps rate and allows bursts up to its capacity.',
    },
  ],
  cards: [
    {
      id: 'conc-async.coroutine-object',
      skill: 'conc.async',
      kind: 'predict',
      prompt: 'What does this print?',
      code: `import asyncio

async def greet():
    print("hi")
    return 1

async def main():
    x = greet()
    print(type(x).__name__)
    print(await x)

asyncio.run(main())`,
      answers: ['coroutine\nhi\n1'],
      explanation: 'Calling `greet()` only creates a coroutine object; its body has not run, so nothing prints yet. `await x` runs the body, which prints `hi`, then returns `1`.',
    },
    {
      id: 'conc-async.sem-rate',
      skill: 'conc.limits',
      kind: 'numeric',
      prompt: 'An API allows 10 requests per second. You guard calls with `asyncio.Semaphore(10)`, and each call takes 50 ms. Roughly how many requests per second do you actually send?',
      answer: 200,
      tolerance: 0.15,
      unit: 'req/s',
      explanation: '10 permits ÷ 0.05 s per call = 200 per second, 20 times the limit. A semaphore caps concurrency, not rate; a rate limit needs a token bucket or similar.',
    },
    {
      id: 'conc-async.requests',
      skill: 'conc.async',
      kind: 'spotbug',
      prompt: 'With 10 permits this should run 10 requests at a time. It runs them one at a time. Tap the line.',
      code: `import asyncio
import requests

async def fetch_all(urls):
    sem = asyncio.Semaphore(10)

    async def one(url):
        async with sem:
            resp = requests.get(url, timeout=10)
            return resp.status_code

    return await asyncio.gather(*(one(u) for u in urls))`,
      bugLines: [9],
      explanation: '`requests.get` is synchronous: it holds the event-loop thread for the whole request, so no other coroutine runs until it returns. Use an async client, or `await asyncio.to_thread(requests.get, url, timeout=10)`.',
      fix: { code: `            resp = await asyncio.to_thread(requests.get, url, timeout=10)` },
    },
    {
      id: 'conc-async.bucket-refill',
      skill: 'conc.limits',
      kind: 'cloze',
      prompt: 'Complete the token bucket\'s refill: `rate` tokens per second, never more than `capacity`.',
      code: `def allow(self) -> bool:
    now = time.monotonic()
    refill = (now - self.last) {{0}} self.rate
    self.tokens = {{1}}(self.capacity, self.tokens + refill)
    self.last = now
    if self.tokens >= 1:
        self.tokens -= 1
        return True
    return False`,
      blanks: [
        { options: ['/', '*', '+'], answer: 1 },
        { options: ['max', 'min', 'sum'], answer: 1 },
      ],
      explanation: 'Seconds elapsed times tokens per second is the refill, and `min` caps it at capacity. With `max`, tokens would pile up without limit and an idle client could later fire an unlimited burst.',
    },
    {
      id: 'conc-async.timeout',
      skill: 'conc.async',
      kind: 'mcq',
      prompt: '`async with asyncio.timeout(2): await slow_call()`, and `slow_call` needs 5 s. What happens at the 2 s mark?',
      choices: [
        { text: '`slow_call` is cancelled, and the block raises `TimeoutError`', correct: true },
        {
          text: '`TimeoutError` is raised, but `slow_call` keeps running in the background',
          feedback: 'That is a thread future\'s `result(timeout=...)`. asyncio can cancel, because a coroutine only runs between awaits.',
        },
        { text: 'Nothing: `asyncio.timeout` only applies to network calls', feedback: 'It applies to whatever is awaited inside the block.' },
        { text: '`slow_call` returns `None` early', feedback: 'Cancellation raises inside `slow_call`; it does not make it return a value.' },
      ],
      explanation: 'At the deadline asyncio throws `CancelledError` into the awaited coroutine at its current `await`, then converts it to `TimeoutError` as the block exits. A coroutine stuck in a blocking call cannot be cancelled until it next awaits.',
    },
    {
      id: 'conc-async.tools',
      skill: 'conc.async',
      kind: 'match',
      prompt: 'Match each asyncio tool to its job.',
      pairs: [
        { left: '`asyncio.gather(*coros)`', right: 'Runs them concurrently; results in argument order' },
        { left: '`asyncio.TaskGroup()`', right: 'Cancels the other tasks when one fails' },
        { left: '`asyncio.Semaphore(n)`', right: 'At most n operations in flight' },
        { left: '`asyncio.to_thread(fn)`', right: 'Runs a blocking call off the event loop' },
        { left: '`asyncio.timeout(s)`', right: 'Cancels the block\'s work after s seconds' },
      ],
      explanation: 'Run together, fail together, limit, offload, and give up: the five tools most asyncio interview code needs.',
    },
    {
      id: 'conc-async.await-loop',
      skill: 'conc.async',
      kind: 'flash',
      front: 'Why does `for u in urls: await fetch(u)` take as long as a synchronous loop?',
      back: '`await` runs each coroutine to completion before the next line, so the fetches happen one at a time. To overlap them, schedule them together: `asyncio.gather(...)`, a `TaskGroup`, or `create_task`.',
    },
  ],
}

export default lesson
