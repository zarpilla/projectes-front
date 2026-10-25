// 31. Dipòsits, transferències i operacions — the deposits list (member and office), the QR
// scanner, the transfers list and the driver's day (Operacions). Data: anonymized logistics copy
// (projectes_v5_manual_logistica, MANUAL_DATA=logistica), seen on 06/10/2026.
// Writes: starts and ends the transfer of order 24886 (member «Mel Can Demo») to show the
// «En procés» and «Completades» tabs, then undoes both (the end of the script clears its
// transfer stamps through the API in any case). Nothing else is saved: the deposit and
// incidence dialogs are cancelled, and the scanner reads, in «undo» mode, an order that isn't
// deposited (only a warning). The camera is Chromium's fake device playing a QR of order 24876,
// made with qrencode, ImageMagick and ffmpeg in the system's temp folder.
import { test } from '@playwright/test'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { start, login, settle, shot, logUser } from '../helpers.mjs'

const TODAY = '2026-10-06'
const SCAN_ORDER = 24876 // member's processed order, not deposited
const TRANSFER_ORDER = 24886 // member's processed order with a pending transfer

// outside results/, which Playwright empties when the run starts
const video = path.join(os.tmpdir(), `manual-qr-${SCAN_ORDER}.y4m`)

function makeQrVideo () {
  if (fs.existsSync(video)) return
  fs.mkdirSync(path.dirname(video), { recursive: true })
  const png = video.replace(/\.y4m$/, '.png')
  const frame = video.replace(/\.y4m$/, '-frame.png')
  execSync(`qrencode -s 8 -m 4 -o "${png}" "http://localhost:8082/#/order/view/${SCAN_ORDER}"`)
  execSync(`magick "${png}" -resize 320x320 -gravity center -background white -extent 640x480 "${frame}"`)
  execSync(`ffmpeg -loglevel error -y -loop 1 -i "${frame}" -t 3 -r 10 -pix_fmt yuv420p "${video}"`)
}
makeQrVideo()

test.use({
  permissions: ['camera'],
  launchOptions: {
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
      `--use-file-for-fake-video-capture=${video}`
    ]
  }
})

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

// the Buefy confirm dialog: picture it, then press one of its buttons
async function dialog (page, button, name) {
  const d = page.locator('.dialog.modal.is-active')
  await d.waitFor()
  await settle(page, 300)
  if (name) await shot(page, name)
  await d.getByRole('button', { name: button }).click()
  await d.waitFor({ state: 'hidden' })
}

async function clearTransfer (page) {
  const jwt = await page.evaluate(() => localStorage.getItem('jwt'))
  const api = process.env.MANUAL_API_URL
  await page.request.put(`${api}/api/orders/${TRANSFER_ORDER}`, {
    headers: { Authorization: `Bearer ${jwt}` },
    data: { data: { transfer_start_date: null, transfer_start_user: null, transfer_end_date: null, transfer_end_user: null } }
  }).catch(() => {})
}

