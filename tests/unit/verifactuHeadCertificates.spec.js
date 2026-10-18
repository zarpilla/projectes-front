// issues/159: the head of Verifactu i FACe said the certificates were set «a
// l'àrea del servidor»; it now sums up what /certificates/:kind answers.
import { describe, it, expect } from 'vitest'
import { certificateText } from '@/components/VerifactuHead.vue'

describe('VerifactuHead certificate card (issues/159)', () => {
  it('describes each certificate', () => {
    expect(certificateText(null)).toBe('—')
    expect(certificateText({ configured: false })).toBe("no n'hi ha")
    expect(certificateText({ configured: true, valid: false })).toBe('amb errors')
    expect(certificateText({ configured: true, valid: true, certificate: { notAfter: '2099-11-05T12:00:00Z' } })).toBe('vàlid fins 05/11/2099')
    expect(certificateText({ configured: true, valid: true, certificate: { notAfter: '2020-01-02T12:00:00Z' } })).toBe('caducat el 02/01/2020')
  })
})
