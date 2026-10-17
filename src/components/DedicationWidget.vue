<template>
  <div class="dedication-report">
    <top-progress ref="topProgress"></top-progress>

    <!-- Redesign A: figures, hours per month and the split by person, project,
         type of activity and function -->
    <div class="doc-kpis">
      <div class="doc-kpi">
        <span>Hores dedicades</span>
        <b>{{ hoursText(superTotal) }} h</b>
        <small>{{ periodText }}</small>
      </div>
      <div class="doc-kpi">
        <span>Mitjana mensual</span>
        <b>{{ hoursText(monthlyAverage) }} h</b>
        <small v-if="peakMonth">màxim {{ monthName(peakMonth.key) }}: {{ hoursText(peakMonth.hours) }} h</small>
      </div>
      <div class="doc-kpi">
        <span>Persones</span>
        <b>{{ byPerson.length }}</b>
        <small>amb hores al període</small>
      </div>
      <div class="doc-kpi">
        <span>Projectes</span>
        <b>{{ byProjectAll.length }}</b>
        <small v-if="byProjectAll.length > 10">els 10 primers sumen el {{ percentText(topTenShare) }}</small>
      </div>
    </div>

    <section class="report-box">
      <header class="report-box-head">
        <h2>Hores per mes</h2>
        <span class="has-text-muted">{{ scopeText }}</span>
      </header>
      <div class="month-chart" role="img" :aria-label="'Hores per mes: ' + months.map(m => monthName(m.key) + ' ' + hoursText(m.hours) + ' h').join(', ')">
        <div v-for="m in months" :key="m.key" class="month-col" :title="monthName(m.key) + ': ' + hoursText(m.hours) + ' h'">
          <span class="month-value">{{ m.hours ? hoursText(m.hours) : "" }}</span>
          <span class="month-bar" :style="{ height: barHeight(m.hours) }"></span>
          <span class="month-label">{{ monthName(m.key, true) }}</span>
        </div>
      </div>
      <details class="month-table">
        <summary>Veure les dades en taula</summary>
        <table class="table is-narrow">
          <tbody>
            <tr v-for="m in months" :key="m.key">
              <th scope="row">{{ monthName(m.key) }}</th>
              <td class="has-text-right">{{ hoursText(m.hours) }} h</td>
            </tr>
          </tbody>
        </table>
      </details>
    </section>

    <div class="report-columns">
      <section class="report-box">
        <header class="report-box-head">
          <h2>Per persona</h2>
          <span class="has-text-muted">{{ byPerson.length }} {{ byPerson.length === 1 ? "persona" : "persones" }}</span>
        </header>
        <ul class="rank-list">
          <li v-for="g in byPerson" :key="g.name">
            <span class="rank-name">{{ g.name }}</span>
            <span class="rank-bar"><i :style="{ width: (g.hours / maxOf(byPerson) * 100) + '%' }"></i></span>
            <b>{{ hoursText(g.hours, 2) }} h</b>
            <span class="rank-share">{{ percentText(g.share) }}</span>
          </li>
          <li class="is-sum">
            <span class="rank-name">Total</span>
            <span></span>
            <b>{{ hoursText(superTotal, 2) }} h</b>
            <span class="rank-share">100 %</span>
          </li>
        </ul>
      </section>

      <div class="report-stack">
        <section class="report-box">
          <header class="report-box-head">
            <h2>Per projecte</h2>
            <span class="has-text-muted">{{ byProjectAll.length }} {{ byProjectAll.length === 1 ? "projecte" : "projectes" }}</span>
          </header>
          <ul class="rank-list">
            <li v-for="g in byProject" :key="g.name" :class="{ 'is-rest': g.isRest }">
              <span class="rank-name" :title="g.name">{{ g.name }}</span>
              <span class="rank-bar"><i :style="{ width: (g.hours / maxOf(byProject) * 100) + '%' }"></i></span>
              <b>{{ hoursText(g.hours, 2) }} h</b>
              <span class="rank-share">{{ percentText(g.share) }}</span>
            </li>
            <li class="is-sum">
              <span class="rank-name">Total</span>
              <span></span>
              <b>{{ hoursText(superTotal, 2) }} h</b>
              <span class="rank-share">100 %</span>
            </li>
          </ul>
        </section>

        <section class="report-box">
          <header class="report-box-head">
            <h2>Per tipus d'activitat</h2>
          </header>
          <div class="split-bar" aria-hidden="true">
            <i v-for="(g, i) in byType" :key="g.name" :class="'c' + (g.name === 'Sense assignar' ? 'x' : i % 6)" :style="{ width: (g.share * 100) + '%' }"></i>
          </div>
          <ul class="rank-list is-legend">
            <li v-for="(g, i) in byType" :key="g.name">
              <span class="rank-name"><i class="dot" :class="'c' + (g.name === 'Sense assignar' ? 'x' : i % 6)"></i>{{ g.name }}</span>
              <span></span>
              <b>{{ hoursText(g.hours, 2) }} h</b>
              <span class="rank-share">{{ percentText(g.share) }}</span>
            </li>
          </ul>
        </section>

        <section class="report-box">
          <header class="report-box-head">
            <h2>Per funció</h2>
          </header>
          <div v-if="!byFunction.length || (byFunction.length === 1 && byFunction[0].name === 'Sense assignar')" class="report-empty">
            <b>Cap hora del període té funció</b>
            <p>Les {{ hoursText(superTotal) }} h estan sense assignar. La funció s'indica en registrar les hores, a «Hores dedicades».</p>
          </div>
          <ul v-else class="rank-list">
            <li v-for="g in byFunctionTop" :key="g.name" :class="{ 'is-rest': g.isRest }">
              <span class="rank-name">{{ g.name }}</span>
              <span class="rank-bar"><i :style="{ width: (g.hours / maxOf(byFunctionTop) * 100) + '%' }"></i></span>
              <b>{{ hoursText(g.hours, 2) }} h</b>
              <span class="rank-share">{{ percentText(g.share) }}</span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </div>
