<template>
  <div v-if="!isLoading">
    <title-bar :title-stack="titleStack" :subtitle="subtitle">
      <download-excel :data="exportData" :name="exportName" :fields="exportFields">
        <b-button icon-left="download" :disabled="!exportData.length">Exporta</b-button>
      </download-excel>
    </title-bar>
    <section class="section is-main-section">
      <form class="filter-bar" role="search" aria-label="Filtres" @submit.prevent>
        <div class="month-nav">
          <button type="button" class="button" aria-label="Any anterior" :disabled="filters.year <= minYear" @click="filters.year--">
            <b-icon icon="chevron-left" />
          </button>
          <span class="month-nav-label">{{ filters.year }}</span>
          <button type="button" class="button" aria-label="Any següent" :disabled="filters.year >= maxYear" @click="filters.year++">
            <b-icon icon="chevron-right" />
          </button>
        </div>
        <div class="segmented" role="group" aria-label="Vista">
          <button type="button" :class="{ 'is-on': filters.view === 'month' }" @click="filters.view = 'month'">Mensual</button>
          <button type="button" :class="{ 'is-on': filters.view === 'week' }" @click="filters.view = 'week'">Setmanal</button>
        </div>
        <label class="filter-select">
          <span>Detall per</span>
          <b-select v-model="filters.grouping" aria-label="Agrupació del detall">
            <option value="project">Projecte</option>
            <option value="type">Tipus de projecte</option>
            <option value="likelihood">Probabilitat</option>
          </b-select>
        </label>
        <div class="toggle-group" role="group" aria-label="Estat projecte">
          <span class="toggle-label">Estat projecte</span>
          <button
            v-for="state in project_states"
            :key="state.id"
            type="button"
            class="chip-toggle"
            :class="{ 'is-on': selectedProjectStates.includes(state.id) }"
            :aria-pressed="selectedProjectStates.includes(state.id) ? 'true' : 'false'"
            @click="toggleState(state)"
          >
            {{ state.name }}
          </button>
        </div>
      </form>
      <real-dedication-gantt
        v-if="!isLoading1 && !isLoading3"
        :project-states="selectedProjectStates"
        :view="filters.view"
        :year="filters.year"
        :grouping="filters.grouping"
        :title="'Hores fetes i ocupació per persona · ' + filters.year"
        @export-data="exportData = $event"
      />
      <p class="notification is-info mt-4 occupation-note">
        L'ocupació és hores fetes ÷ hores de jornada del període (jornada de la persona, sense caps de setmana, festius ni vacances).
      </p>
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar.vue'
import CardComponent from '@/components/CardComponent.vue'
import RealDedicationGantt from '@/components/RealDedicationGantt.vue'
import service from '@/service/index'
import moment from 'moment'
import { realDedicationFields } from '@/domain/hoursExport.js'

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
      selectedProjectStates: [],
      exportData: [],
      exportFields: realDedicationFields,
      minYear: MIN_YEAR,
      maxYear: parseInt(moment().format('YYYY'))
    }
  },
  computed: {
    titleStack () {
      return ['Informes', '% Dedicació real']
    },
    subtitle () {
      return 'Hores fetes per cada persona i període, comparades amb la seva jornada.'
    },
    exportName () {
      return `dedicacio-real-${this.filters.year}.xls`
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
<style scoped>
.month-nav {
  display: inline-flex;
  align-items: center;
  gap: .5rem;
}
.month-nav-label {
  min-width: 3.5rem;
  text-align: center;
  font-weight: 800;
}
.occupation-note {
  font-size: .875rem;
}
</style>
