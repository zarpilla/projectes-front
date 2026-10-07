import { h } from 'vue'
import { Bar } from 'vue-chartjs'
import './register'

// <bar-chart :chart-data :extra-options chart-id> on top of vue-chartjs 5; the
// chart re-renders whenever chart-data or extra-options change.
export default {
  name: 'bar-chart',
  props: {
    chartData: Object,
    extraOptions: Object,
    chartId: String
  },
  render () {
    return h('div', { style: 'position: relative' }, this.chartData
      ? [h(Bar, { id: this.chartId, data: this.chartData, options: this.extraOptions || {} })]
      : [])
  }
}
