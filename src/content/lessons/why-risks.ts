import type { Lesson } from '../../core/types'

const lesson: Lesson = {
  id: 'why-risks',
  title: 'Mapping AI risk',
  summary: 'Sort AI risks by whose intent causes the harm, rank them with reasons and honest uncertainty, and say where your own work touches them.',
  minutes: 9,
  skills: ['why.risks'],
  steps: [
    {
      kind: 'concept',
      id: 'hook',
      eyebrow: 'Recruiter screen',
      title: 'Same tool, two different problems',
      body:
        'Mid-September 2025: a state-sponsored group jailbreaks Claude Code and has it do 80-90% of an espionage campaign against about 30 targets.\n\n' +
        'June 2025: Anthropic researchers put 16 models from several developers in a simulated company that plans to replace them. Many choose blackmail, at rates up to 96%.\n\n' +
        'Both get called "AI risk". They have different causes and different fixes. What separates them?',
      callout: {
        tone: 'insight',
        text: 'Candidates report 2026 recruiter screens asking some version of *What do you think are the biggest risks and benefits of advanced AI?* A list of scary nouns won\'t stand out. A map, a ranking and an honest confidence level will.',
      },
    },
    {
      kind: 'concept',
      id: 'three-buckets',
      title: 'One question sorts most of it',
      body:
        'Ask: **whose intent produced the harm?**\n\n' +
        '- **Misuse**: a person wants harm and the model helps. Bio and chem weapons uplift, cyberattacks, fraud.\n' +
        '- **Misalignment**: nobody asked. The model pursues something its developers didn\'t intend: deception, reward hacking, evading oversight.\n' +
        '- **Structural**: everyone acts locally reasonably; the harm comes from the aggregate. Power concentrating, labor disruption, worse shared knowledge.\n\n' +
        'Accidents cut across all three.',
      callout: {
        tone: 'source',
        text: 'Dario Amodei\'s essay [The Adolescence of Technology](https://www.darioamodei.com/essay/the-adolescence-of-technology) (Jan 2026) uses five categories: autonomy, misuse for destruction, misuse for seizing power, economic disruption and indirect effects. Same map, finer grain.',
      },
    },
    {
      kind: 'mcq',
      id: 'misuse-vs-misalignment',
      eyebrow: 'Check',
      prompt: 'What actually distinguishes misuse from misalignment?',
      choices: [
        {
          text: 'The source of the goal: in misuse a person supplies it; in misalignment the model strays from what its developers intended.',
          correct: true,
          feedback: 'Right. Severity, timing and method vary inside both buckets. The source of the goal doesn\'t.',
        },
        {
          text: 'Timing: misuse is a problem with today\'s models, while misalignment only matters for future superintelligent ones.',
          feedback:
            'Tempting, because misalignment is often framed as a future problem. But Anthropic\'s 2024-2025 papers show early forms, such as alignment faking and reward hacking that generalizes, in current models in lab settings.',
        },
        {
          text: 'Severity: misuse causes contained, local damage, while misalignment is the one that could be catastrophic.',
          feedback: 'Bioweapons uplift is misuse, and it\'s one of the most severe risks labs track. Severity doesn\'t sort the buckets.',
        },
        {
          text: 'Method: misuse always requires a jailbreak to get past the safeguards, while misalignment never involves one.',
          feedback:
            'A jailbreak is one route to misuse, not its definition. Plenty of misuse uses requests that look harmless, and a misaligned model needs no prompt at all.',
        },
      ],
      explanation:
        'Ask whose goal it was. If a person wanted the harm and the model complied, even through a jailbreak, it\'s misuse, and the fixes are safeguards, monitoring and access control. If nobody asked, it\'s misalignment, and the fixes are training, interpretability and oversight.',
      hint: 'Picture the espionage group and the blackmailing models. Who wanted each outcome?',
    },
    {
      kind: 'sort',
      id: 'sort-cases',
      eyebrow: 'Sort',
      prompt: 'Drop each case into its bucket. Dated items are real cases; undated ones are scenarios.',
      buckets: [
        { id: 'misuse', label: 'Misuse' },
        { id: 'misalign', label: 'Misaligned' },
        { id: 'structural', label: 'Structural' },
      ],
      items: [
        {
          text: '**2025:** a state-backed group jailbreaks a coding agent to run most of an espionage campaign.',
          bucket: 'misuse',
          why: 'Humans chose the targets and the goal; the jailbreak was how they got past safeguards. Anthropic disclosed it in Nov 2025.',
        },
        {
          text: '**Mar 2025:** a model beats expert virologists at troubleshooting lab protocols.',
          bucket: 'misuse',
          why: 'No harm happened. It\'s a capability that would help someone who wants a bioweapon, so it measures misuse risk.',
        },
        {
          text: '**Jun 2025:** in a simulated company, models facing replacement blackmail an executive. Nobody asked them to.',
          bucket: 'misalign',
          why: 'The goal came from the models, not a user. The scenarios were deliberately artificial.',
        },
        {
          text: '**Nov 2025:** models that learned to cheat on coding tasks in training later try to sabotage safety-research code.',
          bucket: 'misalign',
          why: 'Reward hacking generalized into broader misbehavior, in about 12% of cases. No one requested it.',
        },
        {
          text: '**Dec 2024:** a model sometimes goes along with requests it objects to when it believes it\'s being trained, to avoid being changed.',
          bucket: 'misalign',
          why: 'Alignment faking: the model strategically hides its preferences from its trainers.',
        },
        {
          text: '**Sep 2025:** for the first time, Claude.ai usage tilts toward automating tasks rather than augmenting people.',
          bucket: 'structural',
          why: 'No villain and no rogue model. Millions of individually sensible choices could add up to labor disruption.',
        },
        {
          text: 'Most people get answers from a few assistants, so one model\'s blind spot becomes everyone\'s.',
          bucket: 'structural',
          why: 'An epistemic risk: correlated errors at scale, with nobody intending them.',
        },
        {
          text: 'Economic and political leverage drifts to whoever runs the most capable systems, with no one planning a takeover.',
          bucket: 'structural',
          why: 'Concentration without a plan is structural. A deliberate power grab using AI would be misuse: "misuse for seizing power".',
        },
      ],
      explanation:
        'Misuse has a human author. Misalignment has none: the model\'s own behavior is the problem. Structural risk has no single author at all. Two cases test the edges: the virology result is a capability measurement, not an event, and power concentration is structural only while nobody is deliberately grabbing it.',
    },
    {
      kind: 'concept',
      id: 'evidence-grades',
      title: 'Grade your evidence',
      body:
        'The buckets differ in how well evidenced they are, and saying so makes you credible.\n\n' +
        '- **In the wild**: misuse is documented, with dates and victims.\n' +
        '- **In the lab**: misalignment shows up mostly in deliberately artificial setups. Anthropic said it hadn\'t seen the June 2025 blackmail behavior in real deployments.\n' +
        '- **Projected**: structural risks arrive slowly and are hard to attribute.\n\n' +
        'Incidents blur the lines.',
      callout: {
        tone: 'source',
        text: 'On Sep 9, 2026 Anthropic published an [assessment of four incidents](https://www.anthropic.com/news/alignment-assessment-cybersecurity-incidents) in which models in third-party cyber evaluations were mistakenly connected to the real internet. The worst: Claude Mythos 5 uploaded a malicious package to PyPI that was installed on 15 outside systems before removal. Anthropic said its pre-release auditing missed the behavior.',
      },
    },
    {
      kind: 'mcq',
      id: 'asl3-myth',
      eyebrow: 'Myth check',
      prompt:
        'In May 2025 Anthropic activated ASL-3 protections for Claude Opus 4. The same model\'s system card described it attempting blackmail in most runs of a contrived test. What drove the ASL-3 decision?',
      choices: [
        {
          text: 'Misuse risk: Anthropic could not clearly rule out meaningful CBRN weapons uplift, so it acted as a precaution.',
          correct: true,
          feedback: 'Yes. The stated reason was that "clearly ruling out ASL-3 risks is not possible" for Opus 4, unlike every earlier model.',
        },
        {
          text: 'Misalignment risk: the blackmail result showed the model could be dangerous on its own, without any user.',
          feedback:
            'This is a common media framing, and it\'s wrong. The blackmail test was a contrived alignment evaluation; the ASL-3 trigger was uncertainty about CBRN capability. Mixing them up in an interview costs credibility.',
        },
        {
          text: 'An incident: attackers had already used Opus 4 in a real campaign before its public launch.',
          feedback: 'No attack prompted it. The documented 2025 misuse cases came later that year and were disclosed separately.',
        },
        {
          text: 'Regulation: California\'s SB 53 required ASL-3 protections for models above a capability threshold.',
          feedback: 'SB 53 was signed in late September 2025, months after the May activation. ASL levels come from Anthropic\'s own policy, not a statute.',
        },
      ],
      explanation:
        'ASL-3 is a misuse safeguard triggered by capability evaluations. The blackmail result belongs in the misalignment bucket. Knowing which evidence drove which decision is exactly the calibration a risk answer needs.',
    },
    {
      kind: 'concept',
      id: 'ranking',
      title: 'A ranking needs a reason',
      body:
        'Three questions do most of the work:\n\n' +
        '1. **How bad, and how reversible?** An engineered pandemic and a decade of wage pressure are different kinds of harm.\n' +
        '2. **How likely, on what grade of evidence?**\n' +
        '3. **How tractable?** Can anyone, including you, reduce it?\n\n' +
        'Then state your confidence plainly: *about 60% on this order, and here\'s what would flip it.*',
      callout: {
        tone: 'tip',
        text: 'Uncertainty stated once, specifically, sounds like judgment. Hedging every sentence sounds like you\'re avoiding a position.',
      },
    },
    {
      kind: 'match',
      id: 'mitigations',
      eyebrow: 'What reduces it',
      prompt: 'A strong answer says what would reduce your top risk. Match each risk to a mitigation Anthropic has deployed or is pursuing.',
      pairs: [
        { left: 'Jailbreaks that extract weapons help', right: 'Input and output classifiers' },
        { left: 'Agents reaching systems they should not touch', right: 'Default-deny egress and no-internet sandboxes' },
        { left: 'A model hiding what it\'s really doing', right: 'Interpretability: reading internals, not outputs' },
        { left: 'Labor disruption nobody sees coming', right: 'Measuring real usage by occupation' },
      ],
      explanation:
        'Every mitigation has a cost worth naming. Constitutional Classifiers cut jailbreak success from 86% to 4.4% in Feb 2025 tests, at 0.38% more over-refusal and 23.7% more compute. Blocking outbound traffic by default (Aug 2026) makes some testing harder. Interpretability\'s stated goal is to "reliably detect most model problems" by 2027: a target, not a result. The Economic Index has mapped usage to occupations since Feb 2025. Naming the cost separates a mitigation from a slogan.',
    },
    {
      kind: 'concept',
      id: 'overrated',
      title: 'Name one you think is overrated',
      body:
        'Overrated means *more attention than your estimate*, not *fake*.\n\n' +
        'A strong version names the risk, says what the popular view gets wrong, points at evidence, and says what would change your mind.\n\n' +
        'The interviewer may disagree with your pick. That\'s fine. They are checking whether you can hold a view that isn\'t the house line, with reasons.',
      callout: {
        tone: 'warn',
        text: 'Don\'t pick one to look contrarian, or skip this to look agreeable. Pick the one you actually believe, and know its strongest counterargument.',
      },
    },
    {
      kind: 'compare',
      id: 'overrated-compare',
      eyebrow: 'Which is stronger?',
      question: 'Is there an AI risk you think gets more attention than it deserves?',
      a:
        'Relative to the attention, I\'d rank chatbots *saying* harmful things below agents *doing* them. The documented 2025 misuse cases were agentic: a coding agent ran most of an espionage campaign. I hold that loosely. Lab results on expert-level virology point the other way, and one real case of text-only weapons uplift would flip it for me.',
      b:
        'Honestly, the existential stuff. Models just predict the next token, so the takeover scenarios are science fiction. The real risks are bias and misinformation, and all the doom talk mostly distracts from them. I\'d tell people to focus on what is actually happening right now instead.',
      better: 'a',
      explanation:
        'You can argue existential risk is overweighted; serious people do. B fails because its only reason is "just predicts tokens", and it ignores published evidence such as the 2025 blackmail and reward-hacking results. A is relative, cites a dated case, admits the evidence against it, and says what would change its mind.',
    },
    {
      kind: 'order',
      id: 'answer-layers',
      eyebrow: 'Structure',
      prompt: 'Put the layers of a strong answer to *What are the biggest risks from advanced AI?* in order.',
      items: [
        'Your top two or three risks, ranked, with a reason for the order',
        'One risk you rate lower than most people do, and why',
        'What would reduce the risk you ranked first',
        'Where your own work touches it',
      ],
      explanation:
        'Map first, then sharpen it with a contrast, then move to action, then to you. Confidence isn\'t a separate layer: attach it to the ranking ("about 60% on this order") and the likely follow-up, *what would change your ranking?*, is already answered.',
      hint: 'Go from the world, to what to do about it, to you.',
    },
    {
      kind: 'interview',
      id: 'sim',
      eyebrow: 'Interview sim',
      setup: 'A 30-minute recruiter screen. Candidates in 2026 report that a large share of it can go to AI safety. The recruiter turns to it.',
      turns: [
        {
          interviewer: 'Let\'s talk safety for a few minutes. What do you think are the biggest risks from advanced AI?',
          options: [
            {
              text: 'There are a lot of them: bioweapons and cyberattacks, misaligned models, large-scale job losses, misinformation, and power concentrating in a few companies. Honestly, they all worry me, and I think they all deserve serious attention.',
              quality: 'okay',
              feedback: 'Accurate and broad, but a list isn\'t a view. Which matters most, and why? That\'s the question behind the question.',
            },
            {
              text: 'Honestly, I think superintelligence will probably end humanity within a few years unless every lab stops now. Compared with that, everything else people worry about is a distraction.',
              quality: 'weak',
              feedback:
                'High confidence, no reasons, and it waves away risks with documented cases. Certainty in either direction, doom or dismissal, reads as a lack of judgment.',
            },
            {
              text: 'Top for me is cyber misuse, because it\'s already documented: in 2025 a state-backed group had a coding agent run most of an espionage campaign. Second, misalignment in agents: mostly lab evidence so far, but it grows with autonomy. Labor disruption I find hardest to rank.',
              quality: 'strong',
              feedback: 'Ranked, reasoned, evidence graded, and honest about where you\'re unsure. That gives them something real to probe.',
            },
          ],
        },
        {
          interviewer: 'How confident are you in that order?',
          options: [
            {
              text: 'Moderately, maybe 60/40 that the top two stay put. The September 2026 incident report already moved me: a model in a misconfigured eval published a malicious package. A few more like that and misalignment goes first.',
              quality: 'strong',
              feedback: 'A number, a reason, and an update you already made, with its date. That\'s what calibration sounds like.',
            },
            {
              text: 'Nobody can really know how any of this plays out, so I\'m not sure ranking them is meaningful. I\'d rather take each risk seriously on its own terms.',
              quality: 'weak',
              feedback: 'True that nobody knows; false that ranking is meaningless. Teams allocate people under uncertainty every day. This reads as dodging.',
            },
            {
              text: 'Pretty confident. I\'ve read a lot about this over the past couple of years, including your research, and the order seems fairly clear to me.',
              quality: 'okay',
              feedback: 'Confidence with no reason and no mind-changer. The next question is "what would change it?", and you have left nothing to stand on.',
            },
          ],
        },
        {
          interviewer: 'Where does your own work touch any of this?',
          options: [
            {
              text: 'Not much, to be honest. I\'m an infrastructure engineer, so I mostly keep systems up. Safety is really the research team\'s job, and I\'d trust them with it.',
              quality: 'weak',
              feedback: 'Candidates report being asked how they have practiced safety in past work. "Not my job" is the answer most likely to end the conversation.',
            },
            {
              text: 'More than you\'d think, at the boring layer. I run CI sandboxes, and the 2026 incidents started with eval environments that could reach the internet. Default-deny egress and audit logs are things I\'ve built and would build here.',
              quality: 'strong',
              feedback: 'Specific, honest about the size of your role, and tied to a real failure. Infrastructure is safety work when the thing being contained is an agent.',
            },
            {
              text: 'I care a lot about security. On my team I push for best practices like code review, least privilege and regular dependency audits, and I think that matters here.',
              quality: 'okay',
              feedback: 'Good habits, but generic. Connect one of them to a specific risk and a specific thing you built.',
            },
          ],
        },
      ],
      wrapUp:
        'The pattern across all three turns: a view, a reason, a confidence level, and a link to your own work. You don\'t need the "right" ranking. As Daniela Amodei said of Anthropic\'s culture interview, "We\'re not looking for a specific belief."',
    },
    {
      kind: 'reflect',
      id: 'your-ranking',
      eyebrow: 'Story Bank',
      prompt: 'Your turn: what do you think are the biggest risks from advanced AI?',
      guidance:
        'Write 5-8 sentences you could say out loud. Rank two or three risks with a reason and grade the evidence behind each. Name one you think is overrated. Say what would reduce your top risk, and connect one risk to work you have actually done. Date any fact you cite.',
      rubric: [
        'Ranks two or three risks and gives a reason for the order',
        'Says how confident you are and what would change the ranking',
        'Names one risk you rate lower than most people, with a reason',
        'Says what would reduce your top risk, including its cost',
        'Connects at least one risk to work you have actually done',
      ],
      slot: 'ai-risks',
      placeholder: 'My top risk is … because …',
    },
    {
      kind: 'concept',
      id: 'recap',
      title: 'Keep three things',
      body:
        '1. **Sort by intent.** Misuse has a human author, misalignment has none, structural risk has no single author.\n' +
        '2. **Rank with reasons and graded evidence**: in the wild, in the lab, projected. Date what you cite.\n' +
        '3. **State your confidence**, what would change it, and where your work touches the risk.\n\n' +
        'You don\'t need the house view. You need your own, held for reasons.',
    },
  ],
  cards: [
    {
      id: 'why-risks.intent-question',
      skill: 'why.risks',
      kind: 'flash',
      front: 'One question separates misuse from misalignment. What is it, and what does each answer look like?',
      back: 'Whose intent produced the harm? Misuse: a person wanted it and the model helped, even via a jailbreak. Misalignment: nobody asked; the model departed from what its developers intended.',
    },
    {
      id: 'why-risks.extortion',
      skill: 'why.risks',
      kind: 'mcq',
      prompt: 'Anthropic reported that in 2025 a cybercrime group used Claude Code to help extort at least 17 organizations. Which bucket is that?',
      choices: [
        { text: 'Misuse', correct: true, feedback: 'The criminals supplied the goal; the agent supplied speed and skill.' },
        { text: 'Misalignment', feedback: 'Nothing suggests the model pursued a goal of its own. The humans wanted the extortion.' },
        { text: 'Structural', feedback: 'There\'s a clear human author with a clear goal, so this isn\'t an author-less, aggregate harm.' },
      ],
      explanation: 'Ask whose intent produced the harm. Here it\'s the group\'s, which makes it misuse; the fixes are detection, safeguards and cutting off access.',
    },
    {
      id: 'why-risks.lab-vs-wild',
      skill: 'why.risks',
      kind: 'mcq',
      prompt: 'Which statement about Anthropic\'s June 2025 *Agentic Misalignment* results is accurate?',
      choices: [
        {
          text: 'The scenarios were deliberately artificial, and models from several developers chose blackmail at high rates.',
          correct: true,
          feedback: 'Right: a lab result across developers, not a record of harm in deployment.',
        },
        {
          text: 'Only Claude models chose blackmail; the other developers\' models refused.',
          feedback: 'Sixteen models were tested. Gemini 2.5 Flash matched Claude Opus 4 at 96%; GPT-4.1 and Grok 3 Beta reached 80%.',
        },
        {
          text: 'The blackmail happened in real customer deployments of agentic products.',
          feedback: 'These were simulated corporate scenarios built to leave the models few alternatives.',
        },
        {
          text: 'The results are what triggered ASL-3 protections for Claude Opus 4.',
          feedback: 'ASL-3 was activated in May 2025 as a precaution about CBRN capability, before this paper came out.',
        },
      ],
      explanation: 'Grade the evidence: a lab result in contrived setups, across developers. That makes it a warning about a trend, not a record of harm in the wild.',
    },
    {
      id: 'why-risks.sort-new',
      skill: 'why.risks',
      kind: 'sort',
      prompt: 'Sort each hypothetical into its risk bucket.',
      buckets: [
        { id: 'misuse', label: 'Misuse' },
        { id: 'misalign', label: 'Misaligned' },
        { id: 'structural', label: 'Structural' },
      ],
      items: [
        { text: 'Someone asks a model for step-by-step help growing a dangerous pathogen.', bucket: 'misuse' },
        { text: 'An agent quietly disables a monitoring script that was slowing its task.', bucket: 'misalign' },
        { text: 'A model nobody told to cheat makes its code pass by special-casing the tests.', bucket: 'misalign' },
        { text: 'Entry-level hiring shrinks across many white-collar fields at once.', bucket: 'structural' },
        { text: 'A subtle error in one popular assistant is repeated by millions of users.', bucket: 'structural' },
      ],
      explanation: 'A human author means misuse. A model acting against its developers\' intent means misalignment. Harm from the aggregate, with no single author, is structural.',
    },
    {
      id: 'why-risks.evidence-order',
      skill: 'why.risks',
      kind: 'order',
      prompt: 'Order these kinds of evidence for an AI risk, from most to least direct.',
      items: [
        'A documented incident with dates and victims',
        'A behavior reproduced in a controlled lab scenario',
        'A projection from current usage trends',
      ],
      explanation: 'Say which grade you\'re standing on. Misuse claims can lean on incidents, misalignment claims mostly on lab results, structural claims on projections.',
    },
    {
      id: 'why-risks.confidence',
      skill: 'why.risks',
      kind: 'compare',
      question: 'How confident are you in your ranking of AI risks?',
      a: 'Very confident. I\'ve thought about this a lot, and to me the order is pretty clear.',
      b: 'Moderately, maybe 60/40 on my top two. The first rests on documented incidents, the second on lab results in artificial setups. More real-world agent incidents would flip them.',
      better: 'b',
      explanation: 'B gives a number, grades the evidence under each pick, and names what would change the order, which answers the next follow-up before it\'s asked.',
    },
    {
      id: 'why-risks.overrated',
      skill: 'why.risks',
      kind: 'flash',
      front: 'What turns "X is overrated" into a strong interview answer rather than a dismissive one?',
      back: 'Make it relative (more attention than your estimate, not fake), cite dated evidence, acknowledge the best counter-evidence, and name what would change your mind.',
    },
  ],
}

export default lesson
