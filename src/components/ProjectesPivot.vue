<template>
  <div>
    <!-- Pivot Views Component -->
    <pivot-views
      :pivot-views="pivotViews"
      :selected-view-id="selectedViewId"
      :show-save-modal="showSaveViewModal"
      :view-name="newViewName"
      @apply-view="applyPivotView"
      @apply-default="applyDefaultView"
      @save-view="showSaveView"
      @delete-view="deletePivotView"
      @close-save-modal="showSaveViewModal = false"
      @confirm-save="saveCurrentView"
      @update:viewName="newViewName = $event"
    />
    
    <div id="project-stats"></div>
    <download-excel name="panell-projectes" class="export" :data="pivotData">
      <b-button title="Exporta dades" icon-left="download">Exporta</b-button>
    </download-excel>
  </div>
</template>

<script>
import { ownFiguresIgnored } from '@/domain/motherFigures'
import service from '@/service/index'
import { projectStatsRow } from '@/domain/projectPivotRows'
import { loadFiscalSettings } from '@/service/fiscalYear'
import sortBy from 'lodash/sortBy'
import moment from 'moment'
import configPivot from '@/service/configStatsProject'
import PivotViews from '@/components/PivotViews.vue'
import pivotViewsMixin from '@/mixins/pivotViewsMixin.js'

moment.locale('ca')

export default {
  name: 'ProjectesPivot',
  components: { PivotViews },
  emits: ['loaded'],
  mixins: [pivotViewsMixin],
  props: {
    projectState: {
      type: Number,
      default: 0
    }
  },
  data () {
    return {
      projects: [],
      projectsList: [],
      dedicationTypes: {},
      activityTypes: {},
      users: [],
      usersList: [],
      modalObjectName: '',
      userNameSearch: '',
      projectNameSearch: '',
      scopes: [],
      states: [],
      leaders: [],
      contacts: [],
      pivotData: [],
      pivotIdentifier: 'projectes-pivot'
    }
  },
  watch: {
    // user: function (newVal, oldVal) {
    //   this.getActivities()
    // },
    date1: function (newVal, oldVal) {
      this.getActivities()
    },
    date2: function (newVal, oldVal) {
      this.getActivities()
    },
    // project: function (newVal, oldVal) {
    //   this.getActivities()
    // },
    projectState: {
      handler: function (newVal, oldVal) {
        if (newVal !== null && newVal !== undefined) {
          this.getActivities()
        }
      },
      immediate: true
    }
  },
  mounted () {
  },
  methods: {
    async getActivities () {
      this.isLoading = true
      // «Any inici» is a fiscal year (Configuració general › Projectes)
      const { startMonth } = await loadFiscalSettings()

      this.scopes = (await service({ requiresAuth: true }).get('project-scopes')).data
      this.states = (await service({ requiresAuth: true }).get('project-states')).data
      this.leaders = (await service({ requiresAuth: true, cached: true }).get('users')).data
      this.contacts = (await service({ requiresAuth: true }).get('contacts/basic?_limit=-1&_sort=name:ASC')).data

      const projectState = this.projectState !== null ? this.projectState : 1
      // with-activities: this pivot sums the logged hours of each project (issues/016)
      let query = `projects/with-activities?_where[project_state_eq]=${projectState}&_limit=-1`
      if (projectState === 0 || projectState === '0') {
        query = 'projects/with-activities?_limit=-1'
      }
      
      service({ requiresAuth: true }).get(query).then((r) => {
        const projects = r.data.map(ownFiguresIgnored).map(p => projectStatsRow(p, startMonth))

        this.projects = r.data
        this.pivotData = Object.freeze(sortBy(projects, ['project_name']))
        // the charts above the pivot use the same rows
        this.$emit('loaded', this.pivotData)
        configPivot.dataSource.data = this.pivotData
        this.initializePivotWithViews('#project-stats', configPivot)
        // setTimeout(() => {
        //   const b1 = window.jQuery('.k-button[data-name=project_state]')
        //   b1.text(b1.text().replace('project_state', 'Estat'))
        // }, 500)
        this.isLoading = false
      })
    },
    applyDefaultView() {
      this.selectedViewId = null
      if (this.pivotGridInstance) {
        // Reset to default configuration
        const dataSource = this.pivotGridInstance.dataSource
        const defaultConfig = configPivot.dataSource
        
        dataSource.columns(defaultConfig.columns || [])
        dataSource.rows(defaultConfig.rows || [])
        dataSource.measures(defaultConfig.measures || [])
        // Note: Kendo Pivot Grid doesn't support filters() method
        // dataSource.filters([])
        
        this.selectedViewId = null
      }
    },
    exportCSV () {

    }
  },
}
</script>
<style>
.card-body{
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--a-line-soft);
}
.is-activity{
  cursor: pointer;
}
.is-total{
  background: var(--a-chip);
  text-transform: capitalize;
}
.auxiliar{
  color:var(--a-muted);
}
.projects-bars{
  margin-bottom: 2rem;
}
.projects-bars progress{
  margin-top: 1rem;
}
.view-button{
  margin-left: 0.5rem;
}
.export-button{
  margin-top: 1rem;
}
</style>
