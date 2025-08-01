<template>
  <div>
    <div id="project-stats"></div>
    <download-excel class="export" 
      :fields="{
        id: 'id',
        count: 'count',
        owner: 'owner',
        contact_id: 'contact_id',
        contact: 'contact',
        city: 'city',
        units: 'units',
        kilograms: {
          field: 'kilograms',
          callback: (value) => {
            return this.excelFormat(value);
          },
        },
        created_at: 'created_at',
        route: 'route',
        refrigerated: 'refrigerated',
        fragile: 'fragile',
        route_rate: 'route_rate',
        price: {
          field: 'price',
          callback: (value) => {
            return this.excelFormat(value);
          },
        },
        pickup: 'pickup',
        delivery_type: 'delivery_type',
        status: 'status',
        lastmile: 'lastmile',
        date: 'date',
        month: 'month',
        year: 'year',
        multidelivery: 'multidelivery',
        pickup_discount: 'pickup_discount'
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
import { format } from '@/helpers/excelFormatter'
import { mapState } from 'vuex'

moment.locale('ca')

export default {
  name: 'OrdersPivot',
  components: { },
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
      orders: [],
      pivotData: [],
      isLoading: false
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
    // console.log('mounted')
    this.getData()
  },
  methods: {
    async getData () {
      this.isLoading = true
      const qYear = this.year.id === 0 ? '' : `&year=${this.year.year}`
      const qMonth = this.month.id === 0 ? '' : `&month=${this.month.month}`
      this.orders = (await service({ requiresAuth: true }).get(`orders/infoall?_limit=-1${qYear}${qMonth}`)).data      
      this.pivotData = Object.freeze(sortBy(this.orders, ['id'], ['asc']))
      configPivot.dataSource.data = this.pivotData
      window.jQuery('#project-stats').empty()
      window.jQuery('#project-stats').kendoPivotGrid(configPivot)
      this.isLoading = false
      
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
