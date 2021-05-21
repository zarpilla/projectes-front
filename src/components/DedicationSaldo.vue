<template>
  <div>
    <div class="table-view">
      <card-component class="has-table has-mobile-sort-spaced" v-if="!isLoading">
        <div class="columns card-body">
          <div class="column has-text-weight-bold">
            Data
          </div>
          <div class="column has-text-weight-bold">
            Hores teòriques
          </div>
          <div class="column has-text-weight-bold">
            Hores treballades
          </div>
          <div class="column has-text-weight-bold">
            Total hores treballades
          </div>
          <div class="column has-text-weight-bold">
            Saldo hores
          </div>
        </div>
        <div v-for="(d, i) in dates" v-bind:key="i" class="card-body">
          <div class="columns">
            <div class="column">
              {{ d.date }}
            </div>
            <div class="column">
              {{ d.theoricHours }} {{ d.dateDescription ? `- ${d.dateDescription}` : '' }}
            </div>
            <div class="column">
              {{ d.workedHours }}
            </div>
            <div class="column">
              {{ d.totalWorkedHours }}
            </div>
            <div class="column">
              {{ d.balance }}
            </div>
          </div>
        </div>
      </card-component>
    </div>
  </div>
</template>

<script>
import service from '@/service/index'
// import uniq from 'lodash/uniq'
// import map from 'lodash/map'
import sumBy from 'lodash/sumBy'
import moment from 'moment'
import CardComponent from '@/components/CardComponent'

moment.locale('ca')

export default {
  name: 'DedicationSaldo',
  components: { CardComponent },
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
    return {
      activities: [],
      isLoading: false,
      distinctDays: [],
      distinctDaysObj: [],
      distinctTotals: [],
      distinctUsers: [],
      distinctUsersObj: [],
      hoursTotal: 0,
      dailyDedications: [],
      dates: []
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
    year: function (newVal, oldVal) {
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

      const from = moment(this.year).startOf('year').format('YYYY-MM-DD')
      const to = moment(this.year).endOf('year').format('YYYY-MM-DD')

      let query = `activities?_where[date_gte]=${from}&[date_lte]=${to}`
      if (this.user) {
        query = `${query}&[users_permissions_user.id]=${this.user}`
      } else {
        return
      }

      service({ requiresAuth: true }).get(query).then(async (r) => {
        this.activities = r.data
        // console.log('this.activities', this.activities)
        const festives = (await service({ requiresAuth: true }).get('festives')).data
        service({ requiresAuth: true }).get(`daily-dedications?_where[users_permissions_user.id]=${this.user}`).then((r) => {
          this.dailyDedications = r.data
          // console.log('this.dailyDedications', this.dailyDedications)
          console.log('festives', festives)
          var allDates = this.enumerateDaysBetweenDates()
          var balance = 0
          var totalWorkedHours = 0
          var dates = []
          allDates.forEach(d => {
            // console.log('date', moment(d).day)
            const date = moment(d).format('YYYY-MM-DD')
            const displayDate = moment(d).format('ddd DD-MM-YYYY')
            const day = moment(d).day()
            const week = moment(d).week()
            const dailyDedication = this.dailyDedications.find(dd => date >= dd.from && date <= dd.to)
            const activities = this.activities.filter(a => a.date === date)
            const festive = festives.find(a => a.date === date)
            if (!dailyDedication) {
              console.warn('dedication undefinded', date)
            }
            const theoricHours = !festive && dailyDedication && (day !== 0 && day !== 6) ? dailyDedication.hours : 0
            const workedHours = sumBy(activities, 'hours')
            const dateDescription = festive ? 'FESTIU' : ''
            totalWorkedHours += workedHours
            balance += workedHours - theoricHours
            dates.push({
              date: displayDate,
              dateDescription: dateDescription,
              week: week,
              theoricHours: theoricHours,
              workedHours: workedHours,
              totalWorkedHours: totalWorkedHours,
              balance: balance,
              error: dailyDedication === null
            })
          })
          this.dates = dates.reverse()
          this.isLoading = false
        })
      })
    },
    enumerateDaysBetweenDates () {
      var dates = []
      var currDate = moment(this.year).startOf('year')
      var lastDate = moment()
      dates.push(currDate.clone().toDate())
      while (currDate.add(1, 'days').diff(lastDate) < 0) {
        dates.push(currDate.clone().toDate())
      }
      return dates
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
    border-top-right-radius: 0.25rem;
    border-top-left-radius: 0.25rem;
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
