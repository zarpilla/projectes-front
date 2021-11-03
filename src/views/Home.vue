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
          label="Projectes"
        />
        <card-widget
          class="tile is-child"
          type="is-danger"
          icon="clock-outline"
          :number="dedication"
          label="Hores reals"
        />
        <card-widget
          class="tile is-child"
          type="is-success"
          icon="clock"
          :number="estimatedDedication"
          label="Hores previstes"
        /><card-widget
          class="tile is-child"
          type="is-info"
          icon="scale-balance"
          :number="(realIncomes - realExpenses).toFixed(2)"
          suffix="€"
          label="Resultat real"
        />
        <card-widget
          class="tile is-child"
          type="is-info"
          icon="scale-balance"
          :number="balance.toFixed(2)"
          suffix="€"
          label="Resultat previst"
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

      <card-component>
        <form @submit.prevent="submit2">
          <b-field grouped>
            <b-field horizontal label="Estat">
              <b-select
                v-model="filters.project_state"
                placeholder="Estat"
                @change.native="onChange($event)"
              >
                <option
                  v-for="(s, index) in project_states"
                  :key="index"
                  :value="s.id"
                >
                  {{ s.name }}
                </option>
              </b-select>
            </b-field>
            <b-field horizontal label="Nom">
              <b-input
                :value="filters.q" @keyup.native="queryProjects($event.target.value)"
                placeholder="Nom del projecte"
              >
              </b-input>
            </b-field>
            <b-field horizontal>
              <b-button
                class="view-button is-primary"
                @click="navNewProject"
                icon-left="plus">
                Nou projecte
              </b-button>
            </b-field>
            <b-field horizontal>
              <download-csv class="export" :data="projectsCSV">
                <b-button
                title="Exporta dades"
                class="export-button"
                icon-left="export" />
              </download-csv>
            </b-field>
          </b-field>
        </form>
      </card-component>

      <card-component title="Projectes" class="has-table has-mobile-sort-spaced">
        <projects-table :project_state="filters.project_state" :projects="projects" />
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
      estimatedDedication: 0,
      project_states: [],
      filters: { project_state: 1, q: '' },
      queryChanged: 0
    }
  },
  computed: {
    titleStack () {
      return ['Projectes', 'General']
    },
    projectsCSV () {
      // return this.projects
      return this.projects.map(p => { return { 
        id: p.id,
        name: p.name,
        state: p.project_state && p.project_state.id ? p.project_state.name : '',
        scope: p.project_scope && p.project_scope.id ? p.project_scope.name : '',
        leader: p.leader && p.leader.id ? p.leader.name : '',
        estimated_hours: p.total_estimated_hours,        
        real_hours: p.total_real_hours,

        estimated_incomes: p.total_incomes,
        estimated_expenses: p.total_expenses,
        estimated_hours_price: p.total_estimated_hours_price,
        estimated_result: p.incomes_expenses,
        
        real_incomes: p.total_real_incomes,
        real_expenses: p.total_real_expenses,
        real_hours_price: p.total_real_hours_price,
        real_result: p.total_real_incomes_expenses
      }})
    }
  },
  mounted () {
    this.fillChartData()

    this.$buefy.snackbar.open({
      message: 'Benvinguda',
      queue: false
    })

    service({ requiresAuth: true }).get('project-states').then((r) => {
      this.project_states = r.data
      this.project_states.unshift({ id: 0, name: 'Tots' })
      // this.filters.project_state = defaultProjectState
    })

    service({ requiresAuth: true }).get('contacts/count').then((r) => {
      // console.log('contacts', r.data)
      this.contactsNumber = r.data
    })

    service({ requiresAuth: true }).get('projects?_limit=-1&project_state=1').then((r) => {
      this.projects = r.data.filter(p => p.project_state !== null && p.project_state.id === 1)
      this.applyProjects()
    })
  },
  methods: {
    navNewProject () {
      this.$router.push('/project/0')
    },
    onChange (event) {
      this.doFilteredQuery(this.filters.q)
    },
    randomChartData (n) {
      const data = []

      for (let i = 0; i < n; i++) {
        data.push(Math.round(Math.random() * 200))
      }

      return data
    },
    queryProjects (q) {
      if (this.queryChanged) {
        clearTimeout(this.queryChanged)
      }
      this.queryChanged = setTimeout(() => {
        this.filters.q = q
        this.doFilteredQuery(q)
      }, 400)
    },
    doFilteredQuery (q) {
      const where = this.filters.project_state ? `&project_state=${this.filters.project_state}` : ''
      if (q) {
        service({ requiresAuth: true }).get(`projects?_limit=-1&_sort=name:ASC&_q=${this.filters.q}${where}`).then((r) => {
          this.projects = r.data
          this.applyProjects()
        })
      } else {
        service({ requiresAuth: true }).get(`projects?_limit=-1${where}`).then((r) => {
          this.projects = r.data
          this.applyProjects()
        })
      }
      // page=1&pageSize=10&_sort=name:ASC&_q=c00
    },
    applyProjects () {
      this.projectsNumber = this.projects.length
      this.balance = sumBy(this.projects, p => {
        return p.incomes_expenses
      })
      this.realIncomes = sumBy(this.projects, 'total_real_incomes_expenses')
      this.realExpenses = sumBy(this.projects, p => {
        return 0
      })
      this.estimatedDedication = sumBy(this.projects, p => {
        return p.total_estimated_hours ? p.total_estimated_hours : 0
      })
      this.dedication = sumBy(this.projects, p => {
        return p.total_real_hours ? p.total_real_hours : 0
      })

      // service({ requiresAuth: true }).get('activities?_limit=-1').then((r) => {
      //   this.activities = r.data.filter(a => a.project !== null && this.projects.find(p => p.id === a.project.id))
      //   this.dedication = sumBy(this.activities, p => {
      //     return p.hours
      //   })
      // })
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
          }
        ],
        labels: ['01', '02', '03', '04', '05', '06', '07', '08', '09']
      }
    }
  }
}
</script>
