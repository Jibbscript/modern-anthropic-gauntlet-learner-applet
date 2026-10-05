import type { Lab, LabLevel } from '../../core/types'

/** Python source: raw template (backslashes kept as typed), leading newline dropped. */
const py = (s: TemplateStringsArray) => s.raw[0].replace(/^\n/, '')

/** learner code first, then the provided fake filesystem (identical in starter and every solution) */
const withFS = (code: string) => `${code}\n\n${PROVIDED}`

/* --------------------------------------------------------------- provided */

const PROVIDED = py`
# ---------------------------------------------------------------------------
# Provided: an in-memory filesystem. The tests build one for you. Don't edit.
# ---------------------------------------------------------------------------


class FakeFS:
    """An in-memory filesystem.

    fs = FakeFS({"/docs/a.txt": b"hello", "/b.txt": b"hello"},
                symlinks={"/docs/link.txt": "/b.txt"})

    Directories exist implicitly: "/docs" exists because a file is inside it.
    Counters the tests read:
      fs.bytes_read    total bytes returned by every read() so far
      fs.largest_read  most bytes returned by a single read() call
      fs.opened        every path passed to open(), in order
      fs.open_handles  files opened and not closed yet
    """

    def __init__(self, files, symlinks=None):
        self._files = {path: bytes(data) for path, data in files.items()}
        self._links = dict(symlinks or {})
        self.bytes_read = 0
        self.largest_read = 0
        self.opened = []
        self.open_handles = 0

    def walk(self, root):
        """Yield the path of every file and symlink under root, at any depth.

        Directories are not yielded and symlinks are never followed. The
        order is whatever the disk returns: don't rely on it.
        """
        prefix = root.rstrip("/") + "/"
        for path in [*self._files, *self._links]:
            if path.startswith(prefix):
                yield path

    def list_dir(self, path):
        """Sorted names of the entries directly inside the directory path."""
        prefix = path.rstrip("/") + "/"
        entries = [*self._files, *self._links]
        return sorted({p[len(prefix):].split("/")[0] for p in entries if p.startswith(prefix)})

    def is_dir(self, path):
        prefix = path.rstrip("/") + "/"
        return any(p.startswith(prefix) for p in [*self._files, *self._links])

    def is_symlink(self, path):
        return path in self._links

    def size(self, path):
        """Size of the file in bytes. Follows symlinks; FileNotFoundError if missing."""
        return len(self._files[self._target(path)])

    def open(self, path):
        """Open a file for reading (follows symlinks). Use it in a with block."""
        data = self._files[self._target(path)]
        self.opened.append(path)
        self.open_handles += 1
        return _FakeFile(self, data)

    def _target(self, path):
        hops = 0
        while path in self._links and hops < 40:
            path, hops = self._links[path], hops + 1
        if path not in self._files:
            raise FileNotFoundError(path)
        return path


class _FakeFile:
    def __init__(self, fs, data):
        self._fs, self._data, self._pos, self.closed = fs, data, 0, False

    def read(self, n=-1):
        """Return up to n bytes (everything left if n is -1); b"" at end of file."""
        if self.closed:
            raise ValueError("read from a closed file")
        end = len(self._data) if n is None or n < 0 else min(len(self._data), self._pos + n)
        chunk, self._pos = self._data[self._pos:end], end
        self._fs.bytes_read += len(chunk)
        self._fs.largest_read = max(self._fs.largest_read, len(chunk))
        return chunk

    def close(self):
        if not self.closed:
            self.closed = True
            self._fs.open_handles -= 1

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.close()
`

/* ---------------------------------------------------------------- starter */

const STARTER = withFS(py`
def group_by_size(fs, root):
    """Group the files under root by size.

    fs is a FakeFS (see the bottom of this file). Returns a dict mapping each
    size to the sorted list of paths with that size, for every size shared by
    two or more files. Unique sizes are left out.
    """
    raise NotImplementedError
`)

/* ---------------------------------------------------------------- level 1 */

