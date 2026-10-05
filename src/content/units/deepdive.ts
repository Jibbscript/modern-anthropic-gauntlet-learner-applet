import type { Course } from '../../core/types'
import deepSelection from '../lessons/deep-selection'
import deepLayers from '../lessons/deep-layers'
import deepDrilldown from '../lessons/deep-drilldown'

const course: Course = {
  id: 'deepdive',
  title: 'Project Deep Dive',
  subtitle: 'Explaining one project all the way down',
  color: 'orange',
  icon: 'search',
  why: "Expect to explain one real project far below the summary: your ownership, the decisions and the alternatives you rejected, the numbers, and what broke. Choose the project and rehearse the drill-downs before an interviewer does it for you.",
  lessons: [deepSelection, deepLayers, deepDrilldown],
}

export default course
