// «Duplicar projecte» and project series («Sèries de projecte»).
// 2026-11-06: confirming a copy answered «S'ha produït un error al guardar el
// projecte: Invalid key project_phases_info» (the create path kept the form's
// control fields, that v5 rejects). Then: a series numbers the projects that
// take it, «[2026-001] Nom», reuses the number of the last one sent to the
// trash, and the copy of a project asks for the series it goes into.

import { test, expect } from '@playwright/test'
import {
  useE2E, page, state, api, NAME, STAMP, visit, settle, field, button, modal,
  expectSnackbar, createProject, selectByLabel, onCleanup
} from './helpers.mjs'

useE2E()

const phasesOf = async (id, entity) => api('GET', `${entity}?_where[project]=${id}&_limit=-1`)

async function duplicate (id, { serie } = {}) {
  await visit(`/projecte/${id}`)
  await page.getByRole('button', { name: 'Més accions' }).click()
  await page.getByRole('menuitem', { name: /Duplicar projecte/ }).click()
  const box = modal('Duplicar projecte')
  await expect(box).toBeVisible()
  if (serie !== undefined) await field('Sèrie', box).locator('select').selectOption({ label: serie })
  await button('Duplica', box).click()
  await button('Confirmar duplicat').click()
  await expectSnackbar('Guardat')
  await expect(page).not.toHaveURL(new RegExp(`/projecte/${id}(\\D|$)`), { timeout: 20_000 })
  await settle()
  return Number(page.url().match(/\/projecte\/(\d+)/)[1])
}

test('duplicate a project with its phases and lines', async () => {
  state.sourceId = await createProject(`${NAME} origen`, {
    incomes: [{ concept: 'Ingrés e2e', quantity: 10, price: 50 }],
    expenses: [{ concept: 'Despesa e2e', quantity: 2, price: 30 }]
  })
  const copyId = await duplicate(state.sourceId)
  expect(copyId).not.toBe(state.sourceId)

  const copy = await api('GET', `projects/${copyId}`)
  expect(copy.name).toBe(`${NAME} origen (còpia)`)
  for (const entity of ['project-original-phases', 'project-phases']) {
    const phases = await phasesOf(copyId, entity)
    expect(phases.map(p => p.name)).toEqual([`${NAME} origen fase`])
    expect(phases[0].incomes.map(l => [l.concept, Number(l.total_amount)])).toEqual([['Ingrés e2e', 500]])
    expect(phases[0].expenses.map(l => [l.concept, Number(l.total_amount)])).toEqual([['Despesa e2e', 60]])
  }
  // the source keeps its own lines
  const source = await phasesOf(state.sourceId, 'project-phases')
  expect(source[0].incomes).toHaveLength(1)
})

// a series of this run: «[S<stamp>-001]»
const SERIE = `S${STAMP.slice(-8)}`
const code = n => `[${SERIE}-${String(n).padStart(3, '0')}]`
// with the basic data the form asks for, so it can be saved from Dades
const newProject = async (title, serie) => {
  const [states, scopes] = await Promise.all([api('GET', 'project-states?_limit=-1'), api('GET', 'project-scopes?_limit=-1')])
  const year = new Date().getFullYear()
  return api('POST', 'projects', {
    data: {
      name: title,
      title,
      project_serie: serie,
      project_state: states[0].id,
      project_scope: scopes[0].id,
      leader: state.me.id,
      date_start: `${year}-01-01`,
      date_end: `${year}-12-31`
    }
  })
}

test('a series numbers the new projects: «[2026-001] Nom»', async () => {
  state.serie = await api('POST', 'project-series', { data: { name: SERIE, prefix: '[', suffix: ']', leading_zeros: 3, last_number: 0, active: true } })
  onCleanup(() => api('PUT', `project-series/${state.serie.id}`, { data: { active: false } }))

  await visit('/projecte/0')
  await selectByLabel('Sèrie', SERIE)
  await expect(page.locator('[data-test=serie-code]')).toHaveText(code(1))
  await field('Codi').locator('input').fill(`${NAME} numerat`)
  await selectByLabel('Estat', 'Actiu')
  await field('Àmbit').locator('select').selectOption({ index: 0 })
  await button('Continuar').click()
  await expect(page).toHaveURL(/\/projecte\/[1-9]\d*/, { timeout: 20_000 })
  await expectSnackbar('Guardat')
  state.numberedId = Number(page.url().match(/\/projecte\/(\d+)/)[1])
  const project = await api('GET', `projects/${state.numberedId}`)
  expect(project).toMatchObject({ name: `${code(1)} ${NAME} numerat`, title: `${NAME} numerat`, serie_number: 1 })
  expect(project.project_serie?.id).toBe(state.serie.id)

})

