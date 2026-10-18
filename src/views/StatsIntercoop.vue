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
      <intercoop-pivot v-if="!isLoading" :project-state="filters.project_state" />
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar.vue'
import CardComponent from '@/components/CardComponent.vue'
import IntercoopPivot from '@/components/IntercoopPivot.vue'
import service from '@/service/index'
import defaultProjectState from '@/service/projectState'
import { addScript, addStyle, underBase } from '@/helpers/addScript'
import getConfig from '@/config'

export default {
  name: 'StatsIntercoop',
  components: {
    CardComponent,
    TitleBar,
    IntercoopPivot
  },
  data () {
    return {
      isLoading: true,
      filters: {
        project_state: null
      },
      project_states: []
    }
  },
  computed: {
    titleStack () {
      return ['Informes', 'Intercooperació']
    },
    subtitle () {
      return 'Projectes i imports amb altres entitats. Configura la taula dinàmica per agrupar-los com vulguis.'
    }
  },
  async mounted () {
    this.isLoading = true

    const interval = setInterval(async () => {
      if (window.jQuery) {
        clearInterval(interval)
        const config = getConfig();
        const basePath = config.VUE_APP_PATH || '';
        await addScript(underBase(basePath, 'vendor/kendo/kendo.all.min.js'), 'kendo-all-min-js')
        await addStyle(underBase(basePath, 'vendor/kendo/kendo.common.min.css'), 'kendo-common-min-css')
        await addStyle(underBase(basePath, 'vendor/kendo/kendo.custom.css'), 'kendo-custom-css')
        await addStyle(underBase(basePath, 'vendor/kendo/custom.css'), 'custom-css')
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