const L1_TESTS = py`
import random as _l1_random


def _l1_check(fs, root, want):
    got = group_by_size(fs, root)
    assert isinstance(got, dict), f"group_by_size should return a dict, got {type(got).__name__}"
    assert got == want, f"group_by_size(fs, {root!r})\n  got:  {got!r}\n  want: {want!r}"


def test_l1_groups_same_size():
    fs = FakeFS({"/a.txt": b"hello", "/b.txt": b"world", "/c.txt": b"hi"})
    _l1_check(fs, "/", {5: ["/a.txt", "/b.txt"]})


def test_l1_unique_sizes_left_out():
    fs = FakeFS({"/a": b"1", "/b": b"22", "/c": b"333"})
    _l1_check(fs, "/", {})


def test_l1_empty_filesystem():
    _l1_check(FakeFS({}), "/", {})


def test_l1_paths_sorted():
    fs = FakeFS({"/z.txt": b"aaa", "/m/b.txt": b"bbb", "/a.txt": b"ccc"})
    _l1_check(fs, "/", {3: ["/a.txt", "/m/b.txt", "/z.txt"]})


def test_l1_multiple_groups():
    fs = FakeFS({
        "/x1": b"ab", "/y/x2": b"cd", "/x3": b"ef",
        "/p1": b"four", "/p2": b"FOUR",
        "/solo": b"seven!!",
    })
    _l1_check(fs, "/", {2: ["/x1", "/x3", "/y/x2"], 4: ["/p1", "/p2"]})


def test_l1_nested_directories():
    fs = FakeFS({
        "/home/ana/photos/2023/beach.jpg": b"12345678",
        "/home/ana/backup/beach copy.jpg": b"12345678",
        "/home/ana/notes.txt": b"note",
    })
    _l1_check(fs, "/", {8: ["/home/ana/backup/beach copy.jpg", "/home/ana/photos/2023/beach.jpg"]})


def test_l1_only_under_root():
    fs = FakeFS({
        "/photos/a.jpg": b"xx",
        "/photos/trip/b.jpg": b"yy",
        "/photos2/c.jpg": b"zz",
        "/d.jpg": b"ww",
    })
    _l1_check(fs, "/photos", {2: ["/photos/a.jpg", "/photos/trip/b.jpg"]})


def test_l1_root_with_trailing_slash():
    fs = FakeFS({"/photos/a.jpg": b"xx", "/photos/b.jpg": b"yy", "/c.jpg": b"zz"})
    _l1_check(fs, "/photos/", {2: ["/photos/a.jpg", "/photos/b.jpg"]})


def test_l1_empty_files_share_size_zero():
    fs = FakeFS({"/e1": b"", "/dir/e2": b"", "/full": b"data"})
    _l1_check(fs, "/", {0: ["/dir/e2", "/e1"]})


def test_l1_does_not_open_files():
    fs = FakeFS({"/a": b"same", "/b": b"same", "/c": b"diff!"})
    group_by_size(fs, "/")
    assert fs.opened == [], f"grouping by size needs only fs.size(); it opened {fs.opened}"
    assert fs.bytes_read == 0, f"grouping by size should read 0 bytes, read {fs.bytes_read}"


def test_l1_values_are_lists():
    fs = FakeFS({"/a": b"1", "/b": b"2"})
    got = group_by_size(fs, "/")
    assert isinstance(got.get(1), list), f"each value should be a list of paths, got {got!r}"


def test_l1_many_files_match_brute_force():
    rng = _l1_random.Random(7)
    files = {}
    for i in range(300):
        files[f"/d{rng.randrange(5)}/f{i}.bin"] = bytes(rng.randrange(1, 40))
    want = {}
    for path, data in files.items():
        want.setdefault(len(data), []).append(path)
    want = {size: sorted(paths) for size, paths in want.items() if len(paths) > 1}
    _l1_check(FakeFS(files), "/", want)
`

const L1_SOLUTION = withFS(py`
from collections import defaultdict


def group_by_size(fs, root):
    """Group the files under root by size: {size: sorted paths} for sizes shared by 2+ files."""
    by_size = defaultdict(list)
    for path in fs.walk(root):
        by_size[fs.size(path)].append(path)
    return {size: sorted(paths) for size, paths in by_size.items() if len(paths) > 1}
`)

const level1: LabLevel = {
  title: 'Group by size',
  spec: `You're building a duplicate-file finder. Instead of a real disk, the tests hand you a \`FakeFS\` (provided at the bottom of your file), so everything runs in the browser.

The \`FakeFS\` API:
- \`fs.walk(root)\` yields the path of every file under \`root\`, at any depth, in no particular order.
- \`fs.size(path)\` returns the size in bytes.
- \`fs.open(path)\` returns a file with \`read(n)\`. Use it in a \`with\` block.
- \`fs.is_symlink(path)\`, \`fs.list_dir(path)\` and \`fs.is_dir(path)\` work like their \`os\` cousins.

Write \`group_by_size(fs, root)\`. Two files can only be identical if they're the same size, so this is the cheap first pass.

- Return a dict mapping each size to the **sorted** list of paths with that size, for every size shared by **two or more** files. Leave unique sizes out.
- Only look under \`root\`: \`"/photos"\` covers \`"/photos/a.jpg"\` but not \`"/photos2/b.jpg"\`. (\`fs.walk\` already handles that.)
- Sizes come from metadata: don't open any file.

Example:

\`fs = FakeFS({"/a.txt": b"hello", "/b/c.txt": b"world", "/d.txt": b"hi"})\`
\`group_by_size(fs, "/")\` → \`{5: ["/a.txt", "/b/c.txt"]}\``,
  tests: L1_TESTS,
  hints: [
    'A `defaultdict(list)` keyed by `fs.size(path)` collects every size in one pass over `fs.walk(root)`.',
    'Filter at the end: keep only the sizes whose list has more than one path, and sort each list. The walk order is arbitrary, so sorting is what makes the output stable.',
  ],
  solution: L1_SOLUTION,
}

/* ---------------------------------------------------------------- level 2 */

