import type { Lesson } from '../../core/types'

const lesson: Lesson = {
  id: 'map-loop',
  title: 'The loop, mapped',
  summary: 'The stages candidates report, what each one screens for, and which one rejects strong coders.',
  minutes: 7,
  skills: ['map.loop', 'map.signals'],
  steps: [
    {
      kind: 'concept',
      id: 'hook',
      eyebrow: 'The map',
      title: 'Which round rejects the strong engineers?',
      body: "Candidates describe Anthropic's hiring loop as five stages that take anywhere from about three weeks to four months. On paper it looks like any big-tech loop: a recruiter call, an assessment, live coding, an onsite.\n\nBy recruiters' and candidates' own accounts, though, one round is where most technically strong people wash out. Make a guess now. You'll test it in a few minutes.",
      callout: {
        tone: 'warn',
        text: 'Everything in this unit comes from public candidate reports and press coverage, as of October 2026. None of it is official, and formats vary by role and change over time.',
      },
    },
    {
      kind: 'order',
      id: 'order-stages',
      eyebrow: 'Warm-up',
      prompt: 'Here are the five stages as 2026 candidates describe them. Put them in order.',
      items: [
        'A 15-30 minute call that increasingly probes AI safety',
        'A 90-minute project whose levels unlock as tests pass',
        '50-60 minutes of live, practical coding',
        'Four or five hours: coding, design, hiring manager, deep dive, culture',
        'Reference calls, then matching to a team',
      ],
      explanation:
        'Recruiter screen, online assessment, technical screen, virtual onsite, then references and team matching, which can go quiet for weeks. Variations are common: guides say referrals may skip the assessment, some paths add a hiring-manager screen, and one August 2026 Senior+ path had a design phone screen instead of coding.',
      hint: 'Cheap filters come first. The expensive day with many interviewers comes late.',
    },
    {
      kind: 'concept',
      id: 'recruiter',
      title: 'The recruiter call is not small talk',
      body: "Candidates in 2026 report recruiter screens leaning hard on AI safety. One August 2026 candidate said 20 of the 30 minutes went to it. Reported questions include:\n\n- *Why Anthropic?*\n- *How is Anthropic different from other AI labs?*\n- *Was there anything in a recent Anthropic interview, article or news story that you agreed or disagreed with?*\n\nThis is the first place your own opinions get scored.",
    },
    {
      kind: 'mcq',
      id: 'recent-news',
      prompt: 'The recruiter asks: *Was there anything in a recent Anthropic article or news story you agreed or disagreed with?* Which answer gives them the most signal?',
      choices: [
        {
          text: "One specific post, what you agreed with, and where you'd push back",
          correct: true,
          feedback:
            "Yes. Specific, sourced and two-sided. It shows you read primary material and formed a view, which is exactly what the question is built to surface.",
        },
        {
          text: 'That you agree with nearly all of it, which is why you applied',
          feedback:
            "Tempting, because it sounds aligned. It offers no evidence you've read anything, and the later culture round reportedly looks for willingness to critique Anthropic.",
        },
        {
          text: 'A crisp summary of the mission statement and the seven values',
          feedback: "Reciting isn't an opinion. The recruiter can read the website; they want to know what you think about it.",
        },
        {
          text: "That you haven't had time to follow recent news, being honest",
          feedback:
            "Honest, which counts for something, but it tells them you didn't prepare for a question candidates report being asked. An evening with primary sources fixes it.",
        },
      ],
      explanation: 'The question checks two things at once: that you read primary sources, and that you think for yourself. A specific, two-sided answer does both.',
      hint: 'Which answer could only come from someone who read something and thought about it?',
    },
    {
      kind: 'concept',
      id: 'assessment',
      title: 'The assessment: one project, growing',
      body: "Candidates report that the online assessment is CodeSignal's Industry Coding Assessment: **one** project, four progressive levels, 90 minutes, scored 200-600. Many say each level unlocks only after its tests pass, and some 2026 reports describe six levels. Commonly reported projects: an in-memory key-value store, a bank system, cloud file storage.\n\nNo trick puzzles. The real test is whether your level-1 code survives levels 2 to 4.",
      callout: {
        tone: 'source',
        text: "CodeSignal's [ICA rules](https://support.codesignal.com/hc/en-us/articles/19116922232983-What-are-the-Industry-Coding-Assessment-ICA-rules-and-how-do-I-interpret-my-assessment-score) describe the format. Passing scores you see quoted online are folklore: candidates report rejections at 600 and advancing below it.",
      },
    },
    {
      kind: 'numeric',
      id: 'time-budget',
      prompt:
        'A widely used CodeSignal practice repo estimates the levels at: L1 10-15 min, L2 20-30, L3 30-60, L4 30-60. If you hit the **fastest** end of every range, how many minutes does a full solve take?',
      answer: 90,
      unit: 'min',
      explanation:
        "10 + 20 + 30 + 30 = 90: the entire time limit, with no slack for a single bug. At the slow end it's 165, and the repo notes the estimates exceed 90 minutes on purpose. Finishing every level is a stretch, so clean, extensible level-1 code and calm time management are part of what's measured.",
      hint: 'Add the low end of each range.',
    },
    {
      kind: 'concept',
      id: 'onsite',
      title: 'The onsite: five different tests',
      body: 'Candidates report 4-5 one-hour rounds, sometimes split over two days, with the second half cancelled if the first goes badly:\n\n- **Coding**: practical builds, nearly always with a concurrency follow-up\n- **System design** in a shared Google Doc, sometimes critiquing a flawed one\n- **Hiring manager**: your résumé, goals and how you work\n- **Project deep dive**: about 20 minutes presenting, then questions\n- **Culture / values**: no code, run by a nominated employee',
      callout: {
        tone: 'source',
        text: "Pieced together from [Hello Interview's Anthropic guide](https://www.hellointerview.com/guides/anthropic/swe), [interviewing.io](https://interviewing.io/anthropic-interview-questions) and candidate reports (2026). Anthropic's [careers page](https://www.anthropic.com/careers) confirms interviews run on Google Meet, with live coding tools like Colab and CodeSignal.",
      },
    },
    {
      kind: 'mcq',
      id: 'the-wall',
      eyebrow: 'Check your guess',
      prompt: 'Which round do candidates and recruiters most often name as the one that rejects technically strong people?',
      choices: [
        {
          text: 'Culture / values',
          correct: true,
          feedback:
            'Yes. Coverage of a May 2026 Bloomberg Businessweek feature reports recruiters saying the culture interview is where most strong candidates wash out. One candidate thread put it bluntly: *the culture round really is the wall for this company*.',
        },
        {
          text: 'System design',
          feedback:
            "A real failure point, especially on product prompts that reward concrete data models. But it isn't the round that reports single out.",
        },
        {
          text: 'Coding, once the concurrency follow-up arrives',
          feedback: "The follow-ups are hard, and they come up in nearly every coding round. But they aren't what reports single out as the place strong coders get rejected.",
        },
        {
          text: 'Project deep dive',
          feedback: "It exposes borrowed or shallow stories, so a project you really owned matters. But it isn't the round reports single out.",
        },
      ],
      explanation:
        'Every role gets a culture interview, and per press reports a low rating there usually means no offer, whatever happened in coding. An April 2026 candidate was even given a second culture interview because the first signal was too weak. Budget prep time accordingly.',
    },
    {
      kind: 'match',
      id: 'signals',
      prompt: 'Each round is scoring something different. Match the round to its main signal.',
      pairs: [
        { left: 'Recruiter screen', right: 'Informed reasons and real opinions' },
        { left: 'Online assessment', right: 'Code that survives new levels against the clock' },
        { left: 'Coding rounds', right: 'Working code that holds up when made concurrent' },
        { left: 'System design', right: 'Clear written tradeoffs in a shared doc' },
        { left: 'Project deep dive', right: 'Your own decisions, alternatives and numbers' },
        { left: 'Culture / values', right: 'Your judgment, told honestly, and updating' },
      ],
      explanation:
        "One skill rarely carries two rounds. LeetCode speed doesn't write a design doc, and a polished design doc doesn't help in the culture round. That's why prep has to be spread across all of them.",
    },
    {
      kind: 'concept',
      id: 'variance',
      title: 'Your loop is not the average loop',
      body: "Reports vary by role, level and month. Some 2026 examples:\n\n- Infra candidates got distributed-systems coding and hardware cost reasoning.\n- One candidate's design round switched from Product to Data Infra the evening before.\n- An August 2026 report describes an onsite round with Claude Code provided.\n- Timelines ran from about three weeks to four months.\n\nTreat this map as a prior. Your recruiter has the real one.",
    },
    {
      kind: 'sort',
      id: 'plan-or-confirm',
      prompt: 'Which parts can you plan around, and which should you confirm with your recruiter?',
      buckets: [
        { id: 'stable', label: 'Consistent across reports' },
        { id: 'confirm', label: 'Varies: confirm it' },
      ],
      items: [
        { text: 'There will be a culture / values interview', bucket: 'stable', why: '2026 press reports say every role has one.' },
        { text: 'Coding means practical builds, not puzzles', bucket: 'stable', why: 'Crawlers, file dedup, stack traces, caches and image pipelines recur across reports.' },
        { text: 'Coding rounds include a concurrency follow-up', bucket: 'stable', why: 'Reported in nearly every coding round.' },
        { text: 'How many levels the assessment has', bucket: 'confirm', why: 'Four is the standard format; some 2026 candidates report six.' },
        { text: 'Whether your phone screen is coding or design', bucket: 'confirm', why: 'One August 2026 Senior+ path had a design phone screen.' },
        { text: 'Whether any round provides an AI assistant', bucket: 'confirm', why: 'The default is no AI, yet one 2026 onsite round provided Claude Code.' },
        { text: 'Which languages you can use in live rounds', bucket: 'confirm', why: 'Python is the default; some candidates chose from several languages, and one round fixed TypeScript.' },
        { text: 'How long the deep-dive presentation runs', bucket: 'confirm', why: 'Reports range from about 15 to 25 minutes, with or without slides.' },
      ],
      explanation:
        "Plan around the stable parts. For the rest, ask once, early, and write down the answer. Asking how your own loop works is a normal question, and it costs you nothing.",
    },
    {
      kind: 'interview',
      id: 'recruiter-close',
      eyebrow: 'Put it together',
      setup: 'The last five minutes of your recruiter screen.',
      turns: [
        {
          interviewer: 'Any questions about the process?',
          options: [
            {
              text: 'What are the rounds for this role, and the format of each: environment, language, any AI tools?',
              quality: 'strong',
              feedback: 'Strong. It targets exactly the parts that vary between loops, and asking about AI rules shows you know they change by stage.',
            },
            {
              text: 'How long does the whole process usually take, from here to an offer?',
              quality: 'okay',
              feedback: "Reasonable, but timelines swing from weeks to months, and it's the least actionable fact. Ask about format first.",
            },
            {
              text: 'Is the culture interview a big deal for engineers, or more of a formality?',
              quality: 'weak',
              feedback: "Reports say the opposite: every role has one, and it's where strong candidates most often fail. Calling it a formality also tells them what you think of it.",
            },
          ],
        },
        {
          interviewer: "Before the onsite I'll send some reading on our approach to safety. Anything else you need from me?",
          options: [
            {
              text: "Thanks, I'll read it. Is there anything in particular you'd like me to focus on?",
              quality: 'okay',
              feedback: 'Polite and fine. It hands the work back to the recruiter, though, and shows nothing about your own preparation.',
            },
            {
              text: 'Could you tell me what kind of answers the culture interviewer is looking for?',
              quality: 'weak',
              feedback:
                "It reads as asking for a script. Interviewers reportedly improvise from suggested questions, and Anthropic says it isn't looking for a specific belief. There's no answer key to hand over.",
            },
            {
              text: "Thanks. I've read Core Views and the RSP v3 post and have questions about the pause change. Anything beyond those?",
              quality: 'strong',
              feedback: 'Strong. It shows you already went to primary sources, formed questions of your own, and want more. That is the habit the later rounds probe.',
            },
          ],
        },
        {
          interviewer: 'After the onsite, references and team matching can take a few weeks, and you may not hear much.',
          options: [
            {
              text: "If I don't hear back within a week, I'll assume it's a no.",
              quality: 'weak',
              feedback: "Candidates report team matching taking weeks, often with little word from the recruiter. Silence there is normal, and reading it as a verdict leads to bad decisions about your other processes.",
            },
            {
              text: 'Understood. Can I check in every couple of weeks, and will I meet more than one team?',
              quality: 'strong',
              feedback: 'Strong. It sets a reasonable cadence and asks how matching works for you, instead of guessing.',
            },
            {
              text: "Okay, that sounds fine. I'll wait to hear from you then.",
              quality: 'okay',
              feedback: 'Fine. You just missed the chance to agree on how you will stay in touch.',
            },
          ],
        },
      ],
      wrapUp:
        "Three habits from one call: ask about the parts that vary, treat the culture round as a real round that needs real prep, and don't read silence as a verdict.",
    },
    {
      kind: 'concept',
      id: 'recap',
      title: 'Remember',
      body: '1. **The shape**: recruiter screen, online assessment, technical screen, onsite (coding, design, hiring manager, deep dive, culture), then references and team matching.\n2. **Each round scores something different**, and the culture round is where strong coders most often fail.\n3. **Formats vary** by role, level and month. Use this map as a prior, and get your own loop from your recruiter.',
    },
  ],
  cards: [
    {
      id: 'map-loop.stage-order',
      skill: 'map.loop',
      kind: 'order',
      prompt: 'Order the stages of a typical Anthropic loop, as candidates reported it in 2026.',
      items: ['Recruiter screen', 'CodeSignal online assessment', 'Live technical screen', 'Virtual onsite', 'References and team matching'],
      explanation: 'Cheap filters first, the multi-interviewer onsite late, matching last. Referrals sometimes skip the assessment, and some paths add a hiring-manager screen.',
    },
    {
      id: 'map-loop.oa-shape',
      skill: 'map.loop',
      kind: 'mcq',
      prompt: "What do candidates say Anthropic's online assessment looks like?",
      choices: [
        {
          text: 'One project built over progressive levels in 90 minutes',
          correct: true,
          feedback: "Right: CodeSignal's Industry Coding Assessment, with levels that reportedly unlock as tests pass.",
        },
        { text: 'Three timed algorithm puzzles of rising difficulty', feedback: 'That is the classic format elsewhere. Reports here describe one growing project.' },
        { text: 'A take-home project with a week to finish it', feedback: 'It is timed: 90 minutes in one sitting.' },
        { text: 'A multiple-choice quiz on Python internals', feedback: 'No quiz. You write code that has to pass tests at each level.' },
      ],
      explanation: 'One project, four levels (some 2026 reports say six), 90 minutes, scored 200-600. Extensible early code is what saves you later.',
    },
    {
      id: 'map-loop.artifacts',
      skill: 'map.loop',
      kind: 'match',
      prompt: 'Match each reported detail to its round.',
      pairs: [
        { left: 'A shared Google Doc', right: 'System design' },
        { left: 'Levels that unlock when tests pass', right: 'Online assessment' },
        { left: 'About 20 minutes presenting your own work', right: 'Project deep dive' },
        { left: 'A Colab or Replit notebook for an hour', right: 'Technical screen' },
        { left: 'No code, run by a nominated employee', right: 'Culture / values' },
      ],
      explanation: 'Each format hints at the signal: written clarity for design, extensible code for the assessment, ownership for the deep dive, working code for the screen, judgment for culture.',
    },
    {
      id: 'map-loop.wall',
      skill: 'map.signals',
      kind: 'flash',
      front: 'Which round do recruiters say most strong candidates wash out in, and what does a low rating there usually mean?',
      back: 'The culture / values interview, which every role has. Per Bloomberg Businessweek (May 2026), a low rating there usually means no offer, however well the coding went.',
    },
    {
      id: 'map-loop.variance',
      skill: 'map.loop',
      kind: 'mcq',
      prompt: "An August 2026 Senior+ candidate's phone screen was system design, not coding. What should you take from reports like this?",
      choices: [
        {
          text: 'Formats vary by role; confirm your own loop with your recruiter',
          correct: true,
          feedback: 'Yes. Reports are a good prior, and your recruiter has the actual round list.',
        },
        { text: 'Senior candidates no longer get coding screens at all', feedback: 'That overgeneralizes from one report. Many senior candidates report coding screens.' },
        { text: "Candidate reports are unreliable, so it's best to ignore them", feedback: 'They are noisy, not useless. The stable patterns, like a culture round for every role, recur across many reports.' },
        { text: 'Prepare for system design only and skip coding prep', feedback: 'The onsite still includes coding. One data point about one screen does not reshape the whole loop.' },
      ],
      explanation: 'Use reports to plan, then replace the guesses with facts from your recruiter: round list, formats, languages, AI rules.',
    },
    {
      id: 'map-loop.recruiter',
      skill: 'map.signals',
      kind: 'flash',
      front: 'What do 2026 candidates report recruiter screens spending a lot of their time on?',
      back: "AI safety and *why Anthropic*: how it differs from other labs, what you agreed or disagreed with in recent posts, the biggest risks. One August 2026 report: 20 of 30 minutes. Bring real opinions.",
    },
  ],
}

export default lesson
