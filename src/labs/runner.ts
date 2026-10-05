import { useSyncExternalStore } from 'react'
import { HARNESS_PY } from './harness.py'

/**
 * In-browser Python for code labs. Pyodide runs in a Web Worker built from a
 * Blob URL so a runaway loop can never freeze the UI: the main thread keeps a
 * watchdog and terminates the worker when a test stops making progress, then
 * recreates it lazily on the next run.
 *
 * If the worker or Pyodide cannot load (CSP inside sandboxed frames, offline,
 * very slow network) the runner reports status 'unavailable' and run()
 * rejects with a RunnerUnavailableError; the lab UI then offers self-check.
 */

export const PYODIDE_VERSION = '0.29.5'
export const PYODIDE_INDEX_URL = `https://cdn.jsdelivr.net/npm/pyodide@${PYODIDE_VERSION}/`
/** the npm build has no package wheels; unvendored stdlib modules (sqlite3, lzma...) come from the full dist */
const PYODIDE_PACKAGES_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`

export type RunnerStatus = 'idle' | 'loading' | 'ready' | 'unavailable'

export interface TestResult {
  name: string
  /** 1-based level the test belongs to */
  level: number
  ok: boolean
  /** concise failure: assertion message, or exception + the learner's line */
  error?: string
  /** learner's line number (solution.py) where the failure surfaced */
  line?: number
  /** short traceback limited to solution.py / test frames */
  trace?: string
  /** this test hit a timeout (async per-test timeout or the watchdog) */
  timeout?: boolean
  /** not run because an earlier test hung and the worker was restarted */
  skipped?: boolean
  ms: number
}

export interface RunResult {
  results: TestResult[]
  stdout: string
  /** syntax / import / module-level errors, line numbers refer to the learner's code */
  error?: string
  errorLine?: number
  timedOut?: boolean
  /** wall time in Python, ms */
  ms?: number
}

export class RunnerUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RunnerUnavailableError'
  }
}

/** stdlib modules Pyodide ships as separate packages; loaded on demand */
const STDLIB_PACKAGES: Record<string, string> = { sqlite3: 'sqlite3', lzma: 'lzma', ssl: 'ssl', _hashlib: 'hashlib' }

/** how long Pyodide may take to download + boot before we give up */
const LOAD_TIMEOUT_MS = 90_000
/** grace period for package loading + module exec before the first test starts */
const START_GRACE_MS = 20_000

function workerSource(): string {
  return `
