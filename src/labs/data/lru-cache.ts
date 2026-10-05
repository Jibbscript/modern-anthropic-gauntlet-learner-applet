import type { Lab, LabLevel } from '../../core/types'

/** Python source: raw template (backslashes kept as typed), leading newline dropped. */
const py = (s: TemplateStringsArray) => s.raw[0].replace(/^\n/, '')

/* ---------------------------------------------------------------- starter */

const STARTER = py`
class LRUCache:
    """A fixed-capacity cache that evicts the least recently used entry."""

    def __init__(self, capacity: int) -> None:
        """Create an empty cache holding at most capacity entries (capacity >= 1)."""
        raise NotImplementedError

    def get(self, key):
        """Return the value for key and mark it most recently used, or None on a miss."""
        raise NotImplementedError

    def put(self, key, value) -> None:
        """Insert or update key, marking it most recently used.

        If a new key makes the cache exceed its capacity, evict the least
        recently used entry.
        """
        raise NotImplementedError

    def __len__(self) -> int:
        """Number of entries currently cached."""
        raise NotImplementedError
`

/* ---------------------------------------------------------------- level 1 */

const L1_TESTS = py`
import random as _l1_random


def test_l1_get_missing():
    cache = LRUCache(2)
    got = cache.get("a")
    assert got is None, f"get() of a missing key should return None, got {got!r}"


def test_l1_put_then_get():
    cache = LRUCache(2)
    cache.put("a", 1)
    got = cache.get("a")
    assert got == 1, f"get('a') returned {got!r}, expected 1"


def test_l1_put_overwrites():
    cache = LRUCache(2)
    cache.put("a", 1)
    cache.put("a", 10)
    got = cache.get("a")
    assert got == 10, f"put() of an existing key should update its value; get() returned {got!r}"
    assert len(cache) == 1, f"updating a key must not add an entry; len() is {len(cache)}"


def test_l1_evicts_least_recently_used():
    cache = LRUCache(2)
    cache.put("a", 1)
    cache.put("b", 2)
    cache.put("c", 3)
    assert cache.get("a") is None, "'a' was least recently used and should have been evicted"
    assert cache.get("b") == 2, "'b' should still be cached"
    assert cache.get("c") == 3, "'c' should still be cached"


def test_l1_get_refreshes_recency():
    cache = LRUCache(2)
    cache.put("a", 1)
    cache.put("b", 2)
    cache.get("a")
    cache.put("c", 3)
    assert cache.get("b") is None, "get('a') made 'b' the least recently used, so 'b' should be evicted"
    assert cache.get("a") == 1, "'a' was used recently and should survive"


def test_l1_put_existing_refreshes_recency():
    cache = LRUCache(2)
    cache.put("a", 1)
    cache.put("b", 2)
    cache.put("a", 11)
    cache.put("c", 3)
    assert cache.get("b") is None, "updating 'a' made 'b' the least recently used, so 'b' should be evicted"
    assert cache.get("a") == 11, "'a' should survive with its new value"


def test_l1_update_when_full_does_not_evict():
    cache = LRUCache(2)
    cache.put("a", 1)
    cache.put("b", 2)
    cache.put("b", 22)
    assert len(cache) == 2, f"len() should stay 2, got {len(cache)}"
    assert cache.get("a") == 1, "updating an existing key in a full cache must not evict anything"


def test_l1_miss_does_not_change_order():
    cache = LRUCache(2)
    cache.put("a", 1)
    cache.put("b", 2)
    cache.get("zzz")
    cache.put("c", 3)
    assert cache.get("a") is None, "a miss must not affect recency: 'a' is still the oldest and gets evicted"


def test_l1_capacity_one():
    cache = LRUCache(1)
    cache.put("a", 1)
    cache.put("b", 2)
    assert cache.get("a") is None, "capacity 1 keeps only the newest entry"
    assert cache.get("b") == 2, "capacity 1 keeps only the newest entry"
    assert len(cache) == 1, f"len() should be 1, got {len(cache)}"


def test_l1_len_tracks_size():
    cache = LRUCache(3)
    sizes = []
    for i in range(5):
        cache.put(i, i)
        sizes.append(len(cache))
    assert sizes == [1, 2, 3, 3, 3], f"len() after each put was {sizes}, expected [1, 2, 3, 3, 3]"


def test_l1_invalid_capacity():
    for bad in (0, -1):
        try:
            LRUCache(bad)
        except ValueError:
            continue
        raise AssertionError(f"LRUCache({bad}) should raise ValueError")


def test_l1_falsy_values_are_hits():
    cache = LRUCache(3)
    cache.put("zero", 0)
    cache.put("empty", "")
    cache.put("false", False)
    got = cache.get("zero")
    assert got == 0 and got is not None, f"0 is a cached value, not a miss; got {got!r}"
    assert cache.get("empty") == "", "'' is a cached value, not a miss"
    assert cache.get("false") is False, "False is a cached value, not a miss"


def test_l1_instances_are_independent():
    a = LRUCache(2)
    b = LRUCache(2)
    a.put("k", 1)
    got = b.get("k")
    assert got is None, f"two caches must not share storage (a class-level dict?); got {got!r}"


def test_l1_matches_reference_model():
    rng = _l1_random.Random(1234)
    cache = LRUCache(4)
    model = []  # [key, value] pairs, least recently used first
    for step in range(2000):
        key = rng.randrange(8)
        if rng.random() < 0.5:
            value = rng.randrange(100)
            cache.put(key, value)
            idx = next((i for i, kv in enumerate(model) if kv[0] == key), None)
            if idx is not None:
                del model[idx]
            elif len(model) == 4:
                model.pop(0)
            model.append([key, value])
        else:
            got = cache.get(key)
            idx = next((i for i, kv in enumerate(model) if kv[0] == key), None)
            want = None if idx is None else model[idx][1]
            if idx is not None:
                model.append(model.pop(idx))
            assert got == want, f"step {step}: get({key}) returned {got!r}, expected {want!r}"
        assert len(cache) == len(model), f"step {step}: len() is {len(cache)}, expected {len(model)}"
`

