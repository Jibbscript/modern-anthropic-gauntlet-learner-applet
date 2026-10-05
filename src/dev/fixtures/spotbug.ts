import type { Step } from '../../core/types'

/** Spot-the-bug fixtures: single bug with fix, two bugs with fix, long code with blank lines and no fix. */
const steps: Step[] = [
  {
    kind: 'spotbug',
    id: 'fx-spotbug',
    eyebrow: 'Debugging',
    prompt: 'Calling `add_item("a")` twice returns `["a", "a"]`. Why?',
    code: ['def add_item(item, bucket=[]):', '    bucket.append(item)', '    return bucket'].join('\n'),
    bugLines: [1],
    explanation:
      'Default values are evaluated **once**, when the function is defined. Every call that omits `bucket` shares the same list. Use `None` as the sentinel and create the list inside.',
    fix: {
      code: ['def add_item(item, bucket=None):', '    if bucket is None:', '        bucket = []', '    bucket.append(item)', '    return bucket'].join('\n'),
    },
    hint: 'When is `[]` evaluated?',
  },
  {
    kind: 'spotbug',
    id: 'fx-spotbug-multi',
    prompt: 'This binary search sometimes crashes and sometimes loops forever.',
    code: [
      'def binary_search(xs, target):',
      '    lo, hi = 0, len(xs)',
      '    while lo <= hi:',
      '        mid = (lo + hi) // 2',
      '        if xs[mid] == target:',
      '            return mid',
      '        if xs[mid] < target:',
      '            lo = mid',
      '        else:',
      '            hi = mid - 1',
      '    return -1',
    ].join('\n'),
    bugLines: [2, 8],
    explanation:
      'With an inclusive `while lo <= hi`, `hi` must start at `len(xs) - 1` or `xs[mid]` can index past the end. And `lo = mid` never moves past `mid`, so two adjacent items loop forever: it must be `mid + 1`.',
    fix: {
      code: [
        'def binary_search(xs, target):',
        '    lo, hi = 0, len(xs) - 1',
        '    while lo <= hi:',
        '        mid = (lo + hi) // 2',
        '        if xs[mid] == target:',
        '            return mid',
        '        if xs[mid] < target:',
        '            lo = mid + 1',
        '        else:',
        '            hi = mid - 1',
        '    return -1',
      ].join('\n'),
      caption: 'Inclusive bounds on both ends.',
    },
  },
  {
    kind: 'spotbug',
    id: 'fx-spotbug-async',
    eyebrow: 'Edge case',
    prompt: 'Every other request on this event loop stalls while `poll` runs.',
    code: [
      'import asyncio',
      'import time',
      '',
      'async def poll(job_id: str) -> dict:',
      '    # check the job every second until it finishes',
      '    while True:',
      '        status = await client.get_status(job_id, timeout=5.0, include_metadata=True)',
      '        if status["state"] == "done":',
      '            return status',
      '        time.sleep(1)',
    ].join('\n'),
    bugLines: [10],
    explanation: '`time.sleep` blocks the whole event loop thread. Inside a coroutine, use `await asyncio.sleep(1)` so other tasks run while this one waits.',
    hint: 'Which call never yields control back to the loop?',
  },
]

export default steps