test('31-diposits-transferencies-operacions', async ({ page }) => {
  test.setTimeout(400_000)
  await start(page, '31-diposits-transferencies-operacions', { today: TODAY })

  // ---- the member: her deposits
  await login(page, ...logUser('orders'))
  await closeHello(page)
  await page.goto('#/deposits')
  await page.getByText('Pendents de dipositar').waitFor()
  await settle(page, 800)
  await shot(page, 'diposits-socia')

  await page.locator('td button', { hasText: 'Dipositar' }).first().click()
  await dialog(page, 'Cancel·la', 'confirma-diposit')

  await page.getByRole('button', { name: /Dipositades avui/ }).click()
  await settle(page, 600)
  await shot(page, 'dipositades-avui')

  // the scanner in «undo» mode: the QR of an order that isn't deposited only gives a warning
  await page.getByRole('button', { name: 'Escaneja per desfer' }).click()
  await page.locator('.history-item').first().waitFor({ timeout: 30_000 })
  await page.waitForTimeout(1500)
  await shot(page, 'escaneja', { keepToasts: false })
  await page.locator('.modal.is-active').getByRole('button', { name: 'Tancar' }).click()
  await settle(page, 500)

  // ---- the office: every deposit, transfers, a driver's transfers
  await relogin(page, 'admin')
  try {
    await page.goto('#/deposits')
    await page.getByText('Pendents de dipositar').waitFor()
    await settle(page, 800)
    await shot(page, 'diposits-oficina')

    await page.goto('#/transfers')
    await page.getByText("Comandes que van d'un punt de recollida").waitFor()
    await settle(page, 1000)
    await shot(page, 'transferencies')

    // the detail of a row
    const row = page.locator('tbody tr', { hasText: `#${TRANSFER_ORDER}` }).first()
    await row.locator('td.chevron-cell a').click()
    await settle(page, 400)
    const detail = page.locator('tr.detail').first()
    const rb = await row.boundingBox()
    const db = await detail.boundingBox()
    await shot(page, 'transferencia-detall', { clip: { x: rb.x, y: rb.y - 4, width: rb.width, height: db.y + db.height - rb.y + 8 } })
    await row.locator('td.chevron-cell a').click()

    // start it, then end it
    await row.getByRole('button', { name: 'Iniciar' }).click()
    await dialog(page, "D'acord")
    await settle(page, 600)
    await page.getByRole('button', { name: /^En procés/ }).click()
    await settle(page, 600)
    await shot(page, 'en-proces')
    await page.locator('tbody tr', { hasText: `#${TRANSFER_ORDER}` }).first().getByRole('button', { name: 'Finalitzar' }).click()
    await dialog(page, "D'acord")
    await settle(page, 600)
    await page.getByRole('button', { name: /^Completades/ }).click()
    await settle(page, 600)
    await shot(page, 'completades')
    // and undo both
    await page.locator('tbody tr', { hasText: `#${TRANSFER_ORDER}` }).first().getByRole('button', { name: 'Desfés' }).click()
    await dialog(page, "D'acord")
    await settle(page, 400)
    await page.getByRole('button', { name: /^En procés/ }).click()
    await settle(page, 400)
    await page.locator('tbody tr', { hasText: `#${TRANSFER_ORDER}` }).first().getByRole('button', { name: 'Desfés' }).click()
    await dialog(page, "D'acord")
    await settle(page, 400)
  } finally {
    await clearTransfer(page)
  }

  // Operacions for the office: the driver with transfers that day (route «DT - (TARDA) EMPORDÀ»)
  await page.goto('#/order-operations')
  await page.getByText(/de \d+ fetes/).waitFor()
  await settle(page, 800)
  const driver = page.locator('label.filter-select', { hasText: 'Repartidora' }).locator('select')
  await driver.selectOption({ label: 'Júlia Serra' })
  await settle(page, 1200)
  await page.getByRole('button', { name: /^Transf\./ }).click()
  await settle(page, 400)
  await shot(page, 'operacions-transferencies')

  // ---- the driver: her day
  await relogin(page, 'delivery')
  await page.goto('#/order-operations')
  await page.getByText(/de \d+ fetes/).waitFor()
  await settle(page, 1200)
  await shot(page, 'operacions-repartidora')

  await page.getByRole('button', { name: /^Entregues/ }).click()
  await settle(page, 400)
  const card = page.locator('article.op-card').first()
  await card.scrollIntoViewIfNeeded()
  await shot(page, 'targeta', { clip: await card.boundingBox() })

  // the incidence button: the dialog opens with a text ready; cancelled
  await card.getByRole('button', { name: 'Crea una incidència' }).click()
  await page.getByText('Crear Incidència', { exact: true }).waitFor()
  await settle(page, 400)
  await shot(page, 'incidencia-operacions')
  await page.locator('.modal.is-active').getByRole('button', { name: 'Cancel·lar' }).click()
  await settle(page, 300)
})
