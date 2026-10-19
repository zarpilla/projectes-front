// Saving an order or a delivery point with a wrong field brings that field into
// view (e.g. «Els valors de caixes i kilos han de ser positius»).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { scrollToField } from '@/helpers/scrollToField.js'
import { orderProblemField } from '@/domain/orderValidation.js'

function form (html) {
  const root = document.createElement('form')
  root.innerHTML = html
  document.body.appendChild(root)
  return root
}

describe('scrollToField', () => {
  let scrolled
  beforeEach(() => {
    document.body.innerHTML = ''
    scrolled = []
    Element.prototype.scrollIntoView = vi.fn(function () { scrolled.push(this) })
  })

  it('scrolls to the field asked for and focuses its input', async () => {
    const root = form(`
      <div class="field" data-field="contact"><input></div>
      <div class="field" data-field="units"><input id="units"></div>`)
    await scrollToField(() => root, '[data-field="units"]')
    expect(scrolled).toEqual([root.querySelector('[data-field="units"]')])
    expect(document.activeElement.id).toBe('units')
  })

  it('falls back to the first field marked is-danger', async () => {
    const root = form(`
      <div class="field"><input></div>
      <div class="field" id="phone"><input class="is-danger"></div>`)
    await scrollToField(() => root, '[data-field="missing"]')
    expect(scrolled).toEqual([root.querySelector('#phone')])
  })

  it('does not focus an autocomplete, so its list stays closed', async () => {
    const root = form('<div class="field" data-field="contact"><div class="autocomplete"><input id="c"></div></div>')
    await scrollToField(() => root, '[data-field="contact"]')
    expect(scrolled).toHaveLength(1)
    expect(document.activeElement.id).not.toBe('c')
  })

  it('does nothing when the form is not on screen', async () => {
    await scrollToField(() => null, '[data-field="units"]')
    expect(scrolled).toEqual([])
  })
})

describe('orderProblemField', () => {
  const positive = 'Error. Els valors de caixes i kilos han de ser positius'
  it('points the boxes/kilograms error at the wrong one', () => {
    expect(orderProblemField(positive, { units: 0, kilograms: 5 }, false)).toBe('units')
    expect(orderProblemField(positive, { units: 2, kilograms: -1 }, false)).toBe('kilograms')
    expect(orderProblemField(positive, { units: 0, kilograms: 0 }, true)).toBe('lines')
  })
  it('points the collection errors at their fields and the rest at the delivery point', () => {
    expect(orderProblemField('Error. Has de seleccionar un punt de recollida en finca', {}, false)).toBe('collection_point')
    expect(orderProblemField('Error. Has de seleccionar una ruta de recollida', {}, false)).toBe('collection_pickup_route')
    expect(orderProblemField("Error. No hi ha NIF al punt d'entrega", {}, false)).toBe('contact')
  })
})
