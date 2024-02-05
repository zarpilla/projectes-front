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
            <b-field label="Vista">
              <b-select
                v-model="filters.view"
                placeholder="Estat"
                required
              >
                <option value="month">Mensual</option>
                <option value="week">Setmanal</option>
              </b-select>
            </b-field>
          </b-field>
        </form>
      </card-component>

      <card-component title="Dedicació">        
        <dedication-gantt :project-state="filters.project_state" :view="filters.view" v-if="!isLoading1 && !isLoading2 && !isLoading3" />
      </card-component>
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar'
import CardComponent from '@/components/CardComponent'
import DedicationGantt from '@/components/DedicationGantt'
import service from '@/service/index'
import defaultProjectState from '@/service/projectState'
import moment from 'moment'

export default {
  name: 'StatsDedicacio',
  components: {
    // HeroBar,
    CardComponent,
    TitleBar,
    // DedicationWidget,
    DedicationGantt
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
        month: null,
        view: 'month'
      },
      project_states: [],
      years: [],
      months: null
    }
  },
  computed: {
    titleStack () {
      return ['Dedicació', 'Previsió dedicació / Jornades']
    }
  },
  async mounted () {
    this.isLoading = false
    this.isLoading1 = true
    this.isLoading2 = true
    this.isLoading3 = true
    this.getData()
  },
  methods: {
    getData () {
      service({ requiresAuth: true }).get('project-states').then((r) => {
        this.project_states = [...r.data];
        this.project_states.unshift({ id: 0, name: 'Tots' })
        this.filters.project_state = defaultProjectState
        this.isLoading1 = false
      })
      service({ requiresAuth: true, cached: true }).get('years?_sort=year:DESC').then((r) => {
        this.years = r.data.map(y => { return { ...y, display: y.year } })
        this.years.unshift({ id: 0, year: 0, display: 'Tots' })
        this.filters.year = parseInt(moment().format('YYYY'))
        this.isLoading2 = false
      })
      service({ requiresAuth: true }).get('months?_sort=name:DESC').then((r) => {
        this.months = r.data.map(y => { return { ...y, display: `${y.month_number} - ${y.name}` } })
        this.months.unshift({ id: 0, month: 0, display: 'Tots' })
        this.filters.month = 0
        this.isLoading3 = false
      })
    }
  }
}
</script>
