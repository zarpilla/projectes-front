// Users and permissions, login, the session, contacts, tasks and the admin screens.
//
// Creates a throwaway user ("e2e-<stamp>", hours permission only) through
// #/admin/users; users can't be deleted from the app, so they stay in the e2e copy.

import { test, expect } from '@playwright/test'
import {
  useE2E, page, state, api, API_URL, STAMP, NAME, visit, settle, field, button, modal,
  expectSnackbar, confirmDialog, pickAutocomplete, openSession, openAnonymous
} from './helpers.mjs'

useE2E()

const USER = { username: `e2e-${STAMP}`, email: `e2e-${STAMP}@exemple.coop`, password: `E2e-${STAMP}!` }
const idOf = relation => relation?.id ?? relation

// operations guarded by the isAdmin policy
const ADMIN_ONLY = [
  ['PUT', 'me', { data: { invoice_footer: 'x' } }],
  ['GET', 'entity-metadata/admin-entities'],
  ['POST', 'project-states', { data: { name: `${NAME} estat` } }]
]

async function userNamed (username) {
  const [user] = await api('GET', `users?_where[username]=${encodeURIComponent(username)}&_limit=1`)
  return user
}

// calls the API with another user's token
async function apiAs (p, method, route, body) {
  const token = await p.evaluate(() => localStorage.getItem('jwt'))
  return api(method, route, body, { raw: true, token })
}

test('admin: create a user with only the hours permission', async () => {
  await visit('/admin/users/new')
  await field("Nom d'usuari").locator('input').fill(USER.username)
  await field('Email').locator('input').fill(USER.email)
  await field('Confirmat').locator('.switch').click()
  await field('Rol').locator('select').selectOption({ label: 'Authenticated' })
  await field("Permisos d'aplicació").locator('.b-checkbox, .checkbox', { hasText: /^\s*Hores\s*$/ }).click()
  await button('Guardar').click()
  // new users get their password in a prompt
  const prompt = page.locator('.dialog.modal.is-active')
  await prompt.locator('input[type=password]').fill(USER.password)
  await prompt.locator('.modal-card-foot .button.is-primary').click()
  await expect(page.locator('.toast', { hasText: 'Usuari creat correctament' })).toBeVisible()

  const user = await userNamed(USER.username)
  expect([user.email, user.confirmed, user.blocked]).toEqual([USER.email, true, false])
  expect(user.permissions.map(p => p.permission)).toEqual(['hours'])
  state.user = user
})

// issues/027: new users get the Authenticated role by default
test('a new user can be created without picking a role', async () => {
  await visit('/admin/users/new')
  await field("Nom d'usuari").locator('input').fill(`${USER.username}-r`)
  await field('Email').locator('input').fill(`r-${USER.email}`)
  await button('Guardar').click()
  const prompt = page.locator('.dialog.modal.is-active')
  await prompt.locator('input[type=password]').fill(USER.password)
  await prompt.locator('.modal-card-foot .button.is-primary').click()
  await settle()
  expect(await userNamed(`${USER.username}-r`)).toBeTruthy()
})

