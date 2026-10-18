// 23. Importar, exportar i Contasol — the CSV import/export of contacts and the Contasol
// export files. Data: anonymized copy of resilience (projectes_v5_manual), seen on
// 17/06/2026. Read-only: nothing is imported or downloaded.
import { test } from '@playwright/test'
import { start, login, settle, shot } from '../helpers.mjs'

test('23-importar-exportar-contasol', async ({ page }) => {
  test.setTimeout(300_000)
  await start(page, '23-importar-exportar-contasol', { today: '2026-06-17' })
  await login(page)

  await page.goto('#/import-export')
  await page.getByText('Exporta els contactes').waitFor({ timeout: 30_000 })
  await settle(page, 1000)
  await shot(page, 'importar-exportar')

  await page.goto('#/contasol')
  await page.getByText('Clients (CLI)').waitFor({ timeout: 30_000 })
  await settle(page, 1000)
  await shot(page, 'contasol')
})
