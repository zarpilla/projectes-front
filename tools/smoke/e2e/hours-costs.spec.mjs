// What hours cost: a person's work period ("Jornada") sets the cost per hour of their
// activities, which the project shows as "Hores executades" (€); changing the period
// re-prices them; payroll advances ("Bestretes") come from the periods; and hours can
// be moved between projects.
//
// Uses March 2027 for the e2e user, which nothing else uses (core.spec.mjs uses
// February). Everything it creates there is removed at the end, and leftovers of an
// interrupted run are removed at the start.

import { test, expect } from '@playwright/test'
import {
  useE2E, onCleanup, page, state, api, NAME, visit, settle, field, button, modal, expectSnackbar, confirmDialog,
  createProject, summaryValue, executedHours, calendarMonth, addActivity,
  periodsFrom, openNewPeriod, fillPeriod, modalCostByHour
} from './helpers.mjs'

useE2E()

const MARCH = { from: '2027-03-01', to: '2027-03-31', fromText: '1/3/2027', toText: '31/3/2027' }
const DAY = '2027-03-10'
const PROJECT_A = `${NAME} hores A`
const PROJECT_B = `${NAME} hores B`

const round2 = n => Math.round(n * 100) / 100
const idOf = relation => relation?.id ?? relation

async function myMarchActivities () {
  const activities = await api('GET', `activities?_where[users_permissions_user]=${state.me.id}&_where[date]=${DAY}&_limit=-1`)
  return activities.filter(a => (a.description || '').startsWith(NAME))
}

async function myMarchPayrolls () {
  const payrolls = await api('GET', `payrolls?_where[users_permissions_user]=${state.me.id}&_limit=-1`)
  return payrolls.filter(p => p.emitted === MARCH.to)
}

// expected cost per hour of a period, as ModalBoxWorkingDay computes it. It is stored
// with 2 decimals, and the hours are priced with the stored value.
function costByHour ({ salary, pctQuota = 0, quota = 0 }, workingHours) {
  return (salary + quota + salary * pctQuota / 100) * 12 / workingHours
}

test.beforeAll(async () => {
  // leftovers of an interrupted run
  for (const a of await myMarchActivities()) await api('DELETE', `activities/${a.id}`)
  for (const p of await myMarchPayrolls()) await api('DELETE', `payrolls/${p.id}`)
  for (const p of await periodsFrom(state.me.id, MARCH.from)) await api('DELETE', `daily-dedications/${p.id}`)
  const [year] = await api('GET', 'years?_where[year]=2027&_limit=1')
  expect(year, 'the year 2027 must exist').toBeTruthy()
  state.workingHours = Number(year.working_hours) || 1764
})

onCleanup(async () => {
  for (const a of await myMarchActivities()) await api('DELETE', `activities/${a.id}`)
  for (const p of await myMarchPayrolls()) await api('DELETE', `payrolls/${p.id}`)
  for (const p of await periodsFrom(state.me.id, MARCH.from)) await api('DELETE', `daily-dedications/${p.id}`)
})

test('setup: two projects', async () => {
  state.projectA = await createProject(PROJECT_A, { incomes: [{ concept: 'Ingrés A', quantity: 1, price: 1000 }] })
  state.projectB = await createProject(PROJECT_B, { incomes: [{ concept: 'Ingrés B', quantity: 1, price: 1000 }] })
})

test('a work period prices the hours dedicated in it', async () => {
  test.skip(!state.projectA, 'needs the projects')
  const box = await openNewPeriod(state.me.username)
  await fillPeriod(box, { ...MARCH, hours: 6, salary: 2000, pctQuota: 30 })
  const expected = costByHour({ salary: 2000, pctQuota: 30 }, state.workingHours)
  expect(await modalCostByHour(box)).toBe(round2(expected))
  await button("D'acord", box).click()
  await expectSnackbar('Guardat')
  const [period] = await periodsFrom(state.me.id, MARCH.from)
  expect(Number(period.costByHour ?? period.cost_by_hour)).toBeCloseTo(expected, 2)
  state.period = period

  await visit('/dedicacio')
  await calendarMonth(DAY)
  await addActivity({ project: PROJECT_A, hours: 4, description: `${NAME} març`, day: DAY })
  const [activity] = await myMarchActivities()
  expect(activity.date).toBe(DAY)
  expect(Number(activity.hours)).toBe(4)
  expect(Number(activity.cost_by_hour)).toBeCloseTo(expected, 2)

  await visit(`/project/${state.projectA}`)
  expect(await executedHours()).toBe(4)
  expect(await summaryValue('Hores executades')).toBe(round2(4 * round2(expected)))
  const project = await api('GET', `projects/${state.projectA}`)
  expect(project.total_real_hours_price).toBeCloseTo(4 * round2(expected), 2)
})

