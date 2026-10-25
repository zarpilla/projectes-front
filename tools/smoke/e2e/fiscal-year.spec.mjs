// The configurable fiscal year (Configuració › «Inici de l'any fiscal»,
// me.options.fiscal_year_start_month): with September, a fiscal year is
// September–August, stored as its start year and shown as «2026/27». The project
// economics follow it (Ingressos i despeses and its backend rows, the project's
// «Resum financer», «Any inici» of Informes › Projectes: a known bug); grant years
// only with «Els anys de subvenció són anys fiscals» (grantable_fiscal_years:
// the project's «Imports per any», Justificacions). VAT quarters stay calendar.
//
// Its project has lines and hours on 15/08 and 15/10 of the latest year in the
// table (D), far from the other specs' data: fiscal year D-1 holds August, D
// October, calendar D both. The options are global: they are restored at the end.

import { test, expect } from '@playwright/test'
import {
  useE2E, onCleanup, page, state, api, NAME, visit, settle, field, button, card,
  expectSnackbar, parseNumber, createProject
} from './helpers.mjs'

useE2E()

const PROJECT = `${NAME} any fiscal`
const AUG = `${NAME} agost`
const OCT = `${NAME} octubre`
const AUG_EXPENSE = `${NAME} despesa agost`
const COST_BY_HOUR = 20

const num = text => parseNumber(String(text).match(/[-−]?\d[\d.,]*/)?.[0]?.replace('−', '-') ?? '')
const fy = year => `${year}/${String(year + 1).slice(-2)}`

const options = async () => (await api('GET', 'me?populate=options')).options
// sets options through the API; me is cached for the page load, so reload it
async function setOptions (patch) {
  const current = await options()
  await api('PUT', 'me', { data: { options: { ...current, id: undefined, ...patch } } })
  await page.reload()
  await settle()
}

// «Inici de l'any fiscal» in Configuració, saved from the form
async function saveStartMonth (month, { grantFiscal } = {}) {
  await visit('/administracio/me')
  await field("Inici de l'any fiscal").locator('select').selectOption({ label: month })
  if (grantFiscal !== undefined) {
    const box = page.locator('label.option-row', { hasText: 'Els anys de subvenció són anys fiscals' }).locator('input[type=checkbox]')
    if (await box.isChecked() !== grantFiscal) await page.getByText('Els anys de subvenció són anys fiscals').click()
  }
  await button('Guardar').click()
  await expectSnackbar('Guardat correctament')
}

// The «Any» select of a filter bar: its option labels
const yearSelect = () => page.locator('.filter-bar label.filter-select', { hasText: 'Any' }).locator('select')
const yearLabels = async () => (await yearSelect().locator('option').allInnerTexts()).map(t => t.trim())

// Ingressos i despeses for the year labelled `label`: the project's row of totals
async function economicDetail (label) {
  await visit('/stats-economic-detail')
  // it opens on the current year: picking it again asks nothing
  if ((await yearSelect().locator('option:checked').innerText()).trim() !== label) {
    const loaded = page.waitForResponse(r => r.url().includes('projects/economic-detail'))
    await yearSelect().selectOption({ label })
    await loaded
    await settle()
  }
  await expect.poll(() => page.evaluate(() => {
    const grid = window.jQuery && window.jQuery('#project-despeses').data('kendoPivotGrid')
    return !!grid && grid.dataSource.data().length > 0
  }), { timeout: 30_000 }).toBe(true)
  await page.evaluate(v => window.jQuery('#project-despeses').data('kendoPivotGrid').dataSource.filter({ field: 'project_name', operator: 'eq', value: v }), PROJECT)
  const cells = page.locator('#project-despeses .k-pivot-table .k-grid-content tr').first().locator('td')
  await expect(cells.first()).not.toHaveText(/^\s*$/)
  const measures = await page.locator('#project-despeses .k-settings-measures .k-button').evaluateAll(b => b.map(x => x.dataset.name))
  const values = await cells.allInnerTexts()
  const all = Object.fromEntries(measures.map((m, i) => [m, num(values[i])]))
  return { 'Ingressos orig': all['Ingressos orig'], 'Ingressos prev': all['Ingressos prev'], 'Hores exec (h)': all['Hores exec (h)'] }
}

