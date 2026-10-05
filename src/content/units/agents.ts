import type { Course } from '../../core/types'
import agentsRules from '../lessons/agents-rules'
import agentsWorkflow from '../lessons/agents-workflow'
import agentsReview from '../lessons/agents-review'

const course: Course = {
  id: 'agents',
  title: 'With & Without AI',
  subtitle: 'Agentic rounds and AI-free take-homes',
  color: 'indigo',
  icon: 'bot',
  why: '',
  lessons: [agentsRules, agentsWorkflow, agentsReview],
}

export default course