const L2_TESTS = py`
import random as _l2_random


def _l2_check(fs, root, want):
    got = find_duplicates(fs, root)
    assert isinstance(got, list), f"find_duplicates should return a list of groups, got {type(got).__name__}"
    assert got == want, f"find_duplicates(fs, {root!r})\n  got:  {got!r}\n  want: {want!r}"


def test_l2_identical_files():
    fs = FakeFS({"/a.txt": b"hello", "/b/a copy.txt": b"hello", "/c.txt": b"other"})
    _l2_check(fs, "/", [["/a.txt", "/b/a copy.txt"]])


def test_l2_same_size_different_content():
    fs = FakeFS({"/a": b"abc", "/b": b"abd", "/c": b"xyz"})
    _l2_check(fs, "/", [])


def test_l2_no_files():
    _l2_check(FakeFS({}), "/", [])


def test_l2_differ_only_after_first_4k():
    same_start = b"x" * 4999
    fs = FakeFS({"/a": same_start + b"1", "/b": same_start + b"1", "/c": same_start + b"2"})
    _l2_check(fs, "/", [["/a", "/b"]])


def test_l2_differ_in_first_byte():
    fs = FakeFS({"/a": b"A" + b"z" * 9000, "/b": b"B" + b"z" * 9000, "/c": b"A" + b"z" * 9000})
    _l2_check(fs, "/", [["/a", "/c"]])


def test_l2_groups_and_paths_sorted():
    fs = FakeFS({
        "/z/1": b"red", "/a/1": b"red", "/m/1": b"red",
        "/q/2": b"blue!", "/b/2": b"blue!",
        "/c/3": b"green",
    })
    _l2_check(fs, "/", [["/a/1", "/m/1", "/z/1"], ["/b/2", "/q/2"]])


def test_l2_two_groups_same_size():
    fs = FakeFS({"/a": b"cat", "/b": b"dog", "/c": b"cat", "/d": b"dog", "/e": b"cow"})
    _l2_check(fs, "/", [["/a", "/c"], ["/b", "/d"]])


def test_l2_large_files():
    big = bytes(range(256)) * 1200  # 300 KiB
    fs = FakeFS({
        "/big1": big, "/big2": big,
        "/big3": big[:200_000] + b"!" + big[200_001:],
    })
    _l2_check(fs, "/", [["/big1", "/big2"]])


def test_l2_reads_in_chunks():
    big = bytes(range(256)) * 1200  # 300 KiB
    fs = FakeFS({"/a": big, "/b": big})
    find_duplicates(fs, "/")
    assert fs.largest_read <= 65536, (
        f"read whole files in chunks of at most 64 KiB (65536 bytes); "
        f"your largest single read() returned {fs.largest_read} bytes"
    )


def test_l2_closes_every_file():
    fs = FakeFS({"/a": b"one", "/b": b"one", "/c": b"two", "/d": b"x" * 5000, "/e": b"x" * 5000})
    find_duplicates(fs, "/")
    assert fs.opened, "find_duplicates should open the candidate files to hash them"
    assert fs.open_handles == 0, f"{fs.open_handles} file(s) left open: use 'with fs.open(path) as f:'"


def test_l2_only_under_root():
    fs = FakeFS({"/keep/a": b"dup", "/keep/b": b"dup", "/other/c": b"dup"})
    _l2_check(fs, "/keep", [["/keep/a", "/keep/b"]])


def test_l2_matches_brute_force():
    rng = _l2_random.Random(42)
    files = {}
    for i in range(200):
        size = rng.choice([1, 2, 3, 5000, 70000])
        files[f"/r{rng.randrange(4)}/f{i}"] = bytes([rng.randrange(2)]) * size
    by_content = {}
    for path, data in files.items():
        by_content.setdefault(data, []).append(path)
    want = sorted(sorted(g) for g in by_content.values() if len(g) > 1)
    _l2_check(FakeFS(files), "/", want)
`

const L2_SOLUTION = withFS(py`
import hashlib
from collections import defaultdict

PARTIAL_BYTES = 4096  # the partial hash covers the first 4 KiB
CHUNK_BYTES = 64 * 1024  # full hashes read 64 KiB at a time


def group_by_size(fs, root):
    """Group the files under root by size: {size: sorted paths} for sizes shared by 2+ files."""
    by_size = defaultdict(list)
    for path in fs.walk(root):
        by_size[fs.size(path)].append(path)
    return {size: sorted(paths) for size, paths in by_size.items() if len(paths) > 1}


def _partial_hash(fs, path):
    with fs.open(path) as f:
        return hashlib.sha256(f.read(PARTIAL_BYTES)).hexdigest()


def _full_hash(fs, path):
    h = hashlib.sha256()
    with fs.open(path) as f:
        while True:
            chunk = f.read(CHUNK_BYTES)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def _buckets(paths, key):
    """Split paths by key(path); keep only the buckets holding 2+ paths."""
    by_key = defaultdict(list)
    for path in paths:
        by_key[key(path)].append(path)
    return [bucket for bucket in by_key.values() if len(bucket) > 1]


def find_duplicates(fs, root):
    """Groups of identical files: size, then first-4 KiB hash, then full hash."""
    groups = []
    for paths in group_by_size(fs, root).values():
        for same_start in _buckets(paths, lambda p: _partial_hash(fs, p)):
            groups.extend(_buckets(same_start, lambda p: _full_hash(fs, p)))
    return sorted(sorted(group) for group in groups)
`)

