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
      <estrategies-pivot v-if="!isLoading" :project-state="filters.project_state" />
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar.vue'
import CardComponent from '@/components/CardComponent.vue'
import EstrategiesPivot from '@/components/EstrategiesPivot.vue'
import service from '@/service/index'
import defaultProjectState from '@/service/projectState'
import { addScript, addStyle } from '@/helpers/addScript'

export default {
  name: 'StatsDedicacio',
  components: {
    // HeroBar,
    CardComponent,
    TitleBar,
    // DedicationWidget,
    EstrategiesPivot
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
      return ['Informes', 'Estratègies']
    },
    subtitle () {
      return 'Hores, ingressos i resultats per estratègia. Configura la taula dinàmica per agrupar-los com vulguis.'
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
        this.project_states = r.data
        this.project_states.unshift({ id: 0, name: 'Tots' })
        this.filters.project_state = defaultProjectState
      })
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
</style>
