<template>
  <div v-if="!isLoading">
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section">
      <card-component title="Filtres">
        <form @submit.prevent="() => {}">
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
            <b-field label="Any">
              <b-select v-model="filters.year" placeholder="Any">
                <option
                  v-for="(s, index) in years"
                  :key="index"
                  :value="s.year"
                >
                  {{ s.year }}
                </option>
              </b-select>
            </b-field>
            <b-field label="Dades">
              <b-select v-model="filters.dataType" placeholder="Any">
                <option v-for="(s, index) in dataTypes" :key="index" :value="s">
                  {{ s }}
                </option>
              </b-select>
            </b-field>
            <b-field>
              <b-button type="is-warning mt-x" @click="refreshData">Refrescar</b-button>
            </b-field>
          </b-field>
        </form>
      </card-component>

      <card-component title="Projectes" v-if="show">
        <economic-detail-pivot
          :project-states="selectedProjectStates" :year="filters.year" :data-type="filters.dataType"
          v-if="!isLoading"
        />
      </card-component>
    </section>
  </div>
</template>

<script>
import TitleBar from "@/components/TitleBar";
import CardComponent from "@/components/CardComponent";
import EconomicDetailPivot from "@/components/EconomicDetailPivot";
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
    titleStack() {
      return ["Projectes", "Detall Ingressos i Despeses"];
    }
  },
  async mounted() {
    this.isLoading = true;

    const interval = setInterval(async () => {
      if (window.jQuery) {
        clearInterval(interval);
        await addScript(
          (process.env.VUE_APP_PATH ? process.env.VUE_APP_PATH : "") +
            "vendor/kendo/kendo.all.min.js",
          "kendo-all-min-js"
        );
        await addStyle(
          (process.env.VUE_APP_PATH ? process.env.VUE_APP_PATH : "") +
            "vendor/kendo/kendo.common.min.css",
          "kendo-common-min-css"
        );
        await addStyle(
          (process.env.VUE_APP_PATH ? process.env.VUE_APP_PATH : "") +
            "vendor/kendo/kendo.custom.css",
          "kendo-custom-css"
        );
        await addStyle(
          (process.env.VUE_APP_PATH ? process.env.VUE_APP_PATH : "") +
            "vendor/kendo/custom.css",
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
  background-color: #f3f3f3 !important;
  border-color: #ddd !important;
}
.k-pivot-toolbar .k-button {
  background-color: #999 !important;
  border-color: #999 !important;
}
.mt-x {
  margin-top: 2.0rem;
}
</style>
