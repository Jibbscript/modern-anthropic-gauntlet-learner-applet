/**
 * Validate course content. Usage:
 *   npm run validate            # all units
 *   npm run validate -- why     # one unit (by area id)
 */
import { COURSES } from '../src/content/index'
import { validateCourses } from '../src/content/validate'

const only = process.argv[2]
const courses = only ? COURSES.filter((c) => c.id === only) : COURSES
if (only && !courses.length) {
  console.error(`no unit "${only}"`)
  process.exit(2)
}
const issues = validateCourses(courses)
const errors = issues.filter((i) => i.level === 'error')
for (const i of issues) console.log(`${i.level === 'error' ? '✗' : '!'} ${i.where}: ${i.msg}`)
let steps = 0, cards = 0, lessons = 0
for (const c of courses) for (const l of c.lessons) { lessons++; steps += l.steps.length; cards += l.cards.length }
console.log(`\n${courses.length} units, ${lessons} lessons, ${steps} steps, ${cards} cards — ${errors.length} errors, ${issues.length - errors.length} warnings`)
process.exit(errors.length ? 1 : 0)
