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
  why: '',
  lessons: [deepSelection, deepLayers, deepDrilldown],
}

export default course
