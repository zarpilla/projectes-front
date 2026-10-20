import { lineVat, lineIrpf } from './documentTotals'

// A line row of the invoices .ods export (Ingressos and Despeses). VAT and IRPF
// are the line's, rounded to cents as the document's totals add them up; they
// came unrounded (18,3731625…) and the discount went to no column, so
// line_base × line_quantity didn't give the document's base (issues/254).
export function invoiceExportLineRow(num, line) {
  const amounts = {
    quantity: Number(line.quantity) || 0,
    base: Number(line.base) || 0,
    discount: Number(line.discount) || 0,
    vat: Number(line.vat) || 0,
    irpf: Number(line.irpf) || 0
  }
  return {
    num,
    line_concept: line.concept,
    line_base: line.base,
    line_date: line.date,
    line_discount: line.discount || "",
    line_quantity: line.quantity,
    line_irpf: lineIrpf(amounts),
    line_irpf_pct: line.irpf,
    line_vat: lineVat(amounts),
    line_vat_pct: line.vat
  }
}
