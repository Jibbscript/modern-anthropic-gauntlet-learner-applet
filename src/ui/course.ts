import type { CSSProperties } from 'react'
import type { CourseColor } from '../core/types'

/**
 * Maps a course hue onto the generic --c / --c-soft / --c-edge / --c-ink
 * variables, so any component styled with those picks up the course colour.
 */
export function courseStyle(color: CourseColor): CSSProperties {
  return {
    ['--c' as string]: `var(--c-${color})`,
    ['--c-soft' as string]: `var(--c-${color}-soft)`,
    ['--c-edge' as string]: `var(--c-${color}-edge)`,
    ['--c-ink' as string]: `var(--c-${color}-ink)`,
  }
}
