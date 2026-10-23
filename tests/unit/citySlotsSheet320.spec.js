// issues/320 (2026-10-22): Diligència want to fill the route and town time
// slots of «Poblacions i rutes» in a spreadsheet: export an .ods, edit the
// times in LibreOffice, import it back. One row per route (empty «Població» =
// the route's slot) and one per town in it (its own slot; empty = the route's).
import { describe, it, expect } from 'vitest'
import { zipSync, strToU8 } from 'fflate'
import { buildOds, readOds } from '@/service/ods'
import { slotSheetRows, parseHour, planSlotImport, SLOT_HEADER } from '@/domain/citySlotsSheet.js'

const cities = [{ id: 1, name: 'Abrera' }, { id: 2, name: 'Artés' }, { id: 3, name: 'Barcelona' }]
const routes = [
  { id: 12, name: 'DLL - VALLÈS OCCIDENTAL', monday: true, order: 1, time_from: '09:00:00.000', time_to: '13:30:00.000' },
  { id: 14, name: 'DLL - BCN CIUTAT', monday: true, order: 2, time_from: null, time_to: null }
]
const cityRoutes = [
  { id: 345, city: 1, route: 12, time_from: '09:00:00.000', time_to: '09:10:00.000' },
  { id: 346, city: 2, route: 12, time_from: null, time_to: null },
  { id: 400, city: 3, route: 14, time_from: null, time_to: null }
]
const data = { cities, routes, cityRoutes }

// a content.xml like the one LibreOffice saves: time cells, repeated columns and rows
const libreOfficeOds = rowsXml => zipSync({
  mimetype: [strToU8('application/vnd.oasis.opendocument.spreadsheet'), { level: 0 }],
  'content.xml': [strToU8(
    '<?xml version="1.0" encoding="UTF-8"?><office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"><office:body><office:spreadsheet><table:table table:name="Franges">' +
    rowsXml +
    '<table:table-row table:number-rows-repeated="1048570"><table:table-cell table:number-columns-repeated="1024"/></table:table-row>' +
    '</table:table></office:spreadsheet></office:body></office:document-content>'
  ), {}]
})

describe('.ods reader (issues/320)', () => {
  it('reads back what the writer writes', () => {
    const rows = [['Ruta', 'Inici', 'n'], ['A  B', '09:30', 4.5], ['', 'x']]
    expect(readOds(buildOds(rows))).toEqual(rows)
  })

  it('reads LibreOffice time cells, repeats and spaces, and drops the empty rest of the sheet', () => {
    const file = libreOfficeOds(
      '<table:table-row><table:table-cell office:value-type="string"><text:p>DLL<text:s text:c="2"/>X</text:p></table:table-cell>' +
      '<table:table-cell table:number-columns-repeated="2"/>' +
      '<table:table-cell office:value-type="time" office:time-value="PT09H10M00S"><text:p>09:10:00</text:p></table:table-cell>' +
      '<table:table-cell office:value-type="float" office:value="7"><text:p>7</text:p></table:table-cell>' +
      '<table:table-cell table:number-columns-repeated="1019"/></table:table-row>'
    )
    expect(readOds(file)).toEqual([['DLL  X', '', '', '09:10', 7]])
  })

  it('refuses a file that is not an .ods', () => {
    expect(() => readOds(new TextEncoder().encode('Ruta;Inici'))).toThrow(/no és un full de càlcul/)
  })
})

describe('slot sheet export (issues/320)', () => {
  it('a route row, then its towns, with the slot that applies and the ID', () => {
    expect(slotSheetRows(cities, routes, cityRoutes)).toEqual([
      SLOT_HEADER,
      ['dilluns', 'DLL - VALLÈS OCCIDENTAL', '', '09:00', '13:30', 'de 9 a 13:30 h', 'r12'],
      ['dilluns', 'DLL - VALLÈS OCCIDENTAL', 'Abrera', '09:00', '09:10', 'de 9 a 9:10 h', 'l345'],
      ['dilluns', 'DLL - VALLÈS OCCIDENTAL', 'Artés', '', '', 'de 9 a 13:30 h', 'l346'],
      ['dilluns', 'DLL - BCN CIUTAT', '', '', '', 'per definir', 'r14'],
      ['dilluns', 'DLL - BCN CIUTAT', 'Barcelona', '', '', 'per definir', 'l400']
    ])
  })
})

