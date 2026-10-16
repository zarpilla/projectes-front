<template>
  <div v-if="!isLoading">
    <title-bar :title-stack="titleStack" :subtitle="subtitle">
      <download-excel :data="exportData" :name="exportName">
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
        <div class="segmented" role="group" aria-label="Hores">
          <button type="button" :class="{ 'is-on': filters.hoursType === 'previstes' }" @click="filters.hoursType = 'previstes'">Previstes</button>
          <button type="button" :class="{ 'is-on': filters.hoursType === 'original' }" @click="filters.hoursType = 'original'">Originals</button>
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
      <dedication-gantt
        v-if="!isLoading1 && !isLoading3"
        :project-states="selectedProjectStates"
        :view="filters.view"
        :year="filters.year"
        :hours-type="filters.hoursType"
        :grouping="filters.grouping"
        :title="(filters.hoursType === 'original' ? 'Hores originals' : 'Hores previstes') + ' i ocupació per persona · ' + filters.year"
        @export-data="exportData = $event"
      />
      <p class="notification is-info mt-4 occupation-note">
        L'ocupació és hores previstes ÷ hores de jornada del període (jornada de la persona, sense caps de setmana, festius ni vacances).
      </p>
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar.vue'
import moment from 'moment'
import CardComponent from '@/components/CardComponent.vue'
import DedicationGantt from '@/components/DedicationGantt.vue'
import service from '@/service/index'

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
        year: parseInt(moment().format('YYYY')),
        month: null,
        view: 'month',
        hoursType: 'previstes',
        grouping: 'project'
      },
      project_states: [],
      //years: [],
      months: null,
      selectedProjectStates: [],
      exportData: [],
      minYear: parseInt(moment().format('YYYY')) - 5,
      maxYear: parseInt(moment().format('YYYY')) + 3
    }
  },
  computed: {
    titleStack () {
      return ['Informes', 'Previsió dedicació']
    },
    subtitle () {
      return 'Hores previstes als projectes per a cada persona i període, comparades amb la seva jornada.'
    },
    exportName () {
      return `previsio-dedicacio-${this.filters.year}.xls`
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
        // this.project_states.unshift({ id: 0, name: 'Tots' })
        // this.filters.project_state = defaultProjectState

        if (localStorage.getItem("StatsDedicacioGantt.selectedProjectStates")) {
          this.selectedProjectStates = JSON.parse(
            localStorage.getItem("StatsDedicacioGantt.selectedProjectStates")
          );
        } else {
          this.selectedProjectStates = this.project_states.map(s => s.id);
        }
        
        this.isLoading1 = false
      })
      // service({ requiresAuth: true, cached: true }).get('years?_sort=year:DESC').then((r) => {
      //   this.years = r.data.map(y => { return { ...y, display: y.year } })
      //   this.years.unshift({ id: 0, year: 0, display: 'Tots' })
      //   this.filters.year = parseInt(moment().format('YYYY'))
      //   this.isLoading2 = false
      // })
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
        "StatsDedicacioGantt.selectedProjectStates",
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
