<template>
  <div>
    <!-- Pivot Views Component -->
    <pivot-views
      :pivot-views="pivotViews"
      :selected-view-id="selectedViewId"
      :show-save-modal="showSaveViewModal"
      :view-name="newViewName"
      @apply-view="applyPivotView"
      @apply-default="applyDefaultView"
      @save-view="showSaveView"
      @delete-view="deletePivotView"
      @close-save-modal="showSaveViewModal = false"
      @confirm-save="saveCurrentView"
      @update:viewName="newViewName = $event"
    />
    
    <div id="project-despeses" class="mb-3"></div>
    <b-loading
      :is-full-page="true"
      v-model="isLoading"
      :can-cancel="false"
    ></b-loading>
    <download-excel
      class="export"
      :data="pivotData"
      :fields="excelFields1"
      name="detall-ingressos-despeses"
    >
      <b-button title="Descarrega detall" icon-left="download">Exporta detall</b-button>
    </download-excel>
    <download-excel
      class="export"
      :data="pivotDataYearGroupped"
      :fields="excelFields2"
      name="totals-any-ingressos-despeses"
    >
      <b-button title="Descarrega totals per any i projecte" icon-left="download">Exporta totals per any</b-button>
    </download-excel>
    <download-excel
      class="export"
      :data="pivotDataGroupped"
      :fields="excelFields3"
      name="totals-ingressos-despeses"
    >
      <b-button title="Descarrega totals per projecte" icon-left="download">Exporta totals</b-button>
    </download-excel>

    <!-- <pre>{{ pivotData }}</pre> -->
    <!-- <pre>
      {{ pivotDataGroupped }}
    </pre> -->
  </div>
</template>

<script>
import service from "@/service/index";
import sumBy from "lodash/sumBy";
import sortBy from "lodash/sortBy";
import omit from "lodash/omit";
import moment from "moment";
import configPivot from "@/service/configStatsEconomicDetail";
import { fiscalPivotRows } from "@/domain/years";
import { economicDetailTotals } from "@/domain/economicDetailTotals";
import { mapState } from "pinia"
import { useMainStore } from "@/stores/main.js";
import { format } from "@/helpers/excelFormatter";
import _ from "lodash";
import PivotViews from '@/components/PivotViews.vue'
import pivotViewsMixin from '@/mixins/pivotViewsMixin.js'

moment.locale("ca");

