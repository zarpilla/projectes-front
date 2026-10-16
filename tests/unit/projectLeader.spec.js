// New project: "Coordina" defaults to the logged-in user only when she can be chosen.
// Before, a hidden logged-in user made getAuxiliarData throw
// ("can't access property id, this.user is undefined") and stop loading the form data.
import { describe, it, expect } from 'vitest'
import { defaultProjectLeader } from '@/domain/projectLeader'

const leaders = [
  { id: 3, username: 'Laia Puig' },
  { id: 7, username: 'Marc Serra' }
]

describe('defaultProjectLeader', () => {
  it('picks the logged-in user, ignoring case', () => {
    expect(defaultProjectLeader(leaders, 'marc serra')).toEqual({ id: 7 })
  })

  it('returns null when the logged-in user is not selectable (hidden)', () => {
    expect(defaultProjectLeader(leaders, 'jordisabate')).toBeNull()
  })

  it('returns null without a user name or a list', () => {
    expect(defaultProjectLeader(leaders, null)).toBeNull()
    expect(defaultProjectLeader(undefined, 'Laia Puig')).toBeNull()
  })
})
