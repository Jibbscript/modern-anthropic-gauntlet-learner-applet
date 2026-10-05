import type { Course } from '../../core/types'
import buildCrawler from '../lessons/build-crawler'
import buildImage from '../lessons/build-image'
import buildStacktrace from '../lessons/build-stacktrace'
import buildCache from '../lessons/build-cache'
import buildDedup from '../lessons/build-dedup'
import buildInterpreter from '../lessons/build-interpreter'
import buildKvstore from '../lessons/build-kvstore'

const course: Course = {
  id: 'builds',
  title: 'Build Rounds',
  subtitle: 'The reported problems, built in levels',
  color: 'green',
  icon: 'layers',
  why: "These are the problems candidates report, rebuilt the way the rounds reportedly run them: make it work, extend it, make it concurrent or scalable, then test it yourself. Each one pairs with a Code Lab you can actually run.",
  lessons: [buildCrawler, buildImage, buildStacktrace, buildCache, buildDedup, buildInterpreter, buildKvstore],
}

export default course
