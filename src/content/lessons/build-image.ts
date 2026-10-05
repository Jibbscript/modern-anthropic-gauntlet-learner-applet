import type { Lesson } from '../../core/types'

const lesson: Lesson = {
  id: 'build-image',
  title: 'Image pipeline',
  summary: 'Write transforms as pure functions, compose them, then parallelize honestly: by image, by tile, and around the GIL.',
  minutes: 9,
  skills: ['build.image', 'conc.models'],
  steps: [
    {
      kind: 'concept',
      id: 'hook',
      eyebrow: 'Commonly reported',
      title: 'Eight threads, same 40 minutes',
      body:
        'You blur 10,000 photos with a pure-Python loop. It takes 40 minutes. You add a `ThreadPoolExecutor` with 8 threads. It still takes about 40 minutes.\n\n' +
        'Nothing is broken. On standard CPython only one thread runs Python bytecode at a time. This lesson builds the pipeline, then asks where parallelism actually comes from.',
      callout: {
        tone: 'insight',
        text: 'Candidates report an image-processing question shaped like this: apply transformations to images, then discuss how to parallelize. Expect the second half to be a design conversation, not just code.',
      },
    },
    {
      kind: 'concept',
      id: 'grid',
      title: 'An image is a grid; a transform is a function',
      body:
        'You may get no imaging library at all. A grayscale image is a list of rows: `img[y][x]` is a 0-255 brightness, height is `len(img)`, width is `len(img[0])`.\n\n' +
        'Write each transform as a ==pure function==: new image out, input untouched. Pure functions compose, test in one line, and are safe to run in parallel.',
      code: {
        code: `Image = list[list[int]]

def invert(img: Image) -> Image:
    return [[255 - p for p in row] for row in img]

def flip_h(img: Image) -> Image:
    return [row[::-1] for row in img]

assert flip_h([[1, 2, 3]]) == [[3, 2, 1]]`,
      },
    },
    {
      kind: 'spotbug',
      id: 'rotate',
      eyebrow: 'Find the bug',
      prompt: 'The square test passes. On a tall image (3 rows, 2 columns) this returns scrambled pixels with no error; on a wide one (2 rows, 3 columns) it raises `IndexError`. Tap the bug.',
      code: `def rotate_cw(img: Image) -> Image:
    h, w = len(img), len(img[0])
    out = [[0] * h for _ in range(w)]
    for y, row in enumerate(img):
        for x, p in enumerate(row):
            out[x][w - 1 - y] = p
    return out

square = [[1, 2], [3, 4]]
assert rotate_cw(square) == [[3, 1], [4, 2]]`,
      bugLines: [6],
      explanation:
        'Rotating clockwise sends row `y` to column `h - 1 - y`: the bottom row becomes the left column. The code uses `w`, which equals `h` only on squares, so the square test passes. On a tall image `w - 1 - y` goes negative and Python\'s negative indexing ==wraps silently==. Test transforms on non-square inputs.',
      fix: { code: `            out[x][h - 1 - y] = p` },
      hint: 'The only test uses a square. Which variable is right only when `h == w`?',
    },
    {
      kind: 'cloze',
      id: 'compose',
      prompt: 'A pipeline applies transforms left to right. Complete it so `pipeline(gray, blur, rotate)(img)` runs `gray` first and feeds each result to the next step.',
      code: `def pipeline(*steps):
    def run(img):
        out = {{0}}
        for step in steps:
            out = {{1}}
        return out
    return run

thumb = pipeline(gray, blur, rotate)`,
      blanks: [
        { options: ['None', 'img', 'steps[0]'], answer: 1 },
        { options: ['step(img)', 'out(step)', 'step(out)'], answer: 2 },
      ],
      explanation:
        '`out` is the image so far: it starts as `img`, and each step\'s output feeds the next. `step(img)` would apply every step to the original and keep only the last result. Starting from `img` also makes `pipeline()` with no steps the identity, an edge case worth a test. This loop is `functools.reduce` written out.',
      hint: 'Each step should transform the result of the step before it.',
    },
    {
      kind: 'concept',
      id: 'split',
      title: 'Split by image, or split one image',
      body:
        'Ten thousand photos are ==embarrassingly parallel==: each image is independent, so hand whole images to workers and you are done.\n\n' +
        'One huge image is different: split it into tiles. A pointwise transform like `invert` looks at one pixel, so tiles cost nothing. A blur reads neighbors, so a pixel at a tile\'s edge needs pixels that live in the next tile.',
    },
    {
      kind: 'mcq',
      id: 'halo',
      prompt: 'You process a big image in tiles: a 5×5 box blur, then a 3×3 sharpen. Each tile gets an extra border (a *halo*) that is cropped off afterwards. What is the smallest halo per side that makes the stitched result match the whole-image result?',
      choices: [
        {
          text: '2 pixels',
          feedback: 'Enough for the blur alone. But the sharpen then reads blurred pixels near the edge that were computed without their true neighbors.',
        },
        {
          text: '3 pixels',
          correct: true,
          feedback: 'Right: reaches add up. The blur needs 2, and the sharpen needs 1 more on top.',
        },
        {
          text: '5 pixels',
          feedback: 'That is the blur kernel\'s width, not its reach. A 5×5 kernel reads 2 pixels in each direction.',
        },
        {
          text: '8 pixels',
          feedback: 'That adds the two kernel widths. Each kernel only reaches its radius, (size − 1) ÷ 2, and the radii add.',
        },
      ],
      explanation:
        'A k×k kernel reads (k − 1) ÷ 2 pixels each way, and chained neighborhood ops add their reaches: 2 + 1 = 3. Brute force on a 24×24 image agrees: with a halo of 2, pixels along the tile seams come out wrong; with 3, every pixel matches.',
      hint: 'How far does each kernel reach from its center pixel? Then think about the second op reading the first op\'s output.',
    },
    {
      kind: 'concept',
      id: 'gil',
      title: 'Why the threads did nothing',
      body:
        'Standard CPython has a Global Interpreter Lock: one thread executes Python bytecode at a time. A pure-Python pixel loop is all bytecode, so threads take turns.\n\n' +
        'Two ways out. `ProcessPoolExecutor` runs separate interpreters on separate cores, and you pay for startup and for pickling data across. Or push the loop into C: many NumPy and Pillow operations ==release the GIL==, so threads scale there.',
      callout: {
        tone: 'tip',
        text: 'Free-threaded CPython builds (optional since 3.13) remove the GIL, but the default build still has it. In an interview, say which one you are assuming.',
      },
    },
    {
      kind: 'sort',
      id: 'threads-or-procs',
      prompt: 'On standard CPython, which of these can threads speed up, and which need processes (or the loop moved into C)?',
      buckets: [
        { id: 'threads', label: 'Threads help' },
        { id: 'procs', label: 'Needs processes' },
      ],
      items: [
        { text: 'Downloading 10,000 images from object storage', bucket: 'threads', why: 'Threads blocked on the network release the GIL.' },
        { text: 'A nested `for` loop blurring a list-of-lists image', bucket: 'procs', why: 'Pure bytecode: one thread holds the GIL the whole time.' },
        { text: 'Pillow `Image.resize` on large photos', bucket: 'threads', why: 'The resampling runs in C, which releases the GIL.' },
        { text: 'NumPy arithmetic on big float arrays, like `a * 0.5 + b`', bucket: 'threads', why: 'NumPy\'s numeric C loops release the GIL.' },
        { text: 'A Python loop building a brightness histogram in a dict', bucket: 'procs', why: 'Every iteration is interpreter work.' },
      ],
      explanation:
        'The question is not "is it heavy?" but "is Python bytecode running the whole time?" Waiting on I/O, or running inside C that drops the GIL, lets other threads go. Interpreted loops do not.',
    },
    {
      kind: 'widget',
      id: 'pool',
      eyebrow: 'Your turn',
      prompt: 'Eight CPU-bound blur tasks on a 4-core machine. Pick the executor and worker count that finishes fastest.',
      goal: 'Within 10% of the best wall time',
      widget: { id: 'pool', config: { kind: 'cpu', tasks: 8, cores: 4, lockControls: ['kind'], goal: 'fastest' } },
      explanation:
        'Threads serialize on the GIL, and asyncio cannot speed up CPU work at all: it is one thread. Processes run in parallel up to the core count. Past that, extra workers cannot add cores; they only share them.',
    },
    {
      kind: 'numeric',
      id: 'speedup',
      eyebrow: 'Estimate',
      prompt:
        '1,000 images, each needing 120 ms of pure-Python CPU work. You use `ProcessPoolExecutor` with 8 workers on 8 cores. Assume pool startup takes 0.5 s, and the parent spends 3 ms per image pickling it out and the result back, one image at a time.\n\n' +
        'Using *wall = startup + serial + parallel ÷ workers*, what speedup over the plain loop do you get?',
      answer: 6.5,
      tolerance: 0.1,
      unit: '×',
      explanation:
        'Plain loop: 1,000 × 0.12 s = 120 s. Pool: 0.5 + 1,000 × 0.003 + 120 ÷ 8 = 0.5 + 3 + 15 = 18.5 s. Speedup: 120 ÷ 18.5 ≈ 6.5×, not 8×. The serial 3 s is Amdahl\'s law in miniature. Shrink it by sending file paths instead of pixels.',
      hint: 'Work out the plain loop\'s time first, then add up the three parts of the pool\'s time.',
    },
    {
      kind: 'concept',
      id: 'backpressure',
      title: 'Ship paths, not pixels. Bound what is in flight.',
      body:
        'Every argument to a process worker is pickled, copied, and unpickled. Send a file path; let the worker load, transform, and save; return a status.\n\n' +
        'And do not submit 10,000 jobs whose images all sit in memory at once. Bound the work in flight with a semaphore, or with bounded queues between stages: when a queue is full, the stage feeding it waits. That is ==backpressure==.',
    },
    {
      kind: 'widget',
      id: 'pipeline',
      eyebrow: 'Balance it',
      prompt: 'A four-stage pipeline: load costs 1, resize 2, filter 4, save 1 (relative time per image). You have 8 workers to place. Distribute them to reach the target throughput.',
      goal: 'Reach the target throughput',
      widget: { id: 'pipeline', config: { images: 24, costs: { load: 1, resize: 2, filter: 4, save: 1 }, budget: 8, target: 0.75, goal: 'throughput' } },
      explanation:
        'A pipeline moves at the pace of its slowest stage, workers ÷ cost. An even 2/2/2/2 split leaves filter at 2 ÷ 4 = 0.5. Matching workers to cost, 1/2/4/1, balances every stage at 1.0. Bigger queues do not raise throughput; they absorb bursts and cost memory.',
    },
    {
      kind: 'interview',
      id: 'sim',
      eyebrow: 'Interview sim',
      setup: 'Your pipeline of pure transforms works on a single image. The interviewer scales it up.',
      turns: [
        {
          interviewer: 'We need to process 50,000 product photos overnight. How do you parallelize this?',
          options: [
            {
              text: 'A `ThreadPoolExecutor` with 32 threads. More threads, more throughput.',
              quality: 'weak',
              feedback: 'The transforms are pure-Python CPU work, so the threads take turns on the GIL. You would see about one core busy.',
            },
            {
              text: 'Per image it is embarrassingly parallel, and the work is pure-Python CPU, so `ProcessPoolExecutor` with about one worker per core. Workers get file paths, load and save themselves, and return a status, so pixels never get pickled.',
              quality: 'strong',
              feedback: 'Executor matched to the workload, and the data path designed so the parent is not the bottleneck.',
            },
            {
              text: '`ProcessPoolExecutor.map` over the list of loaded images.',
              quality: 'okay',
              feedback: 'Right executor, but every decoded image gets pickled to a worker and back. That serial copying caps the speedup and balloons memory.',
            },
          ],
        },
        {
          interviewer: 'Now a single 40,000 × 40,000 satellite image, same pipeline, including a 5×5 blur.',
          options: [
            {
              text: 'Split it into horizontal strips, one per core, and stitch the results back together.',
              quality: 'okay',
              feedback: 'The right instinct, but plain strips get the blur wrong along every seam: edge pixels need neighbors from the next strip.',
            },
            {
              text: 'Load it as a list of lists and add more processes.',
              quality: 'weak',
              feedback: '1.6 billion pixels as a list of lists is gigabytes of pointers alone, and each worker would need its own copy.',
            },
            {
              text: 'Tiles with a 2-pixel halo for the 5×5 blur, cropped after. Each worker reads its own window and writes its own output tile, so no process ever holds the whole image.',
              quality: 'strong',
              feedback: 'Correct seams, bounded memory, and nothing huge crosses a process boundary.',
            },
          ],
        },
        {
          interviewer: 'In production, memory climbs to 30 GB and the box starts swapping. What is going on?',
          options: [
            {
              text: 'Likely unbounded work in flight: we submitted everything up front and results pile up faster than we save them. I would cap in-flight tasks with a semaphore or bounded queue so producers wait on the slow stage.',
              quality: 'strong',
              feedback: 'A hypothesis, its mechanism, and a fix that removes the cause: that is backpressure.',
            },
            {
              text: 'Lower the worker count until it fits.',
              quality: 'okay',
              feedback: 'It may stop the bleeding, but you have not found the cause, and you traded away throughput to hide it.',
            },
            {
              text: 'Call `gc.collect()` after each image.',
              quality: 'weak',
              feedback: 'Memory held by live references, such as queued results, is not garbage. Diagnose before reaching for knobs.',
            },
          ],
        },
      ],
      wrapUp:
        'Strong answers tie the executor to the workload, keep big data off process boundaries, get tile seams right, and bound memory with backpressure.',
    },
    {
      kind: 'concept',
      id: 'recap',
      eyebrow: 'Recap',
      title: 'Three things to carry in',
      body:
        '1. **Transforms are pure functions** on `img[y][x]`. Compose them, and test on non-square images.\n' +
        '2. **Parallelize by image with processes** for pure-Python CPU work. Threads only help when the GIL is released: I/O, NumPy, Pillow.\n' +
        '3. **Tiles need a halo** equal to the summed kernel radii, and **bounded queues** keep memory flat.',
    },
  ],
  cards: [
    {
      id: 'build-image.halo-sum',
      skill: 'build.image',
      kind: 'numeric',
      prompt: 'Tiled processing runs a 7×7 blur followed by a 3×3 blur. What is the smallest halo, in pixels per side, for seamless tiles?',
      answer: 4,
      tolerance: 0,
      unit: 'px',
      explanation: 'A 7×7 kernel reaches (7 − 1) ÷ 2 = 3 pixels; a 3×3 reaches 1. Chained ops add their reaches: 3 + 1 = 4.',
    },
    {
      id: 'build-image.pipeline-order',
      skill: 'build.image',
      kind: 'predict',
      prompt: 'What does this print?',
      code: `def pipeline(*steps):
    def run(x):
        for step in steps:
            x = step(x)
        return x
    return run

add1 = lambda v: v + 1
double = lambda v: v * 2
up = pipeline(add1, double)
down = pipeline(double, add1)
print(up(3), down(3))`,
      answers: ['8 7'],
      explanation: 'Steps run left to right: (3 + 1) × 2 = 8, then 3 × 2 + 1 = 7. Order matters for transforms too: blur-then-resize is not resize-then-blur.',
    },
    {
      id: 'build-image.shallow-copy',
      skill: 'build.image',
      kind: 'spotbug',
      prompt: 'After `bright = brighten(photo, 40)`, the original `photo` is brighter too. Which line causes it?',
      code: `def brighten(img: Image, amount: int) -> Image:
    out = img.copy()
    for row in out:
        for x in range(len(row)):
            row[x] = min(255, row[x] + amount)
    return out`,
      bugLines: [2],
      explanation: '`list.copy()` is shallow: a new outer list holding the same row lists, so writing `row[x]` mutates the input. Build new rows: `[[min(255, p + amount) for p in row] for row in img]`.',
    },
    {
      id: 'build-image.threads-cpu',
      skill: 'conc.models',
      kind: 'mcq',
      prompt: 'A pure-Python blur runs on 8 threads under standard CPython on an 8-core machine. Roughly what speedup over one thread should you expect?',
      choices: [
        { text: 'About 1×: the threads take turns holding the GIL', correct: true },
        { text: 'About 8×: one thread per core', feedback: 'That is what processes (or C code that releases the GIL) can give. Pure-Python threads cannot run bytecode simultaneously.' },
        { text: 'About 4×: hyper-threading halves it', feedback: 'Hardware threads are not the limit here; the interpreter lock is.' },
        { text: 'It crashes, because lists are not thread-safe', feedback: 'Each thread writes its own output, and single list operations do not corrupt under the GIL. It just does not get faster.' },
      ],
      explanation: 'Only one thread executes Python bytecode at a time on the default CPython build, so CPU-bound pure-Python work does not scale with threads.',
    },
    {
      id: 'build-image.amdahl',
      skill: 'conc.models',
      kind: 'numeric',
      prompt: '5% of a job is inherently serial; the rest parallelizes perfectly. With unlimited workers, what is the maximum speedup?',
      answer: 20,
      tolerance: 0.05,
      unit: '×',
      explanation: 'Amdahl\'s law: speedup ≤ 1 ÷ serial fraction = 1 ÷ 0.05 = 20×. The parallel part shrinks toward zero; the serial 5% never does.',
    },
    {
      id: 'build-image.paths',
      skill: 'build.image',
      kind: 'flash',
      front: 'Why send file paths, not decoded images, to `ProcessPoolExecutor` workers?',
      back: 'Arguments and results are pickled and copied between processes, and the parent does that serially. A path is bytes; an image is megabytes. Let workers load and save, and return a small status.',
    },
    {
      id: 'build-image.strategy',
      skill: 'conc.models',
      kind: 'match',
      prompt: 'Match each workload to the approach that actually speeds it up.',
      pairs: [
        { left: 'Pure-Python pixel loops over 10k images', right: '`ProcessPoolExecutor`, about one worker per core' },
        { left: 'Downloading 10k images from storage', right: 'Threads or asyncio: the waits release the GIL' },
        { left: 'Pillow resizes of large photos', right: 'Threads: the C code releases the GIL' },
        { left: 'One 40k × 40k image with a blur', right: 'Tiles with a halo, each written out separately' },
      ],
      explanation: 'Match the tool to where the time goes: interpreter work needs processes, waiting or GIL-free C work suits threads, and one giant input needs splitting with correct seams.',
    },
  ],
}

export default lesson
