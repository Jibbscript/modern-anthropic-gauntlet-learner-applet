import type { Lab, LabLevel } from '../../core/types'

/** Python source: raw template (backslashes kept as typed), leading newline dropped. */
const py = (s: TemplateStringsArray) => s.raw[0].replace(/^\n/, '')

/** learner code first, then the provided fakes (identical in starter and every solution) */
const withWeb = (code: string) => `${code}\n\n${PROVIDED}`

/* --------------------------------------------------------------- provided */

const PROVIDED = py`
# ---------------------------------------------------------------------------
# Provided: a fake web, a fake clock and a link extractor. Don't edit.
# It loads after your code: use these names inside your functions, and quote
# them in type hints (clock: "FakeClock").
# ---------------------------------------------------------------------------
import asyncio
import heapq
import re


class FetchError(Exception):
    """A failed fetch. .status is the HTTP status: 404 = not found, 5xx = server trouble."""

    def __init__(self, status, url):
        super().__init__(f"{status} {url}")
        self.status = status
        self.url = url


_HREF = re.compile(r"""<a\s[^>]*?\bhref\s*=\s*["']([^"']*)["']""", re.IGNORECASE)


def extract_links(html):
    """The href of every <a> tag in html, in document order, exactly as written."""
    return _HREF.findall(html)


class FakeWeb:
    """A tiny in-memory web. The tests build one for you.

    web = FakeWeb({
        "https://a.com/": '<a href="https://a.com/about">About</a>',
        "https://a.com/about": "no links here",
    })
    web.fetch("https://a.com/")          the page's HTML
    web.fetch("https://a.com/missing")   raises FetchError(404, url)
    await web.afetch("https://a.com/")   the same, after a simulated delay

    Options: latency (seconds each afetch takes), failures ({url: [503, ...]}:
    those statuses are raised, in order, before the url starts working), and
    clock (a FakeClock: afetch then waits on it, and log records its time).

    Records: web.fetched (every url requested, in order), web.log ((time, url)
    per request), web.in_flight and web.peak (most afetch calls at once).
    """

    def __init__(self, pages, latency=0.01, failures=None, clock=None):
        self.pages = dict(pages)
        self.latency = latency
        self.failures = {url: list(codes) for url, codes in (failures or {}).items()}
        self.clock = clock
        self.fetched = []
        self.log = []
        self.in_flight = 0
        self.peak = 0

    def fetch(self, url):
        self._record(url)
        return self._respond(url)

    async def afetch(self, url):
        self._record(url)
        self.in_flight += 1
        self.peak = max(self.peak, self.in_flight)
        try:
            if self.clock is not None:
                await self.clock.sleep(self.latency)
            else:
                await asyncio.sleep(self.latency)
            return self._respond(url)
        finally:
            self.in_flight -= 1

    def _record(self, url):
        self.fetched.append(url)
        self.log.append((self.clock.now() if self.clock is not None else 0.0, url))

    def _respond(self, url):
        if self.failures.get(url):
            raise FetchError(self.failures[url].pop(0), url)
        if url not in self.pages:
            raise FetchError(404, url)
        return self.pages[url]


class FakeClock:
    """Virtual time (used from level 4).

    clock.now() is the current time in seconds, starting at 0.0.
    await clock.sleep(s) waits s virtual seconds. No real time passes: once
    every task is waiting, the clock jumps to the earliest wake-up time.
    """

    def __init__(self):
        self._now = 0.0
        self._sleepers = []  # heap of (wake_time, seq, future)
        self._seq = 0
        self._driver = None

    def now(self):
        return self._now

    async def sleep(self, seconds):
        if seconds <= 0:
            await asyncio.sleep(0)
            return
        future = asyncio.get_running_loop().create_future()
        heapq.heappush(self._sleepers, (self._now + seconds, self._seq, future))
        self._seq += 1
        if self._driver is None or self._driver.done():
            self._driver = asyncio.ensure_future(self._advance())
        await future

    async def _advance(self):
        while self._sleepers:
            seen = -1
            while seen != self._seq:  # let every runnable task reach its next wait
                seen = self._seq
                for _ in range(20):
                    await asyncio.sleep(0)
            self._now = max(self._now, self._sleepers[0][0])
            while self._sleepers and self._sleepers[0][0] <= self._now:
                future = heapq.heappop(self._sleepers)[2]
                if not future.done():
                    future.set_result(None)
`

/* ---------------------------------------------------------------- starter */

const STARTER = withWeb(py`
def crawl(start_url, fetch):
    """Crawl breadth-first from start_url, staying on its host.

    fetch(url) returns the page's HTML or raises FetchError. Use
    extract_links(html) (provided below) to read a page's links.
    Returns the URLs fetched successfully, in the order they were fetched.
    """
    raise NotImplementedError
`)

/* ---------------------------------------------------------------- level 1 */

