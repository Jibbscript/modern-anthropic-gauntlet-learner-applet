import type { Lesson } from '../../core/types'

const lesson: Lesson = {
  id: 'why-mission',
  title: 'Mission and structure',
  summary:
    'What the mission actually says, what a PBC and the Long-Term Benefit Trust do (and do not do), and how to talk about both without flattering.',
  minutes: 8,
  skills: ['why.mission', 'why.differentiation'],
  steps: [
    {
      kind: 'concept',
      id: 'hook',
      title: 'Who picks the board?',
      body:
        'Investors have put tens of billions of dollars into Anthropic. Yet since April 2026, a majority of its board has been appointed by a trust whose members hold no financial stake in the company.\n\n' +
        "That is unusual, and it is the kind of specific fact that separates 'I like the mission' from an answer a recruiter remembers. Here: what the mission says, what the structure does, and what it can't do.",
    },
    {
      kind: 'mcq',
      id: 'which-mission',
      eyebrow: 'Warm-up',
      prompt: 'Anthropic publishes several statements that sound alike. Which one is its **mission**?',
      choices: [
        {
          text: "To ensure that the world safely makes the transition through transformative AI",
          correct: true,
          feedback:
            "Right. This is the wording in Claude's constitution. Note the focus: not building AI, but the world getting *through* the transition safely.",
        },
        {
          text: 'The responsible development and maintenance of advanced AI for the long-term benefit of humanity',
          feedback:
            "Close, and real: this is the purpose Anthropic states *as a Public Benefit Corporation*, the legal-structure side. Not the mission statement.",
        },
        {
          text: 'An AI safety and research company building reliable, interpretable, and steerable AI systems',
          feedback:
            "Real, from the company page, but it describes *what* Anthropic is and builds. The mission is the *why*.",
        },
        {
          text: 'To ensure that artificial general intelligence benefits all of humanity',
          feedback:
            "That is OpenAI's mission. Mixing the two up in a recruiter screen is an easy way to signal you haven't read closely.",
        },
      ],
      explanation:
        "All four sound similar, which is the trap. Anthropic's mission is about the *transition* going safely. The PBC purpose belongs to the legal structure, and 'reliable, interpretable, and steerable' is the product description. Knowing which is which lets you quote precisely instead of paraphrasing into mush.",
      hint: 'One describes the product, one is the PBC purpose, one belongs to another lab.',
    },
    {
      kind: 'concept',
      id: 'origins',
      title: 'Where it came from',
      body:
        'Anthropic was founded in 2021 by former OpenAI staff, including Dario Amodei (CEO) and Daniela Amodei (President). Its 2023 essay *Core Views on AI Safety* gives the reason:\n\n' +
        "> We founded Anthropic because we believe the impact of AI might be comparable to that of the industrial and scientific revolutions, but we aren't confident it will go well.\n\n" +
        'The mission follows from that last clause: ==make the transition go safely==.',
      callout: {
        tone: 'source',
        text: "[Core Views on AI Safety](https://www.anthropic.com/news/core-views-on-ai-safety) (Mar 2023). Mission wording from [Claude's constitution](https://www.anthropic.com/constitution).",
      },
    },
    {
      kind: 'concept',
      id: 'pbc',
      title: "What 'Public Benefit Corporation' means",
      body:
        "From the company page: 'Anthropic is a Public Benefit Corporation, whose purpose is the responsible development and maintenance of advanced AI for the long-term benefit of humanity.'\n\n" +
        "A PBC is still a for-profit company with shareholders. The difference: its charter names a public benefit, and directors are expected to ==balance== that benefit against shareholders' financial interests, not maximize returns alone.\n\n" +
        'In practice it is permission, not a guarantee.',
      callout: { tone: 'source', text: '[anthropic.com/company](https://www.anthropic.com/company), accessed Oct 2026.' },
    },
    {
      kind: 'sort',
      id: 'pbc-sort',
      prompt: 'Sort each claim about PBC status.',
      buckets: [
        { id: 'does', label: 'PBC status does this' },
        { id: 'doesnt', label: 'It does not do this' },
      ],
      items: [
        { text: "Writes a public benefit into the company's legal charter", bucket: 'does', why: 'The purpose clause is the defining feature.' },
        {
          text: 'Lets directors weigh that benefit against shareholder returns',
          bucket: 'does',
          why: 'That balancing duty is what gives the board legal cover for mission-first choices.',
        },
        { text: 'Keeps the company for-profit: it raises capital and sells products', bucket: 'does', why: 'A PBC is not a nonprofit.' },
        { text: 'Requires a specific safety decision, like delaying a model', bucket: 'doesnt', why: 'It permits mission-first decisions. It never names one.' },
        {
          text: 'Lets any member of the public sue to enforce the mission',
          bucket: 'doesnt',
          why: 'Enforcement generally sits with shareholders, not with the public the benefit is meant for.',
        },
        { text: 'Guarantees that growth never wins over the mission', bucket: 'doesnt', why: 'Directors balance, and balancing can come out either way.' },
      ],
      explanation:
        "PBC status changes what directors are *allowed* to weigh, not what they must decide. That's why Anthropic added a second layer, the Long-Term Benefit Trust, which changes *who* the directors are.",
    },
    {
      kind: 'concept',
      id: 'ltbt',
      title: 'The Long-Term Benefit Trust',
      body:
        'Announced on Sep 19, 2023, the Long-Term Benefit Trust (LTBT) started with five ==financially disinterested== trustees: people with no stake in Anthropic\'s profits.\n\n' +
        'It holds a special class of stock (Class T) that lets it elect and remove a growing share of the board, stepping up on time and funding milestones. In April 2026, with Vas Narasimhan\'s appointment, Anthropic said: "Trust-appointed directors now make up a majority of the Board."',
      callout: {
        tone: 'source',
        text: '[LTBT announcement](https://www.anthropic.com/news/the-long-term-benefit-trust) (Sep 2023); [Narasimhan appointment](https://www.anthropic.com/news/narasimhan-board) (Apr 2026).',
      },
    },
    {
      kind: 'mcq',
      id: 'ltbt-does',
      prompt: "A friend calls the Long-Term Benefit Trust 'Anthropic's safety committee.' What does it actually do?",
      choices: [
        {
          text: 'Elects and can remove a growing share of board directors, now a majority',
          correct: true,
          feedback: 'Yes. Its lever is *who* governs, not individual product calls.',
        },
        {
          text: 'Reviews each new model and approves it before it ships',
          feedback:
            "Tempting, but not its role. Launch decisions sit with the company under its own policies. The Trust's formal hook into that process, added in April 2026, is requesting external review of Risk Reports.",
        },
        {
          text: "Owns most of Anthropic's equity and collects its profits",
          feedback:
            'The opposite: trustees are chosen to be financially disinterested. The special Class T stock exists so the Trust can elect directors.',
        },
        {
          text: 'Writes the Responsible Scaling Policy and sets its thresholds',
          feedback: "The RSP is Anthropic's own policy, written and revised by the company. The Trust doesn't author it.",
        },
      ],
      explanation:
        'The Trust\'s power is over the board. Since RSP v3.2 (Apr 29, 2026) it can also request external review of Risk Reports and approve the reviewers. As of October 2026 the company page lists three trustees: Neil Buddy Shah, Richard Fontaine and Ben Bernanke, who joined in July 2026.',
      hint: 'Think about what Class T stock is for.',
    },
    {
      kind: 'match',
      id: 'values',
      eyebrow: 'Read past the headings',
      prompt:
        "Anthropic publishes seven values (company page, as of October 2026). Match six of the headings to what their text actually says.",
      pairs: [
        { left: 'Hold light and shade', right: 'Study bad outcomes to prevent them, good ones to realize them' },
        { left: 'Be good to our users', right: "'Users' includes policy-makers and anyone affected" },
        { left: 'Ignite a race to the top on safety', right: 'Make labs compete to be the most safe and secure' },
        { left: 'Do the simple thing that works', right: 'No spaceship when a bicycle will do' },
        { left: 'Be helpful, honest, and harmless', right: "High-trust, low-ego: if it's urgent, it's probably you" },
        { left: 'Put the mission first', right: 'The mission is the final arbiter in decisions' },
      ],
      explanation:
        "Headings are easy to recite; the text underneath is where the content is. Two surprises: 'users' explicitly includes policy-makers and anyone affected by the technology, and 'helpful, honest, and harmless', a phrase you'd expect about Claude, also describes how employees work together. The seventh value, *Act for the global good*, says Anthropic is 'willing to be very bold in the actions we take.'",
    },
    {
      kind: 'concept',
      id: 'critique',
      title: 'Structure is not a guarantee',
      body:
        "A fair critique: structure gives people the power to choose the mission. It doesn't make them use it.\n\n" +
        '- The money is huge: $65B raised at a $965B valuation (May 2026), and a draft IPO filing (June 2026).\n' +
        "- Dario Amodei, in a leaked July 2025 memo on Gulf investment: 'No bad person should ever benefit from our success' is 'a pretty difficult principle to run a business on.'\n" +
        '- Policies can be rewritten. The RSP was, in 2026.',
      callout: {
        tone: 'insight',
        text: 'The fair counter: few companies at this scale hand a board majority to people with no financial stake. Hold both views, and judge by decisions that cost money.',
      },
    },
    {
      kind: 'mcq',
      id: 'fair-critiques',
      multi: true,
      prompt: "An interviewer asks for your honest critique of Anthropic's governance. Which points are **fair**? Select all that apply.",
      choices: [
        {
          text: "The Trust's main lever is who sits on the board, not individual launch decisions",
          correct: true,
          feedback: 'Fair and precise. It marks the edge of what the structure can promise.',
        },
        {
          text: 'Commercial pressure is real: a 2025 memo argued for Gulf investment partly to stay at the frontier',
          correct: true,
          feedback: "Fair and sourced: Amodei wrote that without it, staying on the frontier would be 'substantially harder.'",
        },
        {
          text: "A PBC lets directors weigh the mission but doesn't require any specific decision",
          correct: true,
          feedback: "Fair. That's the legal design, not a loophole.",
        },
        {
          text: "The Trust is quietly controlled by Anthropic's largest investors",
          feedback: 'There is no evidence for this, and trustees are chosen to be financially disinterested. Unsupported claims read as cynicism, not judgment.',
        },
        {
          text: 'PBC status is legally meaningless, so the mission is pure marketing',
          feedback: "Overclaim. PBC status really does change what directors may weigh. 'Weaker than it sounds' is defensible; 'meaningless' is not.",
        },
      ],
      explanation:
        "A strong critique is specific and sourced, and it stops where the evidence stops. 'The structure can't force good decisions' is fair. 'The structure is fake' needs evidence you don't have.",
    },
    {
      kind: 'compare',
      id: 'compare-mission',
      eyebrow: 'Which answer lands?',
      question: 'Why does Anthropic\'s mission matter to you?',
      a: "I'm really aligned with the mission. I've followed Anthropic for a while, and I think safety is the most important problem in AI. Anthropic is the lab that takes it most seriously, the culture seems great, and I want my work to go toward making AI safe and beneficial for everyone.",
      b: "The mission is credible to me because of the structure behind it: a PBC, plus a trust with no financial stake that now appoints a board majority. What I watch is whether it holds when it's expensive. The 2025 Gulf memo is a case where commercial logic weighed heavily, and I'd want to hear how people inside thought about it.",
      better: 'b',
      explanation:
        "A could be pasted into any lab's application, and 'takes it most seriously' invites 'compared to whom?' B names the mechanism, a real tradeoff and an open question. That shows judgment rather than agreement, which is what candidates report interviewers probing for: your view, not a recital of theirs.",
    },
    {
      kind: 'interview',
      id: 'sim',
      eyebrow: 'Recruiter screen',
      setup: "Minute twelve of a recruiter call. You've just said the mission is why you applied.",
      turns: [
        {
          interviewer: 'A lot of people say that. What about the mission is actually different from other labs?',
          options: [
            {
              text: 'Anthropic was built around safety from day one. You can see it in the Responsible Scaling Policy, in the research it publishes, and in how leadership talks about risk.',
              quality: 'okay',
              feedback: 'True enough, but generic. Nothing here would surprise the recruiter or survive "how, specifically?"',
            },
            {
              text: "There's structure behind it. Anthropic has been a PBC since founding, and since April 2026 a trust with no financial stake appoints a board majority. OpenAI's for-profit also became a PBC in October 2025, so the Trust is the distinctive part.",
              quality: 'strong',
              feedback: 'Specific, dated and fair to the competition. Conceding that PBC status is no longer unique makes the rest more credible.',
            },
            {
              text: 'Honestly, other labs mostly care about profit and shipping fast. Anthropic is the one lab that actually cares about getting safety right.',
              quality: 'weak',
              feedback: 'Unfair and checkable: other labs publish safety frameworks too. Flattery by contrast reads as not having done the reading.',
            },
          ],
        },
        {
          interviewer: 'Could the board still pick revenue over the mission if it wanted to?',
          options: [
            {
              text: "Yes. A PBC lets directors weigh the mission; it doesn't force a decision. The Trust changes who decides, not what they decide. So I judge it by decisions that cost money, and some convince me more than others.",
              quality: 'strong',
              feedback: 'You conceded the true point and said how you would evaluate it. That is the opposite of blind agreement.',
            },
            {
              text: "In theory, maybe. But the Long-Term Benefit Trust exists to stop exactly that, so I don't think it would happen in practice.",
              quality: 'okay',
              feedback: 'Half right. The Trust shapes the board; it does not veto individual decisions. Be precise about the lever.',
            },
            {
              text: "No. As a public benefit corporation, the mission is legally binding, so the board can't put revenue ahead of it.",
              quality: 'weak',
              feedback: 'Wrong on the law. A PBC permits mission-first choices; it does not compel them.',
            },
          ],
        },
        {
          interviewer: 'Then why join, instead of watching from outside?',
          options: [
            {
              text: "I'd trust that the people inside have thought about it more than I have. I'm sure the concerns would look overblown once I'm there.",
              quality: 'weak',
              feedback: 'This pre-commits you to agreeing. They are hiring judgment, not loyalty.',
            },
            {
              text: "Because I believe in the mission, I think the work matters, and I'd rather contribute to it directly than comment from the sidelines.",
              quality: 'okay',
              feedback: 'Sincere, but it restates the question. What would you do that someone else would not?',
            },
            {
              text: "Because how those tradeoffs land depends on the people inside. I'd rather be someone who notices when one goes the wrong way and says so. If the mission turned into marketing, that would be my reason to leave.",
              quality: 'strong',
              feedback: 'A reason with a condition attached. Saying what would make you leave makes your reason to join believable.',
            },
          ],
        },
      ],
      wrapUp:
        "The pattern: know the structure precisely, say plainly what it can't do, and make your reason falsifiable. You'll build your full 'why Anthropic' story in a later lesson.",
    },
    {
      kind: 'concept',
      id: 'recap',
      title: 'What to remember',
      body:
        "1. **Mission**: 'to ensure that the world safely makes the transition through transformative AI.' Don't confuse it with the PBC purpose or the product description.\n" +
        '2. **Structure**: the PBC lets directors weigh the mission; the LTBT (announced Sep 2023) has appointed a board majority since April 2026.\n' +
        '3. **Limit**: structure is permission, not a guarantee. Judge it by decisions that cost money, and say so out loud.',
      callout: {
        tone: 'warn',
        text: 'Governance details move. Check the company page for current trustees and board members before your interview.',
      },
    },
  ],
  cards: [
    {
      id: 'why-mission.mission',
      skill: 'why.mission',
      kind: 'flash',
      front: "What is Anthropic's mission, in its own words?",
      back: "'To ensure that the world safely makes the transition through transformative AI' (Claude's constitution). Not the PBC purpose, and not the 'reliable, interpretable, and steerable' product line.",
    },
    {
      id: 'why-mission.board-majority',
      skill: 'why.mission',
      kind: 'mcq',
      prompt: "As of October 2026, who appoints a majority of Anthropic's board?",
      choices: [
        { text: 'The Long-Term Benefit Trust', correct: true, feedback: 'Yes. Anthropic announced the majority in April 2026.' },
        { text: "Anthropic's largest investors", feedback: 'Investors elect directors too, but the majority milestone belongs to the Trust.' },
        { text: 'The founders, as a block', feedback: 'Dario and Daniela Amodei sit on the board, but the Trust appoints the majority.' },
        { text: 'Public shareholders, via the planned IPO', feedback: 'Anthropic confirmed a confidential draft filing in June 2026, but listing timing is unconfirmed, and the Trust majority came first.' },
      ],
      explanation: "With Vas Narasimhan's appointment in April 2026, Anthropic said Trust-appointed directors now make up a majority of the board.",
    },
    {
      id: 'why-mission.pbc-line',
      skill: 'why.mission',
      kind: 'cloze',
      prompt: "Complete the governance line from Anthropic's company page.",
      lang: 'text',
      code:
        'Anthropic is a\n{{0}},\nwhose purpose is the responsible\ndevelopment and maintenance of\nadvanced AI for the {{1}}\nof humanity. Our Board of Directors\nis elected by stockholders and our\n{{2}}.',
      blanks: [
        { options: ['Public Benefit Corporation', 'nonprofit foundation', 'capped-profit company'], answer: 0 },
        { options: ['long-term benefit', 'safe transition', 'shared prosperity'], answer: 0 },
        { options: ['Long-Term Benefit Trust', 'Safety Advisory Board', 'Responsible Scaling Officer'], answer: 0 },
      ],
      explanation:
        "The PBC carries the stated public-benefit purpose; the Trust elects directors alongside stockholders. 'Safe transition' is the mission's wording, not this line's.",
    },
    {
      id: 'why-mission.permission',
      skill: 'why.mission',
      kind: 'flash',
      front: 'PBC status: permission or guarantee? Answer in one sentence.',
      back: 'Permission. Directors may weigh the public benefit against shareholder returns, but nothing requires any specific decision, and enforcement generally sits with shareholders.',
    },
    {
      id: 'why-mission.structure-vs-policy',
      skill: 'why.mission',
      kind: 'sort',
      prompt: 'Sort each item: corporate structure, or a published policy the company can revise?',
      buckets: [
        { id: 'structure', label: 'Corporate structure' },
        { id: 'policy', label: 'Revisable policy' },
      ],
      items: [
        { text: 'Public Benefit Corporation status', bucket: 'structure' },
        { text: "The Trust's Class T stock", bucket: 'structure' },
        { text: 'Responsible Scaling Policy', bucket: 'policy' },
        { text: 'The seven company values', bucket: 'policy' },
        { text: 'Frontier Safety Roadmap', bucket: 'policy' },
      ],
      explanation:
        'Structure decides who holds power and what they may weigh. Policies are commitments the company writes and can revise, as the RSP showed in 2026. Never present a policy as if it were a legal guarantee.',
    },
    {
      id: 'why-mission.bold',
      skill: 'why.mission',
      kind: 'mcq',
      prompt: "Which Anthropic value says the company is 'willing to be very bold in the actions we take'?",
      choices: [
        { text: 'Act for the global good', correct: true, feedback: "Yes: decisions that 'maximize positive outcomes for humanity in the long run.'" },
        { text: 'Put the mission first', feedback: "That one calls the mission 'the final arbiter' in decisions." },
        { text: 'Ignite a race to the top on safety', feedback: 'That one is about making labs compete on safety and security.' },
        { text: 'Hold light and shade', feedback: 'That one is about studying both bad and good outcomes.' },
      ],
      explanation:
        "'We strive to make decisions that maximize positive outcomes for humanity in the long run. This means we're willing to be very bold in the actions we take.'",
    },
    {
      id: 'why-mission.governance-compare',
      skill: 'why.mission',
      kind: 'compare',
      question: "What do you think of Anthropic's governance?",
      a: "Since April 2026, Trust-appointed directors are a board majority, so the mission has real weight over who runs the company. The Trust doesn't decide launches, and policies can be revised, so I judge it by decisions that cost money.",
      b: "The Long-Term Benefit Trust means investors can't override the mission. That's what convinced me Anthropic is different from other labs.",
      better: 'a',
      explanation:
        'B overclaims: the Trust shapes the board, and the board still balances mission against returns. A is precise about the lever and its limit.',
    },
    {
      id: 'why-mission.openai-pbc',
      skill: 'why.differentiation',
      kind: 'mcq',
      prompt: "OpenAI restructured in October 2025. How does that change the way you explain Anthropic's structure?",
      choices: [
        {
          text: "OpenAI's for-profit is now a PBC too, so the Trust, not 'PBC', is the distinctive part",
          correct: true,
          feedback: 'Right. Lead with the mechanism that is actually unusual.',
        },
        { text: "It doesn't: Anthropic is still the only PBC among frontier labs", feedback: 'Out of date. OpenAI Group PBC is controlled by the OpenAI Foundation since October 2025.' },
        { text: 'OpenAI now has a Long-Term Benefit Trust as well', feedback: 'No. Its for-profit is controlled by a nonprofit foundation, a different mechanism.' },
        { text: 'Anthropic converted to a nonprofit in response', feedback: 'No. Anthropic has been a PBC since its founding.' },
      ],
      explanation:
        "Since October 2025 the nonprofit OpenAI Foundation controls OpenAI Group PBC. 'We're a PBC' no longer differentiates; a trust with no financial stake appointing a board majority still does.",
    },
  ],
}

export default lesson
