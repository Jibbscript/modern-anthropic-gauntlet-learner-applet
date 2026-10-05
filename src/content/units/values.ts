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
  why: "Reports describe the values round as unusually deep: what you actually thought at the time, how you feel about it now, when you disagreed with your company, how you trade speed against safety. Blind agreement is a weak strategy. Interviewers are looking for your own judgment, explained honestly, and a willingness to update.",
  lessons: [valuesProbes, valuesDepth, valuesDisagree, valuesEthics, valuesUpdating, valuesSelf],
}

export default course
