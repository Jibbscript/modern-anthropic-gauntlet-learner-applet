import type { Course } from '../../core/types'
import valuesProbes from '../lessons/values-probes'
import valuesDepth from '../lessons/values-depth'
import valuesDisagree from '../lessons/values-disagree'
import valuesEthics from '../lessons/values-ethics'
import valuesUpdating from '../lessons/values-updating'
import valuesSelf from '../lessons/values-self'

const course: Course = {
  id: 'values',
  title: 'Values & Judgment',
  subtitle: 'The round people actually fear',
  color: 'rose',
  icon: 'heart',
  why: '',
  lessons: [valuesProbes, valuesDepth, valuesDisagree, valuesEthics, valuesUpdating, valuesSelf],
}

export default course
