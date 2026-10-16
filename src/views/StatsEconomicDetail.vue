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
            <option v-for="(s, index) in years" :key="index" :value="s.year">{{ s.year }}</option>
          </b-select>
        </label>
        <div class="segmented" role="group" aria-label="Dades">
          <button v-for="t in dataTypes" :key="t" type="button" :class="{ 'is-on': filters.dataType === t }" @click="filters.dataType = t">{{ t }}</button>
        </div>
        <b-button icon-left="refresh" @click="refreshData">Refrescar</b-button>
      </form>
      <economic-detail-pivot
        v-if="show && !isLoading"
        :project-states="selectedProjectStates"
        :year="filters.year"
        :data-type="filters.dataType"
      />
    </section>
  </div>
</template>

<script>
import TitleBar from "@/components/TitleBar.vue";
import CardComponent from "@/components/CardComponent.vue";
import EconomicDetailPivot from "@/components/EconomicDetailPivot.vue";
import service from "@/service/index";
import defaultProjectState from "@/service/projectState";
import { addScript, addStyle } from "@/helpers/addScript";
import moment from "moment";

export default {
  name: "StatsExpenses",
  components: {
    CardComponent,
    TitleBar,
    EconomicDetailPivot
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
      show: true
    };
  },
  computed: {
    titleStack () {
      return ['Informes', 'Ingressos i despeses']
    },
    subtitle () {
      return 'Ingressos i despeses previstos i executats dels projectes, en detall. Configura la taula dinàmica per agrupar-los.'
    }
  },
  async mounted() {
    this.isLoading = true;

    const interval = setInterval(async () => {
      if (window.jQuery) {
        clearInterval(interval);
        await addScript(
          (import.meta.env.VUE_APP_PATH ? import.meta.env.VUE_APP_PATH : "") +
            "/vendor/kendo/kendo.all.min.js",
          "kendo-all-min-js"
        );
        await addStyle(
          (import.meta.env.VUE_APP_PATH ? import.meta.env.VUE_APP_PATH : "") +
            "/vendor/kendo/kendo.common.min.css",
          "kendo-common-min-css"
        );
        await addStyle(
          (import.meta.env.VUE_APP_PATH ? import.meta.env.VUE_APP_PATH : "") +
            "/vendor/kendo/kendo.custom.css",
          "kendo-custom-css"
        );
        await addStyle(
          (import.meta.env.VUE_APP_PATH ? import.meta.env.VUE_APP_PATH : "") +
            "/vendor/kendo/custom.css",
          "custom-css"
        );

        this.getData();
      }
    }, 100);

  },
  methods: {
    getData() {
      service({ requiresAuth: true, cached: true })
        .get("project-states")
        .then(r => {
          this.project_states = [...r.data];
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

          service({ requiresAuth: true, cached: true })
            .get("years?_sort=year:DESC")
            .then(r => {
              this.years = [...r.data] /*  */;
              const y = this.years[0].year;
              this.years.unshift({ id: 0, year: parseInt(y) + 1 });
              this.years.unshift({ id: 0, year: parseInt(y) + 2 });
              this.years.unshift({ id: 0, year: "Tots" });
              // this.filters.year = "Tots";
              this.filters.year = this.years.find(
                y => y.year.toString() === moment().format("YYYY")
              ).year;

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