// the rows of projects/economic-detail for the project in one year
const economicRows = year => api('GET', `projects/economic-detail?_q=${encodeURIComponent(PROJECT)}&_where[year_eq]=${year}&_limit=-1`)
  .then(rows => rows.filter(r => r.name === PROJECT || r.project_name === PROJECT))

// The project's «Resum financer»: its «Període» buttons, and Ingressos/Hores of one
async function summary (period) {
  await visit(`/project/${state.projectId}`)
  const group = page.getByRole('group', { name: 'Període' })
  await expect(group).toBeVisible({ timeout: 20_000 })
  const periods = (await group.getByRole('button').allInnerTexts()).map(t => t.trim())
  if (!period) return { periods }
  await group.getByRole('button', { name: period, exact: true }).click()
  await settle(300)
  const row = label => page.locator('.project-summary-cards .summary-table tbody tr')
    .filter({ has: page.locator('th', { hasText: new RegExp(`^\\s*${label}\\s*$`) }) }).locator('td')
  const incomes = (await row('Ingressos').allInnerTexts()).map(num)
  const hours = (await row('Hores').allInnerTexts()).map(num)
  // columns: Original, Previst, Executat
  return { periods, incomes: incomes.slice(0, 2), hours: hours[2] }
}

// Informes › Projectes: how many of the project's rows have «Any inici» `label`
// (the pivot filtered to both, read from its «Num» measure)
async function startYearCount (label) {
  await expect.poll(() => page.evaluate(() => {
    const grid = window.jQuery && window.jQuery('#project-stats').data('kendoPivotGrid')
    return !!grid && grid.dataSource.data().length > 0
  }), { timeout: 30_000 }).toBe(true)
  await page.evaluate(([name, year]) => window.jQuery('#project-stats').data('kendoPivotGrid').dataSource.filter({
    logic: 'and',
    filters: [{ field: 'project_name', operator: 'eq', value: name }, { field: 'project_year', operator: 'eq', value: year }]
  }), [PROJECT, label])
  const measures = await page.locator('#project-stats .k-settings-measures .k-button').evaluateAll(b => b.map(x => x.dataset.name))
  const cell = page.locator('#project-stats .k-pivot-table .k-grid-content tr').first().locator('td').nth(measures.indexOf('Num'))
  // an empty cell is no row: give the pivot time to fill it first
  await expect(cell).not.toHaveText(/^\s*$/, { timeout: 5_000 }).catch(() => {})
  return num(await cell.innerText().catch(() => '') || 0)
}

// Justificacions, «Reals» hours: the year labels and the project's row
async function justification (label) {
  await visit('/justifications')
  const labels = await yearLabels()
  await page.getByRole('group', { name: 'Hores' }).getByRole('button', { name: 'Reals', exact: true }).click()
  await yearSelect().selectOption({ label })
  await settle(1000)
  const row = card('Totals per projecte (bestretes)').locator('tbody tr').filter({ hasText: PROJECT })
  await expect(row).toHaveCount(1, { timeout: 20_000 })
  const cells = await row.locator('td').allInnerTexts()
  // Projecte, Import a justificar, Import justificat
  return { labels, grantable: num(cells[1]), justified: num(cells[2]) }
}

