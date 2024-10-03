<template>
  <div>
    <div id="project-stats"></div>
    <download-excel class="export" :data="pivotData">
      <b-button
      title="Exporta dades"
      class="export-button mt-0"
      icon-left="file-excel" />
    </download-excel>
    <!-- <pre>
      {{ pivotData }}
    </pre> -->
  </div>
</template>

<script>
import service from '@/service/index'
// import sumBy from 'lodash/sumBy'
import moment from 'moment'
import configPivot from '@/service/configStatsOrder'
import sortBy from 'lodash/sortBy'

moment.locale('ca')

export default {
  name: 'OrdersPivot',
  components: { },
  props: {
    year: {
      type: Number,
      default: 0
    }
  },
  data () {
    return {
      orders: [],
      pivotData: [],
    }
  },
  watch: {
    year: function (newVal, oldVal) {
      this.getData()
    },
  },
  mounted () {
    // console.log('mounted')
    this.getData()
  },
  methods: {
    async getData () {
      this.isLoading = true
      const qYear = this.year.id === 0 ? '' : `&year=${this.year.year}`
      this.orders = (await service({ requiresAuth: true }).get(`orders/infoall?_limit=-1${qYear}`)).data      
      this.pivotData = Object.freeze(sortBy(this.orders, ['id'], ['asc']))
      configPivot.dataSource.data = this.pivotData
      window.jQuery('#project-stats').empty()
      window.jQuery('#project-stats').kendoPivotGrid(configPivot)
      this.isLoading = false
      
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
