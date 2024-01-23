<template>
  <div v-if="!isLoading">
    <title-bar :title-stack="titleStack" />
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
          </b-field>
        </form>
      </card-component>

      <card-component title="Projectes">
        <economic-detail-pivot
          :project-state="filters.project_state" :year="filters.year" :data-type="filters.dataType"
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
        project_state: null,
        year: null,
        dataType: "Totes"
      },
      project_states: [],
      years: [],
      dataTypes: ["Totes", "Previsió", "Execució"]
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
            "/vendor/kendo/kendo.all.min.js",
          "kendo-all-min-js"
        );
        await addStyle(
          (process.env.VUE_APP_PATH ? process.env.VUE_APP_PATH : "") +
            "/vendor/kendo/kendo.common.min.css",
          "kendo-common-min-css"
        );
        await addStyle(
          (process.env.VUE_APP_PATH ? process.env.VUE_APP_PATH : "") +
            "/vendor/kendo/kendo.custom.css",
          "kendo-custom-css"
        );
        await addStyle(
          (process.env.VUE_APP_PATH ? process.env.VUE_APP_PATH : "") +
            "/vendor/kendo/custom.css",
          "custom-css"
        );
        
        this.getData();
      }
    }, 100);

    // setInterval(async () => {
    //   console.log('kendoPivotGrid', kendoPivotGrid)
    // }, 300)
  },
  methods: {
    getData() {
      service({ requiresAuth: true, cached: true })
        .get("project-states")
        .then(r => {
          this.project_states = r.data;
          this.project_states.unshift({ id: 0, name: "Tots" });
          const name = `${this.project_states.find(s => s.id === 1).name}+${this.project_states.find(s => s.id === 3).name}`
          this.project_states.push({ id: -1, name });
          this.filters.project_state = defaultProjectState;

          service({ requiresAuth: true, cached: true })
            .get("years?_sort=year:DESC")
            .then(r => {
              this.years = r.data;
              const y = this.years[0].year;
              this.years.unshift({ id: 0, year: parseInt(y) + 1 });
              this.years.unshift({ id: 0, year: parseInt(y) + 2 });
              this.years.unshift({ id: 0, year: "Tots" });
              this.filters.year = "Tots";

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
  background-color: #f3f3f3 !important;
  border-color: #ddd !important;
}
.k-pivot-toolbar .k-button {
  background-color: #999 !important;
  border-color: #999 !important;
}
</style>
