<template>
  <div v-if="!isLoading">
    <title-bar :title-stack="titleStack" />
    <!-- <hero-bar>
      Dedicació
      <router-link slot="right" to="/" class="button">
        Dashboard
      </router-link>
    </hero-bar> -->
    <section class="section is-main-section">
      <card-component title="Filtres">
        <form @submit.prevent="submit2">
          <b-field horizontal>
            <b-field label="Estat projecte">
              <b-select
                v-model="filters.project_state"
                placeholder="Estat"
                required
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
            <b-field label="Any">
              <b-select
                v-model="filters.year"
                placeholder="Any"
                required
              >
                <option
                  v-for="(s, index) in years"
                  :key="index"
                  :value="s.year"
                >
                  {{ s.display }}
                </option>
              </b-select>
            </b-field>
            <b-field label="Mes">
              <b-select
                v-model="filters.month"
                placeholder="Mes"
                required
              >
                <option
                  v-for="(s, index) in months"
                  :key="index"
                  :value="s.month"
                >
                  {{ s.display }}
                </option>
              </b-select>
            </b-field>
            <!-- <b-field label="Persona">
              <b-autocomplete
                v-model="userNameSearch"
                placeholder="Persona"
                :keep-first="false"
                :open-on-focus="true"
                :data="filteredUsers"
                field="username"
                @select="(option) => (filters.user = option ? option.id : null)"
                :clearable="true"
              >
              </b-autocomplete>
            </b-field>
            <b-field label="Projecte">
              <b-autocomplete
                v-model="projectNameSearch"
                placeholder="Projecte"
                :keep-first="false"
                :open-on-focus="true"
                :data="filteredProjects"
                field="name"
                @select="
                  (option) => (filters.project = option ? option.id : null)
                "
                :clearable="true"
              >
              </b-autocomplete>
            </b-field> -->
            <!-- <b-field label="Inici">
              <b-datepicker
                v-model="filters.date1"
                :show-week-number="false"
                :locale="'ca-ES'"
                :first-day-of-week="1"
                icon="calendar-today"
                :disabled="filters.lastUpdated"
                trap-focus
              >
              </b-datepicker>
            </b-field>
            <b-field label="Final">
              <b-datepicker
                v-model="filters.date2"
                :show-week-number="false"
                :locale="'ca-ES'"
                :first-day-of-week="1"
                icon="calendar-today"
                :disabled="filters.lastUpdated"
                trap-focus
              >
              </b-datepicker>
            </b-field>
            <b-field label="Últimes">
              <b-checkbox v-model="filters.lastUpdated"> </b-checkbox>
            </b-field> -->
          </b-field>
        </form>
      </card-component>

      <card-component title="Projectes">
        <dedication-est-pivot :project-state="filters.project_state" :year="filters.year" :month="filters.month" v-if="!isLoading" />
      </card-component>
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar'
import CardComponent from '@/components/CardComponent'
import DedicationEstPivot from '@/components/DedicationEstPivot'
import service from '@/service/index'
import defaultProjectState from '@/service/projectState'
import { addScript, addStyle } from '@/helpers/addScript'
// import moment from 'moment'

export default {
  name: 'StatsDedicacio',
  components: {
    // HeroBar,
    CardComponent,
    TitleBar,
    // DedicationWidget,
    DedicationEstPivot
  },
  data () {
    return {
      isLoading: true,
      filters: {
        project_state: null,
        year: null,
        month: null
      },
      project_states: [],
      years: [],
      months: null
    }
  },
  computed: {
    titleStack () {
      return ['Dedicació', 'Previsió dedicació']
    }
  },
  async mounted () {
    this.isLoading = true

    const interval = setInterval(async () => {
      if (window.jQuery) {
        clearInterval(interval)
        await addScript((process.env.VUE_APP_PATH ? process.env.VUE_APP_PATH : '') + '/vendor/kendo/kendo.all.min.js', 'kendo-all-min-js')
        await addStyle((process.env.VUE_APP_PATH ? process.env.VUE_APP_PATH : '') + '/vendor/kendo/kendo.common.min.css', 'kendo-common-min-css')
        await addStyle((process.env.VUE_APP_PATH ? process.env.VUE_APP_PATH : '') + '/vendor/kendo/kendo.custom.css', 'kendo-custom-css')
        await addStyle((process.env.VUE_APP_PATH ? process.env.VUE_APP_PATH : '') + '/vendor/kendo/custom.css', 'custom-css')
        this.isLoading = false
        this.getData()
      }
    }, 100)

    // setInterval(async () => {
    //   console.log('kendoPivotGrid', kendoPivotGrid)
    // }, 300)
  },
  methods: {
    getData () {
      service({ requiresAuth: true }).get('project-states').then((r) => {
        this.project_states = r.data
        this.project_states.unshift({ id: 0, name: 'Tots' })
        this.filters.project_state = defaultProjectState
      })
      service({ requiresAuth: true }).get('years').then((r) => {
        this.years = r.data.map(y => { return { ...y, display: y.year } })
        this.years.unshift({ id: 0, year: 0, display: 'Tots' })
        this.filters.year = 0
      })
      service({ requiresAuth: true }).get('months').then((r) => {
        this.months = r.data.map(y => { return { ...y, display: `${y.month_number} - ${y.name}` } })
        this.months.unshift({ id: 0, month: 0, display: 'Tots' })
        this.filters.month = 0
      })
    },
    async addScript (src) {
      return new Promise((resolve, reject) => {
        const head = document.head || document.getElementsByTagName('head')[0]
        const script = document.createElement('script')
        script.src = src
        script.addEventListener('load', resolve)
        script.addEventListener('error', (e) => reject(e))
        script.addEventListener('abort', (e) => reject(e))
        head.appendChild(script)
      })
    },
    async addStyle (src) {
      return new Promise((resolve, reject) => {
        const head = document.head || document.getElementsByTagName('head')[0]
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = src
        link.addEventListener('load', resolve)
        link.addEventListener('error', (e) => reject(e))
        link.addEventListener('abort', (e) => reject(e))
        head.appendChild(link)
      })
    }
  }
}
</script>
<style>
.k-header, .k-grid-header, .k-grouping-header, .k-pager-wrap, .k-state-highlight, .k-panelbar .k-tabstrip-items .k-item{
  background-color: #f3f3f3!important;
  border-color: #ddd!important;
}
.k-pivot-toolbar .k-button{
  background-color: #999!important;
  border-color: #999!important;
}
</style>
