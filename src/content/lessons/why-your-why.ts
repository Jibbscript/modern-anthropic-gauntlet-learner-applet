import type { Lesson } from '../../core/types'

const lesson: Lesson = {
  id: 'why-your-why',
  title: 'Your why, and where you disagree',
  summary: 'Replace the generic "why Anthropic" with a specific, falsifiable one, compare labs fairly, and build an honest disagreement you could defend.',
  minutes: 9,
  skills: ['why.pitch', 'why.differentiation', 'why.disagree'],
  steps: [
    {
      kind: 'concept',
      id: 'hook',
      eyebrow: 'Recruiter screen',
      title: 'The answer that fits every lab',
      body:
        '*I want to work on cutting-edge AI at a mission-driven company that takes safety seriously.*\n\n' +
        'Now swap in any other lab\'s name. Still works? That\'s the problem. Recruiters hear this answer constantly, and it tells them nothing about you.\n\n' +
        'A strong *why* fails the swap test: it\'s true only of this place, and it connects to something you have actually done.',
      callout: {
        tone: 'insight',
        text: 'Candidates report 2026 recruiter screens asking *Why Anthropic?*, *How is Anthropic different from other AI labs?* and *Have you followed Anthropic\'s recent moves? What did we do right or wrong?* In one Aug 2026 report, 20 minutes of a 30-minute call went to safety. A March 2026 culture-round report says the interviewer wanted concrete reasons, not generic interest in AI.',
      },
    },
    {
      kind: 'compare',
      id: 'compare-why',
      eyebrow: 'Which is stronger?',
      question: 'Why do you want to work at Anthropic?',
      a:
        'I\'ve followed AI for years, and I want to work on the most important technology of our time at a company that puts safety first. Your mission really resonates with me, and I do my best work in mission-driven cultures where people care about getting things right.',
      b:
        'My team moved most of our refactoring to coding agents this year, and I\'ve spent months on why long agent sessions drift. I want to work on that inside Claude Code itself. I also like that you publish your failures, like the September 2026 incident report. If that stopped, I\'d think twice.',
      better: 'b',
      explanation:
        'A survives the swap test, so it fails as an answer: every sentence works for any lab. B names a product area, ties it to the candidate\'s own history, cites a dated example, and states a condition that would make the reason false. That last part is what makes it sound real rather than recited.',
    },
    {
      kind: 'concept',
      id: 'specific',
      title: 'Where specific comes from',
      body:
        'Five sources, strongest when two combine:\n\n' +
        '- **A team** whose work you\'d join, and why\n' +
        '- **A paper** that changed how you think, and what changed\n' +
        '- **A policy position** you agree with, and what it costs\n' +
        '- **A product** you have used hard enough to know its limits\n' +
        '- **Your history**: the problem you have already been circling\n\n' +
        'Then make it falsifiable: *if X stopped being true, I\'d be less interested.*',
      callout: {
        tone: 'tip',
        text: 'Recent and dated beats general. "Your January 2026 constitution ranks being broadly safe above being broadly ethical, and here\'s what I think of that" beats "I like your values."',
      },
    },
    {
      kind: 'mcq',
      id: 'swap-check',
      eyebrow: 'Swap test',
      multi: true,
      prompt: 'Which sentences pass the swap test, meaning they would stop being true with another lab\'s name in them? Select all that apply.',
      choices: [
        {
          text: 'I want to work somewhere that takes AI safety seriously and publishes its research openly.',
          feedback: 'Every frontier lab says this about itself. It survives the swap, so it says nothing yet.',
        },
        {
          text: 'Five years on labor-market data is why I want to work on the Economic Index, which maps Claude usage to occupations.',
          correct: true,
          feedback: 'A named Anthropic project plus your own history with the problem. Swap the name and the sentence stops making sense.',
        },
        {
          text: 'I\'m excited by how fast AI is progressing, and I want to be at a lab that\'s pushing the frontier.',
          feedback: 'True of the whole field. It explains why AI, not why here.',
        },
        {
          text: 'I\'ve built four tools on MCP since its 2024 launch, and I want to work closer to where it came from.',
          correct: true,
          feedback:
            'A protocol Anthropic originated, plus your own history with it. Swap the name and it\'s false. One wrinkle: Anthropic donated MCP to the Linux Foundation\'s Agentic AI Foundation in Dec 2025, so be ready to say what you\'d build here, not on the spec.',
        },
        {
          text: 'Your mission really resonates with me, and I care deeply about AI going well for everyone.',
          feedback: 'Resonance is a feeling, not a reason. Which part of the mission, and what have you done about it?',
        },
      ],
      explanation:
        'Run the swap test on your own draft: read each sentence with another lab\'s name in it. Whatever survives is filler or, at best, a premise. Keep the sentences that break.',
    },
    {
      kind: 'concept',
      id: 'differentiation',
      title: 'Compare labs on facts, fairly',
      body:
        'Use checkable facts, and credit others where they match.\n\n' +
        '- **Holds up**: Anthropic has been a PBC from the start, and since April 2026 trust-appointed directors are a board majority. OpenAI restructured in Oct 2025 so a nonprofit foundation controls its for-profit PBC.\n' +
        '- **Doesn\'t hold up**: *the only lab with a safety framework*. OpenAI (Dec 2023) and Google DeepMind (May 2024) followed the RSP.',
      callout: {
        tone: 'warn',
        text: 'Never smear. "They only care about money" tells a recruiter how you will talk about them after you leave. A fair contrast sounds like: "Meta released its Llama models with open weights. I see the case for openness, and here\'s where I land."',
      },
    },
    {
      kind: 'mcq',
      id: 'fair-contrast',
      eyebrow: 'Check',
      prompt: 'The recruiter asks how Anthropic differs from other labs. Which answer is accurate *and* fair?',
      choices: [
        {
          text: 'It was the only major lab to publicly back California\'s SB 53 in 2025. Backing rules that bind you too is a costly signal.',
          correct: true,
          feedback: 'Accurate, specific, and it says why the fact matters to you. Note what it doesn\'t claim: anything about why other labs stayed out.',
        },
        {
          text: 'It\'s the only lab that publishes a safety framework, which shows the others don\'t take safety seriously.',
          feedback: 'False since Dec 2023 (OpenAI) and May 2024 (Google DeepMind), and the inference about the others is a smear. Getting this wrong in a screen is costly.',
        },
        {
          text: 'The other labs are mostly chasing revenue. Anthropic is the one that actually cares about getting this right.',
          feedback: 'Unfalsifiable and unfair, and awkward given Anthropic\'s own reported revenue growth. It also tells the recruiter how you talk about former employers.',
        },
        {
          text: 'Honestly, the labs are all fairly similar from the outside. I mostly go wherever the most interesting engineering work is.',
          feedback: 'Evasive. There are real structural differences and you were asked to name one. This signals you haven\'t looked.',
        },
      ],
      explanation:
        'Fair differentiation: one checkable fact, why it matters to you, and no claims about anyone else\'s motives. If you mention a competitor, credit them where they match. Google, OpenAI and xAI all won defense prototype awards similar to Anthropic\'s in 2025, for example.',
    },
    {
      kind: 'concept',
      id: 'disagree-structure',
      title: 'Build a disagreement you could defend',
      body:
        'Candidates report being asked *What concerns do you have with Anthropic\'s mission or direction?* Agreeing with everything is weak. So is a hot take. Use four moves:\n\n' +
        '1. **Steelman**: their best reasoning, in their words.\n' +
        '2. **Your view**: where you land, and why.\n' +
        '3. **Mind-changer**: what evidence would move you.\n' +
        '4. **Then what**: would you still join, and how would you raise it?',
      callout: {
        tone: 'insight',
        text: 'The critiques aren\'t secret. In *We Must Pace the Frontier* (Sep 2026), Dario Amodei acknowledges Anthropic has been "accused of hype, \'doomerism\', or regulatory capture." If the CEO can name them, you should be able to engage with the strongest one.',
      },
    },
    {
      kind: 'order',
      id: 'order-disagreement',
      eyebrow: 'Structure',
      prompt: 'A recruiter asks where you disagree with Anthropic. Put this candidate\'s answer in order.',
      items: [
        'Name the decision: RSP v3 (Feb 2026) dropped the 2023 pause pledge.',
        'Give their best case: a lone pause while others race on could leave the world less safe.',
        'Say where you land: narrowing it made sense, but nonbinding goals make drift easier.',
        'Name what would move you: a year of graded roadmap goals met on schedule.',
        'Close: you\'d still join, and you\'d argue it from inside, with specifics.',
      ],
      explanation:
        'Steelman before your view, or the interviewer hears a hot take. The mind-changer shows you\'re reasoning, not performing. The close answers the follow-up candidates report hearing next: *would you still join?* The view here is one example, not the right answer.',
      hint: 'You can\'t fairly disagree with something you haven\'t stated fairly yet.',
    },
    {
      kind: 'match',
      id: 'steelman-match',
      eyebrow: 'Steelman first',
      prompt: 'Before you disagree, know their best argument. Match each tension candidates raise to the reasoning Anthropic has given.',
      pairs: [
        { left: 'Building frontier models while warning about them', right: 'Safety research needs frontier-scale models' },
        { left: 'RSP v3 dropping the 2023 pause pledge', right: 'A lone pause could leave the world less safe' },
        { left: 'Defense and intelligence work', right: 'Back national security, but no mass domestic surveillance or fully autonomous weapons' },
        { left: 'Very fast commercial growth', right: 'Prove careful labs can win, so safety becomes competitive' },
        { left: 'Pushing for chip export controls', right: 'Denying advanced chips to China may be the single most important step' },
      ],
      explanation:
        'Sources: Core Views (2023: large models are "qualitatively different"); the RSP v3 announcement (Feb 2026); the Department of War statement (Feb 2026: current frontier AI is "simply not reliable enough" for fully autonomous weapons); *We Must Pace the Frontier* (Sep 2026); *The Adolescence of Technology* (Jan 2026). Other live topics: open versus closed weights, and political spending ($20M to Public First Action in Feb 2026, later $40M). These are topics, not verdicts. Pick one you have actually thought about.',
    },
    {
      kind: 'mcq',
      id: 'pushback',
      eyebrow: 'Updating',
      prompt:
        'You told the recruiter you\'re uneasy about Anthropic\'s defense and intelligence work. They reply: *In early 2026 we kept two limits, no mass domestic surveillance and no fully autonomous weapons, even after the Pentagon labeled us a supply-chain risk. Doesn\'t that answer it?* Best response?',
      choices: [
        {
          text: 'Partly. Holding them at that cost shows the limits are real. It doesn\'t settle the uses in between, like intelligence analysis. How do those get reviewed?',
          correct: true,
          feedback: 'You named what moved, what didn\'t, and what you\'d want to learn next. That\'s updating in public, which is what this probe is for.',
        },
        {
          text: 'That\'s a really good point. I hadn\'t thought about it that way, and honestly it changes my mind, so I think I agree with you now.',
          feedback: 'Caving to the first counterargument reads as agreeableness, not updating. Blind agreement is the failure mode candidates are warned about.',
        },
        {
          text: 'I hear you, but I still think a company focused on AI safety shouldn\'t be doing defense work at all. My view on that hasn\'t changed.',
          feedback: 'Holding a view is fine; ignoring the argument isn\'t. Their point is evidence the limits are real. Say what it does and doesn\'t change for you.',
        },
        {
          text: 'It\'s your policy, and you know far more about the tradeoffs than I do, so I assume you made the right call there.',
          feedback: 'Deference isn\'t a view. It also suggests you\'d stay quiet if you saw something wrong from inside.',
        },
      ],
      explanation:
        'A better argument should move you, visibly and by the right amount. Say what changed, what didn\'t, and what would move you further. The move is the same whatever your starting view, including if you think those two limits go too far.',
    },
    {
      kind: 'interview',
      id: 'recruiter-sim',
      eyebrow: 'Interview sim',
      setup: 'A 30-minute recruiter call. The logistics are done, and the recruiter turns to the part candidates say takes up most of the time.',
      turns: [
        {
          interviewer: 'So, why Anthropic?',
          options: [
            {
              text: 'I use Claude every day and I\'m impressed by the research you publish. I want to work somewhere safety is central to the product rather than an afterthought, and that\'s rare.',
              quality: 'okay',
              feedback: 'Sincere, but it survives the swap test. Which research, and what has it got to do with you?',
            },
            {
              text: 'Honestly, you\'re the most ethical AI company out there, and everyone in the industry knows it. I\'d be honored to be part of the team and help however I can.',
              quality: 'weak',
              feedback: 'Flattery with no content. Reported failure modes for these conversations include rehearsed enthusiasm and reciting the mission.',
            },
            {
              text: 'Three years on fraud models taught me to care about "why did it flag this?" Your March 2025 circuit-tracing work asks that at the frontier, and I want to build tooling for it. If interpretability lost headcount here, I\'d be less keen.',
              quality: 'strong',
              feedback: 'A dated paper, the personal history that makes it matter to you, a concrete role, and a condition that would make the reason false.',
            },
          ],
        },
        {
          interviewer: 'Lots of labs say they care about safety. What is actually different here?',
          options: [
            {
              text: 'Some differences are real, some aren\'t. Frameworks aren\'t anymore: OpenAI and DeepMind adopted their own soon after the RSP. Governance is: a PBC from day one, and a trust-appointed board majority since April 2026. Does that hold up against commercial pressure? I\'d want to know.',
              quality: 'strong',
              feedback: 'Credits others, cites checkable facts with dates, and ends on an honest open question instead of a sales pitch.',
            },
            {
              text: 'The others are basically in it for the money, whatever they say in public. You\'re the only ones who actually care about where this goes.',
              quality: 'weak',
              feedback: 'A smear, and an unfalsifiable one. It tells the recruiter how you will talk about Anthropic after you leave.',
            },
            {
              text: 'You seem more focused on safety research than the others, and you publish more of it, even when it makes your own models look bad. That research culture matters a lot to me.',
              quality: 'okay',
              feedback: 'Plausible, but vague. Name one paper or one structural fact and it becomes an answer.',
            },
          ],
        },
        {
          interviewer: 'Last one. Where do you disagree with us?',
          options: [
            {
              text: 'Honestly, nowhere I can think of. I\'ve read a lot of your material over the past year, and I\'m fully aligned with the mission and the approach.',
              quality: 'weak',
              feedback: 'Candidates report that evaluators look for a willingness to critique Anthropic. "Nothing" signals you haven\'t thought hard, or won\'t say.',
            },
            {
              text: 'Commercial pace. Your case: careful labs must win commercially so labs compete on safety. My worry: at this growth, every safety delay costs more internally. Holding back Mythos Preview counts for you; if that holds when a rival ships first, I\'d drop it. I\'d still join.',
              quality: 'strong',
              feedback:
                'Steelman, view, evidence on both sides, a mind-changer and the close, in about thirty seconds. Same topic as the hedged answer, done properly.',
            },
            {
              text: 'Maybe the pace of product launches? It feels very fast from the outside, though I assume you have good reasons for it that I can\'t see from here.',
              quality: 'okay',
              feedback: 'A real topic, hedged into nothing. What exactly worries you, and what would change your mind?',
            },
          ],
        },
      ],
      wrapUp:
        'Specific beats impressive, fair beats loyal, and a disagreement with a steelman and a mind-changer beats both agreement and attack. The recruiter can push on any of it. The point is that there\'s something real to push on.',
    },
    {
      kind: 'reflect',
      id: 'your-why',
      eyebrow: 'Story Bank',
      prompt: 'Write your answer to *Why Anthropic, specifically, and why now?*',
      guidance:
        'Write 4-6 sentences you could say out loud. Use one or two specific sources (a team, paper, policy, product or your history), date anything recent, and end with what would make the reason false. Then read it with another lab\'s name in it and cut whatever survives.',
      rubric: [
        'Names a specific team, paper, policy or product, dated if recent',
        'Fails the swap test: false with another lab\'s name in it',
        'Connects to work you have actually done',
        'Says what would make you less interested',
        'Contains no flattery (most ethical, amazing, honored)',
      ],
      slot: 'why-anthropic',
      placeholder: 'The specific thing that draws me is …',
    },
    {
      kind: 'reflect',
      id: 'your-disagreement',
      eyebrow: 'Story Bank',
      prompt: 'Write your answer to *Where do you personally disagree with Anthropic?*',
      guidance:
        'Pick a decision or position you have actually thought about, not one chosen to sound bold. Steelman it first, then give your view, the evidence that would change your mind, and whether you\'d still join and how you\'d raise it. Landing on partial agreement is fine.',
      rubric: [
        'Names a specific decision or position, with its date',
        'States Anthropic\'s strongest reasoning fairly, before your view',
        'Explains why you still land differently',
        'Names evidence that would change your mind',
        'Says whether you\'d still join and how you\'d raise it',
      ],
      slot: 'disagree-anthropic',
      placeholder: 'The decision I\'d push back on is …',
    },
    {
      kind: 'concept',
      id: 'recap',
      title: 'Keep three things',
      body:
        '1. **Run the swap test.** If your why works for any lab, it isn\'t a why. Add a dated specific and a condition that would make it false.\n' +
        '2. **Compare on facts.** Credit others where they match; never guess at their motives.\n' +
        '3. **Disagree in four moves**: steelman, your view, mind-changer, then what. And update visibly when the argument is better.',
    },
  ],
  cards: [
    {
      id: 'why-your-why.swap-test',
      skill: 'why.pitch',
      kind: 'flash',
      front: 'What is the swap test for a "why Anthropic" answer, and what do you do with what survives it?',
      back: 'Put another lab\'s name in each sentence. Anything still true is filler: cut it or back it with something specific. Keep the sentences that break, such as a dated specific tied to your own history.',
    },
    {
      id: 'why-your-why.falsifiable',
      skill: 'why.pitch',
      kind: 'mcq',
      prompt: 'Which sentence makes a "why Anthropic" answer falsifiable?',
      choices: [
        {
          text: 'If you stopped publishing your incident reports, I\'d be much less interested.',
          correct: true,
          feedback: 'It names a condition that would make your reason untrue, which is evidence the reason is real.',
        },
        { text: 'I\'ve always been passionate about artificial intelligence.', feedback: 'Nothing could make this false, and it applies to every lab.' },
        { text: 'Your mission is the most important one in the industry.', feedback: 'Flattery with no condition attached. What would change your mind?' },
        { text: 'I think I\'d be a really great culture fit here.', feedback: 'A claim about yourself with no reason attached; nothing in it can be checked.' },
      ],
      explanation: 'Falsifiable means you can say what would make it untrue. That shows the reason is doing work for you, rather than being recited.',
    },
    {
      id: 'why-your-why.lab-facts',
      skill: 'why.differentiation',
      kind: 'match',
      prompt: 'Match each lab to a fair, checkable fact.',
      pairs: [
        { left: 'Anthropic', right: 'Trust-appointed directors became a board majority (Apr 2026)' },
        { left: 'OpenAI', right: 'Nonprofit foundation controls a for-profit PBC (Oct 2025)' },
        { left: 'Google DeepMind', right: 'Published its Frontier Safety Framework (May 2024)' },
        { left: 'Meta', right: 'Released its Llama models with open weights' },
      ],
      explanation: 'Each is checkable and none is a smear. Facts like these let you contrast labs without guessing at anyone\'s motives.',
    },
    {
      id: 'why-your-why.frameworks',
      skill: 'why.differentiation',
      kind: 'mcq',
      prompt: 'You want to bring up safety frameworks when contrasting labs. Which statement is accurate?',
      choices: [
        {
          text: 'Anthropic published its RSP in Sep 2023; OpenAI (Dec 2023) and Google DeepMind (May 2024) followed with similar frameworks.',
          correct: true,
          feedback: 'Correct. Anthropic cites this as evidence its "race to the top" partly worked, which is a better point than "only we have one".',
        },
        { text: 'Anthropic is still the only frontier lab with a published safety framework.', feedback: 'False since Dec 2023, when OpenAI published its Preparedness Framework.' },
        {
          text: 'Other labs only published frameworks after California\'s SB 53 forced them to.',
          feedback: 'OpenAI\'s (Dec 2023) and Google DeepMind\'s (May 2024) came well before SB 53 was signed in Sep 2025.',
        },
        {
          text: 'Frameworks are voluntary everywhere, so they can\'t meaningfully be compared.',
          feedback: 'SB 53, New York\'s RAISE Act and the EU AI Act Codes of Practice now require published frameworks, and the documents themselves can be compared.',
        },
      ],
      explanation: 'Having a framework no longer sets a lab apart. That others followed is Anthropic\'s own evidence that the race to the top partly worked.',
    },
    {
      id: 'why-your-why.sort-moves',
      skill: 'why.disagree',
      kind: 'sort',
      prompt: 'Sort each sentence from a disagreement answer into its role.',
      buckets: [
        { id: 'steelman', label: 'Their best case' },
        { id: 'view', label: 'Your view' },
        { id: 'changer', label: 'What would move you' },
      ],
      items: [
        { text: 'Some safety problems only show up in frontier-scale models.', bucket: 'steelman' },
        { text: 'A lone pause while others race ahead could leave the world less safe.', bucket: 'steelman' },
        { text: 'I think the pledge should have been narrowed, not replaced with nonbinding goals.', bucket: 'view' },
        { text: 'Defense work is defensible, but I\'d want the two red lines in every contract.', bucket: 'view' },
        { text: 'If the roadmap goals are met on schedule for a year, I\'d drop the objection.', bucket: 'changer' },
        { text: 'If autonomous systems were shown to be reliable, I\'d revisit the weapons line.', bucket: 'changer' },
      ],
      explanation: 'The steelman is their argument, stated so they would sign it. Your view says where you land. The mind-changer names evidence, not a feeling. Answers that skip the first or the last read as hot takes.',
    },
    {
      id: 'why-your-why.compare-disagree',
      skill: 'why.disagree',
      kind: 'compare',
      question: 'Where do you disagree with Anthropic?',
      a: 'Building frontier models while warning about them. Your case: some safety problems only appear at frontier scale. I buy that for staying near the frontier, less for pushing it. If the Sep 2026 call to pace the frontier shows up in your own release cadence, I\'d drop it. I\'d still join.',
      b: 'I\'m not sure I disagree with anything, honestly. I\'ve read a lot of your material and it all seems well reasoned. If anything, maybe you could be a bit bolder.',
      better: 'a',
      explanation: 'B agrees with everything, which candidates are warned reads as performance. A names a tension, states Anthropic\'s case, says exactly where it stops agreeing, names observable evidence that would change its mind, and answers whether it would still join.',
    },
    {
      id: 'why-your-why.update',
      skill: 'why.disagree',
      kind: 'flash',
      front: 'An interviewer answers your disagreement with a strong counterargument. What does a good response sound like?',
      back: 'Name what moved and what didn\'t: "That changes my view on X. I still think Y, and Z would move me further." Not instant agreement, and not repeating yourself louder.',
    },
  ],
}

export default lesson
