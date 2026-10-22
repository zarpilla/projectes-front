// 2026-10-22 (with issues/318): generating an invoice PDF takes a few seconds
// and nothing showed meanwhile. The PDF buttons now spin while it is made, a
// second click does not ask it again, and a failure says so.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'

const api = { get: vi.fn() }
vi.mock('@/service/index', () => ({ default: () => api }))
import DocumentForm from '@/components/DocumentForm.vue'

const ctx = () => ({
  entity: 'emitted-invoice',
  form: { id: 884 },
  apiUrl: 'https://api',
  pdf: false,
  pdfLoading: false,
  $buefy: { snackbar: { open: vi.fn() } }
})

beforeEach(() => {
  api.get.mockReset()
  window.open = vi.fn()
})

describe('invoice PDF loading state', () => {
  it('is loading while the PDF is made, once, and opens it after', async () => {
    let resolve
    api.get.mockImplementation(() => new Promise(r => { resolve = r }))
    const vm = ctx()
    const done = DocumentForm.methods.getPDF.call(vm)
    expect(vm.pdfLoading).toBe(true)
    DocumentForm.methods.getPDF.call(vm)
    expect(api.get).toHaveBeenCalledTimes(1)
    resolve({ data: { url: '/uploads/documents/F.pdf' } })
    await done
    expect(vm.pdfLoading).toBe(false)
    expect(window.open).toHaveBeenCalledWith('https://api/uploads/documents/F.pdf')
  })

  it('stops loading and says so when it fails', async () => {
    api.get.mockRejectedValue(new Error('500'))
    const vm = ctx()
    await DocumentForm.methods.getPDF.call(vm)
    await flushPromises()
    expect(vm.pdfLoading).toBe(false)
    expect(window.open).not.toHaveBeenCalled()
    expect(vm.$buefy.snackbar.open).toHaveBeenCalledWith(expect.objectContaining({ type: 'is-danger' }))
  })
})
