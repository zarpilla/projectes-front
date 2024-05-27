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
            <b-field label="Marge (%)">
              <b-input v-model="filters.margin" placeholder="Marge" type="numeric" />              
            </b-field>
          </b-field>
        </form>
      </card-component>

      <div class="notification is-warning">
        <p>
          <strong>Nota:</strong> Aquest mòdul és experimental i pot contenir errors
        </p>
      </div>

      <card-component title="Projectes">
        <price-per-hour-detail
          :project-state="filters.project_state" :year="filters.year" :data-type="filters.dataType" :margin="filters.margin"
          v-if="!isLoading"
        />
      </card-component>
    </section>
  </div>
</template>

<script>
import TitleBar from "@/components/TitleBar";
import CardComponent from "@/components/CardComponent";
import PricePerHourDetail from "@/components/PricePerHourDetail";
import service from "@/service/index";
import defaultProjectState from "@/service/projectState";
import { addScript, addStyle } from "@/helpers/addScript";

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
      years: [],
      dataTypes: ["Previsió", "Execució"]
    };
  },
  computed: {
    titleStack() {
      return ["Projectes", "Preu Hora"];
    }
  },
  async mounted() {
    this.isLoading = true;

    this.getData();

    // setInterval(async () => {
    //   console.log('kendoPivotGrid', kendoPivotGrid)
    // }, 300)
  },
  methods: {
    getData() {
      service({ requiresAuth: true, cached: true })
        .get("project-states")
        .then(r => {
          this.project_states = [...r.data];
          this.project_states.unshift({ id: 0, name: "Tots" });
          const name = `${this.project_states.find(s => s.id === 1).name}+${this.project_states.find(s => s.id === 3).name}`
          this.project_states.push({ id: -1, name });

          const name2 = `${this.project_states.find(s => s.id === 1).name}+${this.project_states.find(s => s.id === 2).name}`
          this.project_states.push({ id: -2, name: name2 });

          this.filters.project_state = this.project_states[this.project_states.length - 1].id;

          service({ requiresAuth: true, cached: true })
            .get("years?_sort=year:DESC")
            .then(r => {
              this.years = [...r.data]/*  */;
              const y = this.years[0].year;
              //this.years.unshift({ id: 0, year: parseInt(y) + 1 });
              //this.years.unshift({ id: 0, year: parseInt(y) + 2 });
              // this.years.unshift({ id: 0, year: "Tots" });
              this.filters.year = parseInt(y);

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
