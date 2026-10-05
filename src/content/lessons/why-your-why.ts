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
        'Now swap in any other lab\'s name. Still works? That is the problem. Recruiters hear this answer constantly, and it tells them nothing about you.\n\n' +
        'A strong *why* fails the swap test: it is true only of this place, and it connects to something you have actually done.',
      callout: {
        tone: 'insight',
        text: 'Candidates report 2026 recruiter screens asking *Why Anthropic?*, *How is Anthropic different from other labs?* and *What did we do right or wrong recently?*, with 20 minutes or more of a 30-minute call going to safety. One March 2026 report says the interviewer wanted concrete reasons, not generic interest in AI.',
      },
    },
    {
      kind: 'compare',
      id: 'compare-why',
      eyebrow: 'Which is stronger?',
      question: 'Why do you want to work at Anthropic?',
      a:
        'I have followed AI for years, and I want to work on the most important technology of our time at a company that puts safety first. Your mission really resonates with me, and I do my best work in mission-driven cultures where people care about getting things right.',
      b:
        'My team moved most of our refactoring to coding agents this year, and I have spent months on why long agent sessions drift. I want to work on that harness, at the source. I also like that you publish your failures, like the September 2026 incident report. If that stopped, I would think twice.',
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
        '- **A team** whose work you would join, and why\n' +
        '- **A paper** that changed how you think, and what changed\n' +
        '- **A policy position** you agree with, and what it costs\n' +
        '- **A product** you have used hard enough to know its limits\n' +
        '- **Your history**: the problem you have already been circling\n\n' +
        'Then make it falsifiable: *if X stopped being true, I would be less interested.*',
      callout: {
        tone: 'tip',
        text: 'Recent and dated beats general. "Your January 2026 constitution ranks being broadly safe above being broadly ethical, and here is what I think of that" beats "I like your values."',
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
          text: 'I want to work somewhere that takes AI safety seriously.',
          feedback: 'Every frontier lab says this about itself. It survives the swap, so it says nothing yet.',
        },
        {
          text: 'Your 2026 constitution ranks being broadly safe above broadly ethical. I think that order is right for now, and I want to be near the people who argue about it.',
          correct: true,
          feedback: 'Specific, dated, and it takes a position on something only this company wrote.',
        },
        {
          text: 'I am excited by how fast AI is progressing right now, and I want to be part of it.',
          feedback: 'True of the whole field. It explains why AI, not why here.',
        },
        {
          text: 'I have built four internal tools on MCP since it launched in late 2024, and I want to work closer to where it came from.',
          correct: true,
          feedback: 'A protocol Anthropic originated, plus your own history with it. Swap the name and it is false.',
        },
        {
          text: 'Your mission really resonates with me on a personal level.',
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
        '- **Does not**: *the only lab with a safety framework*. OpenAI (Dec 2023) and Google DeepMind (May 2024) followed the RSP.',
      callout: {
        tone: 'warn',
        text: 'Never smear. "They only care about money" tells a recruiter how you will talk about them after you leave. A fair contrast sounds like: "Meta has favored open-weight releases. I see the case for openness, and here is where I land."',
      },
    },
    {
      kind: 'mcq',
      id: 'fair-contrast',
      eyebrow: 'Check',
      prompt: 'The recruiter asks how Anthropic differs from other labs. Which answer is accurate *and* fair?',
      choices: [
        {
          text: 'It was the only major lab to publicly back California\'s SB 53 in 2025. Supporting rules that bind you too is a costly signal, and that matters to me.',
          correct: true,
          feedback: 'Accurate, specific, and it says why the fact matters to you. Note what it does not claim: anything about why other labs stayed out.',
        },
        {
          text: 'It is the only lab that publishes a safety framework, which shows the others do not take safety seriously.',
          feedback: 'False since Dec 2023 (OpenAI) and May 2024 (Google DeepMind), and the inference about the others is a smear. Getting this wrong in a screen is costly.',
        },
        {
          text: 'The other labs are mostly chasing revenue. Anthropic is the one that actually cares about getting this right.',
          feedback: 'Unfalsifiable and unfair, and awkward given Anthropic\'s own reported revenue growth. It also tells the recruiter how you talk about former employers.',
        },
        {
          text: 'Honestly, they are all fairly similar. I mostly go wherever the most interesting engineering work is.',
          feedback: 'Evasive. There are real structural differences and you were asked to name one. This signals you have not looked.',
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
        'Candidates report being asked *What concerns do you have with Anthropic\'s direction?* Agreeing with everything is the weak answer. So is a hot take. The strong one has four moves:\n\n' +
        '1. **Steelman**: their best reasoning, in their words.\n' +
        '2. **Your view**: where you land, and why.\n' +
        '3. **Mind-changer**: what evidence would move you.\n' +
        '4. **Then what**: would you still join, and how would you raise it?',
      callout: {
        tone: 'quote',
        text: '"We\'re not looking for a specific belief." Daniela Amodei, on Anthropic\'s culture interview (Bloomberg Businessweek, May 2026)',
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
        'Close: you would still join, and you would argue it from inside, with specifics.',
      ],
      explanation:
        'Steelman before your view, or the interviewer hears a hot take. The mind-changer shows you are reasoning, not performing. The close answers the follow-up candidates report hearing next: *would you still join?* The view here is one example, not the right answer.',
      hint: 'You cannot fairly disagree with something you have not stated fairly yet.',
    },
    {
      kind: 'match',
      id: 'steelman-match',
      eyebrow: 'Steelman first',
      prompt: 'Five tensions candidates raise. Before disagreeing with one, you need Anthropic\'s best argument for it. Match each tension to the reasoning Anthropic has given.',
      pairs: [
        { left: 'Building frontier models while warning about them', right: 'Safety research needs frontier-scale models' },
        { left: 'RSP v3 dropping the 2023 pause pledge', right: 'A lone pause could leave the world less safe' },
        { left: 'Defense work, with two exceptions', right: 'Back national security, but no mass surveillance or autonomous weapons' },
        { left: 'Very fast commercial growth', right: 'Prove careful labs can win, so safety becomes competitive' },
        { left: 'Pushing for chip export controls', right: 'Denying chips to the CCP may matter most' },
      ],
      explanation:
        'Sources: Core Views (2023: large models are "qualitatively different"); the RSP v3 announcement (Feb 2026); the Department of War statement (Feb 2026: fully autonomous weapons are "simply not reliable enough"); *We Must Pace the Frontier* (Sep 2026); *The Adolescence of Technology* (Jan 2026). Other live topics: open versus closed weights, and political spending ($20M to Public First Action in Feb 2026, later $40M). These are topics, not verdicts. Pick one you have actually thought about.',
    },
    {
      kind: 'mcq',
      id: 'pushback',
      eyebrow: 'Updating',
      prompt:
        'You told the recruiter you disagree with RSP v3 dropping the pause pledge. They reply: *If one lab pauses while others keep training without strong safeguards, the world could end up less safe. Doesn\'t that answer it?* Best response?',
      choices: [
        {
          text: 'Partly. It moves me on a unilateral pause. It does not answer my worry that nonbinding goals make drift easier, so I would watch whether the roadmap grades hold up.',
          correct: true,
          feedback: 'You named what moved, what did not, and what would move you further. That is updating in public, which is what this probe is for.',
        },
        {
          text: 'That is a really good point. I had not thought about it that way, so I think I agree with you now.',
          feedback: 'Caving to the first counterargument reads as agreeableness, not updating. Blind agreement is the failure mode candidates are warned about.',
        },
        {
          text: 'I hear you, but I still think you should have kept the original pledge exactly as it was.',
          feedback: 'Holding a view is fine; ignoring the argument is not. Say which part of their point you accept.',
        },
        {
          text: 'It is your policy and you know far more than I do, so I assume you made the right call.',
          feedback: 'Deference is not a view. It also suggests you would stay quiet if you saw something wrong from inside.',
        },
      ],
      explanation:
        'A better argument should move you, visibly and by the right amount. Say what changed, what did not, and what evidence would move you further. The 2026 Frontier Safety Roadmap\'s publicly graded goals give you something concrete to watch.',
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
              text: 'I use Claude a lot and I am impressed by the research you publish. I want to work somewhere safety is central rather than an afterthought.',
              quality: 'okay',
              feedback: 'Sincere, but it survives the swap test. Which research, and what has it got to do with you?',
            },
            {
              text: 'Honestly, you are the most ethical AI company out there and everyone knows it. I would be honored to be part of it.',
              quality: 'weak',
              feedback: 'Flattery with no content. Reported failure modes for these conversations include rehearsed enthusiasm and reciting the mission.',
            },
            {
              text: 'My team moved most refactoring to coding agents this year, and I have spent months on why long sessions drift. I want to work on that harness. Your published incident reports matter to me too; if those stopped, I would be less keen.',
              quality: 'strong',
              feedback: 'Product area, personal history, a dated reason, and a condition that would make it false.',
            },
          ],
        },
        {
          interviewer: 'Lots of labs say they care about safety. What is actually different here?',
          options: [
            {
              text: 'Some differences are real and some are not. Frameworks are not anymore: OpenAI and DeepMind adopted their own soon after the RSP. Governance is: a PBC from day one, and trust-appointed directors became a board majority in April 2026. I would still want to know how much that constrains commercial pressure.',
              quality: 'strong',
              feedback: 'Credits others, cites checkable facts with dates, and ends on an honest open question instead of a sales pitch.',
            },
            {
              text: 'The others are basically in it for the money. You are the only ones who actually care.',
              quality: 'weak',
              feedback: 'A smear, and an unfalsifiable one. It tells the recruiter how you will talk about Anthropic after you leave.',
            },
            {
              text: 'You seem more focused on safety research and you publish more of it. That culture matters a lot to me.',
              quality: 'okay',
              feedback: 'Plausible, but vague. Name one paper or one structural fact and it becomes an answer.',
            },
          ],
        },
        {
          interviewer: 'Last one. Where do you disagree with us?',
          options: [
            {
              text: 'Honestly, nowhere I can think of. I have read a lot of your material and I am fully aligned with the mission.',
              quality: 'weak',
              feedback: 'Candidates report this question precisely because blind agreement is a red flag. "Nothing" signals you have not thought hard, or will not say.',
            },
            {
              text: 'RSP v3. I accept that a lone pause could leave the world less safe. But nonbinding goals make drift easier, and I would watch the roadmap grades. A year of goals met on time would move me. I would still join, and raise it from inside.',
              quality: 'strong',
              feedback: 'Steelman, view, mind-changer, and the close, in about thirty seconds.',
            },
            {
              text: 'Maybe the pace of product launches? It feels fast, but I assume you have good reasons for it.',
              quality: 'okay',
              feedback: 'A real topic, hedged into nothing. What exactly worries you, and what would change your mind?',
            },
          ],
        },
      ],
      wrapUp:
        'Specific beats impressive, fair beats loyal, and a disagreement with a steelman and a mind-changer beats both agreement and attack. The recruiter can push on any of it. The point is that there is something real to push on.',
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
        'Pick a decision or position you have actually thought about, not one chosen to sound bold. Steelman it first, then give your view, the evidence that would change your mind, and whether you would still join and how you would raise it. Landing on partial agreement is fine.',
      rubric: [
        'Names a specific decision or position, with its date',
        'States Anthropic\'s strongest reasoning fairly, before your view',
        'Explains why you still land differently',
        'Names evidence that would change your mind',
        'Says whether you would still join and how you would raise it',
      ],
      slot: 'disagree-anthropic',
      placeholder: 'The decision I would push back on is …',
    },
    {
      kind: 'concept',
      id: 'recap',
      title: 'Keep three things',
      body:
        '1. **Run the swap test.** If your why works for any lab, it is not a why. Add a dated specific and a condition that would make it false.\n' +
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
          text: 'If you stopped publishing your incident reports, I would be much less interested.',
          correct: true,
          feedback: 'It names a condition that would make your reason untrue, which is evidence the reason is real.',
        },
        { text: 'I have always been passionate about artificial intelligence.', feedback: 'Nothing could make this false, and it applies to every lab.' },
        { text: 'Your mission is the most important one in the industry.', feedback: 'Flattery with no condition attached. What would change your mind?' },
        { text: 'I think I would be a really great culture fit here.', feedback: 'A claim about yourself with no reason attached; nothing in it can be checked.' },
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
        { left: 'Meta', right: 'Has favored open-weight releases (Llama)' },
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
          text: 'Anthropic published the first RSP in Sep 2023; OpenAI and Google DeepMind adopted similar frameworks within months.',
          correct: true,
          feedback: 'Correct. Anthropic cites this as evidence its "race to the top" partly worked, which is a better point than "only we have one".',
        },
        { text: 'Anthropic is still the only frontier lab with a published safety framework.', feedback: 'False since Dec 2023, when OpenAI published its Preparedness Framework.' },
        {
          text: 'Other labs only published frameworks after California\'s SB 53 forced them to.',
          feedback: 'OpenAI\'s (Dec 2023) and Google DeepMind\'s (May 2024) came well before SB 53 was signed in Sep 2025.',
        },
        {
          text: 'Frameworks are voluntary everywhere, so they cannot meaningfully be compared.',
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
        { text: 'Safety research only means something on frontier-scale models.', bucket: 'steelman' },
        { text: 'A lone pause while others race ahead could leave the world less safe.', bucket: 'steelman' },
        { text: 'I think the pledge should have been narrowed, not replaced with nonbinding goals.', bucket: 'view' },
        { text: 'Defense work is defensible, but I would want the two red lines in every contract.', bucket: 'view' },
        { text: 'If the roadmap goals are met on schedule for a year, I would drop the objection.', bucket: 'changer' },
        { text: 'If autonomous systems were shown to be reliable, I would revisit the weapons line.', bucket: 'changer' },
      ],
      explanation: 'The steelman is their argument, stated so they would sign it. Your view says where you land. The mind-changer names evidence, not a feeling. Answers that skip the first or the last read as hot takes.',
    },
    {
      id: 'why-your-why.compare-disagree',
      skill: 'why.disagree',
      kind: 'compare',
      question: 'Where do you disagree with Anthropic?',
      a: 'I am not sure I disagree with anything, honestly. I have read a lot of your material and it all seems well reasoned. If anything, maybe you could be a bit bolder.',
      b: 'The pace of commercialization. The best case is that careful labs must win commercially for safety to become competitive. My worry is that growth this fast makes every safety delay costlier inside. A launch visibly delayed for safety would move me. I would still join.',
      better: 'b',
      explanation: 'A agrees with everything, which candidates are warned reads as performance. B names a topic, steelmans it, states a concern, says what would update it, and answers whether they would still join.',
    },
    {
      id: 'why-your-why.update',
      skill: 'why.disagree',
      kind: 'flash',
      front: 'An interviewer answers your disagreement with a strong counterargument. What does a good response sound like?',
      back: 'Name what moved and what did not: "That changes my view on X. I still think Y, and Z would move me further." Not instant agreement, and not repeating yourself louder.',
    },
  ],
}

export default lesson