"use strict";
const INDEX_URL = ${JSON.stringify(PYODIDE_INDEX_URL)};
const PACKAGES_URL = ${JSON.stringify(PYODIDE_PACKAGES_URL)};
const HARNESS = ${JSON.stringify(HARNESS_PY)};
const STDLIB = ${JSON.stringify(STDLIB_PACKAGES)};
let py = null;
const booting = (async () => {
  const t0 = Date.now();
  try {
    importScripts(INDEX_URL + "pyodide.js");
    py = await loadPyodide({ indexURL: INDEX_URL, packageBaseUrl: PACKAGES_URL, stdout: () => {}, stderr: () => {} });
    py.runPython(HARNESS);
    self.postMessage({ type: "ready", ms: Date.now() - t0 });
  } catch (err) {
    self.postMessage({ type: "failed", message: String((err && err.message) || err) });
  }
})();
function wantedPackages(src) {
  const out = new Set();
  const re = /^\\s*(?:import|from)\\s+([A-Za-z_][\\w]*)/gm;
  let m;
  while ((m = re.exec(src))) if (STDLIB[m[1]]) out.add(STDLIB[m[1]]);
  return [...out];
}
self.onmessage = async (e) => {
  const msg = e.data;
  if (!msg || msg.type !== "run") return;
  await booting;
  if (!py) return;
  const id = msg.id;
  try {
    const pkgs = wantedPackages(msg.code + "\\n" + msg.tests.join("\\n"));
    if (pkgs.length) {
      try { await py.loadPackage(pkgs, { messageCallback: () => {}, errorCallback: () => {} }); } catch (_) {}
    }
    const report = (s) => self.postMessage({ type: "progress", id, data: s });
    py.globals.set("__g_code", msg.code);
    py.globals.set("__g_tests", JSON.stringify(msg.tests));
    py.globals.set("__g_timeout", msg.testTimeout);
    py.globals.set("__g_report", report);
    const out = await py.runPythonAsync("await run_suite(__g_code, __g_tests, __g_timeout, __g_report)");
    self.postMessage({ type: "result", id, data: String(out) });
  } catch (err) {
    self.postMessage({ type: "crash", id, message: String((err && err.message) || err) });
  }
};
`
}

type FromWorker =
  | { type: 'ready'; ms: number }
  | { type: 'failed'; message: string }
  | { type: 'progress'; id: number; data: string }
  | { type: 'result'; id: number; data: string }
  | { type: 'crash'; id: number; message: string }

type Progress =
  | { type: 'plan'; plan: { level: number; names: string[] }[] }
  | { type: 'start'; name: string; level: number }
  | { type: 'done'; result: TestResult }
  | { type: 'out'; s: string }

function lastLines(s: string, n: number): string {
  const lines = s.trim().split('\n')
  return lines.slice(-n).join('\n')
}

class Runner {
  status: RunnerStatus = 'idle'
  /** why the runner is unavailable, for the UI */
  reason = ''
  /** ms Pyodide took to boot the last time */
  bootMs: number | null = null

  private worker: Worker | null = null
  private url: string | null = null
  private ready: Promise<Worker> | null = null
  private listeners = new Set<() => void>()
  private handlers = new Map<number, (m: FromWorker) => void>()
  private seq = 0
  private queue: Promise<unknown> = Promise.resolve()

  subscribe = (fn: () => void) => {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  private set(status: RunnerStatus, reason = '') {
    if (this.status === status && this.reason === reason) return
    this.status = status
    this.reason = reason
    this.listeners.forEach((l) => l())
  }

  /** start downloading + booting Pyodide in the background (idempotent) */
  warmup(): Promise<void> {
    return this.ensureReady().then(
      () => undefined,
      () => undefined,
    )
  }

  /** forget an 'unavailable' verdict and try loading again */
  retry(): Promise<void> {
    if (this.status === 'unavailable') {
      this.kill()
      this.set('idle')
    }
    return this.warmup()
  }

  private ensureReady(): Promise<Worker> {
    if (this.status === 'unavailable') return Promise.reject(new RunnerUnavailableError(this.reason))
    if (this.ready) return this.ready
    this.set('loading')
    this.ready = new Promise<Worker>((resolve, reject) => {
      const fail = (why: string) => {
        clearTimeout(timer)
        this.kill()
        this.set('unavailable', why)
        reject(new RunnerUnavailableError(why))
      }
      const timer = setTimeout(() => fail('Python took too long to download. Check your connection and try again.'), LOAD_TIMEOUT_MS)
      let w: Worker
      try {
        if (typeof Worker === 'undefined') throw new Error('Web Workers are not supported')
        this.url = URL.createObjectURL(new Blob([workerSource()], { type: 'text/javascript' }))
        w = new Worker(this.url)
      } catch (err) {
        fail(`The Python runtime can't start here (${String((err as Error)?.message || 'workers blocked').replace(/\.$/, '')}).`)
        return
      }
      this.worker = w
      w.onmessage = (e: MessageEvent<FromWorker>) => {
        const m = e.data
        if (m.type === 'ready') {
          clearTimeout(timer)
          this.bootMs = m.ms
          this.set('ready')
          resolve(w)
        } else if (m.type === 'failed') {
          const blocked = /importScripts|NetworkError|Failed to fetch|load/i.test(m.message)
          fail(
            blocked
              ? 'The Python download was blocked: you may be offline, or this page does not allow it.'
              : `The Python runtime couldn't load here (${m.message.split('\n')[0].slice(0, 160).replace(/\.$/, '')}).`,
          )
        } else if ('id' in m) {
          this.handlers.get(m.id)?.(m)
        }
      }
      w.onerror = (e) => {
        e.preventDefault?.()
        if (this.status === 'loading') fail(`The Python runtime couldn't start here (${e.message || 'worker blocked'}).`)
      }
    })
    // avoid unhandled-rejection noise for fire-and-forget warmups
    this.ready.catch(() => {})
    return this.ready
  }

  private kill() {
    try {
      this.worker?.terminate()
    } catch {
      /* already gone */
    }
    if (this.url) URL.revokeObjectURL(this.url)
    this.worker = null
    this.url = null
    this.ready = null
    this.handlers.clear()
  }

  /**
   * Run the learner's code against cumulative test sources (index 0 = level 1).
   * `timeoutMs` is a watchdog: each test (and loading the learner's module)
   * gets that long; when it trips, the worker is terminated and the result
   * reports `timedOut` with the hung test marked failed.
   */
  run(userCode: string, testSources: string[], timeoutMs = 8000): Promise<RunResult> {
    const job = this.queue.then(() => this.exec(userCode, testSources, timeoutMs))
    this.queue = job.catch(() => {})
    return job
  }

  private async exec(userCode: string, testSources: string[], timeoutMs: number): Promise<RunResult> {
    const w = await this.ensureReady()
    const id = ++this.seq
    return new Promise<RunResult>((resolve) => {
      let plan: { level: number; names: string[] }[] | null = null
      const done: TestResult[] = []
      let current: { name: string; level: number } | null = null
      let stdout = ''
      let timer = setTimeout(() => onTimeout(), timeoutMs + START_GRACE_MS)
      const arm = () => {
        clearTimeout(timer)
        timer = setTimeout(() => onTimeout(), timeoutMs)
      }
      const finish = (r: RunResult) => {
        clearTimeout(timer)
        this.handlers.delete(id)
        resolve(r)
      }
      const secs = `${Math.round(timeoutMs / 100) / 10}s`
      const onTimeout = () => {
        this.kill()
        this.set('idle')
        const results = [...done]
        const seen = new Set(done.map((r) => `${r.level}:${r.name}`))
        if (current && !seen.has(`${current.level}:${current.name}`)) {
          results.push({
            ...current,
            ok: false,
            timeout: true,
            ms: timeoutMs,
            error: `Timed out after ${secs} and was stopped. Look for an infinite loop or a wait that never finishes.`,
          })
          seen.add(`${current.level}:${current.name}`)
        }
        for (const p of plan ?? [])
          for (const name of p.names)
            if (!seen.has(`${p.level}:${name}`))
              results.push({ name, level: p.level, ok: false, skipped: true, ms: 0, error: 'Not run: an earlier test hung, so Python was restarted.' })
        const loading = !current && done.length === 0
        finish({
          results,
          stdout,
          timedOut: true,
          error: loading ? `Your code didn't finish loading within ${secs}. Is there an infinite loop at the top level of your file?` : undefined,
        })
      }
      this.handlers.set(id, (m) => {
        if (m.type === 'progress') {
          let p: Progress
          try {
            p = JSON.parse(m.data) as Progress
          } catch {
            return
          }
          if (p.type === 'plan') {
            plan = p.plan
            arm()
          } else if (p.type === 'start') {
            current = { name: p.name, level: p.level }
            arm()
          } else if (p.type === 'done') {
            done.push(p.result)
          } else if (p.type === 'out') {
            if (stdout.length < 20000) stdout += p.s
          }
        } else if (m.type === 'result') {
          try {
            finish(JSON.parse(m.data) as RunResult)
          } catch {
            finish({ results: done, stdout, error: 'The test harness returned an unreadable result.' })
          }
        } else if (m.type === 'crash') {
          // Pyodide itself failed (e.g. a fatal stack overflow): start fresh next time
          this.kill()
          this.set('idle')
          finish({ results: done, stdout, error: `Python crashed while running your code:\n${lastLines(m.message, 6)}` })
        }
      })
      w.postMessage({ type: 'run', id, code: userCode, tests: testSources, testTimeout: Math.max(0.5, (timeoutMs * 0.75) / 1000) })
    })
  }
}

let singleton: Runner | null = null

/** the shared runner (one Pyodide worker for the whole app) */
export function getRunner(): Runner {
  if (!singleton) singleton = new Runner()
  return singleton
}

export type { Runner }

/** React hook: re-renders when the runner's status changes */
export function useRunnerStatus(): RunnerStatus {
  const r = getRunner()
  return useSyncExternalStore(r.subscribe, () => r.status, () => r.status)
}

/** test function names in a level's source, in definition order */
export function testNames(source: string): string[] {
  const out: string[] = []
  const re = /^(?:async\s+)?def\s+(test_\w+)\s*\(/gm
  let m: RegExpExecArray | null
  while ((m = re.exec(source))) out.push(m[1])
  return out
}
