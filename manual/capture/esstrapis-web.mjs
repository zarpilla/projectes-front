// Screenshots of the whole app for the public website (esstrapis-web/captures), on the
// anonymized copy (projectes_v5_manual, API 1338 / front 8081, see the manual skill).
//
//   node esstrapis-web.mjs [../../../esstrapis-web/captures] [name-filter]
//
// Logs in once as MANUAL_USER and shows the app as the fictional Laia Serra (user 26): the
// /users/me answer is rewritten in the browser, nothing changes in the database.
// The browser's clock is moved to 2026-06-17, where the demo data is complete
// (except Previsió facturació, which needs the real date).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import { loadEnv, start, login, settle } from './helpers.mjs'

loadEnv()
const here = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.resolve(process.argv[2] || path.join(here, '../../../esstrapis-web/captures'))
const only = process.argv[3] ? new RegExp(process.argv[3]) : null
const TODAY = '2026-06-17'
const LAIA = { id: 26, documentId: '02afea46-c33b-11f1-9f67-141333c3db7f', username: 'Laia Serra', fullname: 'Laia Serra', email: 'persona26@exemple.coop' }
const PROJECT = 555 // Pla de finances ètiques Pobla de Proves
const CONTACT = 70 // Ajuntament de Bellmodel
const EMITTED = 888 // 2026-033
const RECEIVED = 2507 // 2026-141
const QUOTE = 18 // 2026-002

const desktop = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 }
const mobile = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }

const projectTab = tab => async page => {
  await page.goto(`#/project/${PROJECT}`)
  await page.getByText('Pla de finances ètiques Pobla de Proves').first().waitFor()
  await settle(page)
  if (tab) await page.locator('.tabs a, [role=tab]', { hasText: new RegExp(`^\\s*${tab}\\s*$`) }).first().click()
}
const go = (route, waitText) => async page => {
  await page.goto(route)
  if (waitText) await page.getByText(waitText).first().waitFor({ timeout: 30_000 })
}
const click = text => page => page.getByRole('button', { name: text }).first().click()
const clickText = text => page => page.getByText(text, { exact: true }).first().click()

const shots = [
  ['01-inici-sessio', { loggedOut: true }, go('#/')],
  ['02-projectes', {}, go('#/projectes', 'projectes ·')],
  ['03-projectes-mare', {}, go('#/mother-projects', 'Projectes Mare')],
  ['04-projecte-resum', {}, projectTab()],
  ['05-projecte-dades', {}, projectTab('Dades')],
  ['06-projecte-pressupost-fases', {}, projectTab('Pressupost i fases')],
  ['07-projecte-periodificacio', {}, projectTab('Periodificació')],
  ['08-projecte-cobraments-pagaments', {}, projectTab('Cobraments i pagaments')],
  ['09-projecte-planificacio', {}, projectTab('Planificació')],
  ['10-projecte-tasques', {}, projectTab('Tasques')],
  ['11-projecte-nou', {}, async page => { await go('#/projectes', 'projectes ·')(page); await settle(page); await click('Nou projecte')(page) }],
  ['12-contactes', {}, go('#/contacts', 'Contactes')],
  ['13-contacte', {}, go(`#/contact/${CONTACT}`, 'Ajuntament de Bellmodel')],
  ['14-hores-calendari', {}, go('#/dedicacio', 'Hores dedicades')],
  ['15-hores-taula', {}, async page => { await go('#/dedicacio', 'Hores dedicades')(page); await settle(page); await clickText('Taula')(page) }],
  ['16-hores-afegir', {}, async page => { await go('#/dedicacio', 'Hores dedicades')(page); await settle(page); await click('Afegeix hores')(page) }],
  ['17-registre-jornades', {}, go('#/registre-jornades', 'Registre de jornades')],
  ['18-persones', {}, go('#/working-day', 'Persones')],
  ['19-tasques-tauler', {}, go('#/tasks', 'tasques obertes')],
  ['20-tasques-llista', {}, async page => { await go('#/tasks', 'tasques obertes')(page); await settle(page); await clickText('Llista')(page) }],
  ['21-tasques-calendari', {}, async page => { await go('#/tasks', 'tasques obertes')(page); await settle(page); await clickText('Calendari')(page) }],
  ['22-ingressos', {}, go('#/emitted-invoices', 'Ingressos')],
  ['23-factura-emesa', {}, go(`#/document/${EMITTED}/emitted-invoices`, '2026-033')],
  ['24-despeses', {}, go('#/received-invoices', 'Despeses')],
  ['25-factura-rebuda', {}, go(`#/document/${RECEIVED}/received-invoices`, '2026-141')],
  ['26-pressupostos', {}, go('#/quotes', 'Pressupostos')],
  ['27-pressupost', {}, go(`#/quote/${QUOTE}`, '2026-002')],
  ['28-bestretes', {}, go('#/salary', 'Bestretes')],
  ['29-iva', {}, go('#/vat', 'IVA')],
  ['30-tresoreria', {}, go('#/tresoreria', 'Tresoreria')],
  ['31-tresoreria-nova-operacio', {}, async page => { await go('#/tresoreria', 'Tresoreria')(page); await settle(page); await click('Nova operació')(page) }],
  ['40-informe-panell-projectes', {}, go('#/stats-projectes')],
  ['41-informe-dedicacio', {}, go('#/stats-dedicacio')],
  ['42-informe-dedicacio-real', {}, go('#/stats-real-gantt')],
  ['43-informe-previsio-dedicacio', {}, go('#/stats-previsio-gantt')],
  ['44-informe-ingressos-despeses', {}, go('#/stats-economic-detail')],
  ['45-informe-preu-hora', {}, go('#/price-hour')],
  ['46-informe-previsio-economica', {}, go('#/forecast')],
  ['47-informe-previsio-facturacio', { realDate: true }, go('#/invoicing-forecast')],
  ['48-informe-estrategies', {}, go('#/stats-estrategies')],
  ['49-informe-intercooperacio', {}, go('#/stats-intercoop')],
  ['50-informe-saldo-hores', {}, go('#/dedicacio-saldo')],
  ['51-informe-hores-anuals', {}, go('#/dedicacio-summary')],
  ['52-justificacions', {}, go('#/justifications')],
  ['53-subvencions', {}, go('#/grants')],
  ['60-admin-configuracio', {}, go('#/administracio/me', 'Configuració general')],
  ['61-admin-usuaries', {}, go('#/administracio/users', 'Usuàries')],
  ['62-admin-usuaria', {}, go('#/administracio/users/26', 'Jornada i cost/hora')],
  ['63-admin-verifactu-face', {}, go('#/administracio/verifactu', 'Verifactu')],
  ['64-admin-taules-auxiliars', {}, go('#/administracio/project-scope', 'Taules auxiliars')],
  ['65-perfil', {}, go('#/profile', 'Dades personals')],
  ['66-novetats', {}, go('#/changelog', 'Novetats')],
  // the month grid and the start of the list of entries under it
  ['70-mobil-hores', { mobile: true }, async page => {
    await go('#/dedicacio', 'Hores dedicades')(page)
    await settle(page)
    await page.locator('.custom-calendar').evaluate(el => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 72))
  }],
  ['71-mobil-registre-jornades', { mobile: true }, go('#/registre-jornades', 'Registre de jornades')],
  ['72-mobil-tasques', { mobile: true }, go('#/tasks', 'tasques obertes')],
  ['73-mobil-projectes', { mobile: true }, go('#/projectes', 'projectes ·')],
  ['74-mobil-projecte', { mobile: true }, projectTab()],
  ['80-fosc-projectes', { dark: true }, go('#/projectes', 'projectes ·')],
  ['81-fosc-projecte-resum', { dark: true }, projectTab()],
  ['82-fosc-tresoreria', { dark: true }, go('#/tresoreria', 'Tresoreria')],
  ['83-fosc-tasques', { dark: true }, go('#/tasks', 'tasques obertes')],
  ['84-fosc-hores', { dark: true }, go('#/dedicacio', 'Hores dedicades')]
]

// the app as Laia Serra: same permissions as MANUAL_USER, her name and id
const asLaia = page => page.route(/\/api\/users\/me(\?|$)/, async route => {
  const response = await route.fetch()
  const body = await response.json()
  await route.fulfill({ response, json: { ...body, ...LAIA } })
})

const browser = await chromium.launch()
const failed = []
fs.mkdirSync(outDir, { recursive: true })

// log in once and reuse the session: Strapi rate-limits /auth/local
const loginContext = await browser.newContext({ ...desktop, baseURL: process.env.MANUAL_BASE_URL })
const loginPage = await loginContext.newPage()
await start(loginPage, 'esstrapis-web')
await asLaia(loginPage)
await login(loginPage)
const session = await loginContext.storageState()
await loginContext.close()

for (const [name, opts, act] of shots) {
  if (only && !only.test(name)) continue
  const context = await browser.newContext({
    ...(opts.mobile ? mobile : desktop),
    storageState: opts.loggedOut ? undefined : session,
    baseURL: process.env.MANUAL_BASE_URL,
    locale: 'ca-ES',
    timezoneId: 'Europe/Madrid',
    colorScheme: opts.dark ? 'dark' : 'light'
  })
  await context.addInitScript(theme => { try { localStorage.setItem('theme', theme) } catch (e) {} }, opts.dark ? 'dark' : 'light')
  const page = await context.newPage()
  try {
    await start(page, 'esstrapis-web', opts.realDate ? {} : { today: TODAY })
    await asLaia(page)
    await act(page)
    await settle(page, 1200)
    await page.mouse.move(0, 0)
    await page.evaluate(() => document.querySelectorAll('img').forEach(i => {
      if (i.complete && !i.naturalWidth) i.style.visibility = 'hidden'
    }))
    await page.evaluate(() => document.querySelectorAll('.notices .snackbar, .notices .toast').forEach(e => e.remove()))
    await page.screenshot({ path: path.join(outDir, `${name}.png`), animations: 'disabled' })
    console.log('ok', name)
  } catch (e) {
    failed.push(name)
    await page.screenshot({ path: path.join(outDir, `${name}-FAILED.png`) }).catch(() => {})
    console.log('FAILED', name, e.message.split('\n')[0])
  }
  await context.close()
}
await browser.close()
if (failed.length) { console.log('failed:', failed.join(' ')); process.exit(1) }
