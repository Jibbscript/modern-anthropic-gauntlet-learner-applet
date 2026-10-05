import type { Lesson } from '../../core/types'

const lesson: Lesson = {
  id: 'why-rsp',
  title: 'Responsible scaling, decoded',
  summary:
    'How the Responsible Scaling Policy works, what actually triggered ASL-3, what changed in 2026, and how to hold an informed view of your own.',
  minutes: 9,
  skills: ['why.rsp', 'why.disagree'],
  steps: [
    {
      kind: 'concept',
      id: 'hook',
      title: 'A pledge, then a rewrite',
      body:
        "September 2023: Anthropic's first Responsible Scaling Policy said it 'implicitly requires us to temporarily pause training of more powerful models' if safety fell behind.\n\n" +
        'February 2026: that pledge was gone.\n\n' +
        "Candidates report recruiters asking what you make of Anthropic's recent moves. 'I trust them' and 'they sold out' both fail. You need the mechanics, the strongest case on each side, and a view of your own.",
    },
    {
      kind: 'concept',
      id: 'asl',
      title: 'Safety levels, borrowed from biology',
      body:
        "Biology labs use biosafety levels: the more dangerous the pathogen, the stronger the containment. Anthropic's AI Safety Levels (ASLs) were 'modeled loosely' on them. The 2023 definitions:\n\n" +
        '- **ASL-1**: no meaningful catastrophic risk (say, a chess engine)\n' +
        '- **ASL-2**: early signs of dangerous capability, not yet more useful than search\n' +
        '- **ASL-3**: substantially more misuse risk than non-AI baselines, or low-level autonomy\n\n' +
        'The logic: ==if capability X, then safeguards Y==.',
      callout: {
        tone: 'source',
        text: '[RSP v1 announcement](https://www.anthropic.com/news/anthropics-responsible-scaling-policy), Sep 19, 2023.',
      },
    },
    {
      kind: 'mcq',
      id: 'which-asl',
      prompt:
        'Asked about a dangerous pathogen, a new model produces real information, but nothing a determined person could not find with a search engine or a textbook. Under the 2023 definitions, where does it sit?',
      choices: [
        {
          text: 'ASL-1',
          feedback: 'ASL-1 is for systems with no meaningful catastrophic risk at all, like a chess engine. Any sign of dangerous knowledge moves you up.',
        },
        {
          text: 'ASL-2',
          correct: true,
          feedback: 'Right. Early signs of dangerous capability, but no real uplift over what is already available.',
        },
        {
          text: 'ASL-3',
          feedback: 'ASL-3 needs a *substantial* increase in risk over non-AI baselines. If a search engine gets you the same thing, the model adds little.',
        },
        {
          text: 'ASL-4',
          feedback: "ASL-4 wasn't defined in 2023. It was expected to involve qualitative escalations in misuse potential and autonomy.",
        },
      ],
      explanation:
        "The comparison to non-AI baselines is the whole game. The question is *uplift*: how much the model adds over search engines and textbooks, not whether the topic is scary.",
      hint: 'Compare the model to what a search engine already gives you.',
    },
    {
      kind: 'match',
      id: 'thresholds',
      prompt:
        'Version 2.0 (Oct 2024) tied safeguards to capability **thresholds**, and v2.1 (Mar 2025) sharpened them. Match each threshold to its definition.',
      pairs: [
        { left: 'CBRN (the ASL-3 trigger)', right: 'Uplift to someone with a basic technical background' },
        { left: 'CBRN-4', right: 'Uplift to moderately resourced state programs' },
        { left: 'AI R&D-4', right: "Fully automate an entry-level, remote-only Anthropic researcher" },
        { left: 'AI R&D-5', right: 'Dramatically accelerate the rate of effective scaling' },
      ],
      explanation:
        "Two families: **misuse** (chemical, biological, radiological and nuclear weapons) and **autonomy** (AI doing AI research). Crossing a threshold requires a stronger set of safeguards, an ASL Standard: in v2, CBRN uplift required ASL-3 and autonomous AI R&D required ASL-4 or higher.\n\nThis is v2-era vocabulary. v3.0 redefined the AI R&D threshold as compressing two years of 2018-2024 progress into one, and 2026 point releases revised both families. Check the current wording before you quote it.",
    },
    {
      kind: 'mcq',
      id: 'asl3-trigger',
      eyebrow: 'Common misconception',
      prompt:
        'On May 22, 2025, Anthropic launched Claude Opus 4 with **ASL-3** protections switched on, the first time it had activated them. What triggered the activation?',
      choices: [
        {
          text: "It couldn't clearly rule out ASL-3-level CBRN capability, so it acted as a precaution",
          correct: true,
          feedback: 'Yes. Uncertainty, not proof, and the trigger was CBRN capability.',
        },
        {
          text: 'In a system-card test, Opus 4 tried to blackmail an engineer to avoid being replaced',
          feedback:
            'That test happened (blackmail in about 84% of runs of a contrived scenario), and some coverage linked the two. But the stated trigger was CBRN capability uncertainty. Mixing these up is a common, checkable mistake.',
        },
        {
          text: 'Evaluations showed Opus 4 had definitively crossed the CBRN capability threshold',
          feedback:
            "Anthropic said the opposite of definitive: 'clearly ruling out ASL-3 risks is not possible for Claude Opus 4 in the way it was for every previous model.'",
        },
        {
          text: 'A government AI safety institute required ASL-3 protections before the release',
          feedback: 'No regulator mandated it. The RSP is a self-imposed policy, and the activation was Anthropic\'s own call.',
        },
      ],
      explanation:
        "The measures included Constitutional Classifiers on CBRN content, a jailbreak bug bounty, 100+ security controls, two-party authorization for access to model weights, and egress bandwidth controls. Anthropic said they 'should not lead Claude to refuse queries except on a very narrow set of topics.'",
    },
    {
      kind: 'concept',
      id: 'v3',
      title: 'What v3 changed (Feb 2026)',
      body:
        'RSP v3.0 took effect Feb 24, 2026.\n\n' +
        "- It separates what Anthropic will do 'regardless of what others do' from a recommended map for the whole industry.\n" +
        "- It adds a **Frontier Safety Roadmap** of public goals Anthropic will 'openly grade', and **Risk Reports** every 3-6 months.\n" +
        "- The 2023 pause pledge is gone. Per TIME, Anthropic now commits only to 'delay', if leadership believes it leads the race *and* judges catastrophic risk significant.",
      callout: {
        tone: 'source',
        text: '[RSP v3 announcement](https://www.anthropic.com/news/responsible-scaling-policy-v3) and [version history](https://www.anthropic.com/rsp-updates). Point releases followed; v3.4 (Jul 8, 2026) is current as of October 2026.',
      },
    },
    {
      kind: 'order',
      id: 'versions',
      prompt: 'Put these RSP versions in order, oldest first.',
      items: [
        'Defines ASLs on the biosafety model and implies a pause if safeguards lag',
        'Recasts ASLs as safeguard standards triggered by CBRN and AI R&D thresholds',
        'Splits the AI R&D threshold in two and adds a CBRN threshold for state programs',
        'Replaces the pause pledge with a conditional delay, a graded roadmap and Risk Reports',
        'Lets the Long-Term Benefit Trust request external review of Risk Reports',
      ],
      explanation:
        'v1.0 (Sep 2023), v2.0 (Oct 2024), v2.1 (Mar 2025), v3.0 (Feb 2026), v3.2 (Apr 2026). Each builds on the last: thresholds refine the levels, and the Trust can only review Risk Reports once v3 creates them. There were five releases in 2026 alone, through v3.4 in July, so check the updates page before your interview.',
      hint: 'Which ones depend on something another one introduced?',
    },
    {
      kind: 'concept',
      id: 'anthropic-case',
      title: "Anthropic's case",
      body:
        "Anthropic's three reasons: a 'zone of ambiguity' muddled the public case for risk, the climate turned anti-regulatory, and higher-level safeguards are 'very hard to meet unilaterally' (RAND calls its top security level 'currently not possible'). The core argument:\n\n" +
        '> If one AI developer paused development to implement safety measures while others moved forward training and deploying AI systems without strong mitigations, that could result in a world that is less safe.',
      callout: {
        tone: 'quote',
        text: "Jared Kaplan, to TIME: 'We felt that it wouldn't actually help anyone for us to stop training AI models.'",
      },
    },
    {
      kind: 'concept',
      id: 'critics-case',
      title: "The critics' case",
      body:
        "A precommitment earns its value in the costly moment; that's why you make it early. TIME framed v3 as Anthropic dropping its flagship safety pledge. METR's Chris Painter warned of a 'frog-boiling' effect. Critics also note the timing, alongside a $30B raise and a Pentagon fight.\n\n" +
        "A middle view, from GovAI (Mar 2026): 'it's better to be honest about constraints than to keep commitments that won't be followed in practice.'",
      callout: {
        tone: 'source',
        text: '[TIME, Feb 24, 2026](https://time.com/7380854/exclusive-anthropic-drops-flagship-safety-pledge/); [GovAI analysis](https://www.governance.ai/analysis/anthropics-rsp-v3-0-how-it-works-whats-changed-and-some-reflections).',
      },
    },
    {
      kind: 'sort',
      id: 'true-false',
      eyebrow: 'Get the facts straight',
      prompt: 'True or false? These are the claims people most often get wrong.',
      buckets: [
        { id: 't', label: 'True' },
        { id: 'f', label: 'False' },
      ],
      items: [
        {
          text: 'ASL-3 was activated for Claude Opus 4 because of its blackmail behavior in a test',
          bucket: 'f',
          why: 'The trigger was CBRN capability uncertainty. The blackmail test was a separate system-card finding.',
        },
        {
          text: 'Under RSP v3, Anthropic is still committed to pausing if safeguards fall behind',
          bucket: 'f',
          why: "v3 replaced the pledge with a conditional 'delay'. v3.1 (Apr 2026) added that Anthropic remains *free* to pause, which is not a commitment.",
        },
        {
          text: 'Anthropic says it could have defined ASL-4 and ASL-5 to be easy to meet, but that would undermine the RSP',
          bucket: 't',
          why: "Its v3 post says exactly this: easy definitions 'would undermine the intended spirit of the RSP.'",
        },
        {
          text: 'OpenAI and Google DeepMind adopted broadly similar frameworks within months of the first RSP',
          bucket: 't',
          why: "OpenAI's Preparedness Framework (Dec 2023) and DeepMind's Frontier Safety Framework (May 2024).",
        },
        {
          text: 'Anthropic says every part of its original RSP theory of change worked',
          bucket: 'f',
          why: 'It says the internal forcing function and the race to the top largely worked; building consensus on risk and government action fell short.',
        },
        {
          text: 'In September 2026, Dario Amodei called for slowing the pace of AI capability progress',
          bucket: 't',
          why: "'We Must Pace the Frontier' (Sep 12, 2026): slow the pace, explicitly not halt training, via embedded evaluators and coordination.",
        },
      ],
      explanation:
        'Each false claim is a real interview mistake: one confuses two findings, one is out of date, one overstates Anthropic\'s own self-assessment. Getting these right is the minimum. Your view starts after.',
    },
    {
      kind: 'interview',
      id: 'sim',
      eyebrow: 'Interview sim',
      setup: 'Recruiter screen, twenty minutes in. The questions have turned to safety.',
      turns: [
        {
          interviewer: 'What do you make of the changes Anthropic made to its RSP this year?',
          options: [
            {
              text: "I think it was the right call. If Anthropic paused on its own while competitors kept going, the world wouldn't be any safer, and Anthropic would lose its seat at the table where the rules get written.",
              quality: 'okay',
              feedback: "A position, but it adopts Anthropic's argument wholesale. No facts about what changed, no tension, nothing of your own.",
            },
            {
              text: "v3 swapped the 2023 pause pledge for a conditional delay plus Risk Reports. I partly buy the honesty argument, but leadership alone decides when delay applies. Outside review that changes a real decision would move me.",
              quality: 'strong',
              feedback: 'Informed, with a position, a concern and an update condition. That is the whole pattern in three sentences.',
            },
            {
              text: "I haven't followed the details that closely, to be honest. But I trust Anthropic's leadership to make the right call on things like this; they understand the tradeoffs far better than I do.",
              quality: 'weak',
              feedback: 'Deference is the answer they are screening out. They want your judgment, not your trust.',
            },
          ],
        },
        {
          interviewer: "Critics say a pledge only matters if you keep it when it's expensive. Aren't they right?",
          options: [
            {
              text: "Partly. A pledge exists for the costly moment, and METR warned about frog-boiling. But top-level safeguards may not be achievable alone yet. So: honest beats hollow, but someone outside leadership should check the bar.",
              quality: 'strong',
              feedback: 'You steelmanned the critic, stated the counter fairly and landed somewhere specific.',
            },
            {
              text: 'Yes, completely. It shows the RSP was always marketing. The moment it got in the way of a $30B raise, they dropped it, and the rest of the policy will go the same way.',
              quality: 'weak',
              feedback:
                'Cynicism is a shortcut, not a view. The RSP produced costly actions (ASL-3 went live in 2025) and industry copies. Engage with that or it sounds like a slogan.',
            },
            {
              text: "There was probably some commercial pressure behind the timing, but from everything I've read, the people involved seem sincere about safety, so I'd give them the benefit of the doubt.",
              quality: 'okay',
              feedback: 'Fair-minded but vague. Sincerity is not the question; whether the commitment works is.',
            },
          ],
        },
        {
          interviewer: 'What would change your mind?',
          options: [
            {
              text: "Honestly, nothing. I've read both sides carefully, I've thought about this a lot, and I'm confident in where I've landed.",
              quality: 'weak',
              feedback: 'Updating on evidence is one of the things being tested. A view with no exit is a red flag.',
            },
            {
              text: "More transparency about how these decisions actually get made internally, who gets a say when it's a close call, and how disagreements get resolved.",
              quality: 'okay',
              feedback: 'Reasonable, but not falsifiable. What would you see, and which way would it move you?',
            },
            {
              text: "A Risk Report showing a threshold getting close with nothing changing would count against v3. Outside reviewers, requested by the Trust, changing a release would count for it.",
              quality: 'strong',
              feedback: 'Concrete observations in both directions, tied to mechanisms that exist. That is what an open mind sounds like.',
            },
          ],
        },
      ],
      wrapUp:
        "Facts and dates right, a view of your own, the best counterargument, and a concrete update condition. The strong answers here landed in the middle, but that isn't the requirement: a well-argued 'v3 was a mistake' or 'v3 was right' scores the same if it has all four.",
    },
    {
      kind: 'reflect',
      id: 'your-view',
      eyebrow: 'Your turn',
      prompt: 'Write your current view of RSP v3 in three or four sentences, the way you would say it to a recruiter.',
      guidance:
        'Open with a position. Include the strongest point from the other side and one concrete observation that would change your mind. If you agree with v3, name the part you are least sure about.',
      rubric: [
        'States a clear position in the first sentence',
        'Gets at least one fact right with a date (v3.0, Feb 2026; the pause pledge; Risk Reports)',
        'Gives the strongest version of the side you disagree with',
        'Names a specific observation that would change your mind',
        'Sounds like you, not a press release',
      ],
      slot: 'disagree-anthropic',
      placeholder: 'My take on RSP v3 is…',
    },
    {
      kind: 'concept',
      id: 'recap',
      title: 'What to remember',
      body:
        '1. The RSP is an **if-then**: capability thresholds (CBRN, AI R&D) trigger ASL safeguards, modeled on biosafety levels.\n' +
        '2. **ASL-3** went live for Claude Opus 4 in May 2025 as a CBRN precaution, not because of the blackmail test.\n' +
        "3. **v3.0** (Feb 2026) swapped the pause pledge for conditional 'delay', Risk Reports and a graded roadmap. Bring a view, the best counterargument and what would change your mind.",
      callout: {
        tone: 'warn',
        text: 'The RSP changed five times in 2026; v3.4 (Jul 8) is current as of October 2026. Check the [updates page](https://www.anthropic.com/rsp-updates) the week of your interview.',
      },
    },
  ],
  cards: [
    {
      id: 'why-rsp.if-then',
      skill: 'why.rsp',
      kind: 'flash',
      front: 'What were AI Safety Levels modeled on, and what is the core logic of the RSP?',
      back: 'US biosafety levels (BSL). If a model reaches a capability threshold, a matching set of safeguards, an ASL Standard, must be in place.',
    },
    {
      id: 'why-rsp.pause-claim',
      skill: 'why.rsp',
      kind: 'mcq',
      prompt:
        "A candidate says: 'Under the RSP, Anthropic will pause training if its safeguards can't keep up.' As of October 2026, what's the best correction?",
      choices: [
        {
          text: "Outdated: since v3.0 (Feb 2026) it's a conditional 'delay', not a pause pledge",
          correct: true,
          feedback: 'Right. Have the v3.1 nuance ready too: Anthropic says it remains free to pause, which is a freedom, not a commitment.',
        },
        { text: "It's correct as stated: every version since 2023 has kept the pause commitment", feedback: 'v3.0 removed it. This is the most common out-of-date claim.' },
        { text: 'The RSP never mentioned pausing; it has only ever covered deployment decisions', feedback: "v1 said the ASL system 'implicitly requires us to temporarily pause training.'" },
        { text: "Pausing is now required by California's SB 53 instead of by the RSP", feedback: 'SB 53 requires published frameworks, incident reporting and whistleblower protections, not pauses.' },
      ],
      explanation: "v3.0 replaced the 2023 pledge with a conditional delay. v3.1 (Apr 2026) clarified Anthropic remains 'free to take measures such as pausing', which is a freedom, not a commitment.",
    },
    {
      id: 'why-rsp.timeline',
      skill: 'why.rsp',
      kind: 'order',
      prompt: 'Order these events, oldest first.',
      items: [
        'RSP v2.0 ties safeguards to CBRN and AI R&D thresholds',
        'ASL-3 protections activated for Claude Opus 4',
        'RSP v3.0 drops the pause pledge',
        "'We Must Pace the Frontier' calls for slowing capability progress",
      ],
      explanation: 'Oct 2024, May 2025, Feb 2026, Sep 2026.',
    },
    {
      id: 'why-rsp.families',
      skill: 'why.rsp',
      kind: 'sort',
      prompt: 'Which family of RSP threshold does each capability belong to?',
      buckets: [
        { id: 'misuse', label: 'Misuse (CBRN)' },
        { id: 'autonomy', label: 'Autonomy (AI R&D)' },
      ],
      items: [
        { text: "Substantially uplifting a state program's chemical or biological weapons work", bucket: 'misuse' },
        { text: "Doing a junior AI researcher's job end to end", bucket: 'autonomy' },
        { text: 'Compressing two years of AI progress into one', bucket: 'autonomy' },
        { text: 'Helping someone with basic lab skills toward a mass-casualty weapon', bucket: 'misuse' },
      ],
      explanation:
        'Misuse thresholds measure uplift to people trying to cause harm. Autonomy thresholds measure how far AI can accelerate AI development itself; v3.0 framed that one as compressing two years of 2018-2024 progress into a single year.',
    },
    {
      id: 'why-rsp.argument',
      skill: 'why.rsp',
      kind: 'cloze',
      prompt: "Complete Anthropic's core argument for RSP v3 (Feb 2026).",
      lang: 'text',
      code:
        'If one AI developer {{0}}\nto implement safety measures while\nothers moved forward training and\ndeploying AI systems without strong\nmitigations, that could result in\na world that is {{1}}.',
      blanks: [
        { options: ['paused development', 'raised its prices', 'released its weights'], answer: 0 },
        { options: ['less safe', 'more competitive', 'more regulated'], answer: 0 },
      ],
      explanation: "This is the heart of the case for dropping the unilateral pause. Critics answer that a commitment's value is precisely in the costly moment.",
    },
    {
      id: 'why-rsp.compare',
      skill: 'why.disagree',
      kind: 'compare',
      question: "What do you think of Anthropic's RSP?",
      a: "It changed the industry: OpenAI and Google DeepMind adopted similar frameworks within months, and laws like SB 53 now require published ones. But v3 swapped the pause pledge for a conditional delay, so I'd judge it by whether Risk Reports and outside review change decisions.",
      b: "It's the best safety framework in the industry, full stop. OpenAI and DeepMind basically copied it, which shows Anthropic is the one lab really leading on safety, and I'd be proud to help it keep that lead.",
      better: 'a',
      explanation: 'B is praise with one fact and no date; it would have read the same in 2023. A credits the real impact, names the 2026 change, and says how it would evaluate it from here.',
    },
    {
      id: 'why-rsp.frog',
      skill: 'why.disagree',
      kind: 'flash',
      front: "What did METR's Chris Painter warn about after RSP v3 dropped the pause pledge?",
      back: "A 'frog-boiling' effect: each loosening can look reasonable on its own, so the cumulative drift goes unnoticed. The worry is about the trend, not any single change.",
    },
  ],
}

export default lesson
