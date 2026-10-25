// Hours beyond entering them: personal absences and holidays for everyone
// («Festiu» on #/dedicacio), the balance against the work periods («Saldo
// d'hores», #/dedicacio-saldo) and the year summary («Hores anuals»,
// #/resum-hores), the filters and «Exporta» of #/dedicacio, and what an
// hours-only user sees there.
//
// Everything is about a user of its own ("e2e-hores-<stamp>", hours permission
// only, created through the API) in 2025, which nothing else uses: two work
// periods covering the year (8 h Monday to Friday, then 7 h a day as
// 8,8,8,8,3,0,0), four activities and the festives the tests add. The holiday
// for everyone it adds (10/10/2025) affects every user: it is removed at the
// end, and leftovers of an interrupted run at the start.

import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import zlib from 'node:zlib'
import {
  useE2E, onCleanup, page, state, api, STAMP, NAME, visit, settle, field, button, modal,
  escapeRegExp, expectSnackbar, confirmDialog, pickAutocomplete, createProject,
  hoursListView, hoursEntry, openSession, isoToday, parseNumber
} from './helpers.mjs'

useE2E()

const USER = { username: `e2e-hores-${STAMP}`, email: `e2e-hores-${STAMP}@exemple.coop`, password: `E2e-${STAMP}!` }
const PROJECT_A = `${NAME} saldo A`
const PROJECT_B = `${NAME} saldo B`
const PERIODS = [
  { from: '2025-01-01', to: '2025-06-30', hours: 8 },
  { from: '2025-07-01', to: '2025-12-31', hours: 7, hoursperday: '8,8,8,8,3,0,0' }
]
// Monday, Tuesday, Saturday of March and the Friday of the holiday for everyone
const ACTIVITIES = [
  { date: '2025-03-10', hours: 9, project: 'A', description: `${NAME} saldo dilluns` },
  { date: '2025-03-11', hours: 7.5, project: 'B', description: `${NAME} saldo dimarts` },
  { date: '2025-03-15', hours: 2, project: 'A', description: `${NAME} saldo dissabte` },
  { date: '2025-10-10', hours: 1, project: 'A', description: `${NAME} saldo festiu` }
]
const VACATION_DAY = '2025-03-12' // a Wednesday of the first period: 8 h less
const GLOBAL_DAY = '2025-10-10' // a Friday of the second period: 3 h less
const idOf = relation => relation?.id ?? relation

// --- data ------------------------------------------------------------------------

const festivesOf = (from, to) => api('GET', `festives?_where[date_gte]=${from}&_where[date_lte]=${to}&_limit=-1`)
const myFestives = async () => (await festivesOf('2025-01-01', '2025-12-31')).filter(f => idOf(f.users_permissions_user) === state.user?.id)
const globalFestivesOn = async date => (await festivesOf(date, date)).filter(f => !f.users_permissions_user)
const userActivities = () => api('GET', `activities?_where[users_permissions_user]=${state.user.id}&_limit=-1`)

async function removeGlobalFestive () {
  for (const f of await globalFestivesOn(GLOBAL_DAY)) await api('DELETE', `festives/${f.id}`)
}

// --- screen ----------------------------------------------------------------------

// the person filter of #/dedicacio (an autocomplete without a visible label)
async function pickPerson (username) {
  const input = page.locator('.filter-bar input[aria-label="Persona"]')
  await input.click()
  await input.fill('')
  await input.pressSequentially(username, { delay: 20 })
  await page.locator('.filter-bar .autocomplete .dropdown-item', { hasText: new RegExp(`^\\s*${escapeRegExp(username)}\\s*$`) }).first().click()
  await settle()
}

// the date filters of #/dedicacio (d/m/yyyy); the calendar follows the first one
async function showDates (from, to) {
  const dates = page.locator('.filter-dates input')
  await fillDate(dates.nth(0), from)
  await fillDate(dates.nth(1), to)
  // no calendar left open over the toolbar
  await page.keyboard.press('Escape')
  await expect(page.locator('.filter-dates .dropdown-menu').filter({ visible: true })).toHaveCount(0)
  await settle()
}

