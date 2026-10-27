// The "Entrada hores" modal of #/dedicacio, opened and closed the ways people do it
// (issues/047). After the Vue 3 migration, closing it by clicking outside or with
// Escape left DedicationInput thinking it was still open: "Afegir dedicació", a click
// on an entry and a click on the running counter did nothing until a reload, so
// hours could only be entered with the counter, and only stopped after an F5.
import { test, expect } from '@playwright/test'
import {
  useE2E, page, state, NAME, api, visit, settle, visible, field, button, modal,
  expectSnackbar, addActivity, createProject, onCleanup, hoursListView, hoursEntry, openHoursEntry
} from './helpers.mjs'

useE2E()

// not a prefix of another spec's project: the autocomplete matches by substring
const PROJECT = `${NAME} entrada hores`

const box = () => modal('Entrada hores')
const closers = {
  'clicking outside': () => box().locator('.modal-background').click({ position: { x: 5, y: 5 } }),
  'pressing Escape': () => page.keyboard.press('Escape')
}
const myActivities = () => api('GET', `activities?_where[project]=${state.projectId}&_limit=-1`)
const myCounters = () => api('GET', `time-counters?_where[users_permissions_user.username]=${encodeURIComponent(state.me.username)}`)
const entry = hoursEntry

async function close (how) {
  await expect(box()).toBeVisible()
  await closers[how]()
  await expect(box()).toBeHidden()
  await settle(300)
}

test('setup: a project to dedicate hours to, no running counter', async () => {
  state.projectId = await createProject(PROJECT)
  // a counter left by an earlier run would open the modal on load
  for (const c of await myCounters()) await api('DELETE', `time-counters/${c.id}`)
  onCleanup(async () => {
    for (const c of await myCounters()) await api('DELETE', `time-counters/${c.id}`)
  })
})

for (const how of Object.keys(closers)) {
  test(`"Afegir dedicació" opens the modal again after ${how}`, async () => {
    test.skip(!state.projectId, 'needs the project from setup')
    await visit('/dedicacio')
    await visible('button[title="Afegir dedicació"]').click()
    await close(how)

    const description = `${NAME} manual ${how}`
    await addActivity({ project: PROJECT, hours: '1,5', description })
    await hoursListView()
    await expect(entry(description)).toBeVisible()
    expect((await myActivities()).filter(a => a.description === description).map(a => Number(a.hours))).toEqual([1.5])
  })
}

test('an existing entry can be opened again and edited after closing it', async () => {
  test.skip(!state.projectId, 'needs the project from setup')
  const description = `${NAME} manual clicking outside`
  await visit('/dedicacio')
  await hoursListView()
  await openHoursEntry(description)
  await close('pressing Escape')
  await openHoursEntry(description)
  await close('clicking outside')

  await openHoursEntry(description)
  await expect(box()).toBeVisible()
  await expect(field('Hores', box()).locator('input')).toHaveValue('1,5')  // Catalan decimals since issues/181
  await field('Hores', box()).locator('input').fill('2,25')
  await field('Descripció', box()).locator('input').fill(`${description} editada`)
  await button("D'acord", box()).click()
  await expectSnackbar('Guardat')
  await expect(box()).toBeHidden()
  await settle()

  const [edited] = (await myActivities()).filter(a => a.description === `${description} editada`)
  expect(Number(edited?.hours)).toBe(2.25)
  await expect(entry(`${description} editada`)).toBeVisible()
})

test('the counter: start, continue, close the modal, reopen it and stop it', async () => {
  test.skip(!state.projectId, 'needs the project from setup')
  const description = `${NAME} comptador`
  await visit('/dedicacio')
  await visible('button[title="Començar dedicació"]').click()
  await expect(box()).toBeVisible()
  await expect(button("Fi de l'activitat", box())).toBeVisible()
  expect(await myCounters()).toHaveLength(1)

  // pick the project and keep the counter running
  const input = field('Projecte', box()).locator('input')
  await input.click()
  await input.pressSequentially(PROJECT, { delay: 20 })
  await box().locator('.autocomplete .dropdown-item', { hasText: PROJECT }).first().click()
  await field('Descripció', box()).locator('input').fill(description)
  await button('Continua', box()).click()
  await expect(box()).toBeHidden()
  const current = page.locator('.card-body.clickable', { hasText: 'Activitat actual' })
  await expect(current).toContainText(description)

  // reopen it from the running counter, close it both ways, reopen it each time
  for (const how of Object.keys(closers)) {
    await current.click()
    await close(how)
  }
  await current.click()
  await expect(box()).toBeVisible()
  // the time counts from when the counter was created (it stayed at 0 when the
  // modal read v3's `created_at`). Hours are stored with 2 decimals: from 18 s
  // (0.005 h) they are saved as 0.01
  // shown as «0 h 1 min 5 s (0,018 h)»
  const spent = field('Temps dedicat', box()).locator('input')
  await expect.poll(async () => {
    const [, h, m, s] = (await spent.inputValue()).match(/(\d+)\s*h\s*(\d+)\s*min\s*(\d+)\s*s/) || []
    return Number(h) * 3600 + Number(m) * 60 + Number(s)
  }, { timeout: 40_000, intervals: [1000] }).toBeGreaterThanOrEqual(20)

  // stop it: the hours become an activity and the counter is gone, without a reload
  await button("Fi de l'activitat", box()).click()
  await expectSnackbar('Guardat')
  await expect(box()).toBeHidden()
  await expect(current).toBeHidden()
  expect(await myCounters()).toEqual([])
  const [stopped] = (await myActivities()).filter(a => a.description === description)
  expect(stopped, 'the stopped counter saved an activity').toBeTruthy()
  expect(Number(stopped.hours)).toBeGreaterThanOrEqual(0.01)

  // and a manual entry right after it, still without a reload
  await addActivity({ project: PROJECT, hours: '0,5', description: `${NAME} després del comptador` })
  await hoursListView()
  await expect(entry(`${NAME} després del comptador`)).toBeVisible()
})
