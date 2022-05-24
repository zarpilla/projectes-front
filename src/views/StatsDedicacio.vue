<template>
  <div v-if="!isLoading">
    <title-bar :title-stack="titleStack" />
    <!-- <hero-bar>
      Dedicació
      <router-link slot="right" to="/" class="button">
        Dashboard
      </router-link>
    </hero-bar> -->
    <section class="section is-main-section">
      <card-component title="Filtres">
        <form @submit.prevent="submit2">
          <b-field horizontal label="Estat projecte">
            <b-select
              v-model="filters.project_state"
              placeholder="Estat"
              required
            >
              <option
                v-for="(s, index) in project_states"
                :key="index"
                :value="s.id"
              >
                {{ s.name }}
              </option>
            </b-select>
          </b-field>
          <!-- <b-field horizontal label="Any">
            <b-select
              v-model="filters.year"
              placeholder="Any"              
            >
              <option
                v-for="(s, index) in years"
                :key="index"
                :value="s.year"
              >
                {{ s.year ? s.year : 'Tots' }}
              </option>
            </b-select>
          </b-field>           -->
        </form>
      </card-component>

      <card-component title="Projectes">
        <dedication-pivot :project-state="filters.project_state" :year="filters.year" v-if="!isLoading" />
      </card-component>
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar'
import CardComponent from '@/components/CardComponent'
import DedicationPivot from '@/components/DedicationPivot'
import service from '@/service/index'
import defaultProjectState from '@/service/projectState'
import { addScript, addStyle } from '@/helpers/addScript'
import moment from 'moment'

export default {
  name: 'StatsDedicacio',
  components: {
    // HeroBar,
    CardComponent,
    TitleBar,
    // DedicationWidget,
    DedicationPivot
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
      return ['Dedicació', 'Taula dinàmica']
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
      service({ requiresAuth: true }).get('project-states').then((r) => {
        this.project_states = r.data
        this.project_states.unshift({ id: 0, name: 'Tots' })
        this.filters.project_state = defaultProjectState
      })
      service({ requiresAuth: true }).get('years?_sort=year:DESC').then((r) => {
        this.years = r.data
        this.years.unshift({ id: 0, year: 0 })
        // this.filters.year = 0
        this.filters.year = this.years.find(y => y.year.toString() === moment().format('YYYY')).year
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
