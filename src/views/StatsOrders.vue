<template>
  <div v-if="!isLoading">
    <title-bar :title-stack="titleStack" />    
    <section class="section is-main-section">
      <card-component title="Filtres">
        <form @submit.prevent="submit2">
          <b-field label="Any">
              <b-select
                v-model="filters.year"
              >
                <option
                  v-for="(year, index) in years"
                  :key="index"
                  :value="year"
                >
                  {{ year.year }}
                </option>
              </b-select>
          </b-field>          
        </form>
      </card-component>
      <card-component title="Comandes">
        <orders-pivot :year="filters.year" v-if="!isLoading" />
      </card-component>
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar'
import CardComponent from '@/components/CardComponent'
import OrdersPivot from '@/components/OrdersPivot'
import service from '@/service/index'
import defaultProjectState from '@/service/projectState'
import { addScript, addStyle } from '@/helpers/addScript'
import moment from 'moment'

export default {
  name: 'StatsOrders',
  components: {
    CardComponent,
    TitleBar,
    OrdersPivot
  },
  data () {
    return {
      isLoading: true,
      filters: {
        project_state: null,
        year: null
      },
      project_states: [],
      years: []
    }
  },
  computed: {
    titleStack () {
      return ['Comandes', 'Taula dinàmica']
    }
  },
  async mounted () {
    this.isLoading = true

    const interval = setInterval(async () => {
      if (window.jQuery) {
        clearInterval(interval)
        await addScript((process.env.VUE_APP_PATH ? process.env.VUE_APP_PATH : '') + '/vendor/kendo/kendo.all.min.js', 'kendo-all-min-js')
        await addStyle((process.env.VUE_APP_PATH ? process.env.VUE_APP_PATH : '') + '/vendor/kendo/kendo.common.min.css', 'kendo-common-min-css')
        await addStyle((process.env.VUE_APP_PATH ? process.env.VUE_APP_PATH : '') + '/vendor/kendo/kendo.custom.css', 'kendo-custom-css')
        await addStyle((process.env.VUE_APP_PATH ? process.env.VUE_APP_PATH : '') + '/vendor/kendo/custom.css', 'custom-css')        
        this.getData()
        setTimeout(() => {
          this.isLoading = false
        }, 250)
      }
    }, 100)

    // setInterval(async () => {
    //   console.log('kendoPivotGrid', kendoPivotGrid)
    // }, 300)
  },
  methods: {
    getData () {      
      service({ requiresAuth: true, cached: true }).get('years?_sort=year:DESC').then((r) => {
        this.years = r.data
        //this.years.unshift({ id: 0, year: 0 })
        this.years.unshift({ id: 0, year: 'Tots' })
        // this.filters.year = 0
        this.filters.year = this.years[0]
        this.isLoading = false
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
