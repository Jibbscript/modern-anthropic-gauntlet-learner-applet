import type { Lesson } from '../../core/types'

const lesson: Lesson = {
  id: 'design-requirements',
  title: 'Requirements and numbers',
  summary: 'Scope a prompt playground with the questions that fork the design, then let back-of-envelope numbers pick your battles.',
  minutes: 8,
  skills: ['design.requirements'],
  steps: [
    {
      kind: 'concept',
      id: 'hook',
      eyebrow: 'Scoping',
      title: 'Three systems wearing one name',
      body: 'Candidates in 2026 report a *prompt playground* design prompt: users write prompts, run them against a model, save versions, share them.\n\nIt sounds like CRUD with a Run button. But if teammates must see each other type, it needs real-time merging. If prompts run to megabytes, storage changes. If runs are conversations, every run carries history.\n\nThree questions, three different systems. The first five minutes decide which one you build.',
      callout: {
        tone: 'source',
        text: 'Named in a July 2026 [PracHub candidate report](https://prachub.com/interview-experiences/anthropic-software-engineer-interview-experience-rejected-after-a-weak-system-design-round) and in prep guides such as [Hello Interview](https://www.hellointerview.com/guides/anthropic/senior). Specifics like 10 MB+ prompts are prep-site expansions, not verbatim questions.',
      },
    },
    {
      kind: 'mcq',
      id: 'first-question',
      eyebrow: 'One question',
      prompt: 'You get one clarifying question before you start writing. Which buys the most?',
      choices: [
        {
          text: 'Must teammates editing one prompt see each other type, or are versioned saves enough?',
          correct: true,
          feedback:
            'Yes. The answer decides whether you need a real-time merge engine (operational transform or a CRDT) or a simple versioned save. Nothing else forks the design as hard.',
        },
        {
          text: 'Roughly how many users should I design for, and how fast is usage expected to grow?',
          feedback:
            "You'll need it soon, and you can assume a number. But at plausible scale every playground needs a database, a blob store and a run queue. The answer shifts sizes, not shape.",
        },
        {
          text: 'Which database and cloud provider does your team already run in production today?',
          feedback: 'An implementation detail. Interviewers usually want your reasoning, not a match to their stack, and it does not change what the product must do.',
        },
        {
          text: 'Should I go with microservices, or start from one well-structured monolith first?',
          feedback: 'That is your call to make and justify, not a requirement to collect. Asking it hands the design back to the interviewer.',
        },
      ],
      explanation:
        'Ask first about what changes the *shape* of the system. Sizes you can assume and write down; a fork like live co-editing you cannot.',
      hint: 'Which answer would make you throw away the most of your design if you guessed wrong?',
    },
    {
      kind: 'concept',
      id: 'nouns-verbs',
      title: 'Nouns first, then verbs',
      body: "Name the entities: **User**, **Team** (owns prompts and quota), **Prompt** (points at a head version), **Version** (immutable text, model and params), **Run** (one execution of one version, with output and token counts).\n\n**Functional** requirements are verbs on those nouns: write, save, restore, run, share. **Non-functional** ones say *how well*: fast, consistent, available, affordable, isolated. Give each a number or a test.",
    },
    {
      kind: 'sort',
      id: 'fn-or-not',
      prompt: 'Functional or non-functional?',
      buckets: [
        { id: 'fn', label: 'Functional' },
        { id: 'nfn', label: 'Non-functional' },
      ],
      items: [
        { text: 'Run a version and stream its output', bucket: 'fn', why: 'A verb the product performs.' },
        { text: 'Restore an older version as the new head', bucket: 'fn', why: 'A user-visible action.' },
        { text: 'Share a prompt with a teammate as viewer or editor', bucket: 'fn', why: 'A feature, even though it drives the permission model.' },
        { text: 'Save returns in under 200 ms at p95', bucket: 'nfn', why: 'Latency: how well saving works, with a number.' },
        { text: 'Survive the loss of one availability zone', bucket: 'nfn', why: 'Availability. No user clicks a button for this.' },
        { text: 'Prompts may contain secrets: encrypt them at rest', bucket: 'nfn', why: 'Security: a property of every feature, not a feature itself.' },
      ],
      explanation:
        'A quick test: could a user click a button for it? Then it is functional. If it describes a quality every feature must have, it is non-functional. Both belong in the doc, and only the non-functional ones usually come with numbers.',
    },
    {
      kind: 'concept',
      id: 'nfrs',
      title: 'Where this design gets interesting',
      body: "For a prompt playground, the non-functionals pull in different directions:\n\n- **Latency**: typing is local; a save should feel instant.\n- **Consistency**: a saved version must never change, but presence can be seconds stale.\n- **Availability**: a model-provider outage should break runs, not editing.\n- **Cost**: model tokens dwarf storage.\n- **Security**: one tenant's prompts must never leak to another's.",
    },
    {
      kind: 'match',
      id: 'nfr-match',
      prompt: 'Match each requirement to the non-functional property it pins down.',
      pairs: [
        { left: 'Team A can never list or read Team B\'s prompts', right: 'Multi-tenant isolation' },
        { left: 'Saving still works when the model API is returning errors', right: 'Availability' },
        { left: 'Each team has a monthly token budget it cannot exceed', right: 'Cost' },
        { left: 'Keystrokes render without waiting on a server round trip', right: 'Latency' },
        { left: 'After I save, reloading the page shows my new version', right: 'Consistency (read your writes)' },
      ],
      explanation:
        'Writing requirements this concretely is what makes them useful: each one is a test you could run. *The system should be secure and fast* is not a requirement anyone can check.',
    },
    {
      kind: 'concept',
      id: 'envelope',
      title: 'The back-of-envelope chain',
      body: 'Most capacity estimates are one chain of multiplications:\n\n1. daily users × actions per user = actions per day\n2. ÷ 86,400 seconds = average per second\n3. × a peak factor (often 2-5x) = peak per second\n\nRound hard. A day is about 10^5 seconds, so a million actions a day is roughly 10 a second. Write every assumption down so the interviewer can change one and watch the answer move.',
    },
    {
      kind: 'widget',
      id: 'peak-qps',
      eyebrow: 'Your turn',
      prompt: 'Set the sliders to the scenario, then estimate peak runs per second.',
      goal: 'Find peak QPS',
      widget: {
        id: 'estimator',
        config: {
          scenario:
            '100,000 daily active users each run 20 prompts a day. Traffic peaks at 3x the daily average. What is the peak number of runs per second?',
          target: { metric: 'peakQps', value: 69.4 },
          goal: 'answer',
        },
      },
      explanation:
        '100,000 × 20 = 2 million runs a day. Divide by 86,400 for about 23 a second on average, then triple it: about **70 runs a second** at peak. With the 10^5 shortcut you get 60, which is close enough to design with.',
    },
    {
      kind: 'numeric',
      id: 'tokens-per-sec',
      prompt: 'At that peak of about 70 runs a second, each run sends a 2,500-token prompt and gets 500 tokens back. How many tokens per second flow through model calls?',
      answer: 208333,
      tolerance: 0.15,
      unit: 'tokens/s',
      explanation:
        '69.4 runs/s × 3,000 tokens ≈ **208,000 tokens a second** at peak. Counting only the prompt gives 174,000, a sixth short. Tokens, not request count, are your real load: they drive cost, provider rate limits and per-team quotas.',
      hint: 'Runs per second × tokens per run. Count both directions.',
    },
    {
      kind: 'numeric',
      id: 'storage-per-day',
      prompt: 'Each of the 100,000 daily users saves 5 versions a day. A version averages 4 KB and is stored as a full copy. How many GB of new versions per day?',
      answer: 2,
      tolerance: 0.25,
      unit: 'GB/day',
      explanation:
        '100,000 × 5 × 4 KB = 2 × 10^9 bytes, about **2 GB a day** and 730 GB a year. Cheap. But watch the tail: if just 1% of saves were 10 MB prompts, they would add 50 GB a day, 96% of all storage. The tail, not the average, shapes the storage design.',
      hint: 'Saves per day × bytes per save. 4 KB is 4,000 bytes.',
    },
    {
      kind: 'concept',
      id: 'numbers-to-decisions',
      title: 'Read the numbers back as decisions',
      body: "- **70 runs a second is small.** One Postgres holds the metadata; no sharding in v1.\n- **200,000 tokens a second is the real load.** Quotas and provider rate limits matter more than the database.\n- **Runs stream for seconds.** In flight = arrival rate × duration (Little's law): 70 × 15-second runs ≈ 1,000 open streams.\n- **Big prompts set storage.** Bodies go to object storage, deduplicated by hash.",
    },
    {
      kind: 'interview',
      id: 'scoping-round',
      eyebrow: 'Put it together',
      setup: 'Minute two of the design round. The doc holds only the prompt.',
      turns: [
        {
          interviewer: 'Design a prompt playground for teams.',
          options: [
            {
              text: '"Before I start: how many users should I design for, and how fast is usage expected to grow?"',
              quality: 'okay',
              feedback: 'A fair question, but you could assume it. It does not tell you whether you need a real-time merge engine or how big a prompt can get.',
            },
            {
              text: '"I\'ll write my assumptions, plus the three questions that change the design most: live co-editing, prompt size, and whether runs carry chat history."',
              quality: 'strong',
              feedback: 'Strong. You go straight to the forks, and you put them in the doc where the answers will stay visible.',
            },
            {
              text: '"Okay. I\'ll start with a load balancer in front of stateless API servers and a Postgres primary."',
              quality: 'weak',
              feedback: 'Components before scope. You may be designing a different product from the one in the interviewer\'s head.',
            },
          ],
        },
        {
          interviewer: 'Assume whatever you think is reasonable.',
          options: [
            {
              text: '"Then I\'ll write them down: 100k daily users, 20 runs each, 3x peak, prompts mostly a few KB with a long tail. Tell me if any are off. Prompt size is the one the design is most sensitive to."',
              quality: 'strong',
              feedback: 'Strong. Numbers on the page, an invitation to correct them, and you flag which assumption matters most.',
            },
            {
              text: '"Let\'s design for a billion users from day one, so the system scales whatever happens later."',
              quality: 'weak',
              feedback: 'Over-scoping. It forces sharding and global replication the product does not need, and shows you are not sizing to requirements.',
            },
            {
              text: '"Okay, I\'ll keep the design general for now and not tie it to specific numbers until later."',
              quality: 'okay',
              feedback: 'Safe, but without numbers you cannot say which parts are hard, so every component gets the same vague treatment.',
            },
          ],
        },
        {
          interviewer: "What's your latency requirement?",
          options: [
            {
              text: '"Under 100 milliseconds at p99 for every request, so the whole product feels instant."',
              quality: 'okay',
              feedback: 'A number is better than none, but one number for everything is wrong somewhere: a model run cannot finish in 100 ms, and typing should not wait at all.',
            },
            {
              text: '"As low as we can get it. Latency is always the top priority in a user-facing product."',
              quality: 'weak',
              feedback: 'Not checkable, and not true: here, cost and isolation can matter more than shaving milliseconds off a save.',
            },
            {
              text: '"Per operation. Typing is local, so no network wait. Saves 200 ms p95. Runs are dominated by the model, so I\'d budget our overhead before the first token at about 100 ms, then stream."',
              quality: 'strong',
              feedback: 'Strong. Each operation gets a target that fits it, and you separate what you control from what the model controls.',
            },
          ],
        },
      ],
      wrapUp: 'Ask the questions that fork the design, write assumptions as numbers, and give each operation its own target.',
    },
    {
      kind: 'concept',
      id: 'recap',
      title: 'Remember',
      body: '1. **Ask about forks first**: live co-editing, prompt size, runs as conversations. Assume and write down the rest.\n2. **Requirements are checkable**: functional ones are verbs on your entities; non-functional ones carry a number or a test.\n3. **The chain**: users × actions ÷ 86,400 × peak. Then read the result as decisions: here tokens and in-flight streams are the load, not request count.',
    },
  ],
  cards: [
    {
      id: 'design-requirements.avg-qps',
      skill: 'design.requirements',
      kind: 'numeric',
      prompt: 'A service handles 1 million requests a day, spread evenly. Roughly how many requests per second is that on average?',
      answer: 11.6,
      tolerance: 0.25,
      unit: 'req/s',
      explanation: '1,000,000 ÷ 86,400 ≈ 11.6. With the shortcut of 10^5 seconds a day you get 10, close enough to design with.',
    },
    {
      id: 'design-requirements.tokens',
      skill: 'design.requirements',
      kind: 'numeric',
      prompt: 'At peak you serve 40 runs a second, averaging 2,000 tokens each (input plus output). Tokens per second?',
      answer: 80000,
      tolerance: 0.1,
      unit: 'tokens/s',
      explanation: '40 × 2,000 = 80,000 tokens a second. For LLM products, tokens per second, not requests per second, sets cost and provider rate limits.',
    },
    {
      id: 'design-requirements.littles-law',
      skill: 'design.requirements',
      kind: 'flash',
      front: 'Runs arrive at 50 a second and each streams for 20 seconds. How many are in flight at once, and what rule gives it?',
      back: "About 1,000. Little's law: in flight = arrival rate × time in system (50 × 20). It sizes open connections and worker slots, not CPU.",
    },
    {
      id: 'design-requirements.fn-sort',
      skill: 'design.requirements',
      kind: 'sort',
      prompt: 'Functional or non-functional?',
      buckets: [
        { id: 'fn', label: 'Functional' },
        { id: 'nfn', label: 'Non-functional' },
      ],
      items: [
        { text: 'Export a prompt as a ready-made API call', bucket: 'fn' },
        { text: 'Compare two runs side by side', bucket: 'fn' },
        { text: 'Revoke a share link', bucket: 'fn' },
        { text: '99.9% monthly availability for saves', bucket: 'nfn' },
        { text: 'No team can read another team\'s run outputs', bucket: 'nfn' },
        { text: 'Run history appears within 5 seconds of a run finishing', bucket: 'nfn' },
      ],
      explanation: 'Functional: an action a user takes. Non-functional: a quality bar every action must meet, ideally with a number.',
    },
    {
      id: 'design-requirements.assume',
      skill: 'design.requirements',
      kind: 'mcq',
      prompt: 'The interviewer says "assume whatever you think is reasonable." What is the best next move?',
      choices: [
        {
          text: 'Write numbered assumptions with numbers, say which one the design is most sensitive to, and continue',
          correct: true,
          feedback: 'Yes. Visible, correctable, and it shows you know where the risk is.',
        },
        { text: 'Pick very large numbers so the design is safe at any scale', feedback: 'Over-scoping buys complexity the product does not need, and hides your sense of proportion.' },
        { text: 'Keep asking questions until the interviewer gives you exact figures', feedback: 'They just told you to decide. Pushing back again reads as unwillingness to make a call.' },
        { text: 'Skip numbers and keep the design general', feedback: 'Without numbers you cannot tell which parts are hard, so you cannot choose what to deep-dive.' },
      ],
      explanation: '"Assume" is an invitation to show judgment. Make the assumptions explicit so they can be challenged.',
    },
    {
      id: 'design-requirements.eventual',
      skill: 'design.requirements',
      kind: 'mcq',
      multi: true,
      prompt: 'In a prompt playground, which of these can safely be *eventually* consistent? Select all that apply.',
      choices: [
        { text: 'The list of who is viewing a prompt', correct: true, feedback: 'Yes. Presence that is a few seconds stale harms nobody.' },
        { text: 'The run-history list on a dashboard', correct: true, feedback: 'Yes. A finished run showing up a second late is fine.' },
        { text: 'A weekly usage analytics chart', correct: true, feedback: 'Yes. Aggregates can lag minutes or more.' },
        { text: 'Which version is the head of a prompt', feedback: 'No. Compare-and-set on the head only works if every writer sees the latest head; on a lagging replica, two saves can both win.' },
        { text: 'Whether a revoked share link still works', feedback: 'No. Revocation is a security promise; a lagging check leaks data after the owner cut access.' },
      ],
      explanation: 'Spend strong consistency where a stale read breaks correctness or security, and let everything else lag.',
    },
    {
      id: 'design-requirements.forks',
      skill: 'design.requirements',
      kind: 'flash',
      front: 'Name three clarifying questions that change the shape of a prompt playground design.',
      back: 'Must collaborators see each other type, or are versioned saves enough? How large can a prompt get? Are runs independent, or conversations with history? Also: who can see what when sharing.',
    },
  ],
}

export default lesson
