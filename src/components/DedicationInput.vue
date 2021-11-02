<template>
  <div>
    <modal-box
      :is-active="isModalActive"
      :trash-object-name="trashObjectName"      
      @confirm="trashConfirm"
      @cancel="trashCancel"
    />
    <modal-box-dedication
      :is-active="isModalEditActive"
      :dedication-object="dedicationObject"
      :projects="projects"
      @submit="modalSubmit"
      @cancel="modalCancel"
      @delete="modalDelete"
    />
    <card-component class="has-table has-mobile-sort-spaced">
      <div class="card-body is-total">
        <div class="columns">
          <div class="column is-6 has-text-weight-bold">
            Total
            <!-- <download-csv :data="activitiesJSON">
              <b-button
              class="zview-button"
              :type="'is-disabled'"
              icon-left="export" />
            </download-csv> -->
          </div>
          <div class="column has-text-weight-bold">
            {{ superTotal }} h
          </div>
          <div class="column is-4 has-text-right">
            <b-button
              @click="viewType = 'all'"
              title="Vista completa"
              class="view-button"
              :type="viewType == 'all' ? 'is-primary' : 'is-disabled'"
              icon-left="table-headers-eye-off" />
            <b-button
              @click="viewType = 'calendar'"
              title="Vista calendari"
              class="view-button"
              :type="viewType == 'calendar' ? 'is-primary' : 'is-disabled'"
              icon-left="calendar" />
            <b-button
              @click="viewType = 'table'"
              title="Vista taula"
              class="view-button"
              :type="viewType == 'table' ? 'is-primary' : 'is-disabled'"
              icon-left="table-large" />
            <span class="separator"></span>
            <download-csv class="export view-button" :data="activitiesJSON">
              <b-button
              title="Exporta dades"
              class="zview-button"
              :type="'is-disabled'"
              icon-left="export" />
            </download-csv>
            <span class="separator"></span>
            <b-button
              title="Vista persona"
              @click="colorTypeChanged('user')"
              class="view-button"
              :type="colorType == 'user' ? 'is-primary' : 'is-disabled'"
              icon-left="account" />
            <b-button
              title="Vista projecte"
              @click="colorTypeChanged('project')"
              class="view-button"
              :type="colorType == 'project' ? 'is-primary' : 'is-disabled'"
              icon-left="wrench" />
            <span class="separator"></span>
            <b-button
              title="Afegir dedicació"
              @click="showModal(null)"
              class="view-button is-warning"
              icon-left="plus" />
          </div>
        </div>
      </div>
    </card-component>

    <v-calendar
      ref="calendar"
      locale="ca"
      class="custom-calendar max-w-full mb-5"
      :first-day-of-week="2"
      :masks="masks"
      :attributes="attributes"
      @update:from-page="pageChange"
      title-position="left"
      is-expanded
      v-if="viewType == 'all' || viewType == 'calendar'"
    >
      <template v-slot:day-content="{ day, attributes }">
        <div class="flex flex-col h-full z-10 overflow-hidden">
          <span class="day-label text-sm text-gray-900" @click="dayClicked(day)">{{ day.day }}</span>
          <span class="day-sum-label text-sm text-gray-900" v-if="daySum(attributes)">{{ daySum(attributes) }}h</span>
          <div class="flex-grow overflow-y-auto overflow-x-auto">
            <span
              v-for="attr in attributes"
              :key="attr.key"
              class="text-xs leading-tight rounded-sm p-1 mt-0 mb-1 tag tag-hours"
              :class="attr.customData ? attr.customData.class : null"
              :style="{ backgroundColor: attr.customData ? attr.customData.bg_project : 'transparent' }"
            >
              <span v-if="attr.customData" @click="showModal(attr.customData.a)">
                {{ attr.customData.project }} - {{ attr.customData.username }} - {{ attr.customData.hours }}h
              </span>
            </span>
          </div>
        </div>
      </template>
    </v-calendar>

    <div class="table-view" v-if="viewType == 'all' || viewType == 'table'">
      <card-component class="has-table has-mobile-sort-spaced" v-for="(d, i) in distinctDaysObj" v-bind:key="i">
        <div v-for="(a, j) in d.activities" v-bind:key="j" class="card-body" :class="{ 'is-total': a.project.name === 'Total', 'is-activity': a.project.name !== 'Total' }">
          <div class="columns">
            <div class="column is-4" :class="{ 'has-text-weight-bold': a.project.name === 'Total' }" @click="showModal(a)">
              <span class="is-total" v-if="a.project.name === 'Total'">
                {{ d.day | formatTitle }}
              </span>
              <span v-else>
                {{ a.project && a.project.name ? a.project.name : '' }}
              </span>
              <div class="auxiliar">
                {{ a.description ? a.description : '' }}
              </div>
            </div>
            <div class="column" :class="{ 'has-text-weight-bold': a.project.name === 'Total' }" @click="showModal(a)">
              {{ a.users_permissions_user && a.users_permissions_user.username ? a.users_permissions_user.username : '' }}
            </div>
            <div class="column" :class="{ 'has-text-weight-bold': a.project.name === 'Total' }" @click="showModal(a)">
              {{ a.hours }} h
            </div>
            <div class="column auxiliar" :class="{ 'has-text-weight-bold': a.project.name === 'Total' }" @click="showModal(a)">
              <div>{{ a.dedication_type ? a.dedication_type.name : '' }}</div>
              <div>{{ a.activity_type ? a.activity_type.name : '' }}</div>
            </div>
            <div class="column is-2" :class="{ 'has-text-weight-bold': a.project.name === 'Total' }" @click="trashModal(a)">
              <b-button
                  label="Esborra"
                  type="is-danger"
                  icon-left="close" v-if="a.project.name !== 'Total' && !a.invoiced" />
            </div>
          </div>
        </div>
      </card-component>
    </div>
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
      </card-component>
      <dedication-circle-chart title="Persona" v-if="!isLoading" :activities="activities" :table="'users_permissions_user'" :field="'username'">
      </dedication-circle-chart>
      <dedication-circle-chart title="Projecte" v-if="!isLoading" :activities="activities" :table="'project'" :field="'name'">
      </dedication-circle-chart>
      <dedication-circle-chart title="Tipus de tasca" v-if="!isLoading" :activities="activities" :table="'activity_type'" :field="'name'">
      </dedication-circle-chart>
      <dedication-circle-chart title="Tipus d'activitat" v-if="!isLoading" :activities="activities" :table="'dedication_type'" :field="'name'">
      </dedication-circle-chart> -->
  </div>
