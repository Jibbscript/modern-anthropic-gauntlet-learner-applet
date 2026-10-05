/**
 * Screenshot helper for visual QA.
 *   npx tsx scripts/shot.ts <url> <out.png> [--dark] [--width=390] [--height=844] [--full] [--wait=600] [--click=selector]...
 * Prints console errors from the page. Uses the preinstalled Chromium.
 */
import { chromium } from 'playwright'
import { existsSync } from 'node:fs'

const args = process.argv.slice(2)
const [url, out] = args.filter((a) => !a.startsWith('--'))
const flag = (k: string) => args.find((a) => a.startsWith(`--${k}`))
const val = (k: string, d: number) => Number(flag(k)?.split('=')[1] ?? d)
const clicks = args.filter((a) => a.startsWith('--click=')).map((a) => a.slice(8))

// route external requests (Google Fonts) through the sandbox proxy when one is configured
const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy
const launchOpts = {
  ...(proxyUrl ? { proxy: { server: proxyUrl, bypass: 'localhost,127.0.0.1' } } : {}),
}
const browser = await chromium
  .launch(launchOpts)
  .catch(() => chromium.launch({ ...launchOpts, executablePath: existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined }))
const page = await browser.newPage({
  viewport: { width: val('width', 390), height: val('height', 844) },
  deviceScaleFactor: 2,
  colorScheme: flag('dark') ? 'dark' : 'light',
  ignoreHTTPSErrors: true,
})
// never let a slow external font block the screenshot
page.setDefaultTimeout(20000)
const errors: string[] = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(String(e)))
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(val('wait', 600))
for (const sel of clicks) {
  await page.click(sel)
  await page.waitForTimeout(400)
}
await page.screenshot({ path: out, fullPage: !!flag('full') })
await browser.close()
if (errors.length) console.log('PAGE ERRORS:\n' + errors.join('\n'))
console.log('saved', out)
