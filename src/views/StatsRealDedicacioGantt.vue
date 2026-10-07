<template>
  <div v-if="!isLoading">
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section">
      <card-component title="Filtres">
        <form @submit.prevent="submit2">
          <b-field horizontal>
            <b-field label="Estat projecte">
              <div class="is-flex mt-2">
                <button
                  class="button mr-3"
                  v-for="state in project_states"
                  :key="state.id"
                  @click="toggleState(state)"
                  :class="{
                    'is-primary': selectedProjectStates.includes(state.id),
                    'is-outlined': !selectedProjectStates.includes(state.id)
                  }"
                >
                  {{ state.name }}
                </button>
              </div>
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
            <b-field label="Any">
              <b-select
                v-model="filters.year"
                placeholder="Any"
                required
              >
                <option v-for="year in years" :key="year" :value="year">
                  {{ year }}
                </option>
              </b-select>
            </b-field>
            <b-field label="Agrupació">
              <b-select
                v-model="filters.grouping"
                placeholder="Agrupació"
                required
              >
                <option value="project">Projecte</option>
                <option value="type">Tipus de projecte</option>
                <option value="likelihood">Probabilitat</option>
              </b-select>
            </b-field>
          </b-field>
        </form>
      </card-component>

      <card-component title="Dedicació real">
        <real-dedication-gantt :project-states="selectedProjectStates" :view="filters.view" :year="filters.year" :grouping="filters.grouping" v-if="!isLoading1 && !isLoading3" />
      </card-component>
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar.vue'
import CardComponent from '@/components/CardComponent.vue'
import RealDedicationGantt from '@/components/RealDedicationGantt.vue'
import service from '@/service/index'
import moment from 'moment'

// First year for which real hours are relevant. Kept wide so past data is
// reachable; current year is appended dynamically in mounted().
const MIN_YEAR = 2020

export default {
  name: 'StatsRealDedicacio',
  components: {
    CardComponent,
    TitleBar,
    RealDedicationGantt
  },
  data () {
    return {
      isLoading: true,
      isLoading1: true,
      isLoading2: true,
      isLoading3: true,
      filters: {
        project_state: null,
        year: parseInt(moment().format('YYYY')),
        month: null,
        view: 'month',
        grouping: 'project'
      },
      project_states: [],
      months: null,
      years: [],
      selectedProjectStates: []
    }
  },
  computed: {
    titleStack () {
      return ['Dedicació', '% Dedicació real']
    }
  },
  async mounted () {
    this.isLoading = false
    this.isLoading1 = true
    this.isLoading2 = true
    this.isLoading3 = true

    // Year list MIN_YEAR..currentYear, descending so the latest is on top.
    const currentYear = parseInt(moment().format('YYYY'))
    const yearList = []
    for (let y = currentYear; y >= MIN_YEAR; y--) yearList.push(y)
    this.years = yearList
    this.filters.year = currentYear
    this.isLoading2 = false

    this.getData()
  },
  methods: {
    getData () {
      service({ requiresAuth: true }).get('project-states').then((r) => {
        this.project_states = [...r.data];

        if (localStorage.getItem("StatsRealDedicacioGantt.selectedProjectStates")) {
          this.selectedProjectStates = JSON.parse(
            localStorage.getItem("StatsRealDedicacioGantt.selectedProjectStates")
          );
        } else {
          this.selectedProjectStates = this.project_states.map(s => s.id);
        }

        this.isLoading1 = false
      })
      service({ requiresAuth: true }).get('months?_sort=name:DESC').then((r) => {
        this.months = r.data.map(y => { return { ...y, display: `${y.month_number} - ${y.name}` } })
        this.months.unshift({ id: 0, month: 0, display: 'Tots' })
        this.filters.month = 0
        this.isLoading3 = false
      })
    },
    toggleState(state) {
      if (this.selectedProjectStates.includes(state.id)) {
        this.selectedProjectStates = this.selectedProjectStates.filter(
          s => s !== state.id
        );
      } else {
        this.selectedProjectStates.push(state.id);
      }
      localStorage.setItem(
        "StatsRealDedicacioGantt.selectedProjectStates",
        JSON.stringify(this.selectedProjectStates)
      );
      this.getData();
    },
  }
}
</script>
