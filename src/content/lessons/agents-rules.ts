import type { Lesson } from '../../core/types'

const lesson: Lesson = {
  id: 'agents-rules',
  title: 'The rules of engagement',
  summary: 'Why some rounds are AI-free, what transparent use looks like, and what to do when the rules are unclear or you slip.',
  minutes: 8,
  skills: ['agents.policy', 'values.ethics'],
  steps: [
    {
      kind: 'concept',
      id: 'hook',
      eyebrow: 'A test that kept breaking',
      title: 'The take-home Claude kept passing',
      body: "Anthropic's performance-engineering take-home allows AI. Given the same time limit, Claude Opus 4 beat almost every human who had taken it, so the team redesigned it. Then Claude Opus 4.5 matched the best humans on the new version, and they redesigned it again.\n\nIf the tool can earn the score alone, the score stops describing the candidate. So what is each round actually measuring?",
      callout: {
        tone: 'source',
        text: '[Designing AI-resistant technical evaluations](https://www.anthropic.com/engineering/AI-resistant-technical-evaluations), Anthropic engineering blog, Jan 2026.',
      },
    },
    {
      kind: 'mcq',
      id: 'why-ai-free',
      prompt: 'Anthropic says it uses Claude every day. Why keep most interview rounds AI-free by default?',
      choices: [
        {
          text: "To get a clean read on your own reasoning, which an AI-assisted round can't separate from the model's",
          correct: true,
          feedback: 'Right. The rule exists to define what the round measures: you, unaided.',
        },
        {
          text: "Because AI-written code is still worse than a strong engineer's code",
          feedback: "The take-home story says otherwise: the model beat most candidates. The problem is attribution, not quality.",
        },
        {
          text: 'Mainly so they can catch candidates who cheat',
          feedback: 'Catching cheaters is a side effect. The rule exists to fix what is measured; without it there would be nothing to cheat on.',
        },
        {
          text: 'Because the actual job is mostly done without AI',
          feedback: "The guidance opens by saying they use Claude every day. AI-free rounds test the foundation, not the daily workflow.",
        },
      ],
      explanation: "Two different signals. AI-free: how you think, debug and decide on your own. AI-assisted: how you direct and check a model. Both are real. Mixing them in secret corrupts both, because your score is compared with people who followed the rule. Press coverage in May 2026 put it plainly: the ban is there to see how candidates actually think.",
      hint: 'If a round allowed AI, whose reasoning would the score describe?',
    },
    {
      kind: 'concept',
      id: 'default-off',
      title: 'Default off, exceptions explicit',
      body: "Anthropic's candidate guidance (last updated Jul 10, 2025) turns on four words: **unless we indicate otherwise**. Silence means no AI. An exception is something written in your instructions, not something you infer from the company culture or a forum thread.\n\nAnd autocomplete counts. An AI suggestion in your editor is AI assistance, even if you only accepted half of it.",
      callout: {
        tone: 'source',
        text: '[How to collaborate with Claude during our hiring process](https://www.anthropic.com/candidate-ai-guidance), last updated Jul 10, 2025. Reread it before your loop; policies change.',
      },
    },
    {
      kind: 'match',
      id: 'stage-rules',
      prompt: 'Match each situation to the right move under the Jul 2025 guidance.',
      pairs: [
        { left: 'Your written application', right: 'You write the first draft; Claude may refine it' },
        { left: 'The night before your onsite', right: 'Use Claude freely to research and rehearse' },
        { left: 'A take-home, assessment or live round', right: 'No AI unless explicitly permitted' },
        { left: "Instructions say 'use any tools you like'", right: 'Ask the recruiter, in writing' },
        { left: 'A round that hands you Claude Code', right: 'Use it, and show your judgment' },
      ],
      explanation: "The pattern: AI is welcome where it helps you prepare or polish your own work, off by default where the company is measuring you, and on only when they say so. Vague wording isn't permission; it's a reason to ask.",
    },
    {
      kind: 'sort',
      id: 'scenarios',
      eyebrow: 'Your call',
      prompt: 'Sort each situation.',
      buckets: [
        { id: 'ok', label: 'Fine' },
        { id: 'no', label: 'Not allowed' },
        { id: 'ask', label: 'Ask first' },
      ],
      items: [
        {
          text: 'Rehearsing culture-round answers with Claude playing the interviewer',
          bucket: 'ok',
          why: 'Prep is explicitly encouraged: research, practise answers, prepare questions.',
        },
        {
          text: 'Reading the official Pillow docs for a function signature in a live round',
          bucket: 'ok',
          why: "The careers page says you may reference materials while coding. Docs aren't AI assistance.",
        },
        {
          text: 'Using Claude Code in a round whose instructions provide it',
          bucket: 'ok',
          why: "That's the 'unless we indicate otherwise' in action.",
        },
        {
          text: 'Asking Claude to draft your application answers from your résumé',
          bucket: 'no',
          why: 'The first draft has to be yours. Refining is fine; originating is not.',
        },
        {
          text: 'Leaving AI autocomplete on during a take-home that never mentions AI',
          bucket: 'no',
          why: 'Autocomplete is AI assistance, and silence means no.',
        },
        {
          text: "Having Claude invent a stronger conflict story than the ones you've lived",
          bucket: 'no',
          why: "Creating experiences you haven't had is explicitly ruled out, and it's simply a lie.",
        },
        {
          text: "A take-home that says 'use whatever tools you'd use on the job'",
          bucket: 'ask',
          why: 'It may or may not include AI. One email turns a guess into an answer.',
        },
        {
          text: 'Using Claude to translate take-home instructions into your first language',
          bucket: 'ask',
          why: "Probably fine in spirit, but it's still AI in a take-home. Asking costs nothing.",
        },
      ],
      explanation: "The test is simple: is the company measuring you right now, and have they said AI is allowed? Prep and refining your own words are fine. Generated substance in a measured round is not. Anything in between is a question for the recruiter, not for your own convenience.",
    },
    {
      kind: 'concept',
      id: 'transparent',
      title: 'Transparent means checkable',
      body: "The guidance also says *be transparent*. In practice that's three things, said without being asked twice:\n\n- **the tool**: Claude, Copilot, an agent\n- **the task**: trimmed wording, generated test fixtures\n- **what stayed yours**: the design, the argument, the story\n\n'I used AI a bit' fails all three. Good disclosure is short: one sentence in an email or a README.",
    },
    {
      kind: 'compare',
      id: 'readme-note',
      question: 'A take-home explicitly allows AI and asks you to note how you used it. Which README note is better?',
      a: 'AI tools were used during development to improve productivity and code quality.',
      b: 'I used Claude Code to scaffold the CLI and write test fixtures. The scheduling algorithm and locking design are mine; I rejected its first version, which held one global lock and serialised every worker. I read every diff and ran the suite after each change.',
      better: 'b',
      explanation: "B names the tool, the tasks, what stayed yours and how you checked, and every claim invites a follow-up question you can answer. A is true of almost any project and tells the reviewer nothing. It reads like a sentence written to avoid a question.",
    },
    {
      kind: 'concept',
      id: 'how-to-ask',
      title: 'Ask in writing, name the tools',
      body: "When instructions are vague, don't infer and don't guess. Email the recruiter before you start, and name the categories, because *AI* means different things to different people:\n\n- chat assistants\n- agentic tools like Claude Code\n- AI autocomplete in your editor\n- docs and web search\n\nA written answer protects you both. Asking reads as care, not weakness.",
    },
    {
      kind: 'mcq',
      id: 'ask-message',
      prompt: "A take-home says: *Use whatever tools you'd normally use on the job.* What do you do?",
      choices: [
        {
          text: "Email: 'Before I start: does that include AI, like Claude, Claude Code or editor autocomplete, or just docs and search? Happy either way.'",
          correct: true,
          feedback: 'Specific, early, in writing, and neutral about the answer. That gets you a clear reply.',
        },
        {
          text: "Use Claude: Anthropic uses it every day, so 'on the job' obviously includes it",
          feedback: "Plausible, maybe even right. But the default is no AI unless they say otherwise, and an inference isn't them saying so.",
        },
        {
          text: "Avoid AI entirely and don't raise it, just to be safe",
          feedback: "Honest, but if the round was built to watch you work with AI, you've skipped the thing being measured. One email settles it.",
        },
        {
          text: "Email: 'Can I use AI?'",
          feedback: "Better than guessing, but a vague question gets a vague answer. Does 'yes' cover autocomplete? An agent? Name the tools.",
        },
      ],
      explanation: 'Ask before you start, in writing, naming the tool categories. Because the default is AI-free, ambiguity resolves to asking, not to the most convenient reading.',
    },
    {
      kind: 'concept',
      id: 'accident',
      title: 'If it already happened',
      body: "Accidents happen: autocomplete on by default, an extension you forgot, a snippet you pasted without thinking. What turns an accident into deception is hiding it.\n\nSo do what you'd do after breaking something at work: say so early, say exactly what it touched, and offer a fix. A specific disclosure is a mistake you own. A vague one reads like hedging.",
      callout: {
        tone: 'insight',
        text: "One 2025 candidate report: a candidate told the interviewer they'd seen the web crawler problem before. They weren't dropped. They got an extra round with a fresh problem, and the process went on.",
      },
    },
    {
      kind: 'order',
      id: 'accident-steps',
      prompt: "Halfway through a take-home, you notice your editor's AI autocomplete has been on. Put your response in order.",
      items: [
        'Turn it off before writing another line',
        'Note exactly which files and lines it touched',
        'Tell the recruiter promptly, with those specifics',
        'Offer a remedy: redo that part, or walk through it live',
      ],
      explanation: "Stop the bleeding, then get specific, because a disclosure without scope leaves the recruiter guessing at the worst case. Then disclose and offer a remedy so they have something to decide. The decision is theirs; the honesty is yours.",
      hint: "You can't describe what it touched until you've checked.",
    },
    {
      kind: 'mcq',
      id: 'why-not',
      eyebrow: 'Ethics',
      prompt: "A friend says: *The take-home is unproctored. Nobody can tell if Claude wrote it.* Which are good reasons not to? Select all that apply.",
      multi: true,
      choices: [
        {
          text: 'The take-home claims to show your unaided work, so hidden help is a false statement, caught or not',
          correct: true,
          feedback: "Yes. The deception is in the submission itself; detection doesn't change what it is.",
        },
        {
          text: "You'd be hired or levelled for skills you didn't show, and the job will find the gap",
          correct: true,
          feedback: 'Yes. The false signal follows you into the role, and the role has no rule against noticing.',
        },
        {
          text: "You'd sit the culture round knowing your take-home contradicts what you say about honesty",
          correct: true,
          feedback: 'Yes. Write-ups of the culture round name a gap between stated values and past behaviour as a failure mode. Even unnoticed, you would know.',
        },
        {
          text: "AI-written code is easy to detect, so you'd probably be caught",
          feedback: "Some prep sites claim automated review flags it; that's unverified. And it's the weakest reason: it makes your honesty depend on the odds.",
        },
        {
          text: 'AI-written solutions usually score worse anyway',
          feedback: "Not reliably. On Anthropic's own take-home, Claude Opus 4 beat almost every human. Quality isn't the issue; honesty is.",
        },
      ],
      explanation: "*Be helpful, honest, and harmless* is one of Anthropic's seven published values (as of Oct 2026). The good reasons hold even if nobody ever finds out. The bad reasons only work as long as you might get caught.",
    },
    {
      kind: 'interview',
      id: 'recruiter-ai',
      eyebrow: 'Interview sim',
      setup: "Recruiter screen, minute 12. Your facts: you wrote your *why Anthropic* answer yourself, then asked Claude to cut it to the 300-word limit and flag anything generic. It flagged one paragraph, and you rewrote that paragraph yourself.",
      turns: [
        {
          interviewer: 'Did you use AI on your application?',
          options: [
            {
              text: 'A little, for polish. Your guidance says that is fine.',
              quality: 'okay',
              feedback: "True and allowed, but vague. 'Polish' could mean anything, and pointing at the policy sounds defensive. Say what it did.",
            },
            {
              text: 'Yes. I wrote the draft, then asked Claude to cut it to the word limit and flag anything generic. It flagged a paragraph on safety that said nothing specific, so I rewrote it myself.',
              quality: 'strong',
              feedback: 'Strong. Tool, task and what stayed yours, in three sentences, without being asked twice.',
            },
            {
              text: "Not really. It's all my own writing.",
              quality: 'weak',
              feedback: "In this scenario that's false, and one follow-up would expose it. A small, needless lie at minute 12 colours everything after it.",
            },
          ],
        },
        {
          interviewer: 'What did it get wrong?',
          options: [
            {
              text: "Nothing, really. It's very good at this.",
              quality: 'weak',
              feedback: "Uncritical, and it suggests you didn't evaluate what it gave you. Tools get things wrong; say where.",
            },
            {
              text: 'It made a few sentences stiff and formal, so I changed them back.',
              quality: 'okay',
              feedback: "Honest and fine, but thin. It shows you read the output, not that you judged it.",
            },
            {
              text: "It suggested closing on being 'deeply aligned with the mission'. That sounded like a press release, not me, so I cut it and ended on the specific team I want to join.",
              quality: 'strong',
              feedback: 'Strong. A concrete rejected suggestion, with a reason, shows the judgment in the document is yours.',
            },
          ],
        },
        {
          interviewer: 'Some people think using AI on an application at all is cheating. What do you think?',
          options: [
            {
              text: "Depends what it measures. When your policy asked for no AI, to see unassisted writing, it would have been cheating. Refining my own draft under today's rule seems fair if I say so. My line is substance: if the tool supplies the experience or opinions, that's misrepresentation.",
              quality: 'strong',
              feedback: 'Strong. You reasoned from what is being measured, used the real policy history, and drew your own line.',
            },
            {
              text: "Everyone uses it now, so the question doesn't really apply anymore.",
              quality: 'weak',
              feedback: 'Dodges the question and leans on the crowd. The round wants your judgment, not a trend report.',
            },
            {
              text: "Your policy allows it, so I don't think it's cheating.",
              quality: 'okay',
              feedback: 'Accurate, but it hands the ethics to the policy. A rule says what is permitted; the question asks what you think is right.',
            },
          ],
        },
      ],
      wrapUp: "The pattern: answer the actual question, be specific enough to check, and keep your own judgment visible. Disclosure is a one-sentence habit, not a confession. (Anthropic's application forms did ask for no AI in early 2025; the current stage-by-stage rules date from July 2025.)",
    },
    {
      kind: 'concept',
      id: 'recap',
      title: 'Three rules for any format',
      body: "1. **Default off, exceptions explicit.** If the instructions don't say AI is allowed, it isn't. If they're vague, ask in writing.\n2. **Transparent means checkable**: the tool, the task, and what stayed yours.\n3. ==An accident disclosed is a mistake; hidden, it's a deception.== The honesty here is the same honesty the culture round tests.",
    },
  ],
  cards: [
    {
      id: 'agents-rules.unless',
      skill: 'agents.policy',
      kind: 'flash',
      front: "In Anthropic's candidate AI guidance, which phrase decides whether AI is allowed in a take-home or live round? What does silence mean?",
      back: "*Unless we indicate otherwise.* The default is no AI, and an exception must be stated in the instructions. Silence means no. Vague wording means ask the recruiter.",
    },
    {
      id: 'agents-rules.autocomplete',
      skill: 'agents.policy',
      kind: 'mcq',
      prompt: "You'll do a take-home in your own editor. The instructions never mention AI, and your editor ships with AI autocomplete on. What's the right move?",
      choices: [
        { text: 'Turn the AI autocomplete off before you start', correct: true, feedback: 'Right. Silence means no AI, and autocomplete is AI.' },
        {
          text: 'Leave it on, but only accept one-line suggestions',
          feedback: "Size isn't the test. Any AI suggestion is AI assistance, and the take-home default is none.",
        },
        {
          text: 'Leave it on and mention it in the README',
          feedback: "Disclosure doesn't turn a no into a yes. Disclose accidents; don't plan them.",
        },
        {
          text: "Leave it on, since autocomplete isn't really AI",
          feedback: 'Modern autocomplete is a language model. Candidate guides for this process list it as banned unless permitted.',
        },
      ],
      explanation: 'The default for take-homes and assessments is AI-free unless the instructions say otherwise. Check your editor settings before you start, not after.',
    },
    {
      id: 'agents-rules.prep-vs-test',
      skill: 'agents.policy',
      kind: 'sort',
      prompt: 'Under the default rules, sort each use of AI.',
      buckets: [
        { id: 'ok', label: 'Fine' },
        { id: 'no', label: 'Not without permission' },
      ],
      items: [
        { text: 'Asking Claude to explain `asyncio.gather` the night before your onsite', bucket: 'ok', why: 'Interview prep is explicitly encouraged.' },
        { text: 'Asking Claude for good questions to ask your interviewers', bucket: 'ok', why: "Preparing questions is in the guidance's list of encouraged uses." },
        { text: 'Reading the official `concurrent.futures` docs during live coding', bucket: 'ok', why: 'Reference materials are allowed; docs are not AI.' },
        { text: "Pasting the take-home prompt into Claude 'just to compare approaches'", bucket: 'no', why: "Seeing its approach shapes yours. That's AI assistance on a measured task." },
        { text: 'Having Claude write a conflict story you then tell as your own', bucket: 'no', why: "Inventing experience is ruled out at every stage." },
      ],
      explanation: 'Prep and reference are fine. Anything that shapes the work being measured, or the story being told about you, is not, unless they say otherwise.',
    },
    {
      id: 'agents-rules.disclose',
      skill: 'values.ethics',
      kind: 'compare',
      question: 'After submitting a take-home, you realise AI autocomplete was on. Which email do you send?',
      a: 'Quick flag: I may have had some AI tooling running at some point. Sorry about that!',
      b: "I noticed after submitting that AI autocomplete was on in my editor. It suggested parts of `parse.py`, lines 12-30; the rest is mine. I'm happy to redo that part or walk through it live.",
      better: 'b',
      explanation: "B is specific enough to act on: the tool, what it touched, what's yours, and a remedy. A technically discloses, but it's so vague it reads as hedging and leaves the recruiter to imagine the worst case.",
    },
    {
      id: 'agents-rules.moves',
      skill: 'agents.policy',
      kind: 'match',
      prompt: 'Match each situation to the move.',
      pairs: [
        { left: 'Instructions never mention AI', right: 'Work without it' },
        { left: "Instructions say 'any tools you'd use at work'", right: 'Ask the recruiter in writing' },
        { left: 'Mid-take-home, you notice AI autocomplete was on', right: 'Disclose with specifics; offer a remedy' },
        { left: 'The round provides Claude Code', right: 'Use it and narrate your judgment' },
        { left: 'Drafting your application', right: 'Write it yourself, then refine with Claude' },
      ],
      explanation: 'Default off, exceptions explicit, ambiguity resolved by asking, accidents resolved by disclosing.',
    },
    {
      id: 'agents-rules.measurement',
      skill: 'values.ethics',
      kind: 'mcq',
      prompt: 'Beyond breaking a rule, why does secret AI use in an AI-free round damage the *measurement* itself?',
      choices: [
        {
          text: 'Your score is compared with people who worked unaided, so it describes someone who does not exist',
          correct: true,
          feedback: "Right. The interviewer calibrates against everyone else's unaided work. Your number lands on the wrong scale.",
        },
        {
          text: 'AI-written code is easy to spot, which lowers your score',
          feedback: "Detection isn't the point, and it's often not reliable. The damage happens whether or not anyone notices.",
        },
        {
          text: 'Models make more mistakes than candidates do, so the score drops',
          feedback: "On Anthropic's own take-home the model beat most candidates. Quality isn't what breaks; attribution is.",
        },
        {
          text: "It doesn't; it only breaks the rules",
          feedback: 'A rule-only view misses why the rule exists: to make scores comparable and about you.',
        },
      ],
      explanation: "An AI-free round is a calibrated instrument. Hidden help doesn't just break a rule; it produces a reading about a candidate who isn't you.",
    },
    {
      id: 'agents-rules.accident',
      skill: 'values.ethics',
      kind: 'flash',
      front: 'What separates an accidental AI use in a take-home from a deception?',
      back: "Disclosure. Reported promptly, with what it touched and an offered remedy, it's a mistake you own. Hidden, it's a false claim about exactly what the round measures.",
    },
  ],
}

export default lesson