test('setup: a project with lines and hours on both sides of 1 September', async () => {
  test.setTimeout(150_000)
  state.original = await options()
  onCleanup(() => api('PUT', 'me', { data: { options: { ...state.original, id: undefined } } }))
  // a leftover of an interrupted run
  if (state.original.fiscal_year_start_month !== 1 || state.original.grantable_fiscal_years) {
    await setOptions({ fiscal_year_start_month: 1, grantable_fiscal_years: false })
  }
  const years = await api('GET', 'years?_limit=-1')
  const ids = Object.fromEntries(years.map(y => [Number(y.year), y.id]))
  // the latest year whose previous one is there too (the seed and the 2027 holidays add them)
  state.D = Math.max(...Object.keys(ids).map(Number).filter(y => ids[y - 1]))
  const D = state.D
  expect(D, 'two consecutive years in Taules auxiliars › Anys').toBeGreaterThan(2000)

  // the wizard takes one line of each kind: the August income is added below
  state.projectId = await createProject(PROJECT, {
    incomes: [{ concept: OCT, quantity: 1, price: 300 }],
    expenses: [{ concept: AUG_EXPENSE, quantity: 1, price: 40 }]
  })
  // The dates of the lines, original and execution budget, saved through the
  // project as its form does (phase lines can't be written on their own):
  // the lines marked dirty are updated, the one without id is created
  const dates = { [OCT]: `${D}-10-15`, [AUG_EXPENSE]: `${D}-08-15` }
  const data = {}
  for (const [key, route] of [['project_phases', 'project-phases'], ['project_original_phases', 'project-original-phases']]) {
    const [phase] = await api('GET', `${route}?_where[project]=${state.projectId}&_limit=-1`)
    const dated = l => ({ id: l.id, dirty: true, quantity: l.quantity, amount: l.amount, date: dates[l.concept], date_estimate_document: dates[l.concept] })
    const [oct] = phase.incomes
    const { id, documentId, createdAt, updatedAt, publishedAt, ...copy } = oct
    expect([oct.concept, phase.expenses[0].concept]).toEqual([OCT, AUG_EXPENSE])
    data[key] = [{
      id: phase.id,
      name: phase.name,
      incomes: [dated(oct), { ...copy, concept: AUG, quantity: 1, amount: 100, date: `${D}-08-15`, date_estimate_document: `${D}-08-15` }],
      expenses: [dated(phase.expenses[0])]
    }]
    data[`_${key}_updated`] = true
    data[`${key}_info`] = {}
  }
  await api('PUT', `projects/${state.projectId}`, { data })
  // hours on the same days, with their own cost
  for (const [date, hours] of [[`${D}-08-15`, 2], [`${D}-10-15`, 3]]) {
    await api('POST', 'activities', {
      data: { date, hours, description: `${NAME} hores ${date}`, project: state.projectId, users_permissions_user: state.me.id, cost_by_hour: COST_BY_HOUR }
    })
  }
  // starts in August (Any inici), subsidised with an amount per year
  await api('PUT', `projects/${state.projectId}`, {
    data: {
      date_start: `${D}-08-15`,
      date_end: `${D}-12-31`,
      grantable: true,
      grantable_years: [{ year: ids[D - 1], grantable_amount: 1000 }, { year: ids[D], grantable_amount: 2000 }]
    }
  })
  await api('GET', `projects/refresh-stored-totals?ids=${state.projectId}`)
  const p = await api('GET', `projects/${state.projectId}?populate[0]=grantable_years.year`)
  expect(p.date_start).toBe(`${D}-08-15`)
  expect(p.grantable_years.map(g => [Number(g.year.year), Number(g.grantable_amount)])).toEqual([[D - 1, 1000], [D, 2000]])
  // calendar year: all of it in D
  expect((await economicRows(D)).length).toBeGreaterThan(0)
  expect(await economicRows(D - 1)).toEqual([])
})

test('Configuració: «Inici de l\'any fiscal» September is saved and the years read «2026/27»', async () => {
  test.skip(!state.projectId, 'needs the project')
  await visit('/stats-economic-detail')
  expect(await yearLabels()).toContain(String(state.D))
  await saveStartMonth('Setembre')
  const saved = await options()
  expect([saved.fiscal_year_start_month, saved.grantable_fiscal_years]).toEqual([9, false])
  await page.reload()
  await settle()
  for (const route of ['/stats-economic-detail', '/price-hour']) {
    await visit(route)
    const labels = await yearLabels()
    expect(labels, route).toEqual(expect.arrayContaining([fy(state.D - 1), fy(state.D)]))
    expect(labels, route).not.toContain(String(state.D))
  }
})

test('Ingressos i despeses: fiscal year D-1 has August, D has October', async () => {
  test.skip(!state.projectId, 'needs the project')
  // the backend groups the rows by fiscal year
  const before = await economicRows(state.D - 1)
  const after = await economicRows(state.D)
  expect([...new Set(before.map(r => r.date.slice(0, 7)))].sort()).toEqual([`${state.D}-08`])
  expect([...new Set(after.map(r => r.date.slice(0, 7)))].sort()).toEqual([`${state.D}-10`])
  expect(await economicDetail(fy(state.D - 1))).toEqual({ 'Ingressos orig': 100, 'Ingressos prev': 100, 'Hores exec (h)': 2 })
  expect(await economicDetail(fy(state.D))).toEqual({ 'Ingressos orig': 300, 'Ingressos prev': 300, 'Hores exec (h)': 3 })
})