const L1_SOLUTION = py`
from collections import OrderedDict


class LRUCache:
    def __init__(self, capacity: int) -> None:
        if capacity < 1:
            raise ValueError("capacity must be at least 1")
        self.capacity = capacity
        self._data: OrderedDict = OrderedDict()  # least recently used first

    def get(self, key):
        if key not in self._data:
            return None
        self._data.move_to_end(key)
        return self._data[key]

    def put(self, key, value) -> None:
        if key in self._data:
            self._data.move_to_end(key)
        elif len(self._data) >= self.capacity:
            self._data.popitem(last=False)  # evict the least recently used
        self._data[key] = value

    def __len__(self) -> int:
        return len(self._data)
`

const level1: LabLevel = {
  title: 'LRU in O(1)',
  spec: `Build \`LRUCache(capacity)\`, a cache that holds at most \`capacity\` entries and, when full, throws out the **least recently used** one.

- \`get(key)\` returns the value, or \`None\` on a miss. A hit makes \`key\` the most recently used entry.
- \`put(key, value)\` inserts or updates \`key\` and makes it the most recently used. If a *new* key would push the size past \`capacity\`, evict the least recently used entry. Updating an existing key never evicts.
- \`len(cache)\` is the number of cached entries.
- \`capacity\` must be at least 1: raise \`ValueError\` otherwise.

Both \`get\` and \`put\` should be **O(1)**. Keys are hashable. Values are never \`None\`, but may be falsy, like \`0\` or \`""\`. Every \`LRUCache\` has its own storage: two caches never share entries.

Example with \`cache = LRUCache(2)\`:

\`cache.put("a", 1)\`
\`cache.put("b", 2)\`
\`cache.get("a")\` → \`1\`   now b is the least recently used
\`cache.put("c", 3)\`   evicts b
\`cache.get("b")\` → \`None\`
\`len(cache)\` → \`2\``,
  tests: L1_TESTS,
  hints: [
    'You need two things in O(1): look up a key, and find or move the oldest entry. A dict gives the first; something ordered gives the second.',
    '`collections.OrderedDict` remembers insertion order and has `move_to_end(key)` and `popitem(last=False)`, both O(1). Keep the least recently used entry at the front.',
    'Interviewers often ask for it without `OrderedDict`: a dict from key to node, plus a doubly linked list with sentinel head and tail nodes. Each operation is a handful of pointer swaps.',
  ],
  solution: L1_SOLUTION,
}

/* ---------------------------------------------------------------- level 2 */

const L2_TESTS = py`
import random as _l2_random


class _L2Clock:
    """A fake clock: call it to read the time, assign .t to move time."""

    def __init__(self, t=0.0):
        self.t = t

    def __call__(self):
        return self.t


def test_l2_default_clock():
    cache = LRUCache(2)
    cache.put("a", 1, ttl=60)
    cache.put("b", 2)
    assert cache.get("a") == 1, "with the real clock, a 60-second TTL is alive right away"
    assert cache.get("b") == 2, "entries without a ttl still work"


def test_l2_alive_before_ttl():
    clock = _L2Clock()
    cache = LRUCache(2, clock=clock)
    cache.put("a", 1, ttl=10)
    clock.t = 9.5
    got = cache.get("a")
    assert got == 1, f"an entry is alive before put_time + ttl; got {got!r} at t=9.5"


def test_l2_expires_exactly_at_ttl():
    clock = _L2Clock(100.0)
    cache = LRUCache(2, clock=clock)
    cache.put("a", 1, ttl=10)
    clock.t = 110.0
    got = cache.get("a")
    assert got is None, f"at exactly put_time + ttl (110) the entry is expired; got {got!r}"


def test_l2_no_ttl_never_expires():
    clock = _L2Clock()
    cache = LRUCache(2, clock=clock)
    cache.put("a", 1)
    clock.t = 10**9
    assert cache.get("a") == 1, "entries without a ttl never expire"


def test_l2_len_skips_expired():
    clock = _L2Clock()
    cache = LRUCache(3, clock=clock)
    cache.put("a", 1, ttl=5)
    cache.put("b", 2, ttl=50)
    cache.put("c", 3)
    assert len(cache) == 3, f"three live entries; len() is {len(cache)}"
    clock.t = 5
    assert len(cache) == 2, f"'a' expired at t=5, so len() should be 2, got {len(cache)}"
    clock.t = 50
    assert len(cache) == 1, f"'b' expired at t=50, so len() should be 1, got {len(cache)}"


def test_l2_expired_entries_free_capacity():
    clock = _L2Clock()
    cache = LRUCache(2, clock=clock)
    cache.put("b", 2)
    cache.put("a", 1, ttl=10)
    clock.t = 10
    cache.put("c", 3)
    assert cache.get("b") == 2, "expired 'a' should make room, so live 'b' must not be evicted"
    assert cache.get("c") == 3, "'c' should be cached"
    assert cache.get("a") is None, "'a' has expired"
    assert len(cache) == 2, f"len() should be 2, got {len(cache)}"


def test_l2_put_without_ttl_clears_expiry():
    clock = _L2Clock()
    cache = LRUCache(2, clock=clock)
    cache.put("a", 1, ttl=5)
    clock.t = 3
    cache.put("a", 2)
    clock.t = 1000
    got = cache.get("a")
    assert got == 2, f"put() without ttl replaces the old expiry, so the entry is permanent; got {got!r}"


def test_l2_put_restarts_ttl():
    clock = _L2Clock()
    cache = LRUCache(2, clock=clock)
    cache.put("a", 1, ttl=5)  # dies at 5
    clock.t = 4
    cache.put("a", 2, ttl=5)  # dies at 9
    clock.t = 8.5
    got = cache.get("a")
    assert got == 2, f"the new ttl counts from the second put (alive until 9); got {got!r} at t=8.5"
    clock.t = 9
    got = cache.get("a")
    assert got is None, f"the second ttl ends at 4 + 5 = 9; got {got!r}"


def test_l2_get_does_not_extend_ttl():
    clock = _L2Clock()
    cache = LRUCache(2, clock=clock)
    cache.put("a", 1, ttl=5)
    clock.t = 4
    assert cache.get("a") == 1, "alive at t=4"
    clock.t = 5
    got = cache.get("a")
    assert got is None, f"a get() must not refresh the ttl; got {got!r} at t=5"


def test_l2_invalid_ttl():
    cache = LRUCache(2, clock=_L2Clock())
    for bad in (0, -1):
        try:
            cache.put("a", 1, ttl=bad)
        except ValueError:
            continue
        raise AssertionError(f"put(..., ttl={bad}) should raise ValueError")


def test_l2_expired_key_can_be_put_again():
    clock = _L2Clock()
    cache = LRUCache(2, clock=clock)
    cache.put("a", 1, ttl=1)
    clock.t = 2
    assert cache.get("a") is None, "expired at t=1"
    cache.put("a", 2, ttl=1)
    got = cache.get("a")
    assert got == 2, f"an expired key can be cached again; got {got!r}"


def test_l2_lru_still_applies_to_live_entries():
    clock = _L2Clock()
    cache = LRUCache(2, clock=clock)
    cache.put("a", 1, ttl=100)
    cache.put("b", 2, ttl=100)
    cache.get("a")
    cache.put("c", 3, ttl=100)
    assert cache.get("b") is None, "with nothing expired, the least recently used ('b') is evicted"
    assert cache.get("a") == 1, "'a' was used recently and should survive"


def test_l2_matches_reference_model():
    rng = _l2_random.Random(99)
    clock = _L2Clock()
    cache = LRUCache(3, clock=clock)
    model = []  # [key, value, expires_at or None], least recently used first
    for step in range(3000):
        clock.t += rng.choice([0, 0, 0.5, 1, 3])
        now = clock.t
        model = [e for e in model if e[2] is None or now < e[2]]
        key = rng.randrange(6)
        op = rng.random()
        if op < 0.45:
            value = rng.randrange(100)
            ttl = rng.choice([None, 1, 2, 5])
            cache.put(key, value, ttl=ttl)
            idx = next((i for i, e in enumerate(model) if e[0] == key), None)
            if idx is not None:
                del model[idx]
            elif len(model) == 3:
                model.pop(0)
            model.append([key, value, None if ttl is None else now + ttl])
        elif op < 0.9:
            got = cache.get(key)
            idx = next((i for i, e in enumerate(model) if e[0] == key), None)
            want = None if idx is None else model[idx][1]
            if idx is not None:
                model.append(model.pop(idx))
            assert got == want, f"step {step} (t={now}): get({key}) returned {got!r}, expected {want!r}"
        else:
            assert len(cache) == len(model), f"step {step} (t={now}): len() is {len(cache)}, expected {len(model)}"
`

