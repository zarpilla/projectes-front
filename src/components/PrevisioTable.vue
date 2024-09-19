<template>
  <div>
    <!-- <pre>{{ monthlySummaryForPivot }}</pre> -->

    <b-loading
      :is-full-page="true"
      v-model="isLoading"
      :can-cancel="false"
    ></b-loading>

    <b-field horizontal label="Estat projecte">
      <div class="is-flex mt-2">
        <button class="button mr-3" v-for="state in projectStates" :key="state.id" @click="toggleState(state)"
        :class="{ 'is-primary': selectedProjectStates.includes(state.id), 'is-white': !selectedProjectStates.includes(state.id) }">
        {{ state.name }}
        </button>
      </div>
    </b-field>

    <card-component
      title="RESUM PREVISIÓ"
      class="ztile is-child mt-2"
    >
      <section class="section">
        <div class="b-table ztreasury-table">
          <div
            class="
              table-wrapper
              has-mobile-cards 
              zhas-sticky-header
              table-container
            "
          >
            <table class="table">
              <thead>
                <th></th>
                <th
                  class="has-text-right"
                  v-for="(column, i) in yearlyForecast"
                  :key="i"
                >
                  <div class="zth-wrap has-text-right">
                    <span
                      class="is-relative"
                      v-if="column.month !== '00' && column.month !== '99'"
                    >
                      {{ column.month }} / {{ column.year }}
                    </span>
                    <span class="is-relative" v-if="column.month == '00'">
                      TOTAL {{ column.year }}
                      <!-- <b-icon
                        class="has-text-danger"
                        icon="star"
                        size="is-small"
                      >
                      </b-icon> -->
                    </span>
                    <span class="is-relative" v-if="column.month == '99'">
                      SENSE DATA
                      <b-icon
                        class="has-text-danger"
                        icon="alert-circle"
                        size="is-small"
                      >
                      </b-icon>
                    </span>
                  </div>
                </th>
              </thead>
              <tbody>

                <tr>
                  <td class="has-text-weight-bold">
                    <h6 class="subtitle has-text-weight-bold">
                      Projectes: 
                      <span>{{ selectedProjectStatesNames }}</span>
                    </h6>
                  </td>
                  <td
                    class="has-text-right"
                    v-for="(data, i) in yearlyForecast2"
                    :key="i"
                  >
                  <span v-if="data.total_expenses" class="has-text-weight-bold">{{ formatPrice(data.total_incomes / data.total_expenses * -100) }} %</span>
                </td>
                </tr>
                <!-- <tr>
                  <td class="has-text-weight-bold">Cobraments</td>
                  <td
                    class="has-text-right"
                    v-for="(data, i) in yearlyForecast2"
                    :key="i"
                  >
                    {{ formatPrice(data.total_incomes) }} €
                  </td>
                </tr>
                <tr>
                  <td class="has-text-weight-bold">Pagaments</td>
                  <td
                    class="has-text-right"
                    v-for="(data, i) in yearlyForecast2"
                    :key="i"
                  >
                    {{ formatPrice(data.total_expenses) }} €
                  </td>
                </tr>
                <tr>
                  <td class="has-text-weight-bold">Resultat</td>
                  <td
                    class="has-text-right"
                    v-for="(data, i) in yearlyForecast2"
                    :key="i"
                  >
                    {{ formatPrice(data.total_amount) }} €
                  </td>
                </tr> -->

                <tr>
                  <td class="has-text-weight-bold"><h6 class="subtitle has-text-weight-bold">Tots</h6></td>
                  <td
                    class="has-text-right"
                    v-for="(data, i) in yearlyForecast"
                    :key="i"
                  >
                  <span v-if="data.total_expenses" class="has-text-weight-bold">{{ formatPrice(data.total_incomes / data.total_expenses * -100) }} %</span>                
                </td>
                </tr>
                <tr>
                  <td class="has-text-weight-bold">Cobraments</td>
                  <td
                    class="has-text-right"
                    v-for="(data, i) in yearlyForecast"
                    :key="i"
                  >
                    {{ formatPrice(data.total_incomes) }} €
                  </td>
                </tr>
                <tr>
                  <td class="has-text-weight-bold">Pagaments</td>
                  <td
                    class="has-text-right"
                    v-for="(data, i) in yearlyForecast"
                    :key="i"
                  >
                    {{ formatPrice(data.total_expenses) }} €
                  </td>
                </tr>
                <tr>
                  <td class="has-text-weight-bold">Resultat</td>
                  <td
                    class="has-text-right"
                    v-for="(data, i) in yearlyForecast"
                    :key="i"
                  >
                    {{ formatPrice(data.total_amount) }} €
                  </td>
                </tr>

                
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </card-component>

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
// import ModalBox from '@/components/ModalBox'
import service from "@/service/index";
import moment from "moment";
import sortBy from "lodash/sortBy";
import _ from "lodash";
import configPivot from "@/service/configStatsTreasury";
import ModalBoxInvoicing from "./ModalBoxInvoicing.vue";
import CardComponent from "./CardComponent.vue";
import { mapState } from "vuex";
import MoneyFormat from "@/components/MoneyFormat.vue";
import TreasuryAnnotationInput from "@/components/TreasuryAnnotationInput.vue";
import { addScript, addStyle } from "@/helpers/addScript";
import getTreasuryData from "@/service/treasury";

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
    };
  },
  async mounted() {
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
          subtotal: this.todaySubTotal
        }))
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
    // yearlyForecast2() {
    //   return this.pivotData2.filter(d => d.month == "00");
    // }
  },
  methods: {
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

      this.getData();
    },
    async getData() {
      this.isLoading = true;

      const treasuryData = await getTreasuryData(this.selectedProjectStates);
      this.treasuryData = treasuryData.treasury.map(d => {
        return { ...d, executat: d.paid ? "SÍ" : "NO" };
      });
      this.projects = treasuryData.projects;
      this.pivotData = Object.freeze(this.monthlySummaryTotal);

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
      this.getData();
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
