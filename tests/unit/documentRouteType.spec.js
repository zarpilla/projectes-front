// issues/123: /document/:id/:type read the type only when the page was
// created, so going in-app from an issued invoice to a quote (or back) loaded
// the new id from the old type's endpoint: a 404 and a blank page, or another
// document with the same id.
import { describe, it, expect } from 'vitest'
import { reactive, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import EmittedInvoiceForm from '@/views/EmittedInvoiceForm.vue'

describe('document page follows the route type (issues/123)', () => {
  it('gives the new type to a fresh document form', async () => {
    const route = reactive({ params: { id: '888', type: 'emitted-invoices' } })
    const mounted = []
    const DocumentForm = { props: ['id', 'type'], template: '<i />', mounted () { mounted.push(this.type) } }
    const wrapper = mount(EmittedInvoiceForm, {
      props: { id: '888' },
      global: { mocks: { $route: route }, stubs: { DocumentForm, TitleBar: true } }
    })
    expect(mounted).toEqual(['emitted-invoices'])

    route.params.type = 'quotes'
    route.params.id = '19'
    await wrapper.setProps({ id: '19' })
    await nextTick()
    expect(wrapper.findComponent(DocumentForm).props('type')).toBe('quotes')
    expect(mounted).toEqual(['emitted-invoices', 'quotes'])
  })
})
