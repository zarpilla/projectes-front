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
          <b-field horizontal>
            <b-field label="Estat projecte">
              <b-select
                v-model="filters.project_state"
                placeholder="Estat"
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
            <b-field label="Any">
              <b-select
                v-model="filters.year"
                placeholder="Any"
              >
                <option
                  v-for="(s, index) in years"
                  :key="index"
                  :value="s.year"
                >
                  {{ s.display }}
                </option>
              </b-select>
            </b-field>
            <b-field label="Persona">
              <b-select
                v-model="filters.user"
                placeholder="Persona"
              >
                <option
                  v-for="(s, index) in users"
                  :key="index"
                  :value="s.id"
                >
                  {{ s.username }}
                </option>
              </b-select>
            </b-field>
          </b-field>
        </form>
      </card-component>

      <card-component title="Projectes">
        <dedication-est-pivot :project-state="filters.project_state" :year="filters.year" :user="filters.user" v-if="!isLoading1 && !isLoading2 && !isLoading3" />
      </card-component>
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar'
import CardComponent from '@/components/CardComponent'
import DedicationEstPivot from '@/components/DedicationEstPivot'
import service from '@/service/index'
import defaultProjectState from '@/service/projectState'
import { addScript, addStyle } from '@/helpers/addScript'
// import moment from 'moment'

export default {
  name: 'StatsDedicacio',
  components: {
    // HeroBar,
    CardComponent,
    TitleBar,
    // DedicationWidget,
    DedicationEstPivot
  },
  data () {
    return {
      isLoading: true,
      isLoading1: true,
      isLoading2: true,
      isLoading3: true,
      filters: {
        project_state: null,
        year: null,
        user: null
      },
      project_states: [],
      years: [],
      users: []
    }
  },
  computed: {
    titleStack () {
      return ['Dedicació', 'Previsió-Realitat dedicació']
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
        this.isLoading = false
        this.getData()
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
        this.isLoading1 = false
      })
      service({ requiresAuth: true }).get('years?_sort=year:DESC').then((r) => {
        this.years = r.data.map(y => { return { ...y, display: y.year } })
        this.years.unshift({ id: 0, year: 0, display: 'Tots' })
        this.filters.year = 0
        this.isLoading2 = false
      })
      service({ requiresAuth: true }).get('users').then((r) => {
        this.users = r.data.filter((u) => !u.hidden);
        this.users.unshift({ id: 0, username: 'Tots' })
        this.filters.user = 0
        this.isLoading3 = false
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
