// 2026-11-04 — IVA › Models 303 i 390, «PDF del model»: it was made with
// html2pdf, a picture of the page, so no amount could be selected and copied
// into the AEAT's form. Now jsPDF writes the text; the amounts as the form
// takes them (comma decimals, no thousands dots).
import { describe, it, expect } from 'vitest'
import { buildModel303Pdf, aeatAmount } from '@/helpers/vatModelPdf'
import { model303Sheet } from '@/domain/vatModels.js'

const Q3 = {
  '07': 2161.6, '08': 21, '09': 453.94, '27': 453.94, '28': 132.82, '29': 27.89, '45': 27.89,
  '46': 426.05, '64': 426.05, '65': 100, '66': 426.05, '69': 426.05, '71': 426.05, '78': 0
}

describe('the model 303 PDF', () => {
  it('writes the amounts as the AEAT form takes them', () => {
    expect(aeatAmount(20808.25)).toBe('20808,25')
    expect(aeatAmount(-10.705)).toBe('-10,71')
    expect(aeatAmount(null)).toBe('0,00')
  })

  it('has real text: the title, the entity, the boxes and the settlement', async () => {
    const sheet = model303Sheet({ year: 2026, quarter: 3, boxes: Q3, entity: { name: 'Jordi Sabaté Estopà', nif: '39891236J' } })
    const doc = await buildModel303Pdf(sheet, { today: '04/11/2026', fonts: false })
    const pdf = doc.output()
    expect(pdf).not.toMatch(/\/Subtype \/Image/)
    for (const text of ['Model 303', '3T 2026', 'NIF 39891236J', '(2161,60)', '(453,94)', '(132,82)', '(426,05)', 'Ingr', 'Liquidaci']) {
      expect(pdf).toContain(text)
    }
    expect(pdf).not.toContain('2.161,60')
    expect(doc.getNumberOfPages()).toBe(1)
  })
})
