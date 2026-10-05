/** Render public/icon.svg to the PNG sizes iOS/Android want. Run: npx tsx scripts/icons.ts */
import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const svg = readFileSync('public/icon.svg', 'utf8')
const browser = await chromium.launch()
for (const size of [180, 192, 512]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  // iOS masks the apple-touch icon itself and fills transparency with black, so 180px is full-bleed
  const src = size === 180 ? svg.replaceAll('rx="116"', 'rx="0"') : svg
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{width:${size}px;height:${size}px;display:block}</style>${src}`)
  await page.screenshot({ path: `public/icon-${size}.png`, omitBackground: true })
  await page.close()
}
await browser.close()
console.log('icons written')
