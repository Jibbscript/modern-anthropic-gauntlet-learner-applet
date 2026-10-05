import type { Lesson } from '../../core/types'

const lesson: Lesson = {
  id: 'design-versions',
  title: 'Versions and execution',
  summary: 'Make every run explainable with immutable versions, and survivable with queues, per-org limits and idempotent retries.',
  minutes: 9,
  skills: ['design.versioning', 'design.execution'],
  steps: [
    {
      kind: 'concept',
      id: 'hook',
      eyebrow: 'Versions',
      title: 'The run nobody can explain',
      body: "A customer files a ticket: *yesterday this prompt gave a great answer, today it's garbage.* You open the database. The `prompts` row has been edited in place six times since then, and the run row only says `prompt_id = 42`.\n\nWhich text produced yesterday's answer? Which model, which temperature? Nobody can say.\n\nTwo fixes: versions that make every run explainable, and an execution path that survives timeouts, retries and floods.",
    },
    {
      kind: 'mcq',
      id: 'data-model',
      eyebrow: 'Your call',
      prompt: 'Which data model makes that ticket answerable for every run, forever?',
      choices: [
        {
          text: 'Saves insert immutable versions; each run records the `version_id` it executed',
          correct: true,
          feedback:
            "Yes. A version never changes once written, so a run's `version_id` names exact text, model and params. Editing a prompt adds history; it never rewrites it.",
        },
        {
          text: 'Keep updating `prompts` in place, and write every change to an audit log table',
          feedback:
            'Closer than it looks: you could replay the log to rebuild old text. But every lookup becomes a reconstruction, and one missed log write breaks the chain. Make history the record, not a side effect.',
        },
        {
          text: 'Copy the full prompt text, model and params into every run row as it starts',
          feedback:
            "It does make runs explainable. But 2,000 runs of one prompt store 2,000 copies, and you still can't list, diff or restore versions, because there are none.",
        },
        {
          text: 'Give each prompt its own git repository and store commit SHAs on runs',
          feedback:
            "Right model, wrong tool: immutable snapshots with parents is exactly git's design. But a repo per prompt means shelling out to git on the hot path, with no SQL across prompts or tenants.",
        },
      ],
      explanation:
        'Immutability is the trick: if a version can never change, a pointer to it is as good as a copy. Everything else in this lesson (hashes, forks, tags, caching) leans on that one property.',
      hint: "Which option makes *what exactly ran?* a single lookup instead of a reconstruction?",
    },
    {
      kind: 'concept',
      id: 'anatomy',
      title: 'Anatomy of a version',
      body: "A save never updates a version. It inserts one whose `parent_id` is the version the editor started from.\n\n- `content_hash` covers body, model and params. If it matches the parent's, the save is a no-op.\n- Bodies live in object storage under their own hash, so a temperature-only change stores no new text.\n- Pointers are the only mutable part: the prompt's head, and tags like `prod`.",
      code: {
        code: 'versions        -- append-only\n  id, prompt_id\n  parent_id     -- null for v1\n  content_hash  -- body+model+params\n  body_ref      -- key: sha256(body)\n  model, params\n  author_id, created_at\n\nprompt_tags     -- mutable pointers\n  prompt_id, name, version_id',
        lang: 'text',
      },
      callout: {
        tone: 'source',
        text: 'Candidates report a Prompt Playground design round (2026). Prep-site write-ups of it recommend immutable versions plus a compare-and-set head pointer: [The Forward Deployed](https://www.theforwarddeployed.io/interviews/anthropic/questions/prompt-playground). A guide, not an official rubric.',
      },
    },
    {
      kind: 'predict',
      id: 'canonical-hash',
      eyebrow: 'Predict',
      prompt: 'Your save path hashes each version to spot no-op saves. Three saves arrive with the same text and settings. What does this print?',
      code: 'import json\nfrom hashlib import sha256\n\ndef vhash(body, model, params):\n    d = {"body": body, "model": model,\n         "params": params}\n    s = json.dumps(d, sort_keys=True)\n    return sha256(s.encode()).digest()\n\np1 = {"temperature": 0,\n      "max_tokens": 500}\np2 = {"max_tokens": 500,\n      "temperature": 0}\np3 = {"temperature": 0.0,\n      "max_tokens": 500}\na, b, c = (vhash("Hi.", "m1", p)\n           for p in (p1, p2, p3))\nprint(a == b, a == c)',
      answers: ['True False', 'True, False', '(True, False)'],
      explanation:
        '`sort_keys=True` fixes key order, so `a == b`. But `json.dumps(0)` is `0` and `json.dumps(0.0)` is `0.0`: same setting, different bytes, different hash, and dedupe or caching misses silently. Canonicalize *values* too: run params through a schema that coerces types (temperature is always a float) before hashing.',
      hint: '`sort_keys` handles key order. Is key order the only difference between the three calls?',
    },
    {
      kind: 'match',
      id: 'what-changes',
      prompt: 'What actually changes in storage? Match each action to its write.',
      pairs: [
        { left: 'Save edited text', right: 'Insert a version (parent: the one you edited); move the head' },
        { left: 'Save with nothing changed', right: "No write: the hash matches the parent's" },
        { left: 'Promote v8 to production', right: 'Update one row: point the `prod` tag at v8' },
        { left: 'Diff v3 against v8', right: 'No write: computed from two stored bodies' },
        { left: "Duplicate a teammate's prompt", right: "A new prompt whose first version's parent is theirs" },
      ],
      explanation:
        'Only pointers ever change: the head and tags like `prod`. Everything else is an insert or a read, which is why history cannot be lost and why promotion and rollback are single-row updates you can audit.',
    },
    {
      kind: 'concept',
      id: 'run-is-a-job',
      eyebrow: 'Execution',
      title: 'A run is a job, not a request',
      body: "Model calls can take minutes, providers throttle, workers die. So no request waits on the model:\n\n- The API records the run, puts its id on a **queue**, returns `202` with a `run_id`.\n- **Workers** pull jobs as fast as provider limits allow.\n- Tokens stream to the browser over **SSE**; closing the tab doesn't stop the run.\n- Every run gets a **timeout** and a **cancel** flag workers check.",
      callout: {
        tone: 'tip',
        text: 'Why SSE: token streams are one-way, and SSE is plain HTTP. WebSockets earn their keep for two-way traffic like co-editing. A reconnecting `EventSource` sends `Last-Event-ID`, so the server resumes the stream instead of rerunning the prompt.',
      },
    },
    {
      kind: 'order',
      id: 'lifecycle',
      prompt: "Put one run's lifecycle in order.",
      items: [
        'Client sends `POST /runs` with an idempotency key',
        "API checks the org's rate limit and token quota",
        'API inserts the run as `queued`, enqueues its id, returns `202`',
        'A worker claims the job and marks it `running`',
        'Tokens stream to the client over SSE as they arrive',
        'Worker stores output, token counts and cost; marks `succeeded`',
      ],
      explanation:
        'Two orderings matter most. Limits are checked *before* anything is queued, so a flood is turned away cheaply at the door. And the run row exists *before* its id is enqueued, so a worker never claims a job the database has never heard of. Cost is recorded with the result, at the price in effect when it ran.',
      hint: 'What has to exist before a worker can pick something up? What should be rejected before any work is done?',
    },
    {
      kind: 'concept',
      id: 'limits',
      title: 'Limits per org: requests and tokens',
      body: "Each org gets a **token bucket**: capacity is the burst it may send at once, the refill rate its sustained pace. Empty bucket: `429` with `Retry-After`.\n\nFor model calls, meter **tokens** as well as requests: one 100,000-token run costs as much as 200 small ones. Behind every org's bucket sits your provider limit, shared by everyone.\n\nHold to burst: five get through, then about one a second.",
      widget: { id: 'tokenbucket', config: { capacity: 5, rate: 1, compareFixedWindow: false, goal: 'explore' } },
    },
    {
      kind: 'numeric',
      id: 'drain-time',
      prompt: "An org's bucket holds 20 runs and refills at 2 runs a second. It's full when a script fires 50 runs at once, then retries each rejected run the moment a token frees up. How many seconds until all 50 have been accepted?",
      answer: 15,
      tolerance: 0.1,
      unit: 's',
      explanation:
        '20 go through at once on the stored burst. The other 30 wait for refill at 2 a second: 30 ÷ 2 = **15 seconds**. Capacity decides how big a burst you absorb; rate decides how fast a backlog drains. Tune them separately.',
      hint: 'The burst spends the stored tokens. Everything after that moves at the refill rate.',
    },
    {
      kind: 'concept',
      id: 'idempotency',
      title: 'Timeouts are ambiguous',
      body: "The client's `POST /runs` times out. Did the run start? Maybe. A blind retry may bill it twice.\n\nThe fix: the client makes an **idempotency key** once per logical run and sends it on every attempt. The server keeps `(org_id, key) → run_id` for a day and answers repeats with the original run.\n\nWorkers need care too: most queues deliver **at least once**, redelivering any job whose lease expired.",
      callout: {
        tone: 'tip',
        text: 'Retry only what can succeed later: timeouts, `429` (honor `Retry-After`) and transient `5xx`. Back off exponentially with jitter, and cap the attempts.',
      },
    },
    {
      kind: 'spotbug',
      id: 'retry-key',
      eyebrow: 'Find the bug',
      prompt: 'This client retries on timeouts and sends an idempotency key. Finance still finds runs billed twice. Tap the line.',
      code: 'def submit(api, req, attempts=4):\n    for i in range(attempts):\n        key = str(uuid.uuid4())\n        try:\n            return api.create_run(\n                req,\n                idempotency_key=key,\n                timeout=10,\n            )\n        except api.RateLimited as e:\n            time.sleep(e.retry_after)\n        except api.Timeout:\n            time.sleep(backoff(i))\n    raise RunNotAccepted(req)',
      bugLines: [3],
      explanation:
        "A fresh key on every attempt means the server sees each retry as a brand-new run. If attempt 1 was accepted and only its response was lost, attempt 2 creates a second run. The key names the *logical* run, so it's made once, before the loop.",
      fix: {
        code: 'def submit(api, req, attempts=4):\n    key = str(uuid.uuid4())  # once\n    for i in range(attempts):\n        try:\n            return api.create_run(\n                req,\n                idempotency_key=key,\n                timeout=10,\n            )\n        ...',
      },
      hint: 'How does the server decide that a request is a repeat?',
    },
    {
      kind: 'mcq',
      id: 'cache-key',
      prompt: "Teams rerun a 2,000-row eval after every small edit, and most rows don't change. You add a result cache. Which design goes in the doc?",
      choices: [
        {
          text: 'Key on org, version hash and row-input hash; serve hits only to eval reruns that opt in',
          correct: true,
          feedback:
            'Yes. Content keys cannot go stale because versions never change, the org keeps tenants apart, and the Run button keeps meaning *sample again*.',
        },
        {
          text: 'Key on `prompt_id` and row number, since together they identify exactly what ran',
          feedback: 'Names are not content. Edit the prompt and the same key now returns an output from older text: a cache that is confidently wrong.',
        },
        {
          text: 'Key on org, version hash and row-input hash; serve a hit to any run that matches',
          feedback:
            'The key is right; the policy is not. Someone pressing Run at temperature 1 expects a fresh sample, and even temperature 0 is not guaranteed to be deterministic. A silent hit changes what Run means.',
        },
        {
          text: "Skip it: the model provider's prompt caching already avoids the repeated work",
          feedback:
            'Different layer. Provider prompt caching reuses work on a repeated prompt prefix to cut input cost and latency. The model still generates, and you still pay for output tokens.',
        },
      ],
      explanation:
        'A result cache is a product decision as much as a performance one. Key on immutable content, scope it to the tenant, and decide explicitly which callers want a stored answer instead of a new sample.',
      hint: 'Two questions: can the key go stale, and does every caller want a stored answer?',
    },
    {
      kind: 'interview',
      id: 'evals-round',
      eyebrow: 'Put it together',
      setup: 'Your doc has immutable versions, a run queue with workers, per-org buckets and idempotent submits. The interviewer moves on to evals.',
      turns: [
        {
          interviewer: 'Users want to run a version against a 2,000-row dataset and get a score. How does that work?',
          options: [
            {
              text: '"One eval job on the queue loops over the 2,000 rows, calls the model for each, and writes the score when it finishes."',
              quality: 'okay',
              feedback: "It works, and it's simple. But it's serial, and a crash at row 1,900 starts over unless you checkpoint. You've rebuilt a worse queue inside one job.",
            },
            {
              text: '"An `evals` row fans out one child run per row onto the run queue, keyed `eval_id:row_id`. When all are terminal, aggregate."',
              quality: 'strong',
              feedback: 'Strong. Children reuse everything you built for runs: limits, retries, streaming, cost tracking. The deterministic key makes a repeated fan-out harmless.',
            },
            {
              text: '"The browser loops over the rows, calls `POST /runs` for each and averages the scores, so the backend needs no new code."',
              quality: 'weak',
              feedback: 'No new backend code, and no eval either once the laptop closes: it dies halfway, with no server-side record of what finished. Long-running work belongs on the server.',
            },
          ],
        },
        {
          interviewer: "One team's eval is eating all the capacity. Interactive runs are timing out.",
          options: [
            {
              text: '"Evals drop to a lower-priority queue with a per-org cap on in-flight rows. Interactive runs keep reserved capacity."',
              quality: 'strong',
              feedback: 'Strong. Fairness is a scheduling decision: priority between kinds of work, and caps within each tenant.',
            },
            {
              text: '"Add more workers and request a higher provider rate limit, so batch and interactive work both have room to run."',
              quality: 'okay',
              feedback: 'More capacity helps everyone, until the next, bigger eval. Without priority and per-org caps, one tenant can always crowd out the rest.',
            },
            {
              text: '"Ask users to schedule big evals overnight, when interactive traffic is low and nobody is waiting on results."',
              quality: 'weak',
              feedback: 'That turns a scheduling problem into a support ticket. The system should enforce the policy, not its users.',
            },
          ],
        },
        {
          interviewer: 'Halfway through, the user hits Cancel. Of the 1,000 rows that ran, 40 timed out.',
          options: [
            {
              text: '"Delete the remaining queued jobs, then show the score from the rows that finished, so the user still gets a number."',
              quality: 'okay',
              feedback: 'Close. But a score over 960 rows with 40 silent timeouts looks complete. Say what is missing.',
            },
            {
              text: '"Let the eval finish anyway and count the 40 timeouts as failures, so the final score covers every row."',
              quality: 'weak',
              feedback: "It ignores the cancel, keeps spending the customer's tokens, and scores infrastructure flakiness as model failures.",
            },
            {
              text: '"Mark it `cancelled` so workers skip queued rows. Label the score partial: 960 scored, 40 timed out, retry those."',
              quality: 'strong',
              feedback: 'Strong. Cancel is a status workers check, and a partial result says it is partial. Add one line on billing: charge only the tokens actually spent.',
            },
          ],
        },
      ],
      wrapUp:
        'An eval is many runs with a parent. Reuse the run path, schedule batch work behind people who are waiting, and never let a partial or cancelled result pass for a complete one.',
    },
    {
      kind: 'concept',
      id: 'recap',
      title: 'Remember',
      body: "1. **Versions are immutable** rows with a content hash and a parent. Only pointers (the head, tags like `prod`) move, and runs reference versions, so every output is explainable.\n2. **A run is a job**: queue, workers, SSE, and per-org buckets on requests and tokens.\n3. **Timeouts are ambiguous.** One idempotency key per logical run, and workers that tolerate redelivery.",
    },
  ],
  cards: [
    {
      id: 'design-versions.immutable',
      skill: 'design.versioning',
      kind: 'flash',
      front: 'Why store prompt versions as immutable rows that runs point at, instead of one prompt row edited in place?',
      back: "A run's `version_id` then names the exact text, model and params forever. Restore and diff become reads, and no edit can rewrite history.",
    },
    {
      id: 'design-versions.timeout',
      skill: 'design.execution',
      kind: 'mcq',
      prompt: "A client's `POST /runs` times out after 10 seconds. What do you know about the run?",
      choices: [
        {
          text: 'Nothing for sure, so a retry must reuse the same idempotency key',
          correct: true,
          feedback: 'Yes. A timeout tells you about the response, not about the work.',
        },
        { text: 'It was never created, since the server never answered; send a fresh one', feedback: 'The server may have accepted it and only the response was lost. That is how double billing happens.' },
        { text: 'It was created, since the request went out, so the client must not retry', feedback: 'The request may have died before it reached the server. Never retrying loses runs.' },
        { text: 'It failed, and the server rolls it back once the client disconnects', feedback: 'The server does not know the client gave up. Without a cancel, the run carries on.' },
      ],
      explanation: 'Timeouts are ambiguous by nature. An idempotency key makes the retry safe either way: if the run exists you get it back, and if not, it is created once.',
    },
    {
      id: 'design-versions.token-wait',
      skill: 'design.execution',
      kind: 'numeric',
      prompt: "An org's token bucket meters model tokens: capacity 100,000, refilling at 2,000 tokens a second. It is empty. The next run must reserve 50,000 tokens. How many seconds until it can start?",
      answer: 25,
      tolerance: 0.1,
      unit: 's',
      explanation: '50,000 ÷ 2,000 = **25 seconds**. Big runs wait longer, which is the point: the limit tracks cost, not request count.',
    },
    {
      id: 'design-versions.reserve',
      skill: 'design.execution',
      kind: 'mcq',
      prompt: "You charge an org's token bucket before a run starts, but nobody knows how long the output will be. What do you deduct?",
      choices: [
        {
          text: 'Input tokens plus `max_tokens`, then refund the unused part when the run ends',
          correct: true,
          feedback: 'Yes. Reserve the worst case so the org cannot overshoot, then settle to actual usage.',
        },
        {
          text: 'Input tokens only, and charge the output tokens after the run',
          feedback: 'Then 50 parallel runs all pass the check and blow through the limit together before any output is counted.',
        },
        { text: 'A flat 1,000 tokens per run, the historical average across orgs', feedback: 'Wrong for every run that is not average, and long outputs sail through on a small deduction.' },
        { text: 'Nothing up front; deduct the exact total once the run finishes', feedback: 'A burst of concurrent runs is never checked against the bucket until it is too late.' },
      ],
      explanation: 'Reserve, then settle: the usual shape when cost is only known afterwards. The same pattern works for money budgets.',
    },
    {
      id: 'design-versions.mechanisms',
      skill: 'design.execution',
      kind: 'match',
      prompt: 'Match each failure in a model-run service to the mechanism that handles it.',
      pairs: [
        { left: 'A retry after a timeout would start a second run', right: 'An idempotency key per logical run' },
        { left: 'One org floods the system with runs', right: 'A per-org token bucket' },
        { left: 'A worker dies mid-run', right: 'Its lease expires and the job is redelivered' },
        { left: 'The user closes the tab mid-stream', right: 'The run finishes server-side and stores its output' },
        { left: 'A model call hangs forever', right: 'A per-run timeout marks it failed' },
      ],
      explanation: 'Each failure has one owner. Naming the owner for each is most of what an execution section in a design doc needs to say.',
    },
    {
      id: 'design-versions.redelivery',
      skill: 'design.execution',
      kind: 'spotbug',
      prompt: 'The queue delivers at least once. A worker crashes after marking a run `succeeded` but before acking, and the redelivered job generates and bills it again. Tap the line.',
      code: 'def handle(job):\n    run = db.get_run(job.run_id)\n    if run.status == "cancelled":\n        return queue.ack(job)\n    db.set_status(run.id, "running")\n    out = model.generate(run)\n    db.save_output(run.id, out)\n    db.set_status(run.id, "succeeded")\n    queue.ack(job)',
      bugLines: [3],
      explanation:
        'The guard skips cancelled runs but not finished ones, so a redelivered job for a `succeeded` run calls the model again. Skip every terminal status, but still retry a run a dead worker left `running`: that is what redelivery is for. (Write output and status in one transaction, too, or a crash between them strands a finished output on a `running` run.)',
      fix: { code: 'TERMINAL = {"cancelled", "failed",\n            "succeeded"}\n\ndef handle(job):\n    run = db.get_run(job.run_id)\n    if run.status in TERMINAL:\n        return queue.ack(job)\n    ...' },
    },
    {
      id: 'design-versions.promote',
      skill: 'design.versioning',
      kind: 'order',
      prompt: 'Order a safe promotion of a new prompt version to production.',
      items: [
        'Save the edit as v8, a new immutable version',
        'Run the eval dataset against v8',
        "Compare v8's score with the current `prod` version's",
        'Move the `prod` tag to v8, recorded in the audit log',
        'Watch live metrics; if they regress, move `prod` back',
      ],
      explanation: 'Production resolves the tag at call time, so promotion and rollback are each one pointer move. The eval comes first because after the move, customers are the test.',
    },
    {
      id: 'design-versions.two-caches',
      skill: 'design.execution',
      kind: 'flash',
      front: 'A model provider offers prompt caching. Does it replace your own result cache for eval reruns?',
      back: 'No. Prompt caching reuses work on a repeated prefix, cutting input cost and latency, but the model still generates and output tokens are still billed. A result cache returns a stored output and skips the call.',
    },
  ],
}

export default lesson
