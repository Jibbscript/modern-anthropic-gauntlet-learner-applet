import type { Lesson } from '../../core/types'

const lesson: Lesson = {
  id: 'design-scale',
  title: 'Storage, scale, tradeoffs',
  summary: 'Put each piece of data in the store its shape demands, keep tenants apart, find what breaks at 100x, and write the tradeoff down.',
  minutes: 9,
  skills: ['design.storage', 'design.tradeoffs'],
  steps: [
    {
      kind: 'concept',
      id: 'hook',
      eyebrow: 'Storage',
      title: 'What grows fastest?',
      body: "In a prompt playground with 100,000 daily users, saved versions add about 2 GB a day. Cheap. Nobody worries about them.\n\nBut every run stores something too: what went in and what came out. At 2 million runs a day, run data quietly becomes the biggest thing you own.\n\nWhen an interviewer asks *what breaks at 10x?*, they want you to find that growth with arithmetic, not instinct.",
    },
    {
      kind: 'numeric',
      id: 'runs-per-year',
      eyebrow: 'Estimate',
      prompt: 'Each of 2 million runs a day stores its rendered prompt (about 10 KB) and its output (about 2 KB). How many TB of run data per year?',
      answer: 8.76,
      tolerance: 0.25,
      unit: 'TB/year',
      explanation:
        '2M × 12 KB = 24 GB a day, about **8.8 TB a year**: twelve times the versions. Cheaper: store `version_id` plus the run\'s variables (say 0.5 KB) instead of the rendered prompt; versions are immutable, so a deterministic renderer rebuilds the exact text. That is 2.5 KB a run, about 1.8 TB a year.',
      hint: 'Runs per day × bytes per run × 365. 1 TB is 10^12 bytes.',
    },
    {
      kind: 'concept',
      id: 'shape-picks-store',
      title: 'Shape picks the store',
      body: "Ask three questions of each piece of data: how big, does it change, how is it read?\n\n- **Postgres**: small rows you filter, join and update in transactions. Orgs, members, prompts, version metadata, run status.\n- **Object storage**: big immutable blobs, read whole. Prompt bodies, run outputs, dataset files. Key them by hash or run id.\n- **Cache**: hot data you can rebuild, or afford to lose, if it vanishes.",
      callout: {
        tone: 'source',
        text: 'Candidates report a Prompt Playground design round (2026). Prep-site write-ups of it list metadata vs blob storage as a standard probe: [aceoffer](https://aceoffer.app/interviews/prompt_playground_system_design). Second-hand guides, not verbatim questions.',
      },
    },
    {
      kind: 'sort',
      id: 'pick-store',
      prompt: 'Which store should serve each one?',
      buckets: [
        { id: 'pg', label: 'Postgres' },
        { id: 'blob', label: 'Object storage' },
        { id: 'cache', label: 'Cache' },
      ],
      items: [
        { text: 'Org memberships and roles', bucket: 'pg', why: 'Small, joined on every permission check, and must change transactionally.' },
        { text: 'Run status and token counts', bucket: 'pg', why: 'Filtered, summed and updated as a run progresses.' },
        { text: 'Monthly token usage per org, for billing', bucket: 'pg', why: 'Money. If the cache restarts, an invoice must not reset to zero.' },
        { text: 'A 12 MB prompt body', bucket: 'blob', why: 'Big, immutable, always read whole. Postgres can hold it, but it bloats backups and replication.' },
        { text: 'The 50 MB CSV behind an eval dataset', bucket: 'blob', why: 'A file. Store it once, keep row counts and metadata in Postgres.' },
        { text: 'Reads of a prompt version opened 2,000 times a minute', bucket: 'cache', why: 'Hot and rebuildable: the durable copy stays in Postgres and object storage. Versions are immutable, so a cached copy is never stale.' },
        { text: "Per-org rate-limit buckets", bucket: 'cache', why: 'Touched on every request and cheap to lose: a reset bucket just starts full.' },
      ],
      explanation:
        'The billing row and the rate-limit bucket look alike: both count usage per org. One is money and must survive anything; the other is a throttle that can safely reset. Ask *what happens if this vanishes?* before choosing.',
    },
    {
      kind: 'concept',
      id: 'data-model',
      title: 'org_id on every row',
      body: "Put `org_id` on every tenant-owned row, even when a join could find it. Filters, indexes, partitions and security policies are then one column away.\n\nThen let queries pick indexes. *A prompt's recent runs* wants `(org_id, prompt_id, created_at)`. *A version's children* wants `(parent_id)`. An index no query uses is write cost for nothing.",
      code: {
        code: 'orgs: id, name, plan\nusers: id, email\nmembers: org_id, user_id, role\nprompts: id, org_id, title,\n  head_version_id\nversions: id, org_id, prompt_id,\n  parent_id, content_hash,\n  body_ref, model, params\nruns: id, org_id, prompt_id,\n  version_id, vars, eval_id,\n  status, tokens_in, tokens_out,\n  cost_micros, output_ref,\n  created_at\ndatasets: id, org_id, file_ref\nevals: id, org_id, version_id,\n  dataset_id, status, score',
        lang: 'text',
      },
    },
    {
      kind: 'mcq',
      id: 'partition-key',
      eyebrow: 'Your call',
      prompt: '`runs` will reach billions of rows. Its queries: a prompt\'s recent runs, and monthly usage per org. Runs are deleted after 90 days. How do you partition it in Postgres?',
      choices: [
        {
          text: 'Range-partition by `created_at` monthly, with an `(org_id, prompt_id, created_at)` index',
          correct: true,
          feedback:
            'Yes. Recent-run queries with a time bound prune to the newest partition or two, and retention becomes dropping a whole partition instead of deleting billions of rows.',
        },
        {
          text: 'Hash-partition by `org_id`, so each tenant\'s runs stay together in one partition',
          feedback:
            'Tempting: tenant queries prune well, and org is the right key for *sharding across machines* later. But retention is still a giant DELETE in every partition, and one huge customer makes one partition huge.',
        },
        {
          text: 'Hash-partition by `run_id`, so inserts spread evenly across all partitions',
          feedback: 'Even writes, but every org or prompt query now touches every partition, and retention is still a giant DELETE.',
        },
        {
          text: 'List-partition by `status`, so active runs stay in one small, hot partition',
          feedback:
            'Every status change moves the row to another partition (a delete plus an insert), and finished runs pile into one giant partition anyway.',
        },
      ],
      explanation:
        'Partition on the axis your deletes and hottest queries share: time. The tenant becomes the leading index column inside each partition, and the shard key once one machine is not enough.',
      hint: 'Which choice turns the 90-day cleanup into one cheap operation?',
    },
    {
      kind: 'concept',
      id: 'tenancy',
      title: 'Tenants never see each other',
      body: "A cross-tenant leak is the bug this product cannot survive. Layer the defenses:\n\n1. **Authorization** in the app: roles per org (owner, editor, viewer), checked on every request.\n2. **Row-level security** in Postgres: a policy like `org_id = current_setting('app.org_id')::uuid` filters every query, including the one someone forgot to filter.\n3. **Scope everything else**: object keys under the org, short-lived signed URLs, `org_id` in every cache key.",
      callout: {
        tone: 'warn',
        text: 'Superusers and `BYPASSRLS` roles always skip row-level security, and table owners do by default. Connect the app as its own unprivileged, non-owner role; `FORCE ROW LEVEL SECURITY` covers the owner, never a superuser.',
      },
    },
    {
      kind: 'spotbug',
      id: 'cache-leak',
      eyebrow: 'Find the bug',
      prompt: "Row-level security is on and the SQL filters by org. Users still report seeing another org's prompts in their list. Tap the line.",
      code: 'def list_prompts(user, page):\n    key = f"prompts:page:{page}"\n    hit = cache.get(key)\n    if hit is not None:\n        return hit\n    rows = db.fetchall(\n        "SELECT id, title FROM prompts"\n        " WHERE org_id = %s"\n        " ORDER BY updated_at DESC"\n        " LIMIT 20 OFFSET %s",\n        (user.org_id, page * 20),\n    )\n    cache.set(key, rows, ttl=60)\n    return rows',
      bugLines: [2],
      explanation:
        "The query is perfectly isolated; the cache is not. Org A's page 0 is cached under `prompts:page:0`, and for the next minute every org's page 0 is Org A's list. Row-level security can't help: the leak never reaches the database.",
      fix: { code: 'key = f"prompts:{user.org_id}:page:{page}"' },
      hint: 'Two users from different orgs ask for page 0. What do they each get?',
    },
    {
      kind: 'match',
      id: 'what-breaks',
      prompt: 'At 10x, things break in different places. **Hot paths** (open a prompt, start a run, stream) need fast reads; **cold paths** (dashboards, billing, exports) can lag. Match each symptom to its fix.',
      pairs: [
        { left: '`runs` indexes no longer fit in memory', right: 'Monthly partitions; old ones dropped or archived' },
        { left: 'Opening a popular prompt hits Postgres and object storage every time', right: 'Cache versions by id; immutable, so never stale' },
        { left: 'Usage dashboards slow down the primary', right: 'Serve analytics from a replica or a warehouse' },
        { left: "One primary can't absorb run status writes", right: 'Shard metadata by `org_id` behind a directory' },
        { left: "One org's eval starves everyone's runs", right: 'Per-org quotas and fair scheduling on the queue' },
      ],
      explanation:
        'Each fix moves load off a hot path or bounds it: caches and partitions keep hot reads small, replicas move cold reads away, shards split writes, and quotas bound any one tenant. Say which path a fix protects.',
    },
    {
      kind: 'concept',
      id: 'write-tradeoff',
      eyebrow: 'Tradeoffs',
      title: 'Write the tradeoff down',
      body: "Every storage choice gives something up. Write it so a reader can argue with it:\n\n> We chose **X** over **Y** because [a requirement or a number]. It costs us [what we gave up]. We'd revisit if [an observable trigger].\n\nTwo rules. Name a real alternative, not a straw man. And make the trigger observable: a metric crossing a line, or a requirement arriving.",
    },
    {
      kind: 'compare',
      id: 'metadata-db',
      question: "Your doc's storage section needs one paragraph on the metadata database. Which one belongs there?",
      a: 'We will use a distributed SQL database for metadata. It scales horizontally, survives losing a node without manual failover, and still gives us serializable transactions. Products like ours outgrow a single Postgres, and migrating a live database later is far riskier than starting distributed.',
      b: "We chose one Postgres primary plus a replica over distributed SQL because peak is about 70 runs a second and metadata grows well under 1 TB a year, and *insert a version, move the head* stays one local transaction. Cost: a vertical ceiling, and failover we run ourselves. Revisit if sustained writes pass half the primary's tested capacity; then shard by `org_id`.",
      better: 'b',
      explanation:
        "Both designs are defensible; B is the better paragraph: it ties the choice to this system's numbers, admits its cost and gives a trigger you can measure. A argues from what products *like ours* do and never prices its own costs (consensus latency on every write, a harder system to run). Its migration worry is real, and B answers it: *a vertical ceiling*, plus when to act.",
    },
    {
      kind: 'cloze',
      id: 'outputs-tradeoff',
      prompt: 'Now write one yourself. Fill the blanks so this tradeoff is honest and checkable.',
      code: 'We chose\n{{0}}\nfor run outputs over\n{{1}}\nbecause outputs are written once,\nread whole, and most of our bytes.\nIt costs a second round trip per\nrun page. We\'d revisit if\n{{2}}.',
      lang: 'text',
      blanks: [
        { options: ['object storage', 'Postgres TEXT columns', 'the cache'], answer: 0 },
        { options: ['Postgres TEXT columns', 'object storage', 'a CDN'], answer: 0 },
        { options: ['users need search inside outputs', 'outputs keep getting bigger', 'it ever becomes a problem'], answer: 0 },
      ],
      explanation:
        'Postgres really can hold a 10 MB value (it moves large values out of line), so it is a fair alternative, not a straw man; it loses on backup size and replication cost. *Users need search inside outputs* is a requirement you would notice arriving; bigger outputs only strengthen the choice, and *if it becomes a problem* never fires.',
      hint: 'The *because* clause describes which store? And which trigger could you actually observe?',
    },
    {
      kind: 'interview',
      id: 'scale-round',
      eyebrow: 'Put it together',
      setup: 'Your doc: Postgres for metadata, object storage for bodies and outputs, a cache for hot versions, runs partitioned by month. Peak today is about 70 runs a second.',
      turns: [
        {
          interviewer: 'Traffic is 100x. Where does your design break first?',
          options: [
            {
              text: '"The database usually breaks first, so I\'d shard Postgres by `org_id` now, add read replicas, and cache version reads."',
              quality: 'okay',
              feedback: 'Sharding by org may well come, but you skipped the step that shows judgment: which component runs out of headroom first, and by how much.',
            },
            {
              text: '"Put every service on Kubernetes with autoscaling, so each tier scales out on its own as load grows and nothing hits a wall."',
              quality: 'weak',
              feedback: "Autoscaling stateless servers doesn't scale a database primary or a provider's rate limit. That's naming a tool, not finding a bottleneck.",
            },
            {
              text: '"Numbers first: 7,000 runs/s × 3,000 tokens ≈ 20M tokens/s, so provider capacity breaks first. Then ~20k status writes/s on one primary."',
              quality: 'strong',
              feedback: 'Strong. You ranked bottlenecks by arithmetic (3,000 tokens a run; three status writes a run) and can fix them in order: provider capacity and quotas, then batched writes, then sharding.',
            },
          ],
        },
        {
          interviewer: 'You shard by org. One customer is 40% of all runs.',
          options: [
            {
              text: '"Give that tenant a dedicated shard and keep an `org → shard` directory, so placement can change later. Quotas still bound them."',
              quality: 'strong',
              feedback: 'Strong. A directory, not a hash, makes the whale a placement decision you can change later.',
            },
            {
              text: '"Re-shard on a hash of `run_id` instead, so load spreads evenly across shards no matter which tenant sends it."',
              quality: 'okay',
              feedback: 'Even load, but every per-org query now fans out to every shard. You fixed one tenant by taxing all of them.',
            },
            {
              text: '"Cap that account at its current share until we add capacity, and ask the customer to spread runs over the day."',
              quality: 'weak',
              feedback: 'A support ticket, not a design: the skew stays, and your largest customer is the one you can least afford to throttle. Design for skew; it is normal.',
            },
          ],
        },
        {
          interviewer: 'A customer says their runs have been slow since Tuesday. What do you look at?',
          options: [
            {
              text: '"Tuesday\'s deploys first, then that day\'s database CPU, queue depth and error-rate graphs, to see what changed."',
              quality: 'okay',
              feedback: 'Reasonable places to look, but system-wide graphs can look healthy while one tenant suffers. Start from their runs.',
            },
            {
              text: '"Their runs\' traces: API, limit check, queue wait, time to first token, storage. The span that grew since Tuesday names the owner."',
              quality: 'strong',
              feedback: 'Strong. A trace per run turns *slow* into *which stage got slow*: longer queue waits mean capacity or fairness, a longer time to first token means the provider, a slower API span means your database.',
            },
            {
              text: '"Run a few prompts from my own account; if they feel fast, it is probably their network or their prompts."',
              quality: 'weak',
              feedback: "An anecdote from a different org, prompt and time, used to dismiss the report. You'd be debugging your experience, not theirs.",
            },
          ],
        },
      ],
      wrapUp:
        'At scale, the strong answers all start the same way: measure or compute first, find the component with the least headroom, then fix that and name what it costs.',
    },
    {
      kind: 'concept',
      id: 'recap',
      title: 'Remember',
      body: "1. **Shape picks the store**: Postgres for small queried rows, object storage for big immutable blobs, a cache for hot data you can lose. Put `org_id` on every row and in every cache key.\n2. **Partition `runs` by time**, index by tenant, shard by org only when the numbers say so.\n3. **Write tradeoffs** as *X over Y because…; it costs…; revisit if…*, with a trigger you can observe.",
    },
  ],
  cards: [
    {
      id: 'design-scale.retention',
      skill: 'design.storage',
      kind: 'numeric',
      prompt: 'A service stores a 4 KB output for each of 500,000 runs a day and deletes outputs after 90 days. How many GB does it hold once it reaches steady state?',
      answer: 180,
      tolerance: 0.2,
      unit: 'GB',
      explanation: '500,000 × 4 KB = 2 GB a day, × 90 days = **180 GB**. Retention turns endless growth into a fixed size; without it, the same service holds 730 GB after one year and keeps growing.',
    },
    {
      id: 'design-scale.drop-partition',
      skill: 'design.storage',
      kind: 'mcq',
      prompt: 'Why does range-partitioning a huge table by month make "delete rows older than 90 days" cheap in Postgres?',
      choices: [
        {
          text: 'Old months are whole partitions, so you drop them instead of deleting rows one by one',
          correct: true,
          feedback: 'Yes. Dropping a partition is close to a metadata operation; a mass DELETE has to touch every row.',
        },
        { text: 'Partitioned tables delete rows faster because each partition has its own index', feedback: 'Smaller indexes help a little, but a DELETE still visits every row and leaves dead tuples to vacuum.' },
        { text: 'Postgres automatically expires rows that fall outside every partition range', feedback: 'It does not. You (or an extension or cron job) drop old partitions explicitly.' },
        { text: 'Partitioning compresses old months, so their rows stop costing storage', feedback: 'Plain Postgres partitioning does not compress anything. The win is that an entire partition can be dropped at once.' },
      ],
      explanation: 'Pick the partition key so your biggest delete is a drop. For time-bounded data, that key is time.',
    },
    {
      id: 'design-scale.hot-cold',
      skill: 'design.storage',
      kind: 'sort',
      prompt: 'In a prompt playground, is each request on the hot path or the cold path?',
      buckets: [
        { id: 'hot', label: 'Hot: fast, every time' },
        { id: 'cold', label: 'Cold: can lag' },
      ],
      items: [
        { text: 'Check the rate limit before starting a run', bucket: 'hot', why: 'Runs on every request, before any work starts.' },
        { text: 'Load the current version when a prompt opens', bucket: 'hot', why: 'A person is staring at a spinner.' },
        { text: 'Stream tokens to the browser', bucket: 'hot', why: 'Latency here is the product.' },
        { text: 'Build the monthly usage invoice', bucket: 'cold', why: 'Hours of delay are fine; correctness matters more.' },
        { text: 'Refresh the team analytics dashboard', bucket: 'cold', why: 'Minutes stale is acceptable. Serve it from a replica or warehouse.' },
      ],
      explanation: 'Hot paths get caches, few hops and no heavy queries. Cold paths go async, onto replicas or a warehouse, so they never slow the hot ones.',
    },
    {
      id: 'design-scale.rls-header',
      skill: 'design.storage',
      kind: 'spotbug',
      prompt: "Every table has row-level security on `app.org_id`. A user still reads another org's data. Tap the line.",
      code: 'def as_tenant(request, sql, args):\n    user = authenticate(request)\n    org = request.headers["X-Org-Id"]\n    with db.transaction() as tx:\n        tx.execute(\n            "SELECT set_config("\n            "\'app.org_id\', %s, true)",\n            (org,),\n        )\n        cur = tx.execute(sql, args)\n        return cur.fetchall()',
      bugLines: [3],
      explanation: "The tenant comes from a header the client controls, so anyone can claim any org and RLS faithfully shows them that org's rows. Take the org from the authenticated session, or verify membership before setting it.",
      fix: { code: 'org = request.headers["X-Org-Id"]\nif org not in user.org_ids:\n    raise Forbidden(org)' },
    },
    {
      id: 'design-scale.cache-tradeoff',
      skill: 'design.tradeoffs',
      kind: 'compare',
      question: 'Which sentence about caching belongs in a design doc?',
      a: 'We cache version bodies in Redis, keyed by `(org_id, version_id)`, instead of reading Postgres and object storage on every open, because opens are most of our reads and versions are immutable, so entries never go stale. It costs memory and one more service. We revisit if the hit rate drops below 80%.',
      b: 'We put Redis in front of Postgres for prompt reads with a 5-minute TTL, which should cut database load substantially. If users see stale prompts we can lower the TTL. Redis is widely used and the team knows it well, so the operational risk is low.',
      better: 'a',
      explanation: "A gives the key, the alternative, the reason it is safe (immutability), the cost and a measurable trigger. B caches the mutable prompt instead of immutable versions, so it buys load relief with staleness and leaves the dial to users' complaints. It never names the key, so tenant isolation is left to chance.",
    },
    {
      id: 'design-scale.org-id',
      skill: 'design.storage',
      kind: 'flash',
      front: 'Why put `org_id` on every tenant-owned table, even when a join could recover it?',
      back: 'Every tenant filter, index, partition, shard key and row-level security policy then needs only that one column. Without it, isolation depends on every query remembering the right join.',
    },
    {
      id: 'design-scale.partition-vs-shard',
      skill: 'design.storage',
      kind: 'flash',
      front: 'Partition key vs shard key: what is the difference, and what might each be for a `runs` table?',
      back: 'Partitioning splits a table inside one database (by month, so old data drops cheaply). Sharding splits data across machines (by `org_id`, so a tenant stays on one node). Many systems use both.',
    },
  ],
}

export default lesson
