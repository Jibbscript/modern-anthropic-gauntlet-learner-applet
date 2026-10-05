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
  why: "The recruiter screen pushes past \"I want to work on cutting-edge AI\": why Anthropic specifically, how it differs from other labs, what the biggest risks are, and where you disagree. This course gives you the dated facts and the structure to form your own answer, critiques included.",
  lessons: [whyMission, whyRsp, whyResearch, whyRisks, whyYourWhy],
}

export default course