const L1_TESTS = py`
def _l1_crawl(pages, start="https://a.com/"):
    web = FakeWeb(pages)
    got = crawl(start, web.fetch)
    assert isinstance(got, list), f"crawl should return a list, got {type(got).__name__}"
    return got, web


def _l1_links(*urls):
    return " ".join(f'<a href="{u}">{u}</a>' for u in urls)


def test_l1_single_page():
    got, _ = _l1_crawl({"https://a.com/": "hello, no links"})
    assert got == ["https://a.com/"], f"got {got!r}"


def test_l1_spec_example():
    pages = {
        "https://a.com/": _l1_links("https://a.com/a", "https://a.com/b"),
        "https://a.com/a": _l1_links("https://a.com/c", "https://a.com/"),
        "https://a.com/b": "",
        "https://a.com/c": "",
    }
    got, _ = _l1_crawl(pages)
    want = ["https://a.com/", "https://a.com/a", "https://a.com/b", "https://a.com/c"]
    assert got == want, f"\n  got:  {got!r}\n  want: {want!r}"


def test_l1_breadth_first_not_depth_first():
    pages = {
        "https://a.com/": _l1_links("https://a.com/a", "https://a.com/b"),
        "https://a.com/a": _l1_links("https://a.com/a1"),
        "https://a.com/a1": _l1_links("https://a.com/a2"),
        "https://a.com/a2": "",
        "https://a.com/b": _l1_links("https://a.com/b1"),
        "https://a.com/b1": "",
    }
    got, _ = _l1_crawl(pages)
    want = ["https://a.com/", "https://a.com/a", "https://a.com/b",
            "https://a.com/a1", "https://a.com/b1", "https://a.com/a2"]
    assert got == want, f"visit every page at depth d before depth d+1\n  got:  {got!r}\n  want: {want!r}"


def test_l1_link_order_respected():
    pages = {
        "https://a.com/": _l1_links("https://a.com/c", "https://a.com/a", "https://a.com/b"),
        "https://a.com/a": "", "https://a.com/b": "", "https://a.com/c": "",
    }
    got, _ = _l1_crawl(pages)
    want = ["https://a.com/", "https://a.com/c", "https://a.com/a", "https://a.com/b"]
    assert got == want, f"follow links in the order they appear on the page\n  got:  {got!r}\n  want: {want!r}"


def test_l1_cycles_terminate():
    pages = {
        "https://a.com/": _l1_links("https://a.com/x", "https://a.com/"),
        "https://a.com/x": _l1_links("https://a.com/y", "https://a.com/"),
        "https://a.com/y": _l1_links("https://a.com/x", "https://a.com/y", "https://a.com/"),
    }
    got, _ = _l1_crawl(pages)
    assert got == ["https://a.com/", "https://a.com/x", "https://a.com/y"], f"got {got!r}"


def test_l1_each_url_fetched_once():
    hub = _l1_links(*[f"https://a.com/p{i}" for i in range(5)], "https://a.com/shared")
    pages = {"https://a.com/": hub, "https://a.com/shared": ""}
    for i in range(5):
        pages[f"https://a.com/p{i}"] = _l1_links("https://a.com/shared", "https://a.com/")
    got, web = _l1_crawl(pages)
    dupes = sorted({u for u in web.fetched if web.fetched.count(u) > 1})
    assert not dupes, f"fetched more than once: {dupes}"
    assert len(got) == 7, f"expected 7 pages, got {got!r}"


def test_l1_stays_on_host():
    pages = {
        "https://a.com/": _l1_links("https://b.com/", "https://blog.a.com/", "https://a.com/in"),
        "https://a.com/in": _l1_links("https://b.com/deep"),
        "https://b.com/": "", "https://b.com/deep": "", "https://blog.a.com/": "",
    }
    got, web = _l1_crawl(pages)
    assert got == ["https://a.com/", "https://a.com/in"], f"got {got!r}"
    off_host = [u for u in web.fetched if not u.startswith("https://a.com/")]
    assert not off_host, f"never fetch other hosts (a subdomain is another host): {off_host}"


def test_l1_skips_missing_pages():
    pages = {
        "https://a.com/": _l1_links("https://a.com/gone", "https://a.com/ok"),
        "https://a.com/ok": _l1_links("https://a.com/deep", "https://a.com/gone"),
        "https://a.com/deep": "",
    }
    got, web = _l1_crawl(pages)
    want = ["https://a.com/", "https://a.com/ok", "https://a.com/deep"]
    assert got == want, f"a 404 is skipped and the crawl goes on\n  got:  {got!r}\n  want: {want!r}"
    assert web.fetched.count("https://a.com/gone") == 1, "a URL that failed should not be fetched again"


def test_l1_missing_start_page():
    got, web = _l1_crawl({"https://a.com/other": ""})
    assert got == [], f"if the start page fails there is nothing to visit; got {got!r}"


def test_l1_unlinked_pages_not_visited():
    pages = {"https://a.com/": _l1_links("https://a.com/x"), "https://a.com/x": "", "https://a.com/orphan": ""}
    got, _ = _l1_crawl(pages)
    assert "https://a.com/orphan" not in got, "only pages reachable by links are visited"


def test_l1_start_anywhere():
    pages = {
        "https://a.com/": _l1_links("https://a.com/docs"),
        "https://a.com/docs": _l1_links("https://a.com/docs/api", "https://a.com/"),
        "https://a.com/docs/api": "",
    }
    got, _ = _l1_crawl(pages, start="https://a.com/docs")
    want = ["https://a.com/docs", "https://a.com/docs/api", "https://a.com/"]
    assert got == want, f"\n  got:  {got!r}\n  want: {want!r}"


def test_l1_large_tree_in_bfs_order():
    pages = {}
    for n in range(1, 128):
        kids = [f"https://a.com/n{k}" for k in (2 * n, 2 * n + 1) if k < 128]
        pages[f"https://a.com/n{n}"] = _l1_links(*kids)
    got, _ = _l1_crawl(pages, start="https://a.com/n1")
    want = [f"https://a.com/n{n}" for n in range(1, 128)]
    assert got == want, f"a binary tree crawled breadth-first visits n1, n2, n3, ...; got {got[:8]!r}..."
`

const L1_SOLUTION = withWeb(py`
from collections import deque
from urllib.parse import urlsplit


def crawl(start_url, fetch):
    """Breadth-first crawl of start_url's host; returns the URLs fetched successfully."""
    host = urlsplit(start_url).netloc
    seen = {start_url}  # marked when queued, so nothing is queued twice
    queue = deque([start_url])
    visited = []
    while queue:
        url = queue.popleft()
        try:
            html = fetch(url)
        except FetchError:
            continue
        visited.append(url)
        for link in extract_links(html):
            if urlsplit(link).netloc == host and link not in seen:
                seen.add(link)
                queue.append(link)
    return visited
`)

const level1: LabLevel = {
  title: 'Breadth-first on one host',
  spec: `Build a web crawler against a fake web. \`FakeWeb\` (provided at the bottom of your file) maps URLs to HTML-ish pages:

\`web = FakeWeb({"https://a.com/": '<a href="https://a.com/x">x</a>', "https://a.com/x": "the end"})\`
\`web.fetch("https://a.com/")\` → the page's HTML
\`web.fetch("https://a.com/gone")\` → raises \`FetchError\`, with \`.status == 404\`

\`extract_links(html)\` (also provided) returns every link's \`href\`, in document order.

Write \`crawl(start_url, fetch)\`, where \`fetch\` is a function like \`web.fetch\`:

- Visit pages **breadth-first** from \`start_url\`: the start page, then the pages it links to (in link order), then the pages those link to, and so on.
- Stay on the start URL's **host**, \`urlsplit(url).netloc\`. Never fetch another host; a subdomain like \`blog.a.com\` counts as another host.
- Fetch every URL **at most once**, even when many pages link to it or the links form a cycle.
- When \`fetch\` raises \`FetchError\`, skip that page: leave it out of the result and keep crawling.
- Return the URLs fetched successfully, in the order you fetched them.

At this level every link is an absolute URL.

Example: \`/\` links to \`/a\` and \`/b\`, and \`/a\` links to \`/c\` and back to \`/\`.

\`crawl("https://a.com/", web.fetch)\` → \`["https://a.com/", "https://a.com/a", "https://a.com/b", "https://a.com/c"]\``,
  tests: L1_TESTS,
  hints: [
    'A `collections.deque` is the BFS queue: `popleft()` the next URL, `append()` the links you discover.',
    'Mark a URL as seen when you **queue** it, not when you fetch it. Otherwise a page linked from two places waits in the queue twice.',
    "Compare `urlsplit(link).netloc` with the start URL's netloc to stay on one host.",
  ],
  solution: L1_SOLUTION,
}

