// 10. Tasques — board, list, calendar, the task detail (description, checklist,
// comments, hours, recurrence), templates, the e-mail option and the Gantt.
// Data: anonymized copy of resilience (projectes_v5_manual). The manual user (15, Quim
// Puig, projects + hours + admin) only has finished tasks without dates there, so the
// script creates its own example tasks through the API (dates relative to today) and
// deletes everything it created at the end (also at the start, from
// results/10-tasques-created.json, if a previous run stopped half-way):
//   tasks «Preparar la memòria final», «Enviar la factura del segon pagament»,
//   «Revisar les hores del mes», «Convocar la reunió de seguiment», «Dissenyar els
//   materials», «Publicar la difusió»; one hours entry and one comment on the first;
//   the template «Inici de projecte» and the tasks it creates in project 735.
// Project 468 is the only active one with Funcions (Disseny 7, F1 Coordinació 35,
// F2 Assessorament 36); 735 is another active project. Users: 15 Quim Puig, 8 Clara
// Puig, 3 Pau Puig.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from '@playwright/test'
import { start, login, settle, shot } from '../helpers.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const createdFile = path.resolve(here, '../results/10-tasques-created.json')

const P_FUNCTIONS = 468
const P_OTHER = 735
const ME = 15
const CLARA = 8
const PAU = 3

const day = n => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}
const endOfMonth = () => {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 12).toISOString().slice(0, 10)
}

// REST call as the logged-in user, through the page (its JWT, its API url)
const api = (page, method, route, body) => page.evaluate(async ({ method, route, body }) => {
  const res = await fetch(window.APP_CONFIG.VUE_APP_API_URL + '/api/' + route, {
    method,
    headers: { Authorization: 'Bearer ' + localStorage.getItem('jwt'), 'Content-Type': 'application/json' },
    body: body ? JSON.stringify({ data: body }) : undefined
  })
  if (!res.ok) throw new Error(`${method} ${route}: ${res.status} ${await res.text()}`)
  return res.status === 204 ? null : (await res.json()).data
}, { method, route, body })

async function cleanUp (page, created) {
  for (const id of created.comments || []) await api(page, 'DELETE', `task-comments/${id}`).catch(() => {})
  for (const id of created.activities || []) await api(page, 'DELETE', `activities/${id}`).catch(() => {})
  for (const id of created.tasks || []) await api(page, 'DELETE', `tasks/${id}`).catch(() => {})
  for (const id of created.templates || []) await api(page, 'DELETE', `task-templates/${id}`).catch(() => {})
}

test('10-tasques', async ({ page }) => {
  test.setTimeout(240_000)
  await start(page, '10-tasques')
  await login(page)

  if (fs.existsSync(createdFile)) await cleanUp(page, JSON.parse(fs.readFileSync(createdFile, 'utf8')))
  const created = { tasks: [], activities: [], comments: [], templates: [] }
  const save = () => {
    fs.mkdirSync(path.dirname(createdFile), { recursive: true })
    fs.writeFileSync(createdFile, JSON.stringify(created))
  }
  // a template of an earlier run with the same name
  for (const t of await api(page, 'GET', 'task-templates?_limit=-1')) {
    if (t.name === 'Inici de projecte') await api(page, 'DELETE', `task-templates/${t.id}`)
  }

  const add = async task => {
    const t = await api(page, 'POST', 'tasks', { archived: false, created: ME, ...task })
    created.tasks.push(t.id)
    save()
    return t
  }
  const memoria = await add({
    name: 'Preparar la memòria final',
    project: P_FUNCTIONS, activity_type: 35, priority: 'high', task_state: 2,
    users_permissions_users: [ME, CLARA], start_date: day(-5), due_date: day(3), estimated_hours: 6,
    description: "Memòria per a l'entitat finançadora:\n- **Resum** de les sessions fetes\n- Valoració de les persones participants\n- Annex amb les fotos\n\nModel a seguir: https://exemple.coop/model-memoria",
    checklist: [
      { name: 'Recollir les valoracions', done: true, user: CLARA },
      { name: 'Redactar el resum', done: true, user: ME },
      { name: 'Revisar el pressupost executat', done: false, user: ME, due_date: day(2) }
    ]
  })
  await add({
    name: 'Enviar la factura del segon pagament', project: P_FUNCTIONS, activity_type: 35,
    priority: 'high', task_state: 1, users_permissions_users: [ME], due_date: day(-2)
  })
  await add({
    name: 'Revisar les hores del mes', priority: 'normal', task_state: 1, users_permissions_users: [ME],
    due_date: endOfMonth(), recurrence: 'monthly', estimated_hours: 1
  })
  await add({
    name: 'Convocar la reunió de seguiment', project: P_OTHER, priority: 'normal', task_state: 1,
    users_permissions_users: [ME, PAU], due_date: day(6)
  })
  await add({
    name: 'Dissenyar els materials', project: P_FUNCTIONS, activity_type: 7, priority: 'low', task_state: 1,
    users_permissions_users: [ME], start_date: day(7), due_date: day(20), estimated_hours: 10,
    checklist: [{ name: 'Cartell', done: false }, { name: 'Fulletó', done: false }]
  })
  await add({
    name: 'Publicar la difusió', project: P_OTHER, priority: 'normal', task_state: 3,
    users_permissions_users: [ME], due_date: day(-10)
  })
  const hours = await api(page, 'POST', 'activities', {
    date: day(-1), hours: 2.5, project: P_FUNCTIONS, activity_type: 35, users_permissions_user: ME,
    task: memoria.id, description: 'Preparar la memòria final'
  })
  created.activities.push(hours.id)
  save()

  // ---------- Tauler
  await page.evaluate(() => localStorage.setItem('tasksMode', 'board'))
  await page.goto('/tasques')
  await page.getByText('tasques obertes').first().waitFor()
  await settle(page, 1200)
  await shot(page, 'tauler')

  // ---------- Llista
  await page.getByRole('button', { name: 'Llista', exact: true }).click()
  await settle(page)
  await shot(page, 'llista')

  const rowOf = name => page.locator('tr', { has: page.locator('.tl-title', { hasText: name }) })
  await rowOf('Convocar la reunió de seguiment').locator('.tl-ck input').check()
  await rowOf('Dissenyar els materials').locator('.tl-ck input').check()
  await settle(page, 300)
  await shot(page, 'llista-seleccio', { clip: { x: 248, y: 0, width: 1192, height: 620 } })
  await page.getByRole('button', { name: 'Desselecciona' }).click()

  // ---------- Calendari
  await page.getByRole('button', { name: 'Calendari', exact: true }).click()
  await settle(page)
  await shot(page, 'calendari')

  // ---------- the task detail
  await page.getByRole('button', { name: 'Llista', exact: true }).click()
  await settle(page)
  await rowOf('Preparar la memòria final').locator('.tl-title').click()
  const modal = page.locator('.task-modal')
  await modal.getByText('Comentaris').waitFor()
  await settle(page, 600)
  await shot(page, 'fitxa')

  // a comment with a mention: the list of people while typing «@Cla»
  const composer = modal.getByLabel('Nou comentari')
  await composer.scrollIntoViewIfNeeded()
  await composer.click()
  await composer.pressSequentially('He penjat el resum. @Cla')
  await modal.locator('.tm-mentions').waitFor()
  await shot(page, 'mencio')
  await composer.press('Enter')
  await composer.pressSequentially('pots revisar les valoracions?')
  await modal.getByRole('button', { name: 'Comenta' }).click()
  await modal.locator('.tm-comments li').first().waitFor()
  const comments = await api(page, 'GET', `task-comments?_where[task.id_eq]=${memoria.id}`)
  created.comments.push(...comments.map(c => c.id))
  save()
  await settle(page, 400)
  await modal.locator('.tm-comments').scrollIntoViewIfNeeded()
  await shot(page, 'comentari')

  // log hours from the task
  await modal.getByRole('button', { name: 'Imputa hores' }).click()
  await page.getByText('Entrada hores').waitFor()
  await settle(page, 600)
  await shot(page, 'imputa-hores')
  await page.locator('.modal.is-active').last().getByRole('button', { name: 'Cancel·la' }).click()
  await modal.getByRole('button', { name: 'Cancel·la' }).click()
  await settle(page, 300)

  // a recurring task: its side column
  await rowOf('Revisar les hores del mes').locator('.tl-title').click()
  await modal.locator('#tm-recurrence').waitFor()
  await settle(page, 500)
  const side = await modal.locator('.tm-side').boundingBox()
  await shot(page, 'recurrencia', { clip: { x: side.x - 8, y: side.y - 8, width: side.width + 16, height: side.height + 16 } })
  await modal.getByRole('button', { name: 'Cancel·la' }).click()
  await settle(page, 300)

  // ---------- Plantilles: save project 468's open tasks, apply them to 735
  const projectFilter = page.locator('.filter-auto-label', { hasText: 'Projecte' }).locator('input')
  await projectFilter.fill('Formació en participació ciutadana La Vall')
  await page.locator('.filter-auto-label', { hasText: 'Projecte' }).locator('.dropdown-item').first().click()
  await settle(page)
  await page.getByRole('button', { name: 'Plantilles' }).click()
  await settle(page, 300)
  await shot(page, 'plantilles-menu', { clip: { x: 248, y: 0, width: 1192, height: 520 } })
  await page.locator('.dropdown-item', { hasText: 'Desa aquestes' }).click()
  await page.locator('.dialog input').fill('Inici de projecte')
  await settle(page, 300)
  await shot(page, 'plantilla-desa')
  await page.locator('.dialog').getByRole('button', { name: 'Desa' }).click()
  // close the «Plantilla … desada» notice (it would be in the next pictures)
  await page.locator('.snackbar', { hasText: 'desada' }).getByRole('button').click()
  await page.locator('.snackbar').waitFor({ state: 'hidden' })
  await settle(page, 600)
  const template = (await api(page, 'GET', 'task-templates?_limit=-1')).find(t => t.name === 'Inici de projecte')
  created.templates.push(template.id)
  save()

  await projectFilter.fill('Pla de transició energètica Prats')
  await page.locator('.filter-auto-label', { hasText: 'Projecte' }).locator('.dropdown-item').first().click()
  await settle(page)
  await page.getByRole('button', { name: 'Plantilles' }).click()
  await page.locator('.dropdown-item', { hasText: 'Aplica una plantilla' }).click()
  await page.locator('#tt-template').waitFor()
  await page.locator('#tt-template').selectOption({ label: 'Inici de projecte (3)' })
  const [y, m, d] = day(14).split('-')
  const fromField = page.locator('.tt-modal .date-field input')
  await fromField.fill(`${d}/${m}/${y}`)
  await fromField.press('Tab')
  await settle(page, 400)
  await shot(page, 'plantilla-aplica')
  const before = new Set((await api(page, 'GET', `tasks?_limit=-1&_where[project_eq]=${P_OTHER}`)).map(t => t.id))
  await page.locator('.tt-modal').getByRole('button', { name: /^Crea/ }).click()
  await page.getByText('tasques creades').waitFor()
  const after = await api(page, 'GET', `tasks?_limit=-1&_where[project_eq]=${P_OTHER}`)
  created.tasks.push(...after.filter(t => !before.has(t.id)).map(t => t.id))
  save()
  await page.locator('.snackbar', { hasText: 'tasques creades' }).getByRole('button').click()
  await page.locator('.snackbar').waitFor({ state: 'hidden' })
  await settle(page, 600)
  await shot(page, 'plantilla-resultat')

  // ---------- Configuració general · Avisos de tasques per correu
  await page.goto('/administracio/configuracio')
  await page.locator('#cfg-opcions').waitFor()
  await settle(page, 600)
  await page.locator('#cfg-opcions').scrollIntoViewIfNeeded()
  const options = await page.locator('#cfg-opcions').boundingBox()
  await shot(page, 'avisos-correu', { clip: { x: options.x - 8, y: options.y - 8, width: options.width + 16, height: options.height + 16 } })

  // ---------- Gantt: the project's tasks as bars
  await page.goto(`/projecte/${P_FUNCTIONS}`)
  await settle(page, 1500)
  await page.locator('.tabs a', { hasText: 'Planificació' }).first().click()
  await page.locator('.gantt_task_line').first().waitFor()
  await settle(page, 1200)
  await page.evaluate(() => { const v = document.querySelector('.gantt_ver_scroll'); if (v) v.scrollTop = v.scrollHeight })
  await page.locator('.gantt_row', { hasText: 'Preparar la memòria final' }).first().click()
  await settle(page, 800)
  await shot(page, 'gantt')

  await cleanUp(page, created)
  fs.rmSync(createdFile, { force: true })
})
