// The tooltip of every chart: an HTML box (styles in scss/_redesign.scss,
// .chart-tip) instead of the canvas one, so it follows the theme, aligns the
// values on the right, wraps long names and is never cut by the card around
// the chart. It reads what the chart's tooltip callbacks return (title, label,
// footer), so each chart keeps formatting its own values.

let tip = null
let owner = null

const element = () => {
  if (tip) return tip
  tip = document.createElement('div')
  tip.className = 'chart-tip'
  tip.setAttribute('role', 'tooltip')
  document.body.appendChild(tip)
  // a fixed box would stay behind when the page scrolls under it
  window.addEventListener('scroll', hide, true)
  return tip
}

const hide = () => {
  if (tip) tip.classList.remove('is-visible')
  owner = null
}

const el = (tag, cls, text) => {
  const e = document.createElement(tag)
  if (cls) e.className = cls
  if (text !== undefined) e.textContent = text
  return e
}

// "Fetes: 12,5 h" → name and value in two columns; a line with no name keeps
// it all as the value
const split = line => {
  const i = line.lastIndexOf(': ')
  return i < 0 ? ['', line] : [line.slice(0, i), line.slice(i + 2)]
}

const isTransparent = c => !c || c === 'transparent' || /rgba\(.*,\s*0\)$/.test(c)

const swatch = (point, colors) => {
  const ds = point.dataset
  const isLine = (ds.type || point.chart.config.type) === 'line'
  const s = el('span', isLine ? 'tip-swatch is-line' : 'tip-swatch')
  const color = isLine || isTransparent(colors.backgroundColor) ? colors.borderColor : colors.backgroundColor
  if (isLine) {
    s.style.borderTopColor = color
    if (ds.borderDash && ds.borderDash.length) s.style.borderTopStyle = 'dashed'
  } else {
    s.style.background = color
  }
  return s
}

// pie / doughnut slices also show their share of the visible total
const share = point => {
  const chart = point.chart
  if (!['pie', 'doughnut'].includes(chart.config.type)) return ''
  const total = point.dataset.data.reduce((t, v, i) => t + (chart.getDataVisibility(i) ? Number(v) || 0 : 0), 0)
  if (!total) return ''
  return `${(Number(point.raw) / total * 100).toLocaleString('ca-ES', { maximumFractionDigits: 1 })} %`
}

const row = (name, value, extra, mark) => {
  const r = el('div', 'tip-row')
  if (mark) r.appendChild(mark)
  r.appendChild(el('span', 'tip-name', name))
  r.appendChild(el('span', 'tip-value', value))
  if (extra) r.appendChild(el('span', 'tip-share', extra))
  return r
}

const render = tooltip => {
  const box = el('div')
  const title = tooltip.title.filter(Boolean)
  if (title.length) box.appendChild(el('div', 'tip-title', title.join(' · ')))
  tooltip.body.forEach((body, i) => {
    const point = tooltip.dataPoints[i]
    body.lines.forEach(line => {
      const [name, value] = split(line)
      box.appendChild(row(name, value, share(point), swatch(point, tooltip.labelColors[i])))
    })
  })
  const footer = tooltip.footer.filter(Boolean)
  if (footer.length) {
    const f = el('div', 'tip-footer')
    footer.forEach(line => f.appendChild(row(...split(line))))
    box.appendChild(f)
  }
  return box
}

const GAP = 14
const MARGIN = 8

export const htmlTooltip = ({ chart, tooltip }) => {
  const box = element()
  if (tooltip.opacity === 0) {
    if (owner === chart) hide()
    return
  }
  owner = chart
  box.replaceChildren(render(tooltip))
  box.classList.add('is-visible')

  // beside the point, on the left when there is no room on the right
  const rect = chart.canvas.getBoundingClientRect()
  const x = rect.left + tooltip.caretX
  const y = rect.top + tooltip.caretY
  const { width, height } = box.getBoundingClientRect()
  let left = x + GAP
  if (left + width > window.innerWidth - MARGIN) left = x - GAP - width
  left = Math.max(MARGIN, left)
  const top = Math.min(Math.max(MARGIN, y - height / 2), window.innerHeight - height - MARGIN)
  box.style.left = `${left}px`
  box.style.top = `${top}px`
}

// a stacked or index tooltip lists only the series with a value at that
// point; when all of them are zero it shows them all
const empty = item => item.raw === null || item.raw === undefined || Number.isNaN(item.raw)
const zero = item => item.raw === 0
export const tooltipFilter = (item, i, items) =>
  !empty(item) && (!zero(item) || items.every(it => empty(it) || zero(it)))

// a chart that goes away (route change, re-render) takes its tooltip with it
export const tooltipCleanup = {
  id: 'htmlTooltipCleanup',
  afterDestroy (chart) {
    if (owner === chart) hide()
  }
}
