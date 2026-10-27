// Cerca DIR3 opened from a contact with a NIF: the NIF is filled in and searched.
import { describe, it, expect, vi, beforeEach } from 'vitest'
const get = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ get }) }))
import ModalBoxDir3 from '@/components/ModalBoxDir3.vue'

const open = (props) => {
  const vm = { ...ModalBoxDir3.data(), ...ModalBoxDir3.methods, ...props, $emit: vi.fn() }
  for (const k of Object.keys(ModalBoxDir3.methods)) vm[k] = ModalBoxDir3.methods[k].bind(vm)
  ModalBoxDir3.watch.isActive.call(vm, true)
  return vm
}

describe('ModalBoxDir3 with the contact NIF', () => {
  beforeEach(() => {
    get.mockReset()
    get.mockResolvedValue({ data: { success: true, results: [{ og: { code: 'U02200001' } }] } })
  })

  it('fills in the NIF and searches by NIF on open', async () => {
    const vm = open({ nif: ' Q0818002H ', searchType: 'name' })
    expect(vm.searchType).toBe('nif')
    expect(vm.searchQuery).toBe('Q0818002H')
    expect(get).toHaveBeenCalledWith('me/dir3/search/nif/Q0818002H')
    await vi.waitFor(() => expect(vm.results).toHaveLength(1))
  })

  it('opens empty and does not search without a NIF', () => {
    const vm = open({ nif: '' })
    expect(vm.searchQuery).toBe('')
    expect(get).not.toHaveBeenCalled()
  })
})
