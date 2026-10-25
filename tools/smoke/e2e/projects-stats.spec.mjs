// Project figures across the screens that report them: what a project's page shows
// (incomes, expenses, hours, result) is what the API stored (project_totals since
// issues/326–328), and the Projectes list, Informes › Projectes, Ingressos i despeses
// and Dedicació show the same; planned hours reach Previsió dedicació; a mother
// adds up its children only (issues/172); Recàlcul leaves the figures as they are;
// and the stars of Inici are saved on the user.
//
// The projects are its own (`NAME fill A`, `fill B`, `mare`); the pivots are filtered
// to them, so other specs' data doesn't count. Inici is restored at the end.

import { test, expect } from '@playwright/test'
import {
  useE2E, onCleanup, page, state, api, NAME, visit, settle, field, button, modal, escapeRegExp,
  expectSnackbar, parseNumber, createProject, addActivity, contactWithNif, createEmittedInvoice
} from './helpers.mjs'

useE2E()

const CHILD_A = `${NAME} fill A`
const CHILD_B = `${NAME} fill B`
const MOTHER = `${NAME} mare`

// "1.100,00 €", "−50,00 €", "3,50 h" → number
const num = text => parseNumber(String(text).match(/[-−]?\d[\d.,]*/)?.[0]?.replace('−', '-') ?? '')
const round2 = n => Math.round(n * 100) / 100
// "3,50 h / 10,00 h" (done / planned; "sense previsió" without a plan) → [3.5, 10]
const hoursPair = text => {
  const [done, planned] = String(text).split('/')
  return [num(done), planned ? num(planned) : 0]
}

// The figures a project screen and the API share, from the stored totals
const KINDS = {
  original: ['original_incomes_expenses', 'total_original_incomes', 'total_original_expenses', 'total_original_hours_price', 'total_original_expenses_vat', 'total_original_hours'],
  estimated: ['estimated_incomes_expenses', 'total_estimated_incomes', 'total_estimated_expenses', 'total_estimated_hours_price', 'total_estimated_expenses_vat', 'total_estimated_hours'],
  real: ['total_real_incomes_expenses', 'total_real_incomes', 'total_real_expenses', 'total_real_hours_price', 'total_real_expenses_vat', 'total_real_hours']
}
function figures (project) {
  const out = {}
  for (const [kind, [result, incomes, invoices, hoursCost, vat, hours]] of Object.entries(KINDS)) {
    const v = f => Number(project[f]) || 0
    out[kind] = {
      Resultat: round2(v(result)),
      Ingressos: round2(v(incomes)),
      'Despeses totals': round2(v(invoices) + v(hoursCost) + v(vat)),
      Hores: round2(v(hours))
    }
  }
  return out
}

// The project page's «Resum financer» table, as { original, estimated, real } like figures()
async function pageFigures () {
  const table = page.locator('.project-summary-cards .summary-table tbody tr')
  await expect(table.first()).toBeVisible({ timeout: 20_000 })
  const out = { original: {}, estimated: {}, real: {} }
  for (const row of await table.all()) {
    const label = (await row.locator('th').innerText()).trim()
    if (!['Resultat', 'Ingressos', 'Despeses totals', 'Hores'].includes(label)) continue
    const cells = await row.locator('td').allInnerTexts()
    ;['original', 'estimated', 'real'].forEach((kind, i) => { out[kind][label] = num(cells[i]) })
  }
  return out
}

const project = id => api('GET', `projects/${id}`)

// A Kendo pivot of the reports (#project-stats, #project-despeses) filtered to the rows
// whose `field` is `value`: its rows and columns are collapsed, so what is left is one
// row of totals. Returns { measure: number }.
async function pivotFigures (selector, field, value) {
  await expect.poll(() => page.evaluate(sel => {
    const grid = window.jQuery && window.jQuery(sel).data('kendoPivotGrid')
    return !!grid && grid.dataSource.data().length > 0
  }, selector), { timeout: 30_000 }).toBe(true)
  await page.evaluate(([sel, f, v]) => window.jQuery(sel).data('kendoPivotGrid').dataSource.filter({ field: f, operator: 'eq', value: v }), [selector, field, value])
  const cells = page.locator(`${selector} .k-pivot-table .k-grid-content tr`).first().locator('td')
  await expect(cells.first()).not.toHaveText(/^\s*$/)
  const measures = await page.locator(`${selector} .k-settings-measures .k-button`).evaluateAll(buttons => buttons.map(b => b.dataset.name))
  const values = await cells.allInnerTexts()
  return Object.fromEntries(measures.map((m, i) => [m, num(values[i])]))
}

