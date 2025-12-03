<template>
  <div v-if="!isLoading">
    <title-bar :title-stack="titleStack" />
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
        </form>
      </card-component>

      <card-component title="Projectes">
        <expenses-pivot :project-state="filters.project_state" v-if="!isLoading" />
      </card-component>
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar'
import CardComponent from '@/components/CardComponent'
import ExpensesPivot from '@/components/ExpensesPivot'
import service from '@/service/index'
import defaultProjectState from '@/service/projectState'
import { addScript, addStyle } from '@/helpers/addScript'

export default {
  name: 'StatsExpenses',
  components: {
    CardComponent,
    TitleBar,
    ExpensesPivot
  },
  data () {
    return {
      isLoading: true,
      filters: {
        project_state: null
      },
      project_states: []
    }
  },
  computed: {
    titleStack () {
      return ['Projectes', 'Ingressos i Despeses']
    }
  },
  async mounted () {
    this.isLoading = true

    const interval = setInterval(async () => {
      if (window.jQuery) {
        clearInterval(interval)
        // await this.addScript((process.env.VUE_APP_PATH ? process.env.VUE_APP_PATH : '') + '/vendor/jquery/jquery.js')
        await addScript((process.env.VUE_APP_PATH ? process.env.VUE_APP_PATH : '') + 'vendor/kendo/kendo.all.min.js', 'kendo-all-min-js')
        await addStyle((process.env.VUE_APP_PATH ? process.env.VUE_APP_PATH : '') + 'vendor/kendo/kendo.common.min.css', 'kendo-common-min-css')
        await addStyle((process.env.VUE_APP_PATH ? process.env.VUE_APP_PATH : '') + 'vendor/kendo/kendo.custom.css', 'kendo-custom-css')
        await addStyle((process.env.VUE_APP_PATH ? process.env.VUE_APP_PATH : '') + 'vendor/kendo/custom.css', 'custom-css')
        this.isLoading = false
        this.getData()
      }
    }, 100)
  },
  methods: {
    getData () {
      service({ requiresAuth: true }).get('project-states').then((r) => {
        this.project_states = r.data
        this.project_states.unshift({ id: 0, name: 'Tots' })
        this.filters.project_state = defaultProjectState
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
