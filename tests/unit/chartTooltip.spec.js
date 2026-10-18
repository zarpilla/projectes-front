import { describe, it, expect, beforeEach } from 'vitest'
import { htmlTooltip, tooltipFilter, tooltipCleanup } from '@/components/Charts/tooltip'

const canvas = { getBoundingClientRect: () => ({ left: 100, top: 50 }) }
const chart = (type = 'bar', data = [3, 1]) => ({ canvas, config: { type }, getDataVisibility: () => true, data })

const point = (c, dataset, raw) => ({ chart: c, dataset, raw })

const show = (c, { title = [], lines, footer = [], points, colors }) => htmlTooltip({
  chart: c,
  tooltip: {
    opacity: 1,
    caretX: 20,
    caretY: 30,
    title,
    footer,
    body: lines.map(l => ({ before: [], lines: [l], after: [] })),
    dataPoints: points,
    labelColors: colors || points.map(() => ({ backgroundColor: '#00876F', borderColor: '#00876F' }))
  }
})

const tip = () => document.querySelector('.chart-tip')

describe('chart tooltip', () => {
  beforeEach(() => { tip() && tip().classList.remove('is-visible') })

  it('shows the title, each series with its value on the right and the footer', () => {
    const c = chart()
    const ds = { label: 'Fetes' }
    show(c, {
      title: ['Gener 2026'],
      lines: ['Fetes: 12,5 h', 'Previstes: 10 h'],
      footer: ['Total: 22,5 h'],
      points: [point(c, ds, 12.5), point(c, { label: 'Previstes' }, 10)]
    })
    expect(tip().classList.contains('is-visible')).toBe(true)
    expect(tip().querySelector('.tip-title').textContent).toBe('Gener 2026')
    const rows = [...tip().querySelectorAll('.tip-row')].map(r => [r.querySelector('.tip-name').textContent, r.querySelector('.tip-value').textContent])
    expect(rows).toEqual([['Fetes', '12,5 h'], ['Previstes', '10 h'], ['Total', '22,5 h']])
    expect(tip().style.left).toBe('134px')
  })

  it('keeps names from the data as text, not markup', () => {
    const c = chart()
    show(c, { title: ['<b>x</b>'], lines: ['<img src=x>: 1'], points: [point(c, {}, 1)] })
    expect(tip().querySelector('img')).toBeNull()
    expect(tip().querySelector('.tip-name').textContent).toBe('<img src=x>')
  })

  it('draws a dashed line swatch for a dashed line series', () => {
    const c = chart()
    show(c, {
      lines: ['Previstes acumulades: 40 h'],
      points: [point(c, { type: 'line', borderDash: [6, 4] }, 40)],
      colors: [{ backgroundColor: 'transparent', borderColor: 'rgb(31, 42, 46)' }]
    })
    const s = tip().querySelector('.tip-swatch')
    expect(s.classList.contains('is-line')).toBe(true)
    expect(s.style.borderTopStyle).toBe('dashed')
  })

  it('adds the share of the total to a pie slice', () => {
    const ds = { data: [3, 1] }
    const c = chart('pie')
    show(c, { title: ['Projecte A'], lines: ['3 h'], points: [point(c, ds, 3)] })
    expect(tip().querySelector('.tip-share').textContent).toBe('75 %')
  })

  it('hides when its chart is destroyed', () => {
    const c = chart()
    show(c, { lines: ['1'], points: [point(c, {}, 1)] })
    tooltipCleanup.afterDestroy(c)
    expect(tip().classList.contains('is-visible')).toBe(false)
  })

  it('lists only the series with a value, or all of them when every one is zero', () => {
    const items = [{ raw: 0 }, { raw: 5 }, { raw: null }]
    expect(items.filter((it, i) => tooltipFilter(it, i, items))).toEqual([{ raw: 5 }])
    const zeros = [{ raw: 0 }, { raw: 0 }, { raw: null }]
    expect(zeros.filter((it, i) => tooltipFilter(it, i, zeros))).toEqual([{ raw: 0 }, { raw: 0 }])
  })
})
