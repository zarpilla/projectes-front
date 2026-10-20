<template>
  <div v-if="!isLoading">
    <title-bar :title-stack="titleStack" :subtitle="subtitle" />
    <section class="section is-main-section">
      <form class="filter-bar" role="search" aria-label="Filtres" @submit.prevent>
        <label class="filter-select">
          <span>Any</span>
          <b-select v-model="filters.year" aria-label="Any">
            <option v-for="(year, index) in years" :key="index" :value="year">{{ yearLabel(year.year) }}</option>
          </b-select>
        </label>
        <label class="filter-select">
          <span>Estat projecte</span>
          <b-select v-model="filters.project_state" aria-label="Estat projecte">
            <option v-for="(state, index) in projectStates" :key="index" :value="state.id">{{ state.name }}</option>
          </b-select>
        </label>
        <div class="segmented" role="group" aria-label="Hores">
          <button v-for="t in ['Manuals previstes', 'Previstes', 'Reals']" :key="t" type="button" :class="{ 'is-on': filters.type === t }" @click="filters.type = t">{{ t }}</button>
        </div>
        <div class="segmented" role="group" aria-label="Visualització">
          <button v-for="v in ['Bestretes', 'Factures']" :key="v" type="button" :class="{ 'is-on': filters.view === v }" @click="filters.view = v">{{ v }}</button>
        </div>
      </form>
      <justification
        :type="filters.type"
        :year="filters.year ? filters.year.year : null"
        :view="filters.view"
        :project-state="filters.project_state"
      />
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar.vue'
import CardComponent from '@/components/CardComponent.vue'
import Justification from '@/components/Justification.vue'
import service from '@/service/index'
import { fiscalYearLabel } from '@/domain/years'
import { loadFiscalSettings } from '@/service/fiscalYear'
import { mapState } from 'pinia'
import { useMainStore } from '@/stores/main.js'
import { loadKendo } from '@/helpers/addScript'

export default {
  name: 'Justifications',
  components: {
    CardComponent,
    TitleBar,
    Justification
  },
  data () {
    return {
      isLoading: false,
      filters: {
        type: 'Manuals previstes',
        year: null,
        view: 'Bestretes',
        project_state: null
      },
      projects: [],
      usersList: [],
      projectSearch: '',
      years: [],
      projectStates: [],
      grantStartMonth: 1
    }
  },
  computed: {
    ...mapState(useMainStore, ['userName']),
    yearLabel () {
      return year => fiscalYearLabel(year, this.grantStartMonth)
    },
    titleStack () {
      return ['Informes', 'Justificacions']
    },
    subtitle () {
      return 'Cost de les hores i despeses justificables dels projectes subvencionables.'
    },
  },
  
  mounted () {
    this.isLoading = true

    const interval = setInterval(async () => {
      if (window.jQuery) {
        clearInterval(interval)
        await loadKendo()

        // grant years read «2026/27» when they are fiscal years (Configuració general)
        const fiscal = await loadFiscalSettings()
        this.grantStartMonth = fiscal.grantableFiscal ? fiscal.startMonth : 1
        const r = await service({ requiresAuth: true, cached: true }).get('years?_sort=year:DESC')
        const years = r.data
        years.unshift({ id: -1, year: 'Tots' })
        this.filters.year = years[0]
        this.years = years

        this.projectStates = await service({ requiresAuth: true, cached: true })
          .get('project-states')
          .then(r => r.data)
        this.projectStates.unshift({ id: 0, name: 'Tots' })
        this.filters.project_state = 1

        this.isLoading = false        
      }
    }, 100)   
  },
  methods: {
  }
}
</script>