const dayCell = iso => page.locator(`.vc-day.id-${iso}`).first()
const total = () => page.locator('.hours-total b')

// typeDate without the click: a click on these datepickers' input can throw in
// Buefy (onInputClick reads a dropdown ref that is null) when another one is open
async function fillDate (input, text) {
  await input.fill(text)
  await input.press('Tab')
}

// fills «Entrada festiu» (opened with «Festiu»): dates d/m/yyyy, the type as offered
async function fillFestive ({ from, to, person, type }) {
  await button('Festiu').click()
  const box = modal('Entrada festiu')
  await expect(box).toBeVisible()
  await fillDate(field('Data', box).locator('input'), from)
  if (to) await fillDate(field('Data Final', box).locator('input'), to)
  // the person first: Tab out of the dates opens its dropdown over the types
  if (person) await pickAutocomplete('Persona', person, person, box)
  else await box.locator('.modal-card-title').click()
  await box.locator('.b-radio, label.radio').filter({ hasText: new RegExp(`^\\s*${escapeRegExp(type)}\\s*$`) }).click()
  return box
}

// a row of the Saldo / Hores anuals tables, by its header cell
const rowOf = (table, header) => page.locator(`${table} tr`).filter({
  has: page.locator('th', { hasText: new RegExp(`^\\s*${escapeRegExp(header)}\\s*$`) })
}).first()
const cells = async row => (await row.locator('td').allInnerTexts()).map(t => t.trim())
const kpi = label => page.locator('.doc-kpi').filter({ has: page.locator('span', { hasText: label }) }).first()

// the person and year filters of Saldo d'hores / Hores anuals
async function pickPersonAndYear (username, year) {
  const input = page.locator('.filter-bar label', { hasText: 'Persona' }).locator('input')
  await input.click()
  await input.fill('')
  await input.pressSequentially(username, { delay: 20 })
  await page.locator('.filter-bar .autocomplete .dropdown-item', { hasText: new RegExp(`^\\s*${escapeRegExp(username)}\\s*$`) }).first().click()
  await page.locator('.filter-bar label', { hasText: 'Any' }).locator('select').selectOption({ label: String(year) })
  await settle()
}

// the text of each row of an .ods file («Exporta»): a zip with a deflated content.xml
function odsRows (file) {
  const buf = fs.readFileSync(file)
  const end = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]))
  let offset = buf.readUInt32LE(end + 16)
  for (let i = 0; i < buf.readUInt16LE(end + 10); i++) {
    const [method, size, nameLength] = [buf.readUInt16LE(offset + 10), buf.readUInt32LE(offset + 20), buf.readUInt16LE(offset + 28)]
    const local = buf.readUInt32LE(offset + 42)
    if (buf.toString('utf8', offset + 46, offset + 46 + nameLength) === 'content.xml') {
      const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28)
      const data = buf.subarray(start, start + size)
      const xml = (method === 8 ? zlib.inflateRawSync(data) : data).toString('utf8')
      return xml.split('<table:table-row').slice(1).map(row => [...row.matchAll(/<text:p>(.*?)<\/text:p>/g)].map(m => m[1]))
    }
    offset += 46 + nameLength + buf.readUInt16LE(offset + 30) + buf.readUInt16LE(offset + 32)
  }
  throw new Error('no content.xml in the export')
}

// --- tests -----------------------------------------------------------------------

test.beforeAll(async () => {
  await removeGlobalFestive()
  // a database seeded from scratch only has the current and the next year
  const [year] = await api('GET', 'years?_where[year]=2025&_limit=1')
  state.workingHours = Number((year || await api('POST', 'years', { data: { year: 2025, working_hours: 1760, deductible_vat_pct: 100 } })).working_hours)
})

onCleanup(async () => {
  await removeGlobalFestive()
  if (state.myToday) await api('DELETE', `activities/${state.myToday.id}`)
  if (!state.user) return
  for (const f of await myFestives()) await api('DELETE', `festives/${f.id}`)
  for (const a of await userActivities()) await api('DELETE', `activities/${a.id}`)
  for (const p of await api('GET', `daily-dedications?_where[users_permissions_user]=${state.user.id}&_limit=-1`)) {
    await api('DELETE', `daily-dedications/${p.id}`)
  }
})

