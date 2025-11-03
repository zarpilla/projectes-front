<template>
  <div>
    <modal-box-invoicing
      :is-active="isModalActive"
      :invoicing-object="trashObject"
      @submit="modalSubmit"
      @cancel="modalCancel"
    />

    <div class="is-flex">
      
      <button class="button mr-3" v-for="year in years" :key="year.year" @click="goToYear(year.year)"
      :class="{ 'is-primary': selectedYear == year.year, 'is-outlined': selectedYear != year.year }"
      >
      {{ year.year }}
      </button>

      <download-excel
        class="export view-button ml-auto"
        :data="treasuryDataDesc"
        v-if="treasuryDataDesc && treasuryDataDesc.length"        
        name="tresoreria"
        :fields="{
          data: 'datex',          
          import: {
            field: 'total_amount',
            callback: (value) => {
              return excelFormat(value);
            },
          },
          saldo: {
            field: 'subtotal',
            callback: (value) => {
              return excelFormat(value);
            },
          },
          moviment: 'type',
          concepte: 'concept',
          projecte: 'project_name',        
          nomina: 'contact',
          pagat: 'paid'
        }"
        >
        <b-button
          title="Exporta dades"
          class="zview-button"
          :type="'is-disabled'"
          icon-left="file-excel"
        />
      </download-excel>
    </div>

    <div class="is-flex mt-2">
      <button class="button mr-3" v-for="state in projectStates" :key="state.id" @click="toggleState(state)"
      :class="{ 'is-primary': selectedProjectStates.includes(state.id), 'is-outlined': !selectedProjectStates.includes(state.id) }">
      {{ state.name }}
      </button>
    </div>

    <!-- <pre>{{ treasuryData }}</pre> -->

    <b-loading
      :is-full-page="true"
      v-model="isLoading"
      :can-cancel="false"
    ></b-loading>

    <card-component
      title="PREVISIÓ DE TRESORERIA"
      class="ztile is-child mt-2"
      header-icon="view-column"
      @header-icon-click="toogleView"
    >
      <section class="section">
        <div class="b-table treasury-table">
          <div
            class="
              table-wrapper
              has-mobile-cards has-sticky-header
              table-container
            "
          >
            <table class="table">
              <thead>
                <th></th>
                <th class="has-text-right">
                  <div class="zth-wrap has-text-right">
                    <span class="is-relative" v-if="view === 'today'">
                      Avui
                    </span>
                    <span class="is-relative" v-else> Inici Any </span>
                  </div>
                </th>
                <th
                  class="has-text-right"
                  v-for="(column, i) in pivotData"
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
                      <b-icon
                        class="has-text-danger"
                        icon="star"
                        size="is-small"
                      >
                      </b-icon>
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
                  <td class="has-text-weight-bold">Cobraments</td>
                  <td class="has-text-right"></td>
                  <td
                    class="has-text-right"
                    v-for="(data, i) in pivotData"
                    :key="i"
                  >
                    {{ formatPrice(data.total_incomes) }} €
                  </td>
                </tr>
                <tr>
                  <td class="has-text-weight-bold">Pagaments</td>
                  <td class="has-text-right"></td>
                  <td
                    class="has-text-right"
                    v-for="(data, i) in pivotData"
                    :key="i"
                  >
                    {{ formatPrice(data.total_expenses) }} €
                  </td>
                </tr>
                <tr>
                  <td class="has-text-weight-bold">Resultat</td>
                  <td class="has-text-right"></td>
                  <td
                    class="has-text-right"
                    v-for="(data, i) in pivotData"
                    :key="i"
                  >
                    {{ formatPrice(data.total_amount) }} €
                  </td>
                </tr>
                <tr>
                  <td class="has-text-weight-bold">Saldo</td>
                  <td class="has-text-right">
                    {{ formatPrice(todaySubTotal) }}€
                  </td>
                  <td
                    class="has-text-right has-text-weight-bold"
                    v-for="(data, i) in pivotData"
                    :key="i"
                  >
                    {{ formatPrice(data.subtotal) }} €
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </card-component>

    <card-component title="PER PROJECTE" class="ztile is-child mt-2">
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
      
      <div id="project-stats"></div>
    </card-component>

    <card-component title="OPERACIONS DE TRESORERIA" class="ztile is-child mt-2">
      <section class="section">
        <treasury-annotation-input
          :projects="projects"
          @annotation="getData"
        ></treasury-annotation-input>
      </section>
    </card-component>

    <card-component title="MOVIMENTS BANCARIS" class="ztile is-child mt-2">
      <section class="section">
        <b-table
          :loading="isLoading"
          :paginated="false"
          :striped="false"
          :data="treasuryDataDesc"
          :row-class="
            (row, index) =>
              (row.subtotal < 0 && 'has-text-danger has-text-bold') ||
              (row.type == 'Avui' && 'has-text-info')
          "
        >
          <b-table-column label="Data" field="datex" v-slot="props">
            {{ props.row.datex }}
            <b-icon
              v-if="props.row.date_error"
              class="has-text-danger"
              icon="alert-circle"
              title="No hi ha data"
              size="is-small"
            >
            </b-icon>
          </b-table-column>
          <b-table-column label="Import" field="total_amount" v-slot="props">
            {{ formatPrice(props.row.total_amount) }} €
          </b-table-column>
          <b-table-column label="Saldo" field="subtotal" v-slot="props">
            {{ formatPrice(props.row.subtotal) }} €
          </b-table-column>
          <b-table-column label="Moviment" field="type" v-slot="props">
            <span
              :class="props.row.paid ? 'has-text-success' : 'zhas-text-success'"
            >
              {{ props.row.type }}
            </span>
          </b-table-column>
          <b-table-column label="Concepte" field="concept" v-slot="props">
            <router-link v-if="props.row.to" :to="props.row.to">
              <span class="project-name has-text-info">
                {{ props.row.concept }}
              </span>
            </router-link>
            <span v-else>{{ props.row.concept }}</span>
          </b-table-column>
          <b-table-column label="Projecte" field="project_name" v-slot="props">
            <router-link
              :to="{
                name: 'project.edit',
                params: { id: props.row.project_id },
              }"
            >
              <span class="project-name has-text-info">
                {{ props.row.project_name }}
              </span>
            </router-link>
          </b-table-column>
          <b-table-column label="Contacte" field="contact" v-slot="props">
            {{ props.row.contact }}
          </b-table-column>
          <b-table-column label="Accions" v-slot="props">
            <!-- <button
              v-if="props.row.expenseId"
              class="button is-small is-danger"
              type="button"
              @click.prevent="trashModal(props.row)"
              title="Marcar com a pagat"
            >
              <b-icon icon="cash-multiple" size="is-small" />
            </button>
            <button
              v-if="props.row.incomeId"
              class="button is-small is-danger"
              type="button"
              @click.prevent="trashModal(props.row)"
              title="Marcar com a pagat"
            >
              <b-icon icon="cash-multiple" size="is-small" />
            </button> -->
            <button
              v-if="props.row.type === 'Operació de tresoreria'"
              class="button is-small is-danger"
              type="button"
              @click.prevent="trashManual(props.row.treasury_id)"
              title="Eliminar"
            >
              <b-icon icon="delete" size="is-small" />
            </button>
          </b-table-column>
        </b-table>
      </section>
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
import { format } from "@/helpers/excelFormatter";
import PivotViews from '@/components/PivotViews.vue'
import pivotViewsMixin from '@/mixins/pivotViewsMixin.js'

