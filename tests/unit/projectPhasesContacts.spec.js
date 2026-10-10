// issues/016: every ProjectPhases block fetched the whole contact list for
// itself — three requests of it to open one project. A parent that already has
// the list passes it down; without one the block still fetches its own.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const get = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ get }) }))

import ProjectPhases from '@/components/ProjectPhases.vue'

const contactRequests = () => get.mock.calls.filter(([url]) => url.startsWith('contacts/basic'))

const mountPhases = props =>
  shallowMount(ProjectPhases, {
    props: { form: { id: 1 }, projectPhases: [], ...props },
    global: { plugins: [createPinia()] }
  })

describe('ProjectPhases contact list', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    get.mockReset()
    get.mockImplementation(url =>
      Promise.resolve({ data: url.startsWith('contacts/basic') ? [{ id: 9, name: 'Fetched' }] : [] })
    )
  })

  it('uses the list of its parent and does not request it', async () => {
    const wrapper = mountPhases({ contacts: [{ id: 1, name: 'Anna' }] })
    await flushPromises()
    expect(contactRequests()).toHaveLength(0)
    expect(wrapper.vm.clients).toEqual([{ id: 1, name: 'Anna' }])
  })

  it('follows the parent when its list arrives or is refreshed later', async () => {
    const wrapper = mountPhases({ contacts: [] })
    await flushPromises()
    await wrapper.setProps({ contacts: [{ id: 1, name: 'Anna' }, { id: 2, name: 'Berta' }] })
    expect(wrapper.vm.clients.map(c => c.name)).toEqual(['Anna', 'Berta'])
    expect(wrapper.vm.filteredClients).toHaveLength(2)
    expect(contactRequests()).toHaveLength(0)
  })

  it('fetches the list itself when the parent gives none', async () => {
    const wrapper = mountPhases({})
    await flushPromises()
    expect(contactRequests()).toHaveLength(1)
    expect(wrapper.vm.clients).toEqual([{ id: 9, name: 'Fetched' }])
  })
})
