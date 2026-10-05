import type { Course } from '../../core/types'
import mapLoop from '../lessons/map-loop'
import mapSignals from '../lessons/map-signals'
import mapAiRules from '../lessons/map-ai-rules'

const course: Course = {
  id: 'map',
  title: 'The Gauntlet',
  subtitle: 'How the loop works and what it screens for',
  color: 'slate',
  icon: 'compass',
  why: '',
  lessons: [mapLoop, mapSignals, mapAiRules],
}

export default course
