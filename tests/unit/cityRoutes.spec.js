// "Poblacions i rutes": the towns of each route and the routes of each town
import { describe, it, expect } from 'vitest'
import { indexLinks, groupByWeekday, routeDays, searchTowns, normalizeName, unknownPointTowns, editDistance } from '@/domain/cityRoutes.js'

const cities = [{ id: 1, name: 'Girona' }, { id: 2, name: 'Artés' }, { id: 3, name: 'Arbúcies' }, { id: 4, name: 'Vic' }]
const routes = [
  { id: 10, name: 'DT - GIRONA', tuesday: true, order: 2 },
  { id: 11, name: 'DC - VALLÈS', wednesday: true, order: 3 },
  { id: 12, name: 'DT - MARESME', tuesday: true, thursday: true, order: 1 },
  { id: 13, name: 'ESPECIAL', order: 9 }
]

describe('cityRoutes', () => {
  it('indexes the links both ways, skipping dangling and repeated ones', () => {
    const links = [
      { id: 100, city: { id: 1 }, route: { id: 10 } },
      { id: 101, city: { id: 2 }, route: 11 },
      { id: 102, city: { id: 1 }, route: { id: 12 } },
      { id: 103, city: { id: 1 }, route: null },
      { id: 104, city: { id: 99 }, route: { id: 10 } },
      { id: 105, city: { id: 1 }, route: { id: 10 } }
    ]
    const index = indexLinks(cities, routes, links)
    expect(index.townsByRoute.get(10).map(c => c.name)).toEqual(['Girona'])
    expect(index.townsByRoute.get(11).map(c => c.name)).toEqual(['Artés'])
    // routes of a town in the routes' order
    expect(index.routesByTown.get(1).map(r => r.id)).toEqual([12, 10])
    expect(index.routesByTown.get(4)).toEqual([])
    expect(index.linkOf(1, 10).id).toBe(100)
    expect(index.linkOf(4, 10)).toBeNull()
  })

  it('groups the routes by their first weekday', () => {
    expect(groupByWeekday(routes).map(g => [g.label, g.routes.map(r => r.id)])).toEqual([
      ['Dimarts', [12, 10]],
      ['Dimecres', [11]],
      ['Sense dia', [13]]
    ])
    expect(routeDays(routes[2])).toEqual(['dimarts', 'dijous'])
  })

  it('finds towns without minding accents, the ones that start with the text first', () => {
    expect(normalizeName(' Artés ')).toBe('artes')
    expect(searchTowns(cities, 'ar').map(c => c.name)).toEqual(['Arbúcies', 'Artés'])
    expect(searchTowns(cities, 'ONA').map(c => c.name)).toEqual(['Girona'])
    expect(searchTowns(cities, '')).toEqual([])
  })

  it('lists the delivery points\' towns missing from the list, with a likely match', () => {
    const towns = ['Girona', 'girona ', 'Artes', 'Esparraguera', 'Esparraguera', 'Sant Quirze del Vallès', '', null]
    const list = [...cities, { id: 5, name: 'Esparreguera' }, { id: 6, name: 'Sant Quirze de Besora' }]
    expect(unknownPointTowns(towns, list).map(t => [t.name, t.points, t.similar && t.similar.name])).toEqual([
      ['Esparraguera', 2, 'Esparreguera'],
      ['Sant Quirze del Vallès', 1, 'Sant Quirze de Besora']
    ])
    expect(editDistance('kitten', 'sitting')).toBe(3)
  })
})
