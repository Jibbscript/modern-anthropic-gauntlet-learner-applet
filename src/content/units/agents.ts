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
  why: "Anthropic's published candidate guidance asks for AI-free take-homes unless told otherwise, while newer rounds reportedly test how you drive a coding agent. Learn the rules, the workflow that shows judgment, and how to catch plausible-but-wrong output.",
  lessons: [agentsRules, agentsWorkflow, agentsReview],
}

export default course
