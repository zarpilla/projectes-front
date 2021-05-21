<template>
  <div>
    <title-bar :title-stack="titleStack" />
    <!-- <hero-bar :has-right-visible="false">
      General
    </hero-bar> -->
    <section class="section is-main-section">
      <tiles>
        <card-widget
          class="tile is-child"
          type="is-primary"
          icon="account-multiple"
          :number="projectsNumber"
          label="Projectes Actius"
        />
        <card-widget
          class="tile is-child"
          type="is-info"
          icon="scale-balance"
          :number="balance"
          suffix="€"
          label="Resultat previst"
        />
        <card-widget
          class="tile is-child"
          type="is-info"
          icon="scale-balance"
          :number="realIncomes - realExpenses"
          suffix="€"
          label="Resultat real"
        />
        <card-widget
          class="tile is-child"
          type="is-danger"
          icon="clock-outline"
          :number="dedication"
          label="Hores dedicades"
        />
        <card-widget
          class="tile is-child"
          type="is-success"
          icon="clock"
          :number="estimatedDedication"
          label="Hores estimades"
        />
      </tiles>

      <!-- <card-component
        title="Performance"
        icon="finance"
        header-icon="reload"
        @header-icon-click="fillChartData"
      >
        <div v-if="defaultChart.chartData" class="chart-area">
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

      <card-component title="Projectes Actius" class="has-table has-mobile-sort-spaced">
        <projects-table />
      </card-component>
    </section>
    <!-- <hero-bar :has-right-visible="false">
      Personal
    </hero-bar>
    <section class="section is-main-section">
      <tiles>
        <card-widget
          class="tile is-child"
          type="is-primary"
          icon="account-multiple"
          :number="projectsNumber"
          label="Projectes Actius"
        />
        <card-widget
          class="tile is-child"
          type="is-info"
          icon="account-clock"
          :number="balance"
          suffix="€"
          label="Balanç"
        />
        <card-widget
          class="tile is-child"
          type="is-success"
          icon="account-multiple"
          :number="estimatedDedication"
          label="Hores"
        />
      </tiles>
    </section> -->
  </div>
</template>

<script>
// @ is an alias to /src
import * as chartConfig from '@/components/Charts/chart.config'
import TitleBar from '@/components/TitleBar'
// import HeroBar from '@/components/HeroBar'
import Tiles from '@/components/Tiles'
import CardWidget from '@/components/CardWidget'
import CardComponent from '@/components/CardComponent'
// import LineChart from '@/components/Charts/LineChart'
// import BarChart from '@/components/Charts/BarChart'
import ProjectsTable from '@/components/ProjectsTable'
import service from '@/service/index'
import sumBy from 'lodash/sumBy'

export default {
  name: 'Home',
  components: {
    ProjectsTable,
    // BarChart,
    CardComponent,
    CardWidget,
    Tiles,
    // HeroBar,
    TitleBar
  },
  data () {
    return {
      defaultChart: {
        chartData: null,
        extraOptions: chartConfig.chartOptionsMain
      },
      projectsNumber: 0,
      contactsNumber: 0,
      projects: [],
      activities: [],
      balance: 0,
      realIncomes: 0,
      realExpenses: 0,
      dedication: 0,
      estimatedDedication: 0
    }
  },
  computed: {
    titleStack () {
      return ['Projectes', 'General']
    }
  },
  mounted () {
    this.fillChartData()

    this.$buefy.snackbar.open({
      message: 'Benvinguda',
      queue: false
    })

    service({ requiresAuth: true }).get('contacts/count').then((r) => {
      // console.log('contacts', r.data)
      this.contactsNumber = r.data
    })

    // service({ requiresAuth: true }).get('projects?project_state=1').then((r) => {
    service({ requiresAuth: true }).get('projects').then((r) => {
      // console.log('projects rdata', r.data)
      this.projects = r.data
      this.projectsNumber = this.projects.filter(p => p.project_state !== null && p.project_state.id === 1).length
      // this.balance = sumBy(this.projects, p => {
      //   return p.balance ? p.balance : 0
      // })
      this.balance = sumBy(this.projects, p => {
        return p.total_incomes - p.total_expenses
      })

      this.realIncomes = sumBy(this.projects, p => {
        return sumBy(p.emitted_invoices, 'total_base')
      })
      this.realExpenses = sumBy(this.projects, p => {
        const invoices = sumBy(p.received_invoices, 'total_base')
        const tickets = sumBy(p.tickets, 'total_base')
        const diets = sumBy(p.diets, 'total_base')
        return invoices + tickets + diets
      })

      this.estimatedDedication = sumBy(this.projects, p => {
        return p.total_estimated_hours ? p.total_estimated_hours : 0
      })

      service({ requiresAuth: true }).get('activities').then((r) => {
        // console.log('activities', r.data)
        this.activities = r.data.filter(a => this.projects.find(p => p.id === a.project.id))
        this.dedication = sumBy(this.activities, p => {
          return p.hours
        })
      })
    })
  },
  methods: {
    randomChartData (n) {
      const data = []

      for (let i = 0; i < n; i++) {
        data.push(Math.round(Math.random() * 200))
      }

      return data
    },
    fillChartData () {
      this.defaultChart.chartData = {
        datasets: [
          {
            fill: false,
            borderColor: chartConfig.chartColors.default.primary,
            borderWidth: 2,
            borderDash: [],
            borderDashOffset: 0.0,
            pointBackgroundColor: chartConfig.chartColors.default.primary,
            pointBorderColor: 'rgba(255,255,255,0)',
            pointHoverBackgroundColor: chartConfig.chartColors.default.primary,
            pointBorderWidth: 20,
            pointHoverRadius: 4,
            pointHoverBorderWidth: 15,
            pointRadius: 4,
            data: this.randomChartData(9)
          }//,
          // {
          //   fill: false,
          //   borderColor: chartConfig.chartColors.default.info,
          //   borderWidth: 2,
          //   borderDash: [],
          //   borderDashOffset: 0.0,
          //   pointBackgroundColor: chartConfig.chartColors.default.info,
          //   pointBorderColor: 'rgba(255,255,255,0)',
          //   pointHoverBackgroundColor: chartConfig.chartColors.default.info,
          //   pointBorderWidth: 20,
          //   pointHoverRadius: 4,
          //   pointHoverBorderWidth: 15,
          //   pointRadius: 4,
          //   data: this.randomChartData(9)
          // },
          // {
          //   fill: false,
          //   borderColor: chartConfig.chartColors.default.danger,
          //   borderWidth: 2,
          //   borderDash: [],
          //   borderDashOffset: 0.0,
          //   pointBackgroundColor: chartConfig.chartColors.default.danger,
          //   pointBorderColor: 'rgba(255,255,255,0)',
          //   pointHoverBackgroundColor: chartConfig.chartColors.default.danger,
          //   pointBorderWidth: 20,
          //   pointHoverRadius: 4,
          //   pointHoverBorderWidth: 15,
          //   pointRadius: 4,
          //   data: this.randomChartData(9)
          // }
        ],
        labels: ['01', '02', '03', '04', '05', '06', '07', '08', '09']
      }
    }
  }
}
</script>
