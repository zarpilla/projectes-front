// The attachments of a project or an invoice as a table: a small thumbnail for
// images, a file-type icon for the rest, name, size and upload date.
import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Buefy from 'buefy'

import AttachmentsTable, { fileKind, fileSize } from '@/components/AttachmentsTable.vue'
import FileUpload from '@/components/FileUpload.vue'

const API = 'https://api.example.test'

const pdf = {
  id: 1, name: 'SERV_2026_10761-1_SomConnexio-Gener.pdf', ext: '.pdf', mime: 'application/pdf',
  size: 245.4, url: '/uploads/serv_2026.pdf', createdAt: '2026-03-12T10:15:00.000Z'
}
const photo = {
  id: 2, name: 'logo.png', ext: '.png', mime: 'image/png', size: 3150.2,
  url: '/uploads/logo.png', createdAt: '2026-01-05T09:00:00.000Z',
  formats: { thumbnail: { url: '/uploads/thumbnail_logo.png' } }
}
const sheet = { id: 3, name: 'pressupost.xlsx', ext: '.xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: 0.4, url: '/uploads/p.xlsx' }

const mountTable = documents => mount(AttachmentsTable, {
  props: { documents, apiUrl: API },
  global: { plugins: [Buefy] }
})

describe('AttachmentsTable', () => {
  it('draws nothing without attachments', () => {
    expect(mountTable([]).find('table').exists()).toBe(false)
  })

  it('lists one row per file, with name, size and date', () => {
    const rows = mountTable([pdf, photo, sheet]).findAll('tbody tr')
    expect(rows).toHaveLength(3)

    const link = rows[0].find('.att-name a')
    expect(link.text()).toBe(pdf.name)
    expect(link.attributes('href')).toBe(API + pdf.url)
    expect(link.attributes('target')).toBe('_blank')
    expect(rows[0].find('td.att-size').text()).toBe('245 kB')
    expect(rows[0].find('td.att-date').text()).toBe('12/03/2026')
    expect(rows[0].find('.att-meta').text()).toBe('PDF · 245 kB · 12/03/2026')

    expect(rows[1].find('td.att-size').text()).toBe('3,1 MB')
    expect(rows[2].find('td.att-date').text()).toBe('')
  })

  it("shows images as a small thumbnail, Strapi's small format when there is one", () => {
    const rows = mountTable([photo, { ...photo, id: 4, formats: null }]).findAll('tbody tr')
    expect(rows[0].find('img').attributes('src')).toBe(API + '/uploads/thumbnail_logo.png')
    expect(rows[1].find('img').attributes('src')).toBe(API + '/uploads/logo.png')
  })

  it('shows the file type icon for anything else, and for an image the browser cannot draw', async () => {
    const w = mountTable([pdf, sheet, photo])
    const rows = w.findAll('tbody tr')
    expect(rows[0].find('img').exists()).toBe(false)
    expect(rows[0].find('.att-icon').classes()).toContain('is-pdf')
    expect(rows[0].find('.mdi-file-pdf').exists()).toBe(true)
    expect(rows[1].find('.mdi-file-excel').exists()).toBe(true)

    await rows[2].find('img').trigger('error')
    expect(w.findAll('tbody tr')[2].find('img').exists()).toBe(false)
    expect(w.findAll('tbody tr')[2].find('.mdi-file-image').exists()).toBe(true)
  })

  it('asks the form to drop a file', async () => {
    const w = mountTable([pdf, photo])
    await w.findAll('.att-remove')[1].trigger('click')
    expect(w.emitted('remove')).toEqual([[photo]])
  })
})

describe('AttachmentsTable pending files (a task uploads them when saved)', () => {
  it('lists them last, marked as pending, and drops one by index', async () => {
    const file = new File(['x'.repeat(5000)], 'acta.docx')
    const w = mount(AttachmentsTable, {
      props: { documents: [pdf], pending: [file], apiUrl: API },
      global: { plugins: [Buefy] }
    })
    const rows = w.findAll('tbody tr')
    expect(rows).toHaveLength(2)
    expect(rows[1].classes()).toContain('is-pending')
    expect(rows[1].find('a').exists()).toBe(false)
    expect(rows[1].find('.att-file').text()).toBe('acta.docx')
    expect(rows[1].find('td.att-size').text()).toBe('5 kB')
    expect(rows[1].find('.att-meta').text()).toBe('5 kB · pendent de pujar')

    await rows[1].find('.att-remove').trigger('click')
    expect(w.emitted('remove-pending')).toEqual([[0]])
    expect(w.emitted('remove')).toBeUndefined()
  })

  it('shows the table with only pending files', () => {
    const w = mount(AttachmentsTable, {
      props: { pending: [new File(['x'], 'a.pdf')] },
      global: { plugins: [Buefy] }
    })
    expect(w.findAll('tbody tr')).toHaveLength(1)
  })
})

describe('fileKind / fileSize', () => {
  it('knows the usual office files by extension', () => {
    expect(fileKind({ name: 'a.DOCX' }).icon).toBe('file-word')
    expect(fileKind({ ext: '.ods' }).icon).toBe('file-excel')
    expect(fileKind({ ext: '.pptx' }).icon).toBe('file-powerpoint')
    expect(fileKind({ ext: '.zip' }).icon).toBe('folder-zip')
    expect(fileKind({ ext: '.xsig' }).icon).toBe('file-code')
    expect(fileKind({ ext: '.pdf', mime: 'application/octet-stream' }).icon).toBe('file-pdf')
    expect(fileKind({ ext: '.weird' }).icon).toBe('file-document-outline')
    expect(fileKind({}).icon).toBe('file-document-outline')
  })

  it('writes sizes in kB or MB, never "0 kB"', () => {
    expect(fileSize(0.2)).toBe('1 kB')
    expect(fileSize(1023.4)).toBe('1023 kB')
    expect(fileSize(2048)).toBe('2 MB')
    expect(fileSize(undefined)).toBe('')
  })
})

describe('FileUpload compact', () => {
  it('is one line under an attachments list, and keeps the big box elsewhere', async () => {
    const compact = mount(FileUpload, { props: { compact: true }, global: { plugins: [Buefy] } })
    const big = mount(FileUpload, { global: { plugins: [Buefy] } })
    await flushPromises() // the drop box shows once mounted
    expect(compact.find('.dropbox').classes()).toContain('is-compact')
    expect(compact.find('.dropbox p').text()).toBe('Arrossega arxius aquí o fes clic')

    expect(big.find('.dropbox').classes()).not.toContain('is-compact')
    expect(big.find('.dropbox p').html()).toContain('<br>')
  })
})
