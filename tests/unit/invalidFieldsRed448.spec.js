// issues/448: a field in error must show in red, and the delivery point form
// must say which fields to fix instead of a bare «Hi ha camps incorrectes»
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import Buefy from 'buefy'
import * as sass from 'sass'
import { pointFieldErrors, pointErrorsSnackbar } from '@/domain/deliveryPointForm.js'

describe('the redesign keeps fields in error red (issues/448)', () => {
  // the redesign pins border-color on every input/select; Bulma 1 only turns
  // is-danger red through its variables, so the red was lost on every form
  const css = sass.compile('src/scss/_redesign.scss', { loadPaths: ['src/scss', 'node_modules'] }).css.replace(/\/\*[\s\S]*?\*\//g, '')
  const ruleFor = selector => {
    const rule = css.split('}').find(r => r.split('{')[0].split(',').map(x => x.trim()).includes(selector))
    return rule ? rule.split('{')[1] : ''
  }

  it.each(['.input.is-danger', '.textarea.is-danger', '.select.is-danger select'])('%s has a red border', selector => {
    expect(ruleFor(selector)).toContain('border-color: var(--a-danger-fg)')
  })

  it('its help text is red', () => {
    expect(ruleFor('.help.is-danger')).toContain('color: var(--a-danger-fg)')
  })
})

describe('field messages of the delivery point form (issues/448)', () => {
  it('names each field to fix', () => {
    const errors = { city: true, nif: true, phone: true, sector: false }
    expect(pointErrorsSnackbar(errors)).toBe('Revisa els camps en vermell: Població, NIF i Telèfon')
    expect(pointErrorsSnackbar({})).toBe('')
  })

  it('gives a message per field, with the slot errors of each slot', () => {
    const out = pointFieldErrors(
      { sector: true, time_slot_1_ini: true, time_slot_2_ini: true, postcode: true },
      [{ time_slot_1_ini: 'El tram horari 1 ha de ser mínim de 3 hores' }, { time_slots: 'Cal indicar com a mínim un tram horari de 3 hores' }],
      { postcodeMessage: 'CP de 5 xifres' }
    )
    expect(out).toEqual({
      sector: 'Tria un sector',
      time_slot_1_ini: 'El tram horari 1 ha de ser mínim de 3 hores',
      time_slot_2_ini: 'Cal indicar com a mínim un tram horari de 3 hores',
      postcode: 'CP de 5 xifres'
    })
  })
})

const get = vi.fn(async url => {
  if (url === 'users/me') return { data: { id: 3, permissions: [{ permission: 'orders' }] } }
  if (url === 'sectors') return { data: [{ id: 2, name: 'Restauració' }, { id: 5, name: 'Particular' }] }
  if (url.startsWith('cities?')) return { data: [{ id: 1, name: 'Artés' }] }
  return { data: [] }
})
const post = vi.fn()
vi.mock('@/service/index', () => ({ default: () => ({ get, put: vi.fn(), post, delete: vi.fn() }) }))
import ContactsUserForm from '@/components/ContactsUserForm.vue'

describe('saving an incomplete delivery point (issues/448)', () => {
  it('marks the missing fields in red with a message, and clears each one once fixed', async () => {
    const wrapper = mount(ContactsUserForm, {
      props: { modal: true },
      global: { plugins: [Buefy, createPinia()], stubs: { 'router-link': true }, mocks: { $route: { params: {}, query: {} } } }
    })
    await flushPromises()
    Element.prototype.scrollIntoView = vi.fn() // not in jsdom
    const snackbar = vi.spyOn(wrapper.vm.$buefy.snackbar, 'open').mockImplementation(() => {})

    const saved = await wrapper.vm.submit()
    await flushPromises()
    expect(saved).toBe(false)
    expect(post).not.toHaveBeenCalled()
    expect(snackbar.mock.calls[0][0].message).toMatch(/^Revisa els camps en vermell: .*Població.*NIF.*Telèfon/)

    const field = label => wrapper.findAll('.field').find(f => f.find('label.label').exists() && f.find('label.label').text().startsWith(label))
    expect(field('Adreça').find('input').classes()).toContain('is-danger')
    expect(field('Adreça').find('.help.is-danger').text()).toBe("Indica l'adreça")
    expect(field('Sector').find('.help.is-danger').text()).toBe('Tria un sector')
    expect(field('Horari de contacte 1').find('.select').classes()).toContain('is-danger')
    expect(field('Horari de contacte 1').text()).toContain('Cal indicar com a mínim un tram horari de 3 hores')

    wrapper.vm.form.address = 'Carrer Major, 1'
    wrapper.vm.form.time_slot_1_ini = 8
    wrapper.vm.form.time_slot_1_end = 14
    await flushPromises()
    expect(field('Adreça').find('input').classes()).not.toContain('is-danger')
    expect(field('Adreça').find('.help.is-danger').exists()).toBe(false)
    expect(field('Horari de contacte 1').find('.select').classes()).not.toContain('is-danger')
    expect(field('NIF').find('input').classes()).toContain('is-danger')
  })
})
