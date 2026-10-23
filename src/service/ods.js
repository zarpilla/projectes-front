// OpenDocument spreadsheet (.ods) writer for the downloads (issues/032).
// Numbers are numeric cells holding their exact value, so the decimals never
// depend on the separator of the program or the locale that opens the file.
import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate'

export const ODS_MIME = 'application/vnd.oasis.opendocument.spreadsheet'

const OFFICE = 'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"'
const XML = '<?xml version="1.0" encoding="UTF-8"?>\n'

const MANIFEST =
  XML +
  '<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">' +
  `<manifest:file-entry manifest:full-path="/" manifest:version="1.2" manifest:media-type="${ODS_MIME}"/>` +
  '<manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>' +
  '<manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>' +
  '</manifest:manifest>'

const STYLES = XML + `<office:document-styles ${OFFICE} office:version="1.2"/>`

const escapeXml = text =>
  text
    // characters XML 1.0 does not allow
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

// one paragraph of a text cell; ODF collapses repeated spaces unless they are <text:s>
const paragraph = line =>
  '<text:p>' +
  escapeXml(line)
    .replace(/\t/g, '<text:tab/>')
    .replace(/^ /, '<text:s/>')
    .replace(/ {2,}/g, spaces => ` <text:s text:c="${spaces.length - 1}"/>`) +
  '</text:p>'

const cell = value => {
  if (value === null || value === undefined || value === '') return '<table:table-cell/>'
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<table:table-cell office:value-type="float" office:value="${value}"><text:p>${value}</text:p></table:table-cell>`
  }
  const lines = String(value).split(/\r\n|\r|\n/)
  return `<table:table-cell office:value-type="string">${lines.map(paragraph).join('')}</table:table-cell>`
}

// rows: array of arrays of cell values (the header row included). Returns the file as a Uint8Array.
export const buildOds = (rows, sheetName = 'Sheet1') => {
  const columns = Math.max(1, ...rows.map(row => row.length))
  // characters a sheet name cannot have
  const name = escapeXml(String(sheetName).replace(/[[\]*?:/\\']/g, ' ')) || 'Sheet1'
  const content =
    XML +
    `<office:document-content ${OFFICE}` +
    ' xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"' +
    ' xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" office:version="1.2">' +
    '<office:body><office:spreadsheet>' +
    `<table:table table:name="${name}">` +
    `<table:table-column table:number-columns-repeated="${columns}"/>` +
    rows.map(row => '<table:table-row>' + row.map(cell).join('') + '</table:table-row>').join('') +
    '</table:table>' +
    '</office:spreadsheet></office:body></office:document-content>'

  // every entry as [data, options]: fflate takes anything else for a folder when
  // the bytes come from another realm (jsdom in the tests)
  const file = text => [strToU8(text), {}]
  return zipSync({
    // must be the first entry and stored without compression
    mimetype: [strToU8(ODS_MIME), { level: 0 }],
    'content.xml': file(content),
    'styles.xml': file(STYLES),
    'META-INF/manifest.xml': file(MANIFEST)
  })
}

// --- reader (issues/320) ------------------------------------------------------
// The first sheet of an .ods as rows of cell values: numbers for numeric cells,
// "HH:MM" for time cells, "YYYY-MM-DD" for dates, text otherwise ("" if empty).
// Trailing empty cells and rows are dropped; LibreOffice repeats empty columns
// and rows by the thousand.

const TABLE_NS = 'urn:oasis:names:tc:opendocument:xmlns:table:1.0'
const OFFICE_NS = 'urn:oasis:names:tc:opendocument:xmlns:office:1.0'
const TEXT_NS = 'urn:oasis:names:tc:opendocument:xmlns:text:1.0'
const MAX_REPEAT = 1000

// the text of a <text:p>, with its spaces, tabs and line breaks
const nodeText = node => {
  let out = ''
  for (const child of node.childNodes) {
    if (child.nodeType === 3) out += child.nodeValue
    else if (child.nodeType === 1) {
      if (child.namespaceURI === TEXT_NS && child.localName === 's') out += ' '.repeat(Number(child.getAttributeNS(TEXT_NS, 'c')) || 1)
      else if (child.namespaceURI === TEXT_NS && child.localName === 'tab') out += '\t'
      else if (child.namespaceURI === TEXT_NS && child.localName === 'line-break') out += '\n'
      else out += nodeText(child)
    }
  }
  return out
}

// "PT09H10M00S" (or "PT33H…" past midnight) → "09:10"
const durationTime = value => {
  const m = /^-?P(?:\d+D)?T(\d+)H(\d+)M/.exec(value || '')
  if (!m) return ''
  return `${String(Number(m[1]) % 24).padStart(2, '0')}:${m[2].padStart(2, '0')}`
}

const cellValue = cell => {
  const type = cell.getAttributeNS(OFFICE_NS, 'value-type')
  if (['float', 'percentage', 'currency'].includes(type)) return Number(cell.getAttributeNS(OFFICE_NS, 'value'))
  if (type === 'time') return durationTime(cell.getAttributeNS(OFFICE_NS, 'time-value'))
  if (type === 'date') return (cell.getAttributeNS(OFFICE_NS, 'date-value') || '').slice(0, 10)
  if (type === 'boolean') return cell.getAttributeNS(OFFICE_NS, 'boolean-value') === 'true'
  const paragraphs = [...cell.childNodes].filter(n => n.nodeType === 1 && n.namespaceURI === TEXT_NS && n.localName === 'p')
  return paragraphs.map(nodeText).join('\n')
}

const isEmpty = value => value === '' || value === null || value === undefined

const trimEnd = list => {
  let end = list.length
  while (end > 0 && (Array.isArray(list[end - 1]) ? !list[end - 1].length : isEmpty(list[end - 1]))) end--
  return list.slice(0, end)
}

// bytes: Uint8Array or ArrayBuffer of the .ods. Throws if it is not one.
export const readOds = bytes => {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let files
  try {
    files = unzipSync(data, { filter: file => file.name === 'content.xml' })
  } catch (e) {
    throw new Error('El fitxer no és un full de càlcul .ods')
  }
  if (!files['content.xml']) throw new Error('El fitxer no és un full de càlcul .ods')
  const doc = new DOMParser().parseFromString(strFromU8(files['content.xml']), 'application/xml')
  const table = doc.getElementsByTagNameNS(TABLE_NS, 'table')[0]
  if (!table) return []
  const rows = []
  for (const row of table.getElementsByTagNameNS(TABLE_NS, 'table-row')) {
    const cells = []
    for (const cell of row.childNodes) {
      if (cell.nodeType !== 1 || cell.namespaceURI !== TABLE_NS) continue
      if (cell.localName !== 'table-cell' && cell.localName !== 'covered-table-cell') continue
      const value = cell.localName === 'table-cell' ? cellValue(cell) : ''
      const repeat = Math.min(Number(cell.getAttributeNS(TABLE_NS, 'number-columns-repeated')) || 1, MAX_REPEAT)
      for (let i = 0; i < repeat; i++) cells.push(value)
    }
    const values = trimEnd(cells)
    const repeat = Number(row.getAttributeNS(TABLE_NS, 'number-rows-repeated')) || 1
    // an empty row repeated a million times is the rest of the sheet
    for (let i = 0; i < (values.length ? Math.min(repeat, MAX_REPEAT) : Math.min(repeat, 1)); i++) rows.push(values)
  }
  return trimEnd(rows)
}