// The lists and reports read the stored totals, which the totals cron writes every 2
// minutes (it is off in the e2e backends): do its work for this spec's projects
async function refreshTotals () {
  const ids = [state.childA, state.childB, state.mother].filter(Boolean)
  const result = await api('GET', `projects/refresh-stored-totals?ids=${ids.join(',')}`)
  expect(result.failed).toEqual([])
}

test('setup: two projects and a mother-to-be, with a budget', async () => {
  test.setTimeout(120_000)
  state.childA = await createProject(CHILD_A, {
    incomes: [{ concept: 'Ingrés A', quantity: 2, price: 500 }],
    expenses: [{ concept: 'Despesa A', quantity: 1, price: 200 }]
  })
  state.childB = await createProject(CHILD_B, {
    incomes: [{ concept: 'Ingrés B', quantity: 1, price: 300 }],
    expenses: [{ concept: 'Despesa B', quantity: 1, price: 50 }]
  })
  // and the future mother, with figures of her own (they must not count once she has children)
  state.mother = await createProject(MOTHER, { incomes: [{ concept: 'Ingrés mare', quantity: 1, price: 9000 }] })
})

test('setup: hours and an invoice', async () => {
  test.skip(!state.mother, 'needs the projects')
  test.setTimeout(120_000)
  await visit('/dedicacio')
  await addActivity({ project: CHILD_A, hours: 2, description: `${NAME} hores A1` })
  await addActivity({ project: CHILD_A, hours: '1,5', description: `${NAME} hores A2` })
  await addActivity({ project: CHILD_B, hours: 1, description: `${NAME} hores B` })
  await addActivity({ project: MOTHER, hours: 4, description: `${NAME} hores mare` })
  state.invoiceA = await createEmittedInvoice({
    contact: await contactWithNif('stats'),
    projectName: CHILD_A,
    budgetConcept: 'Ingrés A',
    line: { concept: `${NAME} servei A`, quantity: 2, price: 500, vat: 21 }
  })
})

test('planning: hours planned for a person reach Previsió dedicació', async () => {
  test.skip(!state.childA, 'needs the projects')
  await visit(`/projecte/${state.childA}?tab=planificacio`)
  await expect(page.getByText('Planificació prevista').first()).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('.gantt_grid_data .gantt_row', { hasText: 'Ingrés A' })).toBeVisible()
  await settle(1000)
  // drag on the income line's row of the chart (the phase's row takes none); the
  // «Mesos» scale rounds it to whole months (issues/282)
  const row = page.locator('.gantt_task_bg .gantt_task_row').nth(1)
  const box = await row.boundingBox()
  const area = await page.locator('.gantt_task').first().boundingBox()
  await page.mouse.move(area.x + 40, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(area.x + 200, box.y + box.height / 2, { steps: 8 })
  await page.mouse.up()
  const hoursModal = modal('Planificació')
  await expect(hoursModal).toBeVisible()
  await field('Hores', hoursModal).locator('input').fill('10')
  // the person is the one logged in
  await expect(field('Persona', hoursModal).locator('select option:checked')).toHaveText(state.me.username)
  await button("D'acord", hoursModal).click()
  await expect(hoursModal).toBeHidden()
  const saved = page.waitForResponse(r => r.request().method() === 'PUT' && r.url().endsWith(`/projects/${state.childA}`))
  await button('Guardar').click()
  expect((await saved).ok()).toBe(true)
  await settle()

  const [phase] = await api('GET', `project-phases?_where[project]=${state.childA}&_limit=-1`)
  const income = phase.incomes.find(i => i.concept === 'Ingrés A')
  const planned = await api('GET', `estimated-hours?_where[phase_income]=${income.id}&_limit=-1`)
  expect(planned.map(h => [Number(h.quantity), h.users_permissions_user?.id ?? h.users_permissions_user])).toEqual([[10, state.me.id]])
  state.planned = planned[0]
  const stored = await project(state.childA)
  expect(stored.total_estimated_hours).toBe(10)
  // the original budget keeps its hours (none)
  expect(stored.total_original_hours).toBe(0)

  // Previsió dedicació: the person's months of the plan add up to the 10 h, all of this project
  const from = new Date(state.planned.from)
  const to = new Date(state.planned.to)
  let sum = 0
  await visit('/panell-previsio-dedicacio')
  for (let year = from.getFullYear(); year <= to.getFullYear(); year++) {
    const label = page.locator('.month-nav-label')
    while (Number(await label.innerText()) !== year) {
      await page.getByRole('button', { name: Number(await label.innerText()) < year ? 'Any següent' : 'Any anterior' }).click()
      await settle(300)
    }
    const person = page.locator('.dedication-table tbody tr').filter({ has: page.locator('th', { hasText: new RegExp(`^\\s*${escapeRegExp(state.me.username)}\\s*$`) }) })
    await expect(person).toBeVisible({ timeout: 20_000 })
    for (let month = 0; month < 12; month++) {
      const day = new Date(year, month, 1)
      if (day < new Date(from.getFullYear(), from.getMonth(), 1) || day > to) continue
      await person.locator('td.period-cell').nth(month).hover()
      const line = page.locator('.custom-tooltip .dt-project', { hasText: CHILD_A })
      await expect(line).toBeVisible()
      sum += num(await line.locator('.dt-row-hours').innerText())
      await page.mouse.move(0, 0)
      await expect(page.locator('.custom-tooltip')).toBeHidden()
    }
  }
  expect(round2(sum)).toBe(10)
})

