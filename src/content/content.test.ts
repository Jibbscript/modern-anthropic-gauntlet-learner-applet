import { describe, expect, it } from 'vitest'
import { COURSES } from './index'
import { validateCourses } from './validate'

describe('content', () => {
  it('has no validation errors', () => {
    const errors = validateCourses(COURSES).filter((i) => i.level === 'error')
    expect(errors.map((e) => `${e.where}: ${e.msg}`)).toEqual([])
  })
})