test('setup: two projects, an hours-only user with work periods and activities in 2025', async () => {
  state.projectA = await createProject(PROJECT_A)
  state.projectB = await createProject(PROJECT_B)
  state.user = await api('POST', 'users', {
    ...USER, confirmed: true, blocked: false, role: idOf(state.me.role) || 1, permissions: [{ permission: 'hours' }]
  })
  expect(state.user.id).toBeTruthy()
  for (const p of PERIODS) {
    await api('POST', 'daily-dedications', { data: { ...p, users_permissions_user: state.user.id, costByHour: 10 } })
  }
  for (const a of ACTIVITIES) {
    await api('POST', 'activities', {
      data: { ...a, project: a.project === 'A' ? state.projectA : state.projectB, users_permissions_user: state.user.id }
    })
  }
  expect((await userActivities()).map(a => Number(a.hours)).sort()).toEqual([1, 2, 7.5, 9])
  // users and years are kept for the page load: a reload sees the new ones
  await page.reload()
  await settle()
})

test('«Festiu» adds a personal absence, shown in the calendar, and refuses a second one that day', async () => {
  test.skip(!state.user, 'needs the user')
  await visit('/dedicacio')
  await pickPerson(USER.username)
  await showDates('1/3/2025', '31/3/2025')
  await expect(dayCell('2025-03-10')).toContainText(PROJECT_A)

  let box = await fillFestive({ from: '12/3/2025', person: USER.username, type: 'Vacances' })
  await button("D'acord", box).click()
  await expectSnackbar('Guardat')
  await expect(box).toBeHidden()
  await settle()
  await expect(dayCell(VACATION_DAY)).toContainText(`Vacances - ${USER.username}`)
  const saved = await myFestives()
  expect(saved.map(f => [f.date, f.festive_type?.name])).toEqual([[VACATION_DAY, 'Vacances']])

  // the same person and day again: refused, the modal stays open (issues/246)
  box = await fillFestive({ from: '12/3/2025', person: USER.username, type: 'Vacances' })
  await button("D'acord", box).click()
  await expectSnackbar("Aquest dia ja hi ha un festiu d'aquesta persona")
  await expect(box).toBeVisible()
  await button('Cancel·la', box).click()
  await expect(box).toBeHidden()
  expect(await myFestives()).toHaveLength(1)
})

test('a range of festives skips the weekend, and one can be deleted from the calendar', async () => {
  test.skip(!state.user, 'needs the user')
  // a fresh view: the modal was closed without saving (see the known bug below)
  await visit('/dedicacio')
  await pickPerson(USER.username)
  await showDates('1/3/2025', '31/3/2025')
  // Thursday to Monday: 13, 14 and 17
  const box = await fillFestive({ from: '13/3/2025', to: '17/3/2025', person: USER.username, type: 'Lliure Elecció' })
  await button("D'acord", box).click()
  await confirmDialog('estàs a punt de crear 3 festius')
  await expectSnackbar('Guardat')
  await settle()
  const free = async () => (await myFestives()).filter(f => f.festive_type?.name === 'Lliure Elecció').map(f => f.date).sort()
  expect(await free()).toEqual(['2025-03-13', '2025-03-14', '2025-03-17'])
  for (const day of ['2025-03-13', '2025-03-14', '2025-03-17']) await expect(dayCell(day)).toContainText('Lliure Elecció')
  for (const day of ['2025-03-15', '2025-03-16']) await expect(dayCell(day)).not.toContainText('Lliure Elecció')

  // open the one of the 14th and delete it
  await dayCell('2025-03-14').locator('.day-entries span span', { hasText: 'Lliure Elecció' }).click()
  const edit = modal('Entrada festiu')
  await expect(edit).toBeVisible()
  await button('Esborra', edit).click()
  await page.locator('.modal.is-active').last().locator('.modal-card-foot .button.is-danger').click()
  await expectSnackbar('Esborrat')
  await settle()
  await expect(dayCell('2025-03-14')).not.toContainText('Lliure Elecció')
  expect(await free()).toEqual(['2025-03-13', '2025-03-17'])
  // the balance below counts only the vacation day
  for (const f of (await myFestives()).filter(f => f.festive_type?.name === 'Lliure Elecció')) await api('DELETE', `festives/${f.id}`)
})

