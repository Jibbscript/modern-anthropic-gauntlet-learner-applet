import type { Lesson } from '../../core/types'

const lesson: Lesson = {
  id: 'agents-rules',
  title: 'The rules of engagement',
  summary: 'Why AI-free rounds exist, how to handle the grey zone, what transparent use sounds like, and what to do if you slip.',
  minutes: 8,
  skills: ['agents.policy', 'values.ethics'],
  steps: [
    {
      kind: 'concept',
      id: 'hook',
      eyebrow: 'A strange confession',
      title: "I've seen this problem before",
      body: "In one 2025 candidate report, a candidate told the interviewer they'd already seen the web crawler problem. They didn't have to say it.\n\nThey weren't dropped. They got an extra round with a fresh problem, and the process went on. Why would anyone volunteer that, and why did it work out? Both answers are about what an interview round actually measures.",
      callout: {
        tone: 'source',
        text: 'Candidate report on [PracHub](https://prachub.com/interview-experiences/anthropic-seniorplus-software-engineer-interview-experience-an-extra-lru-cache-round-after-admitting-id-seen-the-first-one-before), 2025. One report, not a policy.',
      },
    },
    {
      kind: 'mcq',
      id: 'why-it-worked',
      prompt: "Why did admitting *I've seen this problem before* lead to a fresh round rather than a rejection?",
      choices: [
        {
          text: 'The round measures how you reason on a new problem, and saying so protected that',
          correct: true,
          feedback: 'Right. A recalled answer says nothing about your reasoning. The honesty kept the measurement valid.',
        },
        {
          text: 'Interviewers tend to reward any confession, whatever it happens to be about',
          feedback: "Honesty helps, but it isn't a magic word. It helped here because it repaired the thing the round depends on.",
        },
        {
          text: 'Having seen a problem breaks the rules, so they were forced to restart',
          feedback: "Seeing a leaked problem isn't a violation; the question bank is widely shared online. Hiding it would have quietly spoiled the signal.",
        },
        {
          text: 'It showed thorough preparation, which counts in a candidate\'s favour',
          feedback: "Prep is fine, but a remembered solution can't show how you reason. That's why they needed a new problem.",
        },
      ],
      explanation: "A remembered solution and a hidden AI one break a round the same way: the score stops describing your reasoning. That's why most rounds are AI-free by default, even at a company that uses Claude every day. Press coverage in May 2026 put it plainly: the ban is there to see how candidates actually think.",
      hint: 'What can an interviewer learn from watching you recall an answer?',
    },
    {
      kind: 'concept',
      id: 'grey-zone',
      title: 'Two signals, and a grey zone',
      body: "AI-free rounds measure you. AI-assisted rounds measure you directing a model. Both are real; the rules stop them blurring.\n\nReal setups blur anyway: editors with AI on by default, grammar checkers built on language models, a translator for instructions in your second language. Two questions sort almost everything. Is this work being assessed? Have they explicitly allowed AI? If you can't answer both, ask.",
    },
    {
      kind: 'sort',
      id: 'scenarios',
      eyebrow: 'Your call',
      prompt: 'Sort each situation. Assume the instructions say nothing else.',
      buckets: [
        { id: 'ok', label: 'Fine' },
        { id: 'no', label: 'Not allowed' },
        { id: 'ask', label: 'Ask first' },
      ],
      items: [
        {
          text: 'Asking Claude to quiz you on `asyncio` the week before your onsite',
          bucket: 'ok',
          why: "Prep isn't assessed, and the guidance encourages it.",
        },
        {
          text: "Asking Claude to explain a bug in your take-home *after* you've submitted it",
          bucket: 'ok',
          why: "The assessed work is done. Learning from it now is just prep for the next round.",
        },
        {
          text: "Pasting the take-home prompt into Claude 'just to compare approaches' before submitting",
          bucket: 'no',
          why: "Seeing its approach shapes yours. That's AI help on assessed work.",
        },
        {
          text: 'Having Claude tidy your take-home code before submitting, with no behaviour change',
          bucket: 'no',
          why: 'Structure and naming are part of what is judged. A refactor is still assistance.',
        },
        {
          text: "Leaving your editor's built-in AI autocomplete on during a take-home",
          bucket: 'no',
          why: "On by default doesn't mean permitted. Turn it off before you start.",
        },
        {
          text: "A take-home that says 'use whatever tools you'd use on the job'",
          bucket: 'ask',
          why: 'That may or may not include AI. One email turns a guess into an answer.',
        },
        {
          text: 'Using Claude to translate the take-home instructions into your first language',
          bucket: 'ask',
          why: "Arguably not help with the work itself, but it is AI on an assessment. Asking costs nothing.",
        },
        {
          text: "Running an AI grammar checker over the README you'll submit",
          bucket: 'ask',
          why: 'The README is part of the submission, and the checker is a language model. Probably fine; still worth one line to the recruiter.',
        },
      ],
      explanation: "The two questions do the work. Not assessed: fine. Assessed and not explicitly allowed: no. Assessed and genuinely unclear: ask, and resolve the doubt with the recruiter rather than in your own favour.",
    },
    {
      kind: 'concept',
      id: 'transparent',
      title: 'Transparent means checkable',
      body: "*Be transparent* sounds simple. In practice it's three things, said without being asked twice:\n\n- **the tool**: Claude, Copilot, an agent\n- **the task**: trimmed wording, generated test fixtures\n- **what stayed yours**: the design, the argument, the story\n\n'I used AI a bit' fails all three. Good disclosure is short: one sentence in an email or a README.",
      callout: {
        tone: 'source',
        text: '*Be transparent* comes from Anthropic\'s [candidate AI guidance](https://www.anthropic.com/candidate-ai-guidance), last updated Jul 10, 2025. Reread it before your loop.',
      },
    },
    {
      kind: 'compare',
      id: 'readme-note',
      question: 'This take-home allows AI. In your README, tell us how you used it.',
      a: 'AI tools were used during development to improve productivity and code quality.',
      b: 'I used Claude Code to scaffold the CLI and write test fixtures. The scheduling algorithm and locking design are mine; I rejected its first version, which held one global lock and serialised every worker. I read every diff and ran the suite after each change.',
      better: 'b',
      explanation: "B names the tool, the tasks, what stayed yours and how you checked, and every claim invites a follow-up you can answer. A is true of almost any project and tells the reviewer nothing. It reads like a sentence written to avoid a question.",
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
          text: "Email first: 'Does that include AI tools (chat, agents, editor autocomplete) or just docs and search?'",
          correct: true,
          feedback: 'Specific, early, in writing, and neutral about the answer. That gets you a clear reply.',
        },
        {
          text: "Use Claude: Anthropic uses it every day, so 'on the job' clearly includes it",
          feedback: "Plausible, maybe even right. But the default is no AI unless they say otherwise, and an inference isn't them saying so.",
        },
        {
          text: "Avoid AI entirely and don't mention it, just to be on the safe side",
          feedback: "Honest, but if the round was built to watch you work with AI, you've skipped the thing being measured. One email settles it.",
        },
        {
          text: "Email first: 'Can I use AI on this take-home, or should I avoid it?'",
          feedback: "Better than guessing, but a vague question gets a vague answer. Does 'yes' cover autocomplete? An agent? Name the tools.",
        },
      ],
      explanation: 'Ask before you start, in writing, naming the tool categories. Because the default is AI-free, ambiguity resolves to asking, not to the most convenient reading.',
    },
    {
      kind: 'spotbug',
      id: 'email-bug',
      prompt: 'Your email to the recruiter is mostly good. Which line undoes it?',
      lang: 'text',
      code: `Hi Sam,
Quick question before I start
the take-home. It says "use
whatever tools you'd normally
use." Does that include AI:
chat, Claude Code, autocomplete?
I'm starting tonight.
If no reply, I'll assume AI's fine.
Thanks, Priya`,
      bugLines: [8],
      explanation: "Line 8 flips the default. No reply from the recruiter is no more a permission than silence in the instructions. If you have to start before they answer, start without AI; you can always add it if they say yes.",
      fix: {
        lang: 'text',
        code: `If no reply, I'll work without it.`,
      },
      hint: 'Which line decides what happens if nobody replies?',
    },
    {
      kind: 'concept',
      id: 'accident',
      title: 'If it already happened',
      body: "Accidents happen: autocomplete on by default, an extension you forgot, a snippet you pasted without thinking. What turns an accident into deception is hiding it.\n\nSo do what you'd do after breaking something at work: say so early, say exactly what it touched, and offer a fix. A specific disclosure is a mistake you own. A vague one reads like hedging.",
      callout: {
        tone: 'insight',
        text: 'Hiding a small thing makes it a big one. The question stops being *what did the autocomplete touch?* and becomes *what else?*',
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
      explanation: "Stop the cause, then get specific, because a disclosure without scope leaves the recruiter imagining the worst case. Then disclose, and offer a remedy so they have something to decide. The decision is theirs; the honesty is yours.",
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
          text: 'It claims to show your unaided work, so hidden help is false, caught or not',
          correct: true,
          feedback: "Yes. The deception is in the submission itself; detection doesn't change what it is.",
        },
        {
          text: "You'd be hired or levelled for skills you didn't show, and jobs find gaps",
          correct: true,
          feedback: 'Yes. The false signal follows you into the role, and the role has no rule against noticing.',
        },
        {
          text: "Your take-home would contradict what you'd say about honesty in the culture round",
          correct: true,
          feedback: 'Yes. Write-ups of the culture round name a gap between stated values and past behaviour as a failure mode. Even unnoticed, you would know.',
        },
        {
          text: "AI-written code is easy for reviewers to detect, so you'd probably get caught",
          feedback: "Some prep sites claim automated review flags it; that's unverified. And it's the weakest reason: it makes your honesty depend on the odds.",
        },
        {
          text: "AI-written solutions tend to score worse than a strong candidate's own work",
          feedback: "Not reliably. Anthropic wrote in Jan 2026 that Claude Opus 4 beat almost every human on its own performance take-home. Quality isn't the issue; honesty is.",
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
          interviewer: 'Your *why Anthropic* answer was unusually sharp. Did you have help with it?',
          options: [
            {
              text: 'Thanks! A bit of AI polish, which your guidance allows, but the ideas are all mine.',
              quality: 'okay',
              feedback: "True and allowed, but vague, and leaning on the policy sounds defensive. A compliment is a good moment to be specific.",
            },
            {
              text: 'Thanks. The ideas and first draft are mine. I asked Claude to cut it to the word limit and flag anything generic; it caught a vague paragraph on safety, which I rewrote myself.',
              quality: 'strong',
              feedback: 'Strong. Tool, task and what stayed yours, without being asked twice, and it lets the compliment land on the part that was yours.',
            },
            {
              text: "Thanks, no. It's all my own writing; I wanted it to sound like me, so I kept the tools out of it.",
              quality: 'weak',
              feedback: "False in this scenario. A compliment is exactly when a small lie feels free, and one follow-up would expose it.",
            },
          ],
        },
        {
          interviewer: 'What did it get wrong?',
          options: [
            {
              text: "Nothing, really. It's very good at this kind of editing, so I accepted most of what it suggested.",
              quality: 'weak',
              feedback: "Uncritical, and it suggests you didn't evaluate what it gave you. Tools get things wrong; say where.",
            },
            {
              text: "It made a few sentences stiff and formal, so I changed those back to how I'd actually say them.",
              quality: 'okay',
              feedback: "Honest and fine, but thin. It shows you read the output, not that you judged it.",
            },
            {
              text: "It suggested closing on being 'deeply aligned with the mission'. That read like a press release, not me, so I cut it and ended on the team I want to join.",
              quality: 'strong',
              feedback: 'Strong. A concrete rejected suggestion, with a reason, shows the judgment in the document is yours.',
            },
          ],
        },
        {
          interviewer: 'Some people think using AI on an application at all is cheating. What do you think?',
          options: [
            {
              text: "Depends what it measures. When your forms asked for no AI, to see unassisted writing, using it would have been cheating. Refining my own draft now seems fair if I disclose it. My line is substance: AI-supplied experience or opinions are misrepresentation.",
              quality: 'strong',
              feedback: 'Strong. You reasoned from what is being measured, used the real policy history, and drew your own line.',
            },
            {
              text: "Everyone uses it now, so I don't think the question really applies anymore. It's like asking whether spellcheck is cheating.",
              quality: 'weak',
              feedback: 'Dodges the question and leans on the crowd. The round wants your judgment, not a trend report.',
            },
            {
              text: "Your policy explicitly allows refining a draft, so no, I don't think it's cheating. If the rule allows it, it's fair.",
              quality: 'okay',
              feedback: 'Accurate, but it hands the ethics to the policy. A rule says what is permitted; the question asks what you think is right.',
            },
          ],
        },
      ],
      wrapUp: "The pattern: answer the actual question, be specific enough to check, and keep your own judgment visible. Disclosure is a one-sentence habit, not a confession. (Anthropic's application forms did ask for no AI in early 2025; the current stage-by-stage guidance dates from July 2025.)",
    },
    {
      kind: 'concept',
      id: 'recap',
      title: 'Three rules for any format',
      body: "1. **Two questions**: is this work assessed, and have they explicitly allowed AI? If you can't answer both, ask in writing and name the tools.\n2. **Transparent means checkable**: the tool, the task, and what stayed yours.\n3. ==An accident disclosed is a mistake; hidden, it's a deception.== The honesty here is the same honesty the culture round tests.",
    },
  ],
  cards: [
    {
      id: 'agents-rules.two-questions',
      skill: 'agents.policy',
      kind: 'flash',
      front: 'Which two questions sort almost any "can I use AI here?" situation in a hiring process?',
      back: "Is this work being assessed? Have they explicitly allowed AI? Assessed and not allowed: no. Not assessed: fine. Can't answer both: ask the recruiter in writing.",
    },
    {
      id: 'agents-rules.best-question',
      skill: 'agents.policy',
      kind: 'mcq',
      prompt: "Instructions say *use any tools you like*. Which question to the recruiter gets the most useful answer?",
      choices: [
        {
          text: "'Does that include chat assistants, agents like Claude Code, or editor autocomplete, or only docs and search?'",
          correct: true,
          feedback: 'Right. Naming the categories makes any answer unambiguous.',
        },
        {
          text: "'Can I use AI on it, or is that not allowed for this one?'",
          feedback: "A 'yes' still leaves you guessing: autocomplete? an agent? Name the tools.",
        },
        {
          text: "'Is AI okay to use on it, within reason, like at work?'",
          feedback: "'Within reason' invites a vague answer that you'll then interpret in your own favour.",
        },
        {
          text: "'Which AI tools do most other candidates end up using for it?'",
          feedback: "What others do isn't the rule, and it signals you're looking for cover rather than clarity.",
        },
      ],
      explanation: 'Vague questions get vague answers. Name the categories so a one-word reply settles it.',
    },
    {
      id: 'agents-rules.before-after',
      skill: 'agents.policy',
      kind: 'sort',
      prompt: 'Under the default rules, sort each use of Claude.',
      buckets: [
        { id: 'ok', label: 'Fine' },
        { id: 'no', label: 'Not without permission' },
      ],
      items: [
        { text: 'Asking why a test failed in your take-home, the day after you submitted it', bucket: 'ok', why: 'No longer assessed. That is learning.' },
        { text: 'Asking why a test is failing in your take-home, an hour before the deadline', bucket: 'no', why: 'Same question, but now it is help on assessed work.' },
        { text: 'Having Claude push hard on your project deep-dive numbers in a mock session', bucket: 'ok', why: 'Practising your answers is encouraged prep.' },
        { text: 'Having Claude rename variables in your take-home for readability', bucket: 'no', why: 'Readability is part of what is judged. Still assistance.' },
        { text: "Having Claude critique your draft answer to *where do you disagree with Anthropic?*", bucket: 'ok', why: 'Your own view, stress-tested. That is prep, not substitution.' },
      ],
      explanation: 'The same request can be fine or not depending on one thing: whether the work is being assessed when you make it.',
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
      skill: 'values.ethics',
      kind: 'match',
      prompt: 'Match each situation to the honest move.',
      pairs: [
        { left: "You've seen the coding problem before", right: 'Tell the interviewer up front' },
        { left: "Instructions say 'use any tools you like'", right: 'Ask which AI tools that covers' },
        { left: 'Mid-take-home, you notice AI autocomplete was on', right: 'Turn it off, scope it, disclose it' },
        { left: 'A take-home allows AI and asks how you used it', right: "Name the tool, the task, and what's yours" },
        { left: "You've submitted and want to learn from a bug", right: "Ask Claude freely: it's no longer assessed" },
      ],
      explanation: 'Each move protects the same thing: an accurate picture of what you can do on your own.',
    },
    {
      id: 'agents-rules.measurement',
      skill: 'values.ethics',
      kind: 'mcq',
      prompt: 'Beyond breaking a rule, why does secret AI use in an AI-free round damage the *measurement* itself?',
      choices: [
        {
          text: 'Your score is compared with unaided work, so it describes someone who does not exist',
          correct: true,
          feedback: "Right. The interviewer calibrates against everyone else's unaided work. Your number lands on the wrong scale.",
        },
        {
          text: 'AI-written code is easy to spot, and spotting it lowers your score',
          feedback: "Detection isn't the point, and it's often not reliable. The damage happens whether or not anyone notices.",
        },
        {
          text: 'Models make more mistakes than candidates do, so the score drops',
          feedback: "Per Anthropic's Jan 2026 write-up, Claude beat most humans on its performance take-home. Quality isn't what breaks; attribution is.",
        },
        {
          text: "It doesn't damage anything; it only breaks the rules",
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
