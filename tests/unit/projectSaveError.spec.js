// issues/130: a repeated project Codi showed «Error: This attribute must be
// unique» (the backend's English message, without naming the field)
import { describe, it, expect } from 'vitest'
import { isDuplicateCodeError, projectSaveErrorMessage } from '@/domain/projectSaveError'

// Strapi v5's answer to a POST/PUT with a taken unique attribute
const unique = {
  response: {
    status: 400,
    data: {
      error: {
        status: 400,
        name: 'ValidationError',
        message: 'This attribute must be unique',
        details: { errors: [{ path: ['name'], message: 'This attribute must be unique', name: 'ValidationError', value: 'R/26. Projecte' }] }
      }
    }
  }
}

describe('project save errors (issues/130)', () => {
  it('tells a taken Codi in Catalan and names it', () => {
    expect(isDuplicateCodeError(unique)).toBe(true)
    const msg = projectSaveErrorMessage(unique, 'R/26. Projecte')
    expect(msg).toContain('Ja hi ha un projecte amb el codi «R/26. Projecte»')
    expect(msg).not.toMatch(/unique/)
  })
  it('keeps other errors as they were', () => {
    const other = { response: { data: { error: { message: 'Invalid date' } } } }
    expect(isDuplicateCodeError(other)).toBe(false)
    expect(projectSaveErrorMessage(other, 'X')).toBe("S'ha produït un error al guardar el projecte: Invalid date")
    expect(projectSaveErrorMessage(new Error('Network Error'), 'X')).toBe("S'ha produït un error al guardar el projecte")
  })
})
