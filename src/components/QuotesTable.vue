<template>
  <section class="xsection">
    <!-- Redesign A: totals of the year, actions, and the quotes list -->
    <div class="doc-kpis">
      <div class="doc-kpi"><span>Pressupostat</span><b>{{ formatMoney(total_base) }}</b><small>{{ emitted.length }} pressupostos · base</small></div>
      <div class="doc-kpi"><span>Acceptat</span><b>{{ formatMoney(acceptedBase) }}</b><small>{{ acceptedCount }} acceptats</small></div>
      <div class="doc-kpi"><span>Pendent de resposta</span><b>{{ formatMoney(total_base - acceptedBase) }}</b><small>{{ emitted.length - acceptedCount }} pendents</small></div>
    </div>
    <div class="doc-actions">
      <download-excel name="pressupostos" class="export" :data="emittedCSV">
        <b-button title="Exporta dades" icon-left="download">Exporta</b-button>
      </download-excel>
      <b-button type="is-primary" icon-left="plus" @click="navNew">Nou pressupost</b-button>
    </div>
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
      <b-table-column label="Codi" field="code" v-slot="props" sortable cell-class="is-nowrap">
        <router-link
          v-if="props.row.id"
          :to="{ name: 'document.edit', params: { id: props.row.id, type: props.row.type } }"
        >
          {{ props.row.code }}
        </router-link>
        <b v-else>{{ props.row.code }}</b>
      </b-table-column>      
      <b-table-column label="Data" field="emitted" v-slot="props" sortable cell-class="is-nowrap">
        {{ props.row.emitted ? formatDate(props.row.emitted) : "" }}
      </b-table-column>
      <b-table-column label="Contacte" field="contact.name" v-slot="props" sortable cell-class="doc-contact">
        <span class="doc-title">{{ props.row.contact ? props.row.contact.name : "—" }}</span>
        <span class="doc-subline">{{ props.row.contact ? props.row.contact.nif : "" }}</span>
      </b-table-column>
      <b-table-column label="Concepte" field="document_concept" v-slot="props" sortable :custom-sort="sortByConcept" cell-class="doc-concept">
        <div class="doc-clamp" :title="quoteConcept(props.row) || null">{{ quoteConcept(props.row) }}</div>
      </b-table-column>
      <b-table-column label="Projecte" field="lines" v-slot="props" sortable cell-class="doc-project">
        <div class="doc-clamp">{{ props.row.projects && props.row.projects.length ? props.row.projects[0].name : (props.row.project ? props.row.project.name : "—" ) }}</div>
      </b-table-column>
      <b-table-column label="Base" field="total_base" v-slot="props" sortable numeric cell-class="is-nowrap doc-total">
        {{ formatMoney(props.row.total_base) }}
      </b-table-column>
      <b-table-column label="Estat" field="accepted" v-slot="props" sortable :custom-sort="sortByAcceptance" cell-class="is-nowrap">
        <span v-if="props.row.accepted || props.row.accepted_date" class="tag is-success is-light">Acceptat</span>
        <span v-else class="tag is-warning">Pendent</span>
        <span v-if="props.row.accepted_date" class="doc-subline">{{ formatDate(props.row.accepted_date) }}</span>
      </b-table-column>      
      <template #empty>
          <p class="has-text-muted has-text-centered py-5">No hi ha cap pressupost amb aquests filtres.</p>
        </template>
      </b-table>
  </section>
</template>

<script>
import service from "@/service/index";
import moment from "moment";
import sumBy from "lodash/sumBy";
import { formatMoney } from "@/helpers/format-number";
import _ from "lodash";

// The quote's own concept, else its first line's, as Ingressos/Despeses show
// it; the list showed the first line's even when the quote had one (issues/299)
const quoteConcept = q =>
  (q && q.document_concept) || (q && q.lines && q.lines.length > 0 && q.lines[0].concept) || "";

export default {
  name: "EmittedInvoices",
  components: {},
  props: {
    titleStack: {
      type: Array,
      default: () => [],
    },
    year: {
      type: Object,
      default: null,
    },
  },
  computed: {
    acceptedQuotes() {
      return (this.emitted || []).filter(q => q.accepted || q.accepted_date);
    },
    acceptedCount() {
      return this.acceptedQuotes.length;
    },
    acceptedBase() {
      return sumBy(this.acceptedQuotes, q => Number(q.total_base) || 0);
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
    };
  },
  watch: {
    year: function (newVal, oldVal) {
      this.getData();
    },
  },
  async mounted() {
    this.getData();
  },
  methods: {
    // a quote with only an acceptance date is accepted too (issues/085)
    sortByAcceptance(a, b, isAsc) {
      const key = q => (q.accepted || q.accepted_date ? "1" + (q.accepted_date || "") : "0");
      const order = key(a).localeCompare(key(b));
      return isAsc ? order : -order;
    },
    formatMoney,
    quoteConcept,
    sortByConcept(a, b, isAsc) {
      const order = quoteConcept(a).localeCompare(quoteConcept(b));
      return isAsc ? order : -order;
    },
    navNew() {
      this.$router.push("/document/0/quotes");
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
      const from = moment(this.year).startOf("year").format("YYYY-MM-DD");
      const to = moment(this.year).endOf("year").format("YYYY-MM-DD");
      let quotes = (
        await service({ requiresAuth: true }).get(
          `quotes?_limit=-1&_where[emitted_gte]=${from}&[emitted_lte]=${to}`
        )
      ).data;

      quotes = quotes.map((element) => {
        return { ...element, type: 'quotes' };
      });

      this.emitted = quotes

      this.emittedCSV = this.emitted.map((e) => {
        return {
          // the quote's fields are `emitted` and `concept`; it's the client (issues/277)
          num: e.code,
          data: this.formatDate(e.emitted),
          client: e.contact ? e.contact.name : "",
          nif: e.contact ? e.contact.nif : "",
          concepte: quoteConcept(e),
          projecte: e.projects && e.projects.length ? e.projects[0].name : (e.project ? e.project.name : ""),
          base: e.total_base,
          vat: e.total_vat,
          irpf: e.total_irpf,
          total: e.total,
        };
      });

      this.isLoading = false;
    },
  },
};
</script>