test('project page: «Resum financer» by fiscal year', async () => {
  test.skip(!state.projectId, 'needs the project')
  const D = state.D
  // columns: Original, Previst; and Executat hours
  expect(await summary(fy(D - 1))).toEqual({ periods: ['Total', fy(D - 1), fy(D)], incomes: [100, 100], hours: 2 })
  expect(await summary(fy(D))).toEqual({ periods: ['Total', fy(D - 1), fy(D)], incomes: [300, 300], hours: 3 })
})

// the pivot typed «Any inici» as a number, so Kendo turned «2026/27» into 2026
// (issues/341)
test('Informes › Projectes: «Any inici» is the fiscal year «2026/27»', async () => {
  test.skip(!state.projectId, 'needs the project')
  // 15/08/D is in fiscal year D-1
  await visit('/stats-projectes')
  expect(await startYearCount(fy(state.D - 1))).toBe(1)
})

test('grant years: calendar until «Els anys de subvenció són anys fiscals», then fiscal', async () => {
  test.skip(!state.projectId, 'needs the project')
  test.setTimeout(90_000)
  const D = state.D
  // fiscal year on, grant years off: Justificacions keeps the calendar year
  let j = await justification(String(D))
  expect(j.labels).toContain(String(D))
  expect([j.grantable, j.justified]).toEqual([2000, 100])

  await saveStartMonth('Setembre', { grantFiscal: true })
  expect((await options()).grantable_fiscal_years).toBe(true)
  await page.reload()
  await settle()
  // «Imports per any» of the project
  await visit(`/project/${state.projectId}?tab=dades`)
  const picked = field('Imports per any').locator('select option:checked')
  await expect(picked).toHaveText([fy(D - 1), fy(D)].map(l => new RegExp(`^\\s*${l.replace('/', '\\/')}\\s*$`)))
  // Justificacions: fiscal year D-1 is August's 2 h, D October's 3 h
  j = await justification(fy(D - 1))
  expect(j.labels).toEqual(expect.arrayContaining([fy(D - 1), fy(D)]))
  expect([j.grantable, j.justified]).toEqual([1000, 2 * COST_BY_HOUR])
  j = await justification(fy(D))
  expect([j.grantable, j.justified]).toEqual([2000, 3 * COST_BY_HOUR])
})

test('VAT stays on the calendar year: the August expense is in D, quarter 3', async () => {
  test.skip(!state.projectId, 'needs the project')
  expect((await options()).fiscal_year_start_month).toBe(9)
  await visit('/vat')
  await page.getByRole('tab', { name: /^Documents previstos/ }).click()
  const row = page.locator('section.list-box').filter({ visible: true }).first().locator('tbody tr').filter({ hasText: AUG_EXPENSE })
  await expect(row).toHaveCount(1, { timeout: 20_000 })
  const cells = (await row.locator('td').allInnerTexts()).map(t => t.trim())
  // Projecte, Concepte, Tipus, Data estimada, Any, Trimestre
  expect([cells[4], cells[5]]).toEqual([String(state.D), 'T3'])
})

test('back to January: calendar labels and figures again', async () => {
  test.skip(!state.projectId, 'needs the project')
  test.setTimeout(90_000)
  const D = state.D
  await saveStartMonth('Gener')
  expect((await options()).fiscal_year_start_month).toBe(1)
  await page.reload()
  await settle()
  await visit('/stats-economic-detail')
  expect(await yearLabels()).not.toContain(fy(D))
  expect(await economicDetail(String(D))).toEqual({ 'Ingressos orig': 400, 'Ingressos prev': 400, 'Hores exec (h)': 5 })
  expect(await summary(String(D))).toEqual({ periods: ['Total', String(D)], incomes: [400, 400], hours: 5 })
  await visit('/stats-projectes')
  expect(await startYearCount(String(D))).toBe(1)
  // grant years too, even with grantable_fiscal_years still set
  const j = await justification(String(D))
  expect(j.labels).not.toContain(fy(D))
  expect([j.grantable, j.justified]).toEqual([2000, 100])
})