/* ---------------------------------------------------------------- level 2 */

const L2_TESTS = py`
def _l2_links(*hrefs):
    return " ".join(f'<a href="{h}">link</a>' for h in hrefs)


def _l2_norm(base, href, want):
    got = normalize_url(base, href)
    assert got == want, f"normalize_url({base!r}, {href!r})\n  got:  {got!r}\n  want: {want!r}"


def test_l2_normalize_relative_links():
    _l2_norm("https://a.com/docs/intro", "setup", "https://a.com/docs/setup")
    _l2_norm("https://a.com/docs/intro", "/about", "https://a.com/about")
    _l2_norm("https://a.com/docs/intro", "../about", "https://a.com/about")


def test_l2_normalize_absolute_links():
    _l2_norm("https://a.com/", "https://b.com/x?y=1", "https://b.com/x?y=1")
    _l2_norm("https://a.com/", "//cdn.a.com/lib", "https://cdn.a.com/lib")


def test_l2_normalize_drops_fragment():
    _l2_norm("https://a.com/docs/intro", "#team", "https://a.com/docs/intro")
    _l2_norm("https://a.com/docs/intro", "../about#team", "https://a.com/about")


def test_l2_normalize_rejects_other_schemes():
    for href in ("mailto:hi@a.com", "javascript:void(0)", "tel:+15550100", "ftp://a.com/file"):
        _l2_norm("https://a.com/", href, None)


def test_l2_normalize_lowercases_scheme_and_host():
    _l2_norm("https://a.com/", "HTTPS://A.COM/Docs", "https://a.com/Docs")
    _l2_norm("https://a.com/", "http://Shop.A.com/Cart", "http://shop.a.com/Cart")


def test_l2_normalize_trailing_slashes():
    _l2_norm("https://a.com/x", "https://a.com", "https://a.com/")
    _l2_norm("https://a.com/x", "https://a.com/docs/", "https://a.com/docs")
    _l2_norm("https://a.com/x", "/", "https://a.com/")
    _l2_norm("https://a.com", "", "https://a.com/")


def test_l2_normalize_keeps_query():
    _l2_norm("https://a.com/", "/search?q=Cats&page=2", "https://a.com/search?q=Cats&page=2")


def test_l2_crawl_follows_relative_links():
    pages = {
        "https://a.com/": _l2_links("guide/start"),
        "https://a.com/guide/start": _l2_links("next", "../"),
        "https://a.com/guide/next": "",
    }
    web = FakeWeb(pages)
    got = crawl("https://a.com/", web.fetch)
    want = ["https://a.com/", "https://a.com/guide/start", "https://a.com/guide/next"]
    assert got == want, f"resolve links against the page they're on\n  got:  {got!r}\n  want: {want!r}"


def test_l2_crawl_one_fetch_per_page_however_spelled():
    pages = {
        "https://a.com/": _l2_links("/docs", "/docs/", "HTTPS://A.COM/docs", "/docs#top", "docs", "https://a.com/"),
        "https://a.com/docs": _l2_links("#install", "/", "https://a.com"),
    }
    web = FakeWeb(pages)
    got = crawl("https://a.com/", web.fetch)
    assert got == ["https://a.com/", "https://a.com/docs"], f"got {got!r}"
    assert sorted(web.fetched) == ["https://a.com/", "https://a.com/docs"], (
        f"every spelling of a page should collapse to one normalized URL; fetched {web.fetched}"
    )


def test_l2_crawl_ignores_non_http_links():
    pages = {"https://a.com/": _l2_links("mailto:hi@a.com", "javascript:void(0)", "tel:123", "/ok"), "https://a.com/ok": ""}
    web = FakeWeb(pages)
    got = crawl("https://a.com/", web.fetch)
    assert got == ["https://a.com/", "https://a.com/ok"], f"got {got!r}"
    assert web.fetched == ["https://a.com/", "https://a.com/ok"], f"fetched {web.fetched}"


def test_l2_crawl_normalizes_start_url():
    pages = {"https://a.com/": _l2_links("/x"), "https://a.com/x": ""}
    web = FakeWeb(pages)
    got = crawl("HTTPS://A.com", web.fetch)
    assert got == ["https://a.com/", "https://a.com/x"], f"normalize the start URL too; got {got!r}"


def test_l2_max_pages():
    pages = {"https://a.com/": _l2_links(*[f"/p{i}" for i in range(10)])}
    pages.update({f"https://a.com/p{i}": "" for i in range(10)})
    web = FakeWeb(pages)
    got = crawl("https://a.com/", web.fetch, max_pages=4)
    want = ["https://a.com/", "https://a.com/p0", "https://a.com/p1", "https://a.com/p2"]
    assert got == want, f"\n  got:  {got!r}\n  want: {want!r}"
    assert len(web.fetched) == 4, f"stop fetching once max_pages pages are visited; fetch was called {len(web.fetched)} times"
    web = FakeWeb(pages)
    assert len(crawl("https://a.com/", web.fetch, max_pages=None)) == 11, "max_pages=None means no limit"


def test_l2_max_pages_failures_dont_count():
    pages = {"https://a.com/": _l2_links("/missing1", "/missing2", "/a", "/b"), "https://a.com/a": "", "https://a.com/b": ""}
    web = FakeWeb(pages)
    got = crawl("https://a.com/", web.fetch, max_pages=2)
    assert got == ["https://a.com/", "https://a.com/a"], f"failed fetches don't use up max_pages; got {got!r}"
    assert web.fetched == ["https://a.com/", "https://a.com/missing1", "https://a.com/missing2", "https://a.com/a"], (
        f"fetched {web.fetched}"
    )
`

