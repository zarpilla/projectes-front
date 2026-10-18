// issues/113: wording slips seen across screens. Kept out of the sources.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const files = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? files(path.join(dir, e.name)) : /\.(vue|js)$/.test(e.name) ? [path.join(dir, e.name)] : [])
const sources = files(path.resolve(process.cwd(), 'src'))
  .filter(f => !/changelog\.js$|contasol-(clients|providers)\.js$/.test(f))
  .map(f => [f, fs.readFileSync(f, 'utf8')])

const BANNED = [
  'Data Pagament', 'Data Venciment', 'Data Enviament', 'Data Acceptació',
  'label="Provincia"', 'Linies de factures', 'Clientes (CLI)', '>Surt<',
  'Nou Projecte', 'Factures FACE', '"Proveïdor", value',
  // Spanish words found while writing the manual (2026-10): orders KPI, Punts de consum
  'bultos', 'bults', 'Línea', 'línea'
]

describe('wording (issues/113)', () => {
  it.each(BANNED)('no «%s»', text => {
    expect(sources.filter(([, s]) => s.includes(text)).map(([f]) => path.basename(f))).toEqual([])
  })

  it('names the user role in Catalan', async () => {
    const AdminUserForm = (await import('@/components/AdminUserForm.vue')).default
    const ctx = { roles: [{ id: 1, type: 'authenticated', name: 'Authenticated' }], form: { role: 1, email: 'a@x.coop' }, selectedPermissions: [] }
    expect(AdminUserForm.computed.summaryLine.call(ctx)).toBe('a@x.coop · rol usuària · cap permís')
  })
})