</template>

<script>
import ModalBox from '@/components/ModalBox.vue'
import service from '@/service/index'
// import LineChart from '@/components/Charts/LineChart'
import BarChart from '@/components/Charts/BarChart'
import uniq from 'lodash/uniq'
import map from 'lodash/map'
import sumBy from 'lodash/sumBy'
import moment from 'moment'
import CardComponent from '@/components/CardComponent.vue'
import DedicationCircleChart from '@/components/DedicationCircleChart.vue'
import * as chartConfig from '@/components/Charts/chart.config'
import ModalBoxDedication from '@/components/ModalBoxDedication.vue'
import TopProgress from '@/components/TopProgress.vue'
import { formatNumber } from '@/helpers/format-number'
import { groupHours, topWithRest, hoursByMonth } from '@/domain/dedicationBreakdown'

moment.locale('ca')

export default {
  name: 'DedicationWidget',
  components: { ModalBox, CardComponent, BarChart, DedicationCircleChart, ModalBoxDedication, TopProgress },
  props: {
    user: {
      type: Number,
      default: null
    },
    date1: {
      type: Date,
      default: null
    },
    date2: {
      type: Date,
      default: null
    },
    project: {
      type: Number,
      default: null
    },
    last: {
      type: Boolean,
      default: false
    }
  },
  data () {
    // const month = new Date().getMonth()
    // const year = new Date().getFullYear()
    return {
      isModalActive: false,
      isModalEditActive: false,
      dedicationObject: null,
      trashObject: null,
      activities: [],
      isLoading: false,
      paginated: false,
      perPage: 10,
      checkedRows: [],
      distinctDays: [],
      distinctDaysObj: [],
      distinctTotals: [],
      distinctProjects: [],
      distinctProjectsObj: [],
      distinctUsers: [],
      distinctUsersObj: [],
      hoursTotal: 0,
      defaultChart: {
        chartData: null,
        extraOptions: chartConfig.chartOptionsMain
      },
      pieChart: {
        chartData: null,
        extraOptions: chartConfig.chartOptionsPie
      },
      usersChart: {
        chartData: null,
        extraOptions: chartConfig.chartOptionsPie
      },
      viewType: 'chart',
      masks: {
        weekdays: 'WWW'
      }
    }
  },
  computed: {
    trashObjectName () {
      if (this.trashObject) {
        return this.trashObject.name
      }

      return null
    },
    superTotal () {
      return this.activities ? sumBy(this.activities, a => Number(a.hours) || 0) : 0
    },
    fromIso () {
      return this.last ? null : (this.date1 ? moment(this.date1).format('YYYY-MM-DD') : null)
    },
    toIso () {
      return this.last ? null : (this.date2 ? moment(this.date2).format('YYYY-MM-DD') : null)
    },
    months () {
      return hoursByMonth(this.activities, this.fromIso, this.toIso)
    },
    monthsWithHours () {
      return this.months.filter(m => m.hours > 0)
    },
    monthlyAverage () {
      return this.monthsWithHours.length ? this.superTotal / this.monthsWithHours.length : 0
    },
    peakMonth () {
      return this.monthsWithHours.reduce((best, m) => (!best || m.hours > best.hours ? m : best), null)
    },
    byPerson () {
      return groupHours(this.activities, a => a.users_permissions_user && a.users_permissions_user.username, 'Sense persona')
    },
    byProjectAll () {
      return groupHours(this.activities, a => a.project && a.project.name, 'Sense projecte')
    },
    byProject () {
      return topWithRest(this.byProjectAll, 10, n => `Altres ${n} projectes`)
    },
    topTenShare () {
      return this.byProjectAll.slice(0, 10).reduce((acc, g) => acc + g.share, 0)
    },
    byType () {
      return groupHours(this.activities, a => a.dedication_type && a.dedication_type.name)
    },
    byFunction () {
      return groupHours(this.activities, a => a.activity_type && a.activity_type.name)
    },
    byFunctionTop () {
      return topWithRest(this.byFunction, 12, n => `Altres ${n} funcions`)
    },
    periodText () {
      if (this.last) return 'modificades els últims 7 dies'
      if (!this.fromIso || !this.toIso) return ''
      const from = moment(this.fromIso)
      const to = moment(this.toIso)
      return from.isSame(to, 'month') ? from.format('MMMM YYYY') : `${from.format('MMMM')} – ${to.format('MMMM YYYY')}`
    },
    scopeText () {
      if (this.user && this.project) return 'una persona en un projecte'
      if (this.user) return 'una persona, tots els projectes'
      if (this.project) return 'un projecte, totes les persones'
      return 'totes les persones i projectes'
    }
  },
  watch: {
    user: function (newVal, oldVal) {
      this.getActivities()
    },
    date1: function (newVal, oldVal) {
      this.getActivities()
    },
    date2: function (newVal, oldVal) {
      this.getActivities()
    },
    project: function (newVal, oldVal) {
      this.getActivities()
    },
    last: function (newVal, oldVal) {
      this.getActivities()
    }
  },
  mounted () {
    this.getActivities()
  },
  methods: {
    hoursText (value, decimals = 1) {
      return formatNumber(Number(value) || 0, decimals, decimals)
    },
    percentText (share) {
      return formatNumber((Number(share) || 0) * 100, 1) + ' %'
    },
    monthName (key, short = false) {
      const d = moment(key + '-01')
      return short ? d.format('MMM YY') : d.format('MMMM YYYY')
    },
    barHeight (hours) {
      const max = Math.max(...this.months.map(m => m.hours), 0)
      return max ? Math.max(2, (hours / max) * 100) + '%' : '0'
    },
    maxOf (groups) {
      return Math.max(...groups.map(g => g.hours), 0) || 1
    },
    async getActivities () {
      this.isLoading = true
      this.$refs.topProgress.start()
      if (!this.date1 || !this.date2) {
        return
      }
      const from = moment(this.date1).format('YYYY-MM-DD')
      const to = moment(this.date2).format('YYYY-MM-DD')
      let query = `activities/calendar?_where[date_gte]=${from}&[date_lte]=${to}`
      if (this.last) {
        query = `activities/calendar?_where[updated_at_gte]=${moment().add(-7, 'days').format('YYYY-MM-DD')}`
      }
      if (this.user) {
        query = `${query}&[users_permissions_user.id]=${this.user}`
      }
      if (this.project) {
        query = `${query}&[project.id]=${this.project}`
      }
      query = `${query}&_limit=-1`
      service({ requiresAuth: true }).get(query).then((r) => {
        this.activities = r.data
        this.hoursTotal = sumBy(this.activities, 'hours')
        // this.distinctDays = uniq(map(this.activities, 'date'))
        // this.distinctDays.sort()
        // this.distinctDaysObj = this.distinctDays.map(d => {
        //   const activities = this.activities.filter(a => a.date === d)
        //   const hours = sumBy(activities, 'hours')
        //   activities.unshift({ id: 'Total', project: { name: 'Total' }, hours: hours })
        //   return { day: d, activities: activities, hours: hours }
        // })
        // this.distinctTotals = this.distinctDaysObj.map(d => { return { day: d.day, hours: d.hours } })
        // this.distinctProjects = uniq(map(this.activities, 'project.name'))
        // this.distinctProjectsObj = this.distinctProjects.map(p => {
        //   const activities = this.activities.filter(a => a.project && a.project.name === p)
        //   const hours = sumBy(activities, 'hours')
        //   return { name: p, hours: hours, pct: this.hoursTotal > 0 ? parseFloat((hours / this.hoursTotal * 100).toFixed(2)) : 0 }
        // })
        // this.distinctUsers = uniq(map(this.activities, 'users_permissions_user.username'))
        // this.distinctUsersObj = this.distinctUsers.map(p => {
        //   const activities = this.activities.filter(a => (p && a.users_permissions_user && a.users_permissions_user.username === p) || (!p && !a.users_permissions_user))
        //   const hours = sumBy(activities, 'hours')
        //   return { name: p, hours: hours, pct: this.hoursTotal > 0 ? parseFloat((hours / this.hoursTotal * 100).toFixed(2)) : 0 }
        // })
        // this.fillChartData()
        this.isLoading = false
        this.$refs.topProgress.done()
      })
    },
    trashModal (trashObject) {
      this.trashObject = trashObject
      this.isModalActive = true
    },
    async trashConfirm () {
      this.isModalActive = false

      await service({ requiresAuth: true }).delete(`activities/${this.trashObject.id}`)

      this.getActivities()

      this.$buefy.snackbar.open({
        message: 'Confirmed',
        queue: false
      })
    },
    trashCancel () {
      this.isModalActive = false
    },
    fillChartData () {
      this.defaultChart.chartData = null
      const chartData = {}
      const labels = []
      this.distinctDays.forEach((d, i) => {
        labels.push(d)
        const datasets = []
        this.distinctProjects.forEach((p, j) => {
          datasets.push({
            label: p,
            backgroundColor: this.getChartColor(j),
            data: this.distinctDays.map(dd => { return sumBy(this.activities.filter(a => a.project && a.project.name === p && a.date === dd), 'hours') })
          })
        })
        chartData.labels = labels
        chartData.datasets = datasets
      })
      this.defaultChart.chartData = chartData

      // this.pieChart.chartData = {
      //   datasets: [
      //     {
      //       data: this.distinctProjectsObj.map(d => { return d.hours }),
      //       backgroundColor: this.someChartColors(this.distinctProjects.length)
      //     }
      //   ],
      //   labels: this.distinctProjects
      // }

      // this.usersChart.chartData = {
      //   datasets: [
      //     {
      //       data: this.distinctUsersObj.map(d => { return d.hours }),
      //       backgroundColor: this.someChartColors(this.distinctUsers.length)
      //     }
      //   ],
      //   labels: this.distinctUsers
      // }
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
    },
    showModal (activity) {
      this.dedicationObject = activity
      this.isModalEditActive = true
    },
    async modalSubmit (activity) {
      // activity.date = moment(activity.date).format('YYYY-MM-DD')
      this.isModalEditActive = false

      if (activity.id) {
        await service({ requiresAuth: true }).put(`activities/${activity.id}`, activity)
      } else {
        await service({ requiresAuth: true }).post('activities', activity)
      }

      this.getActivities()

      this.$buefy.snackbar.open({
        message: 'Guardat',
        queue: false
      })
    },
    modalCancel () {
      this.isModalEditActive = false
    }
  },
}
</script>
<style scoped>
.report-box {
  background: var(--a-surface);
  border: 1px solid var(--a-line);
  border-radius: 12px;
  margin-bottom: 1rem;
  overflow: hidden;
}
.report-box-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
  padding: .875rem 1.25rem;
  border-bottom: 1px solid var(--a-line);
}
.report-box-head h2 {
  font-size: 1rem;
  font-weight: 800;
}
.report-box-head span {
  font-size: .8125rem;
}
.month-chart {
  display: flex;
  align-items: flex-end;
  gap: .5rem;
  height: 15rem;
  padding: 1.5rem 1.25rem .5rem;
  overflow-x: auto;
}
.month-col {
  flex: 1 0 2.5rem;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  gap: .25rem;
}
.month-value {
  font-size: .6875rem;
  font-weight: 800;
  white-space: nowrap;
}
.month-bar {
  width: 70%;
  max-width: 5rem;
  background: var(--a-accent);
  border-radius: 4px 4px 0 0;
}
.month-label {
  font-size: .6875rem;
  color: var(--a-muted);
  white-space: nowrap;
  text-transform: capitalize;
}
.month-table {
  padding: .5rem 1.25rem .75rem;
  border-top: 1px solid var(--a-line-soft);
  font-size: .8125rem;
}
.month-table summary {
  cursor: pointer;
  color: var(--a-fg-2);
}
.month-table table {
  max-width: 24rem;
  margin-top: .5rem;
}
.month-table th {
  text-transform: capitalize;
  font-weight: 600;
}
.report-columns {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  align-items: start;
}
.report-columns > .report-box,
.report-stack > .report-box:last-child {
  margin-bottom: 0;
}
.report-stack {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.report-stack > .report-box {
  margin-bottom: 0;
}
.rank-list {
  padding: .5rem 1.25rem .75rem;
  font-variant-numeric: tabular-nums;
}
.rank-list li {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 7rem 5.5rem 3.25rem;
  align-items: center;
  gap: .75rem;
  padding: .375rem 0;
  border-bottom: 1px solid var(--a-line-soft);
  font-size: .8125rem;
}
.rank-list.is-legend li {
  grid-template-columns: minmax(0, 1fr) 0 5.5rem 3.25rem;
}
.rank-list li.is-sum {
  border-bottom: 0;
  font-weight: 800;
}
.rank-list li.is-rest .rank-name {
  color: var(--a-muted);
}
.rank-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rank-list b {
  text-align: right;
  white-space: nowrap;
}
.rank-share {
  text-align: right;
  color: var(--a-muted);
}
.rank-bar {
  height: .5rem;
  border-radius: 999px;
  background: var(--a-chip);
  overflow: hidden;
}
.rank-bar i {
  display: block;
  height: 100%;
  background: var(--a-accent);
  border-radius: 999px;
}
.is-rest .rank-bar i {
  background: var(--a-muted);
}
.split-bar {
  display: flex;
  height: .75rem;
  margin: 1rem 1.25rem .25rem;
  border-radius: 999px;
  overflow: hidden;
  background: var(--a-chip);
}
.split-bar i,
.dot {
  display: inline-block;
}
.split-bar i {
  height: 100%;
}
.dot {
  width: .625rem;
  height: .625rem;
  border-radius: 2px;
  margin-right: .5rem;
}
.c0 { background: var(--a-accent); }
.c1 { background: #2F6FB5; }
.c2 { background: #E08A2E; }
.c3 { background: #8A5CC2; }
.c4 { background: #C24F6E; }
.c5 { background: #5BA36B; }
.cx { background: #C9D2D4; }
.report-empty {
  padding: 2rem 1.5rem;
  text-align: center;
  font-size: .875rem;
  color: var(--a-fg-2);
}
.report-empty b {
  display: block;
  margin-bottom: .375rem;
  color: var(--a-fg);
}
@media screen and (max-width: 1023px) {
  .report-columns {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
<style>
.card-body{
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--a-line-soft);
}
.is-activity{
  cursor: pointer;
}
.is-total{
  background: var(--a-chip);
  text-transform: capitalize;
}
.auxiliar{
  color:var(--a-muted);
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
