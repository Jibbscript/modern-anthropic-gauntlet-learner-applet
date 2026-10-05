import type { Lesson } from '../../core/types'

const lesson: Lesson = {
  id: 'design-collab',
  title: 'Real-time collaboration',
  summary: 'Last-write-wins, OT, CRDTs and plain version checks: what each keeps, what each costs, and which one a prompt actually needs.',
  minutes: 9,
  skills: ['design.collab', 'design.tradeoffs'],
  steps: [
    {
      kind: 'concept',
      id: 'hook',
      eyebrow: 'Collaboration',
      title: 'Two saves, one survivor',
      body: "Alice adds a persona line to her team's support prompt. Bob, at the same moment, adds an output format. Both click Save, and the backend runs `UPDATE prompts SET body = ? WHERE id = ?` twice.\n\nOne of them just lost their work. Nobody saw an error. Nobody will notice until a run behaves oddly next week.\n\nCollaboration design is mostly about that one second.",
    },
    {
      kind: 'widget',
      id: 'merge-strategies',
      eyebrow: 'Try it',
      prompt: 'Alice and Bob edit the same prompt offline, then sync. Try last-write-wins first. Then find a strategy that keeps both edits.',
      goal: 'Keep both edits',
      widget: {
        id: 'collab',
        config: {
          base: 'Summarize the ticket.',
          editA: { at: 0, insert: 'You are a support lead. ' },
          editB: { at: 20, insert: ' in 3 bullets' },
          goal: 'preserve',
        },
      },
      explanation:
        'Last-write-wins keeps one whole copy and throws the other away. Operational transform and CRDTs both keep both edits, by different routes: OT repairs positions, CRDTs avoid positions altogether.',
    },
    {
      kind: 'concept',
      id: 'ot',
      title: 'Operational transform: repair the positions',
      body: "OT sends each edit as an operation: *insert \" in 3 bullets\" at 20*. If another insert landed earlier in the text, that position is stale, so it gets **transformed**: shifted right by the other insert's length.\n\nPractical OT systems, the Google Docs lineage included, route every operation through a central server that puts them in one order. That keeps the transform rules manageable.",
    },
    {
      kind: 'predict',
      id: 'transform',
      prompt: 'Alice and Bob edit `"Answer the question."` at the same time. What does this print?',
      code: 'def transform(op, other):\n    """Shift op past other."""\n    pos, s = op\n    if other[0] <= pos:\n        pos += len(other[1])\n    return (pos, s)\n\nbase = "Answer the question."\n# Alice: 10 chars at the start\na = (0, "Be brief. ")\n# Bob: just before the "."\nb = (19, " in French")\n\na2 = transform(a, b)\nb2 = transform(b, a)\nprint(a2[0], b2[0])',
      answers: ['0 29', '0, 29', '(0, 29)', '0,29'],
      explanation:
        "Alice's insert at 0 comes before Bob's at 19, so hers stays at **0**. Bob's shifts right by the 10 characters of `\"Be brief. \"` to **29**. Both sites end with *Be brief. Answer the question in French.* One gap: this transform has no tie-break, so two inserts at the *same* index would each shift past the other and the sites would disagree.",
      hint: 'An op moves only if the other insert landed at or before its position.',
    },
    {
      kind: 'concept',
      id: 'crdt',
      title: 'CRDTs: no positions to repair',
      body: 'A CRDT gives every character a permanent ID (author plus counter) and records an insert as *after character X*, not *at index 19*. IDs never shift, so concurrent edits commute: replicas that saw the same edits converge in any order, with no central server. Offline and peer-to-peer sync come naturally.\n\nThe price: metadata on every character, and tombstones for deletes. Yjs and Automerge are the well-known libraries.',
      callout: {
        tone: 'insight',
        text: "Not every multiplayer app needs one. Figma describes its design as server-authoritative and *inspired by* CRDTs, with concurrent edits to the same property resolved last-writer-wins: [How Figma's multiplayer technology works](https://www.figma.com/blog/how-figmas-multiplayer-technology-works/) (2019).",
      },
    },
    {
      kind: 'concept',
      id: 'meaning',
      title: "Characters merge. Meaning doesn't.",
      body: 'OT and CRDTs merge characters, not intent. Alice adds *formal*, Bob adds *plain* at the same spot, and both survive: *Reply in plain formal English.* For a prompt, a merge nobody wrote is behavior nobody tested.\n\nCoarser options often fit prompts better:\n\n- **Field-level locks**: one editor per field, with an expiring lease.\n- **Optimistic concurrency**: each save names its base version; a stale save is rejected and a person merges.',
    },
    {
      kind: 'match',
      id: 'techniques',
      prompt: 'Match each technique to its defining property.',
      pairs: [
        { left: 'Last-write-wins', right: 'Simplest; a concurrent edit silently vanishes' },
        { left: 'Operational transform', right: 'A server orders ops and shifts stale positions' },
        { left: 'CRDT', right: 'Merges in any order; an ID on every character' },
        { left: 'Field-level lock', right: 'One editor per field at a time; others wait' },
        { left: 'Optimistic concurrency', right: 'Stale saves are rejected; a person merges' },
      ],
      explanation:
        'Two axes separate them: how fine the unit of conflict is (character, field, whole prompt), and who resolves a conflict (an algorithm, a lock, or a human). Naming both is how you justify a choice in the doc.',
    },
    {
      kind: 'cloze',
      id: 'compare-and-set',
      prompt: 'Optimistic concurrency in one statement. Fill the blanks so a stale save raises `Conflict` instead of overwriting.',
      code: 'SQL = """UPDATE prompts\nSET head = ?, body = ?\nWHERE id = ? AND {{0}}"""\n\ndef save(db, pid, base, body):\n    new = base + 1\n    cur = db.execute(\n        SQL, (new, body, pid, base))\n    if {{1}}:\n        raise Conflict(pid)\n    return new',
      blanks: [
        { options: ['head = ?', 'head > ?', 'body = ?'], answer: 0 },
        { options: ['cur.rowcount == 0', 'cur.rowcount == 1', 'cur.fetchone() is None'], answer: 0 },
      ],
      explanation:
        'The version check and the write are one atomic statement: the row changes only if its head is still `base`, the version this client started from. If another save got there first, zero rows match. `head > ?` rejects every fresh save, and `fetchone()` returns `None` after any UPDATE, so that check would also reject every save.',
      hint: 'The write should only happen if nobody has moved the head since this client loaded it.',
    },
    {
      kind: 'mcq',
      id: 'pick-one',
      eyebrow: 'Make the call',
      prompt: 'Teams of 3-10 people. Prompts are a few KB and usually have one active editor at a time. Which collaboration design do you write into the doc for v1?',
      choices: [
        {
          text: 'Versioned saves with compare-and-set, a merge view on conflict, and live presence',
          correct: true,
          feedback:
            'Yes. Nothing is lost silently, conflicts reach a human who can judge meaning, and presence makes collisions rare. Say what would change your mind: a rising conflict rate.',
        },
        {
          text: 'A CRDT for every field, so no edit is ever lost and offline works from day one',
          feedback:
            'Defensible if live co-editing were a requirement. Here it buys per-character metadata and a stateful sync service to solve collisions that rarely happen.',
        },
        {
          text: 'Operational transform through a central server, the approach behind Google Docs',
          feedback: "Keystroke-level merging means subtle transform code for a problem the requirements don't have, and it still merges characters, not meaning.",
        },
        {
          text: 'Last-write-wins on the whole prompt, since simultaneous edits are rare enough to ignore',
          feedback: 'Rare is not never. When it happens, someone loses work with no error, and nobody finds out until a run misbehaves.',
        },
      ],
      explanation:
        'Match the mechanism to the requirement. Real-time merge engines are the right answer when people type in the same text at once; for mostly-solo edits to short prompts, a version check plus a human merge is simpler and safer. The tradeoff is the answer.',
      hint: 'Which option matches how often conflicts actually happen here, without ever losing work silently?',
    },
    {
      kind: 'concept',
      id: 'presence',
      title: 'Presence, transport, offline',
      body: "**Presence** (who's here, which field, cursors) is ephemeral. Keep it in memory, fan it out over pub/sub, and expire it when heartbeats stop. It never belongs in the main database.\n\n**Transport**: WebSockets when clients send a stream of small updates; Server-Sent Events when only the server talks, like a run streaming tokens.\n\n**Offline**: queue edits locally. On reconnect they take the same conflict path as any stale save.",
    },
    {
      kind: 'sort',
      id: 'durable-or-not',
      prompt: 'Where does each piece of state live?',
      buckets: [
        { id: 'db', label: 'Database (durable)' },
        { id: 'mem', label: 'In memory (ephemeral)' },
      ],
      items: [
        { text: 'Who is viewing the prompt right now', bucket: 'mem', why: 'Rebuilt from heartbeats within seconds after any restart.' },
        { text: "Bob's cursor position", bucket: 'mem', why: 'Stale the moment he moves. Persisting it is pure write load.' },
        { text: '"Alice is typing" indicator', bucket: 'mem', why: 'Meaningful for a few seconds, then garbage.' },
        { text: 'Saved prompt versions', bucket: 'db', why: 'The product\'s core record. Losing one is data loss.' },
        { text: 'Run outputs and token counts', bucket: 'db', why: 'Needed for comparison, billing and quotas.' },
        { text: 'Comments on a version', bucket: 'db', why: 'Someone wrote them on purpose and expects them tomorrow.' },
      ],
      explanation:
        'Ask: if the server restarted, would anyone miss it? Presence rebuilds itself from the next heartbeat; versions, runs and comments do not. Keeping presence out of the database keeps a high-frequency, low-value stream off your most important store.',
    },
    {
      kind: 'compare',
      id: 'collab-section',
      question: 'Which version of the collaboration section goes in your doc?',
      a: '**v1: optimistic concurrency.** Each save sends `base_version`; the server compare-and-sets the head, and a stale save gets a 409 and a three-way merge view. Presence goes over a WebSocket and is never stored. **Why not a CRDT:** prompts are short, simultaneous edits are rare, and a character merge can still yield a contradictory prompt. **Revisit if** over ~5% of saves conflict.',
      b: 'We will use CRDTs (for example Yjs) for real-time collaboration, the approach modern collaborative editors use. CRDTs guarantee that all replicas converge, so no edit is ever lost, and they support offline editing and peer-to-peer sync, which makes this the most scalable and future-proof option.',
      better: 'a',
      explanation:
        "A ties the mechanism to this product's requirements, names the alternative it rejected and why, and says what evidence would flip it. B is accurate about CRDTs but never connects them to a requirement, ignores their cost, and *no edit is ever lost* glosses over merges that keep every character and lose the meaning.",
    },
    {
      kind: 'interview',
      id: 'collab-round',
      eyebrow: 'Put it together',
      setup: 'Your doc says v1 uses versioned saves with compare-and-set, a merge view on conflict, and presence over a WebSocket.',
      turns: [
        {
          interviewer: 'How would you know if that choice turns out to be wrong?',
          options: [
            {
              text: '"Measure it: the share of saves that hit a 409, and how often people abandon the merge view. If conflicts pass a few percent of saves, that\'s my signal to move to live co-editing."',
              quality: 'strong',
              feedback: 'Strong. A metric, a threshold and the next step. Your decision now has a built-in exit.',
            },
            {
              text: '"User feedback. If people start complaining about conflicts or lost work, we\'ll revisit the design then."',
              quality: 'okay',
              feedback: 'Reasonable, but slow and noisy. People rarely report a merge dialog; they just get annoyed. Instrument it.',
            },
            {
              text: '"Optimistic concurrency is provably correct and never loses data, so the choice itself can\'t really be wrong."',
              quality: 'weak',
              feedback: 'Correct is not the same as right for users. A design can never lose data and still be the wrong product.',
            },
          ],
        },
        {
          interviewer: 'Product now says users want to see each other type, like Google Docs.',
          options: [
            {
              text: '"I\'d push back hard. Real-time co-editing is overkill for short prompts, so I\'d keep the design as it is."',
              quality: 'weak',
              feedback: 'The requirement just changed. Pushback is fine with evidence; ask what is driving the request, then design for it.',
            },
            {
              text: '"Then the prompt body needs a real-time merge: a CRDT document, say Yjs, synced over our WebSocket tier and snapshotted into a version on save. Params stay last-writer-wins per field. Cost: per-character metadata and a stateful sync service."',
              quality: 'strong',
              feedback: 'Strong. You change the design because the requirement changed, scope the expensive part to the one field that needs it, and name what it costs.',
            },
            {
              text: '"I\'d add field-level locks and show who holds each one, so people can see who is editing which field."',
              quality: 'okay',
              feedback: "Simple and safe, but it doesn't meet the new requirement: people would see who is editing, not what they type.",
            },
          ],
        },
        {
          interviewer: 'A user edits offline on a flight for two hours, then reconnects.',
          options: [
            {
              text: '"The CRDT merges everything automatically when they reconnect, so there\'s nothing special to handle here."',
              quality: 'okay',
              feedback: 'Mechanically true: it will converge. But two hours of divergent edits can merge into a prompt nobody wrote.',
            },
            {
              text: '"Queue their edits on the device and replay them on top when they reconnect, last write wins."',
              quality: 'weak',
              feedback: "Either their two hours overwrite everyone else's work or the reverse, silently. That is the exact failure this design exists to prevent.",
            },
            {
              text: '"It will converge, but two hours apart can merge into a prompt nobody wrote. I\'d merge, mark it unreviewed, and show the author a diff against the last saved version before it becomes one."',
              quality: 'strong',
              feedback: 'Strong. You separate mechanical convergence from semantic correctness, and put a human where judgment is needed.',
            },
          ],
        },
      ],
      wrapUp: 'Pick the simplest mechanism that never loses work silently, instrument it so you know when to upgrade, and remember that a merge that keeps every character can still lose the meaning.',
    },
    {
      kind: 'concept',
      id: 'recap',
      title: 'Remember',
      body: "1. **The spectrum**: last-write-wins loses edits; OT repairs positions through a central server; CRDTs merge in any order but carry per-character metadata.\n2. **Characters aren't meaning.** For prompts, versioned saves with compare-and-set and a human merge are often enough. Say what would make you upgrade.\n3. **Presence is ephemeral**: in memory, over a WebSocket, expired by heartbeats. Never in the main database.",
    },
  ],
  cards: [
    {
      id: 'design-collab.lww',
      skill: 'design.collab',
      kind: 'flash',
      front: 'Where is last-write-wins fine in a collaborative app, and where does it hurt?',
      back: 'Fine for small atomic values where the latest is what you want: a title, a temperature, a toggle. Harmful on a whole document: a concurrent edit to a different part silently vanishes.',
    },
    {
      id: 'design-collab.crdt-cost',
      skill: 'design.collab',
      kind: 'mcq',
      prompt: 'What does a text CRDT pay in exchange for merging without a central server?',
      choices: [
        {
          text: 'Metadata: a permanent ID per character, plus tombstones',
          correct: true,
          feedback: 'Yes. Stable IDs are what let edits commute, and they cost memory and bandwidth.',
        },
        { text: 'Convergence: replicas can disagree until a server reconciles them', feedback: 'The opposite. Replicas that have seen the same edits converge; that is the guarantee.' },
        { text: 'Offline support: peers must be online together to merge', feedback: 'Offline editing is a CRDT strength. Edits merge whenever they arrive.' },
        { text: 'One of two concurrent inserts at the same spot is dropped', feedback: 'That is last-write-wins. A CRDT keeps both, in an order every replica agrees on.' },
      ],
      explanation: 'CRDTs swap coordination for metadata. Libraries like Yjs and Automerge work hard to compress it, but it never goes to zero.',
    },
    {
      id: 'design-collab.no-server',
      skill: 'design.collab',
      kind: 'mcq',
      prompt: 'Two laptops must co-edit a document over a local network with no server, and keep working while disconnected. Which approach fits?',
      choices: [
        { text: 'A CRDT', correct: true, feedback: 'Yes. Edits merge in any order with no central authority.' },
        { text: 'OT through a central server', feedback: 'Practical OT relies on a server to order operations, and there is none here.' },
        { text: 'Optimistic concurrency with version numbers', feedback: 'Someone has to own the head version and reject stale saves. Without a server, nobody does.' },
        { text: 'Last-write-wins on the whole document', feedback: 'It works without a server, but every concurrent edit loses one side.' },
      ],
      explanation: 'No central authority plus offline editing is the case CRDTs were built for. With a server available, simpler options open up.',
    },
    {
      id: 'design-collab.shift',
      skill: 'design.collab',
      kind: 'numeric',
      prompt: 'Concurrently, Alice inserts `"Hi "` (3 characters) at index 0 and Bob inserts `"!"` at index 10 of the same original text. After transforming Bob\'s operation against Alice\'s, at what index does Bob\'s insert land?',
      answer: 13,
      unit: 'index',
      explanation: "Alice's insert landed before Bob's position, so Bob's shifts right by its length: 10 + 3 = 13. If Alice had inserted after index 10, Bob's would stay put.",
    },
    {
      id: 'design-collab.tie-break',
      skill: 'design.collab',
      kind: 'spotbug',
      prompt: 'Two users insert at the same index at the same moment. After syncing, their copies disagree. Tap the line responsible.',
      code: 'def transform(op, other):\n    # shift op to apply after other\n    pos, text = op\n    if other[0] <= pos:\n        pos += len(other[1])\n    return (pos, text)\n\nbase = "Use a tone."\na = (6, "warm ")  # site A\nb = (6, "dry ")   # site B\n# A ends: "Use a warm dry tone."\n# B ends: "Use a dry warm tone."',
      bugLines: [4],
      explanation: "With equal positions, `<=` makes *each* site shift the other's insert to the right, so the two sites order the words differently. Ties need a deterministic tie-break both sites agree on, such as the lower site ID goes first.",
      fix: {
        code: 'def transform(op, other, me, them):\n    pos, text = op\n    # tie: lower site id goes first\n    if (other[0], them) < (pos, me):\n        pos += len(other[1])\n    return (pos, text)',
        caption: 'Tuple comparison breaks position ties by site id.',
      },
    },
    {
      id: 'design-collab.check-then-act',
      skill: 'design.collab',
      kind: 'spotbug',
      prompt: 'Two saves based on version 7 arrive together. Both pass the `if`, both write, and one body is lost. Tap the line that should have stopped the second write.',
      code: 'def save(db, pid, base, body):\n    (head,) = db.execute(\n        "SELECT head FROM prompts"\n        " WHERE id = ?", (pid,)\n    ).fetchone()\n    if head != base:\n        raise Conflict(pid)\n    db.execute(\n        "UPDATE prompts"\n        " SET head = ?, body = ?"\n        " WHERE id = ?",\n        (head + 1, body, pid))\n    return head + 1',
      bugLines: [11],
      explanation: 'Both requests read head 7 and pass the check before either writes, and the UPDATE then overwrites unconditionally. Make the write re-check the version (`AND head = ?`) and treat zero rows updated as a conflict. The pessimistic alternative is `SELECT ... FOR UPDATE` inside a transaction, which holds a row lock instead.',
      fix: {
        code: 'cur = db.execute(\n    "UPDATE prompts"\n    " SET head = ?, body = ?"\n    " WHERE id = ? AND head = ?",\n    (base + 1, body, pid, base))\nif cur.rowcount == 0:\n    raise Conflict(pid)',
      },
    },
    {
      id: 'design-collab.sse',
      skill: 'design.collab',
      kind: 'mcq',
      prompt: "A run's tokens stream to the browser, and the browser sends nothing back on that channel. What's the simplest transport?",
      choices: [
        {
          text: 'Server-Sent Events over a plain HTTP response',
          correct: true,
          feedback: "Yes. One-way, plain HTTP, and the browser's EventSource reconnects on its own.",
        },
        { text: 'A WebSocket', feedback: "It works, but you pay for a two-way protocol you don't use. Save WebSockets for when clients stream updates too." },
        { text: 'Polling GET /runs/{id} every 500 ms', feedback: 'Adds up to half a second of lag and multiplies request load for every open run.' },
        { text: 'Write tokens to the database and have the client reload', feedback: 'Turns a stream into heavy write load plus polling, with worse latency than either.' },
      ],
      explanation: 'Match the pipe to the direction of traffic: server-only streams fit SSE; frequent client-to-server updates such as edits and cursors fit WebSockets.',
    },
  ],
}

export default lesson
