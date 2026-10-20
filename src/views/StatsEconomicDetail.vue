<template>
  <div v-if="!isLoading">
    <title-bar :title-stack="titleStack" :subtitle="subtitle" />
    <section class="section is-main-section">
      <form class="filter-bar" role="search" aria-label="Filtres" @submit.prevent>
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
        <label class="filter-select">
          <span>Any</span>
          <b-select v-model="filters.year" aria-label="Any">
            <option v-for="(s, index) in years" :key="index" :value="s.year">{{ yearLabel(s.year) }}</option>
          </b-select>
        </label>
        <div class="segmented" role="group" aria-label="Dades">
          <button v-for="t in dataTypes" :key="t" type="button" :class="{ 'is-on': filters.dataType === t }" @click="filters.dataType = t">{{ t }}</button>
        </div>
        <b-button icon-left="refresh" @click="refreshData">Refrescar</b-button>
      </form>
      <economic-detail-charts
        v-if="show && chartRows"
        :rows="chartRows"
        :year="filters.year"
        :data-type="filters.dataType"
        :start-month="fiscal.startMonth"
      />
      <economic-detail-pivot
        v-if="show && !isLoading"
        :project-states="selectedProjectStates"
        :year="filters.year"
        :data-type="filters.dataType"
        :start-month="fiscal.startMonth"
        @loaded="rows => (chartRows = rows)"
      />
    </section>
  </div>
</template>

<script>
import TitleBar from "@/components/TitleBar.vue";
import CardComponent from "@/components/CardComponent.vue";
import EconomicDetailPivot from "@/components/EconomicDetailPivot.vue";
import EconomicDetailCharts from "@/components/EconomicDetailCharts.vue";
import service from "@/service/index";
import { defaultYear, fiscalYearLabel, fiscalYearOf } from "@/domain/years";
import { loadFiscalSettings } from "@/service/fiscalYear";
import { stateChips } from "@/domain/projectStateChips";
import defaultProjectState from "@/service/projectState";
import { loadKendo, waitForJQuery } from "@/helpers/addScript";
import moment from "moment";

export default {
  name: "StatsExpenses",
  components: {
    CardComponent,
    TitleBar,
    EconomicDetailPivot,
    EconomicDetailCharts
  },
  data() {
    return {
      isLoading: true,
      filters: {
        project_states: [],
        year: null,
        dataType: "Totes"
      },
      project_states: [],
      years: [],
      dataTypes: ["Totes", "Previsió", "Execució"],
      selectedProjectStates: [],
      // rows loaded by the pivot, for the charts
      chartRows: null,
      show: true,
      // the years are fiscal years (Configuració general › Projectes)
      fiscal: { startMonth: 1 }
    };
  },
  computed: {
    titleStack () {
      return ['Informes', 'Ingressos i despeses']
    },
    subtitle () {
      return 'Ingressos i despeses previstos i executats dels projectes: un resum en gràfics i, a sota, el detall a la taula dinàmica.'
    }
  },
  watch: {
    // the table follows the filters right away, like the charts (it waited for «Refrescar»)
    "filters.year"(value, old) {
      if (old !== null) this.scheduleRefresh();
    },
    "filters.dataType"() {
      this.scheduleRefresh();
    },
    selectedProjectStates: {
      deep: true,
      handler(value, old) {
        if (old && old.length) this.scheduleRefresh();
      }
    }
  },
  async mounted() {
    this.isLoading = true;

    this.stopJQueryWait = waitForJQuery(async () => {
      await loadKendo();

      this.getData();
    });

  },
  beforeUnmount() {
    this.stopJQueryWait();
  },
  methods: {
    yearLabel(year) {
      return fiscalYearLabel(year, this.fiscal.startMonth);
    },
    getData() {
      service({ requiresAuth: true, cached: true })
        .get("project-states")
        .then(r => {
          this.project_states = stateChips(r.data);
          //this.project_states.unshift({ id: 0, name: "Tots" });
          // const name = `${this.project_states.find(s => s.id === 1).name}+${this.project_states.find(s => s.id === 3).name}`
          // this.project_states.push({ id: -1, name });

          // const name2 = `${this.project_states.find(s => s.id === 1).name}+${this.project_states.find(s => s.id === 2).name}`
          // this.project_states.push({ id: -2, name: name2 });

          if (
            localStorage.getItem("StatsEconomicDetail.selectedProjectStates")
          ) {
            this.selectedProjectStates = JSON.parse(
              localStorage.getItem("StatsEconomicDetail.selectedProjectStates")
            );
          } else {
            this.selectedProjectStates = this.project_states.map(s => s.id);
          }

          //this.filters.project_state = defaultProjectState;

          Promise.all([
            service({ requiresAuth: true, cached: true }).get("years?_sort=year:DESC"),
            loadFiscalSettings()
          ])
            .then(([r, fiscal]) => {
              this.fiscal = fiscal;
              this.years = [...r.data] /*  */;
              const y = this.years[0].year;
              this.years.unshift({ id: 0, year: parseInt(y) + 1 });
              this.years.unshift({ id: 0, year: parseInt(y) + 2 });
              this.years.unshift({ id: 0, year: "Tots" });
              // this.filters.year = "Tots";
              // this year; next years are offered above, so they are not a fallback
              const now = fiscalYearOf(moment(), fiscal.startMonth);
              const current = defaultYear(this.years.filter(y => Number(y.year) <= now), now);
              this.filters.year = current ? current.year : "Tots";

              this.isLoading = false;
            });
        });
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
        "StatsEconomicDetail.selectedProjectStates",
        JSON.stringify(this.selectedProjectStates)
      );
      //this.getData()
    },
    // several clicks on the state chips reload once
    scheduleRefresh() {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = setTimeout(() => this.refreshData(), 400);
    },
    refreshData() {
      this.show = false;
      setTimeout(() => {
        this.show = true;
      }, 200);
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
.mt-x {
  margin-top: 2.0rem;
}
</style>
