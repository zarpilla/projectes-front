// issues/276 (review 8): small inconsistencies in the orders screens.
// - the Preu column filter matched the rate's price before discounts, not the
//   price shown, and a decimal comma matched nothing;
// - a decimal Kg (12.5) gave the browser's «Please enter a valid value» on the
//   form, its lines and the quick edit (type="number" without step="any");
// - the KPI counts had no thousands separator («Comandes actives 23940»);
// - the bulk warning began «Comanda ja processada.» for several orders.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { priceFilterWhere, kilogramsFilterWhere } from '@/domain/ordersListFilters'
import { leavingInvoicedMessage } from '@/domain/orderStatus'

const source = file => readFileSync(resolve(__dirname, '../../src/components', file), 'utf8')

describe('orders Preu / Kg column filters (issues/276)', () => {
  it('filters the shown price, with a comma or a point', () => {
    expect(priceFilterWhere('3,62')).toEqual(['_where[final_price_contains]=3%2C62'])
    expect(priceFilterWhere(' 3.62 ')).toEqual(['_where[final_price_contains]=3.62'])
    expect(priceFilterWhere('')).toEqual([])
  })

  it('reads a decimal comma in the Kg filter', () => {
    expect(kilogramsFilterWhere('7,5')).toEqual(['_where[kilograms_contains]=7.5'])
    expect(kilogramsFilterWhere(' ')).toEqual([])
  })

  it('the list sends them for its Preu and Kg columns', () => {
    const table = source('OrdersTable.vue')
    expect(table).toMatch(/key === "price"\) \{\s*where\.push\(\.\.\.priceFilterWhere\(value\)\)/)
    expect(table).toMatch(/key === "kilograms"\) \{\s*where\.push\(\.\.\.kilogramsFilterWhere\(value\)\)/)
  })
})

describe('decimal kilos inputs (issues/276)', () => {
  it.each([
    ['OrdersForm.vue', /v-model="form\.kilograms"[^>]*/g],
    ['OrdersForm.vue', /v-model="line\.kilograms"[^>]*/g],
    ['OrdersTable.vue', /v-model="editForm\.kilograms"[^>]*/g]
  ])('%s %s accepts decimals', (file, re) => {
    const inputs = source(file).match(re)
    expect(inputs.length).toBeGreaterThan(0)
    for (const input of inputs) expect(input).toContain('step="any"')
  })
})

describe('orders KPIs (issues/276)', () => {
  it('format every count with thousands separators', () => {
    const kpis = source('OrdersTable.vue').match(/<div class="doc-kpis">[\s\S]*?<\/div>\s*<\/div>\s*<div v-if="checkedRows/)[0]
    expect(kpis).not.toMatch(/\{\{\s*kpis\.\w+\s*\}\}/)
    expect(kpis).not.toMatch(/\$\{kpis\.\w+\}/)
  })
})

describe('bulk invoiced warning (issues/276)', () => {
  it('is singular for one order', () => {
    const msg = leavingInvoicedMessage([{ id: 1 }], 'cancelled')
    expect(msg).toContain('Comanda ja processada.')
    expect(msg).toContain('La comanda #1 ja està facturada')
  })

  it('is plural for several', () => {
    const msg = leavingInvoicedMessage([{ id: 1 }, { id: 2 }], 'cancelled')
    expect(msg).toContain('Comandes ja processades.')
    expect(msg).toContain('Les comandes #1, #2 ja estan facturades: si les passes')
    expect(msg).toContain('continuaran a les seves factures')
    expect(msg).not.toContain('Comanda ja processada')
  })
})
