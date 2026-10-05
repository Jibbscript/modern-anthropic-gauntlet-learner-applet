import type { Course } from '../core/types'
import { buildCatalog } from '../core/adaptive'
import map from './units/map'
import why from './units/why'
import values from './units/values'
import python from './units/python'
import concurrency from './units/concurrency'
import builds from './units/builds'
import design from './units/design'
import agents from './units/agents'
import deepdive from './units/deepdive'

/** Courses in path order. */
export const COURSES: Course[] = [map, why, values, python, concurrency, builds, design, agents, deepdive]

export const CATALOG = buildCatalog(COURSES)
