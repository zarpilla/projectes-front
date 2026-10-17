<template>
  <div v-if="!isLoading">
    <title-bar :title-stack="titleStack" :subtitle="subtitle" />
    <section class="section is-main-section">
      <form class="filter-bar" role="search" aria-label="Filtres" @submit.prevent>
        <label class="filter-select">
          <span>Any</span>
          <b-select v-model="filters.year" aria-label="Any">
            <option v-for="(s, index) in years" :key="index" :value="s.year">{{ s.year }}</option>
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
        <div class="segmented" role="group" aria-label="Dades">
          <button v-for="t in dataTypes" :key="t" type="button" :class="{ 'is-on': filters.dataType === t }" @click="filters.dataType = t">{{ t }}</button>
        </div>
        <label class="filter-select margin-field">
          <span>Marge</span>
          <input v-model="filters.margin" class="input" inputmode="decimal" aria-label="Marge (%)" />
          <span>%</span>
        </label>
      </form>
      <price-per-hour-detail
        v-if="!isLoading"
        :project-states="selectedProjectStates"
        :year="filters.year"
        :data-type="filters.dataType"
        :margin="Number(String(filters.margin).replace(',', '.')) || 0"
      />
    </section>
  </div>
</template>

<script>
import TitleBar from "@/components/TitleBar.vue";
import CardComponent from "@/components/CardComponent.vue";
import PricePerHourDetail from "@/components/PricePerHourDetail.vue";
import service from "@/service/index";
import { defaultYear } from "@/domain/years";

const STATES_KEY = "PricePerHour.selectedProjectStates";

export default {
  name: "StatsExpenses",
  components: {
    CardComponent,
    TitleBar,
    PricePerHourDetail
  },
  data() {
    return {
      isLoading: true,
      filters: {
        project_state: null,
        year: null,
        dataType: "Previsió",
        margin: 5
      },
      project_states: [],
      selectedProjectStates: [],
      years: [],
      dataTypes: ["Previsió", "Execució"]
    };
  },
  computed: {
    titleStack () {
      return ['Informes', 'Preu hora']
    },
    subtitle () {
      return 'Quant costa cada hora productiva, amb les despeses d\'estructura i el marge.'
    }
  },
  async mounted() {
    this.isLoading = true;

    this.getData();
  },
  methods: {
    toggleState(state) {
      this.selectedProjectStates = this.selectedProjectStates.includes(state.id)
        ? this.selectedProjectStates.filter(id => id !== state.id)
        : [...this.selectedProjectStates, state.id];
      try {
        localStorage.setItem(STATES_KEY, JSON.stringify(this.selectedProjectStates));
      } catch (e) {
        // private mode: not remembered
      }
    },
    getData() {
      service({ requiresAuth: true, cached: true })
        .get("project-states")
        .then(r => {
          this.project_states = [...r.data];
          // the old default was "1+2"; remembered in this browser once changed
          let saved = null;
          try {
            saved = JSON.parse(localStorage.getItem(STATES_KEY) || "null");
          } catch (e) {
            saved = null;
          }
          this.selectedProjectStates = Array.isArray(saved)
            ? saved
            : this.project_states.filter(s => s.id === 1 || s.id === 2).map(s => s.id);

          service({ requiresAuth: true, cached: true })
            .get("years?_sort=year:DESC")
            .then(r => {
              this.years = [...r.data]/*  */;
              const y = defaultYear(this.years);
              this.years.unshift({ id: 0, year: "Tots" });
              this.filters.year = y ? parseInt(y.year) : "Tots";

              this.isLoading = false;
            });
        });
    }
  }
};
</script>
<style>
.k-header,
.k-grid-header,
.k-grouping-header,
.k-pager-wrap,
.k-state-highlight,
.k-panelbar .k-tabstrip-items .k-item {
  background-color: var(--a-thead) !important;
  border-color: var(--a-line) !important;
}
.k-pivot-toolbar .k-button {
  background-color: #999 !important;
  border-color: #999 !important;
}
</style>
<style scoped>
.margin-field {
  padding-right: .75rem;
}
.margin-field .input {
  width: 3.5rem;
  border: 0;
  box-shadow: none;
  text-align: right;
  font-weight: 700;
  background: transparent;
}
</style>