const L2_SOLUTION = withWeb(py`
from collections import deque
from urllib.parse import urljoin, urlsplit, urlunsplit


def normalize_url(base, href):
    """The canonical absolute URL for href found on page base, or None if not crawlable."""
    parts = urlsplit(urljoin(base, href))
    scheme = parts.scheme.lower()
    if scheme not in ("http", "https"):
        return None
    path = parts.path.rstrip("/") or "/"
    return urlunsplit((scheme, parts.netloc.lower(), path, parts.query, ""))


def crawl(start_url, fetch, max_pages=None):
    """Breadth-first crawl of start_url's host; returns the URLs fetched successfully."""
    start = normalize_url(start_url, start_url)
    host = urlsplit(start).netloc
    seen = {start}  # marked when queued, so nothing is queued twice
    queue = deque([start])
    visited = []
    while queue and (max_pages is None or len(visited) < max_pages):
        url = queue.popleft()
        try:
            html = fetch(url)
        except FetchError:
            continue
        visited.append(url)
        for href in extract_links(html):
            link = normalize_url(url, href)
            if link is not None and urlsplit(link).netloc == host and link not in seen:
                seen.add(link)
                queue.append(link)
    return visited
`)

const level2: LabLevel = {
  title: 'Normalize every URL',
  spec: `Real pages link messily: \`href="../about"\`, \`href="#top"\`, \`href="mailto:hi@a.com"\`, \`HTTPS://A.COM/docs/\`. Without normalization one page has a dozen spellings, and you fetch it a dozen times.

Write \`normalize_url(base, href)\`. It returns the canonical absolute URL for a link \`href\` found on the page \`base\`, or \`None\` if the link isn't crawlable:

- Resolve it against \`base\` with \`urllib.parse.urljoin\`.
- Only \`http\` and \`https\` are crawlable. Return \`None\` for \`mailto:\`, \`javascript:\`, \`tel:\` and the like.
- Lowercase the scheme and the host. Keep the path's case: paths are case-sensitive.
- Drop the \`#fragment\`. Keep the \`?query\`.
- Trailing slashes: an empty path becomes \`/\`, and any other path loses its trailing \`/\`.

Then upgrade \`crawl(start_url, fetch, max_pages=None)\`:

- Normalize the start URL and every link, and fetch only normalized URLs. Resolve each link against the **normalized URL of the page it's on**.
- Stop once \`max_pages\` pages have been visited: don't call \`fetch\` again after that. Failed fetches don't count, and \`None\` means no limit.

Examples:

\`normalize_url("https://a.com/docs/intro", "../about#team")\` → \`"https://a.com/about"\`
\`normalize_url("https://a.com/x", "HTTPS://A.com/Docs/")\` → \`"https://a.com/Docs"\`
\`normalize_url("https://a.com/x", "mailto:hi@a.com")\` → \`None\`
\`normalize_url("https://a.com", "")\` → \`"https://a.com/"\``,
  tests: L2_TESTS,
  hints: [
    "`urlsplit` gives you `scheme`, `netloc`, `path`, `query` and `fragment`. Rebuild the URL with `urlunsplit((scheme, netloc, path, query, ''))`, passing an empty fragment.",
    "`path.rstrip('/') or '/'` covers both trailing-slash rules at once.",
    'Check `max_pages` before each fetch, against how many pages you have visited so far.',
  ],
  solution: L2_SOLUTION,
}

/* ---------------------------------------------------------------- level 3 */

const L3_TESTS = py`
import asyncio as _l3_asyncio


def _l3_wide(n, host="https://a.com"):
    pages = {host + "/": " ".join(f'<a href="/p{i}">p{i}</a>' for i in range(n))}
    for i in range(n):
        pages[f"{host}/p{i}"] = f'<a href="/">home</a> <a href="/p{(i + 1) % n}">next</a>'
    return pages


_L3_LIMIT_S = 3.0  # a correct crawl here takes well under a second, even on a slow phone


async def _l3_crawl(pages, start="https://a.com/", **kwargs):
    web = FakeWeb(pages)
    crawling = crawl_async(start, web.afetch, **kwargs)
    assert hasattr(crawling, "__await__"), f"crawl_async should be an async def, so the tests can await it; it returned {crawling!r}"
    try:
        got = await _l3_asyncio.wait_for(crawling, _L3_LIMIT_S)
    except _l3_asyncio.TimeoutError:
        raise AssertionError(
            f"crawl_async didn't return within {_L3_LIMIT_S:g} s, so it is probably stuck: look for a worker "
            "waiting forever on an empty queue, or a task that never finishes"
        ) from None
    assert isinstance(got, list), f"crawl_async should return a list, got {type(got).__name__}"
    return got, web


async def test_l3_visits_every_page():
    pages = _l3_wide(12)
    got, _ = await _l3_crawl(pages)
    assert got == sorted(pages), f"\n  got:  {got!r}\n  want: {sorted(pages)!r}"


async def test_l3_returns_sorted_list():
    pages = {
        "https://a.com/": '<a href="/zebra">z</a> <a href="/apple">a</a> <a href="/mango">m</a>',
        "https://a.com/zebra": "", "https://a.com/apple": "", "https://a.com/mango": "",
    }
    got, _ = await _l3_crawl(pages)
    want = ["https://a.com/", "https://a.com/apple", "https://a.com/mango", "https://a.com/zebra"]
    assert got == want, f"return the visited URLs sorted\n  got:  {got!r}\n  want: {want!r}"


async def test_l3_fetches_run_concurrently():
    got, web = await _l3_crawl(_l3_wide(12), max_concurrency=4)
    assert web.peak > 1, (
        "only one afetch was ever in flight: start fetches as tasks (asyncio.gather or create_task) "
        "instead of awaiting them one by one"
    )


async def test_l3_respects_max_concurrency():
    for limit in (2, 3, 5):
        got, web = await _l3_crawl(_l3_wide(15), max_concurrency=limit)
        assert web.peak <= limit, f"max_concurrency={limit}, but {web.peak} fetches ran at once"
        assert web.peak == limit, (
            f"max_concurrency={limit} and 15 pages were waiting, but only {web.peak} fetches ever ran at once"
        )
        assert len(got) == 16, f"max_concurrency={limit}: visited {len(got)} of 16 pages"


async def test_l3_default_concurrency_is_four():
    got, web = await _l3_crawl(_l3_wide(20))
    assert web.peak == 4, f"the default max_concurrency is 4; peak was {web.peak}"


async def test_l3_concurrency_of_one():
    got, web = await _l3_crawl(_l3_wide(6), max_concurrency=1)
    assert web.peak == 1, f"max_concurrency=1 means one fetch at a time; peak was {web.peak}"
    assert len(got) == 7, f"visited {len(got)} of 7 pages"


async def test_l3_no_url_fetched_twice():
    shared = " ".join(f'<a href="/d{i}">d</a>' for i in range(6))
    pages = {
        "https://a.com/": '<a href="/b">b</a> <a href="/c">c</a> <a href="/e">e</a>',
        "https://a.com/b": shared, "https://a.com/c": shared, "https://a.com/e": shared,
    }
    pages.update({f"https://a.com/d{i}": '<a href="/">home</a> <a href="/b">b</a>' for i in range(6)})
    got, web = await _l3_crawl(pages)
    dupes = sorted({u for u in web.fetched if web.fetched.count(u) > 1})
    assert not dupes, (
        f"fetched more than once: {dupes}. Claim a URL (add it to seen) in the same step you check it, before any await"
    )
    assert got == sorted(pages), f"got {got!r}"


async def test_l3_long_chain_completes():
    pages = {"https://a.com/": '<a href="/1">1</a>'}
    for i in range(1, 15):
        pages[f"https://a.com/{i}"] = f'<a href="/{i + 1}">next</a>'
    pages["https://a.com/15"] = "the end"
    got, _ = await _l3_crawl(pages, max_concurrency=4)
    assert got == sorted(pages), (
        f"visited {len(got)} of {len(pages)} pages: don't stop just because the queue is empty "
        "while a fetch is still in flight"
    )


async def test_l3_skips_failed_pages():
    pages = {
        "https://a.com/": '<a href="/ok">ok</a> <a href="/missing">x</a> <a href="/also-missing">y</a>',
        "https://a.com/ok": '<a href="/deep">deep</a>',
        "https://a.com/deep": "",
    }
    got, web = await _l3_crawl(pages)
    assert got == ["https://a.com/", "https://a.com/deep", "https://a.com/ok"], f"got {got!r}"


async def test_l3_missing_start_page():
    got, _ = await _l3_crawl({"https://a.com/elsewhere": ""})
    assert got == [], f"got {got!r}"


async def test_l3_same_result_as_crawl():
    pages = {
        "https://a.com/": '<a href="docs/">docs</a> <a href="mailto:x@a.com">mail</a> <a href="https://b.com/">b</a>',
        "https://a.com/docs": '<a href="#top">top</a> <a href="/docs/api">api</a> <a href="/gone">gone</a>',
        "https://a.com/docs/api": '<a href="v2?lang=py">v2</a> <a href="HTTPS://A.COM/">home</a>',
        "https://a.com/docs/v2?lang=py": "",
        "https://b.com/": "",
    }
    got, web = await _l3_crawl(pages)
    want = ["https://a.com/", "https://a.com/docs", "https://a.com/docs/api", "https://a.com/docs/v2?lang=py"]
    assert got == want, f"same normalization rules as level 2\n  got:  {got!r}\n  want: {want!r}"
    sync = sorted(crawl("https://a.com/", FakeWeb(pages).fetch))
    assert got == sync, f"crawl_async and crawl disagree\n  crawl_async: {got!r}\n  crawl:       {sync!r}"


async def test_l3_leaves_no_tasks_running():
    before = _l3_asyncio.all_tasks()
    got, web = await _l3_crawl(_l3_wide(8))
    leftover = [t for t in _l3_asyncio.all_tasks() - before if not t.done()]
    assert not leftover, f"{len(leftover)} task(s) still running after crawl_async returned: cancel or finish your workers"
    assert web.in_flight == 0, "a fetch was still in flight when crawl_async returned"
`

