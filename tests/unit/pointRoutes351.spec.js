// issues/351 (La Diligència, 2026-11-16): the office changes the routes of one
// delivery point: extraordinary routes (with the point's own slot), one main
// route (first and preselected) and cancelled town routes. The same rule as
// the backend's services/point-routes.js.
import { describe, it, expect } from 'vitest'
import { effectiveRoutes, extraSlotLink, pointRouteError, pointRoutesFor, settingsSummary, routeTags } from '@/domain/pointRoutes.js'

const ROUTES = [
  { id: 1, name: 'DILLUNS', active: true, monday: true },
  { id: 2, name: 'DIMECRES', active: true, wednesday: true },
  { id: 3, name: 'DIJOUS', active: true, thursday: true },
  { id: 4, name: 'VELLA', active: false }
]
const CITIES = [{ id: 70, name: 'Vic' }, { id: 71, name: 'Manlleu' }]
const CITY_ROUTES = [
  { id: 11, city: { id: 70 }, route: ROUTES[0] },
  { id: 12, city: { id: 70 }, route: ROUTES[1] },
  { id: 13, city: { id: 71 }, route: ROUTES[2] }
]
const row = (id, routeId, flags, contactId = 9) => ({ id, contact: { id: contactId }, route: { id: routeId, name: ROUTES.find(r => r.id === routeId).name }, ...flags })
const lists = rows => ({ cities: CITIES, cityRoutes: CITY_ROUTES, rows, allRoutes: ROUTES })
const point = { id: 9, city: 'Vic' }

describe('the routes of a delivery point (issues/351)', () => {
  it("are its town's when the office set nothing", () => {
    expect(pointRoutesFor({ contact: point, ...lists([]) }).routes.map(r => r.route.id)).toEqual([1, 2])
  })

  it('lose a cancelled one, take an extraordinary one, the main one first', () => {
    const rows = [row(1, 1, { cancelled: true }), row(2, 3, { extra: true, main: true, time_from: '15:00:00.000', time_to: '16:00:00.000' })]
    const routes = pointRoutesFor({ contact: point, ...lists(rows) }).routes
    expect(routes.map(r => [r.route.id, r.main, r.extra])).toEqual([[3, true, true], [2, false, false]])
    expect(extraSlotLink(routes[0])).toMatchObject({ time_from: '15:00:00.000', time_to: '16:00:00.000' })
    expect(extraSlotLink(routes[1])).toBeNull()
    expect(routeTags(routes[0])).toEqual(['principal', 'extraordinària'])
  })

  it('only those of the point: another point of the town keeps its routes', () => {
    const rows = [row(1, 1, { cancelled: true })]
    expect(pointRoutesFor({ contact: { id: 10, city: 'Vic' }, ...lists(rows) }).routes.map(r => r.route.id)).toEqual([1, 2])
  })

  it('an inactive extraordinary route is not offered', () => {
    expect(effectiveRoutes({ townRoutes: [], rows: [row(1, 4, { extra: true })], allRoutes: ROUTES })).toEqual([])
  })
})

describe('a CSV row of a member (issues/351)', () => {
  it('on a cancelled or a foreign route is an error; on the point\'s routes or a substitute it is not', () => {
    const rows = [row(1, 1, { cancelled: true }), row(2, 3, { extra: true })]
    expect(pointRouteError({ contact: point, route: ROUTES[0], ...lists(rows) })).toBe("La ruta «DILLUNS» no passa pel punt d'entrega (Vic).")
    expect(pointRouteError({ contact: point, route: ROUTES[2], ...lists(rows) })).toBeNull()
    expect(pointRouteError({ contact: { id: 10, city: 'Vic' }, route: ROUTES[2], ...lists(rows) })).toMatch(/DIJOUS/)
    expect(pointRouteError({ contact: { id: 10, city: 'Vic' }, route: ROUTES[2], isSubstitute: true, ...lists(rows) })).toBeNull()
  })

  it('of a town missing from «Poblacions» is not judged, unless the route is cancelled there', () => {
    const rows = [row(1, 2, { cancelled: true }, 12)]
    const contact = { id: 12, city: 'Sant Enlloc' }
    expect(pointRouteError({ contact, route: ROUTES[0], ...lists(rows) })).toBeNull()
    expect(pointRouteError({ contact, route: ROUTES[1], ...lists(rows) })).toMatch(/DIMECRES/)
  })
})

describe('the Punts d\'entrega summary (issues/351)', () => {
  it('says the main, extraordinary and cancelled routes', () => {
    const rows = [row(1, 1, { cancelled: true }), row(2, 3, { extra: true, main: true })]
    const name = id => ROUTES.find(r => r.id === id).name
    expect(settingsSummary(rows, name)).toBe('Principal: DIJOUS · Extraordinària: DIJOUS · Anul·lada: DILLUNS')
    expect(settingsSummary([], name)).toBe('')
  })
})
