import type { Lesson } from '../../core/types'

const lesson: Lesson = {
  id: 'values-probes',
  title: 'What the culture round probes',
  summary:
    'Learn the questions that drill past a rehearsed story, what each one is testing, and why agreeing with everything is the riskiest strategy.',
  minutes: 8,
  skills: ['values.judgment', 'values.antipatterns'],
  steps: [
    {
      kind: 'concept',
      id: 'hook',
      eyebrow: 'Culture round',
      title: 'The second question',
      body:
        "You've polished a story. A tense launch, you raised a concern, aligned the stakeholders, shipped on time. Ninety seconds, clean ending.\n\n" +
        "The interviewer nods, then asks: *What did you actually think at the time, before you'd decided anything?* And then: *How do you feel about it now?*\n\n" +
        'Your script has no line for either. That gap is what this round is built to find.',
      callout: {
        tone: 'source',
        text:
          'Recruiters quoted in coverage of a May 2026 Bloomberg Businessweek feature say the culture interview, which has no coding, is where most strong candidates wash out. [implicator.ai summary](https://www.implicator.ai/at-anthropic-the-culture-interview-is-the-top-late-stage-hiring-gate/)',
      },
    },
    {
      kind: 'concept',
      id: 'reported-probes',
      title: 'What candidates report hearing',
      body:
        'Candidate reports from 2025-2026 describe questions that start where an ordinary behavioral question stops:\n\n' +
        '- *Tell me about a time you built something against your values.* Then: *How were you feeling then? How do you feel now?*\n' +
        '- *Describe a strongly held view that proved wrong.*\n' +
        '- *How do you balance delivery speed with security concerns?*\n' +
        "- *What concerns do you have with Anthropic's mission or direction?*",
      callout: {
        tone: 'insight',
        text:
          'Reports describe follow-ups three or four levels deep. One candidate called it "almost like a therapy session"; another, "like a lawyer call, very interrogative." Axios (Aug 2026) reported that questions are suggested, not fully scripted, so wording varies by interviewer.',
      },
    },
    {
      kind: 'sort',
      id: 'story-or-probe',
      eyebrow: 'Sort',
      prompt: 'Does each question ask for the story, or for your judgment inside it?',
      buckets: [
        { id: 'story', label: 'Asks for the story' },
        { id: 'probe', label: 'Probes your judgment' },
      ],
      items: [
        {
          text: 'Tell me about a project you led from start to finish.',
          bucket: 'story',
          why: 'You can answer it by narrating events. A fine opener, and the place probes start from.',
        },
        {
          text: 'Describe a time you resolved a conflict on your team.',
          bucket: 'story',
          why: 'It invites a tidy arc with a happy ending. The probe comes next: what did you really think of the other person?',
        },
        {
          text: 'Tell me about a time you went above and beyond.',
          bucket: 'story',
          why: 'A request for a highlight reel. No judgment is needed to answer it.',
        },
        {
          text: "Before you'd decided anything, what did you actually think?",
          bucket: 'probe',
          why: 'It asks for your reasoning before hindsight tidied it up.',
        },
        {
          text: 'How do you feel about that decision now?',
          bucket: 'probe',
          why: 'It asks whether you have updated, and how honestly.',
        },
        {
          text: "When have you disagreed with your company's direction?",
          bucket: 'probe',
          why: 'It asks whether you form your own views, and what you do with them.',
        },
        {
          text: 'What kind of work do you dislike doing?',
          bucket: 'probe',
          why: 'Self-knowledge. There is no flattering answer, only an honest one.',
        },
        {
          text: "Would you support delaying a risky release if other labs wouldn't?",
          bucket: 'probe',
          why: 'A tradeoff with no safe answer, adapted from a reported Sep 2026 values-round question.',
        },
      ],
      explanation:
        'Story questions can be answered by narrating events. Probes ask for something only you have: what you thought, how sure you were, how you judge it now. Reports describe the round starting light and moving deeper, so expect story questions as the on-ramp and probes after. Rehearse for the probes.',
    },
    {
      kind: 'concept',
      id: 'star-breaks',
      title: 'Why the STAR script breaks',
      body:
        'STAR (Situation, Task, Action, Result) is built for story questions. It ends at Result, ideally a happy one.\n\n' +
        "Probes ask for what STAR leaves out: what you thought before acting, what you weren't sure of, what it cost, how you see it now.\n\n" +
        'A rehearsed story has a tell. It is smooth at the first level and has nothing at the third.',
      callout: {
        tone: 'warn',
        text:
          "Failure modes candidates and coaches report: pre-packaged STAR stories, rehearsed enthusiasm, reciting the mission, avoiding discomfort, and stated values that don't match past behavior.",
      },
    },
    {
      kind: 'compare',
      id: 'scripted-vs-reflective',
      eyebrow: 'Which is stronger?',
      question: 'You mentioned you shipped the migration anyway. *What did you actually think at the time?*',
      a:
        "I recognized the risk early, so I aligned with stakeholders on a phased rollout plan and made sure monitoring and alerting were in place. We delivered on schedule with zero customer-facing incidents. It reinforced how much clear communication and proactive risk management matter, and I've applied that lesson on every launch since.",
      b:
        "Honestly, I thought it wasn't ready, and I was annoyed I'd be the one paged. But my evidence was one flaky test, not enough to block it, so I asked for a feature flag. Looking back, the flag was right, but I should have said I was worried in the meeting, not in a DM afterward.",
      better: 'b',
      explanation:
        "A answers a different question. It restates the action and the result, which the interviewer already heard. B answers this one: the actual thought, including the unflattering part, how sure the candidate was and why, and a specific self-critique. Notice that the self-critique is small and concrete, not a humble-brag.",
    },
    {
      kind: 'concept',
      id: 'looking-for',
      title: 'What the probes are after',
      body:
        'A useful lens: strip away the wording, and most probes test one of five things.\n\n' +
        '- **Own judgment**: your reasoning, not the expected answer\n' +
        '- **Honesty**: including the part that makes you look worse\n' +
        '- **Calibration**: how sure you were, and on what evidence\n' +
        '- **Updating**: what changed your mind, and how far\n' +
        '- **Values in action**: what you did when it cost something',
      callout: {
        tone: 'tip',
        text: 'None of these needs a dramatic story. A small decision told honestly beats a heroic one told smoothly.',
      },
    },
    {
      kind: 'match',
      id: 'probe-targets',
      eyebrow: 'Match',
      prompt: 'Match each probe to what it is mainly testing.',
      pairs: [
        { left: '*What did you actually think at the time?*', right: 'Your judgment before hindsight' },
        { left: '*How do you feel about it now?*', right: "Whether you've updated, and how honestly" },
        { left: "*When have you disagreed with your company's direction?*", right: 'Whether you raise concerns, and how' },
        { left: '*What work do you dislike?*', right: 'Self-knowledge, told plainly' },
        { left: '*How do you balance speed against security?*', right: 'How you weigh risk under pressure' },
        { left: '*Where do you disagree with Anthropic?*', right: 'Independent views about the company itself' },
      ],
      explanation:
        'Each probe has a target, and knowing it tells you what belongs in the answer: the thought, the update, the channel, the honest dislike, the risk reasoning, the real disagreement. Wording varies by interviewer. The targets change much less.',
    },
    {
      kind: 'concept',
      id: 'agreement-trap',
      title: 'The agreement trap',
      body:
        'A common prep instinct: learn what Anthropic believes, then agree with all of it. Praise the mission, endorse every policy, call the RSP admirable.\n\n' +
        'It feels like the safe play in a culture interview. Before you try it, decide for yourself whether it is.',
      callout: {
        tone: 'source',
        text:
          'Daniela Amodei\'s own example question: "What are some of the slightly unusual beliefs you hold, and how have you defended them in uncomfortable situations because you felt they were right?" And: "We\'re not looking for a specific belief." (Bloomberg Businessweek, May 2026, via [GIGAZINE](https://gigazine.net/gsc_news/en/20260601-anthropic-recruiting))',
      },
    },
    {
      kind: 'mcq',
      id: 'blind-agreement',
      eyebrow: 'Check',
      prompt: 'Why is agreeing with every Anthropic position a weak strategy in the culture round?',
      choices: [
        {
          text: 'It hides what is being measured, your own judgment, and suggests you would stay quiet inside when something looked wrong.',
          correct: true,
          feedback:
            "Right. Blanket agreement gives the interviewer nothing to probe, and it predicts how you'd behave in a real disagreement, which is part of what they're hiring for.",
        },
        {
          text: 'Interviewers are told to reject candidates who agree with the mission, so you need at least one criticism ready.',
          feedback:
            "There's no evidence of a rule like that, and it would turn critique into a checkbox. Agreeing is fine when it's yours and you can say why.",
        },
        {
          text: 'Anthropic prefers candidates who are skeptical of AI safety, so agreement signals that you are a poor fit.',
          feedback: '"We\'re not looking for a specific belief" cuts both ways. A manufactured skeptic is performing too.',
        },
        {
          text: 'Agreement is fine in principle, but the answers run too short. Add more detail about the mission and it works.',
          feedback: 'More detail about the same flattery is still flattery. The missing piece is your reasoning, not their mission statement.',
        },
      ],
      explanation:
        "Agreement isn't the problem; *unexamined* agreement is. If you agree with a position, say why, name the strongest objection you know, and say what would change your mind. That's a view. Agreeing with everything on cue is a performance, and three follow-ups find the bottom of it.",
      hint: 'Think about what the interviewer can learn about you from an answer they could have predicted.',
    },
    {
      kind: 'mcq',
      id: 'anti-patterns',
      eyebrow: 'Select all',
      multi: true,
      prompt: 'A probing interviewer is listening for anti-patterns. Which of these would likely hurt you? Select all that apply.',
      choices: [
        {
          text: "A story you've told so often it comes out word for word, whatever the question was.",
          correct: true,
          feedback: "The rehearsed-STAR tell. It's smooth until the first follow-up, then empty.",
        },
        {
          text: "A sharp critique of Anthropic that you don't actually hold, chosen to sound independent.",
          correct: true,
          feedback: 'Manufactured disagreement collapses at the first *why do you think that?* It is the agreement trap in a different costume.',
        },
        {
          text: 'Saying you were about 60% sure at the time, and that part of you wanted to avoid the argument.',
          feedback: "This helps. It's calibrated and honest about motive, which is what probes are after.",
        },
        {
          text: "Saying you'd make exactly the same call again about every decision you describe.",
          correct: true,
          feedback: 'No updating, no self-knowledge. Candidates report being asked how they feel about decisions now, not only then.',
        },
        {
          text: "Pausing to say *I haven't thought about that; give me a second*, then reasoning out loud.",
          feedback: 'Fine, and often good. Admitting what you don\'t know is one of the things evaluators reportedly look for.',
        },
      ],
      explanation:
        'The three anti-patterns share a root: they are answers prepared to look good rather than answers that are true. The two that help share the opposite root: they show your thinking as it actually is, uncertainty included.',
    },
    {
      kind: 'interview',
      id: 'drill-sim',
      eyebrow: 'Interview sim',
      setup: 'Culture round, ten minutes in. The interviewer has been friendly so far. Now they lean in.',
      turns: [
        {
          interviewer: 'Tell me about a time you built something you had reservations about.',
          options: [
            {
              text: "We shipped a notification feature I wasn't fully comfortable with. I flagged my concerns to my manager, we talked them through, and in the end the team decided to go ahead with the launch.",
              quality: 'okay',
              feedback: 'A real story, but vague. What were the reservations, and who decided what? The next question will ask anyway.',
            },
            {
              text: 'Last year we shipped re-engagement notifications that tested well. My reservation: they reached users who had turned off other notification types. I raised it once, was overruled on the data, and shipped it.',
              quality: 'strong',
              feedback: 'Specific, with the reservation stated plainly. It also leaves an honest loose end, *raised it once*, that invites the next question.',
            },
            {
              text: "I've been lucky there, honestly. I've never had to build anything I didn't believe in, because I'm careful to pick teams and companies whose values match mine.",
              quality: 'weak',
              feedback: 'A dodge. Candidates report versions of this question being asked directly, and *never* reads as either no reflection or no candor.',
            },
          ],
        },
        {
          interviewer: 'What did you actually think, at the time?',
          options: [
            {
              text: "I thought it was important to support the team's decision once it was made. So I documented my concerns, backed the launch fully, and in the end we comfortably hit our engagement targets for the quarter.",
              quality: 'weak',
              feedback: 'This restates what you did and how it turned out. The question was what you *thought*.',
            },
            {
              text: "I thought it was somewhat risky for user trust. But the data was on the PM's side and opt-outs were flat, so going ahead seemed like a reasonable call to me.",
              quality: 'okay',
              feedback: 'Closer. *Somewhat risky* is still vague, though. How risky, how sure were you, and why stop at one objection?',
            },
            {
              text: 'That we were optimizing a metric against what users had told us. I was maybe 60% sure, and flat opt-outs cut against me. Honestly, part of me was relieved to skip the fight.',
              quality: 'strong',
              feedback: 'The real thought, a calibrated confidence, the evidence on the other side, and an unflattering motive. That last part is what makes it credible.',
            },
          ],
        },
        {
          interviewer: 'How do you feel about it now?',
          options: [
            {
              text: "Mixed. Opt-outs stayed flat, so I was partly wrong about harm. But next time I'd ask for a guardrail metric, like complaint rate, up front, and I'd push twice, not once.",
              quality: 'strong',
              feedback: "Where you were wrong, where you still stand, and what you changed. That's updating, not regret or self-justification.",
            },
            {
              text: "I'd do exactly the same thing again. The launch hit its numbers, the team was happy with it, nobody really complained, and the feature is still running today.",
              quality: 'weak',
              feedback: "A good outcome isn't evidence your reasoning was right. And *exactly the same* tells them you haven't reflected.",
            },
            {
              text: "Pretty good overall. It worked out fine in the end, though next time I'd probably communicate my concerns a bit more clearly, and a bit earlier, to the team.",
              quality: 'okay',
              feedback: 'Generic. *Communicate more clearly* fits any story. What, specifically, would you do differently?',
            },
          ],
        },
      ],
      wrapUp:
        "Each follow-up moved one layer in: what happened, what you thought, how you judge it now. The strong path didn't need a better story. It needed the honest one, with a number on how sure you were and a specific change you made afterward.",
    },
    {
      kind: 'reflect',
      id: 'audit-story',
      eyebrow: 'Your turn',
      prompt: "Pick a story you'd tell today. Write your answer to the second question: *What did you actually think at the time?*",
      guidance:
        "Write 3-5 sentences in the first person, about the moment before you decided. Include how sure you were, what evidence cut against you, and one thing you'd rather not admit. If you can't remember what you thought, better to find that out now than in the interview.",
      rubric: [
        'Says what you thought, not what you did',
        'Gives a rough confidence, as a percentage or in plain words',
        'Names evidence that cut against your view',
        'Includes at least one unflattering detail',
        'Uses "I", not "we"',
      ],
      placeholder: 'At the time, I honestly thought …',
    },
    {
      kind: 'concept',
      id: 'recap',
      title: 'Keep three things',
      body:
        '1. **Story questions are the on-ramp.** Probes ask what you thought, how sure you were, and how you see it now. Prepare those layers, not a smoother script.\n' +
        '2. **Each probe has a target**: judgment, honesty, calibration, updating, values in action.\n' +
        "3. **Agree only where it's yours.** Unexamined agreement and manufactured critique fail the same way, at the first *why?*",
    },
  ],
  cards: [
    {
      id: 'values-probes.star-gap',
      skill: 'values.antipatterns',
      kind: 'flash',
      front: 'Which parts of an answer does a STAR script tend to leave out, that culture-round probes aim at?',
      back: 'What you thought before acting, how sure you were, what it cost, and how you see it now. STAR stops at Result, usually a happy one.',
    },
    {
      id: 'values-probes.sort-new',
      skill: 'values.judgment',
      kind: 'sort',
      prompt: 'Story question or probe? Sort each one.',
      buckets: [
        { id: 'story', label: 'Asks for the story' },
        { id: 'probe', label: 'Probes your judgment' },
      ],
      items: [
        { text: 'Walk me through your proudest launch.', bucket: 'story' },
        { text: 'Tell me about a time you mentored someone.', bucket: 'story' },
        { text: 'Describe a time you hit a tight deadline.', bucket: 'story' },
        { text: 'How sure were you, at the time, that you were right?', bucket: 'probe' },
        { text: 'What would you do differently, knowing what you know now?', bucket: 'probe' },
        { text: 'What strongly held view of yours turned out to be wrong?', bucket: 'probe' },
      ],
      explanation:
        'Story questions ask for events and can be answered by narration. Probes ask for your confidence, your verdict now, or a view you held and lost, which only you can supply.',
    },
    {
      id: 'values-probes.agree-ok',
      skill: 'values.judgment',
      kind: 'mcq',
      prompt: 'You genuinely agree with a position Anthropic has taken. In the culture round, what should you do?',
      choices: [
        {
          text: 'Say so, with your reasoning, the strongest objection you know, and what would change your mind.',
          correct: true,
          feedback: 'Agreement you can defend is a view, not flattery. The objection and the mind-changer prove you thought about it.',
        },
        {
          text: "Invent a mild disagreement anyway, so that you don't come across as sycophantic or rehearsed.",
          feedback: 'A manufactured critique collapses at the first follow-up, and it misrepresents what you think.',
        },
        {
          text: 'Steer away from the topic, since any agreement at all will read as flattery.',
          feedback: 'Avoidance reads as having no view. Agreement is only a problem when it is unexamined.',
        },
        {
          text: 'Agree briefly and move on; elaborating on why will just look like sucking up.',
          feedback: 'The elaboration is what separates a view from a nod. Brevity hides your reasoning.',
        },
      ],
      explanation: 'The failure mode is unexamined agreement, not agreement. Give your reasons, the best objection and a mind-changer, and agreeing is as strong as disagreeing.',
    },
    {
      id: 'values-probes.antipattern-signal',
      skill: 'values.antipatterns',
      kind: 'match',
      prompt: 'Match each culture-round anti-pattern to what it signals to the interviewer.',
      pairs: [
        { left: 'A word-for-word rehearsed story', right: 'Smooth at the first level, empty at the third' },
        { left: 'Reciting the mission back', right: 'Performance, not a view' },
        { left: 'Agreeing with every position', right: "Likely to stay quiet when something's wrong" },
        { left: "A critique you don't actually hold", right: 'Collapses at the first "why?"' },
        { left: '"I\'d do exactly the same again"', right: 'No sign of updating' },
      ],
      explanation: 'Each anti-pattern is an answer built to look good rather than to be true, and each fails in a predictable way under follow-up questions.',
    },
    {
      id: 'values-probes.feel-now',
      skill: 'values.judgment',
      kind: 'compare',
      question: 'You pushed a launch back two weeks to fix flaky tests. *How do you feel about that decision now?*',
      a: "Mostly right, but I overrated the risk: two of the five flaky tests were harmless. Next time I'd spend a day triaging before asking for two weeks.",
      b: 'Good, honestly. It was clearly the right call. Quality matters, the extra two weeks paid for themselves, and I would make the same decision again without a second thought.',
      better: 'a',
      explanation: 'B defends the decision without examining it. A gives a split verdict with evidence and a concrete change, which is what *how do you feel now?* is probing for. It is also shorter: depth is not length.',
    },
    {
      id: 'values-probes.five-targets',
      skill: 'values.judgment',
      kind: 'flash',
      front: 'Most culture-round probes test five things. Name them.',
      back: 'Own judgment; honesty, including the unflattering part; calibration (how sure, on what evidence); updating (what changed your mind); values in action (what you did when it cost something).',
    },
    {
      id: 'values-probes.misread',
      skill: 'values.antipatterns',
      kind: 'mcq',
      prompt: 'After your story, the interviewer asks *What did you actually think at the time?* Which reply misreads the question?',
      choices: [
        {
          text: 'We set up a phased rollout, added monitoring, and shipped on time.',
          correct: true,
          feedback: 'Right: they asked for your thinking, and this repeats the plot, in *we*.',
        },
        {
          text: 'I thought it was a mistake, but I was only about 60% sure.',
          feedback: 'This answers the question: a view plus a confidence.',
        },
        {
          text: 'Honestly, I was mostly worried about being blamed if it went wrong.',
          feedback: 'An honest motive, even an unflattering one, is exactly what was asked for.',
        },
        {
          text: "I didn't have a view yet. I remember feeling out of my depth.",
          feedback: "Also a real answer. Not having a view yet is a state of mind you can describe.",
        },
      ],
      explanation: 'The question asks about your state of mind before the outcome. Anything that describes it, uncertainty and motives included, answers it. Retelling the actions does not.',
    },
  ],
}

export default lesson