const L3_SOLUTION = withWeb(py`
import asyncio
from collections import deque
from urllib.parse import urljoin, urlsplit, urlunsplit


def normalize_url(base, href):
    """The canonical absolute URL for href found on page base, or None if not crawlable."""
    parts = urlsplit(urljoin(base, href))
    scheme = parts.scheme.lower()
    if scheme not in ("http", "https"):
        return None
    path = parts.path.rstrip("/") or "/"
    return urlunsplit((scheme, parts.netloc.lower(), path, parts.query, ""))


def crawl(start_url, fetch, max_pages=None):
    """Breadth-first crawl of start_url's host; returns the URLs fetched successfully."""
    start = normalize_url(start_url, start_url)
    host = urlsplit(start).netloc
    seen = {start}  # marked when queued, so nothing is queued twice
    queue = deque([start])
    visited = []
    while queue and (max_pages is None or len(visited) < max_pages):
        url = queue.popleft()
        try:
            html = fetch(url)
        except FetchError:
            continue
        visited.append(url)
        for href in extract_links(html):
            link = normalize_url(url, href)
            if link is not None and urlsplit(link).netloc == host and link not in seen:
                seen.add(link)
                queue.append(link)
    return visited


async def crawl_async(start_url, afetch, max_concurrency=4):
    """Concurrent crawl of start_url's host; returns the sorted URLs fetched successfully."""
    start = normalize_url(start_url, start_url)
    host = urlsplit(start).netloc
    seen = {start}
    visited = []
    slots = asyncio.Semaphore(max_concurrency)

    async def visit(url):
        async with slots:  # at most max_concurrency fetches in flight
            try:
                html = await afetch(url)
            except FetchError:
                return
        visited.append(url)
        children = []
        for href in extract_links(html):
            link = normalize_url(url, href)
            if link is not None and urlsplit(link).netloc == host and link not in seen:
                seen.add(link)  # claimed before any await: no other task can take it
                children.append(visit(link))
        await asyncio.gather(*children)  # this page is done when its whole subtree is

    await visit(start)
    return sorted(visited)
`)

const level3: LabLevel = {
  title: 'Crawl concurrently',
  spec: `Fetching is I/O: while one request waits on the network, others could be in flight. Write \`async def crawl_async(start_url, afetch, max_concurrency=4)\`.

\`afetch\` is an async fetch, like \`web.afetch\`: it awaits a simulated network delay, and the fake web records how many calls overlap (\`web.peak\`).

- Same rules as level 2: normalized URLs, one host, every URL fetched at most once, \`FetchError\` pages skipped. No \`max_pages\` this time.
- Run up to \`max_concurrency\` fetches **at the same time**, and never more. When enough URLs are waiting, use every slot: \`max_concurrency\` fetches in flight together. An \`asyncio.Semaphore\` is the usual tool.
- Return the visited URLs as a **sorted** list: with concurrency, completion order means nothing.
- Return only when the crawl is truly done, and leave no tasks running behind you.
- Use \`asyncio\`, not threads: threads can't start in the browser. Don't call \`asyncio.run\` either, because the tests already run inside an event loop.

Watch for the classic bug: a worker sees an empty queue and quits while another fetch is still in flight, about to discover more links.

Example: \`/\` links to 12 pages, and every fetch takes 10 ms.

\`await crawl_async("https://a.com/", web.afetch)\` → all 13 URLs, sorted
\`web.peak\` → \`4\``,
  tests: L3_TESTS,
  hints: [
    'Add a link to `seen` in the same step where you check it, before any `await`. Every `await` lets other tasks run, so check, then await, then add lets two tasks claim the same URL.',
    'Hold the semaphore only around the `afetch` call. A page that keeps its slot while it waits for its child pages can use up every slot and stall a deep crawl.',
    'Two shapes work. Recursive: `async def visit(url)` fetches, then awaits `asyncio.gather` over `visit(link)` for each new link, so the first `visit` returns when the whole crawl is done. Workers: an `asyncio.Queue`, `task_done()` after each URL and `await queue.join()`, then cancel the workers so none are left running.',
  ],
  solution: L3_SOLUTION,
}

