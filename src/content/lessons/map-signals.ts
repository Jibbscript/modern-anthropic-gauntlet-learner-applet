import type { Lesson } from '../../core/types'

const lesson: Lesson = {
  id: 'map-signals',
  title: "What they're really scoring",
  summary: 'A different kind of high: practical code, written design and your own judgment, and how to spend prep time on them.',
  minutes: 8,
  skills: ['map.signals', 'values.antipatterns'],
  steps: [
    {
      kind: 'concept',
      id: 'hook',
      eyebrow: 'A different kind of high',
      title: 'Sunk without a hard algorithm',
      body: "A Staff-level engineer describes an Anthropic onsite coding round that went wrong with no hard algorithm in sight. The task was an image-processing pipeline. They didn't know the image library's API, had to look it up live, and never finished converting a single image end to end. They were rejected without feedback.\n\nThe bar here is high. It's a different kind of high.",
      callout: {
        tone: 'source',
        text: 'Candidate report on [Aced](https://www.aced.io/experiences/anthropic-staff-software-engineer-interview-6ecf1d), from an interview around 2025.',
      },
    },
    {
      kind: 'mcq',
      id: 'what-saves-it',
      prompt: 'Which prep would most likely have saved that round?',
      choices: [
        {
          text: 'An evening building a tiny Pillow pipeline, then parallelizing it',
          correct: true,
          feedback:
            'Yes. The failure was API fluency and finishing end to end. An hour of hands-on practice fixes both, and the parallel step rehearses the follow-up that almost always comes next.',
        },
        {
          text: 'Fifty more hard dynamic-programming problems, timed',
          feedback: 'The default prep reflex, and it trains a skill this round never tested. The reported problems are practical builds, not puzzles.',
        },
        {
          text: 'Memorizing the complexity of every classic sorting algorithm',
          feedback: "Recalling trivia doesn't produce working code, and nothing in the round asked for it.",
        },
        {
          text: "Reading through the image library's source code the night before",
          feedback: 'Thorough, but slow and passive. You need the common calls in your fingers, and that only comes from using them.',
        },
      ],
      explanation: 'Practical rounds punish unfamiliarity with everyday tools, not gaps in algorithm theory. Use the libraries the reported problems need until the common calls are boring.',
    },
    {
      kind: 'concept',
      id: 'coding-signal',
      title: 'What a coding round scores',
      body: 'Reported coding problems come from a small, recurring bank: a web crawler, a duplicate-file finder, stack samples to trace events, an LRU cache, an image pipeline. What gets scored, by candidates\' accounts:\n\n- code that **runs**, end to end\n- structure that survives the **next requirement**\n- **tests you write yourself**, since some prompts ship with none\n- reading an unfamiliar **API** fast\n- **concurrency** reasoning in the follow-up',
    },
    {
      kind: 'order',
      id: 'round-arc',
      prompt: 'Candidates describe coding rounds following a common arc. Put it in order.',
      items: [
        'Build a first version of the core feature',
        'Get it working end to end on the examples',
        'Extend it for a new requirement, without a rewrite',
        'Make it concurrent or scale it, and discuss the tradeoffs',
        'Prove the final version correct with tests you design yourself',
      ],
      explanation:
        "Build, make it work, extend, make it concurrent, test it. You should run small checks at every stage; the last step is the deliberate hunt for cases nobody handed you, like the crawler's cycles or file dedup's empty files. Each stage reuses the last one's code, so early structure pays off late.",
      hint: "You can't make something concurrent before it works, and you can't extend what doesn't exist yet. Proving the *final* version correct comes after it exists.",
    },
    {
      kind: 'concept',
      id: 'design-signal',
      title: 'Design is a writing test',
      body: 'Candidates report system design happening in a shared Google Doc, not on a whiteboard. Sometimes you critique a flawed doc instead of writing one. A product prompt like a collaborative prompt playground (sharing, versions, running prompts, storage, scale) rewards:\n\n- requirements and numbers before boxes\n- concrete data models and APIs\n- named alternatives, and why you rejected them\n\nYour reader is scrolling a doc. Write for them.',
      callout: {
        tone: 'insight',
        text: 'A July 2026 candidate rejected after a Prompt Playground round put it down, in their own words, to not paying enough attention to low-level details.',
      },
    },
    {
      kind: 'mcq',
      id: 'doc-credit',
      multi: true,
      prompt: "You're 15 minutes into a design round in a shared doc, designing a prompt playground. Which of these earn credit? Select all that apply.",
      choices: [
        {
          text: 'A short requirements list with estimates: users, prompt sizes, runs per day',
          correct: true,
          feedback: 'Yes. Numbers turn opinions into decisions, and give the interviewer something concrete to push on.',
        },
        {
          text: 'A table: `prompt_versions(prompt_id, version, author, created_at, body_ref)`',
          correct: true,
          feedback: 'Yes. A concrete data model is the kind of low-level detail product design rounds reportedly reward.',
        },
        {
          text: 'One line on why you chose immutable versions over editing in place',
          correct: true,
          feedback: 'Yes. A named alternative, rejected for a stated reason, is the clearest evidence of judgment a doc can hold.',
        },
        {
          text: 'A paragraph listing the stack: Kafka, Redis, Kubernetes, Cassandra',
          feedback: 'Names without reasons are noise. Each technology should arrive attached to the requirement it serves.',
        },
        {
          text: 'An opening paragraph on why collaboration matters to AI teams',
          feedback: 'Pleasant, but it costs the reader time and shows no design. Lead with requirements.',
        },
      ],
      explanation: 'Credit goes to what a reader can check: numbers, schemas and decisions with reasons. Buzzwords and scene-setting take up space without showing judgment.',
    },
    {
      kind: 'concept',
      id: 'culture-signal',
      title: 'Culture: your judgment, not theirs',
      body: "In a May 2026 Bloomberg Businessweek feature, Daniela Amodei gave a sample culture question: *What are some of the slightly unusual beliefs you hold, and how have you defended them in uncomfortable situations because you felt they were right?* She also said: *We're not looking for a specific belief.*\n\nWhat reportedly scores: real reasoning, admitting what you don't know, honest critique of Anthropic, and visibly updating on a better argument.",
      callout: {
        tone: 'source',
        text: "[GIGAZINE's summary of the Bloomberg feature](https://gigazine.net/gsc_news/en/20260601-anthropic-recruiting), June 2026.",
      },
    },
    {
      kind: 'compare',
      id: 'why-anthropic',
      question: 'Recruiter screen: *Why Anthropic?*',
      a: "Anthropic is the leader in AI safety, and I deeply believe in the mission of ensuring the world safely makes the transition through transformative AI. I've followed the company for years, I admire everything it stands for, and a culture that puts safety first is exactly where I want to do the most meaningful work of my career.",
      b: "Two reasons. I've spent three years on evaluation tooling, and your interpretability work is what made model internals feel measurable to me. And I'm unsettled in a useful way: I follow the RSP v3 argument that one lab pausing alone could leave the world less safe, but I'm not sure dropping the pause pledge was the right trade. I'd like to work through that from inside.",
      better: 'b',
      explanation:
        "A flatters, quotes the mission back, and could be pasted into any application. B is tied to the candidate's own history, engages with Anthropic's actual work, and states a real reservation with the other side's best argument in view. B's view isn't the right one; agreeing with v3 for stated reasons would score as well. An interviewer can push on B. There's nothing in A to push on.",
    },
    {
      kind: 'sort',
      id: 'signal-noise',
      prompt: 'Across the whole loop: is each behavior signal or noise?',
      buckets: [
        { id: 'signal', label: 'Strong signal' },
        { id: 'noise', label: 'Noise, or worse' },
      ],
      items: [
        { text: 'Asks what the interviewer means by *scale* before designing', bucket: 'signal', why: 'Clarifying turns a vague prompt into requirements you can design against.' },
        { text: 'Recites one of five memorized STAR stories, whatever the question', bucket: 'noise', why: 'Pre-packaged stories are a top reported culture-round failure. Follow-ups several levels deep expose them.' },
        { text: 'Writes a quick test for an empty directory before anyone asks', bucket: 'signal', why: 'Testing your own code unprompted is part of the bar.' },
        { text: 'Explains why threads suit an IO-bound crawler despite the GIL', bucket: 'signal', why: 'Concurrency reasoning is the near-universal follow-up.' },
        { text: "Says *I'd do exactly the same again* about every past decision", bucket: 'noise', why: 'No updating, no self-knowledge. Interviewers ask how you feel about decisions now, not just then.' },
        { text: 'Spends ten minutes proving an optimal Big-O before anything runs', bucket: 'noise', why: 'A puzzle reflex. Practical rounds score working code first; complexity talk lands better once something runs.' },
        { text: 'Changes the design after a good objection, and says what changed', bucket: 'signal', why: 'Updating visibly on a better argument scores in design and in culture.' },
        { text: 'Agrees with every Anthropic position the interviewer raises', bucket: 'noise', why: 'Blind agreement reads as either not thinking or performing.' },
      ],
      explanation:
        'Signal is evidence of how you think: clarifying, testing, reasoning about tradeoffs, updating. Noise is performance: memorized stories, trivia, agreement. Interviewers who probe several levels deep are trying to tell the two apart.',
    },
    {
      kind: 'concept',
      id: 'prep-allocation',
      title: 'Spend prep where the signal is',
      body: 'If the rounds score practical work, writing and judgment, LeetCode grinding is the wrong default. Shift your hours to:\n\n1. Practical Python\n2. Concurrency\n3. Debugging unfamiliar code\n4. Reading docs quickly\n5. Testing your own implementation\n6. Explaining a real project deeply\n7. Real opinions on AI safety and Anthropic\'s mission\n\nThe coding bank is small and widely leaked, and interviewers notice memorized answers. Learn patterns, not scripts.',
    },
    {
      kind: 'numeric',
      id: 'culture-hours',
      prompt:
        'Your onsite is in 14 days and you can study 2 hours a day. You give a quarter of that time to culture and *why Anthropic* prep: reading, drafting stories, saying answers out loud. How many hours is that?',
      answer: 7,
      unit: 'hours',
      explanation:
        "14 × 2 = 28 hours, and a quarter is 7. That's enough to read the primary sources (about two hours), draft a handful of real stories with the layers interviewers probe (about three), and rehearse them out loud against follow-ups (about two). It's tempting for an engineer to give this round zero hours, and it's the round reports say rejects strong engineers.",
      hint: 'Total hours first, then a quarter of that.',
    },
    {
      kind: 'interview',
      id: 'seen-it',
      eyebrow: 'Put it together',
      setup: 'Live technical screen. The prompt: a same-host web crawler. You practiced this exact problem last week.',
      turns: [
        {
          interviewer: "Take a minute to read it, then tell me how you'd start.",
          options: [
            {
              text: "Sounds good. I'll start with a BFS from the start URL and a visited set.",
              quality: 'okay',
              feedback:
                "Not dishonest, and the code will probably be clean. But a replayed solution shows little about how you think, and reports say interviewers notice memorized answers.",
            },
            {
              text: "To be upfront, I've practiced this one. Happy to do it, or take a variation if that's better signal.",
              quality: 'strong',
              feedback:
                "Strong. One candidate reported admitting they'd seen the crawler before. An extra round with a fresh problem was added, and they got an offer, though a level below the one they applied for (the report doesn't say why). Saying so can cost you a round; hiding it gives no real signal and puts trust at risk.",
            },
            {
              text: 'Hmm, crawlers. Let me think about this from scratch. Maybe some kind of search?',
              quality: 'weak',
              feedback: "Staged discovery is the worst of both: it's dishonest, and if the act slips, you've lost the interviewer's trust for the rest of the hour.",
            },
          ],
        },
        {
          interviewer: 'Works. Now make it concurrent.',
          options: [
            {
              text: "I'll use multiprocessing with a process per core, so the GIL can't serialize the fetches and slow it all down.",
              quality: 'weak',
              feedback: 'Processes help CPU-bound work. Crawling is IO-bound, so threads already overlap the waits, and processes make the shared visited set much harder.',
            },
            {
              text: "I'll rewrite it with asyncio and gather, since that's the modern way to do concurrent IO in Python.",
              quality: 'okay',
              feedback: 'It could work, but there is no reasoning, and the provided link fetcher in reported versions is a blocking call, so you would still need threads underneath.',
            },
            {
              text: "IO-bound, and blocking IO releases the GIL, so threads: a pool, a locked check-and-add on visited, an in-flight count.",
              quality: 'strong',
              feedback: 'Strong: the choice, the reason, and the two classic bugs (a racy check-then-add and stopping too early) named before you write them.',
            },
          ],
        },
        {
          interviewer: "How would you convince yourself it's correct?",
          options: [
            {
              text: 'A fake provider with a cycle, a cross-host link, a #fragment and a slow page; assert one fetch per page and that it ends.',
              quality: 'strong',
              feedback: 'Strong: a deterministic test double aimed at the known failure modes, with assertions that would catch a race.',
            },
            {
              text: "It returned the right URLs on the example input and the output looked clean, so I'm fairly confident.",
              quality: 'weak',
              feedback: "One happy-path run can't expose a race or a hang. Concurrency bugs need inputs designed to trigger them.",
            },
            {
              text: "I'd add logging around each fetch, then run it against a couple of real sites a few times.",
              quality: 'okay',
              feedback: 'Better than nothing, but real sites are slow and nondeterministic, and logs need a human to notice the bug.',
            },
          ],
        },
      ],
      wrapUp: 'Honesty, reasoning out loud, and testing your own work: three signals in one coding round, and none of them is about algorithms.',
    },
    {
      kind: 'concept',
      id: 'recap',
      title: 'Remember',
      body: "1. **Coding** scores practical work: code that runs, extends and is tested by you, plus API fluency and concurrency reasoning.\n2. **Design** is written: requirements, numbers, schemas and named tradeoffs in a doc a reader can follow.\n3. **Culture** scores your own judgment, honestly explained, and updating. Give it real prep hours; it's the round reports say rejects strong engineers.",
    },
  ],
  cards: [
    {
      id: 'map-signals.bar',
      skill: 'map.signals',
      kind: 'mcq',
      prompt: "Candidates describe Anthropic's coding bar as high but practical. Which behavior is most clearly on that bar?",
      choices: [
        {
          text: 'Gets a plain version running, then refactors as requirements arrive',
          correct: true,
          feedback: 'Yes. Working, extensible code that grows with the prompt is the core of what practical rounds score.',
        },
        { text: 'Writes an elegant, optimal solution but never actually runs it', feedback: 'Unrun code is a hypothesis. Reported rounds expect code that executes.' },
        { text: 'Spends 20 minutes on a class hierarchy before anything works', feedback: 'Structure matters, but not before something runs. Extensibility should serve the next level, not delay this one.' },
        { text: 'Recites a textbook BFS without adapting it to the prompt', feedback: 'Recognition is not the skill. The prompt has its own rules (same host, fragments, cycles) to handle.' },
      ],
      explanation: 'Practical means: runs end to end, survives the next requirement, and comes with your own tests.',
    },
    {
      id: 'map-signals.arc',
      skill: 'map.signals',
      kind: 'order',
      prompt: 'A crawler round, following the reported arc. Put the stages in order.',
      items: [
        'Single-threaded BFS that returns same-host URLs',
        'Strip #fragments and handle cycles so each page is fetched once',
        'Add a new requirement, say a maximum crawl depth',
        'Fetch with a thread pool and a locked visited set',
        'Test the threaded version with a fake link provider: cycles, termination',
      ],
      explanation: 'Build, make it work, extend, make it concurrent, test it yourself. The same arc applies to dedup, caches and pipelines.',
    },
    {
      id: 'map-signals.doc-line',
      skill: 'map.signals',
      kind: 'compare',
      question: 'Two lines from a shared design doc for a prompt playground. Which one does the interviewer want to read?',
      a: 'Storage will use a scalable, highly available distributed database with caching for performance.',
      b: "Each save writes an immutable version row; the prompt's head pointer moves by compare-and-set, so two editors can't silently overwrite each other.",
      better: 'b',
      explanation: 'B makes a concrete, checkable decision and says what problem it solves. A could describe any system and commits to nothing.',
    },
    {
      id: 'map-signals.noise',
      skill: 'values.antipatterns',
      kind: 'sort',
      prompt: 'Signal or noise?',
      buckets: [
        { id: 'signal', label: 'Signal' },
        { id: 'noise', label: 'Noise' },
      ],
      items: [
        { text: 'Asks how large a prompt can get before choosing storage', bucket: 'signal' },
        { text: "Says *I don't know*, then reasons toward an estimate", bucket: 'signal' },
        { text: 'Runs the code after every meaningful change', bucket: 'signal' },
        { text: 'Opens the culture round by reciting the mission statement', bucket: 'noise' },
        { text: 'Tells a more flattering version of a story under follow-up', bucket: 'noise' },
        { text: 'Name-drops five databases with no reasons attached', bucket: 'noise' },
      ],
      explanation: 'Signal shows how you think and what you actually did. Noise performs: recitation, polish and name-dropping.',
    },
    {
      id: 'map-signals.priorities',
      skill: 'map.signals',
      kind: 'flash',
      front: 'Name the seven prep priorities that should replace most LeetCode grinding.',
      back: 'Practical Python; concurrency; debugging unfamiliar code; reading docs quickly; testing your own implementation; explaining a real project deeply; real opinions on AI safety and Anthropic\'s mission.',
    },
    {
      id: 'map-signals.seen-it',
      skill: 'values.antipatterns',
      kind: 'mcq',
      prompt: "You recognize a coding prompt as one you've practiced. Why is quietly replaying the memorized solution a weak strategy?",
      choices: [
        {
          text: 'It shows little about how you think, and rehearsal is easy to spot',
          correct: true,
          feedback: 'Right. The bank is small and widely shared, interviewers notice memorized answers, and saying so up front is the honest move.',
        },
        { text: 'Memorized solutions are usually wrong in subtle ways', feedback: "Often they're fine. The problem is the missing signal, not the code." },
        { text: "Interviewers must fail anyone who's seen the problem before", feedback: 'No such rule is reported. One candidate who said so got a fresh problem in an extra round, and an offer, a level below the one they applied for.' },
        { text: 'It breaks the rule against AI assistance in live rounds', feedback: 'Practicing a problem is not AI assistance. The issue is honesty and signal.' },
      ],
      explanation: 'Know the patterns deeply, not the scripts. If you have seen the exact problem, say so.',
    },
    {
      id: 'map-signals.not-a-belief',
      skill: 'map.signals',
      kind: 'flash',
      front: "Daniela Amodei on the culture interview: *We're not looking for a specific belief.* So what are interviewers looking for?",
      back: 'How you hold beliefs: your own reasoning, told honestly, defended when it is uncomfortable, and changed when someone gives you a better argument. Blind agreement scores badly.',
    },
    {
      id: 'map-signals.prep-split',
      skill: 'map.signals',
      kind: 'mcq',
      prompt: 'You have about 20 prep hours before an Anthropic onsite. Which plan best matches what candidates report the loop scores?',
      choices: [
        {
          text: 'Builds with concurrency, design writing, deep-dive practice, a quarter on culture',
          correct: true,
          feedback: 'Yes. It covers every round, and gives the round that reportedly rejects strong engineers real hours.',
        },
        {
          text: 'Mostly timed LeetCode hards, because the coding bar is reportedly very high',
          feedback: 'High, but practical: reported problems are builds like crawlers, dedup and image pipelines, not puzzles.',
        },
        {
          text: 'Mostly memorizing solutions to the widely leaked bank of coding questions',
          feedback: "The bank is small and widely shared, and interviewers reportedly notice memorized answers. Learn the patterns, not the scripts.",
        },
        {
          text: "All technical prep; the culture round is just a conversation, so wing it",
          feedback: 'Culture is the round reports say strong engineers most often fail, and follow-ups go several levels deep. A conversation still needs prep.',
        },
      ],
      explanation: 'Spread hours over what is scored: practical code, concurrency, written design, your own project and your own views. Culture deserves real hours.',
    },
  ],
}

export default lesson
