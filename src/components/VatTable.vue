<template>
  <div>

    <b-loading
      :is-full-page="true"
      v-model="isLoading"
      :can-cancel="false"
    ></b-loading>

    <card-component
      title="IVA PENDENT DE SALDAR"
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
          <b-field label="EXECUTAT" grouped class="column">
          </b-field>
        </div>
        <div class="column">
          <b-field label="Suportat" grouped class="column">
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
          <b-field label="Repercutit" grouped class="column">
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
              {{ vat.deductible_vat_pct }}%
            </div>
          </b-field>
        </div>
        <div class="column">
          <b-field label="Saldo" grouped class="column">
            <money-format
              :value="vat.deductible_vat"
              :locale="'es'"
              :currency-code="'EUR'"
              :subunits-value="false"
              :hide-subunits="false"
            >
            </money-format>
          </b-field>
        </div>
        <div class="column">
          <b-field label="Saldar" class="column">
            <div>
            <b-datepicker
              v-model="vat_paid_date"
              placeholder="Data de pagament"
              icon="calendar-today"
            ></b-datepicker>          
            </br>
            <button
              class="button is-primary"
              @click="payVatIds"
              :disabled="(vat.paid - (vat.received * me.options.deductible_vat_pct / 100)) === 0 || payingVat || checkedRows.length === 0"
            >
              {{ payingVat ? "..." : "Saldar" }}
            </button>
            </div>
          </b-field>
        </div>
      </div>
      
      <div class="columns">
        <div class="column">
          <b-field label="PREVIST" grouped class="column">
          </b-field>
        </div>
        <div class="column">
          <b-field label="Suportat" grouped class="column">
            <div class="readonly subphase-detail-input">
              <money-format
                :value="vat_expected.paid"
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
          <b-field label="Repercutit" grouped class="column">
            <div class="readonly subphase-detail-input">
              <money-format
                :value="vat_expected.received"
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
                -1*(vat_expected.received - (vat_expected.paid * me.options.deductible_vat_pct / 100))
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
        </div>
      </div>
    </card-component>

    <card-component title="DOCUMENTS PENDENTS DE SALDAR" class="ztile is-child mt-2">
      <section class="section">
        <b-table
          :loading="isLoading"
          :paginated="false"
          :striped="true"
          :data="documentsWithSearchableFields"
          :checked-rows.sync="checkedRows"
          checkable="true"
          ref="documentsTable"
        >
          <b-table-column sortable searchable label="Codi" field="code" v-slot="props">
             <router-link :to="`/document/${props.row.id}/${props.row.type.replace('_', '-')}`">
            {{ props.row.code }}
            </router-link>            
          </b-table-column>
          <b-table-column sortable searchable label="Tipus" field="typeLabel" v-slot="props">            
            {{ props.row.typeLabel }}
          </b-table-column>
          
          
          <b-table-column sortable searchable label="Data emissió" field="date" v-slot="props">
            {{ props.row.date }}
          </b-table-column>
          <b-table-column sortable searchable label="Any" field="year" v-slot="props">
            {{ props.row.year }}
          </b-table-column>
          <b-table-column sortable searchable label="Trimestre" field="quarter" v-slot="props">
            {{ props.row.quarter }}
          </b-table-column>
          <b-table-column sortable searchable label="Import Base" numeric field="total" v-slot="props" class="has-text-right">
            {{ formatPrice(props.row.total) }} €
          </b-table-column>
          <b-table-column sortable searchable label="Import IVA" numeric field="total_vat" v-slot="props" class="has-text-right">
            {{ formatPrice(props.row.total_vat) }} €
          </b-table-column>
        </b-table>
        
        <div class="columns mt-4" v-if="filteredDocuments.length > 0">
          <div class="column is-offset-6">
            <b-field label="Total Import Base Suportat" grouped class="column">
              <div class="readonly subphase-detail-input has-text-right has-text-weight-bold">
                {{ formatPrice(totalBaseSuportat) }} €
              </div>
            </b-field>
          </div>
          <div class="column">
            <b-field label="Total Import Base Repercutit" grouped class="column">
              <div class="readonly subphase-detail-input has-text-right has-text-weight-bold">
                {{ formatPrice(totalBaseRepercutit) }} €
              </div>
            </b-field>
          </div>
          <div class="column">
            <b-field label="Total Import IVA Suportat" grouped class="column">
              <div class="readonly subphase-detail-input has-text-right has-text-weight-bold">
                {{ formatPrice(totalVatSuportat) }} €
              </div>
            </b-field>
          </div>
          <div class="column">
            <b-field label="Total Import IVA Repercutit" grouped class="column">
              <div class="readonly subphase-detail-input has-text-right has-text-weight-bold">
                {{ formatPrice(totalVatRepercutit) }} €
              </div>
            </b-field>
          </div>
          <div class="column">
            <b-field label="Total Import IVA" grouped class="column">
              <div class="readonly subphase-detail-input has-text-right has-text-weight-bold">
                {{ formatPrice(totalVatDifference) }} €
              </div>
            </b-field>
          </div>
        </div>
      </section>
    </card-component>
  </div>
</template>