const level2: LabLevel = {
  title: 'Hash the candidates',
  spec: `Same size doesn't mean same content. Write \`find_duplicates(fs, root)\`: the groups of files under \`root\` whose bytes are identical.

Narrow the candidates in three passes, cheapest first:

1. **Size**: your \`group_by_size\`.
2. **Partial hash**: within a size group, hash only the **first 4096 bytes** with \`hashlib.sha256\`. Files whose first 4 KiB differ can't be duplicates.
3. **Full hash**: files that still match are hashed in full, reading **64 KiB at a time** (\`f.read(65536)\` in a loop until it returns \`b""\`). Never read a whole file in one call: real files can be bigger than memory.

Return a list of groups. Each group is a sorted list of two or more paths with identical content, and the list of groups is sorted too, which orders groups by their first path. No duplicates gives \`[]\`.

Close every file you open: \`with fs.open(path) as f:\` does it for you.

Example:

\`fs = FakeFS({"/a": b"x" * 5000, "/b": b"x" * 5000, "/c": b"x" * 4999 + b"y"})\`
\`find_duplicates(fs, "/")\` → \`[["/a", "/b"]]\`

\`/c\` has the same size and the same first 4 KiB as the others, so only the full hash tells it apart.`,
  tests: L2_TESTS,
  hints: [
    'Write one helper that splits a list of paths into buckets by a key function and keeps only the buckets with 2+ paths. You use it twice: keyed by the partial hash, then by the full hash.',
    'Partial hash: `hashlib.sha256(f.read(4096)).hexdigest()`. Full hash: `h = hashlib.sha256()`, then `h.update(chunk)` for every 64 KiB chunk, then `h.hexdigest()`.',
    "Sort each group, then sort the list of groups. The walk order is arbitrary, so without sorting your output would be too.",
  ],
  solution: L2_SOLUTION,
}

/* ---------------------------------------------------------------- level 3 */

const L3_TESTS = py`
import random as _l3_random

_L3_PAGE = 4096


def test_l3_symlink_is_not_a_duplicate():
    fs = FakeFS({"/a.txt": b"same bytes"}, symlinks={"/link.txt": "/a.txt"})
    got = find_duplicates(fs, "/")
    assert got == [], f"a symlink is not a second copy of its target; got {got!r}"


def test_l3_group_by_size_skips_symlinks():
    fs = FakeFS({"/a": b"xy", "/b": b"zz"}, symlinks={"/l1": "/a", "/l2": "/b"})
    got = group_by_size(fs, "/")
    assert got == {2: ["/a", "/b"]}, f"group_by_size should skip symlinks; got {got!r}"


def test_l3_dangling_symlink_ignored():
    fs = FakeFS({"/a": b"x", "/b": b"x"}, symlinks={"/gone": "/deleted-long-ago"})
    try:
        got = find_duplicates(fs, "/")
    except FileNotFoundError as e:
        raise AssertionError(f"a dangling symlink crashed the scan ({e!r}): skip symlinks before calling size()")
    assert got == [["/a", "/b"]], f"got {got!r}"


def test_l3_symlinks_next_to_real_duplicates():
    fs = FakeFS(
        {"/p/a.jpg": b"jpeg" * 300, "/q/a.jpg": b"jpeg" * 300},
        symlinks={"/shortcut.jpg": "/p/a.jpg", "/q/also.jpg": "/q/a.jpg"},
    )
    got = find_duplicates(fs, "/")
    assert got == [["/p/a.jpg", "/q/a.jpg"]], f"only the two real files are duplicates; got {got!r}"


def test_l3_empty_files_skipped_by_default():
    fs = FakeFS({"/e1": b"", "/e2": b"", "/a": b"q", "/b": b"q"})
    got = find_duplicates(fs, "/")
    assert got == [["/a", "/b"]], f"empty files are left out unless include_empty=True; got {got!r}"


def test_l3_include_empty_groups_them():
    fs = FakeFS({"/e1": b"", "/d/e2": b"", "/e3": b"", "/a": b"q", "/b": b"q"})
    got = find_duplicates(fs, "/", include_empty=True)
    want = [["/a", "/b"], ["/d/e2", "/e1", "/e3"]]
    assert got == want, f"with include_empty=True all empty files form one group\n  got:  {got!r}\n  want: {want!r}"
    opened_empty = [p for p in fs.opened if p.startswith("/e") or p.startswith("/d/")]
    assert not opened_empty, f"empty files never need reading, but you opened {opened_empty}"


def test_l3_single_empty_file_is_not_a_group():
    fs = FakeFS({"/e": b"", "/a": b"1"})
    got = find_duplicates(fs, "/", include_empty=True)
    assert got == [], f"one empty file has nothing to duplicate; got {got!r}"


def test_l3_unique_sizes_never_opened():
    fs = FakeFS({f"/f{i}": b"z" * (i + 1) * 1000 for i in range(10)})
    find_duplicates(fs, "/")
    assert fs.opened == [], f"no two files share a size, so nothing needs opening; you opened {fs.opened}"


def test_l3_partial_hash_saves_reads():
    size = 256 * 1024
    fs = FakeFS({f"/f{i:02}": bytes([i]) + b"\x00" * (size - 1) for i in range(20)})
    got = find_duplicates(fs, "/")
    assert got == [], f"got {got!r}"
    budget = 20 * _L3_PAGE
    assert fs.bytes_read <= budget, (
        f"20 files of 256 KiB that differ in byte 0 should cost at most {budget} bytes "
        f"(4 KiB each), but you read {fs.bytes_read}. Hash the first 4 KiB before reading whole files."
    )


def test_l3_full_read_only_for_partial_matches():
    size = 100_000
    body = b"." * (size - 1)
    fs = FakeFS({"/same1": b"S" + body, "/same2": b"S" + body, "/odd1": b"X" + body, "/odd2": b"Y" + body})
    got = find_duplicates(fs, "/")
    assert got == [["/same1", "/same2"]], f"got {got!r}"
    budget = 4 * _L3_PAGE + 2 * size
    assert fs.bytes_read <= budget, (
        f"only /same1 and /same2 need full reads: budget {budget} bytes, you read {fs.bytes_read}"
    )


def test_l3_small_files_read_once():
    fs = FakeFS({f"/s{i:02}": b"tiny file " * 100 for i in range(30)})
    got = find_duplicates(fs, "/")
    assert got == [[f"/s{i:02}" for i in range(30)]], f"got {got!r}"
    assert fs.bytes_read <= 30 * 1000, (
        f"each 1000-byte file fits inside the 4 KiB partial hash, so read it once: "
        f"budget 30000 bytes, you read {fs.bytes_read}"
    )
    assert len(fs.opened) == 30, f"each small file should be opened once; open() was called {len(fs.opened)} times"


def test_l3_each_file_opened_at_most_twice():
    big = b"B" * 20_000
    fs = FakeFS({"/a": big, "/b": big, "/c": big, "/d": b"d" + big[1:]})
    find_duplicates(fs, "/")
    counts = {p: fs.opened.count(p) for p in set(fs.opened)}
    worst = max(counts.values(), default=0)
    assert worst <= 2, f"open each file at most twice (partial, then full): {counts}"


def test_l3_random_against_model():
    rng = _l3_random.Random(2024)
    for trial in range(15):
        files, links = {}, {}
        for i in range(rng.randrange(5, 40)):
            size = rng.choice([0, 0, 1, 7, 4096, 4097, 9000, 70000])
            head = bytes([rng.randrange(3)])
            tail = bytes([rng.randrange(2)])
            data = b"" if size == 0 else (head + b"m" * (size - 2) + tail)[:size]
            files[f"/t{rng.randrange(3)}/f{i}"] = data
        for j in range(rng.randrange(4)):
            links[f"/links/l{j}"] = rng.choice(list(files) + ["/missing"])
        include_empty = rng.random() < 0.5
        fs = FakeFS(files, symlinks=links)
        got = find_duplicates(fs, "/", include_empty=include_empty)
        by_content = {}
        for path, data in files.items():
            if data or include_empty:
                by_content.setdefault(data, []).append(path)
        want = sorted(sorted(g) for g in by_content.values() if len(g) > 1)
        assert got == want, f"trial {trial} (include_empty={include_empty})\n  got:  {got!r}\n  want: {want!r}"
        sizes = {}
        for path, data in files.items():
            sizes.setdefault(len(data), []).append(data)
        budget = 0
        for size, datas in sizes.items():
            if size == 0 or len(datas) < 2:
                continue
            budget += len(datas) * min(size, _L3_PAGE)
            if size > _L3_PAGE:
                starts = [d[:_L3_PAGE] for d in datas]
                budget += size * sum(1 for s in starts if starts.count(s) > 1)
        assert fs.bytes_read <= budget, f"trial {trial}: read {fs.bytes_read} bytes, budget {budget}"
`