/* ---------------------------------------------------------------- level 4 */

const L4_TESTS = py`
import asyncio as _l4_asyncio
import random as _l4_random

_L4_EPS = 1e-6
_L4_LIMIT_S = 3.0  # real seconds: the virtual clock makes every correct crawl here take well under one


def _l4_links(*hrefs):
    return " ".join(f'<a href="{h}">link</a>' for h in hrefs)


def _l4_gaps(times):
    return [b - a for a, b in zip(times, times[1:])]


def _l4_host_times(web, host):
    return [t for t, url in web.log if url.startswith(host + "/")]


async def _l4_crawl(pages, seeds, latency=0.1, failures=None, **kwargs):
    clock = FakeClock()
    web = FakeWeb(pages, latency=latency, failures=failures, clock=clock)
    crawling = crawl_polite(seeds, web.afetch, clock, **kwargs)
    assert hasattr(crawling, "__await__"), f"crawl_polite should be an async def, so the tests can await it; it returned {crawling!r}"
    try:
        got = await _l4_asyncio.wait_for(crawling, _L4_LIMIT_S)
    except _l4_asyncio.TimeoutError:
        raise AssertionError(
            f"crawl_polite didn't return within {_L4_LIMIT_S:g} s of real time, so it is probably stuck: look for "
            "an await that never finishes, or a wait that uses asyncio.sleep instead of clock.sleep"
        ) from None
    assert isinstance(got, tuple) and len(got) == 2, f"crawl_polite should return (visited, errors), got {got!r}"
    return got[0], got[1], web, clock


async def test_l4_single_host_crawl():
    pages = {
        "https://a.com/": _l4_links("docs/", "#top", "mailto:x@a.com", "/missing", "https://elsewhere.com/"),
        "https://a.com/docs": _l4_links("/", "api"),
        "https://a.com/api": "",
    }
    visited, errors, web, _ = await _l4_crawl(pages, ["https://a.com/"])
    assert visited == ["https://a.com/", "https://a.com/api", "https://a.com/docs"], f"visited: {visited!r}"
    assert errors == {"https://a.com/missing": 404}, f"errors: {errors!r}"


async def test_l4_same_host_requests_spaced():
    pages = {"https://a.com/": _l4_links(*[f"/p{i}" for i in range(8)])}
    pages.update({f"https://a.com/p{i}": _l4_links("/") for i in range(8)})
    visited, errors, web, _ = await _l4_crawl(pages, ["https://a.com/"], latency=0.2, min_interval=1.0)
    assert len(visited) == 9, f"visited {len(visited)} of 9 pages"
    gaps = _l4_gaps(_l4_host_times(web, "https://a.com"))
    assert gaps and min(gaps) >= 1.0 - _L4_EPS, (
        f"requests to one host must start >= 1.0 s apart; gaps were {[round(g, 3) for g in gaps]}. "
        "Wait with clock.sleep: asyncio.sleep doesn't move the clock"
    )


async def test_l4_hosts_crawled_in_parallel():
    pages = {
        "https://a.com/": _l4_links("/a1", "/a2"), "https://a.com/a1": "", "https://a.com/a2": "",
        "https://b.com/": _l4_links("/b1", "/b2"), "https://b.com/b1": "", "https://b.com/b2": "",
    }
    visited, errors, web, _ = await _l4_crawl(pages, ["https://a.com/", "https://b.com/"], min_interval=1.0)
    assert visited == sorted(pages), f"visited: {visited!r}"
    first = sorted(t for t, url in web.log if url.endswith(".com/"))
    assert first == [0.0, 0.0], f"the two hosts' first requests should both start at 0.0, got {first}"
    for host in ("https://a.com", "https://b.com"):
        times = _l4_host_times(web, host)
        late = [t for t, earliest in zip(times, (0.0, 1.0, 2.0)) if t > earliest + 0.05]
        assert len(times) == 3 and not late, (
            f"{host}'s requests started at {[round(t, 3) for t in times]}, but with min_interval=1.0 they can start "
            "at 0.0, 1.0 and 2.0. Rate-limit per host: one host's schedule must never hold up another's, "
            "and a request shouldn't wait longer than its own host's spacing"
        )


async def test_l4_only_seed_hosts():
    pages = {
        "https://a.com/": _l4_links("https://c.com/", "https://b.com/x"),
        "https://b.com/": _l4_links("https://c.com/"), "https://b.com/x": "",
        "https://c.com/": "",
    }
    visited, errors, web, _ = await _l4_crawl(pages, ["https://a.com/", "HTTPS://B.com"])
    assert visited == ["https://a.com/", "https://b.com/", "https://b.com/x"], (
        f"visited: {visited!r}. Normalize the seeds too: HTTPS://B.com is https://b.com/"
    )
    assert "https://c.com/" not in web.fetched, "c.com is not a seed host, so it must never be fetched"


async def test_l4_retries_then_succeeds():
    pages = {"https://a.com/": _l4_links("/flaky"), "https://a.com/flaky": "finally"}
    visited, errors, web, _ = await _l4_crawl(pages, ["https://a.com/"], failures={"https://a.com/flaky": [503, 502]})
    assert visited == ["https://a.com/", "https://a.com/flaky"], f"two 5xx failures, then success: visited {visited!r}"
    assert errors == {}, f"errors: {errors!r}"
    assert web.fetched.count("https://a.com/flaky") == 3, f"expected 3 attempts, saw {web.fetched.count('https://a.com/flaky')}"


async def test_l4_backoff_doubles():
    pages = {"https://a.com/": "ok"}
    visited, errors, web, _ = await _l4_crawl(
        pages, ["https://a.com/"], latency=0.0, failures={"https://a.com/": [503, 503, 503]}, min_interval=0.1, retries=3,
    )
    gaps = _l4_gaps([t for t, _ in web.log])
    assert len(gaps) == 3, f"expected 4 attempts, log was {web.log}"
    want = [0.5, 1.0, 2.0]
    assert all(abs(g - w) < 0.05 for g, w in zip(gaps, want)), (
        f"wait backoff * 2 ** k before retry k + 1 (0.5 s, 1 s, 2 s); gaps were {[round(g, 3) for g in gaps]}"
    )
    assert visited == ["https://a.com/"] and errors == {}, f"visited {visited!r}, errors {errors!r}"


async def test_l4_gives_up_after_retries():
    pages = {"https://a.com/": _l4_links("/down"), "https://a.com/down": "never served"}
    visited, errors, web, _ = await _l4_crawl(pages, ["https://a.com/"], failures={"https://a.com/down": [500, 502, 503]})
    assert errors == {"https://a.com/down": 503}, f"errors should hold the last status (500, 502, then 503): {errors!r}"
    assert visited == ["https://a.com/"], f"visited: {visited!r}"
    assert web.fetched.count("https://a.com/down") == 3, (
        f"retries=2 means 3 attempts in total, saw {web.fetched.count('https://a.com/down')}"
    )


async def test_l4_404_is_not_retried():
    pages = {"https://a.com/": _l4_links("/nope")}
    visited, errors, web, _ = await _l4_crawl(pages, ["https://a.com/"])
    assert errors == {"https://a.com/nope": 404}, f"errors: {errors!r}"
    assert web.fetched.count("https://a.com/nope") == 1, "a 404 is final: retrying it can't help"


async def test_l4_retries_parameter():
    pages = {"https://a.com/": "ok"}
    _, errors, web, _ = await _l4_crawl(pages, ["https://a.com/"], failures={"https://a.com/": [500]}, retries=0)
    assert len(web.fetched) == 1 and errors == {"https://a.com/": 500}, f"retries=0: fetched {web.fetched}, errors {errors}"
    visited, errors, web, _ = await _l4_crawl(pages, ["https://a.com/"], failures={"https://a.com/": [503] * 4}, retries=4)
    assert visited == ["https://a.com/"] and len(web.fetched) == 5, f"retries=4: fetched {len(web.fetched)} times, visited {visited}"


async def test_l4_retries_stay_polite():
    pages = {"https://a.com/": "ok"}
    _, _, web, _ = await _l4_crawl(
        pages, ["https://a.com/"], latency=0.0, failures={"https://a.com/": [503]}, min_interval=2.0, backoff=0.5,
    )
    gaps = _l4_gaps([t for t, _ in web.log])
    assert gaps and gaps[0] >= 2.0 - _L4_EPS, f"a retry is a request too: it must wait for min_interval=2.0; gap was {gaps}"


async def test_l4_failed_seed_does_not_stop_the_rest():
    pages = {"https://b.com/": _l4_links("/x"), "https://b.com/x": ""}
    visited, errors, _, _ = await _l4_crawl(pages, ["https://a.com/", "https://b.com/"])
    assert visited == ["https://b.com/", "https://b.com/x"], f"visited: {visited!r}"
    assert errors == {"https://a.com/": 404}, f"errors: {errors!r}"


async def test_l4_concurrency_still_bounded():
    pages = {}
    for h in range(6):
        host = f"https://h{h}.com"
        pages[host + "/"] = _l4_links("/x", "/y")
        pages[host + "/x"] = ""
        pages[host + "/y"] = ""
    seeds = [f"https://h{h}.com/" for h in range(6)]
    visited, errors, web, _ = await _l4_crawl(pages, seeds, latency=0.5, max_concurrency=3)
    assert len(visited) == 18, f"visited {len(visited)} of 18 pages"
    assert 1 < web.peak <= 3, f"max_concurrency=3 across 6 hosts: peak was {web.peak}"


async def test_l4_random_sites():
    rng = _l4_random.Random(5)
    for trial in range(6):
        hosts = [f"https://s{i}.com" for i in range(rng.randrange(1, 4))]
        urls = [f"{h}/p{j}" for h in hosts for j in range(rng.randrange(2, 7))]
        pages = {h + "/": "" for h in hosts}
        for url in list(pages) + urls:
            pages[url] = _l4_links(*rng.sample(urls, min(3, len(urls))), "https://other.com/")
        failures = {}
        for url in rng.sample(urls, 2):
            failures[url] = [503] * rng.randrange(1, 4)
        reachable, frontier = set(), [h + "/" for h in hosts]
        while frontier:
            url = frontier.pop()
            if url in reachable:
                continue
            reachable.add(url)
            if len(failures.get(url, [])) <= 2:
                frontier.extend(u for u in urls if f'"{u}"' in pages[url])
        want = sorted(u for u in reachable if len(failures.get(u, [])) <= 2)
        want_errors = {u: 503 for u in reachable if len(failures.get(u, [])) > 2}
        visited, errors, web, _ = await _l4_crawl(
            pages, [h + "/" for h in hosts], latency=0.3, failures=failures, min_interval=0.7, max_concurrency=3,
        )
        assert visited == want, f"trial {trial}\n  got:  {visited!r}\n  want: {want!r}"
        assert errors == want_errors, f"trial {trial}: errors {errors!r}, want {want_errors!r}"
        for url in set(web.fetched):
            limit = 1 + min(len(failures.get(url, [])), 2)
            assert web.fetched.count(url) == limit, f"trial {trial}: {url} fetched {web.fetched.count(url)} times, want {limit}"
        for host in hosts:
            gaps = _l4_gaps(_l4_host_times(web, host))
            assert not gaps or min(gaps) >= 0.7 - _L4_EPS, f"trial {trial}: {host} gaps {[round(g, 3) for g in gaps]}"
        assert web.peak <= 3, f"trial {trial}: peak concurrency {web.peak}"
`

