import {
  Chart, ArcElement, BarElement, LineElement, PointElement, CategoryScale,
  LinearScale, Filler, Tooltip, Legend, LineController
} from 'chart.js'
import { htmlTooltip, tooltipFilter, tooltipCleanup } from './tooltip'

// Chart.js 4 is tree-shaken: register what the Bar/Line/Pie wrappers need once
// (LineController: a line dataset inside a bar chart)
Chart.register(ArcElement, BarElement, LineElement, PointElement, CategoryScale,
  LinearScale, Filler, Tooltip, Legend, LineController, tooltipCleanup)

// numbers in Catalan (1.234,5) where a chart does not format them itself
Chart.defaults.locale = 'ca-ES'

// every chart uses the HTML tooltip (./tooltip.js)
Object.assign(Chart.defaults.plugins.tooltip, {
  enabled: false,
  external: htmlTooltip,
  filter: tooltipFilter
})

// axis labels, legends and grid lines follow the light / dark theme
// (src/service/theme.js); the page charts are drawn after it is applied
const applyChartTheme = () => {
  const css = getComputedStyle(document.documentElement)
  const muted = css.getPropertyValue('--a-muted').trim()
  const line = css.getPropertyValue('--a-line').trim()
  if (muted) Chart.defaults.color = muted
  if (line) Chart.defaults.borderColor = line
}
applyChartTheme()
window.addEventListener('themechange', applyChartTheme)