const L3_SOLUTION = withFS(py`
import hashlib
from collections import defaultdict

PARTIAL_BYTES = 4096  # the partial hash covers the first 4 KiB
CHUNK_BYTES = 64 * 1024  # full hashes read 64 KiB at a time


def _files(fs, root):
    """Regular files under root. Symlinks are skipped: a link is not a second copy."""
    return (path for path in fs.walk(root) if not fs.is_symlink(path))


def group_by_size(fs, root):
    """Group the files under root by size: {size: sorted paths} for sizes shared by 2+ files."""
    by_size = defaultdict(list)
    for path in _files(fs, root):
        by_size[fs.size(path)].append(path)
    return {size: sorted(paths) for size, paths in by_size.items() if len(paths) > 1}


def _partial_hash(fs, path):
    with fs.open(path) as f:
        return hashlib.sha256(f.read(PARTIAL_BYTES)).hexdigest()


def _full_hash(fs, path):
    h = hashlib.sha256()
    with fs.open(path) as f:
        while True:
            chunk = f.read(CHUNK_BYTES)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def _buckets(paths, key):
    """Split paths by key(path); keep only the buckets holding 2+ paths."""
    by_key = defaultdict(list)
    for path in paths:
        by_key[key(path)].append(path)
    return [bucket for bucket in by_key.values() if len(bucket) > 1]


def find_duplicates(fs, root, include_empty=False):
    """Groups of identical files: size, then first-4 KiB hash, then full hash."""
    groups = []
    for size, paths in group_by_size(fs, root).items():
        if size == 0:
            if include_empty:
                groups.append(paths)  # all empty files are identical: nothing to read
            continue
        for same_start in _buckets(paths, lambda p: _partial_hash(fs, p)):
            if size <= PARTIAL_BYTES:
                groups.append(same_start)  # the partial hash already covered every byte
            else:
                groups.extend(_buckets(same_start, lambda p: _full_hash(fs, p)))
    return sorted(sorted(group) for group in groups)
`)

