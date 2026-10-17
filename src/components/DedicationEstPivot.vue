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
    <b-loading
        :is-full-page="true"
        v-model="isLoading"
        :can-cancel="false"
      ></b-loading>
    <download-excel name="dedicacio" :data="pivotData"
    
    :fields="{
        project_name: 'project_name',
        project_leader: 'project_leader',
        project_state: 'project_state',
        project_scope: 'project_scope',        
        project_client: 'project_client',        
        username: 'username',
        dedication_type: 'dedication_type',
        activity_type: 'activity_type',
        project_type: 'project_type',
        project_likelihood: 'project_likelihood',
        date: 'date',
        year: 'year',
        month: 'month',
        day: 'day',
        hours: 'hours',
        estimated_hours: {
          field: 'estimated_hours',
          callback: (value) => {
            return excelFormat(value);
          },
        },
        original_estimated_hours: {
          field: 'original_estimated_hours',
          callback: (value) => {
            return excelFormat(value);
          },
        },
        real_hours: {
          field: 'hours',
          callback: (value) => {
            return excelFormat(value);
          },
        },
        real_cost: {
          field: 'real_cost',
          callback: (value) => {
            return excelFormat(value);
          },
        },
      }"
      >
      <b-button title="Exporta dades" icon-left="download">Exporta detall</b-button>
    </download-excel>

    <download-excel name="previsio-execucio-dedicacio-per-persona" :data="pivotDataGroupped"
    
    :fields="{
        project_name: 'project_name',        
        username: 'username',
        year: 'year',
        estimated_hours: {
          field: 'estimated_hours',
          callback: (value) => {
            return excelFormat(value);
          },
        },
        original_estimated_hours: {
          field: 'original_estimated_hours',
          callback: (value) => {
            return excelFormat(value);
          },
        },
        real_hours: {
          field: 'hours',
          callback: (value) => {
            return excelFormat(value);
          },
        },
        real_cost: {
          field: 'real_cost',
          callback: (value) => {
            return excelFormat(value);
          },
        },
      }"
      >
      <b-button title="Exporta dades" icon-left="download">Exporta totals per persona</b-button>
    </download-excel>
    <!-- <pre>
      {{ pivotDataGroupped }}
    </pre> -->
  </div>
</template>

<script>
import service from '@/service/index'
import moment from 'moment'
import configPivot from '@/service/configStatsDedicationEst'
import sortBy from 'lodash/sortBy'
import { format } from "@/helpers/excelFormatter";
import _ from "lodash";
import { mapState } from "pinia"
import { useMainStore } from "@/stores/main.js";
import PivotViews from '@/components/PivotViews.vue'
import pivotViewsMixin from '@/mixins/pivotViewsMixin.js'

moment.locale('ca')
// the pivot's measures as configured (the config object is shared and gets modified)
const DEFAULT_MEASURES = [...configPivot.dataSource.measures]

