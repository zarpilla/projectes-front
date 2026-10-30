// 08. Documents del projecte — attaching files to a project, and the «Cobraments i pagaments»
// tab (the project's invoices and expected collections and payments).
// Data: anonymized copy of resilience (projectes_v5_manual), seen on 17/06/2026. The copy has
// no uploaded files, so the script makes two demo files (a PDF and a PNG, generated here),
// uploads them to project 687, and at the end removes them from the project and saves it.
// The manual user can't delete uploads through the API; after a run, remove them from the copy:
//   DELETE l FROM files_related_mph l JOIN files f ON f.id = l.file_id WHERE f.name LIKE 'demo-%';
//   DELETE FROM files WHERE name LIKE 'demo-%';
// and their files in ../projectes-v5/public/uploads/demo_*. Project 642 has many invoices
// and expected movements.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from '@playwright/test'
import { start, login, settle, shot } from '../helpers.mjs'

const DOCS_PROJECT = 687
const MOVEMENTS_PROJECT = 642

// two small files made in a scratch page: a budget (PDF) and a signed resolution (PNG)
async function makeDemoFiles (browser) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'manual-08-'))
  const page = await browser.newPage({ viewport: { width: 600, height: 400 } })
  await page.setContent(`<body style="font-family:sans-serif;padding:40px">
    <h1>Pressupost</h1><p>Pla de cooperació internacional</p>
    <table border=1 cellpadding=6><tr><td>Tallers</td><td>13.050,00 €</td></tr></table></body>`)
  const pdf = path.join(dir, 'demo-pressupost.pdf')
  await page.pdf({ path: pdf, format: 'A5' })
  await page.setContent(`<body style="margin:0;background:#fffdf5;font-family:serif;padding:30px">
    <h2>Resolució de concessió</h2><p>S'atorga una subvenció de 13.050,00 €.</p>
    <p style="margin-top:60px">Signat: l'entitat finançadora</p></body>`)
  const png = path.join(dir, 'demo-resolucio.png')
  await page.screenshot({ path: png })
  await page.close()
  return [pdf, png]
}

const toTop = (locator, offset = 90) => locator.evaluate((el, offset) => {
  el.scrollIntoView({ block: 'start' })
  window.scrollBy(0, -offset)
}, offset)

test('08-documents-projecte', async ({ page, browser }) => {
  test.setTimeout(300_000)
  await start(page, '08-documents-projecte', { today: '2026-06-17' })
  await login(page)
  const files = await makeDemoFiles(browser)

  await page.goto(`/projecte/${DOCS_PROJECT}?tab=dades`)
  await page.getByText('Identificació').waitFor()
  await settle(page, 1500)
  const docs = page.locator('h3.form-section-title', { hasText: 'Documents' })
  await toTop(docs, 110)
  await settle(page, 300)
  await shot(page, 'documents-buit')

  await page.locator('input[type=file]').setInputFiles(files)
  await page.locator('.file-documents a', { hasText: 'demo-pressupost' }).waitFor({ timeout: 30_000 })
  await settle(page, 1500)
  // the copy serves no images from other origins; ours come from the anonymized API
  await toTop(docs, 110)
  await settle(page, 500)
  await shot(page, 'documents-pujats')

  // removing them: the cross, then Guardar
  const crosses = page.locator('.file-documents .remove-button')
  while (await crosses.count()) {
    await crosses.first().click()
    await settle(page, 200)
  }
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  await page.getByText('Sense canvis pendents').waitFor()
  await settle(page, 500)

  // the project's money movements
  await page.goto(`/projecte/${MOVEMENTS_PROJECT}?tab=moviments`)
  await page.reload()
  await page.getByText("Moviments d'ingressos i despeses").first().waitFor()
  await settle(page, 1500)
  await shot(page, 'moviments')
  await toTop(page.locator('.card-header-title', { hasText: 'Cobraments i pagaments' }), 20)
  await settle(page, 500)
  await shot(page, 'cobraments-pagaments')
})
