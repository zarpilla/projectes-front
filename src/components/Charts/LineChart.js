import { h } from 'vue'
import { Line } from 'vue-chartjs'
import './register'

// <line-chart :chart-data :extra-options chart-id> on top of vue-chartjs 5; the
// chart re-renders whenever chart-data or extra-options change.
export default {
  name: 'line-chart',
  props: {
    chartData: Object,
    extraOptions: Object,
    chartId: String
  },
  render () {
    return h('div', { style: 'position: relative' }, this.chartData
      ? [h(Line, { id: this.chartId, data: this.chartData, options: this.extraOptions || {} })]
      : [])
  }
}