const L2_SOLUTION = py`
import heapq
import itertools
import time
from collections import OrderedDict


class LRUCache:
    def __init__(self, capacity: int, clock=time.monotonic) -> None:
        if capacity < 1:
            raise ValueError("capacity must be at least 1")
        self.capacity = capacity
        self._clock = clock
        # key -> (value, expires_at or None), least recently used first
        self._data: OrderedDict = OrderedDict()
        # min-heap of (expires_at, tiebreak, key). It can hold stale items for
        # keys that were overwritten or evicted; those are skipped when popped.
        self._expiry: list = []
        self._tiebreak = itertools.count()

    def _purge_expired(self, now: float) -> None:
        """Drop every expired entry: O(log n) per entry dropped."""
        while self._expiry and self._expiry[0][0] <= now:
            expires_at, _, key = heapq.heappop(self._expiry)
            entry = self._data.get(key)
            if entry is not None and entry[1] == expires_at:
                del self._data[key]

    def get(self, key):
        self._purge_expired(self._clock())
        if key not in self._data:
            return None
        self._data.move_to_end(key)
        return self._data[key][0]

    def put(self, key, value, ttl: float | None = None) -> None:
        if ttl is not None and ttl <= 0:
            raise ValueError("ttl must be positive")
        now = self._clock()
        self._purge_expired(now)
        expires_at = None if ttl is None else now + ttl
        if expires_at is not None:
            heapq.heappush(self._expiry, (expires_at, next(self._tiebreak), key))
        if key in self._data:
            self._data.move_to_end(key)
        elif len(self._data) >= self.capacity:
            self._data.popitem(last=False)
        self._data[key] = (value, expires_at)

    def __len__(self) -> int:
        self._purge_expired(self._clock())
        return len(self._data)
`

const level2: LabLevel = {
  title: 'Expiry with a fake clock',
  spec: `Add **expiry**. Entries can carry a time-to-live, and the cache reads time from a clock that tests can replace.

- \`LRUCache(capacity, clock=time.monotonic)\`: \`clock\` is a zero-argument function returning the current time in seconds. Call it whenever you need "now". Never store its result for later.
- \`put(key, value, ttl=None)\`: with a \`ttl\` (seconds; must be > 0, else \`ValueError\`), the entry is alive while \`now < put_time + ttl\` and expired from \`put_time + ttl\` on. \`ttl=None\` means it never expires. Every \`put\` replaces the old value **and** the old expiry.
- An expired entry behaves exactly like a missing one: \`get\` returns \`None\`, \`len\` doesn't count it, and it **doesn't take up capacity**. When a new key arrives at a full cache, drop expired entries before evicting a live one.
- \`get\` never extends a TTL. For live entries, level 1 behaviour (LRU order, eviction) is unchanged.

Example with a fake clock:

\`now = [0]\`
\`cache = LRUCache(2, clock=lambda: now[0])\`
\`cache.put("b", 2)\`
\`cache.put("a", 1, ttl=10)\`   a is the most recently used
\`now[0] = 10\`   a has just expired
\`cache.put("c", 3)\`   a takes no room, so b is not evicted
\`cache.get("b")\` → \`2\`
\`cache.get("a")\` → \`None\`
\`len(cache)\` → \`2\``,
  tests: L2_TESTS,
  hints: [
    'Store `(value, expires_at)` per key, with `expires_at = now + ttl` or `None`. "Expired" is `expires_at is not None and now >= expires_at`.',
    'The simplest correct approach: at the start of every `get`, `put` and `__len__`, drop all expired entries. A linear scan works; then make it fast.',
    'To make the purge cheap, keep a min-heap of `(expires_at, counter, key)`. Pop while the top has expired, and skip heap items whose key was overwritten since (its stored `expires_at` no longer matches). The counter stops Python from ever comparing two keys.',
  ],
  solution: L2_SOLUTION,
}

/* ---------------------------------------------------------------- level 3 */

