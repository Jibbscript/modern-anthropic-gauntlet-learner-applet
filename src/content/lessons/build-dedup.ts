import type { Lesson } from '../../core/types'

const lesson: Lesson = {
  id: 'build-dedup',
  title: 'File deduplication',
  summary: 'Find duplicate files while reading as few bytes as possible, then survive a hostile filesystem.',
  minutes: 8,
  skills: ['build.dedup', 'conc.models'],
  steps: [
    {
      kind: 'concept',
      id: 'hook',
      eyebrow: 'Build round',
      title: 'Two terabytes, one question',
      body:
        'Candidates report file deduplication among the practical coding questions. The obvious answer is one line: hash every file, group by hash.\n\n' +
        "On a 2 TB drive, that line reads 2 TB. At 500 MB/s that's over an hour, and most of it is wasted. A file whose size no other file shares can't have a duplicate. The real problem is ==avoiding reads==.",
      callout: {
        tone: 'tip',
        text: 'The arc candidates describe: make it work, extend it, make it concurrent, test it yourself. This lesson follows the same path.',
      },
    },
    {
      kind: 'mcq',
      id: 'free-filter',
      eyebrow: 'Warm-up',
      prompt: 'Which file can you rule out as a duplicate without reading a single byte of its contents?',
      choices: [
        {
          text: 'A 7,340,032-byte file no other file matches in size',
          correct: true,
          feedback: 'Right. Size comes from metadata, and files of different sizes cannot be identical.',
        },
        {
          text: 'Two 1 MB files with different names and folders',
          feedback: 'Names are labels, not bytes. Same size means both stay candidates.',
        },
        {
          text: 'A file modified today whose twin is from 2019',
          feedback: 'Copying a file usually gives it a fresh modification time. mtime says nothing about content.',
        },
        {
          text: "A file whose first 4 KB match another file's",
          feedback: 'You had to read 4 KB to learn that, and matching heads keep a file in the running, not out.',
        },
      ],
      explanation:
        'Size is free: it comes from the directory metadata you fetch while walking. Duplicates must have equal sizes, so a size that appears once eliminates that file with zero content reads.',
      hint: 'Which property can you get without opening the file, and must match for two files to be identical?',
    },
    {
      kind: 'concept',
      id: 'funnel',
      title: 'The funnel',
      body:
        'Run cheap filters first and expensive ones only on survivors.\n\n' +
        '1. **Group by size.** Metadata only. Drop groups of one.\n' +
        '2. **Hash the first 4 KB** of each survivor. Same-size files often differ early.\n' +
        '3. **Full-hash** whatever still collides.\n\n' +
        'The first two stages can only prove files *different*. Only the last one proves them the same.',
      code: {
        code: `from collections import defaultdict

def by_size(paths):
    groups = defaultdict(list)
    for p in paths:
        groups[os.path.getsize(p)].append(p)
    return [g for g in groups.values() if len(g) > 1]`,
        caption: 'Stage 1: one `stat` per file, no content reads.',
      },
    },
    {
      kind: 'widget',
      id: 'run-funnel',
      eyebrow: 'Try it',
      prompt:
        'Run the funnel on this folder. Advance through all three stages, watch the bytes-read meter against hashing everything, then tap every duplicate group.',
      goal: 'Tap every duplicate group',
      widget: {
        id: 'dedup',
        config: {
          goal: 'groups',
          files: [
            { name: 'IMG_2041.jpg', size: 2400000, head: 'ffd8e0a1', body: '91c3' },
            { name: 'IMG_2041 (1).jpg', size: 2400000, head: 'ffd8e0a1', body: '91c3' },
            { name: 'beach.jpg', size: 2400000, head: 'ffd8e0b7', body: '04ae' },
            { name: 'report.pdf', size: 880000, head: '25504446', body: 'aa10' },
            { name: 'report-final.pdf', size: 880000, head: '25504446', body: 'aa27' },
            { name: 'report-v2.pdf', size: 880000, head: '25504446', body: 'aa10' },
            { name: 'song.mp3', size: 5100000, head: '49443303', body: '7d2e' },
            { name: 'song-backup.mp3', size: 5100000, head: '49443303', body: '7d2e' },
            { name: 'notes.txt', size: 1200, head: '4e6f7465', body: '' },
            { name: 'todo.md', size: 640, head: '2d205b20', body: '' },
            { name: 'demo.mp4', size: 48000000, head: '00000020', body: 'c0de' },
          ],
        },
      },
      explanation:
        'Three groups: the two photos, the two songs, and report.pdf with report-v2.pdf. report-final.pdf survived until the last stage: same size, same PDF header, different body. The head check rules files out; it never rules them in.',
    },
    {
      kind: 'numeric',
      id: 'gb-saved',
      eyebrow: 'Estimate',
      prompt:
        'A drive holds 10,000 files, 50 GB in total. After grouping by size, 400 files (8 GB) share a size with another file. Hashing the first 4 KB of those 400 leaves 60 files (3 GB) still colliding.\n\nCompared with hashing every byte, roughly how many GB of reading does the funnel avoid?',
      answer: 47,
      tolerance: 0.05,
      unit: 'GB',
      explanation:
        'The funnel reads 400 × 4 KB ≈ 1.6 MB of heads plus 3 GB of full hashes: about 3 GB. So 50 − 3 ≈ 47 GB is never read. The head stage cleared 5 GB of same-size files for the price of 1.6 MB.',
      hint: 'Grouping by size reads no content. Add up what stages 2 and 3 read, then subtract from 50.',
    },
    {
      kind: 'concept',
      id: 'stream',
      title: "Stream, don't slurp",
      body:
        "`f.read()` pulls the whole file into memory. On a 40 GB disk image that's a `MemoryError`, or a machine deep in swap. Hash in fixed-size chunks instead: memory stays at one buffer whatever the file size, and 64 KiB to 1 MiB chunks keep per-call overhead negligible.\n\n" +
        'Python 3.11 added `hashlib.file_digest`, which runs that loop for you. Know how to write it by hand anyway.',
      code: {
        code: `def head_hash(path, n=4096):
    with open(path, "rb") as f:
        return hashlib.sha256(f.read(n)).hexdigest()

def full_hash_311(path):
    with open(path, "rb") as f:
        return hashlib.file_digest(f, "sha256").hexdigest()`,
        caption: '`read(n)` is bounded, so the head hash is safe on any file size.',
      },
    },
    {
      kind: 'cloze',
      id: 'chunk-loop',
      eyebrow: 'Your turn',
      prompt: 'Write the streaming hash by hand: open the file for binary reading and feed SHA-256 64 KiB at a time.',
      code: `import hashlib

def full_hash(path):
    h = hashlib.sha256()
    with open(path, {{0}}) as f:
        while chunk := f.read({{1}}):
            h.{{2}}(chunk)
    return h.{{3}}()`,
      blanks: [
        { options: ['"rb"', '"r"', '"wb"'], answer: 0 },
        { options: ['1 << 16', '-1', '64'], answer: 0 },
        { options: ['update', 'append', 'digest'], answer: 0 },
        { options: ['hexdigest', 'read', 'final'], answer: 0 },
      ],
      explanation:
        '`"rb"` yields bytes; text mode yields `str`, which hashlib rejects (and `"wb"` truncates the file). `1 << 16` is 65,536 bytes; `-1` reads everything and `64` reads 64 bytes. `update` feeds data incrementally, and `hexdigest()` returns a string you can group on. The loop ends when `read` returns `b""`.',
      hint: 'Hash objects are fed piece by piece, and `read(n)` takes a byte count.',
    },
    {
      kind: 'spotbug',
      id: 'path-hash',
      eyebrow: 'Find the bug',
      prompt:
        '`find_candidates` should return the groups that survive the size and head checks. On a folder full of known duplicates it returns `[]`. Tap the bug.',
      code: `def head_hash(path, n=4096):
    with open(path, "rb") as f:
        head = f.read(n)
    return hashlib.sha256(path.encode()).hexdigest()

def find_candidates(paths):
    survivors = []
    for group in by_size(paths):
        heads = defaultdict(list)
        for p in group:
            heads[head_hash(p)].append(p)
        survivors += [g for g in heads.values()
                      if len(g) > 1]
    return survivors`,
      bugLines: [4],
      explanation:
        'Line 4 hashes the *path*, not the bytes it just read. Every path is unique, so every group splits into singletons. It slips past review because the function does open and read the file. A test with two identical files in different folders catches it instantly.',
      fix: { code: '    return hashlib.sha256(head).hexdigest()' },
      hint: 'Look at exactly what gets fed to SHA-256.',
    },
    {
      kind: 'concept',
      id: 'walk',
      title: 'Walk lazily, skip what lies',
      body:
        'Write the walk as a generator over `os.scandir`: it yields files as it reads each directory, so a million-file folder never becomes a million-item list. `is_file(follow_symlinks=False)` skips symlinks; follow one and its target gets hashed twice and flagged as its own duplicate. Catch `PermissionError` per directory and keep going. Note that `os.walk` skips unreadable directories silently unless you pass `onerror`.',
      code: {
        code: `def walk(top):
    stack = [top]
    while stack:
        d = stack.pop()
        try:
            with os.scandir(d) as it:
                for e in it:
                    if e.is_dir(follow_symlinks=False):
                        stack.append(e.path)
                    elif e.is_file(follow_symlinks=False):
                        yield e
        except PermissionError as err:
            log.warning("skip %s: %s", d, err)`,
      },
    },
    {
      kind: 'match',
      id: 'edge-cases',
      eyebrow: 'Hostile filesystem',
      prompt: 'Match each filesystem surprise to how a solid dedup tool handles it.',
      pairs: [
        { left: 'A symlink to a file in the tree', right: 'Skip it: the target is walked anyway' },
        { left: 'Two hardlinks to one inode', right: 'Collapse by `(st_dev, st_ino)` before hashing' },
        { left: "A directory you can't read", right: 'Log the error and keep walking' },
        { left: 'Ten thousand zero-byte files', right: 'Group them by size alone, no reads' },
        { left: 'A file deleted mid-scan', right: 'Catch `FileNotFoundError` on open' },
      ],
      explanation:
        'Hardlinks are the subtle one: two names, one set of bytes on disk. They really are identical, but deleting one frees nothing, so skip or report them separately. `st_ino` is only unique within one filesystem; pair it with `st_dev`. Empty files are all equal, so hashing them is wasted work.',
    },
    {
      kind: 'concept',
      id: 'threads',
      title: 'Parallel hashing: threads are fine',
      body:
        'Hashing is reading plus SHA-256, and threads help with both. A thread blocked on a read releases the GIL, and `hashlib` releases it while hashing buffers over 2 KB, so threads genuinely hash on several cores at once.\n\n' +
        'The caveat: on a spinning disk, parallel reads make the head seek between files and can be *slower*. Measure.',
      code: {
        code: `from concurrent.futures import ThreadPoolExecutor

def hash_all(paths, workers=8):
    by_hash = defaultdict(list)
    with ThreadPoolExecutor(workers) as pool:
        digests = pool.map(full_hash, paths)
        for p, d in zip(paths, digests):
            by_hash[d].append(p)
    return [g for g in by_hash.values() if len(g) > 1]`,
        caption: '`pool.map` returns results in input order, so `zip` pairs them correctly.',
      },
      callout: {
        tone: 'source',
        text: '[hashlib docs](https://docs.python.org/3/library/hashlib.html): the GIL is released for data larger than 2047 bytes at object creation or on update.',
      },
    },
    {
      kind: 'mcq',
      id: 'speed-up',
      eyebrow: 'Make it faster',
      prompt:
        'The interviewer says: "3,000 candidate files, 8 cores, an NVMe SSD. Make the full-hash stage faster." What is your first move?',
      choices: [
        {
          text: 'Map `full_hash` over the files with a `ThreadPoolExecutor`',
          correct: true,
          feedback: 'Reads and hashing both release the GIL, and an SSD rewards several reads in flight.',
        },
        {
          text: 'Map `full_hash` over the files with a `ProcessPoolExecutor`',
          feedback:
            'It works, but you pay process startup and pickling for a bottleneck threads already handle. Processes pay off when Python bytecode itself is the CPU cost.',
        },
        {
          text: 'Rewrite the reads with `asyncio.gather`',
          feedback:
            'asyncio has no native async file IO; regular reads block the event loop. You would end up in `asyncio.to_thread`, which is a thread pool with extra steps.',
        },
        {
          text: 'Read each file in one call to cut syscalls',
          feedback: 'At 64 KiB per call the syscall overhead is already tiny, and whole-file reads bring back the memory blowup.',
        },
      ],
      explanation:
        'Threads fit because the work is IO plus C code that drops the GIL. Say that reasoning out loud, then measure: once the disk is saturated, more workers just queue.',
    },
    {
      kind: 'interview',
      id: 'pushback',
      eyebrow: 'Interview sim',
      setup: 'Your funnel works on the sample folder. The interviewer starts pushing on it.',
      turns: [
        {
          interviewer:
            'A user deleted one of two 4 GB files your tool flagged as duplicates and got no disk space back. What happened?',
          options: [
            {
              text: "Maybe it went to the trash, or the filesystem keeps snapshots. I'd check `df` and the trash first.",
              quality: 'okay',
              feedback: 'Reasonable debugging, but it skips the likeliest cause: something your own tool got wrong.',
            },
            {
              text: "Probably hardlinks: two names for one inode. I'd collapse files by `(st_dev, st_ino)` before hashing and report hardlinks separately.",
              quality: 'strong',
              feedback: 'Names the mechanism, the fix, and what the user should see.',
            },
            {
              text: "SHA-256 must have collided on those two files. I'd switch to SHA-512.",
              quality: 'weak',
              feedback: 'An accidental SHA-256 collision is not a realistic event. Blaming the hash hides a real bug.',
            },
          ],
        },
        {
          interviewer: 'Before deleting anything, should the tool byte-compare files whose hashes match?',
          options: [
            {
              text: "Accidental SHA-256 collisions aren't a practical risk; bugs in my code are. On the delete path I'd offer a byte-for-byte check and say it costs another full read.",
              quality: 'strong',
              feedback: 'Separates the real risk from the imagined one, and prices the cost.',
            },
            {
              text: "No. And I'd switch to MD5 to make hashing faster.",
              quality: 'weak',
              feedback: 'MD5 has practical collision attacks, so crafted files can match. And IO, not hashing, is usually the bottleneck.',
            },
            {
              text: 'Yes, always. Hashes can collide.',
              quality: 'okay',
              feedback: 'Safe, but it doubles the IO on every duplicate and misplaces the risk.',
            },
          ],
        },
        {
          interviewer: 'How do you test this?',
          options: [
            {
              text: "The logic is simple. I'd run it on my Downloads folder and eyeball the output.",
              quality: 'weak',
              feedback: "A smoke test isn't a test: you can't tell a silent miss from a clean folder.",
            },
            {
              text: 'Two identical files and one different file in a temp dir; assert one group.',
              quality: 'okay',
              feedback: 'A real test, but it cannot catch a broken head stage or any of the link cases.',
            },
            {
              text: 'Fixtures in `tmp_path`: same size but different content, same first 4 KB but different tails, empty files, a hardlink, a symlink, an unreadable dir. Assert exact groups.',
              quality: 'strong',
              feedback: 'Each fixture targets one stage or one filesystem trap. That is testing your own implementation.',
            },
          ],
        },
      ],
      wrapUp: 'The pattern in all three strong answers: name the mechanism, size the cost, and turn each edge case into a test.',
    },
    {
      kind: 'concept',
      id: 'recap',
      eyebrow: 'Recap',
      title: 'What to remember',
      body:
        '1. **Funnel**: size (free) → first 4 KB → full hash, each stage only on survivors.\n' +
        '2. **Stream**: open `"rb"` and hash 64 KiB chunks. Never `read()` a whole file.\n' +
        '3. **Distrust the filesystem**: skip symlinks, collapse `(st_dev, st_ino)`, catch errors per entry, walk with a generator. Then parallelize with threads: IO and `hashlib` both release the GIL.',
      callout: { tone: 'tip', text: 'Build it end to end in the **File deduplicator** Code Lab on the Practice tab.' },
    },
  ],
  cards: [
    {
      id: 'build-dedup.funnel-order',
      skill: 'build.dedup',
      kind: 'order',
      prompt: 'Order the stages of a dedup tool that reads as few bytes as possible.',
      items: [
        'Walk the tree with a generator, skipping symlinks',
        'Group files by size and drop groups of one',
        'Hash the first 4 KB of each remaining file',
        'Full-hash files whose head hashes still match',
        'Report groups that share a full hash',
      ],
      explanation: 'Cheapest filter first. Size needs only metadata, the head needs 4 KB, and only true collisions pay for a full read.',
    },
    {
      id: 'build-dedup.slurp',
      skill: 'build.dedup',
      kind: 'spotbug',
      prompt: 'Correct on small files, but the process is killed for memory on a folder holding a 40 GB VM image. Tap the line to change.',
      code: `def full_hash(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        data = f.read()
        h.update(data)
    return h.hexdigest()

def hash_group(paths):
    out = defaultdict(list)
    for p in paths:
        out[full_hash(p)].append(p)
    return out`,
      bugLines: [4],
      explanation: '`f.read()` with no size loads the whole file. Read fixed-size chunks in a loop and update the hash with each one.',
      fix: {
        code: `        while chunk := f.read(1 << 16):
            h.update(chunk)`,
      },
    },
    {
      id: 'build-dedup.walk-errors',
      skill: 'build.dedup',
      kind: 'mcq',
      prompt: '`os.walk(top)` reaches a subdirectory it has no permission to read. With default arguments, what happens?',
      choices: [
        { text: 'It skips that directory silently', correct: true, feedback: 'Yes. Pass `onerror` if you want to know.' },
        {
          text: 'It raises `PermissionError` and the walk stops',
          feedback: 'Calling `os.scandir` on it directly would raise. `os.walk` swallows the error unless you pass `onerror`.',
        },
        {
          text: 'It yields the directory with empty file lists',
          feedback: "The directory shows up in its parent's `dirs`, but the walk never yields it.",
        },
        { text: 'It retries the directory after the rest of the walk', feedback: 'There is no retry. The error is dropped.' },
      ],
      explanation: 'Silent skips mean a dedup report can look complete when it is not. Pass `onerror=` and log, or write your own `scandir` walker.',
    },
    {
      id: 'build-dedup.gil',
      skill: 'conc.models',
      kind: 'flash',
      front: 'Why can threads speed up file hashing in CPython despite the GIL?',
      back: 'Blocking file reads release the GIL, and `hashlib` releases it while hashing buffers over 2047 bytes. So several threads read and hash on several cores at once.',
    },
    {
      id: 'build-dedup.naive-cost',
      skill: 'build.dedup',
      kind: 'numeric',
      prompt: 'Naive dedup hashes every byte. About how many minutes does that take for a 1 TB drive read at 250 MB/s?',
      answer: 66.7,
      tolerance: 0.15,
      unit: 'min',
      explanation: '10¹² bytes ÷ 2.5 × 10⁸ bytes/s = 4,000 s ≈ 67 minutes. A size-first funnel often cuts that to a few minutes.',
    },
    {
      id: 'build-dedup.skip-or-hash',
      skill: 'build.dedup',
      kind: 'sort',
      prompt: 'Which files need content hashing, and which can be settled without it?',
      buckets: [
        { id: 'skip', label: 'No hashing needed' },
        { id: 'hash', label: 'Must be hashed' },
      ],
      items: [
        { text: 'A file whose size is unique', bucket: 'skip', why: 'Different sizes cannot be identical.' },
        { text: 'A symlink to a file already in the tree', bucket: 'skip', why: 'Its target is walked on its own.' },
        { text: 'A second hardlink to an inode already seen', bucket: 'skip', why: 'Same `(st_dev, st_ino)`, same bytes on disk.' },
        { text: 'Zero-byte files', bucket: 'skip', why: 'All empty files are equal.' },
        { text: 'Two same-size files with different names', bucket: 'hash', why: 'Names say nothing about content.' },
        { text: 'Same-size files whose first 4 KB match', bucket: 'hash', why: 'They can still differ later in the file.' },
      ],
      explanation: 'Everything decided by metadata (size, link type, inode) costs no reads. Hashing is for files metadata cannot tell apart.',
    },
    {
      id: 'build-dedup.nofollow',
      skill: 'build.dedup',
      kind: 'cloze',
      prompt: 'Complete the walker so it yields regular files and never follows a symlink.',
      code: `def walk(top):
    stack = [top]
    while stack:
        with os.scandir(stack.pop()) as it:
            for e in it:
                if e.is_dir(follow_symlinks=False):
                    stack.append(e.path)
                elif e.{{0}}(follow_symlinks={{1}}):
                    yield e`,
      blanks: [
        { options: ['is_file', 'is_symlink', 'stat'], answer: 0 },
        { options: ['False', 'True', '"auto"'], answer: 0 },
      ],
      explanation: '`is_file()` follows symlinks by default, so a link to a file counts as a file. With `follow_symlinks=False` it is true only for real regular files.',
    },
  ],
}

export default lesson
