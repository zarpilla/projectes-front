// OpenDocument spreadsheet (.ods) writer for the downloads (issues/032).
// Numbers are numeric cells holding their exact value, so the decimals never
// depend on the separator of the program or the locale that opens the file.
import { zipSync, strToU8 } from 'fflate'

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