const L3_TESTS = py`
class _L3Clock:
    def __init__(self):
        self.t = 0.0

    def __call__(self):
        return self.t


def test_l3_stats_start_at_zero():
    got = LRUCache(2).stats()
    assert got == {"hits": 0, "misses": 0, "evictions": 0}, f"a new cache should report all zeros, got {got!r}"


def test_l3_hits_and_misses():
    cache = LRUCache(2)
    cache.put("a", 1)
    cache.get("a")
    cache.get("a")
    cache.get("b")
    got = cache.stats()
    assert got["hits"] == 2 and got["misses"] == 1, f"expected 2 hits and 1 miss, got {got!r}"


def test_l3_falsy_value_is_a_hit():
    cache = LRUCache(2)
    cache.put("z", 0)
    cache.get("z")
    got = cache.stats()
    assert got["hits"] == 1 and got["misses"] == 0, f"get() of a cached 0 is a hit, got {got!r}"


def test_l3_put_and_len_do_not_count():
    cache = LRUCache(2)
    cache.put("a", 1)
    cache.put("a", 2)
    len(cache)
    got = cache.stats()
    assert got["hits"] == 0 and got["misses"] == 0, f"put() and len() must not count as hits or misses, got {got!r}"


def test_l3_expiry_is_a_miss_not_an_eviction():
    clock = _L3Clock()
    cache = LRUCache(2, clock=clock)
    cache.put("a", 1, ttl=1)
    clock.t = 1
    cache.get("a")
    cache.put("b", 2)
    cache.put("c", 3)
    got = cache.stats()
    want = {"hits": 0, "misses": 1, "evictions": 0}
    assert got == want, f"an expired get is a miss, and expiry is never an eviction; got {got!r}, expected {want!r}"


def test_l3_capacity_evictions_counted():
    cache = LRUCache(2)
    for k in "abcde":
        cache.put(k, k)
    got = cache.stats()["evictions"]
    assert got == 3, f"5 distinct keys into capacity 2 should evict 3, got {got!r}"


def test_l3_overwrite_is_not_an_eviction():
    cache = LRUCache(2)
    cache.put("a", 1)
    cache.put("b", 2)
    cache.put("a", 3)
    cache.put("b", 4)
    got = cache.stats()["evictions"]
    assert got == 0, f"overwriting a key must not count as an eviction, got {got!r}"


def test_l3_stats_returns_a_copy():
    cache = LRUCache(2)
    cache.get("x")
    snapshot = cache.stats()
    snapshot["misses"] = 100
    got = cache.stats()["misses"]
    assert got == 1, f"changing the dict returned by stats() must not change the cache; misses is now {got!r}"


def test_l3_resize_shrink_evicts_lru():
    cache = LRUCache(4)
    for k in "abcd":
        cache.put(k, k)
    cache.get("a")  # recency order is now b, c, d, a
    cache.resize(2)
    assert len(cache) == 2, f"after resize(2), len() should be 2, got {len(cache)}"
    assert cache.get("b") is None and cache.get("c") is None, "the two least recently used (b, c) should be gone"
    assert cache.get("d") == "d" and cache.get("a") == "a", "d and a should survive"
    got = cache.stats()["evictions"]
    assert got == 2, f"entries dropped by resize() count as evictions; got {got!r}"


def test_l3_resize_shrink_then_put():
    cache = LRUCache(3)
    for k in "abc":
        cache.put(k, k)
    cache.resize(2)  # evicts a
    cache.put("d", "d")  # evicts b
    assert cache.get("c") == "c" and cache.get("d") == "d", "c and d should be cached"
    assert len(cache) == 2, f"the new capacity of 2 is enforced on later puts; len() is {len(cache)}"
    assert cache.stats()["evictions"] == 2, "one eviction from resize(), one from put()"


def test_l3_resize_grow():
    cache = LRUCache(1)
    cache.put("a", 1)
    cache.resize(3)
    cache.put("b", 2)
    cache.put("c", 3)
    assert len(cache) == 3, f"after growing to 3, three entries fit; len() is {len(cache)}"
    assert cache.stats()["evictions"] == 0, "nothing should have been evicted"
    cache.put("d", 4)
    assert cache.get("a") is None, "the new capacity (3) is enforced: 'a' is evicted by the 4th key"


def test_l3_resize_invalid():
    cache = LRUCache(2)
    for bad in (0, -5):
        try:
            cache.resize(bad)
        except ValueError:
            continue
        raise AssertionError(f"resize({bad}) should raise ValueError")
    cache.put("a", 1)
    cache.put("b", 2)
    assert cache.get("a") == 1 and len(cache) == 2, "a rejected resize() must leave the capacity unchanged"


def test_l3_resize_drops_expired_first():
    clock = _L3Clock()
    cache = LRUCache(3, clock=clock)
    cache.put("a", 1)
    cache.put("b", 2)
    cache.put("c", 3, ttl=1)
    clock.t = 1
    cache.resize(2)
    assert cache.get("a") == 1 and cache.get("b") == 2, "expired 'c' should go first, so 'a' and 'b' still fit"
    got = cache.stats()["evictions"]
    assert got == 0, f"dropping an expired entry is not an eviction; got {got!r}"
`

const L3_SOLUTION = py`
import heapq
import itertools
import time
from collections import OrderedDict


class LRUCache:
    def __init__(self, capacity: int, clock=time.monotonic) -> None:
        if capacity < 1:
            raise ValueError("capacity must be at least 1")
        self.capacity = capacity
        self._clock = clock
        self._data: OrderedDict = OrderedDict()  # key -> (value, expires_at), LRU first
        self._expiry: list = []  # min-heap of (expires_at, tiebreak, key)
        self._tiebreak = itertools.count()
        self._hits = 0
        self._misses = 0
        self._evictions = 0

    def _purge_expired(self, now: float) -> None:
        """Drop expired entries. Expiry is not an eviction."""
        while self._expiry and self._expiry[0][0] <= now:
            expires_at, _, key = heapq.heappop(self._expiry)
            entry = self._data.get(key)
            if entry is not None and entry[1] == expires_at:
                del self._data[key]

    def _evict_down_to(self, size: int) -> None:
        """Evict least recently used entries until at most size remain."""
        while len(self._data) > size:
            self._data.popitem(last=False)
            self._evictions += 1

    def get(self, key):
        self._purge_expired(self._clock())
        if key not in self._data:
            self._misses += 1
            return None
        self._hits += 1
        self._data.move_to_end(key)
        return self._data[key][0]

    def put(self, key, value, ttl: float | None = None) -> None:
        if ttl is not None and ttl <= 0:
            raise ValueError("ttl must be positive")
        now = self._clock()
        self._purge_expired(now)
        expires_at = None if ttl is None else now + ttl
        if expires_at is not None:
            heapq.heappush(self._expiry, (expires_at, next(self._tiebreak), key))
        if key in self._data:
            self._data.move_to_end(key)
        else:
            self._evict_down_to(self.capacity - 1)
        self._data[key] = (value, expires_at)

    def __len__(self) -> int:
        self._purge_expired(self._clock())
        return len(self._data)

    def resize(self, new_capacity: int) -> None:
        if new_capacity < 1:
            raise ValueError("capacity must be at least 1")
        self._purge_expired(self._clock())
        self.capacity = new_capacity
        self._evict_down_to(new_capacity)

    def stats(self) -> dict:
        return {"hits": self._hits, "misses": self._misses, "evictions": self._evictions}
`

