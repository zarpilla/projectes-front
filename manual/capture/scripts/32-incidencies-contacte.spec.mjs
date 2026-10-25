// 32. Incidències i contacte — the incidences list and conversation (member and office), opening
// an incidence from an order, the contact form and the incidences report. Data: anonymized
// logistics copy (projectes_v5_manual_logistica, MANUAL_DATA=logistica), seen on 06/10/2026.
// Writes nothing (incidences and the contact form send e-mails): the new incidence dialog is
// cancelled, the reply is typed and not sent, the close dialog is cancelled, and the contact form
// is filled in and left unsent.
// Example records: member «Mel Can Demo» (her order 24879, her incidence 40 with one reply);
// office: open incidence 138, closed incidence 96 (two replies).
import { test } from '@playwright/test'
import { start, login, settle, shot, logUser } from '../helpers.mjs'

const TODAY = '2026-10-06'

// the provider's welcome modal about pending invoices names the real cooperative: close it
async function closeHello (page) {
  const ok = page.locator('.modal.is-active').getByRole('button', { name: "D'acord" })
  await ok.waitFor({ timeout: 4_000 }).catch(() => {})
  if (await ok.isVisible().catch(() => false)) await ok.click()
  await page.locator('.modal.is-active').waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {})
}

async function relogin (page, profile) {
  await page.evaluate(() => localStorage.clear())
  await page.goto('#/')
  await page.reload()
  await login(page, ...logUser(profile))
  await closeHello(page)
}

async function openIncidences (page) {
  await page.goto('#/incidencies')
  await page.getByText('Temps mitjà de tancament').waitFor()
  await settle(page, 800)
}

const tab = (page, label) => page.locator('.segmented button', { hasText: label })

test('32-incidencies-contacte', async ({ page }) => {
  test.setTimeout(400_000)
  await start(page, '32-incidencies-contacte', { today: TODAY })

  // ---- the member
  await login(page, ...logUser('orders'))
  await closeHello(page)

  // an incidence is opened from the order
  await page.goto('#/comanda/24879')
  await page.getByText('Comanda #24879').first().waitFor()
  await settle(page, 1200)
  const box = page.locator('.a-box', { has: page.getByRole('heading', { name: 'Incidències' }) }).first()
  // centred: the save bar is fixed at the bottom of the window
  await box.evaluate(e => e.scrollIntoView({ block: 'center' }))
  await settle(page, 300)
  await shot(page, 'caixa-incidencies-comanda', { clip: await box.boundingBox() })
  await box.getByRole('button', { name: 'Crear incidència' }).click()
  await page.getByText('Crear Incidència', { exact: true }).waitFor()
  await page.locator('.modal.is-active textarea').fill("El punt d'entrega ha canviat d'horari")
  await settle(page, 300)
  await shot(page, 'crear-incidencia')
  await page.locator('.modal.is-active').getByRole('button', { name: 'Cancel·lar' }).click()
  await settle(page, 300)

  // her incidences: none to solve; all of them, one with a reply
  await openIncidences(page)
  await shot(page, 'incidencies-socia')
  await tab(page, 'Totes').click()
  await settle(page, 600)
  await page.locator('tr.inc-row', { hasText: '#40' }).click()
  await page.getByRole('heading', { name: 'Incidència #40' }).waitFor()
  await settle(page, 600)
  await shot(page, 'incidencia-socia-tancada')

  // the contact form, filled in and not sent
  await page.goto('#/contacta')
  await page.getByText('El teu missatge').waitFor()
  await settle(page, 800)
  await page.getByPlaceholder('El teu nom').fill('Mel Can Demo')
  await page.getByPlaceholder('Què vols dir-nos?').fill("Voldríem que la ruta s'aturés a una població nova. Ens podeu dir si és possible?")
  await settle(page, 300)
  await shot(page, 'contacta')

  // ---- the office
  await relogin(page, 'admin')
  await openIncidences(page)
  await page.locator('tr.inc-row', { hasText: '#138' }).click()
  await page.getByRole('heading', { name: 'Incidència #138' }).waitFor()
  await settle(page, 600)
  await page.getByPlaceholder('Escriu una resposta…').fill("Ho mirem amb la repartidora i et diem alguna cosa.")
  await settle(page, 300)
  await shot(page, 'incidencies-oficina')

  // close it? the confirmation, cancelled
  await page.locator('.reply-actions').getByRole('button', { name: 'Tanca' }).click()
  const d = page.locator('.dialog.modal.is-active')
  await d.waitFor()
  await settle(page, 300)
  await shot(page, 'confirma-tancar')
  await d.getByRole('button', { name: 'Cancel·la' }).click()
  await d.waitFor({ state: 'hidden' })
  await page.getByPlaceholder('Escriu una resposta…').fill('')

  // a closed one with its conversation
  await page.getByPlaceholder('Cerca comanda, punt o text').fill('96')
  await tab(page, 'Totes').click()
  await settle(page, 900)
  await page.locator('tr.inc-row', { hasText: '#96' }).click()
  await page.getByRole('heading', { name: 'Incidència #96' }).waitFor()
  await settle(page, 600)
  await page.setViewportSize({ width: 1440, height: 1300 })
  await settle(page, 600)
  const detail = page.locator('aside.inc-detail')
  await shot(page, 'conversa', { clip: await detail.boundingBox() })
  await page.setViewportSize({ width: 1440, height: 900 })

  // ---- the report
  await page.goto('#/estadistiques-incidencies')
  await page.getByText('Per cada 100 comandes', { exact: true }).waitFor({ timeout: 60_000 })
  await settle(page, 1500)
  await page.getByLabel('Mes').selectOption({ label: 'Tots' })
  await page.getByText(/comandes en el període/).waitFor({ timeout: 60_000 })
  await settle(page, 2500)
  await page.setViewportSize({ width: 1440, height: 1500 })
  await settle(page, 1200)
  await shot(page, 'informe')
})