const level3: LabLevel = {
  title: 'Symlinks, empty files, a read budget',
  spec: `Real disks are messy, and reading is the expensive part. From now on the tests count every byte you read (\`fs.bytes_read\`) and every \`open\`.

**Symlinks.** A link isn't a second copy of a file, and it may point nowhere. \`group_by_size\` and \`find_duplicates\` skip every path where \`fs.is_symlink(path)\` is true. Don't call \`fs.size\` on one first: a dangling link raises \`FileNotFoundError\`.

**Empty files.** Add a flag: \`find_duplicates(fs, root, include_empty=False)\`. By default, zero-byte files are left out: they're trivially identical, and deleting them frees nothing. With \`include_empty=True\`, all the empty files form one group, without opening any of them. \`group_by_size\` still reports size \`0\` like any other size.

**Read budget:**
- A file whose size is unique is never opened.
- The partial pass reads only the first 4096 bytes of a file.
- A file is read in full only if its partial hash matched another file's.
- A file of 4096 bytes or less is opened **once**: its partial hash already covers every byte.

Example: 20 files of 256 KiB that differ in their first byte should cost 80 KiB of reads (20 × 4 KiB), not 5 MiB.`,
  tests: L3_TESTS,
  hints: [
    'Filter symlinks in one place: a helper that yields the regular files under `root`. Use it in `group_by_size` and `find_duplicates` gets the skip for free.',
    'Handle size `0` before any hashing: skip that group, or append it unread when `include_empty` is true.',
    'After the partial pass, look at the size: if it is `<= 4096`, the partial-hash buckets are already the final groups, so skip the full pass.',
  ],
  solution: L3_SOLUTION,
}

/* ---------------------------------------------------------------- level 4 */

