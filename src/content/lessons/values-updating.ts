import type { Lesson } from '../../core/types'

const lesson: Lesson = {
  id: 'values-updating',
  title: 'Updating, live',
  summary:
    'Change your mind in public by the right amount: hold against empty pushback, update visibly on a better argument, and say how sure you are.',
  minutes: 8,
  skills: ['values.updating', 'values.judgment'],
  steps: [
    {
      kind: 'concept',
      id: 'hook',
      eyebrow: 'Culture round',
      title: 'The pushback is the question',
      body:
        "You give your view. The interviewer pauses: *Hmm. I'm not sure that's right.*\n\n" +
        "No argument, just pressure. Fold, and you've shown your views track the room. Dig in, and they track your ego. Both fail one test: does your position depend on reasons?\n\n" +
        "You usually can't tell a sincere pushback from a probe. ==Answer the argument, not the person.==",
      callout: {
        tone: 'insight',
        text: 'Prompts candidates report from 2025-2026: *When did you realize you were wrong?*, *Describe a strongly held view that proved wrong*, and *Tell me about a time someone changed your mind on something you felt strongly about*. Follow-ups reportedly run three or four levels deep.',
      },
    },
    {
      kind: 'mcq',
      id: 'bare-pushback',
      eyebrow: 'Your move',
      prompt:
        "You said you'd add tests before refactoring the billing module. The interviewer says only: *Hmm. I'm not sure that's right.* Best reply?",
      choices: [
        {
          text: "Fair question. My reason: no tests, and it moves money, so a silent break is costly. What worries you: time, or the approach?",
          correct: true,
          feedback:
            "Holds the view, restates the reason, and asks for theirs. A bare *not sure* carries no new information, so your confidence shouldn't move yet.",
        },
        {
          text: "You're right, that's probably overkill for a refactor this size. I'd skip the tests and start on the code directly to save time.",
          feedback: "You moved on zero information. If a raised eyebrow changes your answer, the interviewer can't trust any of your answers.",
        },
        {
          text: "I'm confident it's right. Writing tests before any refactor is simply best practice, so I'd stick with that plan.",
          feedback: "Holding is right, but *best practice* isn't a reason. Say why it matters here, then invite their concern.",
        },
        {
          text: 'I guess it depends. There are good arguments on both sides, and honestly either approach could work out fine here.',
          feedback: 'Dissolving into *it depends* is a quieter way to cave. You had a view a moment ago. Where did it go?',
        },
      ],
      explanation:
        "No new information, no move. Restate the reason in a sentence and ask what they're worried about. If they come back with a real argument, that's a different situation, and the next screen covers it.",
    },
    {
      kind: 'concept',
      id: 'proportional',
      title: 'Move by the size of the argument',
      body:
        'Updating is proportional. No new information, no move. A real argument or new evidence moves you by as much as it warrants, and you say exactly what moved:\n\n' +
        '- **What changed**: *That changes my view on X.*\n' +
        "- **What didn't**: *I'd still hold Y, because…*\n" +
        "- **What would move me further**: *If Z, I'd drop it.*",
      callout: {
        tone: 'tip',
        text: 'Steelman before you answer: restate their point in its strongest form (*So your worry is that…*). It shows you heard it, buys thinking time, and often shows the argument is stronger, or weaker, than it first sounded.',
      },
    },
    {
      kind: 'match',
      id: 'pushback-responses',
      eyebrow: 'Read the pushback',
      prompt: 'Match each pushback to its diagnosis and response.',
      pairs: [
        { left: "*I'm not sure about that.*", right: 'Bare doubt: hold, restate your reason' },
        { left: "*Here's data: your assumption is wrong.*", right: 'Evidence: update the part it touches' },
        { left: '*Most people here would disagree.*', right: "Social proof: ask for their argument" },
        { left: '*What if traffic were 100x?*', right: 'New constraint: re-answer for it' },
        { left: '*That sounds a bit naive.*', right: 'Tone: skip the label, ask which part' },
      ],
      explanation:
        "Only one of these carries evidence, and only one changes the problem. The rest are doubt, social proof and tone. A crowd disagreeing is a reason to look harder, not a reason by itself. Pressure gets your reasons and a question back, not a concession.",
    },
    {
      kind: 'concept',
      id: 'caving',
      title: "Caving isn't updating",
      body:
        "Agreeing with the interviewer feels safe. It isn't. Fold to a bare *are you sure?* and every view you've stated loses value, because your answers now track the room, not the reasons.\n\n" +
        'Stubbornness fails the same test from the other side. One rule covers both: ==move in proportion to the argument==, and say which part moved.',
      callout: {
        tone: 'source',
        text: "Anthropic lists *Be helpful, honest, and harmless* among its company values, and Claude's January 2026 constitution counts *being honest* as part of being broadly ethical. Telling someone what they want to hear is a small failure of honesty. Sources: [company page](https://www.anthropic.com/company); [constitution post](https://www.anthropic.com/news/claude-new-constitution).",
      },
    },
    {
      kind: 'mcq',
      id: 'update-or-cave',
      eyebrow: 'Updating or caving?',
      multi: true,
      prompt: 'Which replies are genuine updates rather than capitulation? Select all that apply.',
      choices: [
        {
          text: "I didn't know about that benchmark, and it beats my anecdote. I'll drop the claim that the old parser is faster.",
          correct: true,
          feedback: 'Names the new evidence and exactly which claim it retires.',
        },
        {
          text: 'Good point on write volume. It changes how I would cache, but not the choice of Postgres; it handles that rate fine.',
          correct: true,
          feedback: 'A partial update with a reason for the part that stays. This is the most common shape of a real update.',
        },
        {
          text: "You've clearly thought about this a lot more than I have, so let's just go with your approach instead of mine.",
          feedback: 'Deference to the person, not the argument. Nothing in it says what you learned.',
        },
        {
          text: "Fair enough, I'll change it.",
          feedback: 'Maybe a real update, but nothing in it says what moved you. Unexplained agreement reads as caving.',
        },
        {
          text: "OK, if that's what you'd prefer, I'm flexible. Happy to go either way on this one, honestly. Your call.",
          feedback: "Preference isn't an argument. *Flexible* here means you didn't hold a view, or won't defend it.",
        },
      ],
      explanation:
        "An update names the argument and the part of your view it changed. Capitulation names the person, or nothing. If you can't say what moved you, you didn't update. You yielded.",
      hint: 'Look for replies that say what, specifically, changed.',
    },
    {
      kind: 'concept',
      id: 'calibration',
      title: 'Say how sure you are',
      body:
        'Overclaiming (*definitely*, *always*, *everyone knows*) makes every later update look like a reversal. Calibrated language leaves room to move without losing face:\n\n' +
        "- *I'd put this around 70%.*\n" +
        '- *Confident about X, unsure about Y.*\n' +
        "- *My best guess, and here's what would change it.*\n\n" +
        "Calibration isn't hedging. *It depends*, with no lean, hides your view as surely as *definitely* inflates it.",
      callout: {
        tone: 'source',
        text: 'Anthropic on California\'s SB 1047 (Aug 2024): "we believe its benefits likely outweigh its costs. However, we are not certain of this." A public position with its confidence attached. [Coverage](https://campustechnology.com/articles/2024/08/26/anthropic-announces-cautious-support-for-new-california-ai-regulation-legislation.aspx)',
      },
    },
    {
      kind: 'sort',
      id: 'calibration-sort',
      eyebrow: 'Calibration',
      prompt: 'Sort each statement.',
      buckets: [
        // \u00AD = soft hyphen. At 390px, three bucket buttons split 'Calibrated' mid-letter; the soft
        // hyphens give a clean break point and push the label over SortStep's compact-size threshold.
        { id: 'cal', label: 'Cali\u00ADbrated' },
        { id: 'over', label: 'Over\u00ADclaimed' },
        { id: 'hedge', label: 'Empty hedge' },
      ],
      items: [
        {
          text: "I'd guess 70% the cache is the bottleneck; a profile would settle it.",
          bucket: 'cal',
          why: 'A lean, a confidence, and a way to find out.',
        },
        {
          text: 'Rust would definitely have prevented this outage.',
          bucket: 'over',
          why: '*Definitely* about a counterfactual nobody can check.',
        },
        {
          text: 'There are pros and cons to every approach, so it really depends.',
          bucket: 'hedge',
          why: 'True of everything, so it says nothing. Depends on what, and which way do you lean?',
        },
        {
          text: "I'm confident the race is in the retry path, less sure it's the only one.",
          bucket: 'cal',
          why: 'Splits the claim and gives each part its own confidence.',
        },
        {
          text: 'Everyone knows microservices are wrong for small teams.',
          bucket: 'over',
          why: '*Everyone knows* replaces an argument with a crowd.',
        },
        {
          text: "It could be the network, or the disk, or the code. Hard to say.",
          bucket: 'hedge',
          why: 'Lists possibilities without ranking them, so nobody learns your read.',
        },
        {
          text: 'This will never be a problem at our scale.',
          bucket: 'over',
          why: '*Never* is a big word for a system that will grow.',
        },
        {
          text: "Probably the index. If p99 doesn't drop after we add it, I'm wrong.",
          bucket: 'cal',
          why: 'A best guess with its own falsification test.',
        },
      ],
      explanation:
        'Calibrated statements commit to a lean and say how strongly, often with a way to check. Overclaims commit too hard to update gracefully. Empty hedges never commit, so there is nothing to update.',
    },
    {
      kind: 'compare',
      id: 'changed-mind-compare',
      eyebrow: 'Which is stronger?',
      question: 'Tell me about a time someone changed your mind.',
      a: "I'm very open-minded, so it happens a lot. My team convinced me to switch to TypeScript. I was skeptical at first, but they made some really good points, and now I'd never go back. I think being willing to change your mind is one of the most important traits an engineer can have.",
      b: "I was about 90% sure we should build our own job queue; vendor pricing scared me. Our on-call lead showed me six months of pages from our last homegrown queue. I switched to buying within a week, but kept my cost worry and negotiated a cap. Lesson: I count build cost and ignore run cost.",
      better: 'b',
      explanation:
        "B gives a confidence level, the specific evidence, what moved and what didn't, how fast, and the blind spot it exposed. A says *good points* without naming one, so the interviewer can't tell an argument from a mood.",
    },
    {
      kind: 'interview',
      id: 'pushback-sim',
      eyebrow: 'Interview sim',
      setup:
        'Culture round. The interviewer asks for your view on something current, then pushes back twice. One pushback is empty. The other is not.',
      turns: [
        {
          interviewer: 'Your team is adopting coding agents. Should every AI-generated pull request get a human review?',
          options: [
            {
              text: "For now, yes. AI diffs look plausible and fail quietly; review catches that. I'm confident for production code, less sure for low-risk changes like tests. Data could move me there.",
              quality: 'strong',
              feedback: 'A position, a reason, and a confidence level that differs by case. It also names what would change it.',
            },
            {
              text: "Yes, always. You can't really trust AI-generated code yet, so every single change needs a human to read it and sign off before it merges, however small it looks.",
              quality: 'okay',
              feedback: 'Defensible, but *always* and *can\'t trust* leave no room to update. Any good counterexample now forces a reversal.',
            },
            {
              text: "Honestly, whatever the team prefers. I could see it going either way, and I'd rather adapt to the norms the team already has than arrive with strong opinions.",
              quality: 'weak',
              feedback: 'You were asked for your view. Having none leaves nothing to update, and nothing to evaluate.',
            },
          ],
        },
        {
          interviewer: 'Hmm. Plenty of fast-moving teams have dropped that. It feels a bit old-fashioned.',
          options: [
            {
              text: "That's fair, I'll drop it then. Speed matters more than it used to, and if strong teams have moved past it, I don't want to be the one slowing everyone down.",
              quality: 'weak',
              feedback: 'You folded to social proof and a tone. Your first answer had a reason; nothing here answered it.',
            },
            {
              text: "I can see that, and maybe I'm being a little conservative. I'd still keep it for now, I think, at least until we've seen how it goes and the team feels comfortable.",
              quality: 'okay',
              feedback: 'You held, which is right, but without your reason. Restate it and ask for evidence.',
            },
            {
              text: "Others dropping it shows it's possible, not that it's safe here. My reason stands: plausible diffs fail quietly. Data on what review actually catches would move me. Have any?",
              quality: 'strong',
              feedback: 'Holds with the reason, separates *others do it* from *it is safe*, and names the evidence that would move you.',
            },
          ],
        },
        {
          interviewer:
            'We do. Over six months, 1,200 AI-generated PRs touched only tests. Reviewers approved 98% unchanged, and the median wait was two days, which blocked feature work.',
          options: [
            {
              text: "Then I was wrong, and that's useful to know. Let's drop mandatory review for all AI-generated PRs and lean on CI and spot checks instead. The data is pretty clear.",
              quality: 'okay',
              feedback: 'You updated on evidence, which is good, then stretched it past what it covers. The data is about test-only PRs.',
            },
            {
              text: "That moves me on test-only PRs; there, review is mostly delay. 98% unchanged may also mean shallow reviews, so I'd sample 10%. The data doesn't cover production code, so I hold there.",
              quality: 'strong',
              feedback:
                'Says what moved, what did not and why, and reads the evidence critically without using that as an excuse to ignore it.',
            },
            {
              text: "Data like that can be misleading, though, and six months isn't very long. I'd still require a human review on every single PR, as a matter of principle. Some things just need a person.",
              quality: 'weak',
              feedback: 'You asked for evidence, got it, and ignored it. That is the clearest sign your view does not depend on reasons.',
            },
          ],
        },
      ],
      wrapUp:
        'Same candidate, same view, two pushbacks. The first carried no information, so the strong answer held and asked for evidence. The second carried evidence, so the strong answer moved exactly as far as the data reaches. That is the whole skill.',
    },
    {
      kind: 'reflect',
      id: 'changed-mind',
      eyebrow: 'Story Bank',
      prompt: 'Write your answer to *Tell me about a time someone changed your mind.*',
      guidance:
        "Pick a belief you held with real confidence, ideally a technical or strategic call. Say how sure you were (a rough number helps), what argument or evidence moved you, how fast and how far, and what it taught you about your blind spots. A partial update makes a fine story.",
      rubric: [
        'States the original belief and roughly how confident you were',
        'Names the specific argument or evidence that moved you',
        "Says what changed and what didn't",
        'Admits any initial resistance and how long the update took',
        'Names the blind spot it revealed',
      ],
      slot: 'changed-mind',
      placeholder: 'I was fairly sure that …',
    },
    {
      kind: 'concept',
      id: 'recap',
      title: 'Keep three things',
      body:
        '1. **No new information, no move.** Restate your reason and ask for theirs.\n' +
        "2. **A better argument moves you, visibly and proportionally**: what changed, what didn't, what would move you further.\n" +
        '3. **Speak in confidence levels.** Calibrated claims let you update without a reversal. *Definitely* and *it depends* both hide your judgment.',
    },
  ],
  cards: [
    {
      id: 'values-updating.three-parts',
      skill: 'values.updating',
      kind: 'flash',
      front: 'What are the three parts of a visible update?',
      back: "What changed (*that changes X*), what didn't (*I'd still hold Y, because…*), and what would move you further (*if Z, I'd drop it*).",
    },
    {
      id: 'values-updating.are-you-sure',
      skill: 'values.updating',
      kind: 'mcq',
      prompt: 'Mid-answer, the interviewer asks only *Are you sure?* How much should your confidence change?',
      choices: [
        {
          text: "Not on its own. Restate your reason and ask what's behind the question.",
          correct: true,
          feedback: 'A question without an argument is pressure, not information. Hold, explain, invite.',
        },
        {
          text: 'A lot. An interviewer doubting you is strong evidence you are wrong.',
          feedback: 'It might be a probe. Without a reason attached, it is weak evidence at best.',
        },
        {
          text: 'Somewhat, so meet them halfway and soften the claim a little.',
          feedback: 'Softening without a reason is caving in installments.',
        },
        {
          text: 'Not at all. Repeat the answer more firmly so you sound confident.',
          feedback: 'Holding is right. Repeating it louder is not engaging. Ask what their concern is.',
        },
      ],
      explanation: 'No new information, no move. If they follow up with evidence, then update by as much as it warrants.',
    },
    {
      id: 'values-updating.pressure-or-info',
      skill: 'values.updating',
      kind: 'sort',
      prompt: 'Does this pushback carry new information?',
      buckets: [
        { id: 'info', label: 'New information' },
        { id: 'pressure', label: 'Just pressure' },
      ],
      items: [
        { text: "Our p99 doubled after that change. Here's the graph.", bucket: 'info' },
        { text: 'Nobody does it that way anymore.', bucket: 'pressure' },
        { text: "That's an unusual take.", bucket: 'pressure' },
        { text: 'That API is deprecated in the version we run.', bucket: 'info' },
        { text: 'The last team that tried this needed 9 months, not 3.', bucket: 'info' },
        { text: "I'd be surprised if that worked.", bucket: 'pressure' },
      ],
      explanation:
        'New information is a fact you can check against your reasoning. Pressure is doubt, tone or a crowd. Answer pressure with your reason and a question; answer information with an update.',
    },
    {
      id: 'values-updating.partial',
      skill: 'values.updating',
      kind: 'compare',
      question: 'Interviewer: *Your migration plan ignores the nightly batch job that locks the table at 3am.*',
      a: "Good catch. That changes my cutover window, not the plan. I'd move the cutover to a weekend afternoon and pause the batch job while it runs.",
      b: "Good catch, you're right. Let me rethink the whole migration approach from scratch, since I've clearly missed things.",
      better: 'a',
      explanation:
        'The batch job is a real constraint, but it touches the schedule, not the design. B overcorrects: rebuilding everything because of one missed detail is caving with extra steps.',
    },
    {
      id: 'values-updating.calibrated',
      skill: 'values.judgment',
      kind: 'mcq',
      prompt: 'A test fails one run in twenty. Which diagnosis is calibrated?',
      choices: [
        {
          text: 'Probably the shared fixture, maybe 60%. Running it 200 times in isolation would tell us.',
          correct: true,
          feedback: 'A lean, a confidence, and a cheap way to find out.',
        },
        {
          text: "It's definitely the fixture. Flaky tests like this one are always a timing issue.",
          feedback: 'Overclaimed: *definitely* and *always* leave no room to update when the rerun says otherwise.',
        },
        {
          text: 'Could be the fixture, the runner, the network or the test itself. Hard to say.',
          feedback: 'An empty hedge: four options, no ranking, so nobody knows where to look first.',
        },
        {
          text: "The whole team agrees it's the fixture, so we can go ahead and rewrite it.",
          feedback: 'Agreement is not evidence. A crowd can share the same untested guess.',
        },
      ],
      explanation: 'Calibration means committing to a lean and saying how strongly, ideally with what would change your mind.',
    },
    {
      id: 'values-updating.it-depends',
      skill: 'values.judgment',
      kind: 'flash',
      front: "Why isn't *it depends* calibration?",
      back: "Calibration states a lean and a confidence. *It depends* with no lean hides your view. Say what it depends on, and which way you'd bet today.",
    },
    {
      id: 'values-updating.respond-order',
      skill: 'values.updating',
      kind: 'order',
      prompt: 'A colleague gives you a genuinely better argument. Order your reply.',
      items: [
        'Restate their point in its strongest form',
        'Say what it changes in your view',
        'Say what it leaves standing, and why',
        'Name what would move you further',
      ],
      explanation:
        'Restating first proves you heard the strong version. Then the visible update: what moved, what did not, and what evidence would finish the job.',
    },
    {
      id: 'values-updating.org-update',
      skill: 'values.judgment',
      kind: 'mcq',
      prompt:
        'A company revises a public safety commitment and says it updated its view. Which evidence best separates updating from capitulating?',
      choices: [
        {
          text: 'Its reasons are specific and checkable, and some of the changes cost it something.',
          correct: true,
          feedback: 'Checkable reasons, and changes that do not all point the convenient way, are what an honest update looks like.',
        },
        {
          text: 'The announcement stresses it was a difficult decision, made after long internal debate.',
          feedback: 'Every revision says this. Difficulty and debate are not evidence about direction.',
        },
        {
          text: 'The new document is longer and more detailed than the old one, with more defined terms.',
          feedback: 'Length is not rigor. A longer document can also hold a weaker commitment.',
        },
        {
          text: 'Most of its employees, including its safety staff, supported the change internally.',
          feedback: 'Internal agreement, even from safety staff, says little about whether the reasons hold.',
        },
      ],
      explanation:
        "The test you apply to yourself applies to institutions. Anthropic's Feb 2026 RSP v3 revision is a live case: Anthropic published its reasons, GovAI's analysis credited the honesty about constraints while raising concerns, and critics tied the change to commercial pressure. Apply the test and form your own view.",
    },
  ],
}

export default lesson