const L4_SOLUTION = withWeb(py`
import asyncio
from collections import deque
from urllib.parse import urljoin, urlsplit, urlunsplit


def normalize_url(base, href):
    """The canonical absolute URL for href found on page base, or None if not crawlable."""
    parts = urlsplit(urljoin(base, href))
    scheme = parts.scheme.lower()
    if scheme not in ("http", "https"):
        return None
    path = parts.path.rstrip("/") or "/"
    return urlunsplit((scheme, parts.netloc.lower(), path, parts.query, ""))


def crawl(start_url, fetch, max_pages=None):
    """Breadth-first crawl of start_url's host; returns the URLs fetched successfully."""
    start = normalize_url(start_url, start_url)
    host = urlsplit(start).netloc
    seen = {start}  # marked when queued, so nothing is queued twice
    queue = deque([start])
    visited = []
    while queue and (max_pages is None or len(visited) < max_pages):
        url = queue.popleft()
        try:
            html = fetch(url)
        except FetchError:
            continue
        visited.append(url)
        for href in extract_links(html):
            link = normalize_url(url, href)
            if link is not None and urlsplit(link).netloc == host and link not in seen:
                seen.add(link)
                queue.append(link)
    return visited


async def crawl_async(start_url, afetch, max_concurrency=4):
    """Concurrent crawl of start_url's host; returns the sorted URLs fetched successfully."""
    start = normalize_url(start_url, start_url)
    host = urlsplit(start).netloc
    seen = {start}
    visited = []
    slots = asyncio.Semaphore(max_concurrency)

    async def visit(url):
        async with slots:  # at most max_concurrency fetches in flight
            try:
                html = await afetch(url)
            except FetchError:
                return
        visited.append(url)
        children = []
        for href in extract_links(html):
            link = normalize_url(url, href)
            if link is not None and urlsplit(link).netloc == host and link not in seen:
                seen.add(link)  # claimed before any await: no other task can take it
                children.append(visit(link))
        await asyncio.gather(*children)  # this page is done when its whole subtree is

    await visit(start)
    return sorted(visited)


async def crawl_polite(seeds, afetch, clock, max_concurrency=4, min_interval=1.0, retries=2, backoff=0.5):
    """Concurrent crawl of the seeds' hosts with per-host spacing and retries.

    Returns (sorted visited URLs, {url: last status} for URLs that finally failed).
    """
    starts = list(dict.fromkeys(normalize_url(s, s) for s in seeds))
    hosts = {urlsplit(url).netloc for url in starts}
    seen = set(starts)
    visited, errors = [], {}
    next_start = {}  # host -> earliest time its next request may start
    slots = asyncio.Semaphore(max_concurrency)

    async def polite_fetch(url):
        host = urlsplit(url).netloc
        now = clock.now()
        start = max(now, next_start.get(host, now))
        next_start[host] = start + min_interval  # reserve the slot before awaiting
        if start > now:
            await clock.sleep(start - now)
        return await afetch(url)

    async def fetch_with_retries(url):
        for attempt in range(retries + 1):
            try:
                return await polite_fetch(url)
            except FetchError as e:
                if e.status < 500 or attempt == retries:
                    raise  # 4xx is final, and so is the last attempt
            await clock.sleep(backoff * 2 ** attempt)

    async def visit(url):
        async with slots:  # take a concurrency slot first, then wait for the host
            try:
                html = await fetch_with_retries(url)
            except FetchError as e:
                errors[url] = e.status
                return
        visited.append(url)
        children = []
        for href in extract_links(html):
            link = normalize_url(url, href)
            if link is not None and urlsplit(link).netloc in hosts and link not in seen:
                seen.add(link)
                children.append(visit(link))
        await asyncio.gather(*children)

    await asyncio.gather(*(visit(url) for url in starts))
    return sorted(visited), errors
`)

