<template>
  <div>
    <vue-topprogress ref="topProgress"></vue-topprogress>
    <modal-box
      :is-active="isModalActive"
      :trash-object-name="trashObjectName"
      @confirm="trashConfirm"
      @cancel="trashCancel"
    />
    <card-component class="has-table has-mobile-sort-spaced">
      <div class="card-body is-total">
        <div class="columns">
          <div class="column is-6 has-text-weight-bold">
            Total
          </div>
          <div class="column has-text-weight-bold">
            {{ superTotal }} h
          </div>          
        </div>
      </div>
    </card-component>
    <!-- <card-component
        class="mt-5"
        title="Dedicació x dia"
        v-if="viewType == 'all' || viewType == 'chart'"
      >
        <div v-if="defaultChart.chartData && !isLoading" class="chart-area">
          <bar-chart
            ref="bigChart"
            style="height: 100%;"
            chart-id="big-line-chart"
            :chart-data="defaultChart.chartData"
            :extra-options="defaultChart.extraOptions"
          >
          </bar-chart>
        </div>
      </card-component> -->
      <dedication-circle-chart title="Persona" v-if="!isLoading" :activities="activities" :table="'users_permissions_user'" :field="'username'">
      </dedication-circle-chart>
      <dedication-circle-chart title="Projecte" v-if="!isLoading" :activities="activities" :table="'project'" :field="'name'">
      </dedication-circle-chart>
      <dedication-circle-chart title="Tipus de tasca" v-if="!isLoading" :activities="activities" :table="'activity_type'" :field="'name'">
      </dedication-circle-chart>
      <dedication-circle-chart title="Tipus d'activitat" v-if="!isLoading" :activities="activities" :table="'dedication_type'" :field="'name'">
      </dedication-circle-chart>
  </div>
</template>

<script>
import ModalBox from '@/components/ModalBox'
import service from '@/service/index'
// import LineChart from '@/components/Charts/LineChart'
import BarChart from '@/components/Charts/BarChart'
import uniq from 'lodash/uniq'
import map from 'lodash/map'
import sumBy from 'lodash/sumBy'
import moment from 'moment'
import CardComponent from '@/components/CardComponent'
import DedicationCircleChart from '@/components/DedicationCircleChart'
import * as chartConfig from '@/components/Charts/chart.config'
import ModalBoxDedication from '@/components/ModalBoxDedication'
import { vueTopprogress } from 'vue-top-progress'

moment.locale('ca')

export default {
  name: 'DedicationWidget',
  components: { ModalBox, CardComponent, BarChart, DedicationCircleChart, ModalBoxDedication, vueTopprogress },
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
      return sumBy(this.activities, 'hours')
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
    async getActivities () {
      this.isLoading = true
      this.$refs.topProgress.start()
      if (!this.date1 || !this.date2) {
        return
      }
      const from = moment(this.date1).format('YYYY-MM-DD')
      const to = moment(this.date2).format('YYYY-MM-DD')
      let query = `activities?_where[date_gte]=${from}&[date_lte]=${to}`
      if (this.last) {
        query = `activities?_where[updated_at_gte]=${moment().add(-7, 'days').format('YYYY-MM-DD')}`
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
