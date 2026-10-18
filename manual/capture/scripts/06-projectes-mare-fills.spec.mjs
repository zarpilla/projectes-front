// 06. Projectes mare i fills — the mother projects list, a mother project (summed figures,
// children, read-only phases, the children's planning) and a child pointing to its mother.
// Data: anonymized copy of resilience (projectes_v5_manual), seen on 17/06/2026. Read-only.
// Mother 840 has three children (11, 20, 386), all closed.
import { test } from '@playwright/test'
import { start, login, settle, shot } from '../helpers.mjs'

const MOTHER = 840
const CHILD = 386

const toTop = (locator, offset = 90) => locator.evaluate((el, offset) => {
  el.scrollIntoView({ block: 'start' })
  window.scrollBy(0, -offset)
}, offset)

test('06-projectes-mare-fills', async ({ page }) => {
  test.setTimeout(300_000)
  await start(page, '06-projectes-mare-fills', { today: '2026-06-17' })
  await login(page)

  await page.goto('#/projectes')
  await settle(page)
  await page.getByRole('button', { name: 'Projectes mare' }).click()
  await page.getByRole('button', { name: 'Tots els projectes' }).waitFor()
  await settle(page, 800)
  await shot(page, 'llistat-mare')

  await page.goto(`#/project/${MOTHER}?tab=resum`)
  await page.getByText('Resum financer').first().waitFor()
  await settle(page, 1500)
  await shot(page, 'mare-resum')

  await page.getByRole('link', { name: 'Dades', exact: true }).click()
  await settle(page, 600)
  await toTop(page.locator('h3.form-section-title', { hasText: 'Gestió del projecte' }), 110)
  await settle(page, 300)
  await shot(page, 'mare-fills')

  // (this mother has undated lines: the warning on top is left out of the next pictures)
  await page.getByRole('link', { name: 'Pressupost i fases', exact: true }).click()
  await settle(page, 800)
  await toTop(page.locator('.card-header-title', { hasText: 'Execució del pressupost' }), 20)
  await settle(page, 300)
  await shot(page, 'mare-fases')

  await page.getByRole('link', { name: 'Planificació', exact: true }).click()
  await page.getByText('Projectes fills no actius').waitFor()
  await settle(page, 1000)
  await page.getByRole('button', { name: 'Acompanyament en sobirania alimentària Riudemostra' }).click()
  await settle(page, 1500)
  await toTop(page.locator('.card-header-title', { hasText: 'Projectes fills no actius' }), 20)
  await settle(page, 300)
  await shot(page, 'mare-planificacio')

  // a child: its mother in Dades (fresh load, see 05 about state kept between projects)
  await page.goto(`#/project/${CHILD}?tab=dades`)
  await page.reload()
  await page.getByText('Identificació').waitFor()
  await settle(page, 1500)
  await toTop(page.locator('h3.form-section-title', { hasText: 'Gestió del projecte' }), 110)
  await settle(page, 300)
  await shot(page, 'fill-mare')

  // back to the normal list, so the menu opens it again
  await page.goto('#/mother-projects')
  await settle(page)
  await page.getByRole('button', { name: 'Tots els projectes' }).click()
  await settle(page)
})
