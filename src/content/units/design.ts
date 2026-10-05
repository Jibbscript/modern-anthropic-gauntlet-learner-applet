import type { Course } from '../../core/types'
import designDoc from '../lessons/design-doc'
import designRequirements from '../lessons/design-requirements'
import designCollab from '../lessons/design-collab'
import designVersions from '../lessons/design-versions'
import designScale from '../lessons/design-scale'

const course: Course = {
  id: 'design',
  title: 'Design in Prose',
  subtitle: 'System design in a shared doc',
  color: 'amber',
  icon: 'pen',
  why: "Some design rounds reportedly happen in a shared doc rather than on a whiteboard, so clear writing counts as much as boxes and arrows. You work through a Collaborative Prompt Playground: collaboration, versions, prompt execution, storage and scale.",
  lessons: [designDoc, designRequirements, designCollab, designVersions, designScale],
}

export default course
