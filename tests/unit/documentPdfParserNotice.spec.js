// 2026-10-22: «Omple dades a partir de PDF» sends the PDF to the invoice-parser,
// which reads it with an LLM at Z.ai (invoice-parser/parserService.js). The
// form now says so, right under the button. A template check: mounting the
// whole document form for one line of text is not worth it.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const source = fs.readFileSync(path.resolve(__dirname, '../../src/components/DocumentForm.vue'), 'utf8')

describe('PDF parser notice', () => {
  it('tells the PDF goes to z.ai, right under the button', () => {
    const button = source.indexOf('Omple dades a partir de PDF')
    const notice = source.indexOf("El PDF s'envia a un servei extern (z.ai)")
    expect(button).toBeGreaterThan(0)
    expect(notice).toBeGreaterThan(button)
    // same block: before the button's field closes
    expect(notice).toBeLessThan(source.indexOf('</b-field>', button))
  })
})
