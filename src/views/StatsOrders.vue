<template>
  <div v-if="!isLoading">
    <title-bar :title-stack="titleStack" subtitle="Les comandes de logística per any i mes, en gràfics i en una taula dinàmica que pots agrupar com vulguis." />
    <section class="section is-main-section">
      <form class="filter-bar" role="search" aria-label="Filtres" @submit.prevent>
        <label class="filter-select">
          <span>Any</span>
          <b-select v-model="filters.year" aria-label="Any">
            <option v-for="(year, index) in years" :key="index" :value="year">{{ year.year }}</option>
          </b-select>
        </label>
        <label class="filter-select">
          <span>Mes</span>
          <b-select v-model="filters.month" aria-label="Mes">
            <option v-for="(month, index) in months" :key="index" :value="month">{{ month.name || month.month }}</option>
          </b-select>
        </label>
      </form>
      <orders-stats-charts
        v-if="!isLoading && chartRows"
        :rows="chartRows"
        :year="filters.year && filters.year.year"
        :month="filters.month && filters.month.month"
      />
      <orders-pivot :year="filters.year" :month="filters.month" v-if="!isLoading" @loaded="rows => (chartRows = rows)" />
    </section>
  </div>
</template>

<script>
import TitleBar from "@/components/TitleBar.vue";
import OrdersPivot from "@/components/OrdersPivot.vue";
import OrdersStatsCharts from "@/components/OrdersStatsCharts.vue";
import service from "@/service/index";
import defaultProjectState from "@/service/projectState";
import { addScript, addStyle } from "@/helpers/addScript";
import moment from "moment";

export default {
  name: "StatsOrders",
  components: {
    TitleBar,
    OrdersPivot,
    OrdersStatsCharts
  },
  data() {
    return {
      isLoading: true,
      // rows loaded by the pivot, for the charts
      chartRows: null,
      filters: {
        project_state: null,
        year: null,
        month: null
      },
      project_states: [],
      years: [],
      months: []
    };
  },
  computed: {
    titleStack() {
      return ["Estadístiques", "Informe de comandes"];
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
        setTimeout(() => {
          this.isLoading = false;
        }, 250);
      }
    }, 100);
  },
  methods: {
    getData() {
      service({ requiresAuth: true, cached: true })
        .get("years?_sort=year:DESC")
        .then(r => {
          this.years = r.data;
          //this.years.unshift({ id: 0, year: 0 })
          if (!this.years.find(y => y.id === 0)) {
            this.years.unshift({ id: 0, year: "Tots" });
          }          
          // this.filters.year = 0
          this.filters.year = this.years[1];

          service({ requiresAuth: true, cached: true })
            .get("months")
            .then(r => {
              this.months = r.data;

              if (!this.months.find(m => m.id === 0)) {
                this.months.unshift({ id: 0, month: "Tots" });
              }
              const currentMonth = moment().month();
              this.filters.month = this.months[currentMonth + 1];
              // only now: the pivot needs both filters (issues/043)
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
