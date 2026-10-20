// issues/254: the invoices .ods export wrote each line's VAT and IRPF unrounded
// (18,3731625…; 2026-035's line VAT added up to 33,4556 against 33,45), left
// the discount out of the columns so line_base × line_quantity wasn't the base,
// and headed the client columns of Ingressos «proveidor».
import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { invoiceExportLineRow } from '@/domain/invoiceExport'
import { totalVat, totalBase } from '@/domain/documentTotals'

describe('invoices .ods line rows (issues/254)', () => {
  const lines = [
    { concept: 'a', quantity: 1, base: 87.4913, discount: 0, vat: 21, irpf: 15 },
    { concept: 'b', quantity: 3, base: 25.5, discount: 10, vat: 21, irpf: 0 }
  ]

  it('rounds the VAT and IRPF of each line to cents, adding up to the document', () => {
    const rows = lines.map(l => invoiceExportLineRow('2026-035', l))
    expect(rows[0].line_vat).toBe(18.37)
    expect(rows[0].line_irpf).toBe(13.12)
    expect(rows.reduce((s, r) => s + r.line_vat, 0)).toBeCloseTo(totalVat(lines), 10)
  })

  it('exports the discount, so the lines give the base', () => {
    const rows = lines.map(l => invoiceExportLineRow('2026-035', l))
    expect(rows[1].line_discount).toBe(10)
    const base = rows.reduce((s, r) => s + Math.round(r.line_base * r.line_quantity * (1 - (r.line_discount || 0) / 100) * 100) / 100, 0)
    expect(base).toBeCloseTo(totalBase(lines), 10)
  })

  it('has line_discount among the columns and heads the client columns «client»', () => {
    for (const file of ['EmittedInvoicesTable.vue', 'ReceivedInvoicesTable.vue']) {
      const src = fs.readFileSync(path.join(__dirname, '../../src/components', file), 'utf8')
      expect(src).toMatch(/line_discount: \{\s*field: 'line_discount'/)
      expect(src).toContain('invoiceExportLineRow(e.code, line)')
    }
    const emitted = fs.readFileSync(path.join(__dirname, '../../src/components/EmittedInvoicesTable.vue'), 'utf8')
    expect(emitted).toContain("client_nif: 'client_nif'")
    expect(emitted).not.toContain("proveidor: 'proveidor'")
  })
})
