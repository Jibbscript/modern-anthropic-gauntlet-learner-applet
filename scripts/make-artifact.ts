/**
 * Turn the single-file build (dist-artifact/index.html) into a publishable
 * artifact page: the artifact host supplies <!doctype>, <html>, <head> and
 * <body> itself, so we emit only the title, font stylesheet, inline styles,
 * the root element and the inline script. Output: artifact/gauntlet.html
 */
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'

const html = readFileSync('dist-artifact/index.html', 'utf8')
const head = html.match(/<head>([\s\S]*?)<\/head>/i)?.[1] ?? ''
const body = html.match(/<body>([\s\S]*?)<\/body>/i)?.[1] ?? ''

const title = head.match(/<title>[\s\S]*?<\/title>/i)?.[0] ?? '<title>Gauntlet</title>'
const fonts = [...head.matchAll(/<link[^>]+rel="stylesheet"[^>]*>|<link\s+rel="stylesheet"[\s\S]*?\/>/gi)].map((m) => m[0]).filter((l) => l.includes("fonts.googleapis.com"))
const styles = [...head.matchAll(/<style[^>]*>[\s\S]*?<\/style>/gi)].map((m) => m[0])
const headScripts = [...head.matchAll(/<script[^>]*>[\s\S]*?<\/script>/gi)].map((m) => m[0])
const bodyNoScripts = body.replace(/<script[\s\S]*?<\/script>/gi, '').trim()
const bodyScripts = [...body.matchAll(/<script[^>]*>[\s\S]*?<\/script>/gi)].map((m) => m[0])

const out = [
  title,
  '<meta name="description" content="Interactive, spaced-repetition prep for the Anthropic interview loop.">',
  '<link rel="preconnect" href="https://fonts.googleapis.com">',
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
  ...fonts,
  ...styles,
  bodyNoScripts,
  ...headScripts,
  ...bodyScripts,
].join('\n')

mkdirSync('artifact', { recursive: true })
writeFileSync('artifact/gauntlet.html', out)
const kb = Math.round(statSync('artifact/gauntlet.html').size / 1024)
console.log(`artifact/gauntlet.html written (${kb} KB)`)
if (kb > 15 * 1024) {
  console.error('artifact exceeds 15MB')
  process.exit(1)
}
