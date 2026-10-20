// issues/142, issues/143: «Exporta detall» of Ingressos/Despeses had no
// forecast invoicing/payment dates, and its only VAT columns (`*_vat`, the
// non-deductible VAT) were 0 when VAT is fully deductible. The rows now carry
// the line's forecast dates and its whole VAT, and the non-deductible VAT
// columns say so in their header.
import { describe, it, expect } from 'vitest'
import EconomicDetailPivot from '@/components/EconomicDetailPivot.vue'

const fieldsOf = name => dataType =>
  EconomicDetailPivot.computed[name].call({
    dataType,
    excelFormat: value => `fmt:${value}`
  })
const fields = fieldsOf('excelFields1')
const yearFields = fieldsOf('excelFields2')
const totalFields = fieldsOf('excelFields3')
const headers = f => Object.keys(f).filter(k => /vat|iva/i.test(k))

describe('«Exporta detall» columns (issues/142, issues/143)', () => {
  for (const dataType of [null, 'Previsió', 'Execució']) {
    it(`has the forecast dates and the whole VAT (${dataType || 'tot'})`, () => {
      const f = fields(dataType)
      expect(f.previsio_facturacio).toBe('forecast_invoice_date')
      expect(f.previsio_pagament).toBe('forecast_payment_date')
      expect(f.iva_pct).toBe('vat_pct')
      expect(f.iva.field).toBe('vat')
      expect(f.iva.callback(-8)).toBe('fmt:-8')
    })
  }

  it('names the non-deductible VAT columns as such, per kind of data', () => {
    expect(headers(fields(null))).toEqual([
      'expense_orig_iva_no_deduible', 'expense_esti_iva_no_deduible',
      'expense_real_iva_no_deduible', 'iva_pct', 'iva'
    ])
    expect(headers(fields('Previsió'))).toEqual(['expense_esti_iva_no_deduible', 'iva_pct', 'iva'])
    expect(headers(fields('Execució'))).toEqual(['expense_real_iva_no_deduible', 'iva_pct', 'iva'])
    expect(fields(null).expense_esti_iva_no_deduible.field).toBe('expense_esti_vat')

    expect(headers(yearFields(null))).toEqual([
      'Despeses orig IVA no deduïble', 'Despeses prev IVA no deduïble', 'Despeses exec IVA no deduïble'
    ])
    expect(headers(yearFields('Previsió'))).toEqual(['Despeses prev IVA no deduïble'])
    expect(headers(yearFields('Execució'))).toEqual(['Despeses exec IVA no deduïble'])
  })
})

// issues/254: «Exporta totals» (all years) had no non-deductible VAT column,
// so «Despeses + Hores» didn't add up to «Despeses tot»
describe('«Exporta totals» columns (issues/254)', () => {
  it('has the non-deductible VAT, per kind of data', () => {
    expect(headers(totalFields(null))).toEqual([
      'Despeses orig IVA no deduïble', 'Despeses prev IVA no deduïble', 'Despeses exec IVA no deduïble'
    ])
    expect(headers(totalFields('Previsió'))).toEqual(['Despeses prev IVA no deduïble'])
    expect(headers(totalFields('Execució'))).toEqual(['Despeses exec IVA no deduïble'])
    expect(totalFields(null)['Despeses exec IVA no deduïble'].field).toBe('expense_real_vat')
  })
})