test('editing the text of a numbered project keeps its code', async () => {
  test.skip(!state.serie, 'needs the series')
  const project = await newProject(`${NAME} per editar`, state.serie.id)
  expect(project.name).toBe(`${code(2)} ${NAME} per editar`)
  await visit(`/projecte/${project.id}?tab=dades`)
  await expect(page.locator('[data-test=serie-code]')).toHaveText(code(2))
  await expect(field('Codi').locator('input')).toHaveValue(`${NAME} per editar`)
  await field('Codi').locator('input').fill(`${NAME} reanomenat`)
  const saved = page.waitForResponse(r => r.request().method() === 'PUT' && /\/projects\/[^/?]+(\?|$)/.test(r.url()))
  await button('Guardar').click()
  await saved
  await expectSnackbar('Guardat')
  expect((await api('GET', `projects/${project.id}`)).name).toBe(`${code(2)} ${NAME} reanomenat`)
  // out of the series from Dades: the text is the name
  await visit(`/projecte/${project.id}?tab=dades`)
  await selectByLabel('Sèrie', 'Sense sèrie')
  await expect(field('Codi').locator('input')).toHaveValue(`${NAME} reanomenat`)
  const savedAgain = page.waitForResponse(r => r.request().method() === 'PUT' && /\/projects\/[^/?]+(\?|$)/.test(r.url()))
  await button('Guardar').click()
  await savedAgain
  const plain = await api('GET', `projects/${project.id}`)
  expect(plain.name).toBe(`${NAME} reanomenat`)
  expect(plain.project_serie).toBeFalsy()
  // it was the last one: 002 is free again
})

test('the last project sent to the trash gives its number back; one in the middle leaves a gap', async () => {
  test.skip(!state.serie, 'needs the series')
  const second = await newProject(`${NAME} segon`, state.serie.id)
  const third = await newProject(`${NAME} tercer`, state.serie.id)
  expect([second.name, third.name]).toEqual([`${code(2)} ${NAME} segon`, `${code(3)} ${NAME} tercer`])
  // the last one: its number is taken again
  await api('PUT', `projects/${third.id}`, { data: { published_at: null } })
  state.fourth = await newProject(`${NAME} quart`, state.serie.id)
  expect(state.fourth.name).toBe(`${code(3)} ${NAME} quart`)
  // one in the middle: a gap
  await api('PUT', `projects/${second.id}`, { data: { published_at: null } })
  expect((await newProject(`${NAME} cinquè`, state.serie.id)).name).toBe(`${code(4)} ${NAME} cinquè`)
})

test('the copy of a project asks for its series', async () => {
  test.skip(!state.serie || !state.sourceId, 'needs the series and the source project')
  // a project without series copied into the series: its name with the next number
  const intoSerie = await duplicate(state.sourceId, { serie: SERIE })
  const copy = await api('GET', `projects/${intoSerie}`)
  expect(copy.name).toBe(`${code(5)} ${NAME} origen`)
  expect((await phasesOf(intoSerie, 'project-phases'))[0].incomes).toHaveLength(1)
  // a numbered project copied: the series is offered by default
  const sameSerie = await duplicate(intoSerie)
  expect((await api('GET', `projects/${sameSerie}`)).name).toBe(`${code(6)} ${NAME} origen`)
  // and out of it: its text and «(còpia)»
  const noSerie = await duplicate(state.fourth.id, { serie: 'Sense sèrie' })
  const plain = await api('GET', `projects/${noSerie}`)
  expect(plain.name).toBe(`${NAME} quart (còpia)`)
  expect(plain.project_serie).toBeFalsy()
})