test('an admin adds a holiday for everyone, shown for every person', async () => {
  test.skip(!state.user, 'needs the user')
  await showDates('1/10/2025', '31/10/2025')
  const box = await fillFestive({ from: '10/10/2025', type: 'Festiu Estatal (totes)' })
  await expect(field('Persona', box)).toContainText('Tothom')
  await button("D'acord", box).click()
  await expectSnackbar('Guardat')
  await settle()
  await expect(dayCell(GLOBAL_DAY)).toContainText('Festiu Estatal - TOTES')
  await expect(dayCell(GLOBAL_DAY)).toContainText(PROJECT_A)
  const [festive, ...more] = await globalFestivesOn(GLOBAL_DAY)
  expect(more).toEqual([])
  expect(festive.festive_type?.name).toBe('Festiu Estatal')
})

// issues/336: «Entrada festiu» closed without saving and opened again at once was
// emptied a moment later (the modal left the DOM, its datepicker threw on a click):
// Buefy's afterLeave destroyed the reopened modal. Fixed for every b-modal in
// src/helpers/buefyModal.js.
test('«Entrada festiu» still works after closing it without saving', async () => {
  await visit('/dedicacio')
  const box = modal('Entrada festiu')
  await button('Festiu').click()
  await expect(box).toBeVisible()
  await button('Cancel·la', box).click()
  await expect(box).toBeHidden()
  await button('Festiu').click()
  await expect(box).toBeVisible()
  await fillDate(field('Data', box).locator('input'), '13/3/2025')
  await box.locator('.modal-card-title').click()
  // it closes a moment later
  await page.waitForTimeout(500)
  await expect(box).toBeVisible()
  await button('Cancel·la', box).click()
})

// Rule (DedicationSaldo.vue, domain/workdayLog.js): each day of the year expects the
// hours of its work period (the weekly distribution when it has one, otherwise its
// hours Monday to Friday), none on a festive; the balance adds worked − expected.
// 2025: 128 weekdays Jan–Jun × 8 h, Jul–Dec 105 Mon–Thu × 8 h + 27 Fridays × 3 h,
// minus Wed 12/3 (8 h) and Fri 10/10 (3 h) = 1947 h on 259 days; worked 19,5 h.
test('«Saldo d\'hores» compares the hours with the work periods, festives aside', async () => {
  test.skip(!state.user, 'needs the user')
  await visit('/dedicacio-saldo')
  await pickPersonAndYear(USER.username, 2025)
  await expect(kpi('Saldo a')).toContainText('Saldo a 31/12/2025')
  await expect(kpi('Saldo a').locator('b')).toHaveText('−1.927,50 h')
  await expect(kpi('Hores treballades').locator('b')).toHaveText('19,50 h')
  await expect(kpi('Hores teòriques').locator('b')).toHaveText('1.947,00 h')
  await expect(kpi('Hores teòriques')).toContainText('259 dies de jornada')
  await expect(kpi('Festius i absències').locator('b')).toHaveText('2 dies')

  // month by month: days, expected, worked, difference, balance; the festives as tags
  // (Jan 184 h + Feb 160 h + Mar 160 h expected by the end of March)
  const march = rowOf('.saldo-table', 'Març')
  expect(await cells(march)).toEqual(['20', '160,00 h', '18,50 h', '−141,50 h', '−485,50 h', '1 Vacances'])
  // the weekly distribution: 18 Mon–Thu × 8 h + 4 Fridays × 3 h (7 h × 22 days would be 154 h)
  const october = rowOf('.saldo-table', 'Octubre')
  expect((await cells(october)).slice(0, 4)).toEqual(['22', '156,00 h', '1,00 h', '−155,00 h'])
  await expect(october).toContainText('1 Festiu Estatal')
  await expect(rowOf('.saldo-table tfoot', 'Total 2025')).toContainText('1.947,00 h')

  // day by day
  await march.click()
  await expect(page.locator('.report-box-head h2', { hasText: 'Març 2025 dia a dia' })).toBeVisible()
  expect((await cells(rowOf('.saldo-table', 'dl. 10/03'))).slice(0, 4)).toEqual(['', '8,00 h', '9,00 h', '+1,00 h'])
  expect((await cells(rowOf('.saldo-table', 'dc. 12/03'))).slice(0, 4)).toEqual(['Vacances', '0,00 h', '0,00 h', '0,00 h'])
  expect((await cells(rowOf('.saldo-table', 'ds. 15/03'))).slice(0, 4)).toEqual(['cap de setmana', '', '2,00 h', '+2,00 h'])
  await rowOf('.saldo-table', 'Octubre').click()
  expect((await cells(rowOf('.saldo-table', 'dj. 09/10'))).slice(1, 2)).toEqual(['8,00 h'])
  expect((await cells(rowOf('.saldo-table', 'dv. 10/10'))).slice(0, 3)).toEqual(['Festiu Estatal', '0,00 h', '1,00 h'])
  expect((await cells(rowOf('.saldo-table', 'dv. 17/10'))).slice(1, 2)).toEqual(['3,00 h'])
})