const level4: LabLevel = {
  title: 'Polite and robust',
  spec: `A real crawler has to be a good citizen and survive flaky servers. Write \`async def crawl_polite(seeds, afetch, clock, max_concurrency=4, min_interval=1.0, retries=2, backoff=0.5)\`, returning \`(visited, errors)\`.

- \`seeds\` is a list of start URLs, possibly on different hosts. Crawl every host that appears in \`seeds\` and ignore links to any other host.
- **Politeness**: two requests to the **same host** must start at least \`min_interval\` seconds apart. Different hosts don't wait for each other, and no request waits longer than its own host's spacing (and any backoff) requires, apart from waiting for a free concurrency slot.
- **Retries**: a \`FetchError\` with \`status >= 500\` is temporary. Retry it up to \`retries\` more times, waiting \`backoff * 2 ** k\` seconds before retry \`k + 1\`: 0.5 s, then 1 s. A retry is a request too, so politeness still applies. Any other status, like 404, is final: never retry it.
- Keep the level 3 rules: normalized URLs, at most \`max_concurrency\` fetches in flight, and no URL fetched twice except for retries.
- \`visited\` is the sorted list of URLs fetched successfully. \`errors\` maps each URL that finally failed to its last status.

Time comes from \`clock\`, a \`FakeClock\` (provided). \`clock.now()\` is the virtual time in seconds, and \`await clock.sleep(s)\` waits \`s\` virtual seconds, taking no real time. Do all your waiting with it: \`asyncio.sleep\` would wait in real time while the clock stands still.

Example with \`min_interval=1.0\`, fetches taking 0.1 s, and \`/x\` failing once with a 503:

\`/\` starts at 0.0. \`/x\` starts at 1.0 and fails at 1.1. Its retry starts at 2.0: the backoff allows 1.6, but the host's next slot is 2.0.

\`visited\` → \`["https://a.com/", "https://a.com/x"]\`
\`errors\` → \`{}\``,
  tests: L4_TESTS,
  hints: [
    "Politeness is a schedule, not a fixed sleep. Keep, per host, the earliest time its next request may start, and claim that slot (move the host's time forward) **before** you await anything, so two tasks can't take the same slot.",
    'Retries are a loop around the polite fetch: catch `FetchError`, re-raise it for a status below 500 or on the last attempt, otherwise sleep the backoff on the clock and go round again. Each attempt claims its own host slot, so politeness covers retries for free.',
    'Order matters: take the semaphore, then claim the host slot, then sleep until it, then fetch. The slot is `start = max(now, next_start.get(host, now))`, then `next_start[host] = start + min_interval`. If you claim first and then queue for the semaphore, the request can start later than its slot, too close to the next one.',
  ],
  solution: L4_SOLUTION,
}

/* -------------------------------------------------------------------- lab */

const lab: Lab = {
  id: 'web-crawler',
  title: 'Web crawler',
  area: 'builds',
  summary:
    'Crawl a fake web **breadth-first**, normalize messy URLs, go **concurrent** with asyncio under a hard limit, then make it polite per host and resilient to flaky servers, all against a virtual clock.',
  minutes: 75,
  starter: STARTER,
  levels: [level1, level2, level3, level4],
  followUps: [
    'Your `seen` set lives in one process. How would you crawl a billion URLs on 50 machines? Who owns which URLs (hint: hash the host), and how do machines hand each other the links they find?',
    'Fetching is I/O-bound, so asyncio scales to thousands of open connections on one thread. When would you add processes anyway? Parsing HTML is CPU work: how would you split fetching from parsing?',
    "How would you honor `robots.txt` and its `Crawl-delay`, and where does that fit into your per-host scheduler? What should happen when one host is slow and hogs your concurrency slots?",
    'Your tests proved the peak concurrency with a fake fetch. What could still go wrong on the real network that they cannot catch (timeouts, redirects, huge pages, servers that drip one byte a second), and how would you test for each?',
  ],
}

export default lab
