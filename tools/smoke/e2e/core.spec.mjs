// The critical flows, in order (each test uses what the previous ones created):
// projects, phases, hours, Persones (work periods) and emitted/received invoices.
// See helpers.mjs for the safety rules: these tests save for real.

import { test, expect } from '@playwright/test'
import {
  useE2E, page, state, api, NAME, visit, settle, visible, field, button, card, modal,
  expectSnackbar, selectByLabel, pickAutocomplete, typeDate, today,
  phaseNamed, addPhase, addLine, executedHours, addActivity, openPeriod,
  contactWithNif, assignBudgetLine, fillLine, hoursListView, hoursEntry
} from './helpers.mjs'

useE2E()

// A work period ("Jornada") of the e2e user in February 2027, which nothing else uses
const PERIOD = { from: '2027-02-01', to: '2027-02-28', fromText: '1/2/2027', toText: '28/2/2027' }

async function myPeriods () {
  const periods = await api('GET', `daily-dedications?_where[users_permissions_user]=${state.me.id}&_limit=-1`)
  return periods.filter(p => p.from === PERIOD.from)
}

test('project creation', async () => {
  await visit('/projecte/0')
  await field('Codi').locator('input').fill(NAME)
  await selectByLabel('Estat', 'Actiu')
  await field('Àmbit').locator('select').selectOption({ index: 0 })
  await field('Descripció').locator('textarea').fill('Creat per les proves e2e')
  await button('Continuar').click()
  await expect(page).toHaveURL(/\/project\/[1-9]\d*/, { timeout: 20_000 })
  await expectSnackbar('Guardat')
  state.projectId = Number(page.url().match(/\/project\/(\d+)/)[1])

  const project = await api('GET', `projects/${state.projectId}`)
  expect(project.name).toBe(NAME)
  expect(project.description).toBe('Creat per les proves e2e')
  expect(project.project_state?.name).toBe('Actiu')
  expect(project.creation_step).toBe('phases_budget')
})

