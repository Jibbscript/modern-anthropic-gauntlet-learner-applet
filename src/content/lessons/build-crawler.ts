import type { Lesson } from '../../core/types'

const lesson: Lesson = {
  id: 'build-crawler',
  title: 'Concurrent web crawler',
  summary: 'Build a BFS crawler, make it concurrent, then make it correct: no duplicate fetches, no early exits, no hangs.',
  minutes: 9,
  skills: ['build.crawler', 'conc.races'],
  steps: [
    {
      kind: 'concept',
      id: 'hook',
      eyebrow: 'Commonly reported',
      title: 'Eight workers, one page, three fetches',
      body:
        'Your single-threaded crawler is correct. The interviewer says *make it faster*. You add eight threads. Now the logs show `/pricing` fetched three times, and some runs stop after one page.\n\n' +
        'That arc is the question. The BFS is the warm-up; the signal is in how you handle shared state. Get level 1 done quickly so the conversation has time to get there.',
      callout: {
        tone: 'insight',
        text: 'Candidates report the crawler question often starts simple and turns into a concurrency and thread-safety discussion. Formats vary by team and over time, so treat this as a likely shape, not a script.',
      },
    },
    {
      kind: 'order',
      id: 'plan',
      eyebrow: 'Plan the round',
      prompt: 'Put the build in the order you would tackle it in a progressive interview, where each level builds on the last.',
      items: [
        'Single-threaded BFS that returns every page it reached',
        'Normalize links: resolve relative URLs, drop `#fragments`, stay on one host',
        'Fetch with a pool of N workers sharing one frontier',
        'Fix the duplicate fetches the workers introduce',
        'Add politeness: per-host rate limit and robots.txt',
      ],
      explanation:
        'Correct before concurrent. Normalizing is part of *correct*: a visited set of raw strings dedupes nothing. Duplicate fetches only appear once workers share state, so the fix follows the pool. Politeness comes last because it only matters once you are fast enough to hurt someone. Test at every level, not only at the end.',
      hint: 'Which problems cannot exist until an earlier level does?',
    },
    {
      kind: 'concept',
      id: 'bfs',
      title: 'Level 1: BFS with a visited set',
      body:
        'A `deque` gives O(1) `popleft`, so you get BFS for free. Mark a URL as seen ==when you enqueue it==, not when you fetch it, so a link found on ten pages is queued once.\n\n' +
        'Take `fetch_links` as a parameter instead of calling HTTP inside. That one choice lets a test hand the crawler a dict pretending to be a website.',
      code: {
        code: `from collections import deque
from urllib.parse import urldefrag, urljoin, urlparse

def crawl(start: str, fetch_links) -> set[str]:
    host = urlparse(start).netloc
    seen = {start}
    frontier = deque([start])
    while frontier:
        url = frontier.popleft()
        for href in fetch_links(url):
            link, _ = urldefrag(urljoin(url, href))
            if urlparse(link).netloc == host and link not in seen:
                seen.add(link)
                frontier.append(link)
    return seen`,
        highlight: [12, 13],
      },
    },
    {
      kind: 'predict',
      id: 'urljoin-quirk',
      eyebrow: 'Read the docs',
      prompt: 'Links on a page are usually relative. What does this print?',
      code: `from urllib.parse import urljoin

page = "https://site.com/blog/post"
print(urljoin(page, "other"))
print(urljoin(page, "/other"))
print(urljoin(page, "../about"))`,
      answers: ['https://site.com/blog/other\nhttps://site.com/other\nhttps://site.com/about'],
      explanation:
        'A relative link replaces the last path segment, the way a browser resolves it: `post` is a file inside `/blog/`, not a directory. A leading `/` resolves from the host root, and `..` climbs one level from `/blog/`. String concatenation gets all three wrong, which is why you resolve every link against the URL of the page it appeared on.',
      hint: 'Treat `post` like a filename sitting in the `/blog/` directory.',
    },
    {
      kind: 'cloze',
      id: 'normalize',
      prompt: 'Complete the normalizer so `/a`, `/a#top`, and a relative `a` found on the home page all become the same key.',
      code: `def normalize(page_url: str, href: str):
    absolute = {{0}}(page_url, href)
    clean, _fragment = {{1}}(absolute)
    return clean

def same_host(url: str, start: str):
    root = urlparse(start).netloc
    return urlparse(url).{{2}} == root`,
      blanks: [
        { options: ['urljoin', 'urlparse', 'os.path.join'], answer: 0 },
        { options: ['urlparse', 'urldefrag', 'urlsplit'], answer: 1 },
        { options: ['path', 'scheme', 'netloc'], answer: 2 },
      ],
      explanation:
        '`urljoin` resolves a link against the page it came from; `os.path.join` knows nothing about URLs. `urldefrag` returns `(url, fragment)`; the fragment never reaches the server, so `/a#top` and `/a` are the same document. Compare `netloc` on both sides. One catch: `netloc` keeps case and port, so lowercase it if hosts can arrive as `Site.com`.',
      hint: 'Two of the blanks are the functions whose names describe exactly what they do to a URL.',
    },
    {
      kind: 'concept',
      id: 'workers',
      title: 'Level 2: workers sharing a frontier',
      body:
        'Fetching is I/O-bound. A thread waiting on the network releases the GIL, so threads (or asyncio) give a real speedup here.\n\n' +
        'The usual shape: one `queue.Queue` as the frontier and N worker threads looping *get, fetch, enqueue links*. The queue is thread-safe. The `seen` set is not protected by anything, and every worker reads and writes it. That is where the bugs live.',
    },
    {
      kind: 'spotbug',
      id: 'check-then-add',
      eyebrow: 'Find the race',
      prompt: 'Eight of these workers share `seen` and `q`. On a site with many cross-links, some pages get fetched two or three times. Tap the line(s) that together make the race.',
      code: `seen: set[str] = set()
q: queue.Queue[str | None] = queue.Queue()

def worker() -> None:
    while (url := q.get()) is not None:
        try:
            if url not in seen:
                html = fetch(url)
                seen.add(url)
                for link in extract_links(url, html):
                    q.put(link)
        finally:
            q.task_done()`,
      bugLines: [7, 9],
      explanation:
        'Check-then-act with a network call in the middle. `/pricing` is linked from two pages, so it sits in the queue twice. Worker A checks it (not seen) and starts a slow fetch. Worker B pops the second copy, checks (still not seen), and fetches it too. The check and the add must be one atomic step, done when a link is *enqueued*.',
      fix: {
        code: `seen_lock = threading.Lock()

def worker() -> None:
    while (url := q.get()) is not None:
        try:
            html = fetch(url)
            for link in extract_links(url, html):
                with seen_lock:
                    if link in seen:
                        continue
                    seen.add(link)
                q.put(link)
        finally:
            q.task_done()`,
        caption: 'Seed with `seen = {start}` and `q.put(start)`. Each URL now enters the queue exactly once.',
      },
      hint: 'Two workers can hold the same URL. What runs between the check and the add?',
    },
    {
      kind: 'widget',
      id: 'no-dupes',
      eyebrow: 'Your turn',
      prompt: 'This crawl uses check-then-add. Run it with 3 workers and watch the duplicate counter. Then change the dedupe rule so a full crawl with 2 or more workers fetches nothing twice.',
      goal: 'Full crawl, 2+ workers, 0 duplicates',
      widget: { id: 'crawler', config: { graph: 'cyclic', workers: 3, dedupe: 'check-then-add', sameHost: true, goal: 'no-dupes' } },
      explanation:
        'With **atomic**, the visited check and insert happen together, under a lock, at enqueue time, so each page is queued once and fetched once. Try check-then-add with 1 worker: zero duplicates. A bug that needs two threads hides in single-threaded tests.',
    },
    {
      kind: 'concept',
      id: 'done',
      title: 'When is a concurrent crawl done?',
      body:
        'Not when the queue is empty. At the start there is one URL; a worker takes it, and the queue stays empty for the whole fetch, yet more pages are coming.\n\n' +
        'You are done when the queue is empty ==and nothing is in flight==. `queue.Queue` counts this: each `put` adds an unfinished task, each `task_done()` removes one, and `q.join()` waits for zero.',
      code: {
        code: `q.put(start)
workers = [threading.Thread(target=worker) for _ in range(8)]
for t in workers:
    t.start()
q.join()             # every put matched by a task_done
for _ in workers:
    q.put(None)      # one sentinel per worker
for t in workers:
    t.join()`,
        caption: 'A worker calls `task_done()` only after it has enqueued that page\'s links, so the count cannot touch zero mid-crawl.',
      },
    },
    {
      kind: 'compare',
      id: 'termination',
      question: 'Interviewer: *How does your crawler know it is finished?*',
      a: 'Each worker loops `while not q.empty(): url = q.get()` and returns when the queue drains. No extra bookkeeping: once every worker has returned, the crawl is done.',
      b: 'I count work, not queue length. Every `put` is matched by a `task_done()` after that page\'s links are enqueued, so the count cannot reach zero while a fetch is in flight. Main waits on `q.join()`, then sends one `None` per worker.',
      better: 'b',
      explanation:
        '**A** exits early: while the first page is being fetched the queue is empty, so the other workers quit and you have quietly built a single-threaded crawler. It can also hang: `empty()` sees one item, another worker takes it, and `get()` blocks forever. **B** names the real invariant (pending work, not queue length) and says how the workers stop.',
    },
    {
      kind: 'concept',
      id: 'fake-fetch',
      title: 'Test it without the network',
      body:
        'Because `fetch` is injected, a test can hand the crawler a dict: a tiny site with a cycle, an off-host link, and a fragment. Assert the exact set of pages, then that each was fetched ==exactly once==.\n\n' +
        'One green run proves little for a race. Add a random sleep to shuffle interleavings, use many workers, and loop.',
      code: {
        code: `SITE = {
    "https://s.com/": ["/a", "/b", "https://cdn.net/x.js"],
    "https://s.com/a": ["/b#top", "/"],
    "https://s.com/b": ["/a"],
}

def test_each_page_fetched_once():
    for _ in range(50):
        calls = []
        def fake_fetch(url):
            calls.append(url)                   # atomic append
            time.sleep(random.random() / 1000)  # shake interleavings
            return SITE.get(url, [])
        found = crawl("https://s.com/", fake_fetch, workers=8)
        assert found == set(SITE)
        assert len(calls) == len(set(calls))`,
        caption: 'This test passes the locked worker and reliably fails the check-then-add one.',
      },
    },
    {
      kind: 'mcq',
      id: 'politeness',
      eyebrow: 'Extend it',
      prompt: 'Tests pass. The interviewer says: *now point it at a real site.* Which changes belong in the next level?',
      multi: true,
      choices: [
        {
          text: 'Cap concurrent requests per host with a semaphore or a rate limiter',
          correct: true,
          feedback: 'Yes. Eight eager workers on one small site is a load test nobody asked for.',
        },
        {
          text: 'Check robots.txt with `urllib.robotparser` before each fetch',
          correct: true,
          feedback: 'Yes. `can_fetch(agent, url)` and `crawl_delay(agent)` ship with the standard library.',
        },
        {
          text: 'Put a timeout on every request and a cap on total pages',
          correct: true,
          feedback: 'Yes. Without a timeout one hung server pins a worker forever; without a cap, a calendar with endless "next month" links never ends.',
        },
        {
          text: 'Raise workers to 64, since network waits release the GIL anyway',
          feedback: 'Threads are cheap for you, not for the server. More workers means more load on a host you do not own; politeness is about bounding that.',
        },
        {
          text: 'Retry failed fetches immediately until they succeed',
          feedback: 'Immediate retries hammer a server that is already struggling. Retry a bounded number of times with backoff, and treat 429 or 503 as a signal to slow down.',
        },
      ],
      explanation:
        'Politeness bounds the load you put on someone else\'s server: per-host limits, robots rules, timeouts, and a stopping point. It is also where an interviewer sees whether you think past your own process.',
    },
    {
      kind: 'interview',
      id: 'sim',
      eyebrow: 'Interview sim',
      setup: 'Your single-threaded crawler passes its tests. The interviewer leans in.',
      turns: [
        {
          interviewer: 'Nice. On a 10,000-page site this takes an hour. Make it faster.',
          options: [
            {
              text: 'Wrap `fetch` in a `ThreadPoolExecutor` and `map` it over the frontier, one BFS level at a time.',
              quality: 'okay',
              feedback: 'A reasonable first cut, but each level waits for its slowest page, and you have not said what state becomes shared.',
            },
            {
              text: 'Fetching is I/O-bound, so threads help despite the GIL. N workers pull from one shared queue. Before coding: the queue and `seen` become shared state, so I will decide how each is protected.',
              quality: 'strong',
              feedback: 'Why threads fit, the shape, and the risk, all before typing. That is the conversation they want.',
            },
            {
              text: 'Switch to `multiprocessing` so we get around the GIL.',
              quality: 'weak',
              feedback: 'The time goes to network waits, which already release the GIL. Processes add pickling and make `seen` far harder to share.',
            },
          ],
        },
        {
          interviewer: 'The logs show `/pricing` fetched twice. Walk me through how that happens.',
          options: [
            {
              text: 'Python sets are thread-safe because of the GIL, so the site must be returning duplicate links.',
              quality: 'weak',
              feedback: 'A single `add` or `in` is atomic in CPython; the check followed by the add is not. Blaming the input without evidence also reads badly.',
            },
            {
              text: 'Probably a race on the `seen` set. I would put a lock around it.',
              quality: 'okay',
              feedback: 'Right area, no mechanism. "A lock around it" could still leave the fetch sitting between the check and the add.',
            },
            {
              text: '`/pricing` was queued twice. Worker A checks it, finds it unvisited, starts fetching. Before A adds it, B pops the second copy and passes the same check. I will make check-and-add one locked step at enqueue time.',
              quality: 'strong',
              feedback: 'A concrete interleaving, then a fix that removes the window instead of shrinking it.',
            },
          ],
        },
        {
          interviewer: 'How would you convince yourself the fix works?',
          options: [
            {
              text: 'A fake fetcher over an in-memory graph with cycles, a random sleep to shake interleavings, 8 workers, many runs. Assert the result matches the single-threaded crawl and every URL was fetched exactly once.',
              quality: 'strong',
              feedback: 'A test designed to make the race likely, with an oracle (the single-threaded result) and the property you care about.',
            },
            {
              text: 'Run it against a real site a few times and grep the logs for duplicates.',
              quality: 'okay',
              feedback: 'Better than nothing, but slow, flaky, impolite to the site, and a race can hide for a hundred runs.',
            },
            {
              text: 'With the lock in place it is correct by construction, so I would move on to the next feature.',
              quality: 'weak',
              feedback: 'The prompt literally asked you to test it yourself. Confidence is not evidence, and locks are easy to put in the wrong place.',
            },
          ],
        },
      ],
      wrapUp:
        'The pattern: say why the approach fits (I/O-bound), name the shared state before coding, explain a bug as a concrete interleaving, and verify with a test built to provoke it.',
    },
    {
      kind: 'concept',
      id: 'recap',
      eyebrow: 'Recap',
      title: 'Three things to carry in',
      body:
        '1. **Normalize, then dedupe.** `urljoin` against the page, strip the fragment, filter by host.\n' +
        '2. **Check-and-add is one atomic step**, done at enqueue time under a lock, or owned by a single coordinator thread.\n' +
        '3. **Done means nothing queued and nothing in flight.** Count tasks, not queue length.\n\n' +
        'Then prove it with a fake fetcher and a test that tries hard to fail.',
    },
  ],
  cards: [
    {
      id: 'build-crawler.atomic-pair',
      skill: 'conc.races',
      kind: 'flash',
      front: 'In CPython, `x in seen` and `seen.add(x)` are each atomic. Why is `if x not in seen: seen.add(x)` still a race across threads?',
      back: 'Each operation is atomic; the pair is not. Another thread can run between the check and the add, so two threads both see "not seen" and both proceed. Do check-and-add as one step under a lock.',
    },
    {
      id: 'build-crawler.urljoin-dir',
      skill: 'build.crawler',
      kind: 'predict',
      prompt: 'What does this print?',
      code: `from urllib.parse import urljoin
from urllib.parse import urldefrag

base = "https://a.com/docs/"
print(urljoin(base, "intro"))
url = "https://a.com/x?y=1#top"
print(urldefrag(url).url)`,
      answers: ['https://a.com/docs/intro\nhttps://a.com/x?y=1'],
      explanation: 'With a trailing slash, `docs/` is a directory, so the relative link goes inside it. `urldefrag` drops only the `#fragment`; the query string is part of the resource and stays.',
    },
    {
      id: 'build-crawler.early-task-done',
      skill: 'build.crawler',
      kind: 'spotbug',
      prompt: 'Main calls `q.join()`, then stops the workers. The crawl often ends after a single page. Which line is wrong?',
      code: `def worker() -> None:
    while (url := q.get()) is not None:
        q.task_done()
        html = fetch(url)
        for link in extract_links(url, html):
            with seen_lock:
                if link in seen:
                    continue
                seen.add(link)
            q.put(link)`,
      bugLines: [3],
      explanation: '`task_done()` runs before this page\'s links are enqueued, so the unfinished count can reach zero while a fetch is in flight. `join()` returns and main shuts the crawl down. Call it in a `finally` after the links are queued.',
    },
    {
      id: 'build-crawler.join-means',
      skill: 'build.crawler',
      kind: 'mcq',
      prompt: '`q.join()` on a `queue.Queue` returns when…',
      choices: [
        { text: 'every item that was `put` has had a matching `task_done()`', correct: true },
        { text: 'the queue is empty', feedback: 'The queue can be empty while workers are still processing items they took, and those may enqueue more.' },
        { text: 'all worker threads have exited', feedback: 'That is `Thread.join()`. Queue workers usually outlive `q.join()` until you send sentinels.' },
        { text: 'no thread is blocked in `get()`', feedback: 'Idle workers block in `get()` constantly; the queue does not track that for `join()`.' },
      ],
      explanation: 'The queue keeps an unfinished-task count: `put` increments it, `task_done()` decrements it. `join()` waits for zero, which is why `task_done()` must come after a page\'s links are enqueued.',
    },
    {
      id: 'build-crawler.tools',
      skill: 'build.crawler',
      kind: 'match',
      prompt: 'Match each crawler problem to the tool that handles it.',
      pairs: [
        { left: 'A relative link like `../about`', right: '`urljoin(page_url, href)`' },
        { left: '`/docs#install` vs `/docs`', right: '`urldefrag(url)`' },
        { left: 'Stay on the start site', right: 'compare `urlparse(url).netloc`' },
        { left: 'Know when the crawl has finished', right: '`task_done()` plus `q.join()`' },
        { left: 'Respect the site\'s crawl rules', right: '`urllib.robotparser`' },
      ],
      explanation: 'Resolve, strip, filter, then dedupe. Completion is about counting work, and politeness has a standard-library parser.',
    },
    {
      id: 'build-crawler.coordinator',
      skill: 'conc.races',
      kind: 'flash',
      front: 'Describe a concurrent crawler where `seen` needs no lock at all.',
      back: 'A coordinator: only the main thread touches the frontier and `seen`. It submits fetches to a `ThreadPoolExecutor`, waits with `wait(pending, return_when=FIRST_COMPLETED)`, and enqueues new links itself. Workers only do I/O.',
    },
    {
      id: 'build-crawler.worker-loop',
      skill: 'build.crawler',
      kind: 'order',
      prompt: 'Order one iteration of a correct crawler worker.',
      items: [
        '`url = q.get()`',
        '`html = fetch(url)`',
        'For each link: check-and-add to `seen` under the lock',
        '`q.put(link)` for each link that was new',
        '`q.task_done()`',
      ],
      explanation: 'The atomic check-and-add guards the queue, so each URL is enqueued once. `task_done()` goes last, after the children are queued, so `q.join()` cannot see zero while work remains.',
    },
  ],
}

export default lesson
