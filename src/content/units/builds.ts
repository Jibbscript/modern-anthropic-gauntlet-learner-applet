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
  why: '',
  lessons: [buildCrawler, buildImage, buildStacktrace, buildCache, buildDedup, buildInterpreter, buildKvstore],
}

export default course
