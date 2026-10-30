// issues/367: Inici greeted La Dotzena (a Diligència member, an organisation)
// with «Bon dia, La»: the greeting kept only the first word of the full name.
// A user's `display_name` now wins; without it a member (`orders` only, an
// organisation or shop) gets the whole name and everyone else the first word.
import { describe, it, expect } from 'vitest'
import { greetingName } from '@/domain/home'

const perms = (...codes) => codes.map(permission => ({ permission }))

describe('greetingName (issues/367)', () => {
  it('uses display_name when the user has one', () => {
    expect(greetingName({ display_name: ' Marina ', fullname: 'RODRIGUEZ MESTRES MARINA', permissions: perms('hours') })).toBe('Marina')
  })

  it('gives a member the whole name', () => {
    expect(greetingName({ fullname: 'La Dotzena', permissions: perms('orders') })).toBe('La Dotzena')
    expect(greetingName({ fullname: '  Mas  Casas Cruïlles ', permissions: perms('orders') })).toBe('Mas Casas Cruïlles')
  })

  it('gives everyone else the first word of the full name', () => {
    expect(greetingName({ fullname: 'Anna Cornet Augé', permissions: perms('hours', 'projects') })).toBe('Anna')
    expect(greetingName({ fullname: 'Carla', permissions: perms('orders', 'orders_admin') })).toBe('Carla')
  })

  it('falls back to the username, and to nothing', () => {
    expect(greetingName({ fullname: '', username: 'Botiga Gaia', permissions: perms('orders') })).toBe('Botiga Gaia')
    expect(greetingName({ fullname: null, username: 'Jordi S', permissions: perms('admin', 'hours') })).toBe('Jordi')
    expect(greetingName({ fullname: null }, 'Laia')).toBe('Laia')
    expect(greetingName(null)).toBe('')
  })
})
