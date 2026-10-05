import type { Lesson } from '../../core/types'

const lesson: Lesson = {
  id: 'deep-drilldown',
  title: 'Surviving drill-downs',
  summary: 'Answer "why not X?", "what breaks at 10x?", "what did you do?" and "how did you measure that?" honestly, and update when a challenge to a past decision lands.',
  minutes: 9,
  skills: ['deep.drilldown', 'values.updating'],
  steps: [
    {
      kind: 'concept',
      id: 'hook',
      eyebrow: 'Project deep dive',
      title: 'The talk is the easy part',
      body:
        'You control the first twenty minutes. After that, the interviewer does.\n\n' +
        'Whatever the wording, drill-downs tend to reduce to four questions: **Why not X?** **What breaks at 10x?** **What did you personally do?** **How did you measure that?** Each tests something different, and each has an answer shape that survives the follow-up after it.',
      callout: {
        tone: 'insight',
        text: 'Candidate reports describe about 20 minutes of presenting, then discussion. Reported probes include Decision A vs Decision B, scaling, sharding, reliability, how agreement was reached across teams, and, in one July 2026 report, who decided the business metric.',
      },
    },
    {
      kind: 'match',
      id: 'what-tests',
      eyebrow: 'Warm-up',
      prompt: "Match each drill-down to what it's really checking.",
      pairs: [
        { left: 'Why not X?', right: 'Did you weigh alternatives, or inherit a default?' },
        { left: 'What breaks at 10x?', right: "Do you know where your system's limits are?" },
        { left: 'What did you personally do?', right: "Where does your work end and the team's begin?" },
        { left: 'How did you measure that?', right: 'Is the number real, and what are its blind spots?' },
        { left: 'Would you make that call again?', right: 'Can you update without caving or digging in?' },
      ],
      explanation:
        'Once you know what a question checks, the answer shape follows. *Why not X?* wants the tradeoff, not a defence. *Would you do it again?* wants judgment, not loyalty to your past self.',
    },
    {
      kind: 'concept',
      id: 'why-not',
      title: '"Why not X?"',
      body:
        'Three moves:\n\n' +
        "1. **Credit X**: its real advantage, stated fairly.\n" +
        '2. **The constraint** that ruled it out for you.\n' +
        '3. **The cost you accepted** by not choosing it.\n\n' +
        "If you never seriously considered X, say so, then reason it through live: *We didn't evaluate it. Thinking now, it would have saved a network hop, but…* That beats a reason invented after the fact.",
      callout: {
        tone: 'insight',
        text: "*We didn't consider it* is survivable. *We considered everything* is not: it invites *name three*.",
      },
    },
    {
      kind: 'compare',
      id: 'why-redis',
      eyebrow: 'Which is stronger?',
      question: "Your project: a rate limiter for a public API. *Why keep the counters in Redis, rather than in each API node's memory?*",
      a: "Per-node counters are simpler and skip a network hop. But we ran 40 nodes behind a round-robin load balancer, so a 100-per-second limit on each node let one client reach 4,000 a second. A shared counter fixed that, at about a millisecond per request. With sticky routing, I'd revisit it.",
      b: "Redis is the standard tool for rate limiting, and plenty of big companies use it for exactly this. Our team already ran it, so it was the natural choice. It's fast and reliable, and it worked really well for us in production, so we never needed to look at alternatives.",
      better: 'a',
      explanation:
        'A credits the alternative, names the constraint (round-robin across 40 nodes), quantifies the cost of the choice, and says what would change it. B is the team-default answer: *standard*, *already had it*, *worked well*. The follow-up, *so why not per-node?*, finds nothing behind it.',
    },
    {
      kind: 'mcq',
      id: 'ten-x',
      eyebrow: 'Next probe',
      prompt: '*What breaks at 10x?* You know the Redis primary peaked at 15k operations a second, at 30% CPU. Best answer?',
      choices: [
        {
          text: "Redis goes first: 30% CPU times ten is 300%. I'd shard counters by client ID, then load-test that estimate.",
          correct: true,
          feedback: 'You walked the path to the first resource that saturates, put a number on it, and labelled the estimate as one.',
        },
        {
          text: 'Nothing, really. Redis is famously fast, and handles hundreds of thousands of operations a second.',
          feedback: 'Maybe on a benchmark. Your own data says 30% CPU at 15k, with a script per check, on one main thread. Use your numbers, not the brochure.',
        },
        {
          text: "We'd add more API nodes behind the load balancer. That's exactly what autoscaling is for.",
          feedback: "More API nodes send more checks to the same Redis. You'd be scaling the tier that isn't the bottleneck.",
        },
        {
          text: "It's impossible to say without running a proper load test. Scaling is too unpredictable.",
          feedback: 'A load test is the right follow-up, not a substitute for an estimate. Walk the path and name your best guess.',
        },
      ],
      explanation:
        "Walk the request path and find the first resource that saturates: a single primary, a hot key, a connection pool, a downstream limit, or the bill. Give the number, the fix, and what you'd measure to check.",
    },
    {
      kind: 'numeric',
      id: 'headroom',
      eyebrow: 'Put a number on it',
      prompt:
        'Same Redis: 15k operations a second at 30% CPU. If CPU scales linearly and you want to stay under 80%, what is the most load the primary should take?',
      answer: 40000,
      tolerance: 0.05,
      unit: 'ops/sec',
      explanation:
        "15,000 × 80 / 30 = 40,000 operations a second: about 2.7x headroom, so 10x is far past the wall. *We'd hit it at around 2.5-3x, not 10x* is the kind of answer this probe is fishing for. Linear scaling is an assumption, so say it out loud.",
      hint: 'If 30% of CPU buys 15k ops/sec, how much does 80% buy?',
    },
    {
      kind: 'concept',
      id: 'i-and-we',
      title: '"What did you personally do?"',
      body:
        'Use *I* for what you did and *we* for the team, and name other people\'s parts specifically: *I wrote the limiter script and the shadow mode; Sam built the dashboards; SRE ran Redis.*\n\n' +
        "Overselling collapses at the next question. Underselling fails too: if everything is *we*, the interviewer can't score you. The test: would your teammates nod if they heard it?",
      callout: {
        tone: 'tip',
        text: 'A decision you argued for and lost still counts, if you can say what you argued and why. So does one you got wrong.',
      },
    },
    {
      kind: 'sort',
      id: 'honest-evasive',
      eyebrow: 'Sort the replies',
      prompt: 'Replies to drill-down questions. Sort each as honest or evasive.',
      buckets: [
        { id: 'honest', label: 'Honest' },
        { id: 'evasive', label: 'Evasive' },
      ],
      items: [
        {
          text: 'I wrote the limiter script and the shadow mode. Sam built the dashboards.',
          bucket: 'honest',
          why: "A clean line, with a teammate's part named.",
        },
        {
          text: "It was a real team effort, so it's hard to separate out.",
          bucket: 'evasive',
          why: "Hides you entirely. The interviewer can't score what they can't attribute.",
        },
        {
          text: "I don't know the exact p99. It's in the gateway logs; I'd guess under 5 ms.",
          bucket: 'honest',
          why: 'Admits the gap, gives a labelled estimate and a way to check.',
        },
        {
          text: 'Latency was negligible. Nobody ever complained about it.',
          bucket: 'evasive',
          why: "No complaints isn't a measurement.",
        },
        {
          text: "We never seriously evaluated per-node limits. Thinking it through now…",
          bucket: 'honest',
          why: 'Owns the gap, then reasons live.',
        },
        {
          text: 'We looked at every option, and this was clearly the best one.',
          bucket: 'evasive',
          why: 'Unfalsifiable. Which options, and best on what?',
        },
        {
          text: "Fair point. I hadn't weighed that, and it changes my view on fail-open.",
          bucket: 'honest',
          why: 'Updates visibly, and says what changed.',
        },
        {
          text: 'Interesting idea, but our setup was quite different.',
          bucket: 'evasive',
          why: 'Deflects without saying what was different, or why it matters.',
        },
      ],
      explanation:
        "Honest replies are specific about the edges: what you did, what you don't know, what you didn't consider. Evasive replies sound smooth and leave nothing to check. The goal isn't smooth; it's checkable.",
    },
    {
      kind: 'concept',
      id: 'dont-know',
      title: "\"I don't know. Here's how I'd find out.\"",
      body:
        "Sooner or later you'll hit a question you can't answer. Three parts:\n\n" +
        "1. **Say it plainly**: *I don't remember the exact number.*\n" +
        '2. **Give a labelled estimate**: *My best guess is under 1%, because…*\n' +
        "3. **Say how you'd find out**: the query, the log, the experiment.\n\n" +
        'A bluff gets caught at the next question, and then everything else you said gets discounted too.',
    },
    {
      kind: 'mcq',
      id: 'measure',
      eyebrow: 'Check',
      prompt:
        "*How did you know the limiter wasn't blocking legitimate traffic?* You don't remember the exact false-positive rate. Best reply?",
      choices: [
        {
          text: 'Two weeks of shadow mode, logging every would-be rejection. The exact rate is in those logs; I recall well under 1%.',
          correct: true,
          feedback: 'Method first, then an honest gap, a labelled estimate and a way to check. That holds up under any follow-up.',
        },
        {
          text: 'Our false-positive rate came in at 0.04%, comfortably inside the target we had agreed for the launch.',
          feedback: "Precise and unsourced. If they ask *how was that measured?*, it collapses, and takes your other numbers with it.",
        },
        {
          text: "We didn't measure it directly, but not a single customer complained after the launch, so it was fine.",
          feedback: "Honest, but silence isn't evidence. A client that got a 429 may have quietly retried, or left.",
        },
        {
          text: "The data team owned all the measurement for that launch, so I'd need to check the details with them.",
          feedback: 'Maybe true, but it hands off the question. Say what you know about how it was measured, then what you would check.',
        },
      ],
      explanation:
        'Lead with the method, because the method is what makes any number credible. Then be exact about what you remember and what you would have to look up.',
    },
    {
      kind: 'concept',
      id: 'challenge',
      title: 'When they say you were wrong',
      body:
        'Sometimes the interviewer argues a past decision was a mistake. Three bad moves: **cave** (*you\'re right, it was wrong*), **dig in** (repeat your case, louder), **deflect** (*the constraints were different*).\n\n' +
        "The good move: say what's right in their point, separate what you knew then from what you know now, and state what changes and what doesn't. Update as far as the argument earns, and no further.",
      callout: {
        tone: 'insight',
        text: "Reports on Anthropic's culture round describe the same signal: your own judgment, honestly explained, and visible updating when the argument is better. Caving isn't updating.",
      },
    },
    {
      kind: 'interview',
      id: 'sim',
      eyebrow: 'Interview sim',
      setup:
        'Deep-dive discussion, minute 22. Your project: a Redis-backed rate limiter for a public API. You designed it, wrote the core script and its shadow mode, and ran the rollout. Sam built the dashboards; SRE ran Redis.',
      turns: [
        {
          interviewer: 'Before we go on: what did you personally build here?',
          options: [
            {
              text: "Honestly, it was a team effort, so it's hard to separate out. We all worked on everything together, and it was a group success.",
              quality: 'weak',
              feedback: 'Generous, and impossible to score. Now the interviewer has to dig for your part, and wonder why it was hidden.',
            },
            {
              text: 'I designed the token-bucket logic, wrote the limiter script and shadow mode, and ran the rollout. Sam did dashboards; SRE ran Redis.',
              quality: 'strong',
              feedback: "A clean line, with others' parts named. Every claim is something they can probe.",
            },
            {
              text: 'I was the lead on it, so I was involved in pretty much every part, from the design through to rollout and monitoring.',
              quality: 'okay',
              feedback: '*Involved in* is fuzzy. Probably true, but which parts did you write?',
            },
          ],
        },
        {
          interviewer: "Why not just use the API gateway's built-in rate limiting?",
          options: [
            {
              text: "We looked: gateway limits are free to run and need no code. But they were static per route, and ours vary by plan and change with billing. I'd recheck newer gateways.",
              quality: 'strong',
              feedback: 'Credit, constraint, and what would change your mind. The gateway gets its real advantages on the table.',
            },
            {
              text: 'We needed more flexibility than the gateway could give us, so building our own limiter made more sense for our particular use case.',
              quality: 'okay',
              feedback: 'Plausible, but *flexibility* is a door with nothing behind it. Flexible how, and what did building cost you?',
            },
            {
              text: 'Built-in gateway limiting is pretty basic, and as a team we generally prefer to build that kind of core infrastructure in-house.',
              quality: 'weak',
              feedback: 'A team default posing as a decision, plus a dig at the alternative and no constraint named.',
            },
          ],
        },
        {
          interviewer: "How did you know it wasn't blocking legitimate traffic?",
          options: [
            {
              text: 'We watched error rates and support tickets closely after launch. Nothing unusual spiked, so we were confident it was fine.',
              quality: 'okay',
              feedback: 'Real monitoring, but it only catches loud failures. Rejected clients may have retried quietly, or left.',
            },
            {
              text: 'Our false-positive rate was 0.04%, comfortably under target, so legitimate traffic was essentially unaffected by the limiter.',
              quality: 'weak',
              feedback: 'Precise and unsourced. If you cannot say how 0.04% was measured, it hurts you more than no number at all.',
            },
            {
              text: 'Two weeks of shadow mode: we logged every request it would have rejected and checked the top clients by hand. Most were real abuse.',
              quality: 'strong',
              feedback: 'Method, then evidence from it. This survives both *how?* and *what did you find?*',
            },
          ],
        },
        {
          interviewer: 'You chose fail-open when Redis is down. So during an outage, anyone can hammer the API. That sounds like the wrong call.',
          options: [
            {
              text: "We weighed that. Redis had two short blips that year, and failing closed would have rejected every paying customer during them. I'd make the same call.",
              quality: 'okay',
              feedback: 'A real reason, but it skips their point. They named a gap; say whether it is real.',
            },
            {
              text: "Partly fair. Failing closed rejects every customer during a blip, so I'd still fail open. But we left no floor: a coarse per-node fallback would cap the damage. I'd add that.",
              quality: 'strong',
              feedback: 'You took what was right in the challenge, kept what still holds, and said exactly what you would change. That is updating, not caving.',
            },
            {
              text: "You're right, that was a mistake. Looking back, we should have failed closed. Safety should always come first, whatever it costs.",
              quality: 'weak',
              feedback: 'Caving. Failing closed rejects every customer whenever Redis blips, so you swapped one risk for another without weighing it. Agreeing is not the same as updating.',
            },
          ],
        },
      ],
      wrapUp:
        'Every turn rewarded the same thing: specific edges. What was yours, what the alternative offered, how the number was measured, and what the challenge got right. The strong answers were not the most confident ones. They were the most checkable.',
    },
    {
      kind: 'reflect',
      id: 'your-drilldowns',
      eyebrow: 'Story Bank',
      prompt: 'Prepare your drill-down answers for your own project.',
      guidance:
        "Answer *Why not [the obvious alternative]?* and *What breaks at 10x?* in a few sentences each. Then name one decision you'd defend under pushback, one you'd partly concede, and one number you'd have to look up, with how. Rehearse out loud; practising answers with Claude is allowed, so have it keep asking *why?*",
      rubric: [
        'Why not X: credits X, then names your constraint and the cost',
        '10x: names the first resource to saturate, with a number',
        'Separates what you built from what others built, by name',
        "Includes one honest \"I don't know\", with how you'd find out",
        'Names a decision you would partly concede, and what you would change',
      ],
      slot: 'project-deep-dive',
      placeholder: 'Why not …? It would have given us … but …',
    },
    {
      kind: 'concept',
      id: 'recap',
      title: 'Keep three things',
      body:
        '1. **Know what each question checks.** *Why not X?* wants the tradeoff; *10x* wants the first bottleneck, with a number; *what did you do?* wants a clean line.\n' +
        "2. **Honest edges beat smooth answers.** *I don't know, here's how I'd find out* survives; a bluff doesn't.\n" +
        "3. **Update as far as the argument earns.** ==Concede what's right, keep what still holds, say what changes.==",
    },
  ],
  cards: [
    {
      id: 'deep-drilldown.dont-know',
      skill: 'deep.drilldown',
      kind: 'flash',
      front: 'What are the three parts of a good *I don\'t know* in a drill-down?',
      back: "Say it plainly; give a labelled best estimate with your reasoning; say exactly how you'd find out (the query, the log or the experiment).",
    },
    {
      id: 'deep-drilldown.challenge',
      skill: 'values.updating',
      kind: 'mcq',
      prompt:
        'You used eventual consistency for inventory counts. The interviewer says that is why you oversold during a flash sale, and they have a point. Best response?',
      choices: [
        {
          text: "Fair for flash sales, where we oversold. I'd keep it for normal traffic and reserve stock synchronously for hot items.",
          correct: true,
          feedback: 'Concedes the right part, keeps what still holds, and names the change.',
        },
        {
          text: "You're right, eventual consistency was the wrong choice. I'd make every count strongly consistent.",
          feedback: "Over-updates. Strong consistency everywhere has latency and availability costs you haven't weighed.",
        },
        {
          text: 'The oversell rate was tiny across the whole year, so I would still defend the design exactly as it was.',
          feedback: 'The yearly average hides the flash-sale case they raised. Engage with the specific point.',
        },
        {
          text: 'Those consistency requirements came from the product team, so that tradeoff was never really my call.',
          feedback: 'Deflects ownership. Even if product set the requirement, the design was yours to defend or amend.',
        },
      ],
      explanation: 'Update as far as the argument earns: concede the specific case, keep what still holds, and say what you would change.',
    },
    {
      id: 'deep-drilldown.calibration',
      skill: 'deep.drilldown',
      kind: 'sort',
      prompt: 'How does each claim describe the candidate\'s real role (in brackets)?',
      buckets: [
        { id: 'over', label: 'Overclaims' },
        { id: 'under', label: 'Undersells' },
        { id: 'accurate', label: 'Accurate' },
      ],
      items: [
        { text: '"I designed the system." (Wrote one of its five services.)', bucket: 'over' },
        { text: '"I led the project." (Attended its planning meetings.)', bucket: 'over' },
        { text: '"We did it as a team." (Wrote the scheduler alone.)', bucket: 'under' },
        { text: '"I helped a bit with retries." (Designed the retry system.)', bucket: 'under' },
        { text: '"I wrote the scheduler; Sam ran the migration."', bucket: 'accurate' },
        { text: '"I proposed the cutover plan; my lead approved it."', bucket: 'accurate' },
      ],
      explanation:
        "Overclaims collapse at *walk me through the parts you didn't build*. Underselling is subtler: it sounds modest, and leaves the interviewer nothing to score. Accurate means a teammate would nod.",
    },
    {
      id: 'deep-drilldown.first-move',
      skill: 'deep.drilldown',
      kind: 'match',
      prompt: 'Match each drill-down to the best first move.',
      pairs: [
        { left: 'Why not X?', right: 'Credit X, then name the constraint that ruled it out' },
        { left: 'What breaks at 10x?', right: 'Walk the request path to the first resource that saturates' },
        { left: 'How did you measure that?', right: 'Describe the method, then its blind spot' },
        { left: 'What did you personally do?', right: 'Use I for your parts, and name who did the rest' },
      ],
      explanation: 'Each first move answers what the question is really checking: tradeoffs, limits, evidence and ownership.',
    },
    {
      id: 'deep-drilldown.headroom',
      skill: 'deep.drilldown',
      kind: 'numeric',
      prompt: 'A service handles 2,000 requests a second at 25% CPU. Assuming linear scaling, roughly what load takes it to 80%?',
      answer: 6400,
      tolerance: 0.1,
      unit: 'req/sec',
      explanation:
        '2,000 × 80 / 25 = 6,400 requests a second, about 3.2x headroom. Say the assumption out loud: scaling is rarely linear near saturation.',
      hint: 'Each 25% of CPU buys 2,000 requests a second.',
    },
    {
      id: 'deep-drilldown.why-not',
      skill: 'deep.drilldown',
      kind: 'compare',
      question: 'Why did you use SQLite on each edge node, instead of a central Postgres?',
      a: "Postgres is great, but SQLite is simpler and lighter, and honestly it's what I knew best. It's a mature, well-tested database, and it worked fine for what we needed, so there wasn't much reason to change it.",
      b: 'Postgres would have given us one source of truth and easy queries. But edge nodes had to keep serving through a network partition, and a round trip to the region added 80 ms. So we kept SQLite locally and accepted up to five minutes of staleness on config.',
      better: 'b',
      explanation:
        'B credits the alternative, names two constraints (surviving a partition, and latency), and states the cost accepted (staleness). A is comfort plus *worked fine*: a default, not a decision.',
    },
    {
      id: 'deep-drilldown.challenge-moves',
      skill: 'values.updating',
      kind: 'flash',
      front: 'An interviewer says one of your past decisions was wrong. Name the three bad responses, and the good one.',
      back: "Bad: cave, dig in, deflect. Good: say what's right in their point, separate what you knew then from what you know now, and state what changes and what doesn't.",
    },
  ],
}

export default lesson
