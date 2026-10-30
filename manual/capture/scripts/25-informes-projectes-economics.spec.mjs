// 25. Informes de projectes i econòmics — Panell de projectes, Ingressos/Despeses, Preu hora,
// Previsió econòmica, Previsió facturació, Estratègies and Intercooperació.
// Data: anonymized copy of resilience (projectes_v5_manual), seen on 17/06/2026. Read-only.
import { test } from '@playwright/test'
import { start, login, settle, shot } from '../helpers.mjs'

const toTop = (locator, offset = 20) => locator.evaluate((el, offset) => {
  el.scrollIntoView({ block: 'start' })
  window.scrollBy(0, -offset)
}, offset)

async function open (page, route, readyText) {
  await page.goto(route)
  await page.getByText(readyText).first().waitFor({ timeout: 60_000 })
  await settle(page, 2500)
}

test('25-informes-projectes-economics', async ({ page }) => {
  test.setTimeout(400_000)
  await start(page, '25-informes-projectes-economics', { today: '2026-06-17' })
  await login(page)

  await open(page, '/panell-projectes', 'Resultat previst i real per projecte')
  await shot(page, 'panell')
  await page.evaluate(() => window.scrollBy(0, 650))
  await settle(page, 600)
  await shot(page, 'panell-grafics')

  await open(page, '/panell-detall-economic', 'Resultat per projecte')
  await shot(page, 'ingressos-despeses')
  await page.evaluate(() => window.scrollBy(0, 650))
  await settle(page, 600)
  await shot(page, 'ingressos-despeses-grafics')

  await open(page, '/panell-preu-hora', 'Marge')
  await shot(page, 'preu-hora')

  await open(page, '/previsio', 'Previsió econòmica')
  await settle(page, 1500)
  await shot(page, 'previsio-economica')

  // the invoicing forecast uses the real date (its lines are relative to today)
  await open(page, '/previsio-facturacio', 'Què cal facturar')
  await shot(page, 'previsio-facturacio')
  await toTop(page.locator('h2', { hasText: 'Què cal facturar' }), 40)
  await settle(page, 400)
  await shot(page, 'previsio-facturacio-llista')

  await open(page, '/panell-estrategies', 'Estratègies')
  await page.getByRole('combobox', { name: 'Estat projecte' }).selectOption({ label: 'Tots' })
  await settle(page, 2500)
  await page.locator('.k-pivot-rowheaders').getByText('Estratègies (TOTES)').first().locator('xpath=preceding-sibling::span[contains(@class,"k-icon")][1] | self::*').first().click()
  await settle(page, 1500)
  await shot(page, 'estrategies')

  // (Intercooperació: no data in the copy, no projects with intercooperation entities)
})
