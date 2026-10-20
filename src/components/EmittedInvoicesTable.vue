<template>
  <section class="xsection">
    <!-- Redesign A: totals as figure cards -->
    <div class="doc-kpis">
      <div class="doc-kpi"><span>Base</span><b>{{ formatMoney(total_base) }}</b></div>
      <div class="doc-kpi"><span>IVA</span><b>{{ formatMoney(total_vat) }}</b></div>
      <div v-if="!provider" class="doc-kpi"><span>IRPF</span><b>{{ formatMoney(total_irpf) }}</b></div>
      <div class="doc-kpi"><span>Total</span><b>{{ formatMoney(total_total) }}</b></div>
    </div>
    <!-- <pre>{{emittedCSV}}</pre> -->

    <div class="doc-actions">
    <download-excel class="export" :data="emittedCSV" 
    
    :fields="{
        num: 'num',
        tipus: 'tipus',
        data: 'data',
        venciment: 'venciment',
        cobrada: 'cobrada',
        client: 'client',
        client_nif: 'client_nif',
        client_adreça: 'client_adreça',
        client_cp: 'client_cp',
        client_ciutat: 'client_ciutat',
        concepte: 'concepte',
        projecte: 'projecte',
        base: {
          field: 'base',
          callback: (value) => {
            return excelFormat(value);
          },
        },
        iva: {
          field: 'iva',
          callback: (value) => {
            return excelFormat(value);
          },
        },
        irpf: {
          field: 'irpf',
          callback: (value) => {
            return excelFormat(value);
          },
        },
        total: {
          field: 'total',
          callback: (value) => {
            return excelFormat(value);
          },
        },
        line_concept: 'line_concept',
        line_base: {
          field: 'line_base',
          callback: (value) => {
            return excelFormat(value);
          },
        },
        line_date: 'line_date',
        line_discount: {
          field: 'line_discount',
          callback: (value) => {
            return excelFormat(value);
          },
        },
        line_irpf: {
          field: 'line_irpf',
          callback: (value) => {
            return excelFormat(value);
          },
        },
        line_irpf_pct: {
          field: 'line_irpf_pct',
          callback: (value) => {
            return excelFormat(value);
          },
        },
        line_quantity: {
          field: 'line_quantity',
          callback: (value) => {
            return excelFormat(value);
          },
        },
        line_vat: {
          field: 'line_vat',
          callback: (value) => {
            return excelFormat(value);
          },
        },
        line_vat_pct: {
          field: 'line_vat_pct',
          callback: (value) => {
            return excelFormat(value);
          },
        }
      }"
    name="ingressos">
      <b-button
        title="Exporta dades"
        icon-left="download"
      >Exporta</b-button>
    </download-excel>
    <b-button
      v-if="!provider"
      @click="navNewIncome"
      icon-left="plus"
    >
      Nou ingrés
    </b-button>
    <b-button
      v-if="!provider"
      type="is-primary"
      @click="navNew"
      icon-left="plus"
    >
      Nova factura
    </b-button>
    </div>
    <div class="has-scroll">
    <b-table    
      :loading="isLoading"
      :paginated="false"
      :striped="false"
      :data="emitted"
      :row-class="
        (row, index) =>
          (row.subtotal < 0 && 'has-text-danger has-text-bold') ||
          (row.type == 'Avui' && 'has-text-info')
      "
    >
      <b-table-column label="Codi" field="code" v-slot="props" sticky sortable>
        <router-link
          v-if="props.row.id && !provider"
          :to="{ name: 'document.edit', params: { id: props.row.id, type: props.row.type } }"
        >
          {{ props.row.code }}
        </router-link>
        <a :href="apiUrl + props.row.pdf" target="_blank"
          v-else-if="props.row.id && provider && props.row.pdf"          
        >
          {{ props.row.code }}
      </a>
        <b v-else>{{ props.row.code }}</b>
        <span class="doc-subline">
          <template v-if="props.row.type === 'emitted-invoices'">Factura</template>
          <template v-else-if="props.row.type === 'received-incomes' && props.row.document_type">{{ props.row.document_type.name }}</template>
        </span>
      </b-table-column>
      <b-table-column label="Data" field="emitted" v-slot="props" sortable cell-class="is-nowrap">
        {{ props.row.emitted ? formatDate(props.row.emitted) : "" }}
        <span v-if="props.row.paybefore" class="doc-subline" title="Venciment">venç. {{ formatDate(props.row.paybefore) }}</span>
      </b-table-column>
      <b-table-column
        v-if="!provider"
        label="Contacte"
        field="contact.name"
        v-slot="props"
        sortable
        cell-class="doc-contact"
      >
        <span class="doc-title">{{ props.row.contact_info ? props.row.contact_info.name : props.row.contact ? props.row.contact.name : "" }}</span>
        <span class="doc-subline">{{ props.row.contact_info ? props.row.contact_info.nif : props.row.contact ? props.row.contact.nif : "" }}</span>
      </b-table-column>
      <b-table-column label="Concepte" field="document_concept" v-slot="props" sortable v-if="!provider" cell-class="doc-concept">
        <div class="doc-clamp" :title="props.row.document_concept || null">{{
          props.row.document_concept || (props.row.lines && props.row.lines.length > 0 ? props.row.lines[0].concept : "")
        }}</div>
      </b-table-column>
      <b-table-column label="Projecte" field="lines" v-slot="props" sortable cell-class="doc-project">
        <div class="doc-clamp"><span v-for="project in props.row.projects" :key="project.id">{{project.name}}&nbsp;</span></div>
      </b-table-column>
      <b-table-column label="Base" field="total_base" v-slot="props" sortable numeric cell-class="is-nowrap">
        {{ formatMoney(props.row.total_base) }}
      </b-table-column>
      <b-table-column label="IVA" field="total_vat" v-slot="props" sortable numeric cell-class="is-nowrap">
        {{ formatMoney(props.row.total_vat) }}
      </b-table-column>
      <b-table-column label="IRPF" :visible="!provider && hasIrpf" field="total_irpf" v-slot="props" sortable numeric cell-class="is-nowrap">
        {{ formatMoney(-1 * props.row.total_irpf) }}
      </b-table-column>
      <b-table-column label="Total" field="total" v-slot="props" sortable numeric cell-class="is-nowrap doc-total">
        {{ formatMoney(props.row.total) }}
      </b-table-column>
      <!-- for a member (provider) it is what she has paid -->
      <b-table-column :label="provider ? 'Pagada' : 'Cobrada'" field="paid_date" v-slot="props" sortable cell-class="is-nowrap">
        <span v-if="props.row.state === 'draft'" class="tag is-info is-light">Esborrany</span>
        <span v-else-if="props.row.paid_date" class="tag is-success is-light">{{ provider ? "Pagada" : "Cobrada" }}</span>
        <span v-else-if="Number(props.row.total) < 0" class="tag">Abonament</span>
        <span v-else-if="isOverdue(props.row)" class="tag is-danger is-light">Vençuda</span>
        <span v-else class="tag is-warning">{{ provider ? "Pendent de pagar" : "No cobrada" }}</span>
        <span v-if="props.row.paid_date" class="doc-subline">{{ formatDate(props.row.paid_date) }}</span>
        <span v-else-if="!provider && props.row.estimated_payment" class="doc-subline">prev. {{ formatDate(props.row.estimated_payment) }}</span>
        <span v-if="!provider && !props.row.assigned" class="doc-subline doc-unassigned" title="No assignada a cap línia de pressupost de projecte">Sense assignar</span>
      </b-table-column>
      <template #empty>
        <p class="has-text-muted has-text-centered py-5">Cap factura en aquest període.</p>
      </template>
    </b-table>
  </div>
  </section>