export default {
  name: "Tresoreria",
  components: {
    ModalBoxInvoicing,
    CardComponent,
    MoneyFormat,
    TreasuryAnnotationInput,
    PivotViews,
  },
  mixins: [pivotViewsMixin],
  props: {
    titleStack: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      isLoading: false,
      years: [],
      projects: [],
      treasury: [],
      treasuryData: [],
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
      vat_expected: { paid: 0, received: 0 },
      me: null,
      payingVat: false,
      view: "startOfYear",
      projectStates: [],
      selectedProjectStates: [],
      selectedYear: null,
      pivotIdentifier: 'tresoreria-pivot'
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
    ...mapState(["userName", "user"]),
    monthlySummary() {

      const year = this.$route.query.year ? this.$route.query.year : moment().format('YYYY')

      this.selectedYear = year

      // const fn = (t) => { return this.view === 'today' ? t.datef >= t.datef >= moment().format("YYYYMMDD") : t.datef >= moment().startOf('year').format("YYYYMMDD") }
      const treasuryData = this.treasuryData
        // .filter((t) => t.datef >= moment().startOf('year').format("YYYYMMDD"))
        .filter((t) =>
          this.view === "today"
            ? t.datef >= moment().format("YYYYMMDD")
            : t.datef >= `${year}0101`
        )
        .map((t) => {
          return {
            ...t,
            year: moment(t.datef, "YYYYMMDD").format("YYYY"),
            month: moment(t.datef, "YYYYMMDD").format("MM"),
            ym: moment(t.datef, "YYYYMMDD").format("YYYYMM"),
          };
        });
      return treasuryData;
    },
    monthlySummaryForPivot() {
      return this.monthlySummary.map((s) => {
        return {
          ...s,
          project_name:
            s.project_name !== "-" && s.project_name !== ""
              ? s.project_name
              : s.type,
          total_incomes: s.total_amount > 0 ? s.total_amount : 0,
          total_expenses: s.total_amount < 0 ? s.total_amount : 0,
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
          maxYm: _.maxBy(this.monthlySummary, (e) => (!isNaN(e.ym) ? e.ym : ""))
            .ym,
          total_amount: _.sumBy(ym, "total_amount"),
          total_incomes: _.sumBy(ym, (e) =>
            e.total_amount > 0 ? e.total_amount : 0
          ),
          total_expenses: _.sumBy(ym, (e) =>
            e.total_amount < 0 ? e.total_amount : 0
          ),
          subtotal: this.todaySubTotal,
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
          const yearValues = ansWithSubtotal.filter((a) => a.year === y);
          const yearSummary = {
            ym: `${y}00`,
            year: y,
            month: "00",
            valid: true,
            maxYm: ans[i].maxYm,
            total_amount: _.sumBy(yearValues, "total_amount"),
            total_incomes: _.sumBy(yearValues, "total_incomes"),
            total_expenses: _.sumBy(yearValues, "total_expenses"),
            subtotal: ans[i].subtotal,
          };
          ansWithSubtotal.push(yearSummary);
        }
      }

      return ansWithSubtotal;
    },
    todaySubTotal() {
      const today =
        this.view === "today"
          ? this.treasuryData.find((t) => t.type === "Avui")
          : this.treasuryData.find((t) => t.type === "Inici Any");
      return today ? today.subtotal : 0;
    },
    treasuryDataDesc() {
      //return _.reverse(this.treasuryData)
      const treasuryDataOfYear = this.treasuryData.filter(d => moment(d.datex, 'dd-MM-YYYY').year() == this.selectedYear)
      return _.reverse(treasuryDataOfYear)
    }
  },
  methods: {
    async getData() {
      this.isLoading = true;
      const year = this.$route.query.year ? this.$route.query.year : moment().format('YYYY')      
      this.selectedYear = year
      const treasuryData = await getTreasuryData(this.selectedProjectStates, this.selectedYear);      
      this.vat = treasuryData.vat;
      this.vat_expected = treasuryData.vat_expected;
      this.treasuryData = treasuryData.treasury.map(d => { return { ...d, executat: d.paid ? 'SÍ' : 'NO' }});
      this.projects = treasuryData.projects;
      this.pivotData = Object.freeze(this.monthlySummaryTotal);
      this.pivotData2 = Object.freeze(this.monthlySummaryForPivot);

      configPivot.dataSource.data = this.pivotData2;
      this.initializePivotWithViews("#project-stats", configPivot);
      this.isLoading = false;
    },
    async getInitialData() {
      this.isLoading = true;

      this.contacts = (
        await service({ requiresAuth: true }).get(
          "contacts/basic?_limit=-1&_sort=name:ASC"
        )
      ).data;

      this.me = (
        await service({ requiresAuth: true }).get(
          "me"
        )
      ).data;

      let filter = "";
      if (this.$route.query.filter) {
        filter = this.$route.query.filter;
      }

      this.years = await service({ requiresAuth: true, cached: true }).get("years?_sort=year:DESC").then((r) => r.data);

      this.projectStates = await service({ requiresAuth: true, cached: true }).get("project-states").then((r) => r.data);

      if (localStorage.getItem('TresoreriaTable.selectedProjectStates')) {
        this.selectedProjectStates = JSON.parse(localStorage.getItem('TresoreriaTable.selectedProjectStates'));
      } else {
        this.selectedProjectStates = this.projectStates.map((s) => s.id);
      }

      this.getData();
    },
    formatPrice(value) {
      const val = (value / 1).toFixed(2).replace(".", ",");
      return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    },
    formatDate(value) {
      return moment(value, "YYYY-MM-DD").format("DD-MM-YYYY");
    },
    async trashManual(treasuryId) {
      this.$buefy.dialog.confirm({
        message: "Estàs segura d'eliminar l'entrada?",
        onConfirm: async () => {
          await this.submitDeleteManual(treasuryId);
        },
        onCancel: () => {
          return false;
        },
      });
    },
    async submitDeleteManual(treasuryId) {
      await service({ requiresAuth: true }).delete(`treasuries/${treasuryId}`);

      this.$buefy.snackbar.open({
        message: "Eliminada",
        queue: false,
      });

      this.getData();
    },
    trashModal(trashObject) {
      // console.log('trashObject', trashObject)

      const invoicingObject = {
        origin: "treasury",
        ...trashObject,
        type: trashObject.expenseId ? "expenses" : "incomes",
        emitted_invoices: this.emitted.filter(
          (i) => i.project && i.project.id === trashObject.project_id
        ),
        received_invoices: this.received.filter(
          (i) => i.project && i.project.id === trashObject.project_id
        ),
        diets: this.diets.filter(
          (i) => i.project && i.project.id === trashObject.project_id
        ),
        tickets: this.tickets.filter(
          (i) => i.project && i.project.id === trashObject.project_id
        ),
        grants: trashObject.expenseId
          ? this.receivedGrants.filter(
              (i) => i.project && i.project.id === trashObject.project_id
            )
          : this.emittedGrants.filter(
              (i) => i.project && i.project.id === trashObject.project_id
            ),
        contacts: this.contacts,
      };

      // console.log("invoicingObject", invoicingObject);

      // this.invoicingObject = {
      //   type,
      //   phase,
      //   subphase,
      //   i,
      //   j,
      //   emitted_invoices: this.form.emitted_invoices,
      //   received_invoices: this.form.received_invoices,
      //   diets: this.form.diets,
      //   tickets: this.form.tickets
      // }
      this.trashObject = invoicingObject;
      this.isModalActive = true;
    },
    async modalSubmit(invoicing) {
      this.isModalActive = false;
      if (this.trashObject.expenseId) {
        await service({ requiresAuth: true }).put(
          `projects/${this.trashObject.project_id}/pay-expense/${this.trashObject.expenseId}`,
          invoicing
        );
      } else if (this.trashObject.incomeId) {
        await service({ requiresAuth: true }).put(
          `projects/${this.trashObject.project_id}/pay-income/${this.trashObject.incomeId}`,
          invoicing
        );
      }
      // await service({ requiresAuth: true }).delete(`projects/${this.trashObject.id}`)
      // this.projectsData = this.projectsData.filter(p => p.id !== this.trashObject.id)
      this.$buefy.snackbar.open({
        message: "Fet",
        queue: false,
      });
      this.getData();
    },
    modalCancel() {
      this.isModalActive = false;
    },
    async payVat() {
      this.payingVat = true;
      await service({ requiresAuth: true }).post(`emitted-invoices/pay-vat`);
      this.payingVat = false;
      window.location.reload();
    },
    toogleView() {
      this.view = this.view === "today" ? "startOfYear" : "today";
      this.getData();
    },
    goToYear(year) {
      this.$router.push({ query: { year } });
      this.getData();
    },
    toggleState(state) {
      if (this.selectedProjectStates.includes(state.id)) {
        this.selectedProjectStates = this.selectedProjectStates.filter(
          (s) => s !== state.id
        );
      } else {
        this.selectedProjectStates.push(state.id);
      }    
      localStorage.setItem('TresoreriaTable.selectedProjectStates', JSON.stringify(this.selectedProjectStates))

      this.getData();
    },
    excelFormat(value) {
      return format(this.user, value);
    },
    applyDefaultView() {
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
  },
};
</script>
<style>
.treasury-table.b-table .table th,
.treasury-table.b-table td {
  min-width: 150px;
}
</style>