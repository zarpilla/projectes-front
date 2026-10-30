// 01. Primers passos — logging in, the forgotten password, the menu (folded and not), the
// account page, dark mode and the changelog. Data: anonymized copy of resilience
// (projectes_v5_manual), seen on 17/06/2026. Read-only: no reset e-mail is sent, and the
// appearance is set back to light at the end (it is kept in the browser only).
import { test } from '@playwright/test'
import { start, login, settle, shot } from '../helpers.mjs'

test('01-primers-passos', async ({ page }) => {
  test.setTimeout(300_000)
  await start(page, '01-primers-passos', { today: '2026-06-17' })

  await page.goto('/')
  await page.getByText('Accedeix').waitFor()
  await settle(page, 800)
  // the sponsor logos come from the backend's uploads, which the copy doesn't have
  await page.evaluate(() => document.querySelectorAll('img').forEach(i => { if (i.complete && !i.naturalWidth) i.style.visibility = 'hidden' }))
  await shot(page, 'inici-sessio')

  await page.getByRole('link', { name: 'He oblidat la clau' }).click()
  await page.getByText('Recupera la clau de pas').waitFor()
  await settle(page, 500)
  await shot(page, 'clau-oblidada')

  await login(page)
  await page.goto('/projectes')
  await settle(page, 1500)
  await shot(page, 'menu')

  // the «Informes» group unfolded
  await page.locator('aside .menu-label', { hasText: 'Informes' }).click()
  await settle(page, 600)
  await page.locator('aside .menu-label', { hasText: 'Informes' }).evaluate(el => el.scrollIntoView({ block: 'start' }))
  await settle(page, 300)
  await shot(page, 'menu-informes')

  await page.getByRole('button', { name: 'Contraure menú' }).click()
  await settle(page, 800)
  await shot(page, 'menu-plegat')
  await page.locator('aside button[aria-label]').first().click()
  await settle(page, 800)

  await page.goto('/el-meu-compte')
  await page.getByText('Dades personals').waitFor()
  await settle(page, 1000)
  await shot(page, 'el-meu-compte')

  // dark mode
  await page.getByRole('group', { name: 'Aparença' }).getByRole('button', { name: 'Fosc' }).click()
  await settle(page, 600)
  await page.goto('/projectes')
  await settle(page, 1500)
  await shot(page, 'mode-fosc')
  await page.goto('/el-meu-compte')
  await page.getByText('Dades personals').waitFor()
  await page.getByRole('group', { name: 'Aparença' }).getByRole('button', { name: 'Clar' }).click()
  await settle(page, 400)

  await page.goto('/novetats')
  await settle(page, 1500)
  await shot(page, 'novetats')
})