const level3: LabLevel = {
  title: 'Stats and resize',
  spec: `Interviewers like to ask how you would know the cache is working. Add **metrics**, and a way to **resize** a live cache.

- \`stats()\` returns a new dict \`{"hits": h, "misses": m, "evictions": e}\`, counted since the cache was created.
- A \`get\` that returns a value is a **hit**. A \`get\` that returns \`None\` (missing *or* expired) is a **miss**. \`put\` and \`len\` never change hits or misses.
- An **eviction** is a live entry thrown out to make room, by \`put\` or by \`resize\`. Expiry is not an eviction, and neither is overwriting a key.
- \`resize(new_capacity)\` changes the capacity (must be ≥ 1, else \`ValueError\` and nothing changes). If more live entries remain than fit, evict least recently used ones until they fit. Drop expired entries first: they don't count as evictions.

Example with \`cache = LRUCache(3)\` holding a, b, c (put in that order):

\`cache.get("a")\` → hit
\`cache.get("x")\` → miss
\`cache.resize(1)\`   evicts b, then c; keeps a
\`cache.stats()\` → \`{"hits": 1, "misses": 1, "evictions": 2}\``,
  tests: L3_TESTS,
  hints: [
    'Three integer counters on the instance, bumped in exactly one place each. `stats()` builds a new dict from them every call.',
    'Factor eviction into one helper, say `_evict_down_to(size)`, that pops from the LRU end and counts. `put` calls it with `capacity - 1` for a new key; `resize` calls it with the new capacity.',
    'Purge expired entries before evicting in both `put` and `resize`, so expired entries never show up in the eviction count.',
  ],
  solution: L3_SOLUTION,
}

/* ---------------------------------------------------------------- level 4 */

