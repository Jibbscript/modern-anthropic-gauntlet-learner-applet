import {
  Bot,
  Brain,
  Code2,
  Compass,
  Cpu,
  Database,
  FlaskConical,
  Heart,
  Layers,
  Network,
  PenLine,
  Route,
  Search,
  Shield,
  Target,
  TerminalSquare,
  type LucideProps,
} from 'lucide-react'
import type { ComponentType } from 'react'
import type { IconName } from '../core/types'

const MAP: Record<IconName, ComponentType<LucideProps>> = {
  compass: Compass,
  shield: Shield,
  heart: Heart,
  code: Code2,
  cpu: Cpu,
  layers: Layers,
  pen: PenLine,
  bot: Bot,
  search: Search,
  network: Network,
  database: Database,
  brain: Brain,
  target: Target,
  flask: FlaskConical,
  terminal: TerminalSquare,
  route: Route,
}

export function CourseIcon({ name, ...rest }: { name: IconName } & LucideProps) {
  const C = MAP[name] ?? Compass
  return <C strokeWidth={2.4} {...rest} />
}