test('project page: the figures are the stored totals', async () => {
  test.skip(!state.planned, 'needs the projects, hours, invoice and planning')
  await refreshTotals()
  const a = await project(state.childA)
  // what was created: 2 × 500 income (invoiced) and 200 expense, 3.5 h done, 10 h planned
  expect([a.total_original_incomes, a.total_estimated_incomes, a.total_real_incomes]).toEqual([1000, 1000, 1000])
  expect([a.total_original_expenses, a.total_estimated_expenses]).toEqual([200, 200])
  expect([a.total_original_hours, a.total_estimated_hours, a.total_real_hours]).toEqual([0, 10, 3.5])
  const b = await project(state.childB)
  expect([b.total_estimated_incomes, b.total_estimated_expenses, b.total_real_incomes, b.total_real_hours]).toEqual([300, 50, 0, 1])
  for (const p of [a, b]) {
    await visit(`/projecte/${p.id}`)
    expect(await pageFigures(), p.name).toEqual(figures(p))
  }
  // nothing left for the cron: what is stored is what the backend computes now
  const check = await api('GET', `projects/verify-stored-totals?ids=${state.childA},${state.childB}`)
  expect(check.report.map(r => [r.name, r.diffs])).toEqual([[CHILD_A, {}], [CHILD_B, {}]])
})

test('Projectes list: the same figures', async () => {
  test.skip(!state.planned, 'needs the projects')
  await visit('/projectes')
  const search = page.locator('input[aria-label="Cerca per nom"]')
  const searched = page.waitForResponse(r => r.url().includes('projects/basic') && r.url().includes('_q='))
  await search.fill(`${NAME} fill`)
  await search.press('End') // the list searches on keyup
  await searched
  await settle()
  for (const id of [state.childA, state.childB]) {
    const p = await project(id)
    const row = page.locator('.projects-card tbody tr').filter({ has: page.locator('a.project-name', { hasText: new RegExp(`^\\s*${escapeRegExp(p.name)}\\s*$`) }) })
    await expect(row).toBeVisible()
    const hours = await row.locator('td[data-label="Hores fetes / previstes"] .hours-line').innerText()
    expect(hoursPair(hours), p.name).toEqual([p.total_real_hours, p.total_estimated_hours])
    expect(num(await row.locator('td[data-label="Resultat executat"]').innerText()), p.name).toBe(p.total_real_incomes_expenses)
    expect(num(await row.locator('td[data-label="Resultat previst"]').innerText()), p.name).toBe(p.incomes_expenses)
  }
})

test('Informes › Projectes: the pivot shows the same figures', async () => {
  test.skip(!state.planned, 'needs the projects')
  await visit('/panell-projectes')
  for (const id of [state.childA, state.childB]) {
    const p = await project(id)
    const pivot = await pivotFigures('#project-stats', 'project_name', p.name)
    expect({
      Num: pivot.Num,
      'Hores previstes': pivot['Hores previstes'],
      'Hores reals': pivot['Hores reals'],
      'Ingressos previstos': pivot['Ingressos previstos'],
      'Ingressos reals': pivot['Ingressos reals'],
      'Despeses previstes': pivot['Despeses previstes'],
      'Resultat previst': pivot['Resultat previst'],
      'Resultat real': pivot['Resultat real']
    }, p.name).toEqual({
      Num: 1,
      'Hores previstes': p.total_estimated_hours,
      'Hores reals': p.total_real_hours,
      'Ingressos previstos': p.total_incomes,
      'Ingressos reals': p.total_real_incomes,
      'Despeses previstes': p.total_expenses,
      'Resultat previst': p.incomes_expenses,
      'Resultat real': p.total_real_incomes_expenses
    })
  }
})

