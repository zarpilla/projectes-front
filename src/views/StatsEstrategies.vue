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
      <strategies-stats
        v-if="projects"
        :projects="projects"
        :strategies="strategies"
        :state-name="stateName"
        @show-all="filters.project_state = 0"
      />
      <estrategies-pivot v-if="!isLoading" :project-state="filters.project_state" @loaded="rows => (projects = rows)" />
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar.vue'
import EstrategiesPivot from '@/components/EstrategiesPivot.vue'
import StrategiesStats from '@/components/StrategiesStats.vue'
import service from '@/service/index'
import defaultProjectState from '@/service/projectState'
import { loadKendo, waitForJQuery } from '@/helpers/addScript'

export default {
  name: 'StatsEstrategies',
  components: {
    TitleBar,
    EstrategiesPivot,
    StrategiesStats
  },
  data () {
    return {
      isLoading: true,
      filters: {
        project_state: null
      },
      project_states: [],
      // the pivot's projects, for the tables above it
      projects: null,
      strategies: []
    }
  },
  computed: {
    titleStack () {
      return ['Informes', 'Estratègies']
    },
    subtitle () {
      return 'Quins projectes treballen cada línia estratègica, amb les hores previstes i el balanç. A sota, la taula dinàmica per agrupar-los com vulguis.'
    },
    // null for «Tots»
    stateName () {
      const state = this.project_states.find(s => s.id === this.filters.project_state)
      return state && state.id ? state.name : null
    }
  },
  async mounted () {
    this.isLoading = true

    this.stopJQueryWait = waitForJQuery(async () => {
      await loadKendo()
      this.isLoading = false
      this.getData()
    })

  },
  beforeUnmount () {
    this.stopJQueryWait()
  },
  methods: {
    getData () {
      service({ requiresAuth: true }).get('project-states').then((r) => {
        this.project_states = r.data
        this.project_states.unshift({ id: 0, name: 'Tots' })
        this.filters.project_state = defaultProjectState
      })
      // all of them, for «Estratègies en ús · X de Y»
      service({ requiresAuth: true }).get('strategies?_limit=-1').then((r) => {
        this.strategies = r.data || []
      }).catch(() => {
        this.strategies = []
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
