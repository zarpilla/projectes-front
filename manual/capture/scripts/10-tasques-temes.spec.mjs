// 10. Tasques — «Temes de tasca» (issues/461): the auxiliary table, the board by
// topic and the list grouped by topic. Pictures 16–18 of the chapter, added without
// rerunning 10-tasques.spec.mjs.
// Data: anonymized copy of resilience (projectes_v5_manual), which has no topics.
// The script creates three topics and five tasks of the manual user (15, Quim Puig)
// through the API and deletes them at the end (also at the start, from
// results/10-tasques-temes-created.json, if a previous run stopped half-way).
// Projects 468 and 735 are active ones (see 10-tasques.spec.mjs).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from '@playwright/test'
import { start, login, settle, shot } from '../helpers.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const createdFile = path.resolve(here, '../results/10-tasques-temes-created.json')

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
  for (const id of created.tasks || []) await api(page, 'DELETE', `tasks/${id}`).catch(() => {})
  for (const id of created.topics || []) await api(page, 'DELETE', `task-topics/${id}`).catch(() => {})
}

test('10-tasques-temes', async ({ page }) => {
  test.setTimeout(120_000)
  await start(page, '10-tasques', { firstShot: 16 })
  await login(page)

  if (fs.existsSync(createdFile)) await cleanUp(page, JSON.parse(fs.readFileSync(createdFile, 'utf8')))
  const created = { tasks: [], topics: [] }
  const save = () => {
    fs.mkdirSync(path.dirname(createdFile), { recursive: true })
    fs.writeFileSync(createdFile, JSON.stringify(created))
  }

  const topic = async (name, order) => {
    const t = await api(page, 'POST', 'task-topics', { name, order })
    created.topics.push(t.documentId)
    save()
    return t.id
  }
  const coordinacio = await topic('Coordinació', 1)
  const comunicacio = await topic('Comunicació', 2)
  const administracio = await topic('Administració', 3)

  const add = async task => {
    const t = await api(page, 'POST', 'tasks', { archived: false, created: ME, priority: 'normal', ...task })
    created.tasks.push(t.id)
    save()
  }
  await add({
    name: 'Preparar la memòria final', project: P_FUNCTIONS, task_topic: coordinacio, task_state: 2,
    priority: 'high', users_permissions_users: [ME, CLARA], due_date: day(3)
  })
  await add({
    name: 'Convocar la reunió de seguiment', project: P_OTHER, task_topic: coordinacio, task_state: 1,
    users_permissions_users: [ME, PAU], due_date: day(6)
  })
  await add({
    name: 'Publicar la difusió', project: P_OTHER, task_topic: comunicacio, task_state: 1,
    users_permissions_users: [ME], due_date: day(4)
  })
  await add({
    name: 'Enviar la factura del segon pagament', project: P_FUNCTIONS, task_topic: administracio,
    task_state: 1, priority: 'high', users_permissions_users: [ME], due_date: day(-2)
  })
  await add({
    name: 'Revisar les hores del mes', task_state: 2, users_permissions_users: [ME], due_date: day(10)
  })

  // ---------- Taules auxiliars › Temes de tasca
  await page.goto('/administracio/temes-tasca')
  await page.getByText('Comunicació').first().waitFor()
  await settle(page)
  await shot(page, 'temes-taula', { clip: { x: 248, y: 0, width: 1192, height: 560 } })

  // ---------- Tauler per tema
  await page.evaluate(() => {
    localStorage.setItem('tasksMode', 'board')
    localStorage.setItem('tasksBoardView', 'topic')
  })
  await page.goto('/tasques')
  await page.getByText('tasques obertes').first().waitFor()
  await settle(page, 1200)
  await shot(page, 'tauler-temes')

  // ---------- Llista agrupada per tema
  await page.getByRole('button', { name: 'Llista', exact: true }).click()
  await settle(page)
  await page.locator('label:has-text("Agrupa per") select').selectOption('topic')
  await settle(page)
  await shot(page, 'llista-temes')

  await page.evaluate(() => localStorage.setItem('tasksBoardView', 'state'))
  await cleanUp(page, created)
  fs.rmSync(createdFile, { force: true })
})
