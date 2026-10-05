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
  why: '',
  lessons: [pyIdioms, pyCollections, pyProgressive, pyTesting, pyDebugging],
}

export default course
