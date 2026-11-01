// «Resum» of a contact: the hours of its projects next to the money, for the
// selected year and for «Històric».
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils'
import Buefy from 'buefy'
import moment from 'moment'
import ContactSummary from '@/components/ContactSummary.vue'

const thisYear = moment().year()
const summary = {
  projects: [
    { id: 1, name: 'Mare', roles: ['client'] },
    { id: 2, name: 'Filla', roles: ['client'] }
  ],
  documents: [],
  hours: [
    { project: 1, projects: [1], date: `${thisYear}-01-01`, hours: 10 },
    { project: 2, projects: [2, 1], date: `${thisYear}-02-01`, hours: 5.5 },
    { project: 2, projects: [2], date: '2020-02-01', hours: 3 }
  ]
}

vi.mock('@/service/index', () => ({
  default: () => ({ get: vi.fn(async () => ({ data: summary })) })
}))
vi.mock('@/service/fiscalYear', () => ({
  loadFiscalSettings: vi.fn(async () => ({ startMonth: 1 }))
}))

async function mountSummary() {
  const wrapper = mount(ContactSummary, {
    props: { contactId: 5 },
    global: { plugins: [Buefy], stubs: { RouterLink: RouterLinkStub } }
  })
  await flushPromises()
  return wrapper
}

const hoursKpi = wrapper => wrapper.findAll('.doc-kpi').find(k => k.text().startsWith('Hores'))
const rowText = (wrapper, name) => wrapper.findAll('.summary-table tbody tr').find(r => r.text().includes(name)).text()

describe('ContactSummary hours', () => {
  it('shows the hours of the year, a mother with those of its children, once in the total', async () => {
    const wrapper = await mountSummary()
    expect(hoursKpi(wrapper).text()).toContain('15,5 h')
    expect(hoursKpi(wrapper).text()).toContain('Històric: 18,5 h')
    expect(rowText(wrapper, 'Mare')).toContain('15,5 h')
    expect(rowText(wrapper, 'Filla')).toContain('5,5 h')
    expect(wrapper.text()).toContain('† Un projecte mare mostra les hores dels seus fills.')
  })

  it('follows the period', async () => {
    const wrapper = await mountSummary()
    await wrapper.setData({ period: 2020 })
    expect(hoursKpi(wrapper).text()).toContain('3 h')
    expect(rowText(wrapper, 'Filla')).toContain('3 h')
    expect(wrapper.text()).not.toContain('† Un projecte')
  })
})
