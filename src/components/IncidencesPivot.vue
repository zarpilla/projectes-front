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
    
    <div id="incidences-stats"></div>
    <download-excel class="export" 
      :fields="{
        id: 'id',
        count: 'count',
        owner: 'owner',
        owner_name: 'owner_name',
        created_user: 'created_user',
        created_user_id: 'created_user_id',
        route: 'route',
        route_name: 'route_name',
        state: 'state',
        state_raw: 'state_raw',
        created_at: 'created_at',
        closed_date: 'closed_date',
        closed_user: 'closed_user',
        description: 'description',
        order_id: 'order_id',
        year: 'year',
        month: 'month'
      }"
      :data="pivotData">
      <b-button
      title="Exporta dades"
      class="export-button mt-0"
      icon-left="file-excel" />
    </download-excel>
    <b-loading
        :is-full-page="true"
        v-model="isLoading"
        :can-cancel="false"
      ></b-loading>
  </div>
</template>

<script>
import service from '@/service/index'
import moment from 'moment'
import configPivot from '@/service/configStatsIncidences'
import sortBy from 'lodash/sortBy'
import { format } from '@/helpers/excelFormatter'
import { mapState } from 'vuex'
import PivotViews from '@/components/PivotViews.vue'
import pivotViewsMixin from '@/mixins/pivotViewsMixin.js'

moment.locale('ca')

export default {
  name: 'IncidencesPivot',
  components: { PivotViews },
  mixins: [pivotViewsMixin],
  props: {
    year: {
      type: Number,
      default: 0
    },
    month: {
      type: Number,
      default: 0
    }
  },
  data () {
    return {
      incidences: [],
      pivotData: [],
      isLoading: false,
      pivotIdentifier: 'incidences-pivot'
    }
  },
  computed: {
    ...mapState(["userName", "user"]),
  },
  watch: {
    year: function (newVal, oldVal) {
      this.getData()
    },
    month: function (newVal, oldVal) {
      this.getData()
    }
  },
  mounted () {
    this.getData()
  },
  methods: {
    async getData () {
      this.isLoading = true
      const qYear = this.year.id === 0 ? '' : `&year=${this.year.year}`
      const qMonth = this.month.id === 0 ? '' : `&month=${this.month.month}`
      this.incidences = (await service({ requiresAuth: true }).get(`incidences/infoall?_limit=-1${qYear}${qMonth}`)).data      
      this.pivotData = Object.freeze(sortBy(this.incidences, ['id'], ['asc']))
      configPivot.dataSource.data = this.pivotData
      this.initializePivotWithViews('#incidences-stats', configPivot)
      this.isLoading = false
    },
    applyDefaultView() {
      if (this.pivotGridInstance) {
        // Reset to default configuration
        const dataSource = this.pivotGridInstance.dataSource
        const defaultConfig = configPivot.dataSource
        
        dataSource.columns(defaultConfig.columns || [])
        dataSource.rows(defaultConfig.rows || [])
        dataSource.measures(defaultConfig.measures || [])
        
        this.selectedViewId = null
      }
    },
    excelFormat(value) {
      return format(this.user, value);
    }
  },
  filters: {
    formatDate (val) {
      if (!val) { return '-' }
      return moment(val).fromNow()
    },
    formatDMYDate (val) {
      if (!val) { return '-' }
      return moment(val).format('dddd DD/MM/YYYY')
    },
    formatTitle (val) {
      if (!val) { return '-' }
      return moment(val).format('dddd DD/MM/YYYY') + ' (' + moment(val).fromNow() + ')'
    }
  }
}
</script>
<style>
.card-body{
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #eee;
}
.card-header-title{
  text-transform: capitalize;
}
.is-activity{
  cursor: pointer;
}
.is-total{
  background: #eee;
  text-transform: capitalize;
}
.auxiliar{
  color:#999;
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