const L4_TESTS = py`
import random as _l4_random

_L4_KEYS = {"groups", "wasted_bytes", "keep", "delete", "files_scanned"}


def _l4_example_fs():
    return FakeFS({
        "/a.jpg": b"J" * 1000, "/b/a.jpg": b"J" * 1000, "/c.jpg": b"J" * 1000,
        "/x.txt": b"T" * 300, "/y.txt": b"T" * 300,
        "/unique.bin": b"U" * 50,
    })


def test_l4_report_keys():
    got = report(_l4_example_fs(), "/")
    assert isinstance(got, dict), f"report should return a dict, got {type(got).__name__}"
    missing = _L4_KEYS - set(got)
    assert not missing, f"report is missing keys {sorted(missing)}"


def test_l4_spec_example():
    got = report(_l4_example_fs(), "/")
    assert got["groups"] == [["/a.jpg", "/b/a.jpg", "/c.jpg"], ["/x.txt", "/y.txt"]], f"groups: {got['groups']!r}"
    assert got["wasted_bytes"] == 2300, f"2 extra copies of 1000 bytes + 1 extra of 300 = 2300, got {got['wasted_bytes']!r}"
    assert got["keep"] == ["/a.jpg", "/x.txt"], f"keep: {got['keep']!r}"
    assert got["delete"] == ["/b/a.jpg", "/c.jpg", "/y.txt"], f"delete: {got['delete']!r}"


def test_l4_no_duplicates():
    got = report(FakeFS({"/a": b"1", "/b": b"22"}), "/")
    assert got["groups"] == [] and got["keep"] == [] and got["delete"] == [], f"got {got!r}"
    assert got["wasted_bytes"] == 0, f"wasted_bytes should be 0, got {got['wasted_bytes']!r}"


def test_l4_groups_ordered_by_waste():
    fs = FakeFS({
        "/small1": b"s" * 10, "/small2": b"s" * 10, "/small3": b"s" * 10, "/small4": b"s" * 10,
        "/big1": b"b" * 500, "/big2": b"b" * 500,
        "/mid1": b"m" * 100, "/mid2": b"m" * 100,
    })
    got = report(fs, "/")["groups"]
    want = [["/big1", "/big2"], ["/mid1", "/mid2"], ["/small1", "/small2", "/small3", "/small4"]]
    assert got == want, f"largest waste first (500, 100, 30)\n  got:  {got!r}\n  want: {want!r}"


def test_l4_ties_broken_by_first_path():
    fs = FakeFS({"/q1": b"q" * 40, "/q2": b"q" * 40, "/b1": b"b" * 40, "/b2": b"b" * 40})
    got = report(fs, "/")["groups"]
    assert got == [["/b1", "/b2"], ["/q1", "/q2"]], f"equal waste: order by first path; got {got!r}"


def test_l4_keep_smallest_path_delete_rest():
    fs = FakeFS({"/z/photo.jpg": b"p" * 64, "/a/photo.jpg": b"p" * 64, "/m/photo.jpg": b"p" * 64})
    got = report(fs, "/")
    assert got["keep"] == ["/a/photo.jpg"], f"keep the lexicographically smallest path; got {got['keep']!r}"
    assert got["delete"] == ["/m/photo.jpg", "/z/photo.jpg"], f"delete: {got['delete']!r}"


def test_l4_files_scanned():
    fs = FakeFS(
        {"/a": b"1", "/b": b"1", "/e": b"", "/sub/c": b"22", "/elsewhere/d": b"1"},
        symlinks={"/link": "/a"},
    )
    got = report(fs, "/")["files_scanned"]
    assert got == 5, f"5 regular files (symlinks don't count, empty files do); got {got!r}"
    got = report(fs, "/sub")["files_scanned"]
    assert got == 1, f"only files under root count; got {got!r}"


def test_l4_include_empty_passthrough():
    fs = FakeFS({"/e1": b"", "/e2": b"", "/a": b"aa", "/b": b"aa"})
    plain = report(fs, "/")
    assert plain["groups"] == [["/a", "/b"]], f"empty files are left out by default; got {plain['groups']!r}"
    got = report(fs, "/", include_empty=True)
    assert got["groups"] == [["/a", "/b"], ["/e1", "/e2"]], f"include_empty=True: got {got['groups']!r}"
    assert got["wasted_bytes"] == 2, f"empty files waste 0 bytes; got {got['wasted_bytes']!r}"
    assert got["delete"] == ["/b", "/e2"], f"delete: {got['delete']!r}"


def test_l4_prefer_directory():
    fs = FakeFS({
        "/a/img.png": b"i" * 90, "/originals/img.png": b"i" * 90, "/z/img.png": b"i" * 90,
        "/a/doc.txt": b"d" * 70, "/b/doc.txt": b"d" * 70,
    })
    got = report(fs, "/", prefer="/originals")
    assert got["keep"] == ["/a/doc.txt", "/originals/img.png"], (
        f"keep the copy under prefer when a group has one, else the smallest path; got {got['keep']!r}"
    )
    assert got["delete"] == ["/a/img.png", "/b/doc.txt", "/z/img.png"], f"delete: {got['delete']!r}"


def test_l4_prefer_matches_whole_directory_names():
    fs = FakeFS({"/a/x": b"x" * 30, "/originals-old/x": b"x" * 30, "/originals/x": b"x" * 30})
    got = report(fs, "/", prefer="/originals")["keep"]
    assert got == ["/originals/x"], (
        f"/originals-old is not inside /originals: match on the directory plus '/'; got {got!r}"
    )


def test_l4_reads_no_more_than_find_duplicates():
    big = b"r" * 50_000
    files = {"/a": big, "/b": big, "/c": b"c" + big[1:], "/d": b"tiny", "/e": b"tiny"}
    fs1, fs2 = FakeFS(files), FakeFS(files)
    find_duplicates(fs1, "/")
    report(fs2, "/")
    assert fs2.bytes_read <= fs1.bytes_read, (
        f"report read {fs2.bytes_read} bytes but find_duplicates needs only {fs1.bytes_read}: don't hash twice"
    )


def test_l4_plan_is_safe_random():
    rng = _l4_random.Random(99)
    for trial in range(20):
        files = {}
        for i in range(rng.randrange(2, 30)):
            size = rng.choice([1, 3, 5000, 6000])
            files[f"/{rng.choice('abc')}/f{i:02}"] = bytes([rng.randrange(3)]) * size
        prefer = rng.choice([None, "/b"])
        got = report(FakeFS(files), "/", prefer=prefer)
        kept, deleted = got["keep"], got["delete"]
        assert kept == sorted(kept) and deleted == sorted(deleted), f"trial {trial}: keep and delete must be sorted"
        assert not set(kept) & set(deleted), f"trial {trial}: a path is in both keep and delete"
        grouped = sorted(p for g in got["groups"] for p in g)
        assert sorted(kept + deleted) == grouped, f"trial {trial}: keep + delete must cover every grouped path once"
        assert len(kept) == len(got["groups"]), f"trial {trial}: keep exactly one path per group"
        for group in got["groups"]:
            assert len({files[p] for p in group}) == 1, f"trial {trial}: group {group} mixes different contents"
        wasted = sum(len(files[p]) for p in deleted)
        assert got["wasted_bytes"] == wasted, f"trial {trial}: wasted_bytes {got['wasted_bytes']} != {wasted}"
`

