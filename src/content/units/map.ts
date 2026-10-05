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
  why: "Candidates report a loop where the coding is practical and the culture round decides more offers than people expect. Know what each round screens for before you spend prep time, and know when AI help is and isn't allowed.",
  lessons: [mapLoop, mapSignals, mapAiRules],
}

export default course