</template>

<script>
import service from "@/service/index";
import moment from "moment";
import sumBy from "lodash/sumBy";
import { formatMoney } from "@/helpers/format-number";
import _ from "lodash";
import { format } from "@/helpers/excelFormatter";
import { invoiceExportLineRow } from "@/domain/invoiceExport";
import { mapState } from 'pinia'
import { useMainStore } from '@/stores/main.js'
import getConfig from '@/config'
import { stateFilter } from '@/domain/incomeListFilters'

export default {
  name: "EmittedInvoices",
  components: {},
  props: {
    titleStack: {
      type: Array,
      default: () => [],
    },
    code: {
      type: String,
      default: '',
    },
    year: {
      type: Number,
      default: null,
    },
    month: {
      type: Number,
      default: null,
    },
    quarter: {
      type: Number,
      default: null,
    },
    contact: {
      type: Number,
      default: null,
    },
    project: {
      type: Number,
      default: null,
    },    
    documentType: {
      type: Number,
      default: null,
    },
    paid: {
      type: Number,
      default: null,
    },
    // «Estat»: 0 all, 1 drafts, 2 issued (incomeListFilters)
    state: {
      type: Number,
      default: 0,
    },
    provider: {
      type: Boolean,
      default: false,
    },
    serial: {
      type: Number,
      default: null,
    },
  },
  computed: {
    // the IRPF column only when some document of the period has it
    hasIrpf() {
      return (this.emitted || []).some(r => Number(r.total_irpf));
    },

    total_base() {
      return sumBy(this.emitted, "total_base").toFixed(2);
    },
    total_vat() {
      return sumBy(this.emitted, "total_vat").toFixed(2);
    },
    total_irpf() {
      return -1 * sumBy(this.emitted, "total_irpf").toFixed(2);
    },
    total_total() {
      return sumBy(this.emitted, "total").toFixed(2);
    },
    ...mapState(useMainStore, ["userName", "user"]),
  },
  data() {
    return {
      isLoading: false,
      years: [],
      projects: [],
      treasury: [],
      treasuryData: [],
      emitted: [],
      emittedCSV: [],
      received: [],
      tickets: [],
      diets: [],
      emittedGrants: [],
      receivedGrants: [],
      projectIncomes: [],
      projectExpenses: [],
      apiUrl: import.meta.env.VUE_APP_API_URL,
    };
  },
  watch: {
    code: function (newVal, oldVal) {
      this.getData();
    },
    year: function (newVal, oldVal) {
      this.getData();
    },
    month: function (newVal, oldVal) {
      this.getData();
    },
    quarter: function (newVal, oldVal) {
      this.getData();
    },
    contact: function (newVal, oldVal) {
      this.getData();
    },
    project: function (newVal, oldVal) {
      this.getData();
    },
    documentType: function (newVal, oldVal) {
      this.getData();
    },
    paid: function (newVal, oldVal) {
      this.getData();
    },
    state: function () {
      this.getData();
    },
    serial: function (newVal, oldVal) {
      this.getData();
    },
  },
  async mounted() {
    const config = getConfig();
    this.apiUrl = config.VUE_APP_API_URL;
    this.getData();
  },
  methods: {
    formatMoney,
    // not collected, positive and past its due date ("Venciment")
    isOverdue(row) {
      return !row.paid_date && Number(row.total) > 0 && !!row.paybefore && moment(row.paybefore, "YYYY-MM-DD").isBefore(moment(), "day");
    },
    navNew() {
      this.$router.push("/document/0/emitted-invoices");
    },
    navNewIncome() {
      this.$router.push("/document/0/received-incomes");
    },    
    formatPrice(value) {
      const val = (value / 1).toFixed(2).replace(".", ",");
      return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    },
    formatDate(value) {
      if (!value) return ''
      return moment(value, "YYYY-MM-DD").format("DD/MM/YYYY");
    },
    async getData() {
      this.isLoading = true;
      if (!this.year) {
        return;
      }
      const from = moment(this.year, 'YYYY').startOf("year").format("YYYY-MM-DD");
      const to = moment(this.year, 'YYYY').endOf("year").format("YYYY-MM-DD");

      const from2 = this.month ? moment(`${this.year}-${this.month}`, 'YYYY-M').startOf("month").format("YYYY-MM-DD") : from;
      const to2 = this.month ? moment(`${this.year}-${this.month}`, 'YYYY-M').endOf("month").format("YYYY-MM-DD") : to;

      const from3 = this.quarter ? moment(`${this.year}`, 'YYYY').quarter(this.quarter).startOf("quarter").format("YYYY-MM-DD") : from2;
      const to3 = this.quarter ? moment(`${this.year}`, 'YYYY').quarter(this.quarter).endOf("quarter").format("YYYY-MM-DD") : to2;

      const contactQuery = this.contact ? `&[contact_eq]=${this.contact}` : '';      
      const projectQuery = this.project ? `&[projects_eq]=${this.project}` : '';

      const paidQuery = this.paid === 1 ? `&[paid_date_null]=false` : (this.paid === 2 ? `&[paid_date_null]=true` : '');

      const serialQuery = this.serial ? `&[serial_eq]=${this.serial}` : '';
      
      const codeQuery = this.code ? `&[code_contains]=${this.code}` : '';

      const { invoiceQuery: stateQuery, includeIncomes } = stateFilter(this.state);

      let invoices = (
        await service({ requiresAuth: true }).get(
          `emitted-invoices/basic?_limit=${this.documentType === 0 || this.documentType === -1 ? -1 : 0}&_where[emitted_gte]=${from3}&[emitted_lte]=${to3}${contactQuery}${projectQuery}${paidQuery}${serialQuery}${codeQuery}${stateQuery}`
        )
      ).data;

      invoices = invoices.map((element) => {
        return { ...element, type: 'emitted-invoices' };
      });

      const typeQuery = this.documentType !== 0 ? `&[document_type_eq]=${this.documentType}` : '';
      let incomes = includeIncomes ? (
        await service({ requiresAuth: true }).get(
          `received-incomes/basic?_limit=-1&_where[emitted_gte]=${from3}&[emitted_lte]=${to3}${contactQuery}${typeQuery}${projectQuery}${paidQuery}${codeQuery}`
        )
      ).data : [];

      incomes = incomes.map((element) => {
        return { ...element, type: 'received-incomes' };
      });

      const emitted = _.concat(invoices, incomes)


      const assignedDocuments = ( await service({ requiresAuth: true }).get(
        `phase-incomes/assigned?_limit=-1`
      )).data;

      const emittedWithInfo = emitted.map((e) => {
        return {
          ...e,
          // check if the document is assigned to a project, with assignedDocuments
          assigned: this.assignedToProject(e, assignedDocuments),
        };
      });

      this.emitted = emittedWithInfo
      this.emittedCSV = []
      this.emitted.forEach((e) => {
        this.emittedCSV.push({
          num: e.code,
          tipus: e.type == 'emitted-invoices' ? 'Factura' : e.document_type.name,
          data: this.formatDate(e.emitted),
          venciment: this.formatDate(e.paybefore),
          cobrada: this.formatDate(e.paid_date),
          client: e.contact_info ? e.contact_info.name : e.contact ? e.contact.name : "",
          client_nif: e.contact_info ? e.contact_info.nif : e.contact ? e.contact.nif : "",
          client_adreça: e.contact_info ? e.contact_info.address : e.contact ? e.contact.address : "",
          client_cp: e.contact_info ? e.contact_info.postcode : e.contact ? e.contact.postcode : "",
          client_ciutat: e.contact_info ? e.contact_info.city : e.contact ? e.contact.city : "",
          // proveidor_provincia: e.contact ? e.contact.state : "",
          // proveidor_pais: e.contact ? e.contact.country : "",
          concepte: e.document_concept || (e.lines && e.lines.length > 0 ? e.lines[0].concept : "-"),
          projecte: e.projects && e.projects.length ? e.projects[0].name : (e.project ? e.project.name : ""),
          base: e.total_base,
          iva: e.total_vat,
          irpf: e.total_irpf,
          total: e.total,
          line_concept: "",
          line_base: "",
          line_date: "",
          line_discount: "",
          line_irpf: "",
          line_irpf_pct: "",
          line_quantity: "",
          line_vat: "",
          line_vat_pct: "",
        })
        
        if (e.lines && e.lines.length) {
          e.lines.forEach(line => {
            this.emittedCSV.push(invoiceExportLineRow(e.code, line))
          })
        }
      })
      // this.emittedCSV = this.emitted.map((e) => {
      //   return {
      //     num: e.code,
      //     tipus: e.type == 'emitted-invoices' ? 'Factura' : e.document_type.name,
      //     data: this.formatDate(e.emitted),
      //     venciment: this.formatDate(e.paybefore),
      //     cobrada: this.formatDate(e.paid_date),
      //     proveidor: e.contact ? e.contact.name : "",
      //     proveidor_nif: e.contact ? e.contact.nif : "",
      //     proveidor_adreça: e.contact ? e.contact.address : "",
      //     proveidor_cp: e.contact ? e.contact.postcode : "",
      //     proveidor_ciutat: e.contact ? e.contact.city : "",
      //     // proveidor_provincia: e.contact ? e.contact.state : "",
      //     // proveidor_pais: e.contact ? e.contact.country : "",
      //     concepte: e.lines && e.lines.length > 0 ? e.lines[0].concept : "-",
      //     projecte: e.projects && e.projects.length ? e.projects[0].name : (e.project ? e.project.name : ""),
      //     base: e.total_base,
      //     iva: e.total_vat,
      //     irpf: e.total_irpf,
      //     total: e.total,
      //   };
      // });

      // this.emitted.push({
      //   number: 0,
      //   code: "Total",
      //   emitted: null,
      //   paybefore: null,
      //   contact: null,
      //   project: null,
      //   concept: "",
      //   total_base: sumBy(this.emitted, "total_base"),
      //   total_vat: sumBy(this.emitted, "total_vat"),
      //   total_irpf: sumBy(this.emitted, "total_irpf"),
      //   total: sumBy(this.emitted, "total"),
      // });

      this.isLoading = false;
    },
    excelFormat(value) {
      return format(this.user, value);
    },
    assignedToProject(invoice, assignedDocuments) {
      let assigned = false;
      if (invoice.type === "emitted-invoices") {
        assigned = assignedDocuments.invoices.includes(invoice.id);
      } else if (invoice.type === "received-incomes") {
        assigned = assignedDocuments.incomes.includes(invoice.id);
      }
      return assigned;
    },
  },
};
</script>
<style>
.has-scroll .table-wrapper{
  overflow: auto !important;
}
</style>