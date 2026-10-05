import type { Course } from '../../core/types'
import pyIdioms from '../lessons/py-idioms'
import pyCollections from '../lessons/py-collections'
import pyProgressive from '../lessons/py-progressive'
import pyTesting from '../lessons/py-testing'
import pyDebugging from '../lessons/py-debugging'

const course: Course = {
  id: 'python',
  title: 'Practical Python',
  subtitle: 'Usable code, tested and debugged',
  color: 'blue',
  icon: 'code',
  why: "The coding rounds reward usable code over puzzle tricks: the right container, clean interfaces, building in levels without rewrites, testing your own work and debugging unfamiliar code fast. This is the toolkit the build rounds assume.",
  lessons: [pyIdioms, pyCollections, pyProgressive, pyTesting, pyDebugging],
}

export default course