test('Informes › Ingressos i despeses: the pivot adds up to the project figures', async () => {
  test.skip(!state.planned, 'needs the projects')
  await visit('/panell-detall-economic')
  // every year: the planned hours can fall in another one
  const loaded = page.waitForResponse(r => r.url().includes('projects/economic-detail') && !r.url().includes('year_eq'))
  await page.locator('.filter-bar label.filter-select', { hasText: 'Any' }).locator('select').selectOption({ label: 'Tots' })
  await loaded
  await settle()
  for (const id of [state.childA, state.childB]) {
    const p = await project(id)
    const pivot = await pivotFigures('#project-despeses', 'project_name', p.name)
    const pick = keys => Object.fromEntries(keys.map(k => [k, pivot[k]]))
    expect(pick(['Ingressos orig', 'Ingressos prev', 'Ingressos exec', 'Despeses tot prev', 'Hores prev (h)', 'Hores exec (h)', 'Resultat prev', 'Resultat exec']), p.name).toEqual({
      'Ingressos orig': p.total_original_incomes,
      'Ingressos prev': p.total_estimated_incomes,
      'Ingressos exec': p.total_real_incomes,
      // expenses go negative in this pivot
      'Despeses tot prev': -figures(p).estimated['Despeses totals'],
      'Hores prev (h)': p.total_estimated_hours,
      'Hores exec (h)': p.total_real_hours,
      'Resultat prev': p.estimated_incomes_expenses,
      'Resultat exec': p.total_real_incomes_expenses
    })
  }
})

test('Informes › Dedicació: hours done and planned per project and person', async () => {
  test.skip(!state.planned, 'needs the projects')
  await visit('/panell-dedicacio')
  const filters = page.locator('form.filter-bar')
  const select = label => filters.locator('label.filter-select', { hasText: label }).locator('select')
  await select('Any').selectOption({ label: 'Tots' })
  await select('Persona').selectOption({ label: state.me.username })
  const kpi = async label => num(await page.locator('.doc-kpi').filter({ has: page.locator('span', { hasText: new RegExp(`^\\s*${label}\\s*$`) }) }).locator('b').innerText())
  for (const [name, done, planned] of [[CHILD_A, 3.5, 10], [CHILD_B, 1, 0]]) {
    const input = filters.locator('input[aria-label="Projecte"]')
    await input.fill('')
    await input.pressSequentially(name, { delay: 10 })
    await filters.locator('.autocomplete .dropdown-item', { hasText: new RegExp(`^\\s*${escapeRegExp(name)}\\s*$`) }).first().click()
    await expect(page.locator('.dc-head')).toContainText('1 projecte', { timeout: 20_000 })
    await expect.poll(() => kpi('Hores fetes'), { timeout: 20_000 }).toBe(done)
    expect(await kpi('Previstes en total'), name).toBe(planned)
  }
  // the activities behind them
  const activities = await api('GET', `activities?_where[project]=${state.childA}&_limit=-1`)
  expect(activities.map(a => Number(a.hours)).sort()).toEqual([1.5, 2])
})