test('changing the period re-prices its activities', async () => {
  test.skip(!state.period, 'needs the period')
  await visit('/working-day')
  await page.locator(`.dedication-bar[data-dedication-id="${state.period.id}"]`).click()
  const box = modal('Jornada')
  await expect(field('Hores', box).locator('input')).toHaveValue('6')
  await fillPeriod(box, { salary: 2100, general: false })
  const expected = costByHour({ salary: 2100, pctQuota: 30 }, state.workingHours)
  expect(await modalCostByHour(box)).toBe(round2(expected))
  await button("D'acord", box).click()
  await expectSnackbar('Guardat')

  const [activity] = await myMarchActivities()
  expect(Number(activity.cost_by_hour)).toBeCloseTo(expected, 2)
  await visit(`/project/${state.projectA}`)
  expect(await summaryValue('Hores executades')).toBe(round2(4 * round2(expected)))
})

test('overlapping work periods are refused', async () => {
  test.skip(!state.period, 'needs the period')
  const box = await openNewPeriod(state.me.username)
  await fillPeriod(box, { fromText: '15/3/2027', toText: '15/4/2027', hours: 8, salary: 1000 })
  await button("D'acord", box).click()
  await expectSnackbar('Error al guardar. Pot ser que s\'estiguin solapant períodes?')
  expect(await periodsFrom(state.me.id, '2027-03-15')).toEqual([])
})

test('payroll advances ("Crear bestretes") follow the work periods', async () => {
  test.skip(!state.period, 'needs the period')
  await visit('/working-day')
  const create = page.locator('.card').filter({ hasText: 'Crear Bestretes' }).first()
  await field('Any', create).locator('select').selectOption({ label: '2027' })
  await button('Crear', create).click()
  await expectSnackbar('Bestretes creades')
  const mine = page.locator('.card-body', { hasText: state.me.username }).filter({ has: page.locator('.columns') }).first()
  await expect(mine).toBeVisible()

  // 6 h of 8 → 6/8 of the salary; social security 30 % of that
  const payrolls = await myMarchPayrolls()
  expect(payrolls).toHaveLength(1)
  const [payroll] = payrolls
  expect([payroll.total_base, payroll.ss_base, payroll.total].map(Number)).toEqual([1575, 472.5, 2047.5])
  expect([payroll.ss_date, payroll.irpf_date]).toEqual(['2027-04-30', '2027-04-20'])
  // the relations survive (several of them are one-to-one in the schema)
  expect(idOf(payroll.users_permissions_user)).toBe(state.me.id)
  expect(payroll.year?.year ?? payroll.year).toBeTruthy()
  expect(payroll.month).toBeTruthy()

  // creating them again doesn't duplicate them
  await button('Crear', create).click()
  await expectSnackbar('Bestretes creades')
  expect(await myMarchPayrolls()).toHaveLength(1)
})

test('hours move between projects ("Moure hores entre projectes")', async () => {
  test.skip(!state.projectB, 'needs the projects and the activity')
  await visit('/dedicacio')
  await calendarMonth(DAY)
  const project = field('Projecte').locator('input').first()
  await project.click()
  await project.pressSequentially(PROJECT_A, { delay: 20 })
  await page.locator('.autocomplete .dropdown-item', { hasText: PROJECT_A }).filter({ visible: true }).first().click()
  await settle()
  await page.locator('button[title="Moure hores entre projectes"]').click()
  const box = modal('Moure dedicació?')
  const target = field('Projecte destí', box).locator('input')
  await target.click()
  await target.pressSequentially(PROJECT_B, { delay: 20 })
  await box.locator('.autocomplete .dropdown-item', { hasText: PROJECT_B }).first().click()
  await button('Moure', box).click()
  await confirmDialog('Estàs a punt de moure les dedicacions')
  await expectSnackbar('Actualitzat!')

  const [activity] = await myMarchActivities()
  expect(idOf(activity.project)).toBe(state.projectB)
  await visit(`/project/${state.projectA}`)
  expect(await executedHours()).toBe(0)
  await visit(`/project/${state.projectB}`)
  expect(await executedHours()).toBe(4)
})
