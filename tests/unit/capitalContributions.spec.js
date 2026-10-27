// A contact's capital contributions become a list (2026-10-25): the rows as
// they are saved, their total, and the editor used by the contact form and the
// energy community's member form.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Buefy from 'buefy'
import CapitalContributions from '@/components/CapitalContributions.vue'
import { cleanContributions, contributionsTotal, contributionError, sortContributions } from '@/domain/capitalContributions'

describe('capital contributions', () => {
  it('cleans the rows: empty ones dropped, comma amounts, ids kept', () => {
    expect(cleanContributions([
      { id: 3, date: '2024-04-27', amount: '100', comment: ' Alta ' },
      { date: '', amount: '', comment: '' },
      { date: '2025-03-01T00:00:00', amount: '50,5', comment: '' },
      null
    ])).toEqual([
      { id: 3, date: '2024-04-27', amount: 100, comment: 'Alta' },
      { date: '2025-03-01', amount: 50.5, comment: null }
    ])
    expect(() => cleanContributions([{ amount: 'abc' }])).toThrow('número')
  })

  it('adds them up and flags a wrong amount', () => {
    expect(contributionsTotal([{ amount: '100' }, { amount: '50,25' }, { amount: '' }])).toBe(150.25)
    expect(contributionError({ amount: 'x' })).toBeTruthy()
    expect(contributionError({ amount: '' })).toBe(null)
  })

  it('lists them oldest first, undated last', () => {
    expect(sortContributions([{ date: null }, { date: '2025-01-01' }, { date: '2024-01-01' }]).map(r => r.date))
      .toEqual(['2024-01-01', '2025-01-01', null])
  })

  it('the editor adds, changes and removes rows through v-model', async () => {
    const wrapper = mount(CapitalContributions, {
      props: { modelValue: [{ id: 1, date: '2024-04-27', amount: 100, comment: 'Alta' }] },
      global: { plugins: [Buefy] }
    })
    expect(wrapper.text()).not.toContain('Total')
    await wrapper.findAll('button').find(b => b.text().includes('Afegeix')).trigger('click')
    const added = wrapper.emitted('update:modelValue').at(-1)[0]
    expect(added).toHaveLength(2)
    expect(added[1]).toMatchObject({ amount: '', comment: '' })

    await wrapper.setProps({ modelValue: [...added.slice(0, 1), { ...added[1], amount: '50' }] })
    expect(wrapper.text()).toContain('Total')
    await wrapper.find('button[aria-label="Treu l\'aportació"]').trigger('click')
    expect(wrapper.emitted('update:modelValue').at(-1)[0]).toEqual([{ ...added[1], amount: '50' }])
  })
})

describe('the contact form payload', async () => {
  const { contactPayload } = await import('@/domain/capitalContributions')
  it('leaves out the old amount and date and cleans the contributions', () => {
    expect(contactPayload({ name: 'X', partner_amount: 999, partner_amount_date: new Date(), capital_contributions: [{ amount: '5', date: '', comment: '' }] }))
      .toEqual({ name: 'X', capital_contributions: [{ date: null, amount: 5, comment: null }] })
    expect(contactPayload({ name: 'Y' })).toEqual({ name: 'Y', capital_contributions: [] })
  })
})
