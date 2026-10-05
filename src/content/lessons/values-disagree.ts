import type { Lesson } from '../../core/types'

const lesson: Lesson = {
  id: 'values-disagree',
  title: 'Disagreeing with direction',
  summary:
    'Raise a disagreement through the right channel, tell preference from principle, and tell the story without a villain, including whether you were right.',
  minutes: 9,
  skills: ['values.disagreement'],
  steps: [
    {
      kind: 'concept',
      id: 'hook',
      eyebrow: 'Culture round',
      title: 'A ditch on each side',
      body:
        "*Tell me about a time you disagreed with your company's direction.*\n\n" +
        "Two easy answers, both bad. *I've never really disagreed with leadership* says you don't form views, or won't share them. *Leadership made a terrible call, and I was right* says you'd be hard to work with, and that you never understood their reasons.\n\n" +
        'The good answer runs between them.',
      callout: {
        tone: 'insight',
        text:
          "Candidate-reported prompts include *Describe a time you disagreed with your manager and later changed your mind* and *What concerns do you have with Anthropic's mission or direction?* A Sep 2026 write-up adds a possible follow-up: what you'd do if you strongly disagreed with a company safety decision.",
      },
    },
    {
      kind: 'concept',
      id: 'channels',
      title: 'The channels, in order',
      body:
        'Disagreement has a usual escalation path. Each step up costs more time and goodwill, so start low.\n\n' +
        "1. **1:1**: ask the decision-maker what you're missing, then make your case\n" +
        '2. **Written proposal**: one page that others can review and challenge\n' +
        '3. **Data**: propose a small experiment that would settle it\n' +
        '4. **Escalation**: skip-level or a formal channel, after telling your manager\n' +
        '5. **Exit**: for principles, once the channels are spent',
      callout: {
        tone: 'tip',
        text: 'Urgent harm skips the queue. If users are being hurt today, go straight to whoever can stop it, and tell your manager you did.',
      },
    },
    {
      kind: 'sort',
      id: 'responses',
      eyebrow: 'Sort',
      prompt: "Your director cuts your team's reliability work to fund a new feature. You think it's a mistake. Sort each response.",
      buckets: [
        { id: 'constructive', label: 'Constructive' },
        { id: 'passive', label: 'Too passive' },
        { id: 'aggressive', label: 'Too aggressive' },
      ],
      items: [
        {
          text: "Ask your manager 1:1 what's driving the decision",
          bucket: 'constructive',
          why: 'It starts with understanding. You may be missing context, such as a contract or a deadline.',
        },
        {
          text: "Write a one-page memo with last quarter's incident costs",
          bucket: 'constructive',
          why: 'It turns a feeling into an argument others can review and challenge.',
        },
        {
          text: 'Propose keeping one engineer on reliability for a quarter, and measure it',
          bucket: 'constructive',
          why: 'A cheap experiment that could prove you right, or wrong.',
        },
        {
          text: 'Say nothing in the meeting, then complain about it at lunch',
          bucket: 'passive',
          why: 'The people who decided never hear the concern; your teammates hear it constantly.',
        },
        {
          text: 'Agree in the meeting, then quietly slow-walk the feature',
          bucket: 'passive',
          why: "Fake commitment. It's worse than open disagreement, because nobody can respond to it.",
        },
        {
          text: "Decide it's above your pay grade and stop thinking about it",
          bucket: 'passive',
          why: 'Fine for trivia, not for something you believe is a real mistake.',
        },
        {
          text: 'Email the CEO about it without telling your manager',
          bucket: 'aggressive',
          why: 'Escalating can be right. Going around your manager without warning burns trust and the next conversation.',
        },
        {
          text: 'Post a critique of the decision in the company-wide channel',
          bucket: 'aggressive',
          why: 'Public pressure before a private conversation turns a disagreement into a fight.',
        },
        {
          text: 'Refuse to work on the feature until reliability is funded',
          bucket: 'aggressive',
          why: "Refusal is a lever for principles, not for a priority call you'd have made differently.",
        },
      ],
      explanation:
        'Constructive responses share three traits: private before public, evidence over volume, and a path that could show you were wrong. Passive ones hide the disagreement. Aggressive ones skip the steps that would have let it get resolved.',
    },
    {
      kind: 'concept',
      id: 'preference-principle',
      title: 'Preference or principle?',
      body:
        'Before you pick a channel, classify the disagreement.\n\n' +
        "**Preference**: you'd do it differently, and reasonable people could go either way. A framework, a roadmap order, an architecture.\n\n" +
        '**Principle**: someone gets hurt, a law or a promise is broken, or a safety line is crossed.\n\n' +
        'Raise a preference once, well, then commit. A principle earns persistence, and leaving is on the table.',
      callout: {
        tone: 'warn',
        text: "Most disagreements are preferences that feel like principles. If you can't name who gets hurt, it's probably a preference.",
      },
    },
    {
      kind: 'mcq',
      id: 'preference-scenario',
      eyebrow: 'Scenario',
      prompt:
        'Your team picked a message queue you think is the wrong fit. You made your case in the design review, with benchmarks. The tech lead heard you out and chose the other one. What now?',
      choices: [
        {
          text: 'Commit fully. Note your concern in the design doc and agree on a signal, say p99 over a threshold, that reopens it.',
          correct: true,
          feedback: 'Disagree and commit, done well. The revisit trigger turns your objection into a test instead of a grudge.',
        },
        {
          text: 'Keep raising it at standups and in retros until the team sees the problem; persistence shows you care about quality and long-term maintainability.',
          feedback: "You've had a fair hearing. Relitigating a preference wears out the team, and your credibility for the next disagreement.",
        },
        {
          text: 'Escalate to the director, since the tech lead may not have fully understood your benchmark results or what they imply.',
          feedback: 'Escalation is for principles or a broken process. A tech lead weighing your data and disagreeing is the process working.',
        },
        {
          text: 'Quietly build a prototype on your preferred queue over the weekend, so you can prove it later with real numbers.',
          feedback: "Data is good; a secret competing build isn't. If you want an experiment, propose it openly and time-box it.",
        },
      ],
      explanation:
        'This is a preference: reasonable engineers could pick either queue. You used the right channel, brought evidence and got a hearing. Now the most useful thing you can do is make the chosen option work, with an agreed trigger that brings your view back if the data turns.',
    },
    {
      kind: 'mcq',
      id: 'principle-scenario',
      eyebrow: 'Scenario',
      prompt:
        "Your manager asks you to ship logging that sends full user conversations to a third-party analytics vendor. The privacy policy doesn't mention it. You raised it 1:1, and they said *legal is fine with it, just ship it.* What now?",
      choices: [
        {
          text: "Don't ship yet. Ask to see the legal sign-off or check with the privacy team, and tell your manager you're doing it.",
          correct: true,
          feedback: 'A principle, so you persist, but through channels and in the open. You might be wrong about legal, and checking settles it.',
        },
        {
          text: 'Ship it. You raised the concern 1:1, your manager heard you and made the call, and that is what disagree and commit means.',
          feedback: 'Disagree and commit is for preferences. User data going somewhere users were never told about is a principle question, and *legal is fine* is a claim you can check.',
        },
        {
          text: "Refuse to ship it, and post in the company-wide channel so that leadership sees exactly what's happening before it goes out.",
          feedback: "Persistence is right; going public first isn't. There's a direct channel, privacy or legal, that you haven't tried yet.",
        },
        {
          text: 'Ship it, but quietly strip the message content out of the payload first, so that nothing sensitive actually leaves the building.',
          feedback: 'A secret workaround swaps one undisclosed decision for another. Make the disagreement visible instead.',
        },
      ],
      explanation:
        "This is a principle: users' data could go somewhere they weren't told about. That justifies going past your manager, but openly, and to the people who can actually answer the question. Notice that the strong move still allows that you might be wrong.",
    },
    {
      kind: 'match',
      id: 'commit-escalate-leave',
      eyebrow: 'Match',
      prompt: 'Match each response to the situation it fits.',
      pairs: [
        { left: 'Disagree and commit', right: 'A preference, argued well and decided fairly' },
        { left: 'Commit, with a revisit trigger', right: 'You lost the argument, but data could still settle it' },
        { left: 'Keep escalating', right: 'A principle, with channels still untried' },
        { left: 'Leave', right: "A principle, channels spent, and you can't do the work in good conscience" },
      ],
      explanation:
        "Persistence isn't a personality trait; it's a response to stakes. The same engineer should commit quickly on a framework choice and keep pushing on a privacy problem. Leaving is the last rung, for principles only, and it's worth knowing where your line is before someone asks.",
    },
    {
      kind: 'concept',
      id: 'what-they-want',
      title: 'What the interviewer is listening for',
      body:
        'In a disagreement story, five things carry the signal:\n\n' +
        '- **You raised it**, rather than staying quiet\n' +
        '- **Constructively**: right channel, private before public\n' +
        '- **With evidence**: data, not volume\n' +
        '- **Allowing you could be wrong**: their reasoning, stated fairly\n' +
        '- **Reflection on the outcome**: were you right, and how do you know?\n\n' +
        'Expect a follow-up on the last one.',
      callout: {
        tone: 'insight',
        text:
          "Interview coaches and 2026 press coverage report that evaluators value holding complexity, admitting what you don't know and sticking to unpopular convictions, and mark down stated values that don't match past behavior.",
      },
    },
    {
      kind: 'compare',
      id: 'villain-steelman',
      eyebrow: 'Which is stronger?',
      question: "*Tell me about a time you disagreed with your company's direction.*",
      a:
        "Leadership decided to sunset our self-hosted product. I thought we'd lose our most regulated customers and wrote a memo with renewal data. Their case was real: self-hosted took a third of engineering for 8% of revenue. We lost two accounts and shipped twice as fast. I'd call it right, but too abrupt for customers.",
      b:
        'Leadership decided to sunset our self-hosted product to push everyone to cloud. Honestly, it was a pure revenue grab dressed up as strategy. I told them it would alienate our best customers, they ignored engineering as usual, and sure enough we lost two big accounts. A lot of good engineers left within the year, me included.',
      better: 'a',
      explanation:
        "B has a villain, a vindication and an exit, and no sign the candidate understood the other side. A states leadership's reasoning in terms they would agree with, shows the channel and the evidence, and gives a split verdict. Both stories include the lost accounts. Only A treats them as data rather than proof.",
    },
    {
      kind: 'interview',
      id: 'were-you-right',
      eyebrow: 'Interview sim',
      setup: 'Culture round. The interviewer is taking notes and has just moved on from small talk.',
      turns: [
        {
          interviewer: 'Tell me about a time you disagreed with the direction your company took.',
          options: [
            {
              text: 'Leadership moved us to weekly releases by cutting the staging soak from five days to one. I expected incidents to jump. I got the goal, faster customer feedback, but thought they were cutting the wrong thing.',
              quality: 'strong',
              feedback: 'The decision, your view, and their goal stated fairly, all before a word about what you did.',
            },
            {
              text: 'Leadership pushed weekly releases because a VP wanted to look fast in front of the board. Engineering saw the problems coming a mile away, but honestly nobody upstairs was interested in hearing any of it from us.',
              quality: 'weak',
              feedback: 'A villain and a guess at motives. The interviewer learns more about how you talk about leaders than about the decision.',
            },
            {
              text: 'We moved to weekly releases, and I had real concerns about quality. I think a lot of the engineers did. It was a big change for the whole team at the time.',
              quality: 'okay',
              feedback: 'Accurate but thin. What exactly did you think would go wrong, and what was leadership trying to achieve?',
            },
          ],
        },
        {
          interviewer: 'What did you actually do about it?',
          options: [
            {
              text: "I raised it with my manager a couple of times and mentioned it again in our retro. In the end it was leadership's call to make, so I went along with it.",
              quality: 'okay',
              feedback: 'You raised it, which counts. But there was no evidence or proposal, and *went along with it* sounds more like resignation than commitment.',
            },
            {
              text: 'Not much, honestly. It was clearly a done deal by the time I heard about it, so I focused on my own work and made sure my own changes were solid.',
              quality: 'weak',
              feedback: "Staying quiet about something you expected to cause incidents is the passive ditch. Interviewers will read it as how you'd behave inside.",
            },
            {
              text: 'I asked my manager what was driving it, then wrote a one-pager with six months of incident data: keep the long soak for schema and auth changes only. They took schema, not auth. I committed.',
              quality: 'strong',
              feedback: 'Understanding first, then evidence, a concrete proposal, a partial win, and real commitment afterward.',
            },
          ],
        },
        {
          interviewer: 'Looking back, were you right?',
          options: [
            {
              text: 'Yes. Incidents went up in that first quarter, exactly as I said they would in my memo, which pretty much proved my point to everyone involved.',
              quality: 'weak',
              feedback: "This cherry-picks the half that flatters you. If the story continued past that quarter, they'll ask, and you'll be caught.",
            },
            {
              text: "Half. Incidents rose for a quarter, so the risk was real. Then they fell below the old rate once rollbacks got faster, which I hadn't priced in. Rollback speed mattered more than soak time.",
              quality: 'strong',
              feedback: "A split verdict with evidence, and a sharper model than you started with. That's what *were you right?* is fishing for.",
            },
            {
              text: "It's hard to say, honestly. There were a lot of other factors in play that year, like team changes and a new on-call rotation, so it's difficult to isolate which one actually made the difference.",
              quality: 'okay',
              feedback: 'Sometimes true, but it ducks the question. Give your best guess, with the evidence on each side.',
            },
          ],
        },
      ],
      wrapUp:
        "The strong path never needed you to be right. It needed the other side stated fairly, a channel and evidence, real commitment once the call was made, and an honest score on your prediction, including the part you got wrong.",
    },
    {
      kind: 'mcq',
      id: 'anthropic-version',
      eyebrow: 'Now at Anthropic',
      prompt:
        'A write-up of a Sep 2026 values round lists this possible follow-up: *Suppose you joined and strongly disagreed with a company safety decision. What would you do?* Which answer is strongest?',
      choices: [
        {
          text: "Learn the reasoning first; I may lack context. If I still disagree, argue in writing with evidence, escalating if it's a real safety issue. And know my line beforehand.",
          correct: true,
          feedback: 'Understand, argue, escalate by stakes, and a line named in advance. It shows a process, and it allows for being wrong. Expect the follow-up: *so where is your line?*',
        },
        {
          text: "I'd trust the decision. Leadership has far more context on safety than a new engineer does, and second-guessing them from outside the room wouldn't really help anyone.",
          feedback: 'Blind deference. It suggests you would stay quiet in exactly the situation the question describes.',
        },
        {
          text: "I'd raise it publicly. If it's really a safety issue, then people outside the company deserve to know about it right away, not after an internal process drags on.",
          feedback:
            "Going outside isn't always wrong: California's SB 53 (signed Sep 2025, endorsed by Anthropic) includes whistleblower protections. But going public first, before you even know the reasoning, skips every channel that could resolve it.",
        },
        {
          text: "I'd leave. I wouldn't want to work somewhere that made safety decisions I strongly disagreed with, so for me that would be a clear dealbreaker, full stop.",
          feedback: 'Exit as the first move, not the last. It also implies you expect to agree with every decision, which nobody does.',
        },
      ],
      explanation:
        'Same structure as any disagreement: understand, argue with evidence, match persistence to stakes. Anthropic\'s published values (company page, accessed Oct 2026) say the mission is "the final arbiter in our decisions" and that "none of us are bystanders." You can cite that as a reason you would speak up. It is a stated norm, not a promise about how any one disagreement goes, so your answer should not depend on it.',
    },
    {
      kind: 'reflect',
      id: 'your-disagreement',
      eyebrow: 'Story Bank',
      prompt: 'Write your answer to *Tell me about a time you disagreed with the direction of your company or team.*',
      guidance:
        "Pick a real disagreement, ideally one where you weren't entirely right. Classify it as preference or principle. State the other side's reasoning so they would agree with it, name the channel and the evidence you used, and end with an honest verdict on whether you were right.",
      rubric: [
        'Names the decision and what you actually thought at the time',
        "States the other side's reasoning fairly, with no villain",
        'Names the channel you used and the evidence you brought',
        'Says what you did after the decision: committed, escalated or left',
        'Gives an honest verdict on whether you were right, with evidence',
      ],
      slot: 'disagree-company',
      placeholder: 'The decision was … and I thought …',
    },
    {
      kind: 'concept',
      id: 'recap',
      title: 'Keep three things',
      body:
        '1. **Classify first.** Preference: raise it once, well, then commit, ideally with a revisit trigger. Principle: persist through channels, and know your line.\n' +
        "2. **Private, evidenced, open to being wrong.** Ask what you're missing before you make your case.\n" +
        '3. **Tell it without a villain**, and score yourself honestly on *were you right?*',
    },
  ],
  cards: [
    {
      id: 'values-disagree.pref-principle',
      skill: 'values.disagreement',
      kind: 'sort',
      prompt: 'Preference or principle? Sort each disagreement.',
      buckets: [
        { id: 'preference', label: 'Preference' },
        { id: 'principle', label: 'Principle' },
      ],
      items: [
        { text: "The team picked React; you'd have picked Svelte", bucket: 'preference' },
        { text: 'The roadmap puts search ahead of billing', bucket: 'preference' },
        { text: "We're moving from microservices back to a monolith", bucket: 'preference' },
        { text: 'Release notes will leave out a known data-loss bug', bucket: 'principle' },
        { text: 'Customer data will be kept after users asked for deletion', bucket: 'principle' },
        { text: "Sales will promise an uptime SLA engineering knows it can't meet", bucket: 'principle' },
      ],
      explanation: 'Principles have a victim or a broken promise: users misled, data mishandled, customers sold something false. Preferences are judgment calls reasonable engineers could make either way.',
    },
    {
      id: 'values-disagree.channels',
      skill: 'values.disagreement',
      kind: 'flash',
      front: 'List the usual escalation path for a disagreement, lowest cost first.',
      back: '1:1 with the decision-maker (ask, then argue); a written proposal; data or a small experiment; escalation, after telling your manager; exit, for principles only. Urgent harm can skip straight to escalation.',
    },
    {
      id: 'values-disagree.when-not-commit',
      skill: 'values.disagreement',
      kind: 'mcq',
      prompt: 'When is *disagree and commit* the wrong response?',
      choices: [
        {
          text: "When it's a principle, like harm to users or a legal line, and channels remain untried",
          correct: true,
          feedback: 'Right. Committing to a principle violation because you were overruled once is not what the norm is for.',
        },
        {
          text: 'When you have data supporting your view and the decision-maker still disagrees',
          feedback: 'If you got a fair hearing on a preference, commit anyway. Data can earn a revisit trigger, not a veto.',
        },
        {
          text: 'When the decision will take more than a quarter to reverse if it turns out wrong',
          feedback: 'Hard reversal raises the stakes of arguing well before the call. After a fair hearing on a preference, you still commit.',
        },
        {
          text: 'When the person who made the decision is more junior than you, or newer to the team',
          feedback: 'Seniority is irrelevant. What matters is whether it is a preference or a principle, and whether you were heard.',
        },
      ],
      explanation: 'Disagree and commit is for preferences after a fair hearing. Principles, where someone gets hurt or a promise is broken, justify persistence through further channels.',
    },
    {
      id: 'values-disagree.score-yourself',
      skill: 'values.disagreement',
      kind: 'compare',
      question: 'You argued against a migration two years ago, and it was later reversed. *Looking back, were you right?*',
      a: 'Yes. They reversed the decision eighteen months later, which vindicated what I had been saying all along. Honestly, I think the team should have listened to me much earlier.',
      b: 'Partly. It was reversed eighteen months later, but over cost, not the reliability risk I had argued about. My concern was real; it just was not the one that mattered.',
      better: 'b',
      explanation: 'A treats the reversal as proof. B checks whether the reversal happened for the reason the candidate predicted, which is the honest test, and finds it only partly did.',
    },
    {
      id: 'values-disagree.ditches',
      skill: 'values.disagreement',
      kind: 'match',
      prompt: 'Match each disagreement-story move to what it signals.',
      pairs: [
        { left: '"I\'ve never really disagreed with leadership"', right: 'No independent views, or unwilling to share them' },
        { left: '"Leadership was wrong and I was right"', right: 'No grasp of the other side' },
        { left: 'Agreed in the meeting, then slow-walked it', right: 'Fake commitment nobody can respond to' },
        { left: 'Emailed the CEO without telling my manager', right: 'Escalation that burns trust' },
      ],
      explanation: 'Each move fails in its own way: silence, villainy, fake commitment, skipped channels. The strong story avoids all four.',
    },
    {
      id: 'values-disagree.steelman-test',
      skill: 'values.disagreement',
      kind: 'flash',
      front: "In a disagreement story, how can you tell whether you've stated the other side's reasoning fairly?",
      back: 'They would sign your summary of it. If your version of their reasoning is "they wanted to look good" or "they didn\'t understand", it is a villain story, not a steelman.',
    },
    {
      id: 'values-disagree.principle-test',
      skill: 'values.disagreement',
      kind: 'mcq',
      prompt: 'What is a quick test for whether a disagreement is a preference or a principle?',
      choices: [
        {
          text: 'Can you name who gets hurt, or which law or promise gets broken?',
          correct: true,
          feedback: 'Yes. If there is no identifiable harm or broken commitment, it is very likely a preference.',
        },
        {
          text: 'How strongly do you feel about it, on a scale of one to ten?',
          feedback: 'Preferences can feel very strong. Intensity of feeling is not the test.',
        },
        {
          text: 'Does your manager agree with you that it is serious?',
          feedback: 'Their view matters for the channel, not the classification. Managers can be wrong in either direction.',
        },
        {
          text: "Does it affect your own team's roadmap or workload?",
          feedback: 'Being affected makes it personal, not principled. Many preferences land on your own roadmap.',
        },
      ],
      explanation: 'A principle has a victim or a broken commitment you can name. Everything else is a judgment call: raise it once, well, then commit.',
    },
  ],
}

export default lesson