// Same days and hours as Saldo d'hores (issues/238); the festives against their
// maximums; the conveni scaled by the share of a full jornada (8 h × weekdays)
test('«Hores anuals» counts the same days, the festives against their maximums', async () => {
  test.skip(!state.user, 'needs the user')
  await visit('/resum-hores')
  await pickPersonAndYear(USER.username, 2025)
  await expect(page.locator('.annual-report .notification.is-warning')).toHaveCount(0)
  const dd = (term, n) => page.locator('.calc-list dt').filter({ hasText: new RegExp(`^\\s*${escapeRegExp(term)}\\s*$`) }).locator(`xpath=following-sibling::dd[${n}]`)
  await expect(dd('Dies amb jornada', 1)).toHaveText('259 dies')
  await expect(dd('Dies amb jornada', 2)).toHaveText('1.947,00 h')
  await expect(dd('Hores treballades (registrades)', 1)).toHaveText('4 dies')
  await expect(dd('Hores treballades (registrades)', 2)).toHaveText('19,50 h')

  const vacation = await cells(rowOf('.annual-table', 'Vacances'))
  expect([vacation[0], vacation[2], vacation[3]]).toEqual(['1 / 23', '8,00 h', 'Queden 22 dies'])
  const state1 = await cells(rowOf('.annual-table', 'Festiu Estatal'))
  expect([state1[0], state1[2]]).toEqual(['1 / 8', '3,00 h'])
  const free = await cells(rowOf('.annual-table', 'Lliure Elecció'))
  expect(free[0]).toBe('0 / 3')

  const conveni = state.workingHours * 1947 / 259 / 8
  expect(parseNumber(await kpi('Màxim del conveni').locator('b').innerText())).toBeCloseTo(conveni, 2)
  // the vacation days by month
  await expect(page.locator('.annual-table tr', { hasText: 'Març' }).locator('.day-chip')).toHaveText(['12'])
})

test('the person, date and project filters narrow #/dedicacio, and «Exporta» downloads what is listed', async () => {
  test.skip(!state.user, 'needs the user')
  await visit('/dedicacio')
  await pickPerson(USER.username)
  await showDates('1/3/2025', '31/3/2025')
  await hoursListView()
  const mine = page.locator('tr.hours-entry', { hasText: NAME })
  await expect(mine).toHaveCount(3)
  await expect(total()).toHaveText('18,50 h')

  const project = page.locator('.filter-bar input[aria-label="Projecte"]')
  await project.click()
  await project.pressSequentially(PROJECT_A, { delay: 20 })
  await page.locator('.filter-bar .autocomplete .dropdown-item', { hasText: new RegExp(`^\\s*${escapeRegExp(PROJECT_A)}\\s*$`) }).first().click()
  await settle()
  await expect(mine).toHaveCount(2)
  await expect(hoursEntry(`${NAME} saldo dimarts`)).toHaveCount(0)
  await expect(total()).toHaveText('11,00 h')

  const download = page.waitForEvent('download')
  await button('Exporta').click()
  const file = await download
  expect(file.suggestedFilename()).toBe('hores-dedicades.ods')
  const rows = odsRows(await file.path())
  expect(rows[0].slice(0, 5)).toEqual(['Data', 'Projecte', 'Persona', 'Hores', 'Descripció'])
  expect(rows.slice(1).map(r => r.slice(0, 5)).sort()).toEqual([
    ['10/03/2025', PROJECT_A, USER.username, '9', `${NAME} saldo dilluns`],
    ['15/03/2025', PROJECT_A, USER.username, '2', `${NAME} saldo dissabte`]
  ])
})