export default {
  name: "ProjectesPivot",
  components: { PivotViews },
  emits: ["loaded"],
  mixins: [pivotViewsMixin],
  props: {
    projectStates: {
      type: Array,
      default: 0
    },
    year: {
      type: [String, Number],
      default: null
    },
    dataType: {
      type: String,
      default: null
    },
    // first month of the fiscal year (Configuració general), 1 = calendar year
    startMonth: {
      type: Number,
      default: 1
    }
  },
  computed: {
    ...mapState(useMainStore, ["userName", "user"]),
    pivotDataGroupped() {
      return _(this.pivotData)
        .groupBy("id")
        .map((rows, id) => ({
          id: id,
          project_name: rows[0].project_name,
          ...economicDetailTotals(rows)
        }))
        .value();
    },
    pivotDataYearGroupped() {
      return _(
        this.pivotData.map(p => {
          return { ...p, py: `${p.id}.${p.year}` };
        })
      )
        .groupBy("py")
        .map((rows, py) => ({
          id: py.split(".")[0],
          year: py.split(".")[1],
          project_name: rows[0].project_name,
          ...economicDetailTotals(rows)
        }))
        .value();
    },
    excelFields1() {
      const fields = {
        id: "id",
        project_name: "project_name",
        project_scope: "project_scope",
        project_state: "project_state",
        project_type: "project_type",
        project_likelihood: "project_likelihood",
        project_leader: "project_leader",
        mother: "mother",
        type: "type",
        date: "date",
        // forecast dates and whole VAT of the budget line (issues/142, issues/143)
        previsio_facturacio: "forecast_invoice_date",
        previsio_pagament: "forecast_payment_date",
        year: "year",
        month: "month",
        paid: "paid",
        row_type: "row_type",
        income_orig: {
          field: "income_orig",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        income_esti: {
          field: "income_esti",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        income_real: {
          field: "income_real",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        expense_orig: {
          field: "expense_orig",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        expense_orig_iva_no_deduible: {
          field: "expense_orig_vat",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        expense_esti: {
          field: "expense_esti",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        expense_esti_iva_no_deduible: {
          field: "expense_esti_vat",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        expense_real: {
          field: "expense_real",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        expense_real_iva_no_deduible: {
          field: "expense_real_vat",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        // the whole VAT; `*_iva_no_deduible` is only the non-deductible part
        iva_pct: "vat_pct",
        iva: {
          field: "vat",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        total_original_hours_price: {
          field: "total_original_hours_price",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        total_estimated_hours_price: {
          field: "total_estimated_hours_price",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        total_real_hours_price: {
          field: "total_real_hours_price",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        total_original_hours: {
          field: "total_original_hours",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        total_estimated_hours: {
          field: "total_estimated_hours",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        total_real_hours: {
          field: "total_real_hours",
          callback: value => {
            return this.excelFormat(value);
          }
        }
      };
      if (this.dataType === 'Previsió') {
        delete fields.income_orig
        delete fields.income_real
        delete fields.expense_orig
        delete fields.expense_orig_iva_no_deduible
        delete fields.expense_real
        delete fields.expense_real_iva_no_deduible
        delete fields.total_original_hours_price
        delete fields.total_real_hours_price
        delete fields.total_original_hours
        delete fields.total_real_hours
      }
      else if (this.dataType === 'Execució') {
        delete fields.income_orig
        delete fields.income_esti
        delete fields.expense_orig
        delete fields.expense_orig_iva_no_deduible
        delete fields.expense_esti
        delete fields.expense_esti_iva_no_deduible
        delete fields.total_original_hours_price
        delete fields.total_estimated_hours_price
        delete fields.total_original_hours
        delete fields.total_estimated_hours
      }
      return fields
    },
    excelFields2() {
      const fields = {
        id: "id",
        project_name: "project_name",
        year: "year",
        "Resultat orig": {
          field: "orig",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Resultat prev": {
          field: "esti",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Resultat exec": {
          field: "real",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Ingressos orig": {
          field: "income_orig",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Ingressos prev": {
          field: "income_esti",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Ingressos exec": {
          field: "income_real",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Despeses tot orig": {
          field: "total_expense_orig",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Despeses tot prev": {
          field: "total_expense_esti",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Despeses tot exec": {
          field: "total_expense_real",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Despeses orig": {
          field: "expense_orig",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Despeses orig IVA no deduïble": {
          field: "expense_orig_vat",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Despeses prev": {
          field: "expense_esti",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Despeses prev IVA no deduïble": {
          field: "expense_esti_vat",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Despeses exec": {
          field: "expense_real",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Despeses exec IVA no deduïble": {
          field: "expense_real_vat",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Hores orig": {
          field: "total_original_hours_price",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Hores prev": {
          field: "total_estimated_hours_price",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Hores exec": {
          field: "total_real_hours_price",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Hores orig (h)": {
          field: "total_original_hours",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Hores prev (h)": {
          field: "total_estimated_hours",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Hores exec (h)": {
          field: "total_real_hours",
          callback: value => {
            return this.excelFormat(value);
          }
        }
      };

      if (this.dataType === 'Previsió') {
        delete fields["Resultat orig"]
        delete fields["Resultat exec"]
        delete fields["Ingressos orig"]
        delete fields["Ingressos exec"]
        delete fields["Despeses tot orig"]
        delete fields["Despeses tot exec"]
        delete fields["Despeses orig"]
        delete fields["Despeses orig IVA no deduïble"]
        delete fields["Despeses exec"]
        delete fields["Despeses exec IVA no deduïble"]
        delete fields["Hores orig"]
        delete fields["Hores exec"]
        delete fields["Hores orig (h)"]
        delete fields["Hores exec (h)"]
      }
      else if (this.dataType === 'Execució') {
        delete fields["Resultat orig"]
        delete fields["Resultat prev"]
        delete fields["Ingressos orig"]
        delete fields["Ingressos prev"]
        delete fields["Despeses tot orig"]
        delete fields["Despeses tot prev"]
        delete fields["Despeses orig"]
        delete fields["Despeses orig IVA no deduïble"]
        delete fields["Despeses prev"]
        delete fields["Despeses prev IVA no deduïble"]
        delete fields["Hores orig"]
        delete fields["Hores prev"]
        delete fields["Hores orig (h)"]
        delete fields["Hores prev (h)"]
      }
      return fields
    },
    excelFields3() {
      const fields = {
        id: "id",
        project_name: "project_name",
        "Resultat orig": {
          field: "orig",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Resultat prev": {
          field: "esti",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Resultat exec": {
          field: "real",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Ingressos orig": {
          field: "income_orig",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Ingressos prev": {
          field: "income_esti",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Ingressos exec": {
          field: "income_real",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Despeses tot orig": {
          field: "total_expense_orig",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Despeses tot prev": {
          field: "total_expense_esti",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Despeses tot exec": {
          field: "total_expense_real",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Despeses orig": {
          field: "expense_orig",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Despeses prev": {
          field: "expense_esti",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Despeses exec": {
          field: "expense_real",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Hores orig": {
          field: "total_original_hours_price",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Hores prev": {
          field: "total_estimated_hours_price",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Hores exec": {
          field: "total_real_hours_price",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Hores orig (h)": {
          field: "total_original_hours",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Hores prev (h)": {
          field: "total_estimated_hours",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Hores exec (h)": {
          field: "total_real_hours",
          callback: value => {
            return this.excelFormat(value);
          }
        }
      };

      if (this.dataType === 'Previsió') {
        delete fields["Resultat orig"]
        delete fields["Resultat exec"]
        delete fields["Ingressos orig"]
        delete fields["Ingressos exec"]
        delete fields["Despeses tot orig"]
        delete fields["Despeses tot exec"]
        delete fields["Despeses orig"]
        delete fields["Despeses exec"]
        delete fields["Hores orig"]
        delete fields["Hores exec"]
      }
      else if (this.dataType === 'Execució') {
        delete fields["Resultat orig"]
        delete fields["Resultat prev"]
        delete fields["Ingressos orig"]
        delete fields["Ingressos prev"]
        delete fields["Despeses tot orig"]
        delete fields["Despeses tot prev"]
        delete fields["Despeses orig"]
        delete fields["Despeses prev"]
        delete fields["Hores orig"]
        delete fields["Hores prev"]
      }
      return fields
    }
  },
  data() {
    return {
      isLoading: false,
      projects: [],
      projectsList: [],
      dedicationTypes: {},
      activityTypes: {},
      users: [],
      usersList: [],
      modalObjectName: "",
      userNameSearch: "",
      scopes: [],
      states: [],
      leaders: [],
      contacts: [],
      pivotData: [],
      pivotIdentifier: 'economic-detail-pivot'
    };
  },
  watch: {
    // projectStates: function(newVal, oldVal) {
    //   this.getActivities();
    // },
    // year: function(newVal, oldVal) {
    //   this.getActivities();
    // },
    // dataType: function(newVal, oldVal) {
    //   this.getActivities();
    // }
  },
  mounted() {
    this.getActivities();
  },
  methods: {
    async getActivities() {
      this.isLoading = true;
      // projectStates
      const query = `projects/economic-detail?_where[project_state_in]=${this.projectStates.join(',')}&_limit=-1`;

      const yearQ = this.year !== "Tots" ? `&_where[year_eq]=${this.year}` : "";
      const { data } = await service({ requiresAuth: true }).get(query + yearQ);
      const data2 = data.map(c => {
        return omit(c, ["document"]);
      });
      const rows = sortBy(data2, ["project_name"]);
      // the charts above the pivot use the same rows (with the year as a number)
      this.$emit("loaded", Object.freeze(rows));
      this.pivotData = Object.freeze(fiscalPivotRows(rows, this.startMonth));

      const currentConfigPivot = configPivot;

      if (this.dataType === "Previsió") {
        currentConfigPivot.dataSource.measures = [
          "Resultat prev",
          "Ingressos prev",
          "Despeses tot prev",
          "Despeses prev",
          "Hores prev",
          "Hores prev (h)"
        ];
      } else if (this.dataType === "Execució") {
        currentConfigPivot.dataSource.measures = [
          "Resultat exec",
          "Ingressos exec",
          "Despeses tot exec",
          "Despeses exec",
          "Hores exec",
          "Hores exec (h)"
        ];
      } else {
        currentConfigPivot.dataSource.measures = [
          "Resultat orig",
          "Resultat prev",
          "Resultat exec",
          "Ingressos orig",
          "Ingressos prev",
          "Ingressos exec",
          "Despeses tot orig",
          "Despeses tot prev",
          "Despeses tot exec",
          "Despeses orig",
          "Despeses prev",
          "Despeses exec",
          "Hores orig",
          "Hores prev",
          "Hores exec",
          "Hores orig (h)",
          "Hores prev (h)",
          "Hores exec (h)"
        ];
      }

      currentConfigPivot.dataSource.data = this.pivotData;
      this.initializePivotWithViews("#project-despeses", currentConfigPivot);
      this.isLoading = false;
    },
    applyDefaultView() {
      this.selectedViewId = null
      if (this.pivotGridInstance) {
        // Reset to default configuration
        const dataSource = this.pivotGridInstance.dataSource
        const defaultConfig = configPivot.dataSource
        
        dataSource.columns(defaultConfig.columns || [])
        dataSource.rows(defaultConfig.rows || [])
        dataSource.measures(defaultConfig.measures || [])
        // Note: Kendo Pivot Grid doesn't support filters() method
        // dataSource.filters([])
        
        this.selectedViewId = null
      }
    },
    excelFormat(value) {
      return format(this.user, value);
    }
  },
};
</script>
<style>
.card-body {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--a-line-soft);
}
.is-activity {
  cursor: pointer;
}
.is-total {
  background: var(--a-chip);
  text-transform: capitalize;
}
.auxiliar {
  color: var(--a-muted);
}
.projects-bars {
  margin-bottom: 2rem;
}
.projects-bars progress {
  margin-top: 1rem;
}
.view-button {
  margin-left: 0.5rem;
}
.export-button {
  margin-top: 1rem;
}
</style>