test('an hours-only user sees only the hours screens', async ({ browser }) => {
  test.skip(!state.user, 'needs the user')
  const other = await openSession(browser, USER.email, USER.password)
  try {
    const aside = other.locator('aside')
    await expect(aside.locator('a[href="#/dedicacio"]')).toBeVisible()
    await expect(aside.locator('a[href="#/registre-jornades"]')).toBeVisible()
    for (const hidden of ['#/projectes', '#/contacts', '#/emitted-invoices', '#/tresoreria', '#/admin/users']) {
      await expect(aside.locator(`a[href="${hidden}"]`), hidden).toHaveCount(0)
    }
    const headers = (await aside.locator('.menu-label').allTextContents()).map(t => t.trim().toUpperCase())
    expect(headers).not.toContain('DINERS')
    expect(headers).not.toContain('ADMINISTRACIÓ')

    // admin screens send them back to the projects list
    await other.goto('#/admin/users')
    await expect(other).toHaveURL(/#\/projectes/)

    // and the backend refuses the admin-only operations
    for (const [method, route, body] of ADMIN_ONLY) {
      expect((await apiAs(other, method, route, body)).status, `${method} ${route}`).toBeGreaterThanOrEqual(400)
    }
    expect(await api('GET', `project-states?_where[name]=${encodeURIComponent(`${NAME} estat`)}`)).toEqual([])
  } finally {
    await other.context().close()
  }
})

// issues/025
test('admin-only operations answer 403 to other users', async ({ browser }) => {
  test.skip(!state.user, 'needs the user')
  const other = await openSession(browser, USER.email, USER.password)
  try {
    for (const [method, route, body] of ADMIN_ONLY) {
      expect((await apiAs(other, method, route, body)).status, `${method} ${route}`).toBe(403)
    }
  } finally {
    await other.context().close()
  }
})

// issues/020: only admins may create or change users
test('users can\'t give themselves more permissions', async ({ browser }) => {
  test.skip(!state.user, 'needs the user')
  const other = await openSession(browser, USER.email, USER.password)
  try {
    const res = await apiAs(other, 'PUT', `users/${state.user.id}`, { permissions: [{ permission: 'hours' }, { permission: 'admin' }] })
    expect(res.status).toBe(403)
    const create = await apiAs(other, 'POST', 'users', { username: `${USER.username}-x`, email: `x-${USER.email}`, password: USER.password, role: 1 })
    expect(create.status).toBe(403)
  } finally {
    await other.context().close()
  }
  const user = await userNamed(USER.username)
  expect(user.permissions.map(p => p.permission)).toEqual(['hours'])
})

test('login errors are explained', async ({ browser }) => {
  const anon = await openAnonymous(browser)
  try {
    await anon.goto('#/')
    await anon.locator('input[type=email]').fill(USER.email)
    await anon.locator('input[type=password]').fill('not-the-password')
    await anon.locator('[type=submit]').first().click()
    await expect(anon.locator('.snackbar', { hasText: 'Correu electrònic o clau de pas incorrectes' })).toBeVisible()
    expect(await anon.evaluate(() => localStorage.getItem('jwt'))).toBeNull()

    // an unconfirmed user is told so and not let in
    const unconfirmed = { username: `e2e-${STAMP}-nc`, email: `e2e-${STAMP}-nc@exemple.coop`, password: USER.password }
    await api('POST', 'users', { ...unconfirmed, confirmed: false, blocked: false, role: idOf(state.me.role) || 1 })
    await anon.locator('input[type=email]').fill(unconfirmed.email)
    await anon.locator('input[type=password]').fill(unconfirmed.password)
    await anon.locator('[type=submit]').first().click()
    await expect(anon.locator('.toast, .snackbar', { hasText: 'no està confirmat' })).toBeVisible()
    expect(await anon.evaluate(() => localStorage.getItem('jwt'))).toBeNull()
  } finally {
    await anon.context().close()
  }
})

// issues/021: the form only sends the email; the backend builds the reset link.
// (Locally the e-mail itself can't be sent; the test checks the request is accepted.)
test('the forgotten password form is accepted', async ({ browser }) => {
  const anon = await openAnonymous(browser)
  try {
    await anon.goto('#/forgotten-password')
    await anon.locator('input[type=email]').fill(USER.email)
    const response = anon.waitForResponse(r => r.url().includes('/api/auth/forgot-password'))
    await anon.locator('[type=submit], button.is-primary').first().click()
    const body = await (await response).json().catch(() => ({}))
    expect(body?.error?.name).not.toBe('ValidationError')
  } finally {
    await anon.context().close()
  }
})

test('an expired access token is refreshed without logging out', async () => {
  const before = await page.evaluate(() => localStorage.getItem('jwt'))
  // a token the backend rejects, as an expired one would be
  await page.evaluate(() => localStorage.setItem('jwt', 'expired.e2e.token'))
  const refresh = page.waitForResponse(r => r.url().includes('/api/auth/refresh'))
  await visit('/contacts')
  expect((await refresh).status()).toBe(200)
  const after = await page.evaluate(() => localStorage.getItem('jwt'))
  expect(after).not.toBe('expired.e2e.token')
  expect(after).not.toBe(before)
  await expect(page).toHaveURL(/#\/contacts/)
  await expect(page.getByText('Nou Contacte').first()).toBeVisible()
})

test('contacts: create, edit and delete', async () => {
  await visit('/contact/0')
  await button('Guardar').click()
  await expectSnackbar('Error. Falten alguns camps obligatòris')

  const name = `${NAME} cooperativa`
  await field('Raó Social').locator('input').fill(name)
  await field('NIF').locator('input').fill(`F${STAMP.slice(-8)}`)
  await field('Adreça').locator('input').fill('Carrer de les Proves, 1')
  await field('CP').locator('input').fill('08001')
  await field('Població').locator('input').fill('Barcelona')
  await button('Guardar').click()
  await expectSnackbar('Guardat')
  await expect(page).toHaveURL(/#\/contact\/[1-9]\d*/)
  const id = Number(page.url().match(/#\/contact\/(\d+)/)[1])
  let contact = await api('GET', `contacts/${id}`)
  expect([contact.name, contact.nif, contact.postcode, contact.city]).toEqual([name, `F${STAMP.slice(-8)}`, '08001', 'Barcelona'])

  await settle()
  await field('Nom comercial').locator('input').fill(`${NAME} coop`)
  await button('Guardar').click()
  await expectSnackbar('Guardat')
  contact = await api('GET', `contacts/${id}`)
  expect(contact.trade_name ?? contact.commercial_name ?? contact.comercial_name).toBe(`${NAME} coop`)

  await visit(`/contact/${id}`)
  await button('Esborrar').click()
  await confirmDialog('Vols esborrar aquest contacte?')
  await expectSnackbar('Esborrat')
  expect((await api('GET', `contacts/${id}`, undefined, { raw: true })).status).toBe(404)
})

test('contacts with invoices can\'t be deleted', async () => {
  const [invoice] = await api('GET', 'emitted-invoices?_where[state]=real&_sort=id:ASC&_limit=1')
  const contactId = idOf(invoice.contact)
  await visit(`/contact/${contactId}`)
  await button('Esborrar').click()
  await confirmDialog('Vols esborrar aquest contacte?')
  await expectSnackbar("Error. El contacte no s'ha pogut esborrar perquè té dades associades")
  expect((await api('GET', `contacts/${contactId}`)).id).toBe(contactId)
})

test('tasks: create, move to another state and archive', async () => {
  const name = `${NAME} tasca`
  const states = await api('GET', 'task-states?_limit=-1&_sort=order:ASC')
  const [first, second] = states
  await visit('/tasks')
  const column = title => page.locator('.task-list-content').filter({ has: page.locator('.task-list-header', { hasText: title }) }).first()
  await column(first.name).locator('.task-list-header button').click()
  const box = page.locator('.modal.is-active').last()
  await field('Nom', box).locator('input').fill(name)
  // the board shows the logged-in person's tasks
  await pickAutocomplete('Persones', state.me.username, state.me.username, box)
  await button("D'acord", box).click()
  await expect(box).toBeHidden()
  let task
  await expect.poll(async () => ([task] = await api('GET', `tasks?_where[name]=${encodeURIComponent(name)}&_limit=1`), task)).toBeTruthy()
  expect(idOf(task.task_state)).toBe(first.id)

  await settle()
  const card = page.locator('.card[draggable="true"]', { hasText: name })
  await expect(card).toBeVisible()
  // HTML5 drag and drop: the board reads the task id from the event's dataTransfer
  const dataTransfer = await page.evaluateHandle(() => new DataTransfer())
  const target = column(second.name).locator('.drop-zone').last()
  await card.dispatchEvent('dragstart', { dataTransfer })
  await target.dispatchEvent('dragenter', { dataTransfer })
  await target.dispatchEvent('dragover', { dataTransfer })
  await target.dispatchEvent('drop', { dataTransfer })
  // (creating the task also says "Tasca guardada": check the stored state instead)
  await expect.poll(async () => {
    ;[task] = await api('GET', `tasks?_where[name]=${encodeURIComponent(name)}&_limit=1`)
    return idOf(task.task_state)
  }).toBe(second.id)
  await settle()

  await card.locator('.content').click()
  const taskBox = page.locator('.modal.is-active').last()
  await expect(taskBox.locator('input').first()).toHaveValue(name)
  await button('Esborra', taskBox).click()
  await modal('Esborrar?').locator('.button.is-danger').click()
  await expectSnackbar('Esborrada')
  ;[task] = await api('GET', `tasks?_where[name]=${encodeURIComponent(name)}&_limit=1`)
  expect(task.archived).toBe(true)
})

// issues/026: every ADMINISTRACIÓ entry names an entity the backend serves
test('every administration screen loads', async () => {
  await visit('/projectes')
  const links = await page.locator('aside a[href^="#/admin/"]').evaluateAll(as => as.map(a => a.getAttribute('href')))
  expect(links.length).toBeGreaterThan(10)
  const broken = []
  for (const href of links) {
    await visit(href.slice(1))
    const error = page.locator('.toast, .snackbar', { hasText: /Error/ })
    if (await error.count()) broken.push(`${href}: ${(await error.first().innerText()).trim()}`)
    await page.locator('.toast').evaluateAll(ts => ts.forEach(t => t.remove()))
  }
  expect(broken).toEqual([])
})

test('admin entities: a new strategy gets its code name', async () => {
  const code = `E2E${STAMP.slice(-6)}`
  await visit('/admin/strategy')
  await page.locator('button', { hasText: /^\s*Crear / }).first().click()
  await expect(page).toHaveURL(/#\/admin\/strategy\/new/)
  await field('Codi').locator('input').fill(code)
  await field('Nom').locator('input').fill(`${NAME} estratègia`)
  await button('Guardar').click()
  // back to the list, which shows it
  await expect(page).toHaveURL(/#\/admin\/strategy$/)
  await expect(page.getByText(`${NAME} estratègia`).first()).toBeVisible()
  const [strategy] = await api('GET', `strategies?_where[code]=${code}&_limit=1`)
  expect(strategy.code_name).toBe(`${code} - ${NAME} estratègia`)
})