describe('slot sheet import (issues/320)', () => {
  it('reads the hours people type', () => {
    expect(['', 9, 0.375, '9', '9:30', '09:30:00', '9h', '9 h', '9h30', '9.30', '9,30', ' 7 '].map(parseHour))
      .toEqual(['', '09:00', '09:00', '09:00', '09:30', '09:30', '09:00', '09:00', '09:30', '09:30', '09:30', '07:00'])
    expect(['25', '9:75', 'nou', 9.5].map(parseHour)).toEqual([null, null, null, null])
  })

  it('an unchanged export changes nothing', () => {
    const plan = planSlotImport(readOds(buildOds(slotSheetRows(cities, routes, cityRoutes))), data)
    expect(plan).toEqual({ changes: [], errors: [], unchanged: 5 })
  })

  it('lists the changed slots with what they will save', () => {
    const rows = slotSheetRows(cities, routes, cityRoutes)
    rows[4][3] = 7 // BCN CIUTAT: a les 7 h
    rows[2][3] = ''; rows[2][4] = '' // Abrera: back to the route's
    rows[5][3] = '12:00'; rows[5][4] = '15h' // Barcelona: own slot
    const plan = planSlotImport(rows, data)
    expect(plan.errors).toEqual([])
    expect(plan.unchanged).toBe(2)
    expect(plan.changes).toEqual([
      { kind: 'link', id: 345, url: 'city-routes/345', row: 3, label: 'DLL - VALLÈS OCCIDENTAL › Abrera', before: 'de 9 a 9:10 h', after: 'la de la ruta', data: { time_from: null, time_to: null } },
      { kind: 'route', id: 14, url: 'routes/14', row: 5, label: 'DLL - BCN CIUTAT', before: 'per definir', after: 'a les 7 h', data: { time_from: '07:00:00.000', time_to: null } },
      { kind: 'link', id: 400, url: 'city-routes/400', row: 6, label: 'DLL - BCN CIUTAT › Barcelona', before: 'la de la ruta', after: 'de 12 a 15 h', data: { time_from: '12:00:00.000', time_to: '15:00:00.000' } }
    ])
  })

  it('matches by names when the ID column is gone, accents and case aside', () => {
    const rows = [['Ruta', 'Població', 'Inici', 'Fi'], ['dll - bcn ciutat', 'BARCELONA', '8', '']]
    expect(planSlotImport(rows, data).changes.map(c => [c.url, c.after])).toEqual([['city-routes/400', 'a les 8 h']])
  })

  it('lists the rows it cannot use, and saves none of them', () => {
    const rows = [
      SLOT_HEADER,
      ['', 'DLL - BCN CIUTAT', '', '15:00', '12:00', '', 'r14'],
      ['', 'RUTA NOVA', '', '9', '', '', ''],
      ['', 'DLL - BCN CIUTAT', 'Girona', '9', '', '', ''],
      ['', '', '', 'migdia', '', '', 'l345'],
      ['', '', '', '9', '', '', 'l999'],
      ['', '', '', '10', '', '', 'l346'],
      ['', '', '', '11', '', '', 'l346'],
      ['', '', '', '', '14:00', '', 'r12']
    ]
    const plan = planSlotImport(rows, data)
    expect(plan.errors).toEqual([
      { row: 2, message: "L'hora final ha de ser posterior a la d'inici" },
      { row: 3, message: 'No hi ha cap ruta activa «RUTA NOVA»' },
      { row: 4, message: '«Girona» no és a la ruta DLL - BCN CIUTAT' },
      { row: 5, message: "No s'entén l'hora d'inici «migdia»" },
      { row: 6, message: 'La població de la ruta l999 ja no hi és' },
      { row: 8, message: 'Repetida: ja surt a la fila 7' },
      { row: 9, message: "Cal l'hora d'inici de la franja" }
    ])
    expect(plan.changes.map(c => c.url)).toEqual(['city-routes/346'])
  })

  it('says so when the header row is missing', () => {
    expect(planSlotImport([['a', 'b']], data).errors[0].message).toMatch(/fila de títols/)
  })
})
