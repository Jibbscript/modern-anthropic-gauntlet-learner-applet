import type { Lesson } from '../../core/types'

const lesson: Lesson = {
  id: 'deep-layers',
  title: 'Layers of depth',
  summary: 'Structure the deep dive as six layers, from one-minute context down to what you would change, and know two levels deeper than you present.',
  minutes: 9,
  skills: ['deep.layers'],
  steps: [
    {
      kind: 'concept',
      id: 'hook',
      eyebrow: 'Project deep dive',
      title: 'Every sentence is a door',
      body:
        '*We used Kafka for the event bus.* Harmless, until the interviewer opens it. Why not SQS? How many partitions? What happened when a consumer fell behind?\n\n' +
        'In a deep dive, every sentence you say is a door, and the interviewer chooses which to open. Your job is to say only sentences with a room behind them, and to know each room two levels deeper than you present.',
      callout: {
        tone: 'insight',
        text: 'In one reported March 2026 design round, *Kafka vs Redis* led straight into partitions, offsets and consumer groups. The candidate says they struggled there.',
      },
    },
    {
      kind: 'mcq',
      id: 'empty-room',
      eyebrow: 'Warm-up',
      prompt: 'Four sentences from a deep-dive talk. Which one is a door with nothing behind it?',
      choices: [
        {
          text: "We picked Kafka because it's the industry standard for this.",
          correct: true,
          feedback: "Right. *Industry standard* is a default, not a reason. The next question is *why not X?*, and this sentence has nothing to say to it.",
        },
        {
          text: 'We picked Kafka because we needed seven days of replay after bad deploys.',
          feedback: 'This one has a room: a requirement that rules alternatives in or out. They can probe it, and you can answer.',
        },
        {
          text: 'I set 64 partitions, sized for our peak of 12k events a second.',
          feedback: 'Specific and checkable. The follow-up, *why 64?*, has an answer waiting.',
        },
        {
          text: "Consumer lag hit 40 minutes in March. I'll come back to that.",
          feedback: "A signpost to a failure you plan to discuss. That's a door you chose to leave open.",
        },
      ],
      explanation:
        "A sentence with a room behind it carries a reason, a number or a consequence. A sentence without one is a default dressed up as a decision, and it's exactly where drill-downs land.",
    },
    {
      kind: 'concept',
      id: 'stack',
      title: 'The six layers',
      body:
        'A strong deep dive descends through six layers:\n\n' +
        '1. **Context** (one minute): the problem, and why it mattered\n' +
        '2. **Your ownership**: what you decided and built\n' +
        '3. **The two hardest decisions**, with the alternatives you rejected\n' +
        '4. **Numbers**: scale, latency, cost, impact\n' +
        '5. **What broke**\n' +
        "6. **What you'd change now**\n\n" +
        'Two decisions, not ten. Depth beats coverage.',
      callout: {
        tone: 'insight',
        text: "A July 2026 candidate report lists what to cover: motivation, your own role, technical trade-offs, challenges and surprises, success metrics, and what you'd do differently. Same stack, different labels.",
      },
    },
    {
      kind: 'order',
      id: 'order-webhooks',
      eyebrow: 'Your turn',
      prompt: "A candidate's talk on a webhook delivery system, shuffled. Put the sentences in layer order.",
      items: [
        'Customer webhooks arrived up to 20 minutes late, and two big accounts threatened to leave.',
        'I designed the new delivery service and wrote the retry scheduler; a teammate built the dashboards.',
        'The big call: at-least-once delivery with idempotency keys, rather than chasing exactly-once.',
        'Volume grew from 4M to 30M deliveries a day, while p99 delay fell from 20 minutes to 40 seconds.',
        "In month two, one customer's slow endpoint clogged a shared queue and delayed everyone.",
        "Today I'd give each customer its own queue from day one, instead of retrofitting it.",
      ],
      explanation:
        'Context earns attention. Ownership tells them what to probe. Decisions are the core, and numbers make them checkable. The failure and the change show you kept learning after launch. Put the numbers before the decisions and they float free of anything you chose.',
      hint: "You can't judge a decision before you know the problem and whose decision it was.",
    },
    {
      kind: 'concept',
      id: 'two-deeper',
      title: 'Know two levels deeper',
      body:
        'Present at level one. Prepare levels two and three for every claim.\n\n' +
        '- **Said**: We chose at-least-once delivery with idempotency keys.\n' +
        "- **One down**: Over HTTP, a lost response looks like a lost request, so exactly-once isn't on offer. We retry and give customers a key to dedupe on.\n" +
        '- **Two down**: The key is the event ID, customers dedupe on it, and about 0.3% of deliveries were retries.',
      callout: {
        tone: 'tip',
        text: 'Write the talk, then write the next two answers under each sentence. A sentence with blank space under it gets researched or cut.',
      },
    },
    {
      kind: 'mcq',
      id: 'next-two',
      eyebrow: 'Check',
      prompt: 'You say: *We sharded the events table by customer ID.* What should you have ready as the next two levels?',
      choices: [
        {
          text: 'Why customer ID beat the alternatives, and how the hottest shard behaved',
          correct: true,
          feedback: 'Right: the why, then the consequence. Sharding by customer invites the hot-tenant question.',
        },
        {
          text: 'A short history of the main sharding approaches in distributed databases',
          feedback: "General knowledge isn't depth on *your* system. They want your reasons and your data.",
        },
        {
          text: 'The names of the senior engineers who reviewed and approved the design',
          feedback: "Approval isn't a reason, and naming approvers hands the decision to someone else.",
        },
        {
          text: 'A second, unrelated decision you can pivot to if they push too hard',
          feedback: 'Pivoting away from a probe reads as having nothing behind the door.',
        },
      ],
      explanation:
        'Level two is usually *why this over the alternative*. Level three is the consequence: the number, the edge case or the failure it caused. Prepare both.',
    },
    {
      kind: 'concept',
      id: 'numbers',
      title: 'Numbers you can do arithmetic on',
      body:
        'Bring four kinds of number: **scale**, **speed**, **cost** and **impact**. For each, know the unit, the before and after, and where it came from.\n\n' +
        'Then do the arithmetic before the interview, because the interviewer may do it live. 30M a day is about 350 a second on average. And a failure *rate* can fall while the failure *count* rises.',
      callout: {
        tone: 'tip',
        text: "Round honestly and say you're rounding: *about 350 a second on average*. A rough number you can source beats a precise one you can't.",
      },
    },
    {
      kind: 'spotbug',
      id: 'vague-lines',
      eyebrow: 'Spot the vague claim',
      prompt: 'Two lines in this deep-dive transcript are claims nobody can check. Tap them.',
      lang: 'text',
      code: `Deliveries ran up to 20 min late.
I owned the retry scheduler.
I chose at-least-once delivery.
Backoff: 1s, 4s, 16s, then a DLQ.
It made things much more robust.
p99 delay: 20 min down to 40 s.
Cost-wise it was basically fine.
Per-customer queues came later.`,
      bugLines: [5, 7],
      explanation:
        '*Much more robust* and *basically fine* are adjectives doing a number\'s job. Each invites *how much?*, and the honest answer is a figure you should have said first. Every other line has a number, a name or a mechanism the interviewer can probe.',
      fix: {
        lang: 'text',
        code: `Deliveries ran up to 20 min late.
I owned the retry scheduler.
I chose at-least-once delivery.
Backoff: 1s, 4s, 16s, then a DLQ.
Lost deliveries: 2% down to 0.1%.
p99 delay: 20 min down to 40 s.
Infra cost rose ~15%, ~$4k/month.
Per-customer queues came later.`,
      },
      hint: 'Which lines make you want to ask *how much?*',
    },
    {
      kind: 'numeric',
      id: 'failures',
      eyebrow: 'Do the sum',
      prompt:
        'Before the rewrite: 4M deliveries a day, 2% failed for good. After: 30M a day, 0.1% failed. The interviewer asks: *how many fewer failed deliveries per day is that?*',
      answer: 50000,
      tolerance: 0.05,
      unit: 'per day',
      explanation:
        'Before: 4M × 2% = 80,000 failures a day. After: 30M × 0.1% = 30,000. So 50,000 fewer. The rate fell 20x, but the count fell only about 2.7x, because volume grew 7.5x. Say both. Quote only the 20x and you invite the interviewer to do this sum for you.',
      hint: 'Work out the daily failure count before and after, separately.',
    },
    {
      kind: 'concept',
      id: 'scars',
      title: 'What broke is evidence',
      body:
        "It's tempting to sand this layer down. Don't. Real projects break, and a story where nothing went wrong sounds either small or edited. What broke is often your best evidence that you were there.\n\n" +
        'Tell it like a short incident review: what failed, how you found out, what you did that day, and what you changed so it could not recur. Name your own part in it plainly.',
      callout: {
        tone: 'tip',
        text: "*What would you change now?* usually follows. Give one or two specific changes, and what you know now that you didn't then.",
      },
    },
    {
      kind: 'compare',
      id: 'what-broke',
      eyebrow: 'Which is stronger?',
      question: 'What went wrong on this project?',
      a: 'Honestly, not much. We tested thoroughly, ran a careful staged rollout, and it went smoothly. There were the usual small bugs along the way, but nothing major, and the team was great at jumping on issues quickly whenever they came up.',
      b: "In month two, one customer's endpoint started taking 30 seconds to respond. Workers blocked on it, the shared queue backed up, and everyone's deliveries ran two hours late. I'd sized the pool on average latency, not the tail. We added timeouts that day and per-customer queues the next month.",
      better: 'b',
      explanation:
        "B is an incident review in four sentences: symptom, mechanism, the candidate's own mistake (sizing on the average), and fixes on two timescales. A claims nothing went wrong, which an interviewer will either disbelieve or read as a project too small to have edges.",
    },
    {
      kind: 'mcq',
      id: 'change-now',
      eyebrow: 'Last layer',
      prompt: 'Then: *What would you change if you built it again?* Which answer is strongest?',
      choices: [
        {
          text: 'Per-customer queues from day one: at 50 customers I ignored noisy neighbours, and at 400 they bit us.',
          correct: true,
          feedback: 'Specific, tied to what broke, and honest about why it was missed. That is learning, not hindsight theatre.',
        },
        {
          text: "Nothing, really. Given what we knew, every decision held up, and I'd make the same calls today.",
          feedback: 'Rarely true, and it reads as not having reflected. Even good calls have something you would tune.',
        },
        {
          text: "I'd rewrite it in Rust, for better performance and memory safety across the whole service.",
          feedback: 'A technology swap with no link to a problem you hit. Expect *what problem would that have solved?*',
        },
        {
          text: "I'd communicate more with stakeholders, and get buy-in from the other teams much earlier.",
          feedback: 'Maybe true, but generic enough to fit any project. Tie it to a specific moment or leave it out.',
        },
      ],
      explanation:
        "A good *change now* answer is specific, connected to something that actually happened, and separates what you couldn't have known from what you should have weighed.",
    },
    {
      kind: 'reflect',
      id: 'your-layers',
      eyebrow: 'Story Bank',
      prompt: "For your project, write layers three to six: the two hardest decisions, your numbers, what broke, and what you'd change now.",
      guidance:
        "For each decision: what you chose, the alternative you rejected, and why. For numbers: at least two of scale, speed, cost and impact, each with a before, an after and a source. For what broke: symptom, cause, your part, and the fix. Close with one change you'd make now. Then check you could answer two more *why*s under every sentence.",
      rubric: [
        'Two decisions, each with a named alternative and a reason',
        'At least two numbers, each with a before, an after and a source',
        'No adjective doing a number’s job (faster, robust, fine)',
        'A failure told as symptom, cause, your part and fix',
        'One specific thing you would change now, and why',
      ],
      slot: 'project-deep-dive',
      placeholder: 'Decision 1: I chose … over … because …',
    },
    {
      kind: 'concept',
      id: 'recap',
      title: 'Keep three things',
      body:
        "1. **Six layers**: context, ownership, two decisions, numbers, what broke, what you'd change. Two decisions, not ten.\n" +
        '2. **Every sentence is a door.** Know two levels behind each one, or cut it.\n' +
        '3. **Numbers you can do arithmetic on**, each with a source. ==Replace every adjective with a number.==',
    },
  ],
  cards: [
    {
      id: 'deep-layers.order',
      skill: 'deep.layers',
      kind: 'order',
      prompt: 'Put the layers of a deep-dive answer in order.',
      items: [
        'One-minute context',
        'Your ownership',
        'The two hardest decisions and their alternatives',
        'Numbers: scale, latency, cost, impact',
        'What broke',
        "What you'd change now",
      ],
      explanation:
        'Context first so the rest makes sense, then ownership so they know what to probe, then decisions, then the numbers that make them checkable, and the learning last.',
    },
    {
      id: 'deep-layers.two-deeper',
      skill: 'deep.layers',
      kind: 'flash',
      front: 'What does *know two levels deeper* mean in a deep dive?',
      back: "For every claim you present, have the next two answers ready: usually *why this over the alternative*, then the consequence (a number, an edge case or a failure). If you can't, cut the claim.",
    },
    {
      id: 'deep-layers.per-second',
      skill: 'deep.layers',
      kind: 'numeric',
      prompt: "You'll say *we handled 50M requests a day, and peak traffic ran at 3x the average*. Roughly what peak rate, per second, did you size for?",
      answer: 1736,
      tolerance: 0.15,
      unit: 'per second',
      explanation:
        '50,000,000 ÷ 86,400 ≈ 580 a second on average, so about 1,700 a second at a 3x peak. You size for the peak, so lead with that, and say where the 3x came from.',
      hint: 'Get the average per second first. A day has 86,400 seconds.',
    },
    {
      id: 'deep-layers.checkable',
      skill: 'deep.layers',
      kind: 'sort',
      prompt: 'Sort these deep-dive claims into checkable and vague.',
      buckets: [
        { id: 'check', label: 'Checkable' },
        { id: 'vague', label: 'Vague' },
      ],
      items: [
        { text: 'p99 went from 900 ms to 120 ms.', bucket: 'check' },
        { text: 'Latency improved significantly.', bucket: 'vague' },
        { text: 'We cut 14 of 40 instances, about $9k a month.', bucket: 'check' },
        { text: 'It saved the company a lot of money.', bucket: 'vague' },
        { text: '23 of 31 services adopted it within six months.', bucket: 'check' },
        { text: 'The other teams really loved it.', bucket: 'vague' },
      ],
      explanation:
        'A checkable claim has a unit, a count, or a before and after. A vague one swaps in an adjective, and the next question will be *how much?*',
    },
    {
      id: 'deep-layers.rate-count',
      skill: 'deep.layers',
      kind: 'mcq',
      prompt: 'Your error rate fell from 1% to 0.2% while traffic grew from 1M to 10M requests a day. Which statement is accurate?',
      choices: [
        {
          text: 'The rate fell 5x, but daily errors doubled, from 10,000 to 20,000',
          correct: true,
          feedback: 'Right. Volume grew 10x, faster than the rate fell. Say both, and explain why the count is acceptable.',
        },
        {
          text: 'Errors fell 5x, from 10,000 a day down to just 2,000',
          feedback: 'That applies the new rate to the old volume. At 10M requests, 0.2% is 20,000.',
        },
        {
          text: 'Errors fell 80%, and that is the number to lead with',
          feedback: 'That is the rate change. The count went up, and an interviewer who does the sum will notice you skipped it.',
        },
        {
          text: "The two can't be compared, because traffic changed in between",
          feedback: 'They can. Multiply each rate by its volume and compare the counts.',
        },
      ],
      explanation: 'Rates and counts tell different stories when volume changes. Do both sums before the interview.',
    },
    {
      id: 'deep-layers.change-now',
      skill: 'deep.layers',
      kind: 'compare',
      question: 'What would you do differently?',
      a: 'I\'d add a cache warm-up before cutover. We flipped traffic onto a cold cache, the hit rate started near zero, and the database took three times its normal load for 20 minutes. I assumed warm-up would be quick; I never measured it.',
      b: "Looking back, I'd probably plan more carefully and test more thoroughly before launch. I think every project teaches you to slow down a little, and I've definitely grown a lot as an engineer since then.",
      better: 'a',
      explanation:
        'A names a specific change, the incident behind it, and the assumption that was wrong. B could follow any project ever built, which is why it says nothing.',
    },
    {
      id: 'deep-layers.what-broke',
      skill: 'deep.layers',
      kind: 'flash',
      front: 'Why include what broke in a deep dive, and how should you tell it?',
      back: "It's strong evidence you were there; a story with no failures sounds small or edited. Tell it like an incident review: symptom, cause, your part, the fix, and what stopped it recurring.",
    },
  ],
}

export default lesson
