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
      <form class="filter-bar" role="search" aria-label="Filtres" @submit.prevent>
        <label class="filter-select">
          <span>Estat projecte</span>
          <b-select v-model="filters.project_state" aria-label="Estat projecte">
            <option v-for="(s, index) in project_states" :key="index" :value="s.id">{{ s.name }}</option>
          </b-select>
        </label>
      </form>
      <dedication-pivot v-if="!isLoading" :project-state="filters.project_state" :year="filters.year" />
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar.vue'
import CardComponent from '@/components/CardComponent.vue'
import DedicationPivot from '@/components/DedicationPivot.vue'
import service from '@/service/index'
import defaultProjectState from '@/service/projectState'
import { addScript, addStyle } from '@/helpers/addScript'
import moment from 'moment'
import getConfig from '@/config'

export default {
  name: 'StatsDedicacio',
  components: {
    // HeroBar,
    CardComponent,
    TitleBar,
    // DedicationWidget,
    DedicationPivot
  },
  data () {
    return {
      isLoading: true,
      filters: {
        project_state: null,
        year: null
      },
      project_states: [],
      years: []
    }
  },
  computed: {
    titleStack () {
      return ['Informes', 'Dedicació per projecte']
    },
    subtitle () {
      return 'Hores reals de cada projecte. Configura la taula dinàmica per veure-les per persona, tipus de dedicació o funció.'
    }
  },
  async mounted () {
    this.isLoading = true

    const interval = setInterval(async () => {
      if (window.jQuery) {
        clearInterval(interval)
        const config = getConfig();
        const basePath = config.VUE_APP_PATH || '';
        await addScript(basePath + '/vendor/kendo/kendo.all.min.js', 'kendo-all-min-js')
        await addStyle(basePath + '/vendor/kendo/kendo.common.min.css', 'kendo-common-min-css')
        await addStyle(basePath + '/vendor/kendo/kendo.custom.css', 'kendo-custom-css')
        await addStyle(basePath + '/vendor/kendo/custom.css', 'custom-css')        
        this.getData()
        setTimeout(() => {
          this.isLoading = false
        }, 250)
      }
    }, 100)

  },
  methods: {
    getData () {
      service({ requiresAuth: true }).get('project-states').then((r) => {
        this.project_states = [...r.data];
        this.project_states.unshift({ id: 0, name: 'Tots' })
        this.filters.project_state = defaultProjectState
      })
      service({ requiresAuth: true, cached: true }).get('years?_sort=year:DESC').then((r) => {
        this.years = r.data
        this.years.unshift({ id: 0, year: 0 })
        // this.filters.year = 0
        this.filters.year = this.years.find(y => y.year.toString() === moment().format('YYYY')).year
        this.isLoading = false
      })
    },
  }
}
</script>
<style>
.k-header, .k-grid-header, .k-grouping-header, .k-pager-wrap, .k-state-highlight, .k-panelbar .k-tabstrip-items .k-item{
  background-color: var(--a-thead)!important;
  border-color: var(--a-line)!important;
}
.k-pivot-toolbar .k-button{
  background-color: #999!important;
  border-color: #999!important;
}
</style>
