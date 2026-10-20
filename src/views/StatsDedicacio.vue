<template>
  <!-- Informes › Dedicació: one report for the hours, planned and worked. It merged
       «Dedicació (gràfic)», «Dedicació (taula)» and «Prev./Real dedicació»: charts on
       top, the pivot below, both from the same rows. -->
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
        <label class="filter-select">
          <span>Any</span>
          <b-select v-model="filters.year" aria-label="Any">
            <option v-for="(s, index) in years" :key="index" :value="s.year">{{ s.display }}</option>
          </b-select>
        </label>
        <!-- without full access she sees only her own done hours (issues/188), so the
             planned ones are hers too: the report is about her (issues/223) -->
        <label v-if="canPickPerson" class="filter-select">
          <span>Persona</span>
          <b-select v-model="filters.user" aria-label="Persona">
            <option v-for="(s, index) in users" :key="index" :value="s.id">{{ s.username }}</option>
          </b-select>
        </label>
        <label class="filter-select">
          <span>Projecte</span>
          <b-autocomplete
            v-model="projectSearch"
            placeholder="Tots"
            aria-label="Projecte"
            :keep-first="false"
            :open-on-focus="true"
            :data="filteredProjects"
            field="name"
            :clearable="true"
            @select="option => (filters.project = option ? option.id : 0)"
          />
        </label>
      </form>
      <dedication-charts v-if="chartRows" :rows="chartRows" :year="appliedFilters.year" :show-cost="showCost" />
      <dedication-est-pivot
        v-if="ready"
        :project-state="appliedFilters.project_state"
        :year="appliedFilters.year"
        :person="appliedFilters.user"
        :project="appliedFilters.project"
        :show-cost="showCost"
        @loaded="rows => (chartRows = rows)"
      />
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar.vue'
import DedicationEstPivot from '@/components/DedicationEstPivot.vue'
import DedicationCharts from '@/components/DedicationCharts.vue'
import service from '@/service/index'
import defaultProjectState from '@/service/projectState'
import { defaultYear } from '@/domain/years'
import { loadKendo } from '@/helpers/addScript'
import { canPickPerson, userPermissions } from '@/domain/routeAccess'
import moment from 'moment'

export default {
  name: 'StatsDedicacio',
  components: {
    TitleBar,
    DedicationEstPivot,
    DedicationCharts
  },
  data () {
    return {
      isLoading: true,
      ready: false,
      filters: { project_state: null, year: null, user: 0, project: 0 },
      appliedFilters: { project_state: null, year: null, user: 0, project: 0 },
      project_states: [],
      years: [],
      users: [],
      projects: [],
      projectSearch: '',
      // the cost of the hours (from salaries) only for people with the projects permission;
      // the report is open to hours-only people too, as «Dedicació (gràfic/taula)» were
      showCost: false,
      // only `projects` / `admin` see everyone's hours; the others, only hers (issues/223)
      canPickPerson: true,
      // rows loaded by the pivot, for the charts
      chartRows: null
    }
  },
  computed: {
    titleStack () {
      return ['Informes', 'Dedicació']
    },
    subtitle () {
      return 'Hores previstes i fetes per projecte i persona: un resum en gràfics i, a sota, el detall a la taula dinàmica.'
    },
    filteredProjects () {
      const q = (this.projectSearch || '').toLowerCase()
      return this.projects.filter(p => p.name && p.name.toLowerCase().includes(q))
    }
  },
  watch: {
    // the report follows the filters right away (several changes in a row reload once)
    filters: {
      deep: true,
      handler () {
        if (!this.ready) return
        clearTimeout(this.applyTimer)
        this.applyTimer = setTimeout(() => { this.appliedFilters = { ...this.filters } }, 400)
      }
    }
  },
  async mounted () {
    const interval = setInterval(async () => {
      if (window.jQuery) {
        clearInterval(interval)
        await loadKendo()
        await this.getData()
        this.isLoading = false
      }
    }, 100)
  },
  methods: {
    async getData () {
      const me = await service({ requiresAuth: true, cached: true }).get('users/me')
      const permissions = userPermissions(me.data)
      this.showCost = permissions.includes('projects')
      this.canPickPerson = canPickPerson(permissions)
      const [states, years, users, projects] = await Promise.all([
        service({ requiresAuth: true }).get('project-states'),
        service({ requiresAuth: true, cached: true }).get('years?_sort=year:DESC'),
        service({ requiresAuth: true, cached: true }).get('users'),
        service({ requiresAuth: true }).get('projects/basic?_limit=-1&_sort=name:ASC')
      ])
      this.project_states = [{ id: 0, name: 'Tots' }, ...states.data]
      this.years = [{ id: 0, year: 0, display: 'Tots' }, ...years.data.map(y => ({ ...y, display: y.year }))]
      // the API gives her only her own done hours (issues/188): the planned hours and
      // the KPIs (persones, projectes, previstes) are hers too, not everyone's (issues/223)
      this.users = this.canPickPerson
        ? [{ id: 0, username: 'Totes' }, ...users.data.filter(u => !u.hidden)]
        : [{ id: me.data.id, username: me.data.username }]
      const person = this.canPickPerson ? 0 : me.data.id
      this.projects = projects.data
      // this year by default, so the charts go month by month
      const current = defaultYear(years.data.filter(y => Number(y.year) <= moment().year()))
      this.filters = { project_state: defaultProjectState, year: current ? Number(current.year) : 0, user: person, project: 0 }
      this.appliedFilters = { ...this.filters }
      this.$nextTick(() => { this.ready = true })
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
