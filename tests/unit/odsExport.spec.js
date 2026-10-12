// issues/032 — every download is an OpenDocument spreadsheet (.ods) whose
// numbers are numeric cells with their exact value, so the decimals are right in
// Office and LibreOffice whatever the "Decimal Excel" field of the user says.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { unzipSync, strFromU8 } from 'fflate'

vi.mock('downloadjs', () => ({ default: vi.fn() }))
import download from 'downloadjs'

import { buildOds, ODS_MIME } from '@/service/ods'
import { format } from '@/helpers/excelFormatter'
import DownloadExcel from '@/components/DownloadExcel.vue'
import contasolInvoices from '@/service/contasol-invoices'
import contasolPayableEffects from '@/service/contasol-payable-effects'

const contentOf = bytes => strFromU8(unzipSync(bytes)['content.xml'])
// repeated spaces are <text:s text:c="n"/> elements
const paragraphText = p =>
  [...p.childNodes].map(n => (n.nodeName === 'text:s' ? ' '.repeat(Number(n.getAttribute('text:c') || 1)) : n.textContent)).join('')
// the cells of the sheet, one array per row: numbers for numeric cells, strings for text
const cellsOf = bytes => {
  const doc = new DOMParser().parseFromString(contentOf(bytes), 'application/xml')
  expect(doc.getElementsByTagName('parsererror').length).toBe(0)
  return [...doc.getElementsByTagName('table:table-row')].map(row =>
    [...row.getElementsByTagName('table:table-cell')].map(cell => {
      if (cell.getAttribute('office:value-type') === 'float') return Number(cell.getAttribute('office:value'))
      return [...cell.getElementsByTagName('text:p')].map(paragraphText).join('\n')
    })
  )
}

describe('buildOds', () => {
  it('is an OpenDocument spreadsheet package', () => {
    const bytes = buildOds([['a']])
    // the mimetype is the first entry, stored without compression
    expect(strFromU8(bytes.slice(30, 38))).toBe('mimetype')
    expect(strFromU8(bytes.slice(38, 38 + ODS_MIME.length))).toBe(ODS_MIME)
    expect(Object.keys(unzipSync(bytes))).toEqual(
      expect.arrayContaining(['mimetype', 'content.xml', 'styles.xml', 'META-INF/manifest.xml'])
    )
  })

  it('writes numbers as numeric cells with every decimal', () => {
    const numbers = [0.1, 1234.5678, -0.005, 1 / 3, 0.1 + 0.2, 1234567.89, 0, 1e-7, 99999999999.99]
    const bytes = buildOds([numbers])
    expect(cellsOf(bytes)).toEqual([numbers])
    expect(contentOf(bytes)).toContain('office:value-type="float" office:value="1234.5678"')
    expect(contentOf(bytes)).not.toContain('1234,5678')
  })

  it('keeps text as text, also when it looks like a number', () => {
    const row = ['08001', '1,5', 'A & B <c>', 'dues\nlínies', 'a  b', '', null, undefined, true]
    expect(cellsOf(buildOds([row]))).toEqual([
      ['08001', '1,5', 'A & B <c>', 'dues\nlínies', 'a  b', '', '', '', 'true']
    ])
  })
})

describe('excelFormatter.format', () => {
  it('gives the number itself, whatever the "Decimal Excel" of the user', () => {
    for (const user of [{}, { excel_decimal: ',' }, { excel_decimal: '.' }, { excel_decimal: ';' }]) {
      expect(format(user, 1234.5678)).toBe(1234.5678)
      expect(format(user, '12.50')).toBe(12.5)
      expect(format(user, 0)).toBe(0)
      expect(format(user, 0.1 + 0.2)).toBe(0.1 + 0.2)
    }
    expect(format({}, 'abc')).toBe('abc')
    expect(format({}, '')).toBe('')
    expect(format({}, null)).toBe(null)
  })
})

describe('<download-excel>', () => {
  beforeEach(() => download.mockClear())

  const bytesOf = async blob => new Uint8Array(await blob.arrayBuffer())

  it('downloads an .ods with numeric cells', async () => {
    const w = mount(DownloadExcel, {
      props: {
        name: 'tresoreria.xlsx',
        data: [{ concept: 'Factura', total: 1210.55, nested: { vat: 0.21 } }, { concept: 'Nòmina', total: -1500 }],
        fields: {
          concepte: 'concept',
          import: { field: 'total', callback: value => format({ excel_decimal: ',' }, value) },
          iva: 'nested.vat'
        }
      }
    })
    await w.trigger('click')
    await flushPromises()

    expect(download).toHaveBeenCalledTimes(1)
    const [blob, filename, mime] = download.mock.calls[0]
    expect(filename).toBe('tresoreria.ods')
    expect(mime).toBe(ODS_MIME)
    expect(cellsOf(await bytesOf(blob))).toEqual([
      ['concepte', 'import', 'iva'],
      ['Factura', 1210.55, 0.21],
      ['Nòmina', -1500, '']
    ])
  })

  it('adds the extension to a name without one and exports every property without fields', async () => {
    const w = mount(DownloadExcel, { props: { name: 'socies', data: [{ a: 1.5, b: 'x' }] } })
    await w.trigger('click')
    await flushPromises()
    const [blob, filename] = download.mock.calls[0]
    expect(filename).toBe('socies.ods')
    expect(cellsOf(await bytesOf(blob))).toEqual([['a', 'b'], [1.5, 'x']])
  })

  it('still gives the CSV templates of the imports as CSV', async () => {
    const w = mount(DownloadExcel, {
      props: { type: 'csv', escapeCsv: false, name: 'exemple-comandes.csv', data: [{ a: 1, b: 'x' }] }
    })
    await w.trigger('click')
    await flushPromises()
    const [blob, filename, mime] = download.mock.calls[0]
    expect(filename).toBe('exemple-comandes.csv')
    expect(mime).toBe('application/csv')
    expect(strFromU8(await bytesOf(blob))).toBe('a,b\r\n1,x\r\n')
  })
})

describe('Contasol exports', () => {
  it('give amounts as numbers', () => {
    const all = [
      contasolInvoices.getFields(), contasolInvoices.getLinesFields(), contasolInvoices.getReppercutedVATFields(),
      contasolPayableEffects.getFields(), contasolPayableEffects.getSupportedVATFields()
    ]
    let amounts = 0
    for (const fields of all) {
      const callbacks = Object.values(fields).filter(f => f && typeof f.callback === 'function')
      for (const { callback } of callbacks) {
        const out = callback(1234.56)
        expect(out).not.toBe('1234,56')
        if (out === 1234.56) amounts++
      }
    }
    expect(amounts).toBeGreaterThan(0)
  })
})
