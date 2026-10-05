import type { Step } from '../../core/types'

/** Cloze fixtures: multi-blank, two blanks on one line, blank inside an f-string, long line, single blank, plain-text phrases. */
const steps: Step[] = [
  {
    kind: 'cloze',
    id: 'fx-cloze',
    eyebrow: 'Your turn',
    prompt: 'Cap the crawler at **10 requests in flight**. Fill in the blanks.',
    code: [
      'async def fetch_all(urls, limit=10):',
      '    sem = asyncio.{{0}}(limit)',
      '',
      '    async def fetch(url):',
      '        async {{1}} sem:',
      '            return await client.get(url)',
      '',
      '    return await asyncio.{{2}}(*(fetch(u) for u in urls))',
    ].join('\n'),
    blanks: [
      { options: ['Semaphore', 'Lock', 'Queue', 'Event'], answer: 0 },
      { options: ['with', 'for', 'await'], answer: 0 },
      { options: ['gather', 'wait_for', 'run'], answer: 0 },
    ],
    explanation:
      'A `Semaphore(limit)` lets at most `limit` coroutines inside the `async with` block at once. `gather` runs every fetch concurrently and collects the results in order.',
    hint: 'Which primitive counts how many holders it allows, instead of just one?',
  },
  {
    kind: 'cloze',
    id: 'fx-cloze-counter',
    prompt: 'Make the counter thread-safe.',
    code: [
      'lock = threading.Lock()',
      'counter = 0',
      '',
      'def work():',
      '    global counter',
      '    for _ in range(100_000):',
      '        with {{0}}:',
      '            counter {{1}} 1',
    ].join('\n'),
    blanks: [
      { options: ['lock', 'counter', 'threading'], answer: 0 },
      { options: ['+=', '=', '=='], answer: 0 },
    ],
    explanation: 'Holding `lock` around `counter += 1` makes the load, add and store happen as one step from every other thread’s point of view.',
  },
  {
    kind: 'cloze',
    id: 'fx-cloze-fstring',
    eyebrow: 'Edge case',
    prompt: 'Two blanks on one line, one inside an f-string, and a line long enough to scroll.',
    code: [
      'def describe(user):',
      '    return f"{user.{{0}}} has {len(user.{{1}})} items in the cart and {user.pending_orders_count} pending orders"',
    ].join('\n'),
    blanks: [
      { options: ['name', 'id', '__class__.__name__'], answer: 0 },
      { options: ['cart', 'items()', 'orders'], answer: 0 },
    ],
    explanation: 'Any expression works inside the braces of an f-string, including attribute access and calls.',
    hint: 'The sentence reads “Ada has 3 items in the cart”.',
  },
  {
    kind: 'cloze',
    id: 'fx-cloze-single',
    prompt: 'Run the CPU-bound resize across cores.',
    code: [
      'with ProcessPoolExecutor() as pool:',
      '    thumbs = list(pool.{{0}}(resize, paths))',
    ].join('\n'),
    blanks: [{ options: ['map', 'submit', 'shutdown'], answer: 0 }],
    explanation: '`pool.map(fn, items)` returns results in input order; `submit` schedules one call and returns a single future.',
  },
  {
    kind: 'cloze',
    id: 'fx-cloze-prose',
    eyebrow: 'Edge case',
    prompt: 'Plain-text cloze with phrase-length options that must wrap on a 320px phone.',
    lang: 'text',
    code: ['We store run outputs in', '{{0}}', 'and will revisit if {{1}}.'].join('\n'),
    blanks: [
      { options: ['object storage', 'Postgres TEXT columns', 'the cache'], answer: 0 },
      { options: ['users need full-text search inside outputs', 'it ever becomes a problem', 'a better database comes out'], answer: 0 },
    ],
    explanation: 'A revisit trigger has to be something you would actually notice. *Search inside outputs* is observable; the other two never fire.',
  },
]

export default steps
