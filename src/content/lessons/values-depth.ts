import type { Lesson } from '../../core/types'

const lesson: Lesson = {
  id: 'values-depth',
  title: 'Answers with depth',
  summary:
    'Build answers that survive three or four follow-ups: a six-rung ladder from what happened to what you would change, in about two minutes.',
  minutes: 8,
  skills: ['values.depth'],
  steps: [
    {
      kind: 'concept',
      id: 'hook',
      eyebrow: 'Culture round',
      title: 'Three levels down',
      body:
        'Candidate reports describe culture-round follow-ups that go three or four levels deep. Treat that as a spec: it tells you how much story you need *below* the part you rehearsed.\n\n' +
        'Most prepared answers have one level: what happened. The first *why?* lands on bare floor.\n\n' +
        'This lesson builds the floors underneath.',
      callout: {
        tone: 'source',
        text:
          'Culture probing "3-4 levels deep": Exponent\'s guide, [republished by Yale SOM\'s career office](https://cdo.som.yale.edu/blog/2026/05/18/get-a-job-at-anthropic-interview-process-and-top-questions/) in May 2026. A candidate-reported pattern, not an official format.',
      },
    },
    {
      kind: 'concept',
      id: 'ladder',
      title: 'The depth ladder',
      body:
        "Six rungs. Each one is a follow-up you've answered before it's asked.\n\n" +
        '1. **Situation**: two sentences, no more\n' +
        '2. **What you thought then**: before hindsight, doubts included\n' +
        '3. **What you did, and why**: the reasoning, not just the action\n' +
        '4. **What it cost**: you, the team, the users\n' +
        '5. **How you see it now**: your honest verdict\n' +
        "6. **What you'd change**: or what would change your mind",
      callout: {
        tone: 'tip',
        text: 'Rungs 2, 4 and 5 are the ones a STAR script skips, and the ones probes aim at.',
      },
    },
    {
      kind: 'order',
      id: 'climb',
      eyebrow: 'Build it',
      prompt: "Here's one story, cut into rungs. Put them in ladder order.",
      items: [
        'We had two weeks to move billing onto a new job queue.',
        'I thought the retry logic could double-charge people, but I was maybe 70% sure.',
        'I asked for one more week, and showed two duplicate charges from staging.',
        'We missed the launch window, and my manager took the heat with finance.',
        'I still think the delay was right, but I overrated the risk: one of the two was a test artifact.',
        "Next time I'd ship to 1% behind a flag instead of asking for all or nothing.",
      ],
      explanation:
        "Situation, thought, action with its reason, cost, verdict, change. Notice that rung 5 isn't *I was right*. It's a mixed verdict with evidence, and that is what makes rung 6 believable.",
      hint: 'What happened comes first and what you would do next time comes last. In between, follow time: what you thought, then what you did.',
    },
    {
      kind: 'concept',
      id: 'depth-one',
      title: 'One story, depth 1',
      body:
        'A plausible answer to *Tell me about something that went badly and was your fault*:\n\n' +
        '> I once ran a migration that caused a latency spike. I rolled it back quickly, wrote a postmortem, and we added load testing to our process. It taught me to never skip testing.\n\n' +
        "All true: events, then a moral. The moral invites the obvious probe: *so why did you skip it?*",
    },
    {
      kind: 'mcq',
      id: 'missing-rung',
      eyebrow: 'Depth 2',
      prompt:
        'Same story, one level deeper:\n\n' +
        '> I owned a search schema migration, and we were behind. I skipped the staging load test. The online index rebuild pushed p99 latency to two seconds for six hours. I rolled back, ran the postmortem, and we made the load test mandatory.\n\n' +
        'What will a probing interviewer ask next?',
      choices: [
        {
          text: 'What you were thinking when you skipped the load test',
          correct: true,
          feedback: "Yes. The answer names the decision but hides the reasoning. That's rung 2, and it's where the interesting part of a failure lives.",
        },
        {
          text: 'How the online index rebuild worked, in technical detail',
          feedback: "Tempting for an engineer, but that's the project deep-dive. Here the gap is about you, not the index.",
        },
        {
          text: 'What six hours of slow search cost the business',
          feedback: 'Numbers help, and cost is a real rung. But the bigger hole comes earlier: why the test got skipped at all.',
        },
        {
          text: 'Who else on the team had reviewed the migration plan',
          feedback: 'It might come up, but it moves the focus off your own decision, which is what the question asked about.',
        },
      ],
      explanation:
        'Depth 2 has the facts and the fix. It is missing what you thought (rung 2), what it cost beyond latency (rung 4) and how you see it now (rung 5). Rung 2 comes first, because every later rung depends on it.',
    },
    {
      kind: 'compare',
      id: 'depth-three',
      eyebrow: 'Depth 3',
      question: '*Tell me about something that went badly and was your fault.*',
      a:
        "Last spring I owned a search migration, a week behind. I skipped the load test. Honestly, I'd run dozens of these and was tired of being the bottleneck. It rebuilt an index online; p99 hit two seconds for six hours, and on-call lost a Saturday. The skip wasn't a slip: I'd been treating *I've done this before* as evidence. Now any migration touching an index gets a load test and a second reviewer, mine included.",
      b:
        'Last spring I owned a schema migration for our search service, running on Postgres 14 with about 40 million rows across six tables. We were moving a text column to a new tokenizer, which meant rebuilding a GIN index. I skipped the staging load test because of time pressure, and the online rebuild pushed p99 latency from 200 milliseconds to two seconds for six hours, until we rolled back. Afterwards we wrote a postmortem and added the load test to our migration checklist.',
      better: 'a',
      explanation:
        'B is longer and shallower. It spends its words on rung 1, then jumps to a process fix, and never says what the candidate thought, what it cost anyone or how they judge it now. A reaches all six rungs in fewer words: the real motive, a cost to a person, an honest verdict about a pattern, and a specific change. Depth is which rungs you reach, not how many words you use.',
    },
    {
      kind: 'concept',
      id: 'two-minutes',
      title: 'Depth is not length',
      body:
        'A good default, not a rule: about two minutes on the first pass, then let them pull. People talk at very roughly 150 words a minute, so that is about 300 words for six rungs.\n\n' +
        'Rambling answers usually spend most of those words on rung 1: the stack, the org chart, the timeline. Give the situation two sentences. Spend the rest on rungs 2 to 6.',
      callout: {
        tone: 'tip',
        text: 'Leave hooks. A rung stated in one sentence ("part of me was relieved") invites the follow-up you are ready for.',
      },
    },
    {
      kind: 'numeric',
      id: 'cut-words',
      eyebrow: 'Estimate',
      prompt:
        'Your written draft of a story is 480 words. Spoken at about 150 words per minute, how many words do you need to cut to bring it to two minutes?',
      answer: 180,
      tolerance: 0.1,
      unit: 'words',
      explanation:
        'Two minutes at 150 words a minute is 300 words, and 480 − 300 = 180. Uncut, the draft runs about 3.2 minutes. Cut from rung 1 first: drafts are usually heaviest on setup.',
      hint: 'Work out how many words fit in two minutes, then subtract.',
    },
    {
      kind: 'concept',
      id: 'whose-thought',
      title: 'When they ask what you thought',
      body:
        'When an interviewer cuts in with *But what did you think?*, leaning on the *you*, they have probably noticed you hiding. Usually in *we* ("we decided"), in the outcome ("it worked out") or in process ("we aligned").\n\n' +
        "Don't retreat to the team's view. Give your own, from the time, even if it was wrong or a bit petty. Then put a rough number on how sure you were.",
    },
    {
      kind: 'sort',
      id: 'which-rung',
      eyebrow: 'Sort',
      prompt: 'Follow-ups aim at specific rungs. Sort each one by the rung it targets.',
      buckets: [
        { id: 'then', label: 'What you thought then' },
        { id: 'cost', label: 'What it cost' },
        { id: 'now', label: 'How you see it now' },
      ],
      items: [
        { text: 'What were you worried about going in?', bucket: 'then', why: 'Your state of mind before the outcome.' },
        { text: 'What was going through your head when you skipped it?', bucket: 'then', why: 'The reasoning at the moment of decision.' },
        { text: 'Who paid for that, besides you?', bucket: 'cost', why: 'The cost to other people.' },
        { text: 'What did pushing back cost you with your manager?', bucket: 'cost', why: 'The price of the action you took.' },
        { text: 'Would you make the same call today?', bucket: 'now', why: 'Your verdict with hindsight.' },
        { text: 'What do you think you got wrong?', bucket: 'now', why: 'An honest assessment from where you stand now.' },
      ],
      explanation:
        "If you can hear which rung a follow-up is aiming at, you can answer it in a sentence or two instead of retelling the story. You can only answer each of these well if you built that rung beforehand.",
    },
    {
      kind: 'interview',
      id: 'drill-sim',
      eyebrow: 'Interview sim',
      setup: 'Culture round. The interviewer opens with a question candidates report hearing in 2026, then keeps going down.',
      turns: [
        {
          interviewer: 'Tell me about a time someone changed your mind on something you felt strongly about.',
          options: [
            {
              text: "We had a big debate about rewriting our job scheduler. After looking at the profiling data together, we decided as a team that the rewrite wasn't needed after all.",
              quality: 'okay',
              feedback: "Real, but it's all *we*. Whose mind changed, from what to what? Expect the next question to ask exactly that.",
            },
            {
              text: "I try to keep a really open mind, so honestly I change my views all the time whenever I hear a good argument. I don't really hold my opinions all that strongly.",
              quality: 'weak',
              feedback: 'A dodge dressed as a virtue. The question asked for a time you felt strongly; this says you never do.',
            },
            {
              text: 'I argued for a month that our job scheduler needed a Go rewrite. Then a teammate profiled it: 80% of the latency was one unindexed query. I dropped the rewrite.',
              quality: 'strong',
              feedback: 'What you believed, how hard you held it, and what evidence moved you. Short, with room for the follow-up.',
            },
          ],
        },
        {
          interviewer: 'Hold on. Before the profile came back, what did *you* think was going on?',
          options: [
            {
              text: 'That the Python workers were choking on the GIL. I was maybe 80% sure. Honestly, part of it was that I wanted an excuse to write Go.',
              quality: 'strong',
              feedback: 'Your hypothesis, your confidence, and an unflattering motive. That last detail is what makes the update believable.',
            },
            {
              text: "I thought the scheduler was just too slow for the load we had and needed a serious overhaul, which is exactly why I'd proposed the rewrite in the first place.",
              quality: 'okay',
              feedback: "That's your conclusion, not your diagnosis. What did you think was causing it, and how sure were you?",
            },
            {
              text: 'The team generally felt the scheduler had performance issues under load, and there was broad agreement that we should explore all of our options.',
              quality: 'weak',
              feedback: 'Back into *we*, when the question leaned on *you*. This is the hiding the follow-up was meant to flush out.',
            },
          ],
        },
        {
          interviewer: 'How do you see it now?',
          options: [
            {
              text: "Honestly, I still think the rewrite would have been better for us in the long term. I just went along with the team's decision so that we could keep things moving.",
              quality: 'weak',
              feedback: 'This contradicts your own story, since you said your mind changed. Coaches list a mismatch between what you say and what you did as a red flag.',
            },
            {
              text: "Right that it was slow, wrong about why. I'd reached for the fun fix. Now I profile before arguing for any rewrite, mine first. Go is a preference, not evidence.",
              quality: 'strong',
              feedback: 'A split verdict, a named blind spot, a concrete habit change, and a clean line between preference and evidence.',
            },
            {
              text: "It taught me how important it is to make decisions based on data rather than instinct or gut feel, and I've tried hard to apply that lesson on every project since.",
              quality: 'okay',
              feedback: 'True, but it fits any story. Which habit changed, and how would a teammate notice?',
            },
          ],
        },
      ],
      wrapUp:
        'The first answer was short on purpose; the depth showed up when the interviewer pulled. Rungs 2 and 5 did the work: a real hypothesis held at 80%, an honest motive, and a specific habit that changed afterward.',
    },
    {
      kind: 'reflect',
      id: 'failure-ladder',
      eyebrow: 'Story Bank',
      prompt: 'Climb the ladder on a real failure: *Tell me about something that went badly and was your fault.*',
      guidance:
        'One or two sentences per rung, 300 words at most. Name your part plainly. For rung 2, write what you actually thought, not what you wish you had thought. For rung 5, give a verdict, even a mixed one. Then read it aloud and time it.',
      rubric: [
        'The situation takes two sentences or fewer',
        'States what you thought at the time, with a rough confidence',
        'Names a cost to someone other than you',
        'Gives an honest verdict now, not just "I learned a lot"',
        'Ends with a specific change, and evidence it stuck',
      ],
      slot: 'failure',
      placeholder: 'Last year I …',
    },
    {
      kind: 'concept',
      id: 'recap',
      title: 'Keep three things',
      body:
        "1. **Six rungs**: situation, what you thought, what you did and why, what it cost, how you see it now, what you'd change.\n" +
        '2. **Depth is which rungs you reach**, not how long you talk. About two minutes, roughly 300 words, then let them pull.\n' +
        '3. **When they ask what you thought**, give your own view from the time, with a rough number on how sure you were.',
    },
  ],
  cards: [
    {
      id: 'values-depth.rungs',
      skill: 'values.depth',
      kind: 'order',
      prompt: 'Put the rungs of the depth ladder in order.',
      items: [
        'Situation, in two sentences',
        'What you thought at the time',
        'What you did, and why',
        'What it cost',
        'How you see it now',
        "What you'd change, or what would change your mind",
      ],
      explanation: 'Event, then your thinking, then action with reasons, then consequences, then a verdict, then the change. Each rung is a follow-up you answer before it is asked.',
    },
    {
      id: 'values-depth.rambling',
      skill: 'values.depth',
      kind: 'flash',
      front: 'Your first-pass answer keeps running well past two minutes. Where are the extra words usually going, and what do you cut?',
      back: 'Into rung 1: the stack, the org chart, the timeline. Cut the situation to two sentences and spend the rest on what you thought, what it cost, your verdict now and the change.',
    },
    {
      id: 'values-depth.ninety-seconds',
      skill: 'values.depth',
      kind: 'numeric',
      prompt: 'At about 150 words per minute, roughly how many words fit in a 90-second answer?',
      answer: 225,
      tolerance: 0.1,
      unit: 'words',
      explanation: '1.5 minutes × 150 words a minute = 225 words. Enough for two sentences of situation and one or two sentences on each remaining rung.',
    },
    {
      id: 'values-depth.name-rung',
      skill: 'values.depth',
      kind: 'mcq',
      prompt: '*I was maybe 60% sure, and part of me just didn\'t want the fight.* Which rung of the depth ladder is this?',
      choices: [
        { text: 'What you thought at the time', correct: true, feedback: 'Yes: a confidence level and a motive, from before the outcome.' },
        { text: 'What it cost, and to whom', feedback: 'Cost is about consequences for people. This describes your state of mind.' },
        { text: 'How you see it now', feedback: 'It could sound like hindsight, but it describes what you felt then, not your verdict today.' },
        { text: 'What you did, and why', feedback: 'Close, but no action is described. This is the thinking that came before the action.' },
      ],
      explanation: 'Confidence and motive before the outcome belong to rung 2. It is the rung probes reach for first, and the one rehearsed stories most often leave out.',
    },
    {
      id: 'values-depth.depth-or-length',
      skill: 'values.depth',
      kind: 'sort',
      prompt: 'Does each sentence add depth, or just length?',
      buckets: [
        { id: 'depth', label: 'Adds depth' },
        { id: 'length', label: 'Adds length' },
      ],
      items: [
        { text: 'I was about 70% sure, and that was mostly gut.', bucket: 'depth' },
        { text: 'It cost my manager credibility with finance for a quarter.', bucket: 'depth' },
        { text: "I'd still push back, but in writing, and a week earlier.", bucket: 'depth' },
        { text: 'The service ran on Kubernetes with three replicas per region.', bucket: 'length' },
        { text: 'We had standups every morning at 9:30 to sync on progress.', bucket: 'length' },
        { text: 'There were many stakeholders, including product, design and two other teams.', bucket: 'length' },
      ],
      explanation: 'Depth sentences answer a probe: what you thought, what it cost, what you would change. Length sentences add setup the interviewer did not ask for.',
    },
    {
      id: 'values-depth.missed-commitment',
      skill: 'values.depth',
      kind: 'compare',
      question: '*Tell me about a time you missed a commitment.*',
      a: 'I committed to a Q3 API launch and we slipped three weeks. Some upstream dependencies came in late and the scope grew along the way. I kept stakeholders updated weekly, we re-planned together, and we shipped early in Q4. It taught me to always build buffer into my estimates.',
      b: "I committed to a Q3 API launch and slipped three weeks. My estimate assumed the auth team would deliver on time, and I didn't say so, because it felt like making excuses in advance. A partner team missed their launch because of us. Now I write assumptions into the estimate itself.",
      better: 'b',
      explanation: 'A blames dependencies, stops at the result and ends on a generic moral. B gives what the candidate thought and why they stayed quiet, the cost to another team, and a specific change.',
    },
    {
      id: 'values-depth.you-not-we',
      skill: 'values.depth',
      kind: 'flash',
      front: 'Mid-answer, the interviewer asks *But what did you think?*, leaning on the "you". What are they signaling, and how should you respond?',
      back: "That you're hiding in \"we\", the outcome or the process. Give your own view from the time, even if it was wrong or petty, with a rough confidence.",
    },
  ],
}

export default lesson
