// issues/439 (2026-11-16, La Diligència): with both the 2 € volume discount and
// the 20 % multidelivery discount, the 2 € come off first and the 20 % applies
// to what is left. The price always did so (Diligència 24679: 12,07 € → 10,07 €
// → 8,06 €, invoice 886 line base 10,07, discount 20 %), but the order page,
// the form and the list wrote «−20 %» before «−2 €». Pinned here, and the list
// now writes them in that order.
import { describe, it, expect } from 'vitest'
import { invoicedPrice } from '@/domain/logisticsInvoicing.js'

describe('volume discount before multidelivery (issues/439)', () => {
  it('takes the 2 € off first, then the 20 %', () => {
    expect(invoicedPrice({ price: 12.07, volume_discount: 2, multidelivery_discount: 20 })).toBe(8.06)
    // not 12,07 × 0,8 − 2 = 7,66
    expect(invoicedPrice({ price: 12.07, volume_discount: 2, multidelivery_discount: 20 })).not.toBe(7.66)
  })

  it('keeps each discount alone as it was', () => {
    expect(invoicedPrice({ price: 12.07, volume_discount: 2 })).toBe(10.07)
    expect(invoicedPrice({ price: 12.07, multidelivery_discount: 20 })).toBe(9.66)
  })
})
