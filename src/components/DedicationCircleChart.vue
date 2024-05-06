<template>
  <div>
      <card-component
      class="mt-5"
        :title="`Dedicació x ${title}`">
        <div v-if="mainChart.chartData && !isLoading && mainChart.chartData" class="chart-area">
          <div class="columns">
            <div class="column">
              <pie-chart
                ref="mainChart"
                style="height: 500px;"
                :chart-id="`big-${table}-${field}-chart`"
                :chart-data="mainChart.chartData"
                :extra-options="mainChart.extraOptions"
              >
              </pie-chart>
            </div>
            <div class="column">
              <div class="projects-bars">
                <div>
                  {{ 'Total' }}: {{ hoursTotal.toFixed(2) }}h
                </div>
                <kk-progress :color="'#bbb'" :percent="100" :line-height="16" />
              </div>
              <div v-for="(p, i) in distinctDataObj" v-bind:key="i" class="projects-bars">
                <div>
                  {{ p.name ? p.name : 'Sense assignar' }}: {{ p.hours.toFixed(2) }}h
                </div>
                <kk-progress v-if="!isLoading" :color="getChartColor(i)" :percent="p.pct" :line-height="16" />
              </div>
            </div>
          </div>
        </div>
      </card-component>
  </div>
</template>

<script>
import PieChart from '@/components/Charts/PieChart'
import uniq from 'lodash/uniq'
import map from 'lodash/map'
import sumBy from 'lodash/sumBy'
import orderBy from 'lodash/orderBy'
import moment from 'moment'
import CardComponent from '@/components/CardComponent'
import * as chartConfig from '@/components/Charts/chart.config'

moment.locale('ca')

export default {
  name: 'DedicationCircleChart',
  components: { CardComponent, PieChart },
  props: {
    title: {
      type: String,
      default: null
    },
    activities: {
      type: Array,
      default: null
    },
    field: {
      type: String,
      default: null
    },
    table: {
      type: String,
      default: null
    }
  },
  data () {
    return {
      distinctData: [],
      distinctDataLabels: [],
      distinctDataObj: [],
      hoursTotal: 0,
      mainChart: {
        chartData: null,
        extraOptions: chartConfig.chartOptionsPie
      },
      viewType: 'all'
    }
  },
  computed: {
    superTotal () {
      return sumBy(this.activities, 'hours')
    }
  },
  watch: {
    activities: function (newVal, oldVal) {
      this.getActivities()
    }
  },
  mounted () {
    this.getActivities()
  },
  methods: {
    async getActivities () {
      this.isLoading = true
      this.hoursTotal = sumBy(this.activities, 'hours')
      this.distinctData = uniq(map(this.activities, `${this.table}.${this.field}`))
      this.distinctDataObj = orderBy(this.distinctData.map(p => {
        const activities = this.activities.filter(a => (p && a[this.table] && a[this.table][this.field] === p) || (!p && !a[this.table]))
        const hours = sumBy(activities, 'hours')
        return { name: p, hours: hours, pct: this.hoursTotal > 0 ? parseFloat((hours / this.hoursTotal * 100).toFixed(2)) : 0 }
      }), ['hours'], ['desc'])
      this.distinctDataLabels = this.distinctDataObj.map(p => p && p.name ? p.name : 'Sense assignar')
      this.fillChartData()
      this.isLoading = false
    },
    fillChartData () {
      this.mainChart.chartData = {
        datasets: [
          {
            data: this.distinctDataObj.map(d => { return d.hours }),
            backgroundColor: this.someChartColors(this.distinctData.length)
          }
        ],
        labels: this.distinctDataLabels
      }
    },
    someChartColors (n) {
      const data = []
      for (let i = 0; i <= n; i++) {
        data.push(chartConfig.chartDataColors[i])
      }
      return data
    },
    getChartColor (n) {
      return chartConfig.chartDataColors[n]
    }
  },
  filters: {
    formatDate (val) {
      if (!val) { return '-' }
      return moment(val).fromNow()
    },
    formatDMYDate (val) {
      if (!val) { return '-' }
      return moment(val).format('dddd DD/MM/YYYY')
    },
    formatTitle (val) {
      if (!val) { return '-' }
      return moment(val).format('dddd DD/MM/YYYY') + ' (' + moment(val).fromNow() + ')'
    }
  }
}
</script>
<style>
.card-body{
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #eee;
}
.card-header-title{
  text-transform: capitalize;
}
.is-activity{
  cursor: pointer;
}
.is-total{
  background: #eee;
  text-transform: capitalize;
}
.auxiliar{
  color:#999;
}
.projects-bars{
  margin-bottom: 2rem;
}
.projects-bars progress{
  margin-top: 1rem;
}
.view-button{
  margin-left: 0.5rem;
}
</style>