test('mother project: its figures are its children only', async () => {
  test.skip(!state.planned, 'needs the projects')
  // the mother had figures of her own: 9000 income, 4 h
  expect((await project(state.mother)).total_real_hours).toBe(4)
  for (const id of [state.childA, state.childB]) {
    await visit(`/projecte/${id}?tab=dades`)
    const input = field('Projecte mare').locator('input')
    await input.click()
    await input.pressSequentially(MOTHER, { delay: 10 })
    await page.locator('.autocomplete .dropdown-item', { hasText: new RegExp(`^\\s*${escapeRegExp(MOTHER)}\\s*$`) }).filter({ visible: true }).first().click()
    const saved = page.waitForResponse(r => r.request().method() === 'PUT' && r.url().endsWith(`/projects/${id}`))
    await button('Guardar').click()
    expect((await saved).ok()).toBe(true)
    await expectSnackbar('Guardat')
    const child = await project(id)
    expect(child.mother?.id ?? child.mother).toBe(state.mother)
  }
  await refreshTotals()
  const [a, b, mother] = await Promise.all([state.childA, state.childB, state.mother].map(project))
  expect(mother.is_mother).toBe(true)
  const sum = f => round2((Number(a[f]) || 0) + (Number(b[f]) || 0))
  for (const f of [...KINDS.original, ...KINDS.estimated, ...KINDS.real]) expect(mother[f], f).toBe(sum(f))
  expect([mother.total_real_hours, mother.total_estimated_incomes]).toEqual([4.5, 1300])

  // her page: the children's sum, and a table of them
  await visit(`/projecte/${state.mother}`)
  expect(await pageFigures()).toEqual(figures(mother))
  await visit(`/projecte/${state.mother}?tab=dades`)
  const children = field('Projectes fills').locator('tbody tr')
  await expect(children).toHaveCount(2)
  for (const child of [a, b]) {
    const cells = await children.filter({ hasText: child.name }).locator('td').allInnerTexts()
    expect([...hoursPair(cells[4]), num(cells[5]), num(cells[6])], child.name)
      .toEqual([child.total_real_hours, child.total_estimated_hours, child.estimated_incomes_expenses, child.total_real_incomes_expenses])
  }

  // Projectes mare: her row
  await visit('/projectes-mare')
  const row = page.locator('.projects-card tbody tr').filter({ has: page.locator('a.project-name', { hasText: new RegExp(`^\\s*${escapeRegExp(MOTHER)}\\s*$`) }) })
  await expect(row).toBeVisible({ timeout: 20_000 })
  expect(hoursPair(await row.locator('td[data-label="Hores fetes / previstes"] .hours-line').innerText())).toEqual([4.5, 10])
  expect(num(await row.locator('td[data-label="Resultat executat"]').innerText())).toBe(mother.total_real_incomes_expenses)
  expect(num(await row.locator('td[data-label="Resultat previst"]').innerText())).toBe(mother.incomes_expenses)
})

test('Recàlcul: recalculating every project leaves the figures as they were', async () => {
  test.skip(!state.planned, 'needs the projects')
  // it recalculates every project of the database, one by one
  test.setTimeout(180_000)
  const ids = [state.childA, state.childB, state.mother]
  const before = await Promise.all(ids.map(project))
  await visit('/recalcul')
  const count = page.locator('.recalc-count')
  await expect(count).toHaveText(/^0 de [1-9]\d* actualitzats$/)
  await button('Actualitza tot').click()
  await expect(page.locator('.toast', { hasText: 'Recalculat!' })).toBeVisible({ timeout: 150_000 })
  const all = (await count.innerText()).match(/de (\d+)/)[1]
  await expect(count).toHaveText(`${all} de ${all} actualitzats`)
  await refreshTotals()
  const after = await Promise.all(ids.map(project))
  for (const [i, p] of after.entries()) expect(figures(p), p.name).toEqual(figures(before[i]))
  await visit(`/projecte/${state.mother}`)
  expect(await pageFigures()).toEqual(figures(before[2]))
})

test('Inici: a starred menu entry is pinned and saved on the user', async () => {
  const home = async () => {
    const res = await api('GET', 'users/me/home')
    const raw = res?.home ?? res?.data?.home ?? res
    return typeof raw === 'string' ? JSON.parse(raw) : raw
  }
  const original = await home()
  onCleanup(async () => { if (original && original.pins) await api('PUT', 'users/me/home', original) })
  const ENTRY = { to: '/panell-preu-hora', label: 'Preu hora' }
  // a leftover of an interrupted run
  if (original?.pins?.includes(ENTRY.to)) await api('PUT', 'users/me/home', { ...original, pins: original.pins.filter(p => p !== ENTRY.to) })

  await visit('/inici')
  const tile = page.locator(`.home-tile[data-to="${ENTRY.to}"]`)
  await expect(tile).toHaveCount(0)
  const saved = () => page.waitForResponse(r => r.request().method() === 'PUT' && r.url().endsWith('/users/me/home'))
  let put = saved()
  await page.getByRole('button', { name: `Fixa a l'inici: ${ENTRY.label}`, exact: true }).click()
  expect((await put).ok()).toBe(true)
  await expect(tile).toBeVisible()
  await expect(tile).toContainText(ENTRY.label)
  expect((await home()).pins).toContain(ENTRY.to)

  // after a reload it comes from the user, not only from this browser
  await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('home:')).forEach(k => localStorage.removeItem(k)))
  await visit('/inici')
  await expect(tile).toBeVisible()
  await tile.locator('a.home-tile-link').click()
  await expect(page).toHaveURL(/\/price-hour(\?|$)/)

  // and unstarring it removes it
  await visit('/inici')
  put = saved()
  await tile.getByRole('button', { name: `Treu de l'inici: ${ENTRY.label}` }).click()
  expect((await put).ok()).toBe(true)
  await expect(tile).toHaveCount(0)
  expect((await home()).pins).not.toContain(ENTRY.to)
})
