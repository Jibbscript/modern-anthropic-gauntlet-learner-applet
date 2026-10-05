import type { Lesson } from '../../core/types'

const lesson: Lesson = {
  id: 'deep-selection',
  title: 'Picking the project',
  summary: 'Choose the project that shows your decisions best: real ownership, real tradeoffs, numbers you can defend, and something that went wrong.',
  minutes: 8,
  skills: ['deep.selection'],
  steps: [
    {
      kind: 'concept',
      id: 'hook',
      eyebrow: 'Project deep dive',
      title: 'The famous project trap',
      body:
        "You pick the launch everyone has heard of: forty engineers, a keynote, a revenue spike. Ten minutes into questions, the interviewer asks *which part did you design?* You built the settings page.\n\n" +
        "What gets probed isn't the project. It's **your decisions**, two or three levels down. A boring migration you drove beats a famous launch you attended.",
      callout: {
        tone: 'insight',
        text: "Candidate reports (2026): about 20 minutes of you presenting, then discussion; prep guides say 15-25. One July 2026 candidate's advice: pick a project you actually did, because borrowed details fall apart under questioning.",
      },
    },
    {
      kind: 'mcq',
      id: 'what-scored',
      eyebrow: 'Warm-up',
      prompt: 'What is the project deep dive mainly testing?',
      choices: [
        {
          text: 'How important and high-profile the project was for the company',
          feedback: "Tempting, because the résumé line feels like the point. But a famous project with a fuzzy role gives the interviewer nothing to probe.",
        },
        {
          text: 'Whether you made real decisions, and understand them deeply',
          correct: true,
          feedback: "Right. The project is a vehicle for your reasoning: what you chose, what you rejected, and what you'd change.",
        },
        {
          text: 'How clear, polished and well structured your slides are',
          feedback: 'Clarity helps, and one candidate spent a full day on slides. But polish without depth falls apart in the discussion half.',
        },
        {
          text: 'How many technologies you can show hands-on experience with',
          feedback: 'A tour of ten tools invites ten shallow questions. Depth on two decisions is what holds up.',
        },
      ],
      explanation:
        'Candidate-reported probes include *Decision A vs Decision B*, scaling, reliability, ownership and how success was measured. Every one of them is about your judgment, so pick the project that shows the most of it.',
    },
    {
      kind: 'concept',
      id: 'six-tests',
      title: 'Six tests for a project',
      body:
        'Score each candidate project on six tests:\n\n' +
        '- **Ownership**: decisions that were yours\n' +
        '- **Depth**: you can go two levels below any slide\n' +
        '- **Tradeoffs**: real alternatives, rejected for reasons\n' +
        '- **Impact**: numbers you can defend\n' +
        '- **Scar tissue**: something broke or went wrong\n' +
        '- **Recency**: you still remember the details',
      callout: {
        tone: 'tip',
        text: "Prestige isn't on the list. Neither is *it went perfectly*: a project where nothing went wrong leaves you little to say when they ask what you learned.",
      },
    },
    {
      kind: 'sort',
      id: 'sort-picks',
      eyebrow: 'Your shortlist',
      prompt: 'Sort each project into a strong or weak pick for the deep dive.',
      buckets: [
        { id: 'strong', label: 'Strong pick' },
        { id: 'weak', label: 'Weak pick' },
      ],
      items: [
        {
          text: 'Moved refunds from a nightly batch to a queue. Your design; two outages on the way.',
          bucket: 'strong',
          why: 'Ownership, tradeoffs and scar tissue in one. The outages are an asset, not a liability.',
        },
        {
          text: 'One of 40 engineers on the flagship launch. You built the settings page.',
          bucket: 'weak',
          why: 'Your slice is small and has few decisions in it. Expect *what did you design?* in minute one.',
        },
        {
          text: 'Built the file-dedup service solo last year. Storage down 30%.',
          bucket: 'strong',
          why: 'Clear ownership, recent, and a number to defend. Prepare how you measured that 30%.',
        },
        {
          text: "Designed a caching layer in 2019. You've forgotten most of the details.",
          bucket: 'weak',
          why: "Recency fails. If you can't remember the hit rate, you can't survive *why that eviction policy?*",
        },
        {
          text: 'A CRUD admin page, shipped exactly to spec. No surprises.',
          bucket: 'weak',
          why: 'No real tradeoffs and nothing went wrong. Fine work, thin story.',
        },
        {
          text: 'Rewrote the rate limiter after it fell over in a traffic spike.',
          bucket: 'strong',
          why: 'Starts from a failure, forces decisions under pressure, and has before/after numbers built in.',
        },
        {
          text: 'A weekend prototype the CEO loved. It never shipped.',
          bucket: 'weak',
          why: 'No users means no measured impact and no production surprises. Hard to go deep on.',
        },
      ],
      explanation:
        "Strong picks have a line you can draw around your decisions, and something that pushed back: an outage, a constraint, a deadline. Weak picks are someone else's story, or a story with no friction. One Senior+ candidate (Aug 2026) was told to expect a presentation of a *recent* project, so ask your recruiter how far back you can go.",
    },
    {
      kind: 'match',
      id: 'tests-questions',
      eyebrow: 'Why the tests matter',
      prompt: "Each test is insurance against a question you'll get. Match them.",
      pairs: [
        { left: 'Ownership', right: 'Which part did you personally build?' },
        { left: 'Tradeoffs', right: 'Why not just use the obvious alternative?' },
        { left: 'Impact', right: 'How did you measure that improvement?' },
        { left: 'Scar tissue', right: 'What went wrong, and what did you do?' },
        { left: 'Depth', right: 'What happens inside that component under load?' },
      ],
      explanation:
        'If a project fails a test, you will feel it at exactly that question. Pick the project that holds up under all of them, or go dig up what is missing before you commit to it.',
    },
    {
      kind: 'concept',
      id: 'fuzzy',
      title: 'Team projects: draw the line',
      body:
        "Big team projects aren't banned. They're risky when your part is fuzzy.\n\n" +
        "The test: finish this sentence three times, with three different decisions. *I decided ___, over ___, because ___.* If you can't, or every sentence wants to start with *we*, scope down to the slice you owned: one service, one migration, one incident. That slice is your project. The rest is one sentence of context.",
      callout: {
        tone: 'insight',
        text: 'Prep guides name crediting decisions to team defaults as a common failure here. For Staff roles they also expect influence across teams, so your slice can be an agreement you brokered.',
      },
    },
    {
      kind: 'compare',
      id: 'openings',
      eyebrow: 'Which is stronger?',
      question: "Pick a project you're proud of. Give me the one-minute context.",
      a: "I was on the payments platform team at a fintech. We rebuilt the whole payments stack over two years, the biggest project in the company's history and a huge cross-team effort. I touched a lot of it, from the API to the database to monitoring, so I have a broad view of the whole system.",
      b: "At a 200-person fintech, refunds took three days because they ran in a nightly batch, and support was drowning. I designed the service that moved them onto a queue and built it with one other engineer. Refunds now land in under ten minutes. I'll focus on two decisions: idempotency, and cutting over without paying anyone twice.",
      better: 'b',
      explanation:
        "B gives the problem and who felt it, a line around the candidate's part, a before-and-after number, and a map of where the talk is going. A is all scale and no shape: *I touched a lot of it* invites *what did you actually design?*, and there's no number to check.",
    },
    {
      kind: 'concept',
      id: 'numbers',
      title: 'Check the numbers before you commit',
      body:
        "A project you can't quantify is hard to defend. Before choosing, check you can get:\n\n" +
        '- **Scale**: requests, rows, users, data volume\n' +
        '- **Speed**: latency before and after, p50 and p99\n' +
        '- **Cost**: money, machines or engineer-weeks\n' +
        '- **Impact**: the metric someone actually cared about\n\n' +
        "For each one, know *where it came from*: a dashboard, a query, or an estimate you'll label as one.",
      callout: {
        tone: 'insight',
        text: 'One July 2026 candidate reported a deep dive that focused on who decided the business metric. Know who chose yours, and why.',
      },
    },
    {
      kind: 'mcq',
      id: 'which-numbers',
      eyebrow: 'Select all that apply',
      multi: true,
      prompt: 'For the refunds-to-a-queue project, which numbers are worth preparing?',
      choices: [
        {
          text: 'Refund time before and after: three days to under ten minutes',
          correct: true,
          feedback: 'The headline impact, with a before and after. Know where the ten minutes was measured.',
        },
        {
          text: 'Peak refunds per second, and which dashboard it came from',
          correct: true,
          feedback: 'Scale with a source. Expect *what happens at 10x that?*',
        },
        {
          text: 'How many lines of code you wrote for the new service',
          feedback: 'Lines of code measure effort, not impact, and invite the wrong follow-up.',
        },
        {
          text: 'Refund-related support tickets per week, before and after',
          correct: true,
          feedback: 'The metric the business actually felt. Strong, if you can say how tickets were counted.',
        },
        {
          text: "The company's total revenue growth over the same year",
          feedback: "Real, but not yours. You can't attribute it to the project, and the interviewer will ask how you'd try.",
        },
      ],
      explanation:
        'Good numbers are attributable to your work, have a before and after, and come from a source you can name. Lines of code and company-wide metrics fail the first test.',
    },
    {
      kind: 'mcq',
      id: 'tough-choice',
      eyebrow: 'Your call',
      prompt:
        "Your clearest-ownership project is four years old, and you've lost its numbers. Your recent one was a team effort where you owned the retry system. Best move?",
      choices: [
        {
          text: 'Present the recent one, scoped down to the retry system you owned',
          correct: true,
          feedback: 'Recent, real ownership, and a line you can draw. Give the team context in one sentence and move on; scoping is what makes a team project safe.',
        },
        {
          text: 'Present the old one, and estimate the missing numbers from memory as you go',
          feedback: 'Numbers invented live are the first thing a drill-down breaks. If you pick it, rebuild the numbers from commits, docs or old dashboards first.',
        },
        {
          text: 'Present the recent one as a team story, saying *we* throughout so you never overclaim',
          feedback: "Modest, but it hides you. The interviewer can't score decisions they can't attribute.",
        },
        {
          text: 'Present both of them briefly, to show your range across different roles',
          feedback: 'Two shallow stories score worse than one deep one. This round is about depth.',
        },
      ],
      explanation:
        "A team project becomes a good pick once you scope it to the slice you owned. An old project can work too, but only after you've rebuilt its details. What never works is filling the gaps on the spot.",
    },
    {
      kind: 'concept',
      id: 'dry-run',
      title: 'Dry-run before you commit',
      body:
        'Before you build slides, test the pick:\n\n' +
        '1. Tell the one-minute version to someone outside your field. Did they follow it?\n' +
        '2. Have them ask *why?* three times about any decision.\n' +
        '3. List three things that broke.\n\n' +
        'If you stall on any of these, choose another project or go dig. A July 2026 candidate recommends a mock with a non-expert to check clarity.',
      callout: {
        tone: 'source',
        text: "Anthropic's [candidate AI guidance](https://www.anthropic.com/candidate-ai-guidance) (updated Jul 10, 2025) says: \"Use Claude to research Anthropic, practice your answers, and prepare questions for us.\" A skeptical-interviewer rehearsal is fair game. Using Claude to create experiences you haven't had is not.",
      },
    },
    {
      kind: 'reflect',
      id: 'your-pick',
      eyebrow: 'Story Bank',
      prompt: 'Pick your project. Write the first two layers: the one-minute context, and your ownership.',
      guidance:
        "Context: the problem, who it hurt, and why it mattered, in three or four sentences. Ownership: what you decided and built, as *I* sentences, plus one sentence on what others did. Include one number and where it came from. You'll add decisions, numbers and failures in the next two lessons.",
      rubric: [
        'States the problem and why it mattered in four sentences or fewer',
        'Gives team context (size, your role) in one sentence',
        'Has at least three "I decided" or "I built" statements',
        "Names at least one part that was someone else's",
        'Includes at least one number and where it came from',
      ],
      slot: 'project-deep-dive',
      placeholder: 'At …, the problem was … I designed …',
    },
    {
      kind: 'concept',
      id: 'recap',
      title: 'Keep three things',
      body:
        '1. **The project is a vehicle for your decisions.** Pick for ownership, tradeoffs and scar tissue, not prestige.\n' +
        "2. **Scope team projects to your slice.** If you can't finish *I decided X over Y because Z* three times, scope down.\n" +
        '3. **Check the numbers and dry-run before committing.** ==Gaps you find now are cheap; gaps they find are not.==',
    },
  ],
  cards: [
    {
      id: 'deep-selection.six-tests',
      skill: 'deep.selection',
      kind: 'flash',
      front: 'What six tests should a deep-dive project pass?',
      back: 'Ownership (the decisions were yours), depth (two levels below any slide), tradeoffs (alternatives rejected for reasons), impact (defensible numbers), scar tissue (something went wrong), recency (you remember the details).',
    },
    {
      id: 'deep-selection.weakest',
      skill: 'deep.selection',
      kind: 'mcq',
      prompt: 'Which of these is the weakest deep-dive pick?',
      choices: [
        {
          text: 'A dashboard you built exactly to spec for a famous 50-person launch',
          correct: true,
          feedback: "Famous, but your slice has few decisions and no friction. Prestige doesn't survive *what did you design?*",
        },
        {
          text: 'A search-indexing rewrite you led after indexing lag hit six hours',
          feedback: 'Strong: a failure to start from, decisions under pressure, and before/after numbers.',
        },
        {
          text: 'A cost cleanup you drove that cut the cloud bill by 22%',
          feedback: 'Strong, if you can say how you measured the 22% and what you traded off for it.',
        },
        {
          text: 'A flaky-test quarantine system you designed, later adopted by two teams',
          feedback: 'Strong: clear ownership, adoption as impact, and probably some pushback to talk about.',
        },
      ],
      explanation: 'Weak picks have a fuzzy or decision-free role, or no friction. Size and fame add nothing on their own.',
    },
    {
      id: 'deep-selection.line-sentences',
      skill: 'deep.selection',
      kind: 'sort',
      prompt: 'Sort these sentences by whether they draw a clear line around your work.',
      buckets: [
        { id: 'clear', label: 'Clear ownership' },
        { id: 'fuzzy', label: 'Fuzzy ownership' },
      ],
      items: [
        { text: 'I chose idempotency keys over a dedup table.', bucket: 'clear' },
        { text: 'We decided to go with a queue-based design.', bucket: 'fuzzy' },
        { text: 'I wrote the cutover script; Ana owned the dashboards.', bucket: 'clear' },
        { text: 'I was heavily involved in most of the architecture.', bucket: 'fuzzy' },
        { text: 'I argued for two weeks of dual writes and lost; we did one.', bucket: 'clear' },
        { text: 'The team landed on the right approach pretty quickly.', bucket: 'fuzzy' },
      ],
      explanation:
        "Clear ownership names a decision, an alternative or a person. Fuzzy sentences hide who did what, and the next question will be *who?* Even a decision you lost counts, if you can say what you argued and why.",
    },
    {
      id: 'deep-selection.opening',
      skill: 'deep.selection',
      kind: 'compare',
      question: 'Give me a one-minute overview of the project.',
      a: "Search results were stale: the index lagged up to six hours behind writes, and sellers complained their edits didn't show. I led the move from batch reindexing to change-data-capture, with two engineers. Lag is now under a minute. I'll cover the backfill strategy, and the outage it caused.",
      b: 'I worked on search at a large marketplace, which is a really interesting space with a lot of hard problems at scale. Our team did a big modernization of the indexing pipeline using some cutting-edge streaming technology, and it was a big success for the business.',
      better: 'a',
      explanation:
        "A has the problem, who felt it, a line around the candidate's role, a before-and-after number, and a roadmap that even admits an outage. B is adjectives: *interesting*, *big*, *cutting-edge*, *success*. None of it can be checked.",
    },
    {
      id: 'deep-selection.number-source',
      skill: 'deep.selection',
      kind: 'mcq',
      prompt: 'Why prepare the *source* of each number in your deep dive, not just the number?',
      choices: [
        {
          text: 'The next question is *how do you know?*, and unsourced numbers fold there',
          correct: true,
          feedback: 'Right. Dashboard, query or estimate: say which, and label estimates as estimates.',
        },
        {
          text: 'Interviewers check your numbers against public data after the round',
          feedback: 'Nothing suggests that. The check happens live, in the very next question.',
        },
        {
          text: 'Naming a dashboard makes the presentation look more polished',
          feedback: "Polish isn't the point. The source is what lets the number survive a follow-up.",
        },
        {
          text: 'Exact figures are expected, and estimates count against you',
          feedback: 'Labelled estimates are fine. Unlabelled guesses that unravel are the problem.',
        },
      ],
      explanation: "A number is only as good as your answer to *how do you know?* Prepare that answer alongside the number.",
    },
    {
      id: 'deep-selection.scope-down',
      skill: 'deep.selection',
      kind: 'flash',
      front: 'Your best project was a 30-person effort. How do you make it a safe deep-dive pick?',
      back: 'Scope it to the slice you owned: a service, a migration, an incident. Give team context in one sentence, use *I* for your decisions, and name who did the other parts.',
    },
  ],
}

export default lesson