test('«Últimes modificades» lists what changed this week, whatever its date', async () => {
  test.skip(!state.user, 'needs the user')
  await visit('/dedicacio')
  await pickPerson(USER.username)
  await hoursListView()
  // the current month: nothing of this person
  await expect(page.locator('tr.hours-entry', { hasText: NAME })).toHaveCount(0)
  await page.locator('.filter-bar .b-checkbox', { hasText: 'Últimes modificades' }).click()
  await settle()
  await expect(page.locator('.filter-dates input').first()).toBeDisabled()
  for (const a of ACTIVITIES) await expect(hoursEntry(a.description)).toBeVisible()
  await expect(total()).toHaveText('19,50 h')
})

test('an hours-only user enters hours and sees only hers', async ({ browser }) => {
  test.skip(!state.user, 'needs the user')
  // someone else's hours today, in the same project
  state.myToday = await api('POST', 'activities', {
    data: { date: isoToday(), hours: 3, project: state.projectA, users_permissions_user: state.me.id, description: `${NAME} saldo d'una altra` }
  })
  const other = await openSession(browser, USER.email, USER.password)
  try {
    await other.goto('#/dedicacio')
    await other.waitForLoadState('networkidle')
    await expect(other.locator('.hours-toolbar')).toBeVisible()
    // no person picker for a worker (issues/099)
    await expect(other.locator('.filter-bar input[aria-label="Persona"]')).toHaveCount(0)

    await other.locator('button[title="Afegir dedicació"]').click()
    const box = other.locator('.modal.is-active').filter({ hasText: 'Entrada hores' }).last()
    const input = label => box.locator('.field').filter({ has: other.locator(':scope > .label, :scope > .field-label > .label', { hasText: new RegExp(`^\\s*${label}\\s*\\*?\\s*$`) }) }).first().locator('input').first()
    await input('Hores').fill('1,25')
    await input('Projecte').click()
    await input('Projecte').pressSequentially(PROJECT_A, { delay: 20 })
    await box.locator('.autocomplete .dropdown-item', { hasText: new RegExp(`^\\s*${escapeRegExp(PROJECT_A)}\\s*$`) }).first().click()
    await input('Descripció').fill(`${NAME} saldo meva`)
    await box.locator('button', { hasText: "D'acord" }).click()
    await expect(other.locator('.snackbar', { hasText: 'Guardat' })).toBeVisible()
    await expect(box).toBeHidden()

    await other.locator('button[title="Vista taula"]').click()
    await expect(other.locator('tr.hours-entry', { hasText: `${NAME} saldo meva` })).toBeVisible()
    await expect(other.locator('tr.hours-entry', { hasText: `${NAME} saldo d'una altra` })).toHaveCount(0)
    const [saved] = (await userActivities()).filter(a => a.description === `${NAME} saldo meva`)
    expect([saved?.date, Number(saved?.hours), idOf(saved?.project)]).toEqual([isoToday(), 1.25, state.projectA])

    // the API gives her only her own rows, even when asked for someone else's
    const token = await other.evaluate(() => localStorage.getItem('jwt'))
    const asked = await api('GET', `activities?_where[users_permissions_user]=${state.me.id}&_where[date]=${isoToday()}&_limit=-1`, undefined, { token })
    expect(asked.filter(a => a.description === `${NAME} saldo d'una altra`)).toEqual([])
  } finally {
    await other.context().close()
  }
})
