// issues/108: screens without data showed an empty frame (pivots, the
// Verifactu register, the FACe queue, Justificacions, Rutes i dies) or said
// «coincideix amb la cerca» when nothing had been searched.
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import Buefy from 'buefy'

const get = vi.fn(async () => ({ data: [] }))
vi.mock('@/service/index', () => ({ default: () => ({ get }) }))
import VerifactuChainList from '@/components/VerifactuChainList.vue'
import UsersTable from '@/components/UsersTable.vue'

const global = { plugins: [createPinia(), Buefy], stubs: { 'router-link': true, 'download-excel': true } }

describe('empty states (issues/108)', () => {
  it('the Verifactu register says it is empty', async () => {
    const w = mount(VerifactuChainList, { global })
    await flushPromises()
    expect(w.text()).toContain('Encara no hi ha cap factura registrada a Verifactu.')
  })

  it('«coincideix amb la cerca» only after a search', async () => {
    const w = mount(UsersTable, { global })
    await flushPromises()
    expect(w.text()).toContain('Encara no hi ha cap sòcia.')
    await w.setData({ search: 'xyz' })
    expect(w.text()).toContain('Cap sòcia coincideix amb la cerca.')
  })
})
