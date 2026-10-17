// issues/088: the Verifactu register had two «Accions» columns, one with the
// record kind (none/replacement) in raw and one with the edit button.
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import Buefy from 'buefy'

const get = vi.fn(async () => ({ data: [
  { id: 1, hash: 'a'.repeat(64), actions: 'none' },
  { id: 2, hash: 'b'.repeat(64), actions: 'replacement' }
] }))
vi.mock('@/service/index', () => ({ default: () => ({ get }) }))
import VerifactuChainList from '@/components/VerifactuChainList.vue'

describe('VerifactuChainList columns (issues/088)', () => {
  it('has one column per meaning and names the record kind', async () => {
    const w = mount(VerifactuChainList, {
      global: { plugins: [createPinia(), Buefy], stubs: { 'router-link': { template: '<a><slot /></a>' } } }
    })
    await flushPromises()
    const headers = w.findAll('th').map(th => th.text()).filter(Boolean)
    expect(headers.filter(h => h === 'Accions')).toHaveLength(0)
    expect(new Set(headers).size).toBe(headers.length)
    expect(headers).toContain('Tipus de registre')
    expect(w.text()).toContain('Substitució')
    expect(w.text()).not.toContain('replacement')
  })
})
