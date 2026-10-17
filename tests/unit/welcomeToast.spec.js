// issues/116: «Projectes mare» greeted with «Benvinguda» on every visit (a copy
// of the home page's one-time welcome) and the toast covered the table.
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import Buefy from 'buefy'

vi.mock('@/service/index', () => ({ default: () => ({ get: vi.fn(async () => ({ data: [] })) }) }))
import MotherProjectsList from '@/views/MotherProjectsList.vue'

describe('welcome toast (issues/116)', () => {
  it('is not shown by Projectes mare', async () => {
    const open = vi.fn()
    mount(MotherProjectsList, {
      global: { plugins: [createPinia(), Buefy], mocks: { $buefy: { snackbar: { open } } }, stubs: { 'title-bar': true, 'mother-projects-table': true, 'card-widget': true, 'card-component': true, 'download-excel': true } }
    })
    await flushPromises()
    expect(open.mock.calls.map(c => c[0].message)).not.toContain('Benvinguda')
  })
})