</template>

<script>
import ModalBox from '@/components/ModalBox'
import service from '@/service/index'
// import LineChart from '@/components/Charts/LineChart'
// import BarChart from '@/components/Charts/BarChart'
import uniq from 'lodash/uniq'
import map from 'lodash/map'
import sumBy from 'lodash/sumBy'
import orderBy from 'lodash/orderBy'
import moment from 'moment'
import CardComponent from '@/components/CardComponent'
// import DedicationCircleChart from '@/components/DedicationCircleChart'
import * as chartConfig from '@/components/Charts/chart.config'
import ModalBoxDedication from '@/components/ModalBoxDedication'

moment.locale('ca')

export default {
  name: 'DedicationInput',
  components: { ModalBox, CardComponent, ModalBoxDedication },
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
    },
    projects: {
      type: Array
    }
  },
  data () {
    return {
      moving: false,
      firstTime: true,
      isModalActive: false,
      isModalEditActive: false,
      dedicationObject: null,
      trashObject: null,
      activities: [],
      activitiesJSON: [],
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
      viewType: 'all',
      colorType: 'project',
      masks: {
        weekdays: 'WWW'
      },
      attributes: []
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
      // console.log('user newVal', newVal)
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

    // this.$on('update:page', () => { console.log('update:page') })
  },
  methods: {
    async getActivities () {
      this.isLoading = true
      if (!this.date1 || !this.date2) {
        return
      }
      const from = moment(this.date1).format('YYYY-MM-DD')
      const to = moment(this.date2).format('YYYY-MM-DD')
      const calendar = this.$refs.calendar
      this.moving = true
      if (calendar) {
        await calendar.move({ month: parseInt(moment(this.date1).format('M')), year: parseInt(moment(this.date1).format('YYYY')) })
      }
      this.moving = false

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
        this.distinctDays = uniq(map(this.activities, 'date'))
        this.distinctDays.sort()
        this.distinctDaysObj = orderBy(this.distinctDays.map(d => {
          const activities = this.activities.filter(a => a.date === d)
          const hours = sumBy(activities, 'hours')
          activities.unshift({ id: 'Total', project: { name: 'Total' }, hours: hours })
          return { day: d, activities: activities, hours: hours }
        }), ['day'], ['desc'])
        this.distinctTotals = this.distinctDaysObj.map(d => { return { day: d.day, hours: d.hours } })
        this.distinctProjects = uniq(map(this.activities, 'project.name'))
        this.distinctProjectsObj = this.distinctProjects.map(p => {
          const activities = this.activities.filter(a => a.project.name === p)
          const hours = sumBy(activities, 'hours')
          return { name: p, hours: hours, pct: this.hoursTotal > 0 ? parseFloat((hours / this.hoursTotal * 100).toFixed(2)) : 0 }
        })
        this.distinctUsers = uniq(map(this.activities, 'users_permissions_user.username'))
        this.distinctUsersObj = this.distinctUsers.map(p => {
          const activities = this.activities.filter(a => (p && a.users_permissions_user && a.users_permissions_user.username === p) || (!p && !a.users_permissions_user))
          const hours = sumBy(activities, 'hours')
          return { name: p, hours: hours, pct: this.hoursTotal > 0 ? parseFloat((hours / this.hoursTotal * 100).toFixed(2)) : 0 }
        })
        // this.fillChartData()

        this.attributes = this.activities.map((a, i) => {
          return {
            key: i + 1,
            customData: {
              a: a,
              bg_project: this.colorType === 'user' ? this.getChartColor(this.distinctUsers.findIndex(p => p === a.users_permissions_user.username)) : this.getChartColor(this.distinctProjects.findIndex(p => p === a.project.name)),
              class: 'tag zis-primary',
              project: a.project.name,
              username: a.users_permissions_user.username,
              hours: a.hours
            },
            dates: a.date
          }
        })
        this.attributes.unshift({
          key: 'today',
          highlight: 'red',
          dates: new Date()
        })

        this.isLoading = false
        this.firstTime = true
        this.activitiesJSON = this.activities.map(a => {
          const project = a.project.id ? this.projects.find(p => p.id === a.project.id) : null
          const client = project && project.clients && project.clients.length > 0 ? project.clients[0].name : null
          return {
            date: a.date,
            project: a.project.name,
            username: a.users_permissions_user.username,
            hours: a.hours,
            description: a.description,
            activity: a.activity_type ? a.activity_type.name : '',
            type: a.dedication_type ? a.dedication_type.name : '',
            client: client
          }
        })
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
        message: 'Esborrat',
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
            data: this.distinctDays.map(dd => { return sumBy(this.activities.filter(a => a.project.name === p && a.date === dd), 'hours') })
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
      console.log('activity', activity)
      // console.log('activity dt', moment(activity.date).format('YYYY-MM-DD'))
      const activity2 = { ...activity }
      activity2.date = moment(activity.date).format('YYYY-MM-DD')
      activity2.hours = activity.hours ? activity.hours.toString().replace(',', '.') : activity.hours
      this.isModalEditActive = false

      try {
        if (activity.id) {
          await service({ requiresAuth: true }).put(`activities/${activity.id}`, activity2)
        } else {
          await service({ requiresAuth: true }).post('activities', activity2)
        }
      } catch (err) {
        console.error('activities error', err)
        this.$buefy.snackbar.open({
          message: 'Error',
          queue: false
        })
      }

      this.getActivities()

      this.$buefy.snackbar.open({
        message: 'Guardat',
        queue: false
      })
    },
    async modalDelete (activity) {
      if (activity.id) {
        await service({ requiresAuth: true }).delete(`activities/${activity.id}`)
        this.isModalEditActive = false
        this.getActivities()
        this.$buefy.snackbar.open({
          message: 'Esborrat',
          queue: false
        })
      }
    },
    modalCancel () {
      this.isModalEditActive = false
    },
    pageChange (page) {
      if (!this.moving) {
        this.$emit('calendar-changed', { year: page.year, month: page.month })
      }
    },
    colorTypeChanged (colorType) {
      if (this.colorType !== colorType) {
        this.colorType = colorType
        this.getActivities()
      }
    },
    dayClicked (day) {
      // console.log('day', day)
      // console.log('mm', moment(day.date).format('YYYY-MM-DD'))
      this.showModal({ date: moment(day.date).format('YYYY-MM-DD') })
    },
    daySum (attributes) {
      if (!attributes || (attributes && attributes.length === 0)) {
        return false
      }
      return sumBy(attributes.map(a => { return { hours: a.customData ? a.customData.hours : 0 } }), 'hours')
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
<style scoped>
.separator{
  margin-right: 0.5rem;
  display: inline-block;
}
.tag-hours{
  cursor: pointer;
  color:#fff;
}
.day-label{
  cursor: pointer;
}
</style>
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
.export{
  display: inline-block;
}
.day-sum-label{
  float: right;
  font-size: 12px;
  color:#999;
  padding-top: 3px;
}
</style>

<style lang="postcss">
.vc-container{
  font-family: 'Nunito';
}
::-webkit-scrollbar {
  width: 0px;
}
::-webkit-scrollbar-track {
  display: none;
}
.custom-calendar.vc-container {
  --day-border: 1px solid #b8c2cc;
  --day-border-highlight: 1px solid #b8c2cc;
  --day-width: 90px;
  --day-height: 90px;
  --weekday-bg: #f8fafc;
  --weekday-border: 1px solid #eaeaea;
  border-radius: 0.25rem;
  border:0;
  width: 100%;
}
  .custom-calendar.vc-container .vc-header {
    background-color: #eee;
    padding: 10px 0;
  }
  .custom-calendar.vc-container .vc-weeks {
    padding: 0;
  }
  .custom-calendar.vc-container .vc-weekday {
    background-color:  #F8F8F8;
    border-bottom: 1px solid #eaeaea;
    border-top: 1px solid #eaeaea;
    padding: 5px 0;
  }
  .custom-calendar.vc-container .vc-day {
    padding: 0 5px 3px 5px;
    text-align: left;
    height: auto;
    min-height: 90px;
    min-width: 90px;
    background-color: white;
  }
    .custom-calendar.vc-container .vc-day.weekday-1,
    .custom-calendar.vc-container .vc-day.weekday-7 {
      background-color: #eff8ff;
      background: #eee
    }
    .custom-calendar.vc-container .vc-day:not(.on-bottom) {
      border-bottom: 1px solid #b8c2cc;
    }
      .custom-calendar.vc-container .vc-day:not(.on-bottom).weekday-1 {
        border-bottom: 1px solid #b8c2cc;
      }

    .custom-calendar.vc-container .vc-day:not(.on-right) {
      border-right: 1px solid #b8c2cc;
    }

  .custom-calendar.vc-container .vc-day .vc-day-dots {
    margin-bottom: 5px;
  }
  .custom-calendar .vc-title{
    margin-left: 1rem;
  }

</style>
