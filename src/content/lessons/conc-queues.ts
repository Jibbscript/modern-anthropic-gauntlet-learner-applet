import type { Lesson } from '../../core/types'

const lesson: Lesson = {
  id: 'conc-queues',
  title: 'Queues and backpressure',
  summary: 'Connect stages with bounded queues so fast stages wait, the slowest sets the pace, and shutdown never hangs.',
  minutes: 8,
  skills: ['conc.queues'],
  steps: [
    {
      kind: 'concept',
      id: 'hook',
      title: 'The reader that ate the RAM',
      body:
        'A reader thread decodes 500 images a second into a queue. The resizer drains 50. Nothing fails. The queue just grows by 450 decoded images every second, about 1.8 GB at 4 MB each, until the machine starts swapping.\n\n' +
        'The fix is one argument: `queue.Queue(maxsize=100)`. When the queue is full, the reader ==waits==.',
      callout: {
        tone: 'insight',
        text: 'In candidate reports, image-pipeline and crawler questions tend to turn into a concurrency discussion, with bounded queues, backpressure and clean termination as recurring follow-ups. Reports vary, so treat these as likely probes, not a script.',
      },
    },
    {
      kind: 'concept',
      id: 'queue-basics',
      title: 'queue.Queue does the locking',
      body:
        '`queue.Queue` is a thread-safe FIFO. `get()` blocks while the queue is empty, and with `maxsize > 0`, `put()` blocks while it is full. No locks of your own, no busy-waiting.\n\n' +
        'That gives the producer/consumer shape: one side puts, N workers get.',
      code: {
        code: `import queue

q: queue.Queue[str] = queue.Queue(maxsize=100)

def producer(paths):
    for p in paths:
        q.put(p)          # waits while 100 are queued

def consumer():
    while True:
        path = q.get()    # waits while empty
        thumbnail(path)`,
        highlight: [7, 11],
      },
    },
    {
      kind: 'mcq',
      id: 'full-put',
      prompt: 'No consumer is running yet. What happens on the third `put`?',
      code: {
        code: `q = queue.Queue(maxsize=2)
q.put("a")
q.put("b")
q.put("c")
print("queued")`,
      },
      choices: [
        {
          text: 'It blocks until another thread calls `get()`; here none does, so the program hangs',
          correct: true,
          feedback: 'Right. A blocking `put` on a full queue waits for room: backpressure when someone consumes, a hang when nobody does.',
        },
        {
          text: 'It raises `queue.Full` because the queue is at capacity',
          feedback: '`Full` only comes from `put_nowait()` or `put(item, timeout=...)`. The default `put()` waits indefinitely.',
        },
        {
          text: 'It drops `"a"` to make room, like a `deque(maxlen=2)`',
          feedback: '`deque(maxlen=...)` silently evicts. A `Queue` never throws your data away; it makes the producer wait instead.',
        },
        {
          text: 'It succeeds, because `maxsize` is a soft hint the queue can exceed',
          feedback: '`maxsize` is enforced. If it were a hint, it could not protect your memory.',
        },
      ],
      explanation:
        'Blocking when full is the whole point of a bounded queue: the producer is slowed to the consumer\'s pace instead of buffering without limit. Use `put(item, timeout=...)` when you would rather fail loudly than wait forever.',
      hint: 'Which call raises `Full`, and is it this one?',
    },
    {
      kind: 'concept',
      id: 'slowest-stage',
      title: 'The slowest stage sets the pace',
      body:
        'Chain stages with bounded queues and the pipeline settles at the rate of its slowest stage. A stage with `w` workers spending `c` seconds per item handles `w ÷ c` items per second:\n\n' +
        '==throughput = min over stages of workers ÷ cost==\n\n' +
        'Queues upstream of the bottleneck fill and block; stages downstream sit idle. A bigger queue absorbs bursts. It never adds capacity.',
    },
    {
      kind: 'widget',
      id: 'balance',
      eyebrow: 'Your turn',
      prompt: 'You have 10 workers to spread over four stages. Filter costs 3 time units per image, Load 2, Resize and Save 1 each. Find the bottleneck and rebalance until the line saves 1 image per time unit. Try the queue-size slider along the way.',
      goal: 'Reach 1.00 images per time unit',
      widget: { id: 'pipeline', config: { images: 24, costs: { load: 2, resize: 1, filter: 3, save: 1 }, budget: 10, target: 1, goal: 'throughput' } },
      explanation:
        'Filter needs 3 workers to reach 3 ÷ 3 = 1, Load needs 2, Resize and Save need 1 each. Seven workers hit the ceiling; the other three change nothing, because beating 1.0 would need every stage faster at once, which takes 11. The queue slider moved memory and latency, never throughput.',
    },
    {
      kind: 'numeric',
      id: 'crawl-rate',
      prompt: 'A crawler pipeline: 16 fetch threads at 400 ms per page, 2 parse threads at 80 ms per page, 1 writer at 30 ms per page, bounded queues in between. How many pages per second, in steady state?',
      answer: 25,
      tolerance: 0.05,
      unit: 'pages/s',
      explanation:
        'Fetch: 16 ÷ 0.4 = 40/s. Parse: 2 ÷ 0.08 = 25/s. Write: 1 ÷ 0.03 ≈ 33/s. The minimum is parse at 25/s. The slowest *item* (a 400 ms fetch) is not the bottleneck; the stage with the least capacity is. A third parse thread lifts the line to about 33/s, where the writer takes over.',
      hint: 'Work out workers ÷ seconds per item for each stage, then take the smallest.',
    },
    {
      kind: 'concept',
      id: 'sentinels',
      title: 'Shutdown: one sentinel per worker',
      body:
        'Workers block in `get()` forever, so they need an explicit "no more work" message. Put a ==sentinel== on the queue, often `None` or a unique `STOP = object()`, also called a *poison pill*. A worker exits when it takes one.\n\n' +
        'A worker that takes a sentinel exits without putting it back, so N workers need N sentinels.',
      code: {
        code: `STOP = object()

def worker():
    while (item := q.get()) is not STOP:
        handle(item)

# after the last real item:
for _ in workers:
    q.put(STOP)
for t in workers:
    t.join()`,
        highlight: [8, 9],
      },
    },
    {
      kind: 'spotbug',
      id: 'one-pill',
      eyebrow: 'Find the bug',
      prompt: 'Every item gets processed, then the program never exits. Tap the line responsible.',
      code: `STOP = object()
q: queue.Queue = queue.Queue(maxsize=100)

def worker():
    while True:
        item = q.get()
        if item is STOP:
            break
        process(item)

threads = [threading.Thread(target=worker) for _ in range(4)]
for t in threads:
    t.start()
for item in load_items():
    q.put(item)
q.put(STOP)
for t in threads:
    t.join()`,
      bugLines: [16],
      explanation:
        'One `STOP` stops one worker. The other three stay blocked in `q.get()`, and `t.join()` waits on them forever. Non-daemon threads also keep the interpreter alive, so even without the joins the process would not exit.',
      fix: {
        code: `for _ in threads:
    q.put(STOP)`,
        caption: 'Sentinels go in after the last real item, so FIFO order puts every real item ahead of them.',
      },
      hint: 'How many workers does one `STOP` stop?',
    },
    {
      kind: 'order',
      id: 'shutdown-order',
      prompt: 'A reader feeds `q1`, four parsers move items from `q1` to `q2`, and one writer drains `q2`. Order a clean shutdown.',
      items: [
        'The reader puts its last real item on `q1`',
        'Put four sentinels on `q1`, one per parser',
        'Join the four parser threads',
        'Put one sentinel on `q2` for the writer',
        'Join the writer thread',
      ],
      explanation:
        'Stop upstream first, then drain downstream. If the writer\'s sentinel went into `q2` while parsers were still working, it would sit ahead of their last outputs, and the writer would exit with items unwritten. Joining the parsers first proves nothing more can reach `q2`.',
      hint: 'Nothing should stop until everything that feeds it has stopped.',
    },
    {
      kind: 'concept',
      id: 'dead-worker',
      title: 'A dead worker stalls the line',
      body:
        'If `process(item)` raises, the exception kills that worker thread. Python prints a traceback to stderr, and the main thread carries on unaware. Lose the only consumer and the producer blocks on a full queue forever: ==backpressure turns a crash into a hang==.\n\n' +
        'Catch per item, send failures somewhere visible, such as an `errors` queue, and keep the worker alive.',
      callout: {
        tone: 'tip',
        text: 'A *poison message* is not a poison pill: it is a real input that crashes every worker that touches it. Retry it a bounded number of times, then set it aside for inspection.',
      },
    },
    {
      kind: 'cloze',
      id: 'safe-worker',
      prompt: 'Make this worker survive bad inputs, and make sure a bad input can never leave `q.join()` waiting forever.',
      code: `STOP = object()

def worker():
    while True:
        item = q.get()
        if item is {{0}}:
            return
        try:
            out.put(transform(item))
        except Exception as exc:
            errors.put((item, exc))
        {{1}}:
            q.{{2}}()`,
      blanks: [
        { options: ['None', 'STOP', 'q.empty()'], answer: 1 },
        { options: ['else', 'except', 'finally'], answer: 2 },
        { options: ['task_done', 'join', 'get'], answer: 0 },
      ],
      explanation:
        'Compare against the sentinel you defined, with `is`: a fresh `object()` is identical only to itself, so no real item can be mistaken for it. `finally` runs on success and failure alike, so a bad item still calls `task_done()` and `q.join()` cannot hang on it. Calling `q.join()` inside a worker would wait on itself.',
      hint: 'Which clause runs whether `transform` raised or not?',
    },
    {
      kind: 'interview',
      id: 'sim',
      eyebrow: 'Interview sim',
      setup: 'You built a three-stage image pipeline with threads: load, resize, save. The interviewer starts probing.',
      turns: [
        {
          interviewer: 'Your loader is ten times faster than your resizer. What happens over a 100,000-image run?',
          options: [
            {
              text: 'It finishes faster overall, because the loader gets its share of the work done early and then just waits for the resizer.',
              quality: 'weak',
              feedback: 'Throughput is set by the resizer whatever the loader does. Finishing early just means tens of thousands of decoded images sitting in memory.',
            },
            {
              text: 'Decoded images pile up in an unbounded queue until memory runs out. A bounded queue makes the loader wait, capping memory. Total time is the resizer\'s either way, so speed comes from more resizers.',
              quality: 'strong',
              feedback: 'Names the failure, the mechanism, the memory bound, and where real speed comes from.',
            },
            {
              text: 'The queue between them grows without limit, so I would add a `maxsize` to it and keep everything else the same.',
              quality: 'okay',
              feedback: 'Right fix, but you did not say what it buys (bounded memory) or what it does not (any extra throughput).',
            },
          ],
        },
        {
          interviewer: 'How does the program end?',
          options: [
            {
              text: 'When the loader finishes, I set a global `done` flag, and each worker checks the flag before taking its next item.',
              quality: 'okay',
              feedback: 'A worker blocked in `get()` never reaches the check. It only works with polling or timeouts, which add latency and edge cases.',
            },
            {
              text: 'Stage by stage: after the last item, one sentinel per resize worker, then join them; then one per save worker, and join those. FIFO keeps every real item ahead of the sentinels.',
              quality: 'strong',
              feedback: 'Correct count, correct order, and the reason it is safe.',
            },
            {
              text: 'I make all the workers daemon threads, so they are cleaned up automatically when the main thread reaches the end.',
              quality: 'weak',
              feedback: 'Daemon threads are killed mid-item at exit: half-written files and lost results. That abandons work rather than shutting down.',
            },
          ],
        },
        {
          interviewer: 'One image in 10,000 is corrupt, and `resize` raises on it. What happens?',
          options: [
            {
              text: 'The exception propagates up to the main thread, which logs it, stops the pipeline cleanly and exits with an error.',
              quality: 'weak',
              feedback: 'Exceptions do not cross threads. The main thread never sees it; a traceback goes to stderr while the pipeline quietly loses a worker.',
            },
            {
              text: 'That worker dies, and once enough have died, the loader blocks on a full queue forever. I catch per item, queue `(path, error)` for a final report, and test with a planted corrupt file.',
              quality: 'strong',
              feedback: 'Traces the crash through to the hang, isolates failures per item, keeps them visible, and proves it.',
            },
            {
              text: 'Wrap the `resize` call in a try/except inside the worker, skip the bad image, and carry on with the rest.',
              quality: 'okay',
              feedback: 'Keeps the worker alive, but a silent skip means nobody learns which images are missing or why.',
            },
          ],
        },
      ],
      wrapUp:
        'The usual three probes: stages at different speeds, how it stops, and how it fails. Strong answers name the mechanism (a full queue blocks, a sentinel per worker, a dead consumer means a hang) and say how they would test it.',
    },
    {
      kind: 'concept',
      id: 'recap',
      eyebrow: 'Recap',
      title: 'Three things to carry in',
      body:
        '1. **Bound every queue.** A full queue makes the producer wait, which caps memory.\n' +
        '2. **Throughput is the minimum over stages of workers ÷ cost.** Fix the bottleneck, not the buffer.\n' +
        '3. **Shut down with one sentinel per worker, upstream first,** and catch errors per item so one bad input cannot stall the line.',
    },
  ],
  cards: [
    {
      id: 'conc-queues.nowait',
      skill: 'conc.queues',
      kind: 'predict',
      prompt: 'What does this print?',
      code: `import queue

q = queue.Queue(maxsize=2)
for i in range(3):
    try:
        q.put_nowait(i)
    except queue.Full:
        print("full at", i)
print(q.qsize(), q.get())`,
      answers: ['full at 2\n2 0'],
      explanation: '`put_nowait` raises `queue.Full` instead of blocking, so the third item is refused. Two items remain, and `get()` returns the oldest, `0`: a `Queue` is FIFO and never evicts.',
    },
    {
      id: 'conc-queues.bottleneck',
      skill: 'conc.queues',
      kind: 'numeric',
      prompt: 'Download: 6 threads at 300 ms per item. Decode: 4 threads at 100 ms. Upload: 2 threads at 150 ms. Items per second, in steady state?',
      answer: 13.33,
      tolerance: 0.05,
      unit: 'items/s',
      explanation: '6 ÷ 0.3 = 20/s, 4 ÷ 0.1 = 40/s, 2 ÷ 0.15 ≈ 13.3/s. Upload is the bottleneck even though download is the slowest per item.',
    },
    {
      id: 'conc-queues.n-sentinels',
      skill: 'conc.queues',
      kind: 'flash',
      front: 'Four worker threads share one queue. Why does putting a single sentinel leave the program hung?',
      back: 'Each worker exits after taking one sentinel and does not put it back. The other three stay blocked in `get()`, so joining them waits forever. Put one sentinel per worker.',
    },
    {
      id: 'conc-queues.bigger-buffer',
      skill: 'conc.queues',
      kind: 'flash',
      front: 'Does raising a bounded queue\'s `maxsize` raise a pipeline\'s steady-state throughput?',
      back: 'No. Throughput is set by the slowest stage (workers ÷ cost). A bigger queue absorbs bursts and jitter at the price of memory and latency. To go faster, add capacity at the bottleneck.',
    },
    {
      id: 'conc-queues.task-done',
      skill: 'conc.queues',
      kind: 'spotbug',
      prompt: 'With one corrupt file in the batch, `q.join()` never returns. Tap the line whose placement causes the hang.',
      code: `def worker():
    while True:
        item = q.get()
        result = transform(item)  # may raise
        out.put(result)
        q.task_done()

for _ in range(4):
    threading.Thread(target=worker, daemon=True).start()
for path in paths:
    q.put(path)
q.join()`,
      bugLines: [6],
      explanation: 'When `transform` raises, the worker dies before reaching `task_done()`. The queue\'s unfinished count never gets back to zero, so `join()` waits forever. Put `task_done()` in a `finally`, and catch per item so the worker survives.',
      fix: {
        code: `def worker():
    while True:
        item = q.get()
        try:
            out.put(transform(item))
        except Exception as exc:
            errors.put((item, exc))
        finally:
            q.task_done()`,
      },
    },
    {
      id: 'conc-queues.join-then-stop',
      skill: 'conc.queues',
      kind: 'order',
      prompt: 'Order a clean shutdown of N workers that call `task_done()` for every real item they take.',
      items: [
        'Put every real item on the queue',
        'Call `q.join()` to wait until every item is marked done',
        'Put one sentinel per worker',
        'Join each worker thread',
      ],
      explanation: '`q.join()` proves the work is finished; the sentinels then release the idle workers, and joining the threads confirms they exited. Sending sentinels before `q.join()` only works if the sentinel `get()` calls are also matched by `task_done()`.',
    },
    {
      id: 'conc-queues.terms',
      skill: 'conc.queues',
      kind: 'match',
      prompt: 'Match each term to what it means.',
      pairs: [
        { left: 'Backpressure', right: 'A full queue makes the producer wait' },
        { left: 'Sentinel (poison pill)', right: 'A special item that tells one worker to exit' },
        { left: 'Poison message', right: 'A real input that crashes every worker that handles it' },
        { left: '`task_done()`', right: 'Marks one taken item as finished, for `q.join()`' },
        { left: '`put_nowait()`', right: 'Raises `queue.Full` instead of blocking' },
      ],
      explanation: 'Backpressure slows producers, sentinels stop consumers, and a poison message is a bad input to isolate, not a shutdown signal.',
    },
  ],
}

export default lesson
