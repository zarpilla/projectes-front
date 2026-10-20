<template>
  <div v-if="!isLoading">
    <title-bar :title-stack="titleStack" :subtitle="subtitle" />
    <section class="section is-main-section">
      <form class="filter-bar" role="search" aria-label="Filtres" @submit.prevent>
        <label class="filter-select">
          <span>Estat projecte</span>
          <b-select v-model="filters.project_state" aria-label="Estat projecte">
            <option v-for="(s, index) in project_states" :key="index" :value="s.id">{{ s.name }}</option>
          </b-select>
        </label>
      </form>
      <project-stats-charts v-if="chartRows" :rows="chartRows" />
      <projectes-pivot v-if="!isLoading" :project-state="filters.project_state" @loaded="rows => (chartRows = rows)" />
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar.vue'
import CardComponent from '@/components/CardComponent.vue'
import ProjectesPivot from '@/components/ProjectesPivot.vue'
import ProjectStatsCharts from '@/components/ProjectStatsCharts.vue'
import service from '@/service/index'
import moment from 'moment'
import defaultProjectState from '@/service/projectState'
import { loadKendo } from '@/helpers/addScript'

export default {
  name: 'StatsProjectes',
  components: {
    // HeroBar,
    CardComponent,
    TitleBar,
    // DedicationWidget,
    ProjectesPivot,
    ProjectStatsCharts
  },
  data () {
    return {
      isLoading: true,
      filters: {
        project_state: null,
      },
      project_states: [],
      // rows loaded by the pivot, for the charts
      chartRows: null
    }
  },
  computed: {
    titleStack () {
      return ['Informes', 'Projectes']
    },
    subtitle () {
      return 'Hores, ingressos, despeses i resultats dels projectes: un resum en gràfics i, a sota, el detall a la taula dinàmica.'
    }
  },
  async mounted () {
    this.isLoading = true
    
    const interval = setInterval(async () => {
      if (window.jQuery) {
        clearInterval(interval)
        await loadKendo()
        this.isLoading = false
        this.getData()
      }
    }, 100)    
  },
  methods: {
    getData () {
      service({ requiresAuth: true }).get('project-states').then((r) => {
        this.project_states = r.data
        this.project_states.unshift({ id: 0, name: 'Tots' })
        this.filters.project_state = defaultProjectState
      })
    }
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