test('project phases: original budget and closing it', async () => {
  test.skip(!state.projectId, 'needs the project from "project creation"')
  await visit(`/projecte/${state.projectId}`)
  const original = card('Fases i pressupost original')
  const phase = await addPhase(original, `${NAME} fase A`)
  await addLine(phase, 'income', { concept: 'Ingrés e2e', quantity: 10, price: 50 })
  await addLine(phase, 'expense', { concept: 'Despesa e2e', quantity: 2, price: 30 })
  // the wizard's Continuar is in the sticky bar at the bottom, not in the card
  await visible('button', { hasText: /^\s*Continuar\s*$/ }).click()
  await expectSnackbar('Guardat')
  await settle()
  // leaving step 2 copies the original budget into the estimated one (previst),
  // which the planning step works on
  const copied = await api('GET', `project-phases?_where[project]=${state.projectId}&_limit=-1`)
  expect(copied.map(p => p.name)).toEqual([`${NAME} fase A`])
  // new lines take the project's end date, so the project opens without the
  // "línies sense data" warning
  const { date_end: end } = await api('GET', `projects/${state.projectId}`)
  for (const line of [...copied[0].incomes, ...copied[0].expenses]) {
    expect([line.date_estimate_document, line.date]).toEqual([end, end])
  }
  // the wizard's planning goes to both budgets: the Original / Prevista switch is
  // disabled with both on
  await expect(page.locator('.gantt_container').first()).toBeVisible({ timeout: 20_000 })
  const views = page.getByRole('group', { name: 'Planificació' })
  await expect(views.getByRole('button', { name: 'Original' })).toBeDisabled()
  await expect(views.getByRole('button', { name: 'Prevista' })).toBeDisabled()

  // changing the original back in step 2 copies it again, replacing the earlier copy
  await visible('button', { hasText: /^\s*Enrere\s*$/ }).click()
  const original2 = card('Fases i pressupost original')
  await (await phaseNamed(original2, `${NAME} fase A`)).locator('input[name="PreuUnitari"]').first().fill('55')
  await visible('button', { hasText: /^\s*Continuar\s*$/ }).click()
  await expectSnackbar('Guardat')
  await settle()
  const recopied = await api('GET', `project-phases?_where[project]=${state.projectId}&_limit=-1`)
  expect(recopied.map(p => p.name)).toEqual([`${NAME} fase A`])
  expect(recopied[0].id).not.toBe(copied[0].id)
  expect(recopied[0].incomes.map(i => Number(i.amount))).toEqual([55])

  // plan hours: drag on the income line's row of the chart (the phase's row takes
  // none), then the hours modal
  await expect(page.locator('.gantt_grid_data .gantt_row', { hasText: 'Ingrés e2e' })).toBeVisible()
  await settle(1500)
  const row = page.locator('.gantt_task_bg .gantt_task_row').nth(1)
  // the row is wider than the chart's visible area: start inside the latter
  const box = await row.boundingBox()
  const area = await page.locator('.gantt_task').first().boundingBox()
  await page.mouse.move(area.x + 40, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(area.x + 200, box.y + box.height / 2, { steps: 8 })
  await page.mouse.up()
  const hoursModal = modal('Planificació')
  await expect(hoursModal).toBeVisible()
  await field('Hores', hoursModal).locator('input').fill('7')
  await button("D'acord", hoursModal).click()
  await expect(hoursModal).toBeHidden()

  // leaving step 3 copies the planned hours too: both budgets start equal
  await visible('button', { hasText: /^\s*Continuar\s*$/ }).click()
  await settle()
  await button('Tancar pressupost').click()
  await settle(1500)

  const project = await api('GET', `projects/${state.projectId}`)
  expect(project.creation_step).toBe('completed')
  const originals = await api('GET', `project-original-phases?_where[project]=${state.projectId}&_limit=-1`)
  expect(originals.map(p => p.name)).toEqual([`${NAME} fase A`])
  expect(originals[0].incomes.map(i => [i.concept, Number(i.quantity), Number(i.amount)])).toEqual([['Ingrés e2e', 10, 55]])
  expect(originals[0].expenses.map(e => [e.concept, Number(e.quantity), Number(e.amount)])).toEqual([['Despesa e2e', 2, 30]])
  // closing the budget doesn't copy them a second time
  const phases = await api('GET', `project-phases?_where[project]=${state.projectId}&_limit=-1`)
  expect(phases.map(p => p.name)).toEqual([`${NAME} fase A`])
  const hoursOf = async phase => (await api('GET', `estimated-hours?_where[phase_income]=${phase.incomes[0].id}&_limit=-1`))
    .map(h => Number(h.quantity))
  expect(await hoursOf(originals[0])).toEqual([7])
  expect(await hoursOf(phases[0])).toEqual([7])
  expect(project.total_incomes).toBe(550)
  expect(project.total_expenses).toBe(60)

  // once created, the planning opens on Prevista and the switch works again
  await visit(`/projecte/${state.projectId}?tab=planificacio`)
  await expect(page.getByText('Planificació prevista').first()).toBeVisible({ timeout: 20_000 })
  await expect(page.getByRole('group', { name: 'Planificació' }).getByRole('button', { name: 'Original' })).toBeEnabled()
})

test('project edition', async () => {
  test.skip(!state.projectId, 'needs the project from "project creation"')
  await visit(`/projecte/${state.projectId}?tab=dades`)
  // wait for the loaded project: under load it can arrive after typing and overwrite it
  await expect(field('Descripció').locator('textarea')).toHaveValue('Creat per les proves e2e')
  await field('Descripció').locator('textarea').fill('Descripció editada per les proves e2e')
  await field('Propòsit').locator('textarea').fill('Comprovar que l\'edició es guarda')
  await selectByLabel('Estat', 'Sol·licitat')
  // the save bar at the bottom of the project. Wait for the save itself: a "Guardat"
  // toast of the previous test can still be on screen
  const saved = page.waitForResponse(r => r.request().method() === 'PUT' && r.url().endsWith(`/projects/${state.projectId}`))
  await button('Guardar').click()
  await saved
  await expectSnackbar('Guardat')
  await settle()

  const project = await api('GET', `projects/${state.projectId}`)
  expect(project.name).toBe(NAME)
  expect(project.description).toBe('Descripció editada per les proves e2e')
  expect(project.purpose).toBe('Comprovar que l\'edició es guarda')
  expect(project.project_state?.name).toBe('Sol·licitat')
  // the reloaded form shows what was saved
  await visit(`/projecte/${state.projectId}?tab=dades`)
  await expect(field('Descripció').locator('textarea')).toHaveValue('Descripció editada per les proves e2e')
})

test('project phases: editing the execution budget', async () => {
  test.skip(!state.projectId, 'needs the project from "project creation"')
  await visit(`/projecte/${state.projectId}?tab=pressupost`)
  const execution = card('Execució del pressupost')
  const phaseA = await phaseNamed(execution, `${NAME} fase A`)
  await phaseA.locator('.phase-detail-input input').fill(`${NAME} fase A editada`)
  await phaseA.locator('input[name="PreuUnitari"]').first().fill('60')
  const phaseB = await addPhase(execution, `${NAME} fase B`)
  await addLine(phaseB, 'income', { concept: 'Ingrés fase B', quantity: 1, price: 200 })
  await addLine(phaseB, 'expense', { concept: 'Despesa fase B', quantity: 1, price: 80 })
  await button('Guardar').click()
  await expectSnackbar('Guardat')
  await settle()

  const phases = await api('GET', `project-phases?_where[project]=${state.projectId}&_limit=-1`)
  const byName = Object.fromEntries(phases.map(p => [p.name, p]))
  expect(Object.keys(byName).sort()).toEqual([`${NAME} fase A editada`, `${NAME} fase B`])
  expect(Number(byName[`${NAME} fase A editada`].incomes[0].amount)).toBe(60)
  expect(byName[`${NAME} fase B`].incomes.map(i => [i.concept, Number(i.amount)])).toEqual([['Ingrés fase B', 200]])
  expect(byName[`${NAME} fase B`].expenses.map(e => [e.concept, Number(e.amount)])).toEqual([['Despesa fase B', 80]])
  // the original budget is left as it was
  const originals = await api('GET', `project-original-phases?_where[project]=${state.projectId}&_limit=-1`)
  expect(originals.map(p => p.name)).toEqual([`${NAME} fase A`])

  // and the form shows the saved phases after a reload
  await visit(`/projecte/${state.projectId}?tab=pressupost`)
  await phaseNamed(card('Execució del pressupost'), `${NAME} fase A editada`)
  await phaseNamed(card('Execució del pressupost'), `${NAME} fase B`)
})

test('hours: activities add up in the project', async () => {
  test.skip(!state.projectId, 'needs the project from "project creation"')
  // nothing has been dedicated to the new project yet
  await visit(`/projecte/${state.projectId}`)
  expect(await executedHours()).toBe(0)

  await visit('/dedicacio')
  await addActivity({ project: NAME, hours: '3,5', description: `${NAME} activitat 1` })
  await addActivity({ project: NAME, hours: '1.25', description: `${NAME} activitat 2` })
  // both appear in the day list (the "Taula" view)
  await hoursListView()
  for (const description of [`${NAME} activitat 1`, `${NAME} activitat 2`]) {
    await expect(hoursEntry(description)).toBeVisible()
  }

  const activities = await api('GET', `activities?_where[project]=${state.projectId}&_limit=-1`)
  expect(activities.map(a => Number(a.hours)).sort()).toEqual([1.25, 3.5])
  expect(activities.every(a => (a.users_permissions_user?.id ?? a.users_permissions_user) === state.me.id)).toBe(true)

  // the backend recalculates the project totals, possibly a moment later
  await expect.poll(async () => {
    await visit(`/projecte/${state.projectId}`)
    return executedHours()
  }, { timeout: 30_000, intervals: [1000, 2000, 5000] }).toBe(4.75)
  const project = await api('GET', `projects/${state.projectId}`)
  expect(project.total_real_hours).toBe(4.75)
})

test('persones: create, edit and delete a work period', async () => {
  // leftovers of an interrupted run would overlap the new period
  for (const period of await myPeriods()) await api('DELETE', `daily-dedications/${period.id}`)

  await visit('/jornada')
  // clicking a person's name starts a new period for them
  await page.locator('.gantt_grid_data .gantt_row', { hasText: state.me.username }).first().click()
  const modal = page.locator('.modal.is-active').filter({ hasText: 'Jornada' })
  await expect(modal).toBeVisible()
  const dates = field('Període', modal).locator('input')
  await typeDate(dates.nth(0), PERIOD.fromText)
  await typeDate(dates.nth(1), PERIOD.toText)
  await field('Hores', modal).locator('input').fill('6')
  await field('Salari base \\(€\\)', modal).locator('input').fill('2000')
  await modal.getByText('Règim General').click()
  await modal.locator('input[placeholder="Quota %"]').fill('30')
  await button("D'acord", modal).click()
  await expectSnackbar('Guardat')
  await settle()

  let [period] = await myPeriods()
  expect(period, 'the new period was not saved').toBeTruthy()
  expect([period.to, Number(period.hours), Number(period.monthly_salary), period.scheme, Number(period.pct_quota)])
    .toEqual([PERIOD.to, 6, 2000, 'general', 30])

  // edit it from its bar in the chart
  await openPeriod(period)
  await expect(modal).toBeVisible()
  await expect(field('Hores', modal).locator('input')).toHaveValue('6')
  // the modal clears its "changed" flag 100 ms after opening: an edit before that is
  // dropped and D'acord just closes it (ModalBoxWorkingDay.show)
  await page.waitForTimeout(300)
  await field('Hores', modal).locator('input').fill('7')
  await field('Salari base \\(€\\)', modal).locator('input').fill('2100')
  await button("D'acord", modal).click()
  await expectSnackbar('Guardat')
  await settle()
  ;[period] = await myPeriods()
  expect([Number(period.hours), Number(period.monthly_salary)]).toEqual([7, 2100])
  expect(Number(period.costByHour)).toBeGreaterThan(0)

  // and delete it
  await openPeriod(period)
  await button('Esborra', modal).click()
  const confirm = page.locator('.modal.is-active, .dialog.is-active').filter({ hasText: /Esborrar|esborrar/ }).last()
  if (await confirm.isVisible().catch(() => false)) await confirm.locator('.button.is-danger, .button.is-primary').last().click()
  await expectSnackbar('Esborrat')
  expect(await myPeriods()).toEqual([])
})

test('emitted invoice: create a draft assigned to a budget line', async () => {
  test.skip(!state.projectId, 'needs the project and phases from the earlier tests')
  const contact = await contactWithNif()
  await visit('/document/0/emitted-invoices')
  await expect(page.getByText('Factures Emeses').first()).toBeVisible()
  await pickAutocomplete('Clienta', contact.name)
  await pickAutocomplete('Projectes', NAME)
  await fillLine({ concept: `${NAME} servei`, quantity: 2, price: 100, vat: 21, irpf: 15 })
  // base 200 + VAT 42 - IRPF 30
  await expect(page.locator('.summary').getByText(/^\s*Total\s+212,00\s*€\s*$/)).toBeVisible()
  await assignBudgetLine('Ingrés fase B')
  await button('Guardar').click()
  // a new emitted invoice is confirmed in a summary of the draft
  const summary = page.locator('.modal.is-active').filter({ hasText: 'Esborranys de factures' })
  await button("D'acord", summary).click()
  await expect(page).toHaveURL(/\/document\/[1-9]\d*\/emitted-invoices/, { timeout: 20_000 })
  await expectSnackbar('Guardat')
  state.emittedId = Number(page.url().match(/\/document\/(\d+)\//)[1])

  const invoice = await api('GET', `emitted-invoices/${state.emittedId}`)
  expect([invoice.state, invoice.code]).toEqual(['draft', 'ESBORRANY'])
  expect([invoice.total_base, invoice.total_vat, invoice.total_irpf, invoice.total]).toEqual([200, 42, 30, 212])
  expect(invoice.contact?.id).toBe(contact.id)
  expect(invoice.projects.map(p => p.id)).toEqual([state.projectId])
  expect(invoice.lines.map(l => [l.concept, Number(l.quantity), Number(l.base)])).toEqual([[`${NAME} servei`, 2, 100]])
  // the budget line now points at the invoice
  const phases = await api('GET', `project-phases?_where[project]=${state.projectId}&_limit=-1`)
  const line = phases.flatMap(p => p.incomes).find(i => i.concept === 'Ingrés fase B')
  expect([line.paid, line.invoice?.id ?? line.invoice]).toEqual([true, state.emittedId])
})

// issues/016: a document is saved with references to its projects instead of the
// whole projects; the project link and the budget line must survive a second save.
test('emitted invoice: saving the draft again keeps its project and its budget line', async () => {
  test.skip(!state.emittedId, 'needs the draft from the earlier test')
  await visit(`/document/${state.emittedId}/emitted-invoices`)
  // a saved draft is locked until it is opened for editing: its lines are a read-only table
  await expect(card('Línies').locator('.lines-readonly')).toContainText(`${NAME} servei`)
  await expect(card('Línies').locator('input[name="SubFase"]')).toHaveCount(0)
  await button("Editar dades de l'ESBORRANY").click()
  await expect(card('Línies').locator('input[name="SubFase"]').first()).toBeEnabled()
  await fillLine({ concept: `${NAME} servei`, quantity: 3, price: 100, vat: 21, irpf: 15 })
  // base 300 + VAT 63 - IRPF 45
  await expect(page.locator('.summary').getByText(/^\s*Total\s+318,00\s*€\s*$/)).toBeVisible()
  await button('Guardar').click()
  await expectSnackbar('Guardat')
  await settle()

  const invoice = await api('GET', `emitted-invoices/${state.emittedId}`)
  expect([invoice.state, invoice.code]).toEqual(['draft', 'ESBORRANY'])
  expect([invoice.total_base, invoice.total_vat, invoice.total_irpf, invoice.total]).toEqual([300, 63, 45, 318])
  expect(invoice.projects.map(p => p.id)).toEqual([state.projectId])
  const phases = await api('GET', `project-phases?_where[project]=${state.projectId}&_limit=-1`)
  const line = phases.flatMap(p => p.incomes).find(i => i.concept === 'Ingrés fase B')
  expect([line.paid, line.invoice?.id ?? line.invoice]).toEqual([true, state.emittedId])
})

test('received invoice: create one assigned to a budget line', async () => {
  test.skip(!state.projectId, 'needs the project and phases from the earlier tests')
  const contact = await contactWithNif()
  await visit('/document/0/received-invoices')
  await expect(page.getByText('Factures Rebudes').first()).toBeVisible()
  // received invoices have no default date
  const emitted = field('Emissió').locator('input')
  await emitted.fill(today())
  await emitted.press('Tab')
  await pickAutocomplete('Proveïdora', contact.name)
  await field('Número factura proveïdora').locator('input').fill(`${NAME}-P1`)
  await pickAutocomplete('Projectes', NAME)
  await fillLine({ concept: `${NAME} material`, quantity: 1, price: 80, vat: 21 })
  await assignBudgetLine('Despesa fase B')
  await button('Guardar').click()
  await expect(page).toHaveURL(/\/document\/[1-9]\d*\/received-invoices/, { timeout: 20_000 })
  await expectSnackbar('Guardat')
  state.receivedId = Number(page.url().match(/\/document\/(\d+)\//)[1])

  const invoice = await api('GET', `received-invoices/${state.receivedId}`)
  expect(invoice.contact_invoice_number).toBe(`${NAME}-P1`)
  expect(invoice.code).toMatch(/\S+-\d+/)
  expect([invoice.total_base, invoice.total_vat, invoice.total]).toEqual([80, 16.8, 96.8])
  expect(invoice.contact?.id).toBe(contact.id)
  expect(invoice.projects.map(p => p.id)).toEqual([state.projectId])
  const phases = await api('GET', `project-phases?_where[project]=${state.projectId}&_limit=-1`)
  const line = phases.flatMap(p => p.expenses).find(e => e.concept === 'Despesa fase B')
  expect([line.paid, line.invoice?.id ?? line.invoice]).toEqual([true, state.receivedId])
})
