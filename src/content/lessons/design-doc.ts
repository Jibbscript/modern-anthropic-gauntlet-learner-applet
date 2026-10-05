import type { Lesson } from '../../core/types'

const lesson: Lesson = {
  id: 'design-doc',
  title: 'Designing in a shared doc',
  summary: 'Structure a design doc as you type it, write decisions instead of surveys, and keep the interviewer with you.',
  minutes: 8,
  skills: ['design.doc', 'design.tradeoffs'],
  steps: [
    {
      kind: 'concept',
      id: 'hook',
      eyebrow: 'The format',
      title: 'No whiteboard. Just a doc.',
      body: "Candidates describe Anthropic's system design round as usually 50-55 minutes in a **shared Google Doc**, not a diagramming tool. Sometimes you design from scratch. Sometimes you critique a deliberately flawed design doc.\n\nEither way, the interviewer can read every line as you type it. The page is the evidence. A clear page shows clear thinking. A pile of boxes and buzzwords gives them nothing to score.",
      callout: {
        tone: 'source',
        text: 'Format as reported by candidates and summarised by [interviewing.io](https://interviewing.io/anthropic-interview-questions) and [Hello Interview](https://www.hellointerview.com/guides/anthropic/swe) in 2026. Not official, and it varies by role.',
      },
    },
    {
      kind: 'mcq',
      id: 'first-lines',
      eyebrow: 'Warm-up',
      prompt: 'The interviewer pastes *Design a collaborative prompt playground* into an empty doc and says "Go ahead." What do you type first?',
      choices: [
        {
          text: 'A two-line problem statement, then the questions whose answers would change the design',
          correct: true,
          feedback:
            'Yes. It puts your understanding on the page where it can be corrected in seconds, before you spend 20 minutes designing the wrong system.',
        },
        {
          text: 'A box-and-arrow sketch of the architecture, so the interviewer sees the big picture early',
          feedback:
            "Tempting, because it looks like progress. But boxes drawn before scope are guesses, and you'll redraw them once the interviewer answers the questions you skipped.",
        },
        {
          text: 'The full database schema, since product design rounds reward concrete low-level detail',
          feedback:
            'Detail does matter, later. A schema written before you know what the system must do is detail about the wrong thing.',
        },
        {
          text: 'Nothing yet: talk the whole design through out loud first, then write it all up at the end',
          feedback:
            'The doc is what gets read and remembered. Talking for 40 minutes and writing in the last 10 leaves a thin page and no time to fix it.',
        },
      ],
      explanation:
        'Scope first, in writing. A two-line restatement plus the questions that fork the design costs a minute and saves the round from a wrong turn.',
      hint: 'Which option lets the interviewer correct you before you have invested anything?',
    },
    {
      kind: 'concept',
      id: 'funnel',
      title: 'A design doc is a funnel',
      body: "Each section narrows the next. Scope decides which requirements matter. Requirements and their numbers decide the entities and the API. Those decide the architecture. Only then do you know which parts are hard enough to deserve a deep dive. Risks and open questions close it out.\n\nSo type the headings first. It takes 30 seconds, and the interviewer can see your plan before you start filling it in.",
    },
    {
      kind: 'order',
      id: 'order-sections',
      prompt: 'Order the sections of a design doc, top to bottom.',
      items: [
        'Problem, goals and non-goals',
        'Requirements, with numbers',
        'Core entities and API',
        'Architecture and request flow',
        'Deep dives, each with alternatives',
        'Risks and open questions',
      ],
      explanation:
        'Each section depends on the one above it. A bonus: if time runs out during the deep dives, the top of the doc is still a coherent, complete design. A doc written in a random order has nothing usable until the end.',
      hint: 'You cannot pick a deep dive until you know the architecture, and you cannot draw the architecture until you know what it must do.',
    },
    {
      kind: 'sort',
      id: 'sort-sections',
      prompt: 'Lines from your prompt playground doc. Is each one a non-goal, a must-have requirement, or an open question?',
      buckets: [
        { id: 'non', label: 'Non-goals' },
        { id: 'req', label: 'Must-haves' },
        { id: 'open', label: 'Open questions' },
      ],
      items: [
        { text: 'Live keystroke co-editing (v1 saves versions instead)', bucket: 'non', why: 'A deliberate cut. Writing it down stops the interviewer wondering whether you forgot it.' },
        { text: 'Billing and invoicing', bucket: 'non', why: 'Real, but a different system. Naming it keeps the scope honest.' },
        { text: 'Run a saved version and stream the output', bucket: 'req', why: 'A core verb the system must support.' },
        { text: 'Save returns in under 200 ms at p95', bucket: 'req', why: 'A non-functional requirement, with a number attached so it can be checked.' },
        { text: 'Share a prompt read-only by link', bucket: 'req', why: 'A functional requirement that later drives the permission model.' },
        { text: 'Do enterprise teams need SSO at launch?', bucket: 'open', why: 'Someone else decides this. Flag it, assume an answer, and move on.' },
        { text: 'How long do we keep run outputs?', bucket: 'open', why: 'Retention is a policy and cost question you cannot settle alone.' },
      ],
      explanation:
        'Non-goals are decisions to *not* build something. Requirements are what you will be judged against. Open questions are decisions that belong to someone else, so you record your assumption and keep going.',
    },
    {
      kind: 'concept',
      id: 'decisions',
      title: 'Decisions, not descriptions',
      body: "Weak docs survey options: *we could store diffs or full copies; each has pros and cons.* Strong docs decide. One shape fits any section:\n\n1. **Decision**: what you chose.\n2. **Why**: tied to a requirement or a number.\n3. **Cost**: what you gave up.\n4. **Revisit if**: the signal that would change your mind.\n\nAn interviewer can push on a decision. A survey gives them nothing to push on.",
    },
    {
      kind: 'compare',
      id: 'versions-paragraph',
      question: 'Your doc needs a paragraph on how prompt versions are stored. Which one belongs in it?',
      a: 'Versioning is an important part of the system and needs careful thought. There are several approaches, such as storing diffs or storing full copies, and each has pros and cons. We will choose the best approach based on the requirements and make sure it scales.',
      b: '**Decision:** every save is a full, immutable copy. Bodies go to S3 keyed by content hash; metadata goes to Postgres. **Why:** about 2 GB a day is cheap, and restore or compare is one read. **Cost:** near-duplicate large prompts are stored twice. **Revisit if** large prompts dominate storage, then add deltas.',
      better: 'b',
      explanation:
        'B makes a call, ties it to a number, names what it costs and says when it would change. A only says the topic matters. Every sentence in A could be pasted into any design doc ever written, which is how you know it says nothing.',
    },
    {
      kind: 'spotbug',
      id: 'hidden-decisions',
      eyebrow: 'Review a flawed doc',
      prompt: 'Some candidates get a flawed design doc to critique. Two lines here sound like decisions but dodge one. Tap both.',
      code: 'Storage and runs\n- Metadata lives in Postgres.\n- Bodies go to S3, keyed by hash.\n- Each save adds a version row.\n- Conflicts are handled gracefully.\n- Run output streams over SSE.\n- Runs are cached where it helps.\n- Over-quota runs get a 429.',
      lang: 'text',
      bugLines: [5, 7],
      explanation:
        "*Handled gracefully* doesn't say what happens when two saves collide: last write wins, a merge, a lock? *Where it helps* doesn't say what the cache key is, or whether a rerun should sample again. Each phrase hides a design. The other lines are checkable: a reviewer could disagree with them, which is the point.",
      fix: {
        code: '- Saves send base_version; a\n  stale save gets 409 + merge view.\n- No run cache in v1: a rerun\n  means "sample again".',
        lang: 'text',
        caption: 'Rewritten as decisions someone could argue with.',
      },
      hint: 'For each line, ask: could a teammate implement this without asking me what I meant?',
    },
    {
      kind: 'concept',
      id: 'concrete',
      title: 'Specifics beat boxes',
      body: 'Product design rounds reward specifics: tables with fields, endpoints with status codes, a numbered flow per request. One July 2026 candidate, rejected after a prompt playground round, blamed missing low-level detail.\n\nA tiny ASCII sketch is fine. The numbered flow under it does the real work, because the interviewer can point at step 3 and ask "what if that fails?"',
      code: {
        code: "client -https-> api -> postgres\n   ^            +--> s3 (bodies)\n   |            +--> queue -> model\n   |            +--> pub/sub\n   |                   |\n   +---ws--- collab <--+\n\nSave a version:\n1. POST /prompts/{id}/versions\n2. api puts body in s3 by hash\n3. api inserts the version row\n   and compare-and-sets head\n4. api publishes 'saved'; collab\n   pushes it to other open tabs",
        lang: 'text',
      },
      callout: {
        tone: 'source',
        text: "The candidate's own self-assessment, in a [PracHub report](https://prachub.com/interview-experiences/anthropic-software-engineer-interview-experience-rejected-after-a-weak-system-design-round) (July 2026). One report, not official feedback.",
      },
    },
    {
      kind: 'cloze',
      id: 'data-model',
      prompt: 'Finish the data model section. Constraints: a prompt points at its current version, versions never change, and every run must be reproducible.',
      code: 'prompts\n  id, team_id, title, {{0}}\n\nversions   -- immutable\n  prompt_id, n, body_ref,\n  model, params, author_id\n\nruns\n  id, {{1}}, status,\n  output_ref, tokens_in/out',
      lang: 'text',
      blanks: [
        { options: ['head_version', 'body', 'last_run_id'], answer: 0 },
        { options: ['prompt_id, version_n', 'prompt_id', 'team_id'], answer: 0 },
      ],
      explanation:
        "`head_version` makes the prompt a pointer into immutable history, so restore is just moving the pointer. A `body` column would duplicate the head version and drift from it. Runs need `prompt_id, version_n`: with `prompt_id` alone you can't tell which text produced an output once the prompt has been edited.",
      hint: 'Which fields let you answer: "exactly what text and settings produced this run?"',
    },
    {
      kind: 'concept',
      id: 'narrate',
      title: 'The doc is silent. You are not.',
      body: "Type for four minutes in silence and the interviewer watches text appear with no idea why. Narrate the decision, not the keystrokes: *full copies, not diffs, because restore becomes one read.*\n\nEvery ten minutes or so, check in: *versioning or runs next? Which is more useful to you?* Prep guides note that prompts lean toward the interviewer team's real problems, so they often know which part matters.",
    },
    {
      kind: 'interview',
      id: 'doc-round',
      eyebrow: 'Put it together',
      setup: 'Shared Google Doc, about 50 minutes. The prompt: design a playground where teams write, version and run prompts.',
      turns: [
        {
          interviewer: 'The doc is yours. Go ahead.',
          options: [
            {
              text: 'Ask your scoping questions out loud, wait for the answers, then start typing the design from the top.',
              quality: 'okay',
              feedback: 'Fine, but the agreed scope lives only in the call. Ten minutes later neither of you can see what you agreed.',
            },
            {
              text: 'Start typing the architecture right away: load balancer, stateless API servers, Kafka, Postgres, Redis.',
              quality: 'weak',
              feedback: 'Components before scope. Nothing on the page ties them to a requirement, so none of it can be judged right or wrong.',
            },
            {
              text: 'Type a two-line problem statement and three scoping questions, then say: "Scope stays at the top. Stop me if any of it is off."',
              quality: 'strong',
              feedback: 'Strong. Scope is written down, the interviewer is invited to correct it, and the doc now has an anchor for everything below.',
            },
          ],
        },
        {
          interviewer: '*Fifteen minutes in, after four minutes of silent typing.* What are you working on?',
          options: [
            {
              text: '"The data model. I\'m storing full copies, not diffs, because restore becomes one read. Should I go deeper here, or move on to runs?"',
              quality: 'strong',
              feedback: 'Strong. One-line decision with its reason, then a check-in that lets the interviewer steer you toward what they care about.',
            },
            {
              text: '"Just a second, let me finish this section properly and then I\'ll walk you through all of it."',
              quality: 'weak',
              feedback: 'More silence. The interviewer is scoring your reasoning, and you just postponed showing any.',
            },
            {
              text: '"Sorry, I went quiet. I\'m writing the data model, and I\'ll talk through it as I go from here."',
              quality: 'okay',
              feedback: "A fair recovery, but it names the section without the decision. Say what you chose and why, in one breath.",
            },
          ],
        },
        {
          interviewer: 'We have five minutes left.',
          options: [
            {
              text: '"Sorry I didn\'t get to everything. With more time I\'d have covered caching and scaling too."',
              quality: 'weak',
              feedback: 'Apologising spends the time on nothing. Every candidate runs out of time; what matters is what you do with the last five minutes.',
            },
            {
              text: '"Let me quickly finish the caching deep dive, so that section isn\'t left half done."',
              quality: 'okay',
              feedback: 'Reasonable, but a half-finished deep dive is worth less than a summary that makes the whole doc legible.',
            },
            {
              text: '"I\'ll stop adding and write a short summary at the top: the three key decisions, the biggest risk, and what I\'d do next."',
              quality: 'strong',
              feedback: 'Strong. You leave a doc a stranger could read in one minute, and you show you know what matters most.',
            },
          ],
        },
      ],
      wrapUp: 'Scope on the page first, decisions narrated as you type them, and the last five minutes spent making the doc readable rather than longer.',
    },
    {
      kind: 'concept',
      id: 'recap',
      title: 'Remember',
      body: '1. **Write the funnel**: problem and non-goals, requirements with numbers, entities and API, architecture, deep dives, risks and open questions. Headings first.\n2. **Decide, then justify**: decision, why, cost, revisit-if. Phrases like *handled gracefully* and *where it helps* hide decisions.\n3. **Keep the reader with you**: concrete fields and flows, narrate decisions, check in every ten minutes, and spend the last five on a summary.',
    },
  ],
  cards: [
    {
      id: 'design-doc.format',
      skill: 'design.doc',
      kind: 'flash',
      front: "How do 2026 candidates describe the medium and the two styles of Anthropic's system design round?",
      back: 'Usually 50-55 minutes in a shared Google Doc, not a whiteboard. Either design from scratch, or critique a deliberately flawed design doc. Reported by candidates, not official.',
    },
    {
      id: 'design-doc.decision-shape',
      skill: 'design.tradeoffs',
      kind: 'order',
      prompt: 'Order the parts of a strong decision paragraph in a design doc.',
      items: ['What you chose', 'Why, tied to a requirement or number', 'What it costs you', 'The signal that would make you revisit it'],
      explanation: 'Decision first so a skimming reader gets it, then the reason, then the price, then the exit. Without the last two it reads as advocacy rather than judgment.',
    },
    {
      id: 'design-doc.which-decides',
      skill: 'design.doc',
      kind: 'mcq',
      prompt: 'Which sentence in a design doc actually states a decision?',
      choices: [
        {
          text: 'Runs are limited per team with a token bucket: 60 a minute, then 429 with Retry-After.',
          correct: true,
          feedback: 'Yes. Mechanism, number and behaviour at the limit. A reviewer can disagree with every part of it.',
        },
        { text: 'We will add rate limiting as needed once real usage patterns are clearer after launch.', feedback: '*As needed* defers the decision and says nothing about who is limited, how, or what they see.' },
        { text: 'Rate limiting is handled at the appropriate layer of the stack, per team and per user.', feedback: '*Appropriate layer* is a placeholder for a decision nobody made. *Per team and per user* sounds specific but names no mechanism or number.' },
        { text: 'The system will be robustly protected against abusive traffic and runaway scripts.', feedback: 'A goal, not a design. *Robustly* is a feeling.' },
      ],
      explanation: 'A decision names a mechanism and a number and could be argued with. Phrases like *as needed*, *appropriate* and *robust* hide the choice.',
    },
    {
      id: 'design-doc.section-questions',
      skill: 'design.doc',
      kind: 'match',
      prompt: 'Match each design doc section to the question it answers.',
      pairs: [
        { left: 'Non-goals', right: 'What are we deliberately not building?' },
        { left: 'Requirements', right: 'What must it do, and how well?' },
        { left: 'Deep dive', right: 'How does the hardest part actually work?' },
        { left: 'Risks', right: 'What could sink this plan?' },
        { left: 'Open questions', right: 'What does someone else need to decide?' },
      ],
      explanation: 'Each section answers one question for the reader. If you cannot say which question a paragraph answers, it probably belongs nowhere.',
    },
    {
      id: 'design-doc.runs-paragraph',
      skill: 'design.tradeoffs',
      kind: 'compare',
      question: 'Which paragraph should go in the "Running prompts" section?',
      a: '**Decision:** runs go through a per-team queue to a worker pool that streams tokens back over SSE. **Why:** model calls take seconds and the provider rate-limits us, so we need to absorb bursts. **Cost:** one more moving part than calling the model inline. **Revisit if** p95 queue wait passes one second.',
      b: 'Running prompts is the core feature, so it needs to be fast, reliable and scalable. We will use modern best practices such as queues and streaming where appropriate, and we can optimise further once we see real traffic.',
      better: 'a',
      explanation: 'A names the mechanism, the reason, the price and the trigger to revisit. B lists adjectives and defers every choice, so there is nothing for an interviewer to probe.',
    },
    {
      id: 'design-doc.last-five',
      skill: 'design.doc',
      kind: 'flash',
      front: 'Five minutes left in a doc-based design round, with a deep dive half done. What do you write?',
      back: 'Stop adding. Write a short summary at the top: the key decisions, the biggest risk, and what you would do next. It makes the whole doc legible in one minute.',
    },
    {
      id: 'design-doc.sort-lines',
      skill: 'design.doc',
      kind: 'sort',
      prompt: 'Design doc lines: non-goal, must-have requirement, or open question?',
      buckets: [
        { id: 'non', label: 'Non-goals' },
        { id: 'req', label: 'Must-haves' },
        { id: 'open', label: 'Open questions' },
      ],
      items: [
        { text: 'A mobile app', bucket: 'non' },
        { text: 'Compare two versions side by side', bucket: 'req' },
        { text: 'Editing works while the model API is down', bucket: 'req' },
        { text: 'Can a prompt be shared across teams?', bucket: 'open' },
        { text: 'Fine-tuning models on saved prompts', bucket: 'non' },
        { text: 'Which models must we support on day one?', bucket: 'open' },
      ],
      explanation: 'Non-goals are cuts you chose. Requirements are what you will be judged on, functional or not. Open questions are someone else\'s call: write your assumption and move on.',
    },
  ],
}

export default lesson