const L4_TESTS = py`
def test_l4_returns_results():
    @memoize(maxsize=4)
    def add(a, b):
        return a + b

    assert add(2, 3) == 5, "first call computes the result"
    assert add(2, 3) == 5, "second call returns the cached result"
    assert add(10, 1) == 11, "different arguments give a different result"


def test_l4_avoids_recomputation():
    calls = []

    @memoize(maxsize=4)
    def square(x):
        calls.append(x)
        return x * x

    for x in [3, 3, 4, 3, 4]:
        square(x)
    assert calls == [3, 4], f"the real function should run once per argument, but ran for {calls}"


def test_l4_cache_info_counts():
    @memoize(maxsize=2)
    def square(x):
        return x * x

    square(3)
    square(3)
    square(4)
    got = square.cache_info()
    want = {"hits": 1, "misses": 2, "evictions": 0, "maxsize": 2, "currsize": 2}
    for k, v in want.items():
        assert got.get(k) == v, f"cache_info()[{k!r}] is {got.get(k)!r}, expected {v!r} (full: {got!r})"


def test_l4_maxsize_evicts_lru():
    calls = []

    @memoize(maxsize=2)
    def ident(x):
        calls.append(x)
        return x

    for x in [1, 2, 1, 3, 2, 1]:
        ident(x)
    # 1 miss, 2 miss, 1 hit, 3 miss (evicts 2), 2 miss (evicts 1), 1 miss (evicts 3)
    assert calls == [1, 2, 3, 2, 1], f"LRU eviction should make the function run for [1, 2, 3, 2, 1], got {calls}"
    info = ident.cache_info()
    assert info["evictions"] == 3 and info["currsize"] == 2, f"expected 3 evictions and currsize 2, got {info!r}"


def test_l4_keyword_order_does_not_matter():
    calls = []

    @memoize()
    def f(a, b=0, c=0):
        calls.append((a, b, c))
        return a + b + c

    assert f(1, b=2, c=3) == 6
    assert f(1, c=3, b=2) == 6
    assert len(calls) == 1, f"f(1, b=2, c=3) and f(1, c=3, b=2) should share one cache entry; the function ran {len(calls)} times"


def test_l4_arguments_are_part_of_the_key():
    @memoize()
    def echo(*args, **kwargs):
        return (args, sorted(kwargs.items()))

    assert echo(1, 2) == ((1, 2), [])
    assert echo(2, 1) == ((2, 1), []), "positional order is part of the key"
    assert echo(1, x=2) == ((1,), [("x", 2)])
    got = echo(1, y=2)
    assert got == ((1,), [("y", 2)]), f"keyword names are part of the key: echo(1, y=2) returned {got!r}"


def test_l4_none_results_are_cached():
    calls = []

    @memoize()
    def log(x):
        calls.append(x)
        return None

    log("a")
    log("a")
    log("a")
    assert calls == ["a"], f"a function returning None should still run only once; it ran {len(calls)} times"
    info = log.cache_info()
    assert info["hits"] == 2 and info["misses"] == 1, f"cached None results are hits; got {info!r}"


def test_l4_exceptions_are_not_cached():
    calls = []

    @memoize()
    def checked_sqrt(x):
        calls.append(x)
        if x < 0:
            raise ValueError("negative")
        return x ** 0.5

    for _ in range(2):
        try:
            checked_sqrt(-1)
        except ValueError:
            pass
        else:
            raise AssertionError("the exception should propagate to the caller")
    assert calls == [-1, -1], f"a call that raised must not be cached; the function ran {len(calls)} times"
    got = checked_sqrt.cache_info()["currsize"]
    assert got == 0, f"nothing should be stored for a call that raised; currsize is {got!r}"


def test_l4_unhashable_arguments_raise_type_error():
    @memoize()
    def total(xs):
        return sum(xs)

    try:
        total([1, 2])
    except TypeError:
        return
    raise AssertionError("calling with a list argument should raise TypeError (lists aren't hashable)")


def test_l4_preserves_name_and_doc():
    @memoize()
    def area(r):
        """Area of a circle."""
        return 3.14159 * r * r

    assert area.__name__ == "area", f"__name__ should be 'area', got {area.__name__!r} (use functools.wraps)"
    assert area.__doc__ == "Area of a circle.", f"__doc__ should be preserved, got {area.__doc__!r}"


def test_l4_recursive_fibonacci():
    @memoize(maxsize=128)
    def fib(n):
        return n if n < 2 else fib(n - 1) + fib(n - 2)

    got = fib(80)
    assert got == 23416728348467685, f"fib(80) should be 23416728348467685, got {got!r}"
    info = fib.cache_info()
    assert info["misses"] == 81, f"each of fib(0)..fib(80) is computed once: 81 misses, got {info['misses']}"
    assert info["hits"] == 78, f"every other recursive call is a hit: 78 hits, got {info['hits']}"


def test_l4_cache_clear():
    calls = []

    @memoize()
    def f(x):
        calls.append(x)
        return x

    f(1)
    f(1)
    f.cache_clear()
    got = f.cache_info()
    assert got["hits"] == 0 and got["misses"] == 0 and got["currsize"] == 0, f"cache_clear() should reset entries and counters, got {got!r}"
    f(1)
    assert calls == [1, 1], "after cache_clear() the function must run again"
    assert f.cache_info()["maxsize"] == 128, "maxsize defaults to 128 and survives cache_clear()"


def test_l4_each_function_has_its_own_cache():
    @memoize()
    def double(x):
        return 2 * x

    @memoize()
    def triple(x):
        return 3 * x

    assert double(5) == 10 and triple(5) == 15, "two memoized functions must not share a cache"
    assert double.cache_info()["currsize"] == 1, "double() cached one entry"
    assert triple.cache_info()["currsize"] == 1, "triple() cached one entry"


def test_l4_invalid_maxsize():
    try:
        decorator = memoize(maxsize=0)
        decorator(lambda x: x)
    except ValueError:
        return
    raise AssertionError("memoize(maxsize=0) should raise ValueError (when called or when decorating)")
`