const L4_SOLUTION = withFS(py`
import hashlib
from collections import defaultdict

PARTIAL_BYTES = 4096  # the partial hash covers the first 4 KiB
CHUNK_BYTES = 64 * 1024  # full hashes read 64 KiB at a time


def _files(fs, root):
    """Regular files under root. Symlinks are skipped: a link is not a second copy."""
    return (path for path in fs.walk(root) if not fs.is_symlink(path))


def group_by_size(fs, root):
    """Group the files under root by size: {size: sorted paths} for sizes shared by 2+ files."""
    by_size = defaultdict(list)
    for path in _files(fs, root):
        by_size[fs.size(path)].append(path)
    return {size: sorted(paths) for size, paths in by_size.items() if len(paths) > 1}


def _partial_hash(fs, path):
    with fs.open(path) as f:
        return hashlib.sha256(f.read(PARTIAL_BYTES)).hexdigest()


def _full_hash(fs, path):
    h = hashlib.sha256()
    with fs.open(path) as f:
        while True:
            chunk = f.read(CHUNK_BYTES)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def _buckets(paths, key):
    """Split paths by key(path); keep only the buckets holding 2+ paths."""
    by_key = defaultdict(list)
    for path in paths:
        by_key[key(path)].append(path)
    return [bucket for bucket in by_key.values() if len(bucket) > 1]


def find_duplicates(fs, root, include_empty=False):
    """Groups of identical files: size, then first-4 KiB hash, then full hash."""
    groups = []
    for size, paths in group_by_size(fs, root).items():
        if size == 0:
            if include_empty:
                groups.append(paths)  # all empty files are identical: nothing to read
            continue
        for same_start in _buckets(paths, lambda p: _partial_hash(fs, p)):
            if size <= PARTIAL_BYTES:
                groups.append(same_start)  # the partial hash already covered every byte
            else:
                groups.extend(_buckets(same_start, lambda p: _full_hash(fs, p)))
    return sorted(sorted(group) for group in groups)


def _keeper(group, prefer):
    """The path to keep: the smallest one under prefer if any, else the smallest overall."""
    if prefer:
        inside = prefer.rstrip("/") + "/"
        preferred = [p for p in group if p.startswith(inside)]
        if preferred:
            return min(preferred)
    return min(group)


def report(fs, root, include_empty=False, prefer=None):
    """A cleanup plan: duplicate groups (most wasteful first), bytes to free, keep/delete lists."""
    sized = [(fs.size(group[0]), group) for group in find_duplicates(fs, root, include_empty)]
    sized.sort(key=lambda sg: (-sg[0] * (len(sg[1]) - 1), sg[1][0]))
    keep, delete = [], []
    for _, group in sized:
        kept = _keeper(group, prefer)
        keep.append(kept)
        delete.extend(p for p in group if p != kept)
    return {
        "groups": [group for _, group in sized],
        "wasted_bytes": sum(size * (len(group) - 1) for size, group in sized),
        "keep": sorted(keep),
        "delete": sorted(delete),
        "files_scanned": sum(1 for _ in _files(fs, root)),
    }
`)

const level4: LabLevel = {
  title: 'The cleanup report',
  spec: `Finding duplicates is half the job: the user wants to know what to delete and what it buys them. Write \`report(fs, root, include_empty=False, prefer=None)\` returning a dict:

- \`"groups"\`: the groups from \`find_duplicates\`, ordered by **wasted bytes**, largest first. A group of \`n\` files of size \`s\` wastes \`s * (n - 1)\` bytes. Break ties by the group's first path.
- \`"wasted_bytes"\`: the total over all groups, which is what keeping one copy of each would free.
- \`"keep"\`: one path per group, sorted. Keep the lexicographically **smallest** path in each group.
- \`"delete"\`: every other path in the groups, sorted.
- \`"files_scanned"\`: how many regular files are under \`root\`. Symlinks don't count; empty files do.

\`prefer\` is an optional directory, like \`"/originals"\`. When a group has files inside it, keep the smallest of **those** instead. A group with nothing inside it falls back to its smallest path.

Don't hash anything twice: \`report\` must read no more bytes than one \`find_duplicates\` call does.

Example: \`/a.jpg\`, \`/b/a.jpg\` and \`/c.jpg\` hold the same 1000 bytes, \`/x.txt\` and \`/y.txt\` share 300 bytes, and \`/unique.bin\` is unique.

\`report(fs, "/")["groups"]\` → \`[["/a.jpg", "/b/a.jpg", "/c.jpg"], ["/x.txt", "/y.txt"]]\`
\`"wasted_bytes"\` → \`2300\`
\`"keep"\` → \`["/a.jpg", "/x.txt"]\`
\`"delete"\` → \`["/b/a.jpg", "/c.jpg", "/y.txt"]\`
\`"files_scanned"\` → \`6\``,
  tests: L4_TESTS,
  hints: [
    "Call `find_duplicates` once. A group's size is `fs.size(group[0])`, which reads no bytes.",
    'Sort the groups with the key `(-wasted, group[0])`: largest waste first, first path as the tie-break.',
    "For `prefer`, match on `prefer.rstrip('/') + '/'`, so `/originals` doesn't also match `/originals-old/x`. Take `min()` of the matches, or of the whole group when nothing matches.",
  ],
  solution: L4_SOLUTION,
}

/* -------------------------------------------------------------------- lab */

const lab: Lab = {
  id: 'file-dedup',
  title: 'File deduplicator',
  area: 'builds',
  summary:
    'Find duplicate files on a fake disk with the classic **size → partial hash → full hash** funnel, then make it frugal with reads, survive symlinks and empty files, and produce a safe cleanup plan.',
  minutes: 60,
  starter: STARTER,
  levels: [level1, level2, level3, level4],
  followUps: [
    'The disk holds 2 TB in 10 million files. Which pass dominates the run time, and how would you parallelize the hashing? Are threads enough here, given that `hashlib` releases the GIL while it hashes large buffers?',
    'Files can change while you scan. How do you make sure you never delete a file whose content changed after you hashed it? Think about re-checking size and mtime, or a byte-for-byte compare right before deleting.',
    'A SHA-256 collision between two different files is astronomically unlikely. Would you still byte-compare before deleting? How would you explain the tradeoff to a user whose photos are at stake?',
    'On a real disk, hard links make one file appear under two paths, and a symlink to a directory can make a naive walk loop forever. How would you detect both with `os.stat` (device and inode numbers) and `os.walk(followlinks=False)`?',
  ],
}

export default lab
