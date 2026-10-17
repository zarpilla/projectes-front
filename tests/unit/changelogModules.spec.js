// Every changelog entry says which modules it touches, so the Registre de
// canvis can be filtered by module.
import { describe, it, expect } from 'vitest'
import { CHANGELOG, CHANGELOG_MODULES } from '@/service/changelog'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import Buefy from 'buefy'
import ChangeLog from '@/views/ChangeLog.vue'

describe('changelog modules', () => {
  it('every item has at least one known module', () => {
    CHANGELOG.flatMap(e => e.items).forEach(item => {
      expect(item.modules?.length).toBeGreaterThan(0)
      item.modules.forEach(m => expect(CHANGELOG_MODULES).toContain(m))
    })
  })
})

describe('Registre de canvis filtered by module', () => {
  it('shows only the items that touch the chosen module', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: { template: '<div/>' } }] })
    await router.push('/')
    const wrapper = mount(ChangeLog, { global: { plugins: [router, Buefy] } })
    const items = () => wrapper.findAll('.news-day li')
    const all = items().length
    await wrapper.find('.filter-select select').setValue('Logística')
    expect(items().length).toBeGreaterThan(0)
    expect(items().length).toBeLessThan(all)
    items().forEach(li => expect(li.find('.news-modules').text()).toContain('Logística'))
  })
})
