// 41. Posar en marxa FACe pas a pas — the ESSTRAPIS side: the FACe settings with the certificate
// card and its «Descarrega la part pública (.cer)» button, a public administration's contact with
// its DIR3 codes, the FACe queue with two invoices registered in FACe's test environment, and the
// status card on one of them.
//
// Data: projectes_v5_face, the local FACe test environment (anonymized resilience copy whose entity
// data and FACe certificate are the user's own: see the chapter's notes). Run with
//   MANUAL_API_URL=http://127.0.0.1:1343 MANUAL_BASE_URL=http://localhost:8085/
// against an API with FACE_DRY_RUN=true and the cron off. The certificate holder and NIF are
// replaced in the page before each shot: they are a real person's. Read-only (the DIR3 dialog only
// searches; nothing is saved).
//
// The FACe portal screenshots (01–20) are not taken here: they were taken by hand on FACe's own
// sites and masked (holder names, NIF, certificate serial number).
import { test } from '@playwright/test'
import { start, login, settle, shot } from '../helpers.mjs'

const UAB = 121 // contact: Universitat Autònoma de Barcelona (Q0818002H), FACe on, DIR3 filled
const INVOICE = 906 // 2026-051 to the UAB, registered in FACe test (REGAGE26e00000470629)

// The certificate card shows a real person's certificate: show a fictitious one instead.
async function maskCertificate (page) {
  await page.evaluate(() => {
    for (const card of document.querySelectorAll('.cert-card')) {
      const dts = [...card.querySelectorAll('.cert-facts dt')]
      for (const dt of dts) {
        const dd = dt.nextElementSibling
        if (!dd) continue
        if (dt.textContent === 'Titular') dd.textContent = 'ENTITAT DE PROVA SCCL'
        if (dt.textContent === 'NIF') dd.textContent = 'F12345678'
        if (dt.textContent === 'Fitxer') dd.textContent = dd.textContent.replace(/^\S+\.p12/, 'certificat-entitat.p12')
      }
    }
  })
}

const toTop = async (locator, offset = 20) => {
  await locator.evaluate((el, off) => {
    el.scrollIntoView({ block: 'start' })
    window.scrollBy(0, -off)
  }, offset)
}

test('41-face-pas-a-pas', async ({ page }) => {
  test.setTimeout(300_000)
  await start(page, '41-face-pas-a-pas', { firstShot: 21 })
  await login(page)

  // 21: Configuració general › Factura electrònica (FACe) with the certificate card
  await page.goto('/administracio/configuracio')
  await page.getByText('Factura electrònica (FACe)').waitFor({ timeout: 30_000 })
  await page.locator('.cert-pem').waitFor({ timeout: 30_000 })
  await settle(page, 1000)
  await maskCertificate(page)
  await toTop(page.locator('#cfg-face'))
  await settle(page, 300)
  // only the FACe box: the next one (footer texts) carries the entity's real name
  await shot(page, 'configuracio-face', { clip: await page.locator('#cfg-face').boundingBox() })

  // 22: the contact of a public administration, «Facturació electrònica» block (tab «Dades»)
  await page.goto(`/contacte/${UAB}`)
  await page.getByRole('tab', { name: 'Dades' }).or(page.getByText('Dades', { exact: true })).first().click()
  await page.getByText('Identificació').waitFor({ timeout: 30_000 })
  await settle(page, 1500)
  await toTop(page.locator('h3.form-section-title', { hasText: 'Facturació electrònica' }), 80)
  await settle(page, 300)
  await shot(page, 'contacte-dir3')

  // 23: the DIR3 search, prefilled from the contact's NIF
  await page.getByRole('button', { name: /Cercar DIR3/ }).click()
  await page.locator('.modal.is-active').waitFor()
  await settle(page, 3000)
  await shot(page, 'cerca-dir3')
  await page.keyboard.press('Escape')

  // 24: Administració › Verifactu i FACe › Cua FACe
  await page.goto('/administracio/cua-face')
  await settle(page, 2000)
  await shot(page, 'cua-face')

  // 25: the status card of the invoice
  await page.goto(`/document/${INVOICE}/emitted-invoices`)
  await page.getByText('Factura emesa:').waitFor({ timeout: 30_000 })
  await settle(page, 1500)
  await toTop(page.locator('.card-header-title', { hasText: 'Verifactu i FACe' }).first())
  await settle(page, 400)
  await shot(page, 'factura-estat')
})
