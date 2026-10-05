import type { Course } from '../../core/types'
import whyMission from '../lessons/why-mission'
import whyRsp from '../lessons/why-rsp'
import whyResearch from '../lessons/why-research'
import whyRisks from '../lessons/why-risks'
import whyYourWhy from '../lessons/why-your-why'

const course: Course = {
  id: 'why',
  title: 'Why Anthropic',
  subtitle: 'The recruiter screen, done properly',
  color: 'violet',
  icon: 'shield',
  why: '',
  lessons: [whyMission, whyRsp, whyResearch, whyRisks, whyYourWhy],
}

export default course
