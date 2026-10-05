import type { Course } from '../../core/types'
import concModels from '../lessons/conc-models'
import concRaces from '../lessons/conc-races'
import concLocks from '../lessons/conc-locks'
import concExecutors from '../lessons/conc-executors'
import concQueues from '../lessons/conc-queues'
import concAsync from '../lessons/conc-async'

const course: Course = {
  id: 'concurrency',
  title: 'Concurrency',
  subtitle: 'Threads, processes, asyncio, locks',
  color: 'teal',
  icon: 'cpu',
  why: '',
  lessons: [concModels, concRaces, concLocks, concExecutors, concQueues, concAsync],
}

export default course
