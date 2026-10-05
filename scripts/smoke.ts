/**
 * Render every lesson step and review card in Chromium and report runtime
 * errors (console errors, page errors, error boundaries, stub views,
 * horizontal overflow).
 *   npx tsx scripts/smoke.ts [baseUrl] [--shots=dir] [--only=<lessonIdPrefix>] [--dark]
 * Without a base URL it builds the app in `smoke` mode (gallery included)
 * and serves it with `vite preview`, which is far lighter than the dev server.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { execSync, spawn } from 'node:child_process'
import { COURSES } from '../src/content/index'

const args = process.argv.slice(2)
let base = args.find((a) => !a.startsWith('--'))
let server: ReturnType<typeof spawn> | null = null
if (!base) {
  execSync('npx vite build --mode smoke --logLevel error', { stdio: 'inherit' })
  const port = 4179
  server = spawn('npx', ['vite', 'preview', '--outDir', 'dist-smoke', '--port', String(port), '--strictPort'], { stdio: 'ignore' })
  base = `http://localhost:${port}`
  for (let i = 0; i < 60; i++) {
    const ok = await fetch(base).then((r) => r.ok).catch(() => false)
    if (ok) break
    await new Promise((r) => setTimeout(r, 250))
  }
}
const shots = args.find((a) => a.startsWith('--shots='))?.slice(8)
const only = args.find((a) => a.startsWith('--only='))?.slice(7)
const dark = args.includes('--dark')
if (shots) mkdirSync(shots, { recursive: true })

const targets: { label: string; url: string }[] = []
for (const c of COURSES)
  for (const l of c.lessons) {
    if (only && !l.id.startsWith(only)) continue
    l.steps.forEach((s, i) => targets.push({ label: `${l.id}#${i}:${s.kind}`, url: `${base}/?gallery=lesson&id=${l.id}&step=${i}` }))
    l.cards.forEach((k) => targets.push({ label: `${k.id}:${k.kind}`, url: `${base}/?gallery=card&id=${encodeURIComponent(k.id)}` }))
  }

const proxy = process.env.HTTPS_PROXY || process.env.https_proxy
const browser = await chromium.launch(proxy ? { proxy: { server: proxy, bypass: 'localhost,127.0.0.1' } } : {})
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true, colorScheme: dark ? 'dark' : 'light' })
let errs: string[] = []
page.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
page.on('pageerror', (e) => errs.push(String(e)))

const failures: string[] = []
let n = 0
async function check(t: { label: string; url: string }) {
  errs = []
  await page.goto(t.url, { waitUntil: 'domcontentloaded' })
  try {
    await page.waitForSelector('[data-smoke]', { timeout: 8000 })
  } catch {
    errs.push('did not render')
  }
  await page.waitForTimeout(150)
  const state = await page.$eval('[data-smoke]', (el) => el.getAttribute('data-smoke')).catch(() => 'none')
  if (state !== 'ok') errs.push(`render state ${state}`)
  const boundary = await page.$('.widget-error')
  if (boundary) errs.push('widget error boundary: ' + (await boundary.innerText()))
  const unsupported = await page.getByText(/Unsupported step|TODO: /).count()
  if (unsupported) errs.push('unsupported / stub step view')
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  if (overflow) errs.push('horizontal overflow')
  if (shots) await page.screenshot({ path: `${shots}/${t.label.replace(/[^\w.-]+/g, '_')}.png` })
  return errs.filter((e) => !/favicon|fonts\.g|\[vite\]/.test(e))
}

for (const t of targets) {
  let real: string[]
  try {
    real = await check(t)
  } catch {
    // a dev-server reload can interrupt a check; retry once
    real = await check(t).catch((e) => [`check failed: ${String(e).split('\n')[0]}`])
  }
  if (real.length) failures.push(`${t.label}\n    ${real.join('\n    ')}`)
  if (++n % 50 === 0) console.log(`${n}/${targets.length}`)
}
await browser.close()
server?.kill()
console.log(`\n${targets.length} renders, ${failures.length} with problems`)
for (const f of failures) console.log('✗ ' + f)
process.exit(failures.length ? 1 : 0)
