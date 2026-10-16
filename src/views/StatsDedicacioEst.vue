<template>
  <div v-if="!isLoading">
    <title-bar :title-stack="titleStack" :subtitle="subtitle" />
    <!-- <hero-bar>
      Dedicació
      <template #right>
        <router-link to="/" class="button">
          Dashboard
        </router-link>
      </template>
    </hero-bar> -->
    <section class="section is-main-section">
      <form class="filter-bar" role="search" aria-label="Filtres" @submit.prevent="applyFilters">
        <label class="filter-select">
          <span>Estat projecte</span>
          <b-select v-model="filters.project_state" aria-label="Estat projecte">
            <option v-for="(s, index) in project_states" :key="index" :value="s.id">{{ s.name }}</option>
          </b-select>
        </label>
        <label class="filter-select">
          <span>Any</span>
          <b-select v-model="filters.year" aria-label="Any">
            <option v-for="(s, index) in years" :key="index" :value="s.year">{{ s.display }}</option>
          </b-select>
        </label>
        <label class="filter-select">
          <span>Persona</span>
          <b-select v-model="filters.user" aria-label="Persona">
            <option v-for="(s, index) in users" :key="index" :value="s.id">{{ s.username }}</option>
          </b-select>
        </label>
        <b-button type="is-primary" native-type="submit">Aplica</b-button>
      </form>
      <dedication-est-pivot
        v-if="!isLoading1 && !isLoading2 && !isLoading3"
        :project-state="appliedFilters.project_state"
        :year="appliedFilters.year"
        :person="appliedFilters.user"
      />
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar.vue'
import CardComponent from '@/components/CardComponent.vue'
import DedicationEstPivot from '@/components/DedicationEstPivot.vue'
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
      isLoading1: true,
      isLoading2: true,
      isLoading3: true,
      filters: {
        project_state: null,
        year: null,
        user: null
      },
      // Committed filters actually passed to the pivot. Dropdowns edit
      // `filters` above without firing requests; only the "Aplicar" button
      // copies them here, which is what triggers the child's watchers.
      appliedFilters: {
        project_state: null,
        year: null,
        user: null
      },
      project_states: [],
      years: [],
      users: []
    }
  },
  computed: {
    titleStack () {
      return ['Informes', 'Previsió i execució de la dedicació']
    },
    subtitle () {
      return 'Hores previstes i fetes per projecte i persona. Tria els filtres i aplica-ho.'
    }
  },
  async mounted () {
    this.isLoading = true

    const interval = setInterval(async () => {
      if (window.jQuery) {
        clearInterval(interval)
        await addScript((import.meta.env.VUE_APP_PATH ? import.meta.env.VUE_APP_PATH : '') + '/vendor/kendo/kendo.all.min.js', 'kendo-all-min-js')
        await addStyle((import.meta.env.VUE_APP_PATH ? import.meta.env.VUE_APP_PATH : '') + '/vendor/kendo/kendo.common.min.css', 'kendo-common-min-css')
        await addStyle((import.meta.env.VUE_APP_PATH ? import.meta.env.VUE_APP_PATH : '') + '/vendor/kendo/kendo.custom.css', 'kendo-custom-css')
        await addStyle((import.meta.env.VUE_APP_PATH ? import.meta.env.VUE_APP_PATH : '') + '/vendor/kendo/custom.css', 'custom-css')
        this.isLoading = false
        this.getData()
      }
    }, 100)

  },
  methods: {
    getData () {
      service({ requiresAuth: true }).get('project-states').then((r) => {
        this.project_states = [...r.data];
        this.project_states.unshift({ id: 0, name: 'Tots' })
        this.filters.project_state = defaultProjectState
        this.appliedFilters.project_state = defaultProjectState
        this.isLoading1 = false
      })
      service({ requiresAuth: true, cached: true }).get('years?_sort=year:DESC').then((r) => {
        this.years = r.data.map(y => { return { ...y, display: y.year } })
        this.years.unshift({ id: 0, year: 0, display: 'Tots' })
        this.filters.year = 0
        this.appliedFilters.year = 0
        this.isLoading2 = false
      })
      service({ requiresAuth: true, cached: true }).get('users').then((r) => {
        this.users = r.data.filter((u) => !u.hidden);
        this.users.unshift({ id: 0, username: 'Tots' })
        this.filters.user = 0
        this.appliedFilters.user = 0
        this.isLoading3 = false
      })
    },
    applyFilters () {
      this.appliedFilters = { ...this.filters }
    },
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
.mt-x{
  margin-top: 2.0rem;
}
</style>
