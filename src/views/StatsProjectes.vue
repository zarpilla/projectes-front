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
          <b-field horizontal label="Estat projecte">
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
            <!-- <b-field label="Inici">
              <b-datepicker
                v-model="filters.date1"
                :show-week-number="false"
                :locale="'ca-ES'"
                :first-day-of-week="1"
                icon="calendar-today"
                :disabled="filters.lastUpdated"
                trap-focus>
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
                trap-focus>
              </b-datepicker>
            </b-field> -->
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
        <projectes-pivot :project-state="filters.project_state" :date1="filters.date1" :date2="filters.date2" v-if="!isLoading" />
      </card-component>
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar'
import CardComponent from '@/components/CardComponent'
import ProjectesPivot from '@/components/ProjectesPivot'
import service from '@/service/index'
import moment from 'moment'
import defaultProjectState from '@/service/projectState'
import { addScript, addStyle } from '@/helpers/addScript'

export default {
  name: 'StatsProjectes',
  components: {
    // HeroBar,
    CardComponent,
    TitleBar,
    // DedicationWidget,
    ProjectesPivot
  },
  data () {
    return {
      isLoading: true,
      filters: {
        project_state: null,
        date1: null,
        date2: null
      },
      project_states: []
    }
  },
  computed: {
    titleStack () {
      return ['Projectes', 'Estadístiques']
    }
  },
  async mounted () {
    this.isLoading = true
    this.filters.date1 = moment().add(-6, 'days').toDate()
    this.filters.date2 = moment().toDate()

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