export default {
  name: 'DedicationEstPivot',
  components: { PivotViews },
  emits: ['loaded'],
  mixins: [pivotViewsMixin],
  props: {
    projectState: {
      type: Number,
      default: 0
    },
    year: {
      type: Number,
      default: 0
    },
    person: {
      type: Number,
      default: 0
    },
    // one project (id), or 0 for all
    project: {
      type: Number,
      default: 0
    },
    // without it, no «Cost real» (the cost of the hours comes from salaries)
    showCost: {
      type: Boolean,
      default: true
    }
  },
  data () {
    return {
      isLoading: false,
      projects: [],
      projectsList: [],
      dedicationTypes: [],
      activityTypes: [],
      users: [],
      usersList: [],
      modalObjectName: '',
      userNameSearch: '',
      scopes: [],
      states: [],
      leaders: [],
      contacts: [],
      pivotData: [],
      pivotIdentifier: 'dedication-est-pivot'
    }
  },
  watch: {
    // user: function (newVal, oldVal) {
    //   this.getActivities()
    // },
    // date1: function (newVal, oldVal) {
    //   this.getActivities()
    // },
    // date2: function (newVal, oldVal) {
    //   this.getActivities()
    // },
    // project: function (newVal, oldVal) {
    //   this.getAccessivities()
    // },
    // All three filter props are funneled through `filterSignature`, so a
    // simultaneous change to several of them (e.g. the parent committing them
    // together on "Aplicar") triggers a single getActivities() call.
    filterSignature (newVal, oldVal) {
      if (newVal === oldVal) return
      this.getActivities()
    }
  },
  mounted () {
    this.getActivities()
  },
  computed: {
    ...mapState(useMainStore, ["userName", "user"]),
    // Single signature for all three filter props so that a synchronous
    // change to several of them (e.g. when the parent commits them together
    // on "Aplicar") only triggers one getActivities() instead of one per prop.
    filterSignature () {
      return `${this.projectState}|${this.year}|${this.person}|${this.project}`
    },
    pivotDataGroupped() {
      return _(this.pivotData.map(p => { return { ...p, pyu: `${p.project_name}.${p.username}.${p.year}` } }))
        .groupBy("pyu")
        .map((rows, pyu) => ({
          // id: pyu.split('.')[0],
          project_name: pyu.split('.')[0],
          username: pyu.split('.')[1],
          year: pyu.split('.')[2],
          estimated_hours: (_.sumBy(rows, "estimated_hours") || 0),
          original_estimated_hours: (_.sumBy(rows, "original_estimated_hours") || 0),
          hours: (_.sumBy(rows, "hours") || 0) ,
          real_cost: _.sumBy(rows, "real_cost") || 0,
          rows: rows

        }))
        .value();
    },
  },
  methods: {
    // One row per person and month of the project's planned hours. They come
    // from the backend (`planned_hours`), computed like the project's stored
    // total in the projects panel (working days, festives, only lines with a
    // person), so both screens give the same hours (issues/067).
    plannedHoursRows (activities, p, projectFields = {}) {
      (p.planned_hours || []).forEach(h => {
        if ((this.year === 0 || h.year === this.year.toString()) &&
          (this.person === 0 || (h.user && h.user.toString() === this.person.toString()))) {
          const user = this.leaders.find(u => u.id === h.user)
          activities.push({
            project_name: p.name,
            project_leader: p.leader ? p.leader.username : '-',
            project_state: p.project_state ? p.project_state.name : '-',
            project_scope: p.project_scope ? p.project_scope.short_name : '-',
            project_scope_name: p.project_scope ? p.project_scope.name : '-',
            project_client: p.client ? p.client.name : '-',
            total_estimated_hours: p.total_estimated_hours ? p.total_estimated_hours : 0,
            total_real_hours: p.total_real_hours ? p.total_real_hours : 0,
            count: 1,
            month: h.month,
            year: h.year,
            day: 0,
            date: '-',
            hours: 0,
            estimated_hours: h.estimated_hours,
            original_estimated_hours: h.original_estimated_hours,
            estimated_hours_today: h.estimated_hours_today,
            username: user ? user.username : '-',
            dedication_type: p.default_dedication_type && p.default_dedication_type.id ? p.default_dedication_type.name : '-',
            real_cost: 0,
            ...projectFields,
            activity_type: '-'
          })
        }
      })
    },
    activityTypeName (activityType) {
      const id = activityType && activityType.id ? activityType.id : activityType
      const found = id && Array.isArray(this.activityTypes) ? this.activityTypes.find(t => t.id === id) : null
      return found ? found.name : '-'
    },
    async getActivities () {
      this.isLoading = true

      if (this.projectState === null || this.year === null || this.person === null) {
        return
      }

      this.scopes = (await service({ requiresAuth: true }).get('project-scopes')).data
      this.states = (await service({ requiresAuth: true }).get('project-states')).data
      this.dedicationTypes = (await service({ requiresAuth: true }).get('dedication-types')).data
      this.leaders = (await service({ requiresAuth: true, cached: true }).get('users')).data
      this.contacts = (await service({ requiresAuth: true }).get('contacts/basic?_limit=-1&_sort=name:ASC')).data
      this.activityTypes = (await service({ requiresAuth: true, cached: true }).get('activity-types/basic?_limit=-1')).data

      // const from = moment(this.date1).format('YYYY-MM-DD')
      // const to = moment(this.date2).format('YYYY-MM-DD')
      const projectState = this.projectState !== null ? this.projectState : 1
      let query = `projects/phases-both?_where[project_state_in]=${projectState}&_limit=-1&activities=true&plannedHours=true`
      if (projectState === 0 || projectState === '0') {
        query = 'projects/phases-both?_limit=-1&activities=true&plannedHours=true'
      }
      service({ requiresAuth: true }).get(query).then((r) => {
        const activities = []
        const projects = r.data.filter(p => !this.project || p.id === this.project).forEach(p => {
          // fields of «Dedicació (taula)», merged into this report
          const projectFields = {
            project_type: p.project_type && p.project_type.name ? p.project_type.name : '-',
            project_likelihood: p.project_likelihood && p.project_likelihood.name ? p.project_likelihood.name : '-'
          }
          if (p.activities) {
            p.activities.forEach(a => {
              if ((this.year === 0 || (this.year > 0 && a.date && parseInt(moment(a.date).format('YYYY')) === this.year)) 
                && (this.person === 0 || (this.person > 0 && a.users_permissions_user && (a.users_permissions_user.id || a.users_permissions_user).toString() === this.person.toString()))
                ) {
                const activity = {
                  project_name: p.name,
                  project_state: p.project_state ? p.project_state.name : '-',
                  project_leader: p.leader ? p.leader.username : '-',
                  project_scope: p.project_scope ? p.project_scope.short_name : '-',
                  project_client: p.client ? p.client.name : '-',
                  project_year: p.date_start ? moment(p.date_start, 'YYYY-MM-DD').format('YYYY') : moment(p.created_at, 'YYYY-MM-DD').format('YYYY'),
                  // pyu: `${p.name}.${a.date ? moment(a.date).format('YYYY').toString() : 0}.${a.users_permissions_user ? this.leaders.find(u => u.id === a.users_permissions_user).username : '-'}`,
                  total_estimated_hours: p.total_estimated_hours ? p.total_estimated_hours : 0,
                  hours: a.hours,
                  incomes_expenses: p.incomes_expenses ? p.incomes_expenses : 0,
                  pricehour: a.hours && p.incomes_expenses ? parseFloat((p.incomes_expenses / a.hours).toFixed(2)) : 0,
                  month: a.date ? moment(a.date).format('MM').toString() : 0,
                  year: a.date ? moment(a.date).format('YYYY').toString() : 0,
                  day: a.date ? moment(a.date).format('DD').toString() : 0,
                  date: a.date ? moment(a.date).format('YYYY-MM-DD').toString() : '-',
                  username: a.users_permissions_user && this.leaders.find(u => u.id === a.users_permissions_user) ? this.leaders.find(u => u.id === a.users_permissions_user).username : '-',
                  count: 1,
                  dedication_type: a.dedication_type && this.dedicationTypes.length && this.dedicationTypes.find(d => d.id === a.dedication_type) ? this.dedicationTypes.find(d => d.id === a.dedication_type).name : '-',
                  real_cost: a.cost_by_hour * a.hours,
                  ...projectFields,
                  activity_type: this.activityTypeName(a.activity_type)
                }
                activities.push(activity)
              }
            })
          }
          this.plannedHoursRows(activities, p, projectFields)
          if (!(p.project_phases && p.project_phases.length > 0) && !(p.project_original_phases && p.project_original_phases.length > 0) && p.estimated_hours && p.estimated_hours.length > 0) {
            p.estimated_hours.forEach(a => {
              if ((this.year === 0 || (this.year > 0 && a.year && a.year.year && a.year.year === this.year)) && (this.month === 0 || (this.month > 0 && a.month && a.month.month && a.month.month === this.month))) {
                const activity = {
                  project_name: p.name,
                  project_leader: p.leader ? p.leader.username : '-',
                  project_state: p.project_state ? p.project_state.name : '-',
                  project_scope: p.project_scope ? p.project_scope.short_name : '-',
                  project_scope_name: p.project_scope ? p.project_scope.name : '-',
                  project_client: p.client ? p.client.name : '-',
                  // pyu: `${p.name}.${a.year ? a.year.year.toString() : 0}.${a.users_permissions_user && a.users_permissions_user.id ? a.users_permissions_user.username : '-'}`,
                  total_estimated_hours: p.total_estimated_hours ? p.total_estimated_hours : 0,
                  total_real_hours: p.total_real_hours ? p.total_real_hours : 0,
                  count: 1,
                  month: a.month ? a.month.month_number.toString() : 0,
                  year: a.year ? a.year.year.toString() : 0,
                  day: 0,
                  date: '-',
                  hours: 0,
                  estimated_hours: a.quantity ? a.quantity: 0,
                  original_estimated_hours: a.quantity ? a.quantity : 0,
                  username: a.users_permissions_user && a.users_permissions_user.id ? a.users_permissions_user.username : '-',
                  dedication_type: p.default_dedication_type && p.default_dedication_type.id ? p.default_dedication_type.name : '-'
                }
                activities.push(activity)
              }
            })
          }
        })
        this.projects = projects
        // this.pivotData = Object.freeze(activities)
        if (!this.showCost) activities.forEach(a => { delete a.real_cost })
        this.pivotData = Object.freeze(sortBy(activities, ['year', 'month', 'project_name'], ['asc', 'asc', 'asc']))
        // the charts above the pivot use the same rows
        this.$emit('loaded', this.pivotData)
        configPivot.dataSource.data = this.pivotData
        configPivot.dataSource.measures = DEFAULT_MEASURES.filter(m => this.showCost || m !== 'Cost real')
        this.initializePivotWithViews('#project-stats', configPivot)
        this.isLoading = false
      })
    },
    excelFormat(value) {
      return format(this.user, value);
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
