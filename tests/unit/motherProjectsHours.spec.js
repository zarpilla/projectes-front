// Projectes mare showed hours as 1192.00 (issues/091): they use the app's
// number format like the other lists.
import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Buefy from 'buefy'
import MotherProjectsTable from '@/components/MotherProjectsTable.vue'

describe('MotherProjectsTable hours (issues/091)', () => {
  it('formats real and estimated hours', async () => {
    const w = mount(MotherProjectsTable, {
      props: { projects: [{ id: 1, name: 'Mare', is_mother: true, total_real_hours: 1192, total_estimated_hours: 1500.5 }] },
      global: { plugins: [Buefy], stubs: { 'router-link': { template: '<a><slot /></a>' } } }
    })
    await flushPromises()
    const text = w.text()
    expect(text).toContain('1.192')
    expect(text).toContain('1.500,5')
    expect(text).not.toContain('1192.00')
  })
})
