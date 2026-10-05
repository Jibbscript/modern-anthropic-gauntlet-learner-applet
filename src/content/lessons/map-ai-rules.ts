import type { Lesson } from '../../core/types'

const lesson: Lesson = {
  id: 'map-ai-rules',
  title: "AI: when it's allowed",
  summary: "Anthropic's written rules for using Claude at each stage, and what changes when a round hands you an agent.",
  minutes: 7,
  skills: ['map.ai-policy', 'agents.policy'],
  steps: [
    {
      kind: 'concept',
      id: 'hook',
      eyebrow: 'The irony',
      title: 'The take-home Claude kept passing',
      body: "In January 2026 an Anthropic engineer explained why the company redesigned its performance take-home twice: Claude Opus 4 beat almost every candidate within the 4-hour limit, then Claude Opus 4.5 matched the best humans at 2 hours.\n\nThat take-home allows AI. Most stages default to none. So does the lab building coding agents want you *with* one or *without*? It depends on the stage, and the rules are written down.",
      callout: {
        tone: 'source',
        text: 'Tristan Hume, [Designing AI-resistant technical evaluations](https://www.anthropic.com/engineering/AI-resistant-technical-evaluations), Anthropic engineering blog, Jan 21, 2026.',
      },
    },
    {
      kind: 'match',
      id: 'stage-rules',
      prompt: "Anthropic's candidate guidance (last updated Jul 10, 2025) sets one rule per stage. Match each stage to its rule.",
      pairs: [
        { left: 'Applying', right: '“Please create your first draft yourself, then use Claude to refine it.”' },
        { left: 'Take-home assessments', right: '“Complete these without Claude unless we indicate otherwise.”' },
        { left: 'Interview prep', right: '“Use Claude to research Anthropic, practice your answers, and prepare questions for us.”' },
        { left: 'Live interviews', right: '“This is all you–no AI assistance unless we indicate otherwise.”' },
      ],
      explanation:
        'The page is titled *How to collaborate with Claude during our hiring process*. Two stages welcome Claude (application and prep), and two default to no AI (take-homes and live interviews). The phrase that matters in the second pair: *unless we indicate otherwise*.',
    },
    {
      kind: 'concept',
      id: 'default',
      title: 'Silence is not permission',
      body: "For assessed work (take-homes, the online assessment, live rounds) the default is **no AI**, and the guidance rules out Claude writing code in assessments unless permitted. Only explicit instructions flip it, as the performance take-home's do: *For this take-home, we explicitly indicate otherwise.*\n\nLookups differ. Anthropic's careers page says you may reference materials while coding. Prep guides say docs and web search are fine; AI generation and autocomplete aren't.",
      callout: {
        tone: 'tip',
        text: "Exceptions don't travel. One take-home that allows AI says nothing about yours.",
      },
    },
    {
      kind: 'mcq',
      id: 'silent-takehome',
      prompt: 'Your take-home instructions cover the deadline, the language and how to submit. They say nothing about AI. Can you use Claude?',
      choices: [
        {
          text: 'No: take-homes default to no Claude unless they say otherwise',
          correct: true,
          feedback: 'Right. The guidance puts the burden the other way round: silence means the default, and the default is no.',
        },
        {
          text: "Yes: nothing in the instructions forbids it, so it's allowed",
          feedback: "That's how most rules work, which is why it's tempting. This one is written the other way: *without Claude unless we indicate otherwise*.",
        },
        {
          text: 'Yes, but only for writing the tests and the boilerplate',
          feedback: "Partial use is still use. The guidance doesn't carve out boilerplate, and your tests are part of what's assessed.",
        },
        {
          text: 'Yes, as long as you disclose it clearly in the README',
          feedback: "Transparency is expected, but it doesn't create permission. If you're unsure, ask the recruiter before you start.",
        },
      ],
      explanation: 'Default no, explicit yes. If the instructions are ambiguous, a one-line email to your recruiter settles it, and asking reads as careful, not weak.',
      hint: 'Reread the take-home rule. What does it say happens when nobody indicates otherwise?',
    },
    {
      kind: 'sort',
      id: 'fine-or-not',
      prompt: 'Fine under the guidance, or not? Assume no instructions say otherwise.',
      buckets: [
        { id: 'ok', label: 'Fine' },
        { id: 'no', label: 'Not fine' },
      ],
      items: [
        { text: 'Having Claude play a skeptical interviewer to drill your culture answers', bucket: 'ok', why: 'Prep is explicitly encouraged: *practice your answers*.' },
        { text: 'Drafting your cover letter yourself, then asking Claude to tighten it', bucket: 'ok', why: 'That is the application rule: first draft yours, then Claude refines.' },
        { text: 'Checking the Pillow docs for `Image.resize` during live coding', bucket: 'ok', why: 'Referencing materials is allowed. AI generation is the line.' },
        { text: 'Using Claude to explain the RSP before your recruiter call', bucket: 'ok', why: 'Researching Anthropic is named in the prep rule.' },
        { text: 'AI autocomplete left switched on in your live-coding editor', bucket: 'no', why: 'Model-generated completions are AI assistance, and prep guides say so explicitly. Turn it off.' },
        { text: "Pasting the online assessment's level-3 spec into a chatbot", bucket: 'no', why: 'The guidance rules out Claude writing code in assessments unless permitted.' },
        { text: 'Asking Claude to write your *Why Anthropic* answer from scratch', bucket: 'no', why: 'The rule is first draft yourself. They want your reasons, not generated ones.' },
        { text: 'Having Claude invent a side project to fill a résumé gap', bucket: 'no', why: "The guidance bans using Claude to create experiences you haven't had." },
      ],
      explanation:
        "The line isn't AI versus no AI. It's whether the work being judged is yours: prep and polish are fine, generating the assessed thing is not, and fabrication never is.",
    },
    {
      kind: 'concept',
      id: 'transparent',
      title: "Refine, don't replace. And say so.",
      body: "From the guidance:\n\n- *Use AI to refine your ideas, not replace them. We want to see your actual experience and how you think—not AI-generated responses.*\n- *Be transparent.*\n- Not allowed: using Claude to create experiences you haven't had.\n\nThe rules have changed before: in early 2025, application forms asked for no AI assistants at all. Check the page's date before your loop.",
      callout: {
        tone: 'source',
        text: '[How to collaborate with Claude during our hiring process](https://www.anthropic.com/candidate-ai-guidance), last updated Jul 10, 2025.',
      },
    },
    {
      kind: 'mcq',
      id: 'resume-polish',
      prompt: 'You wrote your résumé yourself, then asked Claude to tighten the bullet points. Every claim is still true. Is that within the rules?',
      choices: [
        {
          text: 'Yes: your draft, refined by Claude, with nothing invented',
          correct: true,
          feedback: "Right. That's the application rule exactly. If anyone asks how you used AI, say so plainly.",
        },
        {
          text: 'No: applications must be written without any AI help',
          feedback:
            'That *was* the rule: in early 2025 the application form asked candidates not to use AI assistants. The July 2025 guidance replaced it. Old advice lingers online, so check dates.',
        },
        {
          text: 'Yes, and Claude could also add a project that fits the role',
          feedback: "Polishing is fine; inventing isn't. Creating experiences you haven't had is explicitly not allowed, and a deep dive would expose it in minutes.",
        },
        {
          text: 'Only if a recruiter approved it before you applied',
          feedback: 'Nothing in the guidance asks for sign-off. It invites you to refine your own draft with Claude directly.',
        },
      ],
      explanation: "Your draft, your facts, Claude's polish: allowed. Claude's draft or Claude's facts: not.",
    },
    {
      kind: 'compare',
      id: 'prep-with-claude',
      question: 'Recruiter: *How did you prepare for today?*',
      a: "I had Claude generate strong answers to the 30 most common culture questions, polished them until they sounded like me, and memorized them so I wouldn't stumble today.",
      b: 'I wrote rough answers to the questions I expected, then had Claude play a skeptical interviewer and push three levels deep on each. Two of my stories fell apart, so I rewrote them.',
      better: 'b',
      explanation:
        "Both used Claude for prep, which the guidance encourages. A replaced the thinking and produced exactly the *AI-generated responses* the guidance says they don't want, and follow-ups three or four levels deep will crack memorized lines. B used Claude to stress-test the candidate's own material, and it's an answer you can say out loud without wincing.",
    },
    {
      kind: 'concept',
      id: 'with-an-agent',
      title: 'When a round hands you an agent',
      body: "Some newer rounds hand you AI on purpose. An August 2026 candidate describes an onsite round with Claude Code available: review and explain four TypeScript pull requests, then improve one. They weren't sure what was being assessed.\n\nPrep sites infer (Anthropic hasn't said) that it's judgment: treat the agent's output as untrusted until verified, add a test that fails before your fix, and check the final diff for stray edits.",
    },
    {
      kind: 'mcq',
      id: 'provided-assistant',
      prompt: "Suppose an onsite round's instructions say: *Claude Code is available. Use it as you would at work.* What is the strongest approach?",
      choices: [
        {
          text: 'Use it, and narrate how you check its work before trusting it',
          correct: true,
          feedback: 'Yes. Permission is granted, so the signal becomes how you work with it: precise briefs, verification, and a final diff you have actually read.',
        },
        {
          text: 'Avoid it, to prove you can do the work entirely unaided',
          feedback: "Tempting after all the no-AI rules, but it misreads this round. They told you to use it; declining hides the very skill they're watching.",
        },
        {
          text: 'Let it drive and submit fast, since speed is the signal',
          feedback: 'Speed without verification is how plausible-but-wrong code ships. Evidence that you checked matters more than minutes saved.',
        },
        {
          text: "Swap in your usual AI tool, since you're faster with it",
          feedback: 'The instructions name a tool. Changing the setup on your own is a judgment signal too, just not a good one. Ask first if it matters to you.',
        },
      ],
      explanation: 'When AI is explicitly allowed, the question changes from *can you code?* to *can you direct, check and own what an agent produces?*',
    },
    {
      kind: 'interview',
      id: 'recruiter-ai',
      eyebrow: 'Put it together',
      setup: 'Recruiter call. You drafted your cover letter yourself and had Claude tighten it. You use AI coding tools daily at work.',
      turns: [
        {
          interviewer: 'Next step is a take-home. Any questions?',
          options: [
            {
              text: "No, I think I'm all set. When is it due, and how do I submit it?",
              quality: 'okay',
              feedback: "Fine, and the default rule still protects you if nothing's said. You just skipped the one question worth asking.",
            },
            {
              text: "I assume AI autocomplete is fine, like at work? It's always on in my editor.",
              quality: 'weak',
              feedback: 'Assuming the opposite of the default is how candidates break the rules without meaning to. Take-homes are no AI unless stated.',
            },
            {
              text: "Is any AI assistance permitted on it? If the instructions don't say, I'll assume not.",
              quality: 'strong',
              feedback: 'Strong. It confirms the rule and shows you already know the default.',
            },
          ],
        },
        {
          interviewer: 'Out of curiosity, did you use AI on your application?',
          options: [
            {
              text: 'Yes: I wrote the cover letter myself, then had Claude tighten it. Every claim is mine.',
              quality: 'strong',
              feedback: 'Strong: honest, specific, and exactly the use the guidance invites.',
            },
            {
              text: 'A little, mostly for grammar and to make it a bit shorter, I think. Nothing major.',
              quality: 'okay',
              feedback: 'Roughly true, but a vague answer to a direct question invites doubt. Be plain about what you did.',
            },
            {
              text: "No, it was all me. I wouldn't use AI on something as personal as an application.",
              quality: 'weak',
              feedback: 'You did use it, so this is a lie about something that was allowed anyway. *Be transparent* is in the guidance for a reason.',
            },
          ],
        },
        {
          interviewer: 'How do you use AI tools in your day job?',
          options: [
            {
              text: 'For nearly everything now. I describe what I want, and if it runs, I ship what it gives me.',
              quality: 'weak',
              feedback: 'Maybe honest, but it describes no judgment. The guidance says they want candidates who *excel at collaborating with AI*, which means directing and checking it.',
            },
            {
              text: 'Daily, for scaffolding and tests. Not concurrency: it once left a counter unlocked under a *thread-safe* comment.',
              quality: 'strong',
              feedback: 'Strong: specific uses, a specific limit, and the real failure behind the limit. Expect *how did you catch it?* next, and have the answer (a stress test, a review) ready.',
            },
            {
              text: 'Mostly autocomplete and boilerplate. It saves me a fair bit of time on the boring parts.',
              quality: 'okay',
              feedback: 'Reasonable, but generic. One concrete example of where it failed you would show judgment.',
            },
          ],
        },
      ],
      wrapUp: 'One call, three rules: confirm the default before any assessment, be plain about how you used Claude, and show judgment when you talk about working with AI.',
    },
    {
      kind: 'concept',
      id: 'recap',
      title: 'Remember',
      body: "1. **Assessed work defaults to no AI** (take-homes, the assessment, live rounds) unless instructions explicitly say otherwise. Docs lookup is fine; AI autocomplete isn't.\n2. **Application and prep**: draft yourself, refine and practice with Claude, never invent experience, be transparent.\n3. **When a round provides an agent**, the signal is judgment: brief it, verify it, own the diff.\n\nThe guidance is dated Jul 10, 2025. Reread it before your loop.",
    },
  ],
  cards: [
    {
      id: 'map-ai-rules.verbatim',
      skill: 'map.ai-policy',
      kind: 'cloze',
      prompt: 'Complete the stage rules from Anthropic\'s candidate AI guidance (Jul 10, 2025).',
      lang: 'text',
      code: `Applying:
"Please create your first
draft {{0}}, then use
Claude to refine it."

Take-homes:
"Complete these {{1}}
Claude unless we indicate
otherwise."

Live interviews:
"This is {{2}}–no AI
assistance unless we
indicate otherwise."`,
      blanks: [
        { options: ['yourself', 'with Claude', 'in outline'], answer: 0 },
        { options: ['without', 'with', 'alongside'], answer: 0 },
        { options: ['all you', 'open book', 'pair work'], answer: 0 },
      ],
      explanation: 'Application: your draft, Claude refines. Take-homes and live rounds: no AI unless the instructions explicitly say otherwise.',
    },
    {
      id: 'map-ai-rules.live-lookup',
      skill: 'agents.policy',
      kind: 'mcq',
      prompt: 'Live coding round, and nothing has been said about AI. Which of these is fine?',
      choices: [
        {
          text: "Looking up the library's documentation",
          correct: true,
          feedback: "Right. Anthropic's careers page says candidates may reference materials while coding.",
        },
        { text: 'Leaving AI autocomplete on in the editor', feedback: 'Model-generated completions are AI assistance, and prep guides say so explicitly. Switch it off before the round.' },
        { text: 'Asking a chatbot what a traceback means', feedback: 'That is AI assistance in a live round. Read the traceback yourself; that is part of the signal.' },
        { text: 'Having Claude suggest a fix that you then type yourself', feedback: 'Retyping it does not make it yours. The live rule is *all you* unless they say otherwise.' },
      ],
      explanation: 'Reference materials: yes. Any AI help, including autocomplete: not unless the interviewer says so.',
    },
    {
      id: 'map-ai-rules.perf-exception',
      skill: 'map.ai-policy',
      kind: 'flash',
      front: "Anthropic's performance-engineering take-home allows AI. Why doesn't that make AI fine on your take-home?",
      back: "That permission lives in that take-home's own instructions (*For this take-home, we explicitly indicate otherwise*). Every other take-home defaults to *without Claude unless we indicate otherwise*.",
    },
    {
      id: 'map-ai-rules.sort',
      skill: 'map.ai-policy',
      kind: 'sort',
      prompt: 'Fine or not fine, with no special instructions?',
      buckets: [
        { id: 'ok', label: 'Fine' },
        { id: 'no', label: 'Not fine' },
      ],
      items: [
        { text: 'Asking Claude to help you prepare questions for your interviewers', bucket: 'ok' },
        { text: 'Using Claude to explain the Long-Term Benefit Trust before a call', bucket: 'ok' },
        { text: 'Having Claude rephrase your own rough cover letter', bucket: 'ok' },
        { text: "Asking an AI chat why your take-home's test is failing", bucket: 'no' },
        { text: 'Keeping a Claude tab open to consult during the culture interview', bucket: 'no' },
        { text: 'Having Claude rewrite a team project so it sounds like you led it', bucket: 'no' },
      ],
      explanation: 'Prep and polishing your own work: fine. AI help on assessed work, or inventing experience: not fine.',
    },
    {
      id: 'map-ai-rules.history',
      skill: 'map.ai-policy',
      kind: 'mcq',
      prompt: "What did Anthropic's application form say about AI in early 2025, and what happened next?",
      choices: [
        {
          text: 'No AI assistants; loosened in July 2025 to *draft yourself, then refine*',
          correct: true,
          feedback: 'Right. Take-homes and live rounds stayed AI-free by default; only the application rule changed.',
        },
        { text: 'To use Claude for every answer; tightened again in 2026', feedback: 'It went the other way: from no AI on applications to drafting yourself and refining with Claude.' },
        { text: 'Nothing at all; the first AI rules appeared in 2026', feedback: 'The no-AI application wording was reported in February 2025, and the current guidance dates from July 2025.' },
        { text: 'To disclose any AI use in a checkbox; dropped in July 2025', feedback: 'No checkbox was reported. The early 2025 form asked candidates not to use AI assistants at all.' },
      ],
      explanation: 'The rules have changed before and could again. Check the guidance page and its date before your loop.',
    },
    {
      id: 'map-ai-rules.agent-diff',
      skill: 'agents.policy',
      kind: 'compare',
      question: 'An onsite round where Claude Code is provided. Interviewer: *Is your fix to this PR correct?*',
      a: "Yes. Claude wrote the fix, I read through it, and all the existing tests pass, so I'm confident.",
      b: "The existing tests passed before the fix too, so they don't cover the bug. I added one that fails on the original code and passes now, and I reverted two unrelated files Claude had touched.",
      better: 'b',
      explanation: 'B shows the judgment the round is there to see: it checks whether the tests could catch the bug, adds evidence, and owns the final diff. A outsources both the work and the confidence.',
    },
    {
      id: 'map-ai-rules.three-nots',
      skill: 'agents.policy',
      kind: 'flash',
      front: "Under Anthropic's candidate guidance, what must you not use Claude for?",
      back: "Creating experiences you haven't had; writing code in assessments unless permitted; replacing your ideas rather than refining them. And whatever you do use it for, be transparent.",
    },
  ],
}

export default lesson