const L4_SOLUTION = py`
import functools
import heapq
import itertools
import time
from collections import OrderedDict


class LRUCache:
    def __init__(self, capacity: int, clock=time.monotonic) -> None:
        if capacity < 1:
            raise ValueError("capacity must be at least 1")
        self.capacity = capacity
        self._clock = clock
        self._data: OrderedDict = OrderedDict()  # key -> (value, expires_at), LRU first
        self._expiry: list = []  # min-heap of (expires_at, tiebreak, key)
        self._tiebreak = itertools.count()
        self._hits = 0
        self._misses = 0
        self._evictions = 0

    def _purge_expired(self, now: float) -> None:
        while self._expiry and self._expiry[0][0] <= now:
            expires_at, _, key = heapq.heappop(self._expiry)
            entry = self._data.get(key)
            if entry is not None and entry[1] == expires_at:
                del self._data[key]

    def _evict_down_to(self, size: int) -> None:
        while len(self._data) > size:
            self._data.popitem(last=False)
            self._evictions += 1

    def get(self, key):
        self._purge_expired(self._clock())
        if key not in self._data:
            self._misses += 1
            return None
        self._hits += 1
        self._data.move_to_end(key)
        return self._data[key][0]

    def put(self, key, value, ttl: float | None = None) -> None:
        if ttl is not None and ttl <= 0:
            raise ValueError("ttl must be positive")
        now = self._clock()
        self._purge_expired(now)
        expires_at = None if ttl is None else now + ttl
        if expires_at is not None:
            heapq.heappush(self._expiry, (expires_at, next(self._tiebreak), key))
        if key in self._data:
            self._data.move_to_end(key)
        else:
            self._evict_down_to(self.capacity - 1)
        self._data[key] = (value, expires_at)

    def __len__(self) -> int:
        self._purge_expired(self._clock())
        return len(self._data)

    def resize(self, new_capacity: int) -> None:
        if new_capacity < 1:
            raise ValueError("capacity must be at least 1")
        self._purge_expired(self._clock())
        self.capacity = new_capacity
        self._evict_down_to(new_capacity)

    def stats(self) -> dict:
        return {"hits": self._hits, "misses": self._misses, "evictions": self._evictions}


def memoize(maxsize: int = 128):
    if maxsize < 1:
        raise ValueError("maxsize must be at least 1")

    def decorator(fn):
        cache = LRUCache(maxsize)

        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            key = (args, tuple(sorted(kwargs.items())))
            boxed = cache.get(key)  # None means "not cached"
            if boxed is not None:
                return boxed[0]
            result = fn(*args, **kwargs)  # if this raises, nothing is cached
            cache.put(key, (result,))  # box it so a cached None is not a miss
            return result

        def cache_info() -> dict:
            return {**cache.stats(), "maxsize": maxsize, "currsize": len(cache)}

        def cache_clear() -> None:
            nonlocal cache
            cache = LRUCache(maxsize)

        wrapper.cache_info = cache_info
        wrapper.cache_clear = cache_clear
        return wrapper

    return decorator
`

const level4: LabLevel = {
  title: 'A memoize decorator',
  spec: `Put your cache to work: write \`memoize(maxsize=128)\`, a decorator like \`functools.lru_cache\` but built on **your** \`LRUCache\`.

\`memoize(maxsize)\` returns a decorator. The decorated function:

- returns the cached result for arguments it has seen; otherwise it calls the real function and caches the result;
- builds its cache key from the positional arguments plus the keyword arguments, where **keyword order doesn't matter**: \`f(1, b=2, c=3)\` and \`f(1, c=3, b=2)\` share an entry. (\`f(1, 2)\` and \`f(1, b=2)\` may be cached separately; that's fine.)
- caches \`None\` results too. Your \`get\` returns \`None\` on a miss, so you need a way to tell "cached None" from "not cached";
- doesn't cache exceptions: if the function raises, nothing is stored and the exception propagates;
- raises \`TypeError\` for unhashable arguments such as lists (a dict-based cache does this for free);
- keeps the wrapped function's \`__name__\` and \`__doc__\`;
- has a cache of its own: two decorated functions never share entries or counters;
- has \`cache_info()\`, returning a dict with keys \`hits\`, \`misses\`, \`evictions\`, \`maxsize\` and \`currsize\` (entries cached now), and \`cache_clear()\`, which empties the cache and resets the counters.

\`maxsize\` must be at least 1; raise \`ValueError\` otherwise.

Example:

\`@memoize(maxsize=2)\`
\`def square(x): return x * x\`
\`square(3); square(3); square(4)\`
\`square.cache_info()\` → \`{"hits": 1, "misses": 2, "evictions": 0, "maxsize": 2, "currsize": 2}\``,
  tests: L4_TESTS,
  hints: [
    'Three layers: `memoize(maxsize)` returns `decorator(fn)`, which returns `wrapper(*args, **kwargs)`. Create one `LRUCache` per decorated function inside `decorator`, not at module level.',
    'Key: `(args, tuple(sorted(kwargs.items())))`. Sorting makes keyword order irrelevant, and keeping the names stops `f(x=1)` and `f(y=1)` colliding.',
    'Box results before caching: `cache.put(key, (result,))`. A hit is then always a 1-tuple, even when `result` is `None`. Attach `cache_info` and `cache_clear` as attributes of `wrapper`, and decorate it with `functools.wraps(fn)`.',
  ],
  solution: L4_SOLUTION,
}

/* -------------------------------------------------------------------- lab */

const lab: Lab = {
  id: 'lru-cache',
  title: 'LRU cache with TTL',
  area: 'builds',
  summary:
    'An **O(1) LRU cache**, then TTLs with an injectable clock, hit-rate metrics and live resizing, and finally a `memoize` decorator built on top of your own class.',
  minutes: 75,
  starter: STARTER,
  levels: [level1, level2, level3, level4],
  followUps: [
    'Make it thread-safe. Why does even `get` need the lock (it reorders entries)? In `memoize`, how do you avoid holding the lock while the slow function runs, and what happens when two threads miss on the same key at once?',
    '`functools.lru_cache` is implemented in C with a dict plus a circular doubly linked list. Sketch that version: which pointers does a hit update, and why do sentinel nodes remove the edge cases?',
    'The cache now has to live on 50 machines. How do you assign keys to machines so that adding one machine moves only a small share of keys (consistent hashing), and what happens to the hit rate when a machine dies?',
    'Your expiry heap keeps stale items for keys that were overwritten. Describe a workload where that leaks memory, and two ways to bound it.',
  ],
}

export default lab
