import type { Lesson } from '../../core/types'

const lesson: Lesson = {
  id: 'values-self',
  title: 'Dislikes, failures, limits',
  summary:
    'Answer "work you dislike", "a real failure" and "what would your manager say" with specifics, your part named plainly, and evidence that you changed.',
  minutes: 8,
  skills: ['values.self-knowledge', 'values.antipatterns'],
  steps: [
    {
      kind: 'concept',
      id: 'hook',
      eyebrow: 'Culture round',
      title: 'The safest answer is the riskiest',
      body:
        '*What kind of work do you dislike?*\n\n' +
        '*Honestly, I enjoy pretty much everything.*\n\n' +
        "It sounds safe. It reads as one of two things: you don't know yourself, or you won't say. Questions about dislikes, failures and limits test the same thing: ==will you tell the truth when it's unflattering?== A specific, slightly uncomfortable answer beats a polished empty one.",
      callout: {
        tone: 'insight',
        text: 'Candidates report culture-round prompts like *When did you realize you were wrong?* and *Tell me about a time you received negative feedback*, and hiring-manager rounds asking which projects you liked and disliked. Prep write-ups list rehearsed STAR stories, and a gap between stated values and past behavior, among the reported failure modes.',
      },
    },
    {
      kind: 'sort',
      id: 'honest-or-evasive',
      eyebrow: 'First instinct',
      prompt: 'Sort each answer.',
      buckets: [
        { id: 'honest', label: 'Honest' },
        { id: 'evasive', label: 'Evasive' },
      ],
      items: [
        {
          text: "I'm a perfectionist, so sometimes I care too much about quality.",
          bucket: 'evasive',
          why: 'A humblebrag: a virtue in a flaw costume.',
        },
        {
          text: 'I dislike open-ended migrations. Around week three I lose focus, so I set myself weekly demos.',
          bucket: 'honest',
          why: 'Specific, with a cost and a system for handling it.',
        },
        {
          text: 'The project failed because product kept changing the requirements.',
          bucket: 'evasive',
          why: 'Maybe true, but your part is missing entirely.',
        },
        {
          text: 'I shipped the config change without a canary. My call, and checkout was down for 40 minutes.',
          bucket: 'honest',
          why: 'Your part in one plain sentence, with the cost.',
        },
        {
          text: "I don't really have work I dislike. I'm very adaptable.",
          bucket: 'evasive',
          why: "Everyone dislikes something. This says you won't tell.",
        },
        {
          text: "My manager would say I'm slow to delegate. She's right: I held on to on-call too long last quarter.",
          bucket: 'honest',
          why: 'The critique in their words, plus evidence it is real.',
        },
        {
          text: 'My biggest weakness is that I work too hard.',
          bucket: 'evasive',
          why: 'The oldest humblebrag there is.',
        },
        {
          text: "I'm weaker at frontend work. I can do it, but slowly, so I pair on it.",
          bucket: 'honest',
          why: 'A real limit, sized, with how you handle it.',
        },
      ],
      explanation:
        "Honest answers are specific, cost you something to say, and come with what you do about it. Evasive answers protect you and tell the interviewer nothing, or worse, that you're managing them.",
    },
    {
      kind: 'concept',
      id: 'dislike-shape',
      title: 'Work you dislike, in four parts',
      body:
        "1. **The honest answer, specifically**: not *boring tasks* but *documenting systems I didn't build*.\n" +
        '2. **Why**: what about it drains you.\n' +
        "3. **How you handle it** when it's needed anyway: a system, not willpower.\n" +
        '4. **What it says** about where you do your best work.\n\n' +
        'Expect the follow-up *What if this role is 30% that?* Answer it honestly too.',
    },
    {
      kind: 'compare',
      id: 'dislike-compare',
      eyebrow: 'Which is stronger?',
      question: 'What kind of work do you dislike?',
      a: "Long documentation passes on systems I didn't build. After an hour I stop being careful. When it's needed I timebox it into 45-minute blocks and pair with the owner, which also makes the docs better. It tells me I work best building or debugging something live.",
      b: "Honestly, I don't mind most work. If it needs doing, I'll do it. Maybe meetings, like everyone? But I understand they're necessary, so I try not to complain about them and just get on with it. Attitude matters more than preferences.",
      better: 'a',
      explanation:
        'A is specific, admits a real cost (*I stop being careful*), shows a system for handling it, and draws a conclusion about fit. B picks the one dislike everyone shares, then takes it back.',
    },
    {
      kind: 'concept',
      id: 'failure-shape',
      title: 'Failure: name your part plainly',
      body:
        'A failure story turns on one sentence: your part, with *I* as the subject and an active verb. *I shipped it without a canary.* Not *mistakes were made*, not *we*, not *the process*.\n\n' +
        'Then what you thought at the time, what it cost others, what you changed, and ==evidence the change stuck==.',
      callout: {
        tone: 'source',
        text: 'Organizations can do this too. Anthropic\'s RSP updates page notes evaluations "completed 3 days later than the 3-month interval", and its Sep 2026 incidents post said pre-release auditing had missed the problems. Sources: [RSP updates](https://www.anthropic.com/rsp-updates); [incidents post](https://www.anthropic.com/news/alignment-assessment-cybersecurity-incidents).',
      },
    },
    {
      kind: 'mcq',
      id: 'spot-antipatterns',
      eyebrow: 'Spot the anti-pattern',
      multi: true,
      prompt:
        'A candidate answers *Tell me about a failure*:\n\n' +
        '> The launch slipped three weeks. Our PM kept changing the spec, and QA was understaffed, so bugs got through. Honestly, I probably cared too much about getting it perfect. Anyway, it shipped and customers were happy.\n\n' +
        'Which anti-patterns does it contain? Select all that apply.',
      choices: [
        {
          text: 'Blaming others for the outcome',
          correct: true,
          feedback: "The PM and QA carry the whole failure. The candidate's own part never appears.",
        },
        {
          text: 'A humblebrag dressed up as a flaw',
          correct: true,
          feedback: '*I cared too much about getting it perfect* is a virtue in costume.',
        },
        {
          text: 'No lesson or change named',
          correct: true,
          feedback: '*Anyway, it shipped* closes the story without saying what changed afterwards.',
        },
        {
          text: 'Too much technical detail',
          feedback: 'There is almost none. Specific technical detail would actually help.',
        },
        {
          text: 'Being too hard on themselves',
          feedback: 'The opposite. Nothing in it is self-critical except the humblebrag.',
        },
      ],
      explanation:
        "Three anti-patterns in four sentences, and all of them protect the candidate. A rewrite: *I didn't push back on spec changes after code freeze, so I absorbed them and we slipped three weeks. Now I keep a post-freeze change log and make each tradeoff visible to the PM.*",
    },
    {
      kind: 'match',
      id: 'antipattern-match',
      eyebrow: 'Name it',
      prompt: 'Match each anti-pattern to the line that gives it away.',
      pairs: [
        { left: 'Humblebrag', right: '*My standards are just too high.*' },
        { left: 'Blame shift', right: '*Infra never gave us the capacity.*' },
        { left: 'Villain coworker', right: "*My lead just wasn't very good.*" },
        { left: 'No lesson', right: '*Anyway, it all worked out.*' },
        { left: 'Fake weakness', right: '*I struggled with Git as an intern.*' },
        { left: 'Ownership fog', right: '*Mistakes were made in the rollout.*' },
      ],
      explanation:
        'Each one protects you, and each costs more than the honest version would. The villain coworker is the riskiest: it tells the interviewer how you will describe *them* one day. A fake weakness is real but long fixed or irrelevant, so it reveals nothing.',
    },
    {
      kind: 'concept',
      id: 'manager-says',
      title: 'What would your last manager say?',
      body:
        'This is a consistency check. Candidates report references being requested after the onsite, so assume the real version can surface.\n\n' +
        "Give the critique you've actually heard, in their words if you can, then what you did about it and where you still slip. If you've never had critical feedback, ask for some before your loop.",
    },
    {
      kind: 'mcq',
      id: 'manager-mcq',
      eyebrow: 'Your move',
      prompt: '*What would your last manager say is your biggest area for growth?* Best answer?',
      choices: [
        {
          text: "She'd say I'm slow to hand things off; her words were 'bottleneck on deploys'. I've handed two systems over since, and still catch myself.",
          correct: true,
          feedback: 'Quotes the critique, shows action, and admits it is not fully fixed. That last clause makes it believable.',
        },
        {
          text: "She'd probably say I take on too much, because I care so much about the team and really hate seeing anyone overloaded.",
          feedback: 'A humblebrag. If a reference later says something different, this answer looks managed.',
        },
        {
          text: "Honestly, we got on really well, and I don't think she had any real criticism of my work, at least none that I can remember.",
          feedback: "Implausible, and risky if references are checked. Every manager has a growth area in mind for their reports.",
        },
        {
          text: "She'd say I could communicate more, but to be fair, she wasn't great at giving clear direction to the team either.",
          feedback: 'Half an answer, then a counterattack. The interviewer hears how you will talk about your next manager.',
        },
      ],
      explanation:
        'The strong answer is the one that could survive a reference call: their words, your action, and an honest *not done yet*.',
    },
    {
      kind: 'interview',
      id: 'self-sim',
      eyebrow: 'Interview sim',
      setup: 'Culture round, 40 minutes in. The interviewer has been warm so far. Now the questions get personal.',
      turns: [
        {
          interviewer: 'What kind of work do you dislike doing?',
          options: [
            {
              text: "I don't really dislike anything. Every task is a chance to learn something, and I try to bring the same energy to all of it.",
              quality: 'weak',
              feedback: 'No one believes it, and it signals you will manage the interviewer rather than talk to them.',
            },
            {
              text: 'Repetitive manual work, mostly. When I spot it, I usually write a script to automate it, so nobody on the team ever has to do it again.',
              quality: 'okay',
              feedback: 'Common, and edging toward a humblebrag (*I fix it for everyone*). What about the work you cannot automate away?',
            },
            {
              text: "Long, open-ended migrations. Around week three I lose focus and get sloppy, so I break them into weekly demos and pair for the tedious stretches. I'm at my best on shorter, sharper problems.",
              quality: 'strong',
              feedback: 'Specific, admits a real cost, shows a system, and draws a conclusion about fit.',
            },
          ],
        },
        {
          interviewer: 'What if this role turned out to be about 30% migration work?',
          options: [
            {
              text: "Then I'd want to know now. At 30% I'd do it well with the system I described. Past half, I'd do it worse, and I'd tell my manager early. Is it closer to 30% or more?",
              quality: 'strong',
              feedback: 'Honest about the limit, specific about the threshold, and turns it into a real question about the role.',
            },
            {
              text: "Oh, honestly I don't mind it that much. I was probably overstating it a bit earlier. I'm sure it would be fine once I got going.",
              quality: 'weak',
              feedback: 'Retracting under the lightest pressure. Now the interviewer does not know which answer to believe.',
            },
            {
              text: "That's fine. I'm adaptable, and I'd find a way to make it work. Every role has parts that aren't your favorite, after all.",
              quality: 'okay',
              feedback: 'Not wrong, but it ducks the question. How would you make it work, and where is your limit?',
            },
          ],
        },
        {
          interviewer: 'Tell me about something that went badly and was your fault.',
          options: [
            {
              text: 'We had an outage once after a config change. It was a real learning moment for the team, and afterwards we added canaries to the deploy process.',
              quality: 'okay',
              feedback: 'True, but *we* is doing a lot of work. Whose change was it?',
            },
            {
              text: "I pushed a config change on a Friday without a canary. I thought it was trivial. Checkout was down for 40 minutes. I added canaries to our deploy tool, and they've caught two bad configs since.",
              quality: 'strong',
              feedback: 'Your part in one sentence, what you thought, the cost, the change, and evidence it stuck.',
            },
            {
              text: 'Our release process was broken, honestly. Someone on another team approved my change without really looking at it, and it went straight out.',
              quality: 'weak',
              feedback: 'A blame shift plus a villain. Even if every word is true, it is the story shape interviewers listen for.',
            },
          ],
        },
      ],
      wrapUp:
        "Specific beats polished, owned beats explained, and a limit you manage beats a limit you deny. The interviewer isn't hunting for a flawless candidate. They're checking that you can see yourself clearly and say it out loud.",
    },
    {
      kind: 'reflect',
      id: 'dislike-work',
      eyebrow: 'Story Bank',
      prompt: 'Write your answer to *What kind of work do you dislike doing?*',
      guidance:
        "Pick something true and specific, ideally work an engineer in this role might really have to do. Say why it drains you, the system you use when it's needed anyway, and what it says about where you do your best work. Then answer the follow-up: what if the role is 30% that?",
      rubric: [
        "Names a specific kind of work, not a category like 'boring tasks'",
        'Explains why it drains you',
        "Describes a concrete way you handle it when it's needed",
        'Says what it implies about where you do your best work',
        'Contains no humblebrag',
      ],
      slot: 'dislike-work',
      placeholder: 'The work I find hardest to stay sharp on is …',
    },
    {
      kind: 'reflect',
      id: 'failure',
      eyebrow: 'Story Bank',
      prompt: 'Write your answer to *Tell me about something that went badly and was your fault.*',
      guidance:
        'Choose something with a real cost, where your part is clear. Write your part as one sentence with *I* as the subject. Then add what you thought at the time, what it cost others, what you changed, and the evidence that the change stuck.',
      rubric: [
        'States your part in one sentence, with I as the subject',
        'Says what you thought at the time, not just in hindsight',
        'Names the cost to others',
        'Describes what you changed, with evidence it stuck',
        'Shifts no blame and makes no one a villain',
      ],
      slot: 'failure',
      placeholder: 'I …',
    },
    {
      kind: 'concept',
      id: 'recap',
      title: 'Keep three things',
      body:
        "1. **Specific and slightly uncomfortable** beats polished and empty. Everyone has dislikes and failures. The question is whether you'll say them.\n" +
        '2. **Own it in one sentence**: *I* plus an active verb, then the change and the evidence it stuck.\n' +
        '3. **Assume the real version surfaces.** Give the critique your manager actually gave you, and what you did with it.',
    },
  ],
  cards: [
    {
      id: 'values-self.dislike-parts',
      skill: 'values.self-knowledge',
      kind: 'flash',
      front: 'What are the four parts of a strong answer to *What work do you dislike?*',
      back: "The specific dislike; why it drains you; how you handle it when it's needed anyway; what it says about where you do your best work.",
    },
    {
      id: 'values-self.ownership-line',
      skill: 'values.antipatterns',
      kind: 'mcq',
      prompt: 'Which sentence owns a failure best?',
      choices: [
        {
          text: 'I approved the migration without a rollback plan.',
          correct: true,
          feedback: '*I*, an active verb, and the specific mistake.',
        },
        { text: 'Mistakes were made during the migration.', feedback: 'Ownership fog: the passive voice hides who made them.' },
        { text: 'We, as a team, could have planned the migration better.', feedback: "*We* spreads your part so thin it disappears." },
        { text: 'The migration tooling let us down at the worst moment.', feedback: 'A blame shift onto the tools.' },
      ],
      explanation: 'One sentence, *I* as the subject, the specific act. Everything else in a failure story hangs off it.',
    },
    {
      id: 'values-self.fixes',
      skill: 'values.antipatterns',
      kind: 'match',
      prompt: 'Match each anti-pattern to its fix.',
      pairs: [
        { left: 'Humblebrag', right: 'Name a flaw that costs something' },
        { left: 'Blame shift', right: 'State your own part first' },
        { left: 'No lesson', right: 'Say what changed and show it stuck' },
        { left: 'Villain coworker', right: 'Give their side fairly' },
      ],
      explanation:
        'Each fix replaces self-protection with information the interviewer can use: a real cost, your part, a change, a fair picture of others.',
    },
    {
      id: 'values-self.manager',
      skill: 'values.self-knowledge',
      kind: 'compare',
      question: 'What would your last manager say about you?',
      a: "That I'm reliable and hardworking, and always willing to help others on the team. Honestly, I think she'd struggle to name a real weakness.",
      b: "That I ship fast but under-communicate. In my last review she said she learned about a risky change from the incident channel. I now post a heads-up before anything risky. She'd say it's better, not solved.",
      better: 'b',
      explanation:
        'B gives the critique in concrete terms, the change, and an honest status. A could be true and still sounds managed, and a reference call could contradict it.',
    },
    {
      id: 'values-self.honest-evasive',
      skill: 'values.self-knowledge',
      kind: 'sort',
      prompt: 'Honest or evasive?',
      buckets: [
        { id: 'honest', label: 'Honest' },
        { id: 'evasive', label: 'Evasive' },
      ],
      items: [
        { text: 'I avoid conflict too long. Last year I let a design issue slide for a month.', bucket: 'honest' },
        { text: "My weakness is that I'm too detail-oriented.", bucket: 'evasive' },
        { text: "The outage happened because ops didn't read my runbook.", bucket: 'evasive' },
        { text: 'I find on-call draining, so I prep runbooks before every shift.', bucket: 'honest' },
        { text: "Honestly, I can't think of a real failure.", bucket: 'evasive' },
      ],
      explanation: 'Honest answers name a specific cost and what you do about it. Evasive ones are humblebrags, blame, or a blank.',
    },
    {
      id: 'values-self.manager-why',
      skill: 'values.self-knowledge',
      kind: 'flash',
      front: 'Why do interviewers ask *What would your last manager say?*',
      back: "It's a consistency check, and candidates report references being requested late in the process. Give the critique you've actually heard, in their words, plus what you did about it and where you still slip.",
    },
    {
      id: 'values-self.which-failure',
      skill: 'values.self-knowledge',
      kind: 'mcq',
      prompt: 'Which failure is the best one to bring to a culture round?',
      choices: [
        {
          text: 'An outage your config change caused, which led you to add canaries you still use.',
          correct: true,
          feedback: 'A real cost, a clear part that was yours, and a change you can show stuck.',
        },
        {
          text: 'A README typo you noticed and fixed within minutes of merging it.',
          feedback: 'Too small to cost anything, so it reads as a dodge.',
        },
        {
          text: 'A project that failed after leadership cancelled its funding midway.',
          feedback: 'Not your fault, so it cannot answer the question.',
        },
        {
          text: 'A launch that slipped because another team missed its deadline.',
          feedback: 'Your part is missing. The story is about them.',
        },
      ],
      explanation: 'Pick a failure with a real cost, a clear part that was yours, and a change you can show stuck.',
    },
  ],
}

export default lesson
