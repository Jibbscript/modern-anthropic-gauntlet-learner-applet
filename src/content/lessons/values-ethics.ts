import type { Lesson } from '../../core/types'

const lesson: Lesson = {
  id: 'values-ethics',
  title: 'Ethics, speed and safety',
  summary:
    'Answer ethics and speed-vs-safety questions by sizing the risk out loud: the competing goods, who bears it, whether it can be undone, and what you do when you lose the argument.',
  minutes: 9,
  skills: ['values.ethics', 'values.speed-safety'],
  steps: [
    {
      kind: 'concept',
      id: 'hook',
      eyebrow: 'Culture round',
      title: 'Two slogans, zero signal',
      body:
        "Thursday. Launch is Monday. You find an edge case where the new feature quietly hurts a few users.\n\n" +
        "Two answers come out first: *Safety always comes first* and *Ship it and iterate*. The first isn't true of anyone who ships software. The second skips who pays. Neither shows how you think.\n\n" +
        'This lesson replaces both with ==sizing the risk out loud==.',
      callout: {
        tone: 'insight',
        text: 'Questions candidates report from 2025-2026 culture rounds: *How do you balance delivery speed with security concerns?* and *Tell me about a time you had a moral conflict with the work. Who did you talk to?* One report says the interviewer dug into the specific conversations.',
      },
    },
    {
      kind: 'mcq',
      id: 'slogan-or-sizing',
      eyebrow: 'Warm-up',
      prompt: 'An interviewer asks: *How do you balance speed and safety?* Which opening shows reasoning instead of a slogan?',
      choices: [
        {
          text: "It depends on what breaks, for whom, and whether we can undo it. A copy change ships Friday. A migration that deletes data doesn't.",
          correct: true,
          feedback: 'It names the variables you actually weigh and gives two concrete poles. The interviewer can now push on any of them.',
        },
        {
          text: "Safety comes first for me, always. No deadline is worth putting users at risk, and I'd push back on any team that disagreed.",
          feedback:
            "Sounds principled, but every shipped change carries some risk, so taken literally you'd never ship. It also gives the interviewer nothing to probe.",
        },
        {
          text: 'Speed, usually. Most risks are smaller than they look, and you learn far more from real users in production than you ever do in review.',
          feedback: 'Sometimes true, but it skips who absorbs the misses. A slogan pointing the other way is still a slogan.',
        },
        {
          text: "I'd defer to the security team. They own that tradeoff, and second-guessing specialists usually slows everyone down.",
          feedback: "Bringing in specialists is good. Handing them your judgment isn't. The question is how *you* weigh it.",
        },
      ],
      explanation:
        'A strong answer exposes the variables you weigh, so the interviewer can test them. The next screen gives you four of them.',
    },
    {
      kind: 'concept',
      id: 'four-questions',
      title: 'Size it with four questions',
      body:
        '1. **Competing goods**: what does speed buy, and for whom? Name both sides as goods.\n' +
        '2. **Who bears the risk**: you, a customer who opted in, or people who never chose it?\n' +
        "3. **Can you undo it**: a two-way door can be walked back. A one-way door can't.\n" +
        '4. **How big**: likelihood times impact times reach, counted in people, not percentages.',
      callout: {
        tone: 'tip',
        text: "Amazon popularized the door language: make two-way-door decisions quickly and close to the work, and save slow, careful deliberation for one-way doors.",
      },
    },
    {
      kind: 'sort',
      id: 'doors',
      eyebrow: 'Reversibility',
      prompt: 'Sort each decision. If it goes wrong, can you walk it back?',
      buckets: [
        { id: 'two', label: 'Two-way door' },
        { id: 'one', label: 'One-way door' },
      ],
      items: [
        {
          text: 'Rolling a new settings page out to 5% of users behind a flag',
          bucket: 'two',
          why: 'Flip the flag off and everyone is back where they were.',
        },
        {
          text: 'Dropping a production column that has no backup',
          bucket: 'one',
          why: "Once the data is gone there's nothing to roll back to.",
        },
        {
          text: 'Emailing 2 million users about a pricing change',
          bucket: 'one',
          why: 'You can send a correction, but you cannot unsend the first email.',
        },
        {
          text: 'Changing the default sort order of search results',
          bucket: 'two',
          why: 'Annoying if wrong, trivial to revert.',
        },
        {
          text: 'Sending raw user prompts to a new third-party logging vendor',
          bucket: 'one',
          why: "Data you've shared can't be recalled. You're relying on someone else to delete it.",
        },
        {
          text: 'A config change that rolls back automatically on error-rate alarms',
          bucket: 'two',
          why: 'The rollback is built in, which is exactly what makes it safe to ship fast.',
        },
        {
          text: 'Publishing model weights openly',
          bucket: 'one',
          why: "Copies spread immediately. There's no recall.",
        },
      ],
      explanation:
        'One-way doors earn the slow process: review, a second opinion, a written record. Two-way doors earn speed. A lot of good engineering is turning one-way doors into two-way ones with flags, backups, canaries and staged rollouts.',
    },
    {
      kind: 'numeric',
      id: 'rates-hide-people',
      eyebrow: 'How big',
      prompt:
        'Your new cleanup job misfires on 0.05% of accounts and deletes files the user wanted to keep. You have 1.2 million active accounts. If you ship to everyone on Monday, about how many accounts lose files?',
      answer: 600,
      tolerance: 0.1,
      unit: 'accounts',
      hint: '0.05% is 5 in 10,000.',
      explanation:
        '1,200,000 × 0.0005 = 600. *0.05%* sounds like rounding error. 600 people finding their files gone is a support queue, and maybe a news story. A 1% canary would expose about 6 accounts while you watch. Convert rates into people before you decide.',
    },
    {
      kind: 'mcq',
      id: 'edge-case-launch',
      eyebrow: 'Scenario',
      prompt:
        'Launch is Monday. Your bulk-archive feature has a known edge case: in shared folders it can archive files a *collaborator* still needs. Archives are restorable for 30 days, but the collaborator gets no notice. It affects about 0.3% of accounts, and your PM wants to ship to everyone. Best call?',
      choices: [
        {
          text: 'Ship Monday with shared folders excluded by a flag. Log the issue with an owner and a date, and fix before widening.',
          correct: true,
          feedback:
            'Keeps the speed for 99.7% of accounts, removes the harm from people who never opted in, and writes the known issue down.',
        },
        {
          text: "Ship to everyone. It's rare, and archives are restorable for 30 days, so it's a two-way door and the risk is small.",
          feedback:
            "Restorable only if someone notices. The collaborator gets no notice and never chose this, so for them it quietly becomes a one-way door after 30 days.",
        },
        {
          text: "Hold the whole launch until the edge case is fixed and tested, however long that takes. Known harm shouldn't ship.",
          feedback:
            "You'd delay value for 99.7% of accounts to protect a slice you could simply exclude. Caution should be proportional to the risk.",
        },
        {
          text: 'Ship to everyone and fix it quietly next sprint, so nobody gets spooked by a known issue before launch.',
          feedback: "Hiding a known harm is the part an interviewer will flag. The fix might be fine. The silence isn't.",
        },
      ],
      explanation:
        "Most ship-or-block dilemmas have a third option: shrink the blast radius. Ask who bears the risk (here, people who never opted in) and whether it stays reversible for *them*, not just in theory.",
    },
    {
      kind: 'concept',
      id: 'dissent',
      title: 'When you lose the argument',
      body:
        'Being overruled is normal. What you do next is the signal.\n\n' +
        '- **Two-way door**: make your case once, then disagree and commit.\n' +
        '- **One-way door, risk on others**: offer a safer option. Still overruled? Write down the concern and the decision, then use the real channel (security, your skip-level) and tell your lead.\n' +
        "- **Your line**: know in advance what you'd refuse to do yourself.",
      callout: {
        tone: 'warn',
        text: "Escalating isn't disloyal, and going around someone silently isn't brave. The version that survives the follow-up *Who else knew?* is the one where everyone knew.",
      },
    },
    {
      kind: 'mcq',
      id: 'skip-review',
      eyebrow: 'Scenario',
      multi: true,
      prompt:
        'A partner demo is in two days. Security review takes five. Your change adds a public endpoint that returns customer documents. Your lead says: *Skip the review, we can do it after.* Which moves are sound? Select all that apply.',
      choices: [
        {
          text: 'Offer to demo on staging with synthetic data, so the endpoint never touches real documents.',
          correct: true,
          feedback: 'Keeps the demo and removes the one-way door entirely. Often the best move is a cheaper safe option, not a no.',
        },
        {
          text: 'Ask security for a scoped, expedited review of just the new endpoint.',
          correct: true,
          feedback: 'Review queues are often negotiable for a small, well-described change. Asking costs nothing.',
        },
        {
          text: "If overruled, write down the concern and decision, and tell your lead you're looping in security.",
          correct: true,
          feedback: 'A record plus the proper channel, in the open. This is what documenting dissent looks like in practice.',
        },
        {
          text: 'Ship it. Your lead approved it in writing, so the risk is now theirs to own, not yours.',
          feedback: 'Approval moves accountability on paper. It does not move the risk: customers whose documents leak bear it either way.',
        },
        {
          text: "Ship it with extra logging and an alert, so you'd spot any data leak within minutes.",
          feedback: 'Detection is not prevention. A leaked document stays leaked. Logging just tells you sooner.',
        },
      ],
      explanation:
        'Customer data exposure is a one-way door, and the people at risk never opted in, so this decision deserves friction. Notice that none of the sound moves is a flat refusal: options first, then a record and the real channel.',
      hint: 'Two of the sound moves keep the demo date.',
    },
    {
      kind: 'concept',
      id: 'anthropic-tradeoffs',
      eyebrow: 'Anthropic',
      title: 'Anthropic argues this in public',
      body:
        'Anthropic lists *Hold light and shade* among its values: "We need shade to understand and protect against the potential for bad outcomes. We need light to realize the good outcomes."\n\n' +
        'Its Responsible Scaling Policy ties safeguards to capability thresholds. In Feb 2026, RSP v3 dropped the 2023 pause pledge: Anthropic argued a lone pause could leave the world less safe, and critics cited commercial pressure. Form your own view.',
      callout: {
        tone: 'source',
        text: 'Values: [anthropic.com/company](https://www.anthropic.com/company), accessed Oct 2026. RSP v3 and its rationale: [Anthropic, Feb 24, 2026](https://www.anthropic.com/news/responsible-scaling-policy-v3). The pause-pledge change: [TIME, Feb 24, 2026](https://time.com/7380854/exclusive-anthropic-drops-flagship-safety-pledge/).',
      },
    },
    {
      kind: 'match',
      id: 'map-to-anthropic',
      eyebrow: 'Same tools, higher stakes',
      prompt: 'Match each Anthropic decision to the reasoning move it makes.',
      pairs: [
        { left: 'Safety levels modeled loosely on biosafety levels (2023)', right: 'Safeguards scale with the danger' },
        { left: "ASL-3 for Opus 4: risk couldn't be ruled out (May 2025)", right: 'Precaution before proof' },
        { left: 'Jailbreak classifiers published with their costs (Feb 2025)', right: 'Price the safety measure too' },
        { left: 'RSP v3: a lone pause could leave the world less safe (Feb 2026)', right: 'Ask what happens if you stop' },
        { left: 'The value *Hold light and shade*', right: 'Name the good and bad outcomes' },
      ],
      explanation:
        'Sources: RSP v1 (Sep 2023); the ASL-3 activation post (May 22, 2025); Constitutional Classifiers (Feb 3, 2025: jailbreak success fell from 86% to 4.4%, with over-refusal up 0.38% and 23.7% compute overhead); RSP v3 (Feb 24, 2026); the company values page. It is the reasoning you would use on a feature launch, at much higher stakes. Whether each call was right is yours to judge.',
    },
    {
      kind: 'interview',
      id: 'speed-safety-sim',
      eyebrow: 'Interview sim',
      setup:
        'Culture round, about halfway through. The interviewer is friendly and takes notes. Candidates report follow-ups that go three or four levels deep.',
      turns: [
        {
          interviewer: 'How do you balance delivery speed with security concerns?',
          options: [
            {
              text: 'I try to find a balance. Ship fast, but never compromise on security. With good planning up front, you can usually have both without much tension.',
              quality: 'okay',
              feedback:
                "A reasonable instinct with no content. *Never compromise* isn't true of anyone who ships, and *a balance* doesn't say how you find it.",
            },
            {
              text: 'By sizing the risk. Most changes are two-way doors, so they ship fast behind a flag. Auth, customer data and deletes slow down even on a deadline: hard to undo, and others carry the cost.',
              quality: 'strong',
              feedback: 'Names the variables (reversibility, who bears it) and where your line falls. The interviewer can probe any part of it.',
            },
            {
              text: "Security always wins for me. I'd never ship anything I wasn't completely confident in, whatever the deadline or the pressure from product.",
              quality: 'weak',
              feedback: 'A slogan, and taken literally you would never ship. Evaluators reportedly look for genuine friction, not a stance.',
            },
          ],
        },
        {
          interviewer: 'Tell me about a time you actually made that call.',
          options: [
            {
              text: "Nothing specific comes to mind right now, but in general I'm very safety-conscious, and the teams I've worked with know that about me.",
              quality: 'weak',
              feedback: 'No story means no evidence. Prepare one; the reflect steps at the end of this lesson are for exactly this.',
            },
            {
              text: 'We had a launch where I found a security issue the week before. I raised it, we fixed it, and we launched a little later. It worked out fine.',
              quality: 'okay',
              feedback: 'Real, but thin. How big was the risk, who disagreed, what did it cost, and would you do it again?',
            },
            {
              text: "Days before a login revamp, I found the new OAuth flow logged refresh tokens. I asked to slip only OAuth by four days; the PM was unhappy. The rest shipped on time. I'd do it again: leaked tokens can't be unleaked.",
              quality: 'strong',
              feedback:
                'Specific and sized. It names who carried the cost and judges the call now. Note the scoping: only the risky half slipped.',
            },
          ],
        },
        {
          interviewer:
            'Suppose your team had a capability breakthrough that also carried serious risk if released. Would you support delaying it? What if other labs would not delay?',
          options: [
            {
              text: "That's really leadership's call more than mine. I'd trust them to weigh it carefully and go with whatever they decide is best for everyone.",
              quality: 'weak',
              feedback: 'The question asks for your judgment. Deferring entirely suggests you would have no view inside the company either.',
            },
            {
              text: "Probably yes, if the delay buys something: evals, safeguards, a staged release. If others won't wait, delay is worth less, which is Anthropic's own RSP v3 argument. But less isn't zero. Where the line sits, I'm unsure.",
              quality: 'strong',
              feedback:
                'Takes a position, asks what the delay buys, engages the follow-up instead of dodging it, and admits uncertainty without hiding behind it.',
            },
            {
              text: "Yes. If it's risky, we shouldn't release it until it's safe, whatever other labs decide to do. Someone in the industry has to hold the line.",
              quality: 'okay',
              feedback: 'A clear position, but it ignores the follow-up: if others ship anyway, what does your delay buy? Engage with that.',
            },
          ],
        },
      ],
      wrapUp:
        "Strong answers size the risk, name who carries it, and admit what they're unsure of. A version of the last question appears in 2026 candidate reports. There is no single right answer, only reasoning you can defend under follow-ups.",
    },
    {
      kind: 'reflect',
      id: 'ethical-conflict',
      eyebrow: 'Story Bank',
      prompt: 'Write your answer to *Have you faced an ethical conflict at work?*',
      guidance:
        "It doesn't need to be dramatic: a metric you were asked to game, a dark pattern in a signup flow, data used in a way users wouldn't expect, a test you were told to skip. Name the competing obligations, the options you saw, what you did and what it cost you, and what you'd do now.",
      rubric: [
        'Names both competing obligations as real goods, not good versus evil',
        'Says who would have borne the risk',
        'Describes what you actually did, including who you talked to',
        "States a cost to you, or admits you didn't act and why",
        "Says what you'd do now",
      ],
      slot: 'ethical-conflict',
      placeholder: 'The situation was …',
    },
    {
      kind: 'reflect',
      id: 'speed-vs-safety',
      eyebrow: 'Story Bank',
      prompt: 'Write your answer to *Tell me about a time speed and safety (or quality) were in tension.*',
      guidance:
        "Run the four questions: what speed bought, who carried the risk, whether it could be undone, and how big it was in people. Then give the call you made, who you brought in, the outcome, and whether you'd make the same call at 10x the stakes.",
      rubric: [
        'Says whether the risky part was reversible',
        'Names who carried the risk',
        'Sizes the risk concretely (people, money, data), not just "high"',
        'Describes the call and who you brought in',
        "Judges the call now, including what you'd change",
      ],
      slot: 'speed-vs-safety',
      placeholder: 'We were days from …',
    },
    {
      kind: 'concept',
      id: 'recap',
      title: 'Keep three things',
      body:
        "1. **Size it, don't slogan it**: competing goods, who bears the risk, whether it can be undone, and how big it is in people.\n" +
        '2. **Shrink the blast radius** before choosing between ship and block: flags, canaries, scoping out the risky slice.\n' +
        '3. **Disagree in the open**: options first, then a written record and the real channel. Know your line before you need it.',
    },
  ],
  cards: [
    {
      id: 'values-ethics.four-questions',
      skill: 'values.speed-safety',
      kind: 'flash',
      front: 'Name the four questions that turn *speed vs safety* into a sizing problem.',
      back: 'What does speed buy, and for whom? Who bears the risk? Can it be undone (one-way or two-way door)? How big is it: likelihood × impact × reach, counted in people?',
    },
    {
      id: 'values-ethics.doors',
      skill: 'values.speed-safety',
      kind: 'sort',
      prompt: 'One-way or two-way door?',
      buckets: [
        { id: 'two', label: 'Two-way door' },
        { id: 'one', label: 'One-way door' },
      ],
      items: [
        { text: 'Raising an API rate limit through a config flag', bucket: 'two', why: 'Lower it again in seconds.' },
        { text: 'Deleting the last copy of an old backup', bucket: 'one', why: 'No second copy, no undo.' },
        { text: 'Enabling a feature for internal staff only', bucket: 'two', why: 'Small audience, one switch to turn it off.' },
        {
          text: 'Granting a contractor read access to production user data',
          bucket: 'one',
          why: 'You can revoke the access, but not what was already copied.',
        },
        { text: 'Switching a dashboard to a new charting library', bucket: 'two', why: 'Swap it back if the charts look wrong.' },
      ],
      explanation:
        "The test is what's left after a rollback. If people, data or knowledge have already escaped, it's a one-way door.",
    },
    {
      id: 'values-ethics.headcount',
      skill: 'values.speed-safety',
      kind: 'numeric',
      prompt: 'A bug hits 0.2% of your 450,000 daily users. About how many people is that per day?',
      answer: 900,
      tolerance: 0.1,
      unit: 'people',
      explanation:
        '450,000 × 0.002 = 900. Percentages hide headcounts. Say the headcount when you argue for or against shipping.',
    },
    {
      id: 'values-ethics.escalation',
      skill: 'values.ethics',
      kind: 'order',
      prompt: 'You think a launch puts customer data at risk, and your lead disagrees. Order the escalation ladder.',
      items: [
        'Make the case to the decider, with the risk sized',
        'Offer a cheaper safe option: scope, flag, staging',
        'If overruled, write down the concern and the decision',
        'Take it to the owning channel, telling your lead first',
        'Decline to do the part that crosses your line',
      ],
      explanation:
        'Cheapest conversation first, and every step in the open. Refusal is the last rung, reserved for your actual line, not an opening move.',
    },
    {
      id: 'values-ethics.commit',
      skill: 'values.ethics',
      kind: 'mcq',
      prompt:
        'Your lead overrules you on a settings redesign you think is worse. It ships behind a flag and is easy to revert. Best move?',
      choices: [
        {
          text: 'Say your concern once, agree on a metric to check, then commit fully.',
          correct: true,
          feedback: 'Reversible and low-harm: disagree and commit, and let the metric settle it.',
        },
        {
          text: 'Escalate to your skip-level. A bad decision is a bad decision.',
          feedback: 'Escalation is for one-way doors with risk on others. This one is cheap to undo.',
        },
        {
          text: 'Write a formal dissent memo so your objection is on the record.',
          feedback: 'Proportionality applies to dissent too. A memo over a reversible UI choice spends trust and protects no one.',
        },
        {
          text: 'Quietly build it the way you prefer and show them the result.',
          feedback: 'Going around a decision silently is never the right move, even when you turn out to be right.',
        },
      ],
      explanation:
        'Match the force of your dissent to the stakes. Reversible and low-harm: disagree and commit. Irreversible with risk on others: record it and escalate.',
    },
    {
      id: 'values-ethics.light-shade',
      skill: 'values.ethics',
      kind: 'mcq',
      prompt: "Which of Anthropic's published values says it must understand bad outcomes *and* realize good ones?",
      choices: [
        {
          text: 'Hold light and shade',
          correct: true,
          feedback:
            'Verbatim: "We need shade to understand and protect against the potential for bad outcomes. We need light to realize the good outcomes."',
        },
        {
          text: 'Do the simple thing that works',
          feedback: 'That one is about simplicity: "We don\'t invent a spaceship if all we need is a bicycle."',
        },
        {
          text: 'Put the mission first',
          feedback: 'That one makes the mission "the final arbiter in our decisions."',
        },
        {
          text: 'Ignite a race to the top on safety',
          feedback: 'That one is about AI developers competing to build the safest systems.',
        },
      ],
      explanation:
        'Useful framing for a speed-vs-safety answer: both sides are goods you are weighing, not good versus evil. Source: anthropic.com/company, accessed Oct 2026.',
    },
    {
      id: 'values-ethics.compare-conflict',
      skill: 'values.ethics',
      kind: 'compare',
      question: 'Have you faced an ethical conflict at work?',
      a: "Not really. I've been lucky to work at companies with strong values, so it's never come up. I'd like to think I'd speak up if it did.",
      b: "A small one, but real. Growth wanted the cancel button two screens deeper. I argued it would trap people who'd already decided to leave and cost us trust. I lost, logged my objection, and it was reverted after complaints. Now I'd bring support data on day one.",
      better: 'b',
      explanation:
        "A claims a clean record, which reads as unaware or unwilling to say. B names the competing goods (retention vs users' autonomy), what they did, that they lost, and what they'd change. Losing the argument is fine. Having no story isn't.",
    },
  ],
}

export default lesson
