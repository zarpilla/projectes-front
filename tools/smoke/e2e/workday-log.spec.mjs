// The daily workday log ("Registre Jornades", #/registre-jornades): the time a person
// comes in and leaves each day. Assigning a log to a project turns its hours into an
// activity of that project, which then follows the log (changed hours, deletion).
//
// Uses today's row of the e2e user. Its logs of today are removed at the start
// (leftovers of an interrupted run) and at the end.

import { test, expect } from '@playwright/test'
import {
  useE2E, onCleanup, page, state, api, NAME, visit, settle, confirmDialog,
  createProject, executedHours, isoToday
} from './helpers.mjs'

useE2E()

const PROJECT = `${NAME} jornada`
const TODAY = isoToday()
const idOf = relation => relation?.id ?? relation

const myLogsOfToday = () => api('GET', `workday-logs?_where[date]=${TODAY}&_where[users_permissions_user]=${state.me.id}&_limit=-1`)
const activitiesOfProject = () => api('GET', `activities?_where[project]=${state.projectId}&_limit=-1`)

async function removeMyLogsOfToday () {
  for (const log of await myLogsOfToday()) {
    if (log.activity) await api('DELETE', `activities/${idOf(log.activity)}`, undefined, { raw: true })
    await api('DELETE', `workday-logs/${log.id}`)
  }
}

// today's row of the log: one row per day, its slots inside
const row = () => page.locator(`.wl-day[data-date="${TODAY}"]`)
const hourInputs = () => row().locator('input[placeholder="hh"]')

// types a time in the "Entrada" (0) or "Sortida" (1) field; each part is saved on blur
async function typeTime (column, hour, minute) {
  for (const [placeholder, value] of [['hh', hour], ['mm', minute]]) {
    const input = row().locator(`input[placeholder="${placeholder}"]`).nth(column)
    await input.fill(String(value))
    await input.press('Tab')
  }
  await settle()
}

test.beforeAll(removeMyLogsOfToday)
onCleanup(removeMyLogsOfToday)

test('setup: a project', async () => {
  state.projectId = await createProject(PROJECT, { incomes: [{ concept: 'Ingrés jornada', quantity: 1, price: 1000 }] })
})

test('a day is logged by typing when it started and ended', async () => {
  await visit('/registre-jornades')
  // the list opens on the logged-in user and the current month
  await expect(row()).toBeVisible({ timeout: 20_000 })
  // an empty day has no time fields until a slot is added to it
  await expect(hourInputs()).toHaveCount(0)
  await row().getByRole('button', { name: 'Afegeix tram' }).click()
  await expect(hourInputs().first()).toBeEnabled()

  await typeTime(0, 9, 0)
  // the start alone is saved already
  await expect.poll(async () => (await myLogsOfToday()).map(l => [l.hour_in, l.hour_out])).toEqual([['09:00:00.000', null]])
  await typeTime(1, 13, 30)

  await expect(row()).toContainText('4 h 30')
  const logs = await myLogsOfToday()
  expect(logs.map(l => [l.hour_in, l.hour_out])).toEqual([['09:00:00.000', '13:30:00.000']])
  state.logId = logs[0].id
})

test('the log is still there after reloading', async () => {
  test.skip(!state.logId, 'needs the log')
  await visit('/registre-jornades')
  await expect(row()).toContainText('4 h 30')
  await expect(hourInputs().nth(0)).toHaveValue('09')
  await expect(row().locator('input[placeholder="mm"]').nth(1)).toHaveValue('30')
})

test('assigning the log to a project turns its hours into an activity', async () => {
  test.skip(!state.logId || !state.projectId, 'needs the log and the project')
  const input = row().locator('.autocomplete input')
  await input.click()
  await input.pressSequentially(PROJECT, { delay: 20 })
  await row().locator('.autocomplete .dropdown-item', { hasText: PROJECT }).first().click()
  await settle()

  await expect.poll(async () => (await activitiesOfProject()).map(a => Number(a.hours))).toEqual([4.5])
  const [activity] = await activitiesOfProject()
  expect([activity.date, idOf(activity.users_permissions_user)]).toEqual([TODAY, state.me.id])
  // the log remembers its activity
  expect(idOf((await api('GET', `workday-logs/${state.logId}?populate=activity`)).activity)).toBe(activity.id)
  state.activityId = activity.id

  // and the project counts the hours
  await expect.poll(async () => {
    await visit(`/project/${state.projectId}`)
    return executedHours()
  }, { timeout: 30_000, intervals: [1000, 2000, 5000] }).toBe(4.5)
})

test('changing the time of the log changes the hours of its activity', async () => {
  test.skip(!state.activityId, 'needs the activity')
  await visit('/registre-jornades')
  await expect(row().locator('.autocomplete input')).toHaveValue(PROJECT)
  await typeTime(1, 14, 0)

  await expect(row()).toContainText('5 h 00')
  await expect.poll(async () => (await activitiesOfProject()).map(a => [a.id, Number(a.hours)])).toEqual([[state.activityId, 5]])
})

test('deleting the log deletes its activity', async () => {
  test.skip(!state.activityId, 'needs the activity')
  await row().locator('button[title="Esborrar"]').click()
  await confirmDialog("S'esborrarà el registre")
  await settle()

  expect(await myLogsOfToday()).toEqual([])
  expect(await activitiesOfProject()).toEqual([])
  // the day is an empty row again
  await expect(hourInputs()).toHaveCount(0)
})
