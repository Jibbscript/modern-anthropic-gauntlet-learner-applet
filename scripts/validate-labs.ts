/**
 * Validate code-lab content by running it through the same Python harness
 * the app uses (src/labs/harness.py.ts), in CPython:
 *   - the starter code must fail level 1
 *   - level N's reference solution must pass every test of levels 1..N
 *   - level N's solution must fail level N+1's tests (new tests are meaningful)
 * Usage: npx tsx scripts/validate-labs.ts   (requires python3 >= 3.11)
 */
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { ALL_LABS } from '../src/labs/data/index'
import { HARNESS_PY } from '../src/labs/harness.py'

const dir = mkdtempSync(join(tmpdir(), 'gauntlet-labs-'))
const jobs: { lab: string; label: string; code: string; tests: string[]; expect: 'pass' | 'fail' }[] = []
for (const lab of ALL_LABS) {
  if (!lab.levels.length) continue
  jobs.push({ lab: lab.id, label: 'starter vs L1', code: lab.starter, tests: [lab.levels[0].tests], expect: 'fail' })
  lab.levels.forEach((lv, i) => {
    jobs.push({ lab: lab.id, label: `solution L${i + 1}`, code: lv.solution, tests: lab.levels.slice(0, i + 1).map((l) => l.tests), expect: 'pass' })
    if (i + 1 < lab.levels.length)
      jobs.push({ lab: lab.id, label: `solution L${i + 1} vs L${i + 2}`, code: lv.solution, tests: [lab.levels[i + 1].tests], expect: 'fail' })
  })
}
writeFileSync(join(dir, 'harness.py'), HARNESS_PY)
writeFileSync(join(dir, 'jobs.json'), JSON.stringify(jobs))
writeFileSync(
  join(dir, 'run.py'),
  `
import asyncio, json, os, sys
here = os.path.dirname(os.path.abspath(__file__))
g = {'__name__': 'harness'}
exec(compile(open(os.path.join(here, 'harness.py')).read(), 'harness.py', 'exec'), g)
jobs = json.load(open(os.path.join(here, 'jobs.json')))
bad = 0
for j in jobs:
    r = json.loads(asyncio.run(g['run_suite'](j['code'], json.dumps(j['tests']), 5.0, None)))
    res = r['results']
    ok = sum(1 for t in res if t['ok'])
    allpass = not r.get('error') and bool(res) and ok == len(res)
    good = allpass if j['expect'] == 'pass' else not allpass
    if not good:
        bad += 1
        print('✗', j['lab'], j['label'], '%d/%d' % (ok, len(res)), (r.get('error') or '')[:200])
        for t in res:
            if not t['ok'] and j['expect'] == 'pass':
                print('     ', t['name'], (t.get('error') or '')[:300].replace('\\n', ' | '))
print('%d lab checks, %d problems' % (len(jobs), bad))
sys.exit(1 if bad else 0)
`,
)
try {
  execFileSync('python3', [join(dir, 'run.py')], { stdio: 'inherit' })
} catch {
  process.exit(1)
}
