<template>
  <div>
    <!-- <pre>{{ monthlySummaryForPivot }}</pre> -->

    <b-loading
      :is-full-page="true"
      v-model="isLoading"
      :can-cancel="false"
    ></b-loading>

    <!-- Redesign A: filters, figures, a chart per year and the summary table -->
    <form class="filter-bar" role="search" aria-label="Filtres" @submit.prevent="getData">
      <div class="toggle-group" role="group" aria-label="Estat projecte">
        <span class="toggle-label">Estat</span>
        <button
          v-for="state in projectStates"
          :key="state.id"
          type="button"
          class="chip-toggle"
          :class="{ 'is-on': selectedProjectStates.includes(state.id) }"
          :aria-pressed="selectedProjectStates.includes(state.id) ? 'true' : 'false'"
          @click="toggleState(state)"
        >{{ state.name }}</button>
      </div>
      <div class="toggle-group" role="group" aria-label="Probabilitat">
        <span class="toggle-label">Probabilitat</span>
        <button
          v-for="likelihood in projectLikelihoods"
          :key="likelihood.id"
          type="button"
          class="chip-toggle"
          :class="{ 'is-on': selectedProjectLikelihoods.includes(likelihood.id) }"
          :aria-pressed="selectedProjectLikelihoods.includes(likelihood.id) ? 'true' : 'false'"
          @click="toggleLikelihood(likelihood)"
        >{{ likelihood.name }}</button>
        <button
          type="button"
          class="chip-toggle"
          :class="{ 'is-on': selectedProjectLikelihoods.includes(null) }"
          :aria-pressed="selectedProjectLikelihoods.includes(null) ? 'true' : 'false'"
          @click="toggleLikelihood(null)"
        >Sense probabilitat</button>
      </div>
      <div class="segmented" role="group" aria-label="Periodificació">
        <span class="toggle-label seg-label">Periodificació</span>
        <button v-for="o in periodOptions" :key="o.value" type="button" :class="{ 'is-on': periodificacio === o.value }" @click="periodificacio = o.value">{{ o.label }}</button>
      </div>
      <b-button native-type="submit" icon-left="refresh" :type="filtersChanged ? 'is-primary' : ''" :disabled="isLoading">Refrescar</b-button>
    </form>

    <div v-if="payrollGap" class="notification is-warning">
      <b>Les nòmines previstes arriben fins a {{ payrollGap.last }}.</b>
      A partir de {{ payrollGap.from }} les despeses no inclouen personal i el resultat d'aquests anys no és comparable.
    </div>

    <div v-if="yearRows.length" class="doc-kpis">
      <div v-for="y in yearRows.slice(0, 2)" :key="'r' + y.year" class="doc-kpi">
        <span>Resultat previst {{ y.year }}</span>
        <b :class="'has-text-' + sign(y.result)">{{ money(y.result) }}</b>
        <small>Ingressos {{ money(y.incomes, 0) }} · despeses {{ money(y.expenses, 0) }}</small>
      </div>
      <div v-if="yearRows[1]" class="doc-kpi">
        <span>Nòmines previstes {{ yearRows[1].year }}</span>
        <b :class="'has-text-' + sign(yearRows[1].payroll)">{{ money(yearRows[1].payroll) }}</b>
        <small>{{ percent(yearRows[1].expenses ? yearRows[1].payroll / yearRows[1].expenses : 0) }} de les despeses del {{ yearRows[1].year }}</small>
      </div>
      <div class="doc-kpi">
        <span>Resultat {{ yearRows[0].year }}–{{ yearRows[yearRows.length - 1].year }}</span>
        <b :class="'has-text-' + sign(total.result)">{{ money(total.result) }}</b>
        <small>marge del {{ percent(total.incomes ? total.result / total.incomes : 0) }} sobre ingressos</small>
      </div>
    </div>

    <section v-if="yearRows.length" class="report-box">
      <header class="report-box-head">
        <div>
          <h2>Ingressos i despeses per any</h2>
          <span class="has-text-muted">Sobre cada any, el resultat previst</span>
        </div>
      </header>
      <div class="chart-legend" aria-hidden="true">
        <span><i class="c-inc"></i>Ingressos</span>
        <span><i class="c-pay"></i>Nòmines</span>
        <span><i class="c-exp"></i>Factures i despeses</span>
        <span><i class="c-vat"></i>IVA no deduïble</span>
      </div>
      <div class="year-chart" role="img" :aria-label="yearRows.map(y => y.year + ': resultat ' + money(y.result)).join(', ')">
        <div v-for="y in yearRows" :key="y.year" class="year-col">
          <span class="year-result" :class="'has-text-' + sign(y.result)">{{ (y.result > 0 ? "+" : "") + money(y.result, 0) }}</span>
          <div class="year-bars">
            <span class="bar" :title="'Ingressos ' + money(y.incomes)">
              <i class="c-inc" :style="{ height: h(y.incomes) }"></i>
            </span>
            <span class="bar" :title="'Despeses ' + money(y.expenses)">
              <i class="c-vat" :style="{ height: h(-y.vat) }"></i>
              <i class="c-exp" :style="{ height: h(-y.invoices) }"></i>
              <i class="c-pay" :style="{ height: h(-y.payroll) }"></i>
            </span>
          </div>
          <b>{{ y.year }}</b>
          <small class="has-text-muted">ingr. · desp.</small>
        </div>
      </div>
    </section>

    <section class="report-box">
      <header class="report-box-head">
        <div>
          <h2>Resum de la previsió</h2>
          <span class="has-text-muted">Ingressos i despeses per tipus</span>
        </div>
      </header>
      <div class="table-wrap">
        <table class="table is-fullwidth forecast-table">
          <thead>
            <tr>
              <th>Concepte</th>
              <th v-for="y in yearRows" :key="y.year" class="has-text-right">{{ y.year }}</th>
              <th v-if="yearRows.length" class="has-text-right">Total {{ yearRows[0].year }}–{{ yearRows[yearRows.length - 1].year }}</th>
            </tr>
          </thead>
          <tbody>
            <tr class="is-group">
              <th>Ingressos</th>
              <td v-for="y in yearRows" :key="y.year" class="has-text-right">{{ money(y.incomes) }}</td>
              <td class="has-text-right">{{ money(total.incomes) }}</td>
            </tr>
            <tr class="is-group">
              <th>Despeses</th>
              <td v-for="y in yearRows" :key="y.year" class="has-text-right has-text-neg">{{ money(y.expenses) }}</td>
              <td class="has-text-right has-text-neg">{{ money(total.expenses) }}</td>
            </tr>
            <tr v-for="part in parts" :key="part.key" class="is-sub">
              <th><i class="dot" :class="part.css"></i>{{ part.label }}</th>
              <td v-for="y in yearRows" :key="y.year" class="has-text-right" :class="{ 'has-text-neg': y[part.key] < 0 }">{{ money(y[part.key]) }}</td>
              <td class="has-text-right" :class="{ 'has-text-neg': total[part.key] < 0 }">{{ money(total[part.key]) }}</td>
            </tr>
            <tr class="is-group">
              <th>Resultat</th>
              <td v-for="y in yearRows" :key="y.year" class="has-text-right" :class="'has-text-' + sign(y.result)">{{ money(y.result) }}</td>
              <td class="has-text-right" :class="'has-text-' + sign(total.result)">{{ money(total.result) }}</td>
            </tr>
            <tr>
              <th>Marge sobre ingressos</th>
              <td v-for="y in yearRows" :key="y.year" class="has-text-right">{{ y.incomes ? percent(y.result / y.incomes) : "—" }}</td>
              <td class="has-text-right">{{ total.incomes ? percent(total.result / total.incomes) : "—" }}</td>
            </tr>
            <tr class="is-quiet">
              <th>Ingressos ÷ despeses previstes</th>
              <td v-for="y in yearRows" :key="y.year" class="has-text-right">{{ y.coverage === null ? "—" : formatPrice(y.coverage) + " %" }}</td>
              <td class="has-text-right">{{ total.expenses ? formatPrice((total.incomes / total.expenses) * -100) + " %" : "—" }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="report-note">
        Ingressos: línies d'ingrés previstes al pla de cada projecte. Despeses: factures i despeses previstes, la part no deduïble de l'IVA i les nòmines previstes de la cooperativa.
        L'última fila diu quina part de les despeses previstes cobreixen els ingressos previstos.
      </p>
    </section>

    <card-component
      title="IVA"
      class="ztile is-child mt-2"
      v-if="
        me &&
          me.options &&
          me.options.deductible_vat_pct &&
          me.options.deductible_vat_pct > 0
      "
    >
      <div class="columns">
        <div class="column">
          <b-field label="Pagat" grouped class="column">
            <div class="readonly subphase-detail-input">
              <money-format
                :value="vat.paid"
                :locale="'es'"
                :currency-code="'EUR'"
                :subunits-value="false"
                :hide-subunits="false"
              >
              </money-format>
            </div>
          </b-field>
        </div>
        <div class="column">
          <b-field label="Cobrat" grouped class="column">
            <div class="readonly subphase-detail-input">
              <money-format
                :value="vat.received"
                :locale="'es'"
                :currency-code="'EUR'"
                :subunits-value="false"
                :hide-subunits="false"
              >
              </money-format>
            </div>
          </b-field>
        </div>
        <div class="column">
          <b-field label="Deduïble" grouped class="column">
            <div class="readonly subphase-detail-input">
              {{ me.options.deductible_vat_pct }}%
            </div>
          </b-field>
        </div>
        <div class="column">
          <b-field label="Saldo" grouped class="column">
            <money-format
              :value="
                (vat.paid - (vat.received * me.options.deductible_vat_pct / 100))
              "
              :locale="'es'"
              :currency-code="'EUR'"
              :subunits-value="false"
              :hide-subunits="false"
            >
            </money-format>
          </b-field>
        </div>
        <div class="column">
          <b-field label="Saldar" grouped class="column">
            <button
              class="button is-primary"
              @click="payVat"
              :disabled="vat.paid - vat.received === 0 || payingVat"
            >
              {{ payingVat ? "..." : "Saldar" }}
            </button>
          </b-field>
        </div>
      </div>
    </card-component>

  </div>
</template>

<script>
// import ModalBox from '@/components/ModalBox.vue'
import service from "@/service/index";
import moment from "moment";
import sortBy from "lodash/sortBy";
import _ from "lodash";
import configPivot from "@/service/configStatsTreasury";
import ModalBoxInvoicing from "./ModalBoxInvoicing.vue";
import CardComponent from "./CardComponent.vue";
import { mapState } from "pinia"
import { useMainStore } from "@/stores/main.js";
import MoneyFormat from "@/components/MoneyFormat.vue";
import TreasuryAnnotationInput from "@/components/TreasuryAnnotationInput.vue";
import { addScript, addStyle } from "@/helpers/addScript";
import getTreasuryData from "@/service/treasury";
import { formatNumber, sign } from "@/helpers/format-number";

export default {
  name: "Tresoreria",
  components: {
    ModalBoxInvoicing,
    CardComponent,
    MoneyFormat,
    TreasuryAnnotationInput
  },
  props: {
    titleStack: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      isLoading: false,
      years: [],
      projects: [],
      treasury: [],
      treasuryData: [],
      treasuryData2: [],
      emitted: [],
      received: [],
      tickets: [],
      diets: [],
      contacts: [],
      emittedGrants: [],
      receivedGrants: [],
      projectIncomes: [],
      projectExpenses: [],
      receivedIncomes: [],
      receivedExpenses: [],
      payrolls: [],
      isModalActive: false,
      trashObject: null,
      pivotData: [],
      pivotData2: [],
      vat: { paid: 0, received: 0 },
      me: null,
      payingVat: false,
      view: "startOfYear",
      projectStates: [],
      selectedProjectStates: [],
      projectTypes: [],
      selectedProjectTypes: [],
      projectLikelihoods: [],
      selectedProjectLikelihoods: [],
      periodificacio: "no",
      // Economic forecast ("prevista") per year, returned by the forecast
      // endpoint. Keyed by year (string):
      //   { forecast_incomes, forecast_expenses, forecast_expenses_vat }
      // Always reflects the project plan (project_phases + prevista
      // periodification), independent of the cashflow "Periodificació" select.
      forecastByYear: {},
      // Full payroll cost per year (net + IRPF + SS + other), paid or not.
      forecastPayrollsByYear: {},
      // filters changed since the last load (Refrescar applies them)
      filtersChanged: false,
    };
  },
  async mounted() {
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
        this.isLoading = false;
        this.getInitialData();
      }
    }, 100);
  },
  computed: {
    selectedProjectStatesNames() {
      return this.projectStates
        .filter(s => this.selectedProjectStates.includes(s.id))
        .map(s => s.name).join(", ");
    },
    monthlySummary() {
      const year = this.$route.query.year
        ? this.$route.query.year
        : moment().format("YYYY");

      // const fn = (t) => { return this.view === 'today' ? t.datef >= t.datef >= moment().format("YYYYMMDD") : t.datef >= moment().startOf('year').format("YYYYMMDD") }
      const treasuryData = this.treasuryData
        // .filter((t) => t.datef >= moment().startOf('year').format("YYYYMMDD"))
        .filter(t =>
          this.view === "today"
            ? t.datef >= moment().format("YYYYMMDD")
            : t.datef >= `${year}0101`
        )
        .map(t => {
          return {
            ...t,
            year: moment(t.datef, "YYYYMMDD").format("YYYY"),
            month: moment(t.datef, "YYYYMMDD").format("MM"),
            ym: moment(t.datef, "YYYYMMDD").format("YYYYMM")
          };
        });
      return treasuryData;
    },
    monthlySummary2() {
      const year = this.$route.query.year
        ? this.$route.query.year
        : moment().format("YYYY");

      // const fn = (t) => { return this.view === 'today' ? t.datef >= t.datef >= moment().format("YYYYMMDD") : t.datef >= moment().startOf('year').format("YYYYMMDD") }
      const treasuryData = this.treasuryData2
        // .filter((t) => t.datef >= moment().startOf('year').format("YYYYMMDD"))
        .filter(t =>
          this.view === "today"
            ? t.datef >= moment().format("YYYYMMDD")
            : t.datef >= `${year}0101`
        )
        .map(t => {
          return {
            ...t,
            year: moment(t.datef, "YYYYMMDD").format("YYYY"),
            month: moment(t.datef, "YYYYMMDD").format("MM"),
            ym: moment(t.datef, "YYYYMMDD").format("YYYYMM")
          };
        });
      return treasuryData;
    },
    monthlySummaryForPivot() {
      return this.monthlySummary.map(s => {
        return {
          ...s,
          project_name:
            s.project_name !== "-" && s.project_name !== ""
              ? s.project_name
              : s.type,
          total_incomes: s.total_amount > 0 ? s.total_amount : 0,
          total_expenses: s.total_amount < 0 ? s.total_amount : 0
        };
      });
    },
    monthlySummaryForPivot2() {
      return this.monthlySummary2.map(s => {
        return {
          ...s,
          project_name:
            s.project_name !== "-" && s.project_name !== ""
              ? s.project_name
              : s.type,
          total_incomes: s.total_amount > 0 ? s.total_amount : 0,
          total_expenses: s.total_amount < 0 ? s.total_amount : 0
        };
      });
    },
    monthlySummaryTotal() {
      const ans = _(this.monthlySummary)
        .groupBy("ym")
        .map((ym, id) => {
          return {
            ym: id,
            year: !isNaN(id) ? id.substring(0, 4) : "2099",
            month: !isNaN(id) ? id.substring(4, 6) : "99",
            valid: !isNaN(id),
            maxYm: _.maxBy(this.monthlySummary, e => (!isNaN(e.ym) ? e.ym : ""))
              .ym,
            total_amount: _.sumBy(ym, "total_amount"),
            total_incomes: _.sumBy(ym, e =>
              e.total_amount > 0 ? e.total_amount : 0
            ),
            total_expenses: _.sumBy(ym, e =>
              e.total_amount < 0 ? e.total_amount : 0
            ),
            // The economic forecast (prevista) is derived per year from the
            // project plan (project_phases + prevista periodification) and
            // nómines by the backend, so it is only meaningful on year-total
            // rows. Per-month forecast_* is left at 0.
            forecast_incomes: 0,
            forecast_expenses: 0,
            forecast_amount: 0,
            subtotal: this.todaySubTotal
          };
        })
        .value();

      const ansWithSubtotal = [];
      var subtotal = this.todaySubTotal;
      for (var i = 0; i < ans.length; i++) {
        subtotal = subtotal + ans[i].total_amount;
        ans[i]["subtotal"] = subtotal;
        ansWithSubtotal.push(ans[i]);
        if (ans[i].month === "12") {
          const y = ans[i].year;
          const yearValues = ansWithSubtotal.filter(a => a.year === y);
          // Forecast (prevista) for the year, from the project plan:
          //   incomes = planned income lines + prevista periodification
          //   expenses = base ("factures") + VAT prorrata + nómines totals
          //             + prevista periodification
          // Expenses are negated so the result is displayed with the same
          // (negative) sign convention as the rest of the table.
          const fy = this.forecastByYear[y] || {};
          const forecast_incomes = fy.forecast_incomes || 0;
          const forecast_expenses = -(
            (fy.forecast_expenses || 0) +
            (fy.forecast_expenses_vat || 0) +
            (this.forecastPayrollsByYear[y] || 0)
          );
          const yearSummary = {
            ym: `${y}00`,
            year: y,
            month: "00",
            valid: true,
            maxYm: ans[i].maxYm,
            total_amount: _.sumBy(yearValues, "total_amount"),
            total_incomes: _.sumBy(yearValues, "total_incomes"),
            total_expenses: _.sumBy(yearValues, "total_expenses"),
            forecast_incomes,
            forecast_expenses,
            forecast_amount: forecast_incomes + forecast_expenses,
            subtotal: ans[i].subtotal
          };
          ansWithSubtotal.push(yearSummary);
        }
      }

      return ansWithSubtotal;
    },
    monthlySummaryTotal2() {
      const ans = _(this.monthlySummary2)
        .groupBy("ym")
        .map((ym, id) => ({
          ym: id,
          year: !isNaN(id) ? id.substring(0, 4) : "2099",
          month: !isNaN(id) ? id.substring(4, 6) : "99",
          valid: !isNaN(id),
          maxYm: _.maxBy(this.monthlySummary, e => (!isNaN(e.ym) ? e.ym : ""))
            .ym,
          total_amount: _.sumBy(ym, "total_amount"),
          total_incomes: _.sumBy(ym, e =>
            e.total_amount > 0 ? e.total_amount : 0
          ),
          total_expenses: _.sumBy(ym, e =>
            e.total_amount < 0 ? e.total_amount : 0
          ),
          subtotal: this.todaySubTotal2
        }))
        .value();

      const ansWithSubtotal = [];
      var subtotal = this.todaySubTotal2;
      for (var i = 0; i < ans.length; i++) {
        subtotal = subtotal + ans[i].total_amount;
        ans[i]["subtotal"] = subtotal;
        ansWithSubtotal.push(ans[i]);
        if (ans[i].month === "12") {
          const y = ans[i].year;
          const yearValues = ansWithSubtotal.filter(a => a.year === y);
          const yearSummary = {
            ym: `${y}00`,
            year: y,
            month: "00",
            valid: true,
            maxYm: ans[i].maxYm,
            total_amount: _.sumBy(yearValues, "total_amount"),
            total_incomes: _.sumBy(yearValues, "total_incomes"),
            total_expenses: _.sumBy(yearValues, "total_expenses"),
            subtotal: ans[i].subtotal
          };
          ansWithSubtotal.push(yearSummary);
        }
      }

      return ansWithSubtotal;
    },
    todaySubTotal() {
      const today =
        this.view === "today"
          ? this.treasuryData.find(t => t.type === "Avui")
          : this.treasuryData.find(t => t.type === "Inici Any");
      return today ? today.subtotal : 0;
    },
    todaySubTotal2() {
      const today =
        this.view === "today"
          ? this.treasuryData2.find(t => t.type === "Avui")
          : this.treasuryData2.find(t => t.type === "Inici Any");
      return today ? today.subtotal : 0;
    },
    treasuryDataDesc() {
      return _.reverse(this.treasuryData);
    },
    treasuryDataDesc2() {
      return _.reverse(this.treasuryData2);
    },
    yearlyForecast() {
      return this.pivotData.filter(d => d.month == "00");
    },
    // one entry per year: incomes and the expenses split into invoices and
    // expenses, non-deductible VAT and payroll (negative), as in yearlySummary
    yearRows() {
      return this.yearlyForecast.map(d => {
        const fy = this.forecastByYear[d.year] || {};
        const invoices = -(fy.forecast_expenses || 0);
        const vat = -(fy.forecast_expenses_vat || 0);
        const payroll = -(this.forecastPayrollsByYear[d.year] || 0);
        return {
          year: d.year,
          incomes: d.forecast_incomes,
          expenses: d.forecast_expenses,
          invoices,
          vat,
          payroll,
          result: d.forecast_amount,
          // forecast incomes over forecast expenses, like the rows above; it
          // was the treasury's collections over payments (13.973 %, issues/074)
          coverage: d.forecast_expenses ? (d.forecast_incomes / d.forecast_expenses) * -100 : null
        };
      });
    },
    total() {
      const sum = key => this.yearRows.reduce((acc, y) => acc + (Number(y[key]) || 0), 0);
      return {
        incomes: sum("incomes"),
        expenses: sum("expenses"),
        invoices: sum("invoices"),
        vat: sum("vat"),
        payroll: sum("payroll"),
        result: sum("result")
      };
    },
    parts() {
      return [
        { key: "payroll", label: "Nòmines", css: "c-pay" },
        { key: "invoices", label: "Factures i despeses dels projectes", css: "c-exp" },
        { key: "vat", label: "IVA no deduïble", css: "c-vat" }
      ];
    },
    // payroll forecast that stops before the last year with expenses
    payrollGap() {
      const withPayroll = this.yearRows.filter(y => y.payroll < 0).map(y => Number(y.year));
      if (!withPayroll.length) return null;
      const last = Math.max(...withPayroll);
      const later = this.yearRows.filter(y => Number(y.year) > last && y.expenses < 0);
      return later.length ? { last, from: last + 1 } : null;
    },
    chartMax() {
      return Math.max(1, ...this.yearRows.map(y => Math.max(y.incomes, -y.expenses)));
    },
    periodOptions() {
      return [
        { value: "no", label: "No" },
        { value: "prevista", label: "Prevista" },
        { value: "real", label: "Real" }
      ];
    },
    // yearlyForecast2() {
    //   return this.pivotData2.filter(d => d.month == "00");
    // }
  },
  watch: {
    periodificacio() {
      this.filtersChanged = true;
    }
  },
  methods: {
    money(value, decimals = 2) {
      return formatNumber(Number(value) || 0, decimals, decimals) + " €";
    },
    percent(share) {
      return formatNumber((Number(share) || 0) * 100, 1) + " %";
    },
    sign,
    h(amount) {
      return Math.max(0, (Number(amount) || 0) / this.chartMax * 100) + "%";
    },
    async onStateChanged() {
      console.log("onStateChanged");
    },
    async getInitialData() {
      this.isLoading = true;

      let filter = "";
      if (this.$route.query.filter) {
        filter = this.$route.query.filter;
      }
      const year = this.$route.query.year
        ? this.$route.query.year
        : moment().format("YYYY");

      this.projectStates = await service({ requiresAuth: true, cached: true })
        .get("project-states")
        .then(r => {
          return r.data;
        });

      if (localStorage.getItem("PrevisioTable.selectedProjectStates")) {
        this.selectedProjectStates = JSON.parse(
          localStorage.getItem("PrevisioTable.selectedProjectStates")
        );
      } else {
        this.selectedProjectStates = this.projectStates.map(s => s.id);
      }

      this.projectTypes = await service({ requiresAuth: true, cached: true })
        .get("project-types")
        .then(r => {
          return r.data;
        });

      this.projectLikelihoods = await service({ requiresAuth: true, cached: true })
        .get("project-likelihoods")
        .then(r => {
          return r.data;
        });

      // Default: every value + the "Sense" (null) bucket selected, so the
      // page starts showing everything. project_state is mandatory, so it
      // has no "Sense" bucket.
      // `parseSelection` normalises a possibly-stale/polluted localStorage
      // entry into a clean array of valid ids (objects reduced to their id,
      // unknown ids dropped, duplicates removed) plus an optional null entry
      // for the "Sense" bucket.
      const validTypeIds = this.projectTypes.map(t => t.id);
      const parseTypes = stored =>
        !Array.isArray(stored) || stored.length === 0
          ? [...validTypeIds, null]
          : Array.from(
              new Set(
                stored
                  .map(x => (x === null ? null : x && x.id ? x.id : x))
                  .filter(x => x === null || validTypeIds.includes(x))
              )
            );
      // this.selectedProjectTypes = parseTypes(
      //   JSON.parse(localStorage.getItem("PrevisioTable.selectedProjectTypes") || "null")
      // );
      // all temporary
      this.selectedProjectTypes = null

      const validLikelihoodIds = this.projectLikelihoods.map(l => l.id);
      const parseLikelihoods = stored =>
        !Array.isArray(stored) || stored.length === 0
          ? [...validLikelihoodIds, null]
          : Array.from(
              new Set(
                stored
                  .map(x => (x === null ? null : x && x.id ? x.id : x))
                  .filter(x => x === null || validLikelihoodIds.includes(x))
              )
            );
      this.selectedProjectLikelihoods = parseLikelihoods(
        JSON.parse(localStorage.getItem("PrevisioTable.selectedProjectLikelihoods") || "null")
      );

      // Persist the cleaned selection so we don't re-read the polluted entry.
      localStorage.setItem(
        "PrevisioTable.selectedProjectTypes",
        JSON.stringify(this.selectedProjectTypes)
      );
      localStorage.setItem(
        "PrevisioTable.selectedProjectLikelihoods",
        JSON.stringify(this.selectedProjectLikelihoods)
      );

      this.getData();
    },
    async getData() {

      const year = this.$route.query.year
        ? this.$route.query.year
        : moment().format("YYYY");
        
      this.isLoading = true;

      const treasuryData = await getTreasuryData(
        this.selectedProjectStates,
        year,
        null,
        this.periodificacio,
        this.selectedProjectTypes,
        this.selectedProjectLikelihoods
      );
      this.treasuryData = treasuryData.treasury.map(d => {
        return { ...d, executat: d.paid ? "SÍ" : "NO" };
      });
      this.projects = treasuryData.projects;
      this.forecastByYear = treasuryData.forecast_by_year || {};
      this.forecastPayrollsByYear = treasuryData.forecast_payrolls_by_year || {};
      this.pivotData = Object.freeze(this.monthlySummaryTotal);
      this.filtersChanged = false;

      // const treasuryData2 = await getTreasuryData("approved", year);
      // this.treasuryData2 = treasuryData2.treasury.map(d => {
      //   return { ...d, executat: d.paid ? "SÍ" : "NO" };
      // });

      // this.pivotData2 = Object.freeze(this.monthlySummaryTotal2);

      this.isLoading = false;
    },
    formatPrice(value) {
      const val = (value / 1).toFixed(2).replace(".", ",");
      return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    },
    formatDate(value) {
      return moment(value, "YYYY-MM-DD").format("DD-MM-YYYY");
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
        "PrevisioTable.selectedProjectStates",
        JSON.stringify(this.selectedProjectStates)
      );
      this.filtersChanged = true;
    },
    toggleType(type) {
      // `type` is a project-type object from the value buttons, or null from
      // the "Sense tipus" button. Normalise to the stored value: id, or null.
      const value = type === null ? null : type.id;
      if (this.selectedProjectTypes.includes(value)) {
        this.selectedProjectTypes = this.selectedProjectTypes.filter(
          t => t !== value
        );
      } else {
        this.selectedProjectTypes.push(value);
      }
      localStorage.setItem(
        "PrevisioTable.selectedProjectTypes",
        JSON.stringify(this.selectedProjectTypes)
      );
    },
    toggleLikelihood(likelihood) {
      // `likelihood` is a project-likelihood object, or null from the
      // "Sense probabilitat" button.
      const value = likelihood === null ? null : likelihood.id;
      if (this.selectedProjectLikelihoods.includes(value)) {
        this.selectedProjectLikelihoods = this.selectedProjectLikelihoods.filter(
          l => l !== value
        );
      } else {
        this.selectedProjectLikelihoods.push(value);
      }
      localStorage.setItem(
        "PrevisioTable.selectedProjectLikelihoods",
        JSON.stringify(this.selectedProjectLikelihoods)
      );
      this.filtersChanged = true;
    },
    
  }
};
</script>
<style>
.treasury-table.b-table .table th,
.treasury-table.b-table td {
  min-width: 150px;
}
</style>
<style scoped>
.seg-label {
  align-self: center;
  padding: 0 .5rem;
}
.report-box {
  background: var(--a-surface);
  border: 1px solid var(--a-line);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 1rem;
}
.report-box-head {
  padding: .875rem 1.25rem;
  border-bottom: 1px solid var(--a-line);
}
.report-box-head h2 {
  font-size: 1rem;
  font-weight: 800;
}
.report-box-head span {
  font-size: .8125rem;
}
.chart-legend {
  display: flex;
  flex-wrap: wrap;
  gap: .375rem 1.25rem;
  padding: .875rem 1.25rem 0;
  font-size: .8125rem;
  color: var(--a-fg-2);
}
.chart-legend span {
  display: inline-flex;
  align-items: center;
  gap: .375rem;
}
.chart-legend i,
.dot {
  display: inline-block;
  width: .75rem;
  height: .75rem;
  border-radius: 3px;
}
.dot {
  margin-right: .5rem;
  vertical-align: -1px;
}
.c-inc { background: #7CC4B5; }
.c-pay { background: #8A3A12; }
.c-exp { background: #DB7A3B; }
.c-vat { background: #F2C7A3; }
.year-chart {
  display: flex;
  gap: 1rem;
  height: 18rem;
  padding: 1rem 1.25rem 1rem;
  overflow-x: auto;
}
.year-col {
  flex: 1 0 6rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: .25rem;
  font-variant-numeric: tabular-nums;
}
.year-result {
  font-size: .75rem;
  font-weight: 800;
  white-space: nowrap;
}
.year-bars {
  flex: 1;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: .375rem;
  border-bottom: 1px solid var(--a-line);
}
.bar {
  width: 2.75rem;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}
.bar i {
  display: block;
  width: 100%;
}
.bar i:first-child {
  border-radius: 3px 3px 0 0;
}
.year-col small {
  font-size: .6875rem;
}
.table-wrap {
  overflow-x: auto;
}
.forecast-table {
  font-variant-numeric: tabular-nums;
  font-size: .875rem;
}
.forecast-table th:first-child {
  padding-left: 1.25rem;
  min-width: 15rem;
}
.forecast-table td:last-child,
.forecast-table th:last-child {
  padding-right: 1.25rem;
}
.forecast-table td {
  white-space: nowrap;
}
.forecast-table tr.is-group > * {
  background: var(--a-thead);
  font-weight: 800;
}
.forecast-table tr.is-sub th {
  padding-left: 2rem;
  font-weight: 600;
}
.forecast-table tr.is-quiet > * {
  color: var(--a-muted);
  font-weight: 600;
}
.report-note {
  padding: .75rem 1.25rem .875rem;
  font-size: .8125rem;
  color: var(--a-muted);
  border-top: 1px solid var(--a-line-soft);
}
</style>