<script>
// import ModalBox from '@/components/ModalBox'
import service from "@/service/index";
import moment from "moment";
import _ from "lodash";
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
  name: "VATTable",
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
      pivotIdentifier: 'tresoreria-pivot',
      checkedRows: [],
      vat_paid_date: new Date(),
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
        this.vat_paid_date = moment().toDate();
        this.getInitialData();
      }
    }, 100);
  },
  computed: {
    ...mapState(["userName", "user"]),
    treasuryDataDesc() {
      const treasuryDataOfYear = this.treasuryData.filter(d => moment(d.datex, 'dd-MM-YYYY').year() == this.selectedYear)
      return _.reverse(treasuryDataOfYear)
    },
    documentsWithSearchableFields() {
      if (!this.vat || !this.vat.documents) return [];
      
      return this.vat.documents.map(doc => {
        const typeLabel = this.getTypeLabel(doc.type);
        const year = moment(doc.date, 'YYYY-MM-DD').format("YYYY");
        const quarter = `T${moment(doc.date, 'YYYY-MM-DD').format("Q")}`;
        
        return {
          ...doc,
          typeLabel,
          year,
          quarter
        };
      });
    },
    payVatPayload() {
      return {
        emittedInvoices: this.checkedRows.filter(r => r.type === 'emitted-invoices').map(r => r.id),
        receivedInvoices: this.checkedRows.filter(r => r.type === 'received-invoices').map(r => r.id),
        receivedExpenses: this.checkedRows.filter(r => r.type === 'received-expenses').map(r => r.id),
        receivedIncomes: this.checkedRows.filter(r => r.type === 'received-incomes').map(r => r.id),
      }
    },
    filteredDocuments() {
      if (this.$refs.documentsTable && this.$refs.documentsTable.visibleData) {
        return this.$refs.documentsTable.visibleData;
      }
      return this.documentsWithSearchableFields || [];
    },
    totalBaseSuportat() {
      return this.filteredDocuments.reduce((sum, doc) => {
        if (doc.type === 'received-invoices' || doc.type === 'received-expenses') {
          return sum + (doc.total || 0);
        }
        return sum;
      }, 0);
    },
    totalBaseRepercutit() {
      return this.filteredDocuments.reduce((sum, doc) => {
        if (doc.type === 'emitted-invoices' || doc.type === 'received-incomes') {
          return sum + (doc.total || 0);
        }
        return sum;
      }, 0);
    },
    totalVatSuportat() {
      return this.filteredDocuments.reduce((sum, doc) => {
        if (doc.type === 'received-invoices' || doc.type === 'received-expenses') {
          return sum + (doc.total_vat || 0);
        }
        return sum;
      }, 0);
    },
    totalVatRepercutit() {
      return this.filteredDocuments.reduce((sum, doc) => {
        if (doc.type === 'emitted-invoices' || doc.type === 'received-incomes') {
          return sum + (doc.total_vat || 0);
        }
        return sum;
      }, 0);
    },
    totalVatDifference() {
      return this.totalVatSuportat - this.totalVatRepercutit;
    },
    totalBase() {
      return this.filteredDocuments.reduce((sum, doc) => {
        const multiplier = doc.type === 'received-invoices' ? -1 : 1;
        return sum + ((doc.total || 0) * multiplier);
      }, 0);
    },
    totalVat() {
      return this.filteredDocuments.reduce((sum, doc) => {
        const multiplier = doc.type === 'received-invoices' ? -1 : 1;
        return sum + ((doc.total_vat || 0) * multiplier);
      }, 0);
    },
  },
  methods: {
    getTypeLabel(type) {
      switch(type) {
        case 'emitted-invoices':
          return 'Factura emesa';
        case 'received-invoices':
          return 'Factura rebuda';
        case 'received-incomes':
          return 'Ingrés rebut';
        case 'received-expenses':
          return 'Despesa rebuda';
        default:
          return 'Desconegut';
      }
    },
    async getData() {
      this.isLoading = true;
      const year = this.$route.query.year ? this.$route.query.year : moment().format('YYYY')      
      this.selectedYear = year
      const treasuryData = await getTreasuryData(this.selectedProjectStates, this.selectedYear);      
      this.vat = treasuryData.vat;
      this.vat_expected = treasuryData.vat_expected;
      this.treasuryData = treasuryData.treasury.map(d => { return { ...d, executat: d.paid ? 'SÍ' : 'NO' }});
      this.projects = treasuryData.projects;
      // this.pivotData = Object.freeze(this.monthlySummaryTotal);
      // this.pivotData2 = Object.freeze(this.monthlySummaryForPivot);

      // configPivot.dataSource.data = this.pivotData2;
      // this.initializePivotWithViews("#project-stats", configPivot);
      this.isLoading = false;
    },
    async getInitialData() {
      this.isLoading = true;

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

      this.selectedProjectStates = this.projectStates.map((s) => s.id);

      this.getData();
    },
    formatPrice(value) {
      const val = (value / 1).toFixed(2).replace(".", ",");
      return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    },
    formatDate(value) {
      return moment(value, "YYYY-MM-DD").format("DD-MM-YYYY");
    },
    async payVat() {
      this.payingVat = true;
      await service({ requiresAuth: true }).post(`emitted-invoices/pay-vat`);
      this.payingVat = false;
      window.location.reload();
    },
    async payVatIds() {
      this.payingVat = true;
      await service({ requiresAuth: true }).post(`emitted-invoices/pay-vat-ids`, { ...this.payVatPayload, vat_paid_date: moment(this.vat_paid_date).format('YYYY-MM-DD') });
      this.payingVat = false;
      window.location.reload();
    },
    excelFormat(value) {
      return format(this.user, value);
    },
    moment(value, formatStr) {
      return moment(value, formatStr);
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