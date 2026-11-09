<template>
  <!-- IVA › «Previst» (issues/418: moved out of VatTable, loaded only when its
       tab opens): the VAT of the documents planned in the projects, not
       invoiced yet, per quarter with the cumulative balance, and line by line -->
  <div class="vat-forecast">
    <b-loading :is-full-page="false" v-model="isLoading" :can-cancel="false" />

    <div class="doc-kpis">
      <div class="doc-kpi">
        <span>IVA repercutit previst</span>
        <b>{{ formatMoney(vat_expected.received) }}</b>
        <small>dels ingressos previstos</small>
      </div>
      <div class="doc-kpi">
        <span>IVA suportat previst</span>
        <b>{{ formatMoney(vat_expected.paid) }}</b>
        <small v-if="hasDeductible">deduïble al {{ pct(expectedTotals.deductiblePct) }}</small>
        <small v-else>de les despeses previstes</small>
      </div>
      <div class="doc-kpi">
        <span>Saldo previst</span>
        <b :class="expectedBalance < 0 ? 'has-text-danger' : ''">{{ formatMoney(expectedBalance) }}</b>
        <small>{{ expectedBalance < 0 ? "a pagar a Hisenda" : "a favor" }}</small>
      </div>
    </div>

    <section class="a-box list-box vat-forecast-box">
      <header class="box-head">
        <h2>Trimestres previstos</h2>
        <span class="box-hint">De les despeses i els ingressos futurs dels projectes, amb càlcul acumulat: un saldo a favor passa al trimestre següent.</span>
      </header>
      <p v-if="outdatedExpectedDocuments.length" class="notification is-warning is-light list-hint">
        {{ outdatedExpectedDocuments.length }} {{ outdatedExpectedDocuments.length === 1 ? "línia prevista té" : "línies previstes tenen" }} una data anterior al trimestre actual i no compten a la previsió:
        {{ outdatedExpectedDocuments.slice(0, 5).map(d => `${d.project_name} · ${d.concept} (${formatDate(d.date)})`).join(", ") }}{{ outdatedExpectedDocuments.length > 5 ? "…" : "" }}.
        Corregeix-ne la data al projecte.
      </p>
      <p v-if="!expectedVatQuarters.length" class="box-empty">No hi ha IVA previst.</p>
      <b-table v-else :data="expectedVatQuarters" :striped="true" class="vat-expected-quarters">
        <b-table-column label="Any" field="year" v-slot="props">
          {{ props.row.year }}
        </b-table-column>
        <b-table-column label="Trimestre" field="quarter" v-slot="props">
          T{{ props.row.quarter }}
        </b-table-column>
        <b-table-column label="IVA repercutit" numeric v-slot="props">
          {{ formatPrice(props.row.received) }} €
        </b-table-column>
        <b-table-column label="IVA suportat" numeric v-slot="props">
          {{ formatPrice(props.row.paid) }} €
        </b-table-column>
        <b-table-column label="% deduïble" numeric v-slot="props">
          {{ pct(props.row.deductible_pct) }}
        </b-table-column>
        <b-table-column label="IVA deduïble" numeric v-slot="props">
          {{ formatPrice(props.row.deductible_paid) }} €
        </b-table-column>
        <b-table-column label="Saldo del trimestre" numeric v-slot="props">
          <span :class="props.row.quarterBalance < 0 ? 'has-text-danger' : 'has-text-success'">
            {{ formatPrice(props.row.quarterBalance) }} €
          </span>
        </b-table-column>
        <b-table-column label="Saldo acumulat" numeric v-slot="props">
          <span :class="props.row.cumulativeBalance < 0 ? 'has-text-danger has-text-weight-bold' : 'has-text-success'">
            {{ formatPrice(props.row.cumulativeBalance) }} €
          </span>
        </b-table-column>
        <b-table-column label="A pagar" numeric v-slot="props">
          <span v-if="props.row.willCreateEntry" class="has-text-weight-bold has-text-danger">
            {{ formatPrice(props.row.paymentAmount) }} €
          </span>
          <span v-else class="has-text-grey-light">(es traspassa)</span>
        </b-table-column>
        <b-table-column label="Data de pagament" field="paymentDate" v-slot="props">
          <span v-if="props.row.willCreateEntry" class="has-text-weight-bold">{{ props.row.paymentDate }}</span>
          <span v-else class="has-text-grey-light">-</span>
        </b-table-column>
      </b-table>
    </section>

    <section class="a-box list-box">
      <header class="box-head">
        <h2>Documents previstos</h2>
        <span class="box-hint">Despeses i ingressos definits als projectes però encara sense factura.</span>
      </header>
      <b-table
        :paginated="false"
        :striped="false"
        :data="expectedDocumentsWithSearchableFields"
        ref="expectedDocumentsTable"
        class="vat-expected-documents"
      >
        <b-table-column sortable searchable label="Projecte" field="project_name" v-slot="props">
          <router-link :to="`/projecte/${props.row.project_id}`">{{ props.row.project_name }}</router-link>
        </b-table-column>
        <b-table-column sortable searchable label="Concepte" field="concept" v-slot="props">
          {{ props.row.concept }}
        </b-table-column>
        <b-table-column sortable searchable label="Tipus" field="typeLabel" v-slot="props">
          {{ props.row.typeLabel }}
        </b-table-column>
        <b-table-column sortable searchable label="Data estimada" field="date" v-slot="props">
          {{ formatDate(props.row.date) }}
        </b-table-column>
        <b-table-column sortable searchable label="Any" field="year" v-slot="props">
          {{ props.row.year }}
        </b-table-column>
        <b-table-column sortable searchable label="Trimestre" field="quarter" v-slot="props">
          {{ props.row.quarter }}
        </b-table-column>
        <b-table-column sortable searchable label="Base" numeric field="total" v-slot="props">
          {{ formatPrice(props.row.total) }} €
        </b-table-column>
        <b-table-column sortable searchable label="% IVA" numeric field="vat_pct" v-slot="props">
          {{ pct(props.row.vat_pct) }}
        </b-table-column>
        <b-table-column sortable searchable label="IVA" numeric field="total_vat" v-slot="props">
          {{ formatPrice(props.row.total_vat) }} €
        </b-table-column>
        <template #empty>
          <p class="box-empty">No hi ha documents previstos.</p>
        </template>
      </b-table>
      <dl v-if="filteredExpectedDocuments.length > 0" class="tax-totals vat-totals">
        <div><dt>Base suportada</dt><dd>{{ formatPrice(totalExpectedBaseSuportat) }} €</dd></div>
        <div><dt>Base repercutida</dt><dd>{{ formatPrice(totalExpectedBaseRepercutit) }} €</dd></div>
        <div><dt>IVA suportat</dt><dd>{{ formatPrice(totalExpectedVatSuportat) }} €</dd></div>
        <div><dt>IVA repercutit</dt><dd>{{ formatPrice(totalExpectedVatRepercutit) }} €</dd></div>
        <div class="is-total"><dt>IVA</dt><dd>{{ formatPrice(totalExpectedVatDifference) }} €</dd></div>
      </dl>
    </section>
  </div>
</template>

<script>
import moment from "moment";
import service from "@/service/index";
import getTreasuryData from "@/service/treasury";
import { formatMoney, formatNumber } from "@/helpers/format-number";
import { expectedVatQuarterRows, expectedVatTotals } from "@/domain/expectedVat";

const sumOf = (docs, type, field) => docs.reduce((sum, d) => (d.type === type ? sum + (d[field] || 0) : sum), 0);

export default {
  name: "VatForecast",
  props: {
    // GET me (Configuració's «% IVA deduïble»)
    me: { type: Object, default: null }
  },
  data() {
    return {
      isLoading: false,
      vat_expected: { paid: 0, received: 0 },
      vat_expected_by_quarter: {}
    };
  },
  computed: {
    hasDeductible() {
      return !!(this.me && this.me.options && this.me.options.deductible_vat_pct > 0);
    },
    // each quarter deducts its year's %, Configuració's only as fallback (issues/221)
    expectedTotals() {
      const configPct = this.hasDeductible ? this.me.options.deductible_vat_pct : 0;
      return expectedVatTotals(this.vat_expected, this.vat_expected_by_quarter, configPct);
    },
    expectedBalance() {
      return this.hasDeductible ? this.expectedTotals.balance : -1 * (this.vat_expected.received || 0);
    },
    expectedVatQuarters() {
      if (!this.vat_expected_by_quarter || !this.me || !this.me.options) return [];
      return expectedVatQuarterRows(this.vat_expected_by_quarter, this.me.options.deductible_vat_pct);
    },
    // lines dated before the current quarter: listed apart, not forecast (issues/072)
    outdatedExpectedDocuments() {
      return ((this.vat_expected && this.vat_expected.documents) || []).filter(doc => doc.outdated);
    },
    expectedDocumentsWithSearchableFields() {
      if (!this.vat_expected || !this.vat_expected.documents) return [];
      return this.vat_expected.documents.filter(doc => !doc.outdated).map(doc => ({
        ...doc,
        typeLabel: doc.type === "phase-expense" ? "Despesa prevista" : "Ingrés previst",
        year: moment(doc.date, "YYYY-MM-DD").format("YYYY"),
        quarter: `T${moment(doc.date, "YYYY-MM-DD").format("Q")}`,
        contactName: doc.type === "phase-expense" ? doc.provider : doc.client
      }));
    },
    filteredExpectedDocuments() {
      if (this.$refs.expectedDocumentsTable && this.$refs.expectedDocumentsTable.visibleData) {
        return this.$refs.expectedDocumentsTable.visibleData;
      }
      return this.expectedDocumentsWithSearchableFields || [];
    },
    totalExpectedBaseSuportat() {
      return sumOf(this.filteredExpectedDocuments, "phase-expense", "total");
    },
    totalExpectedBaseRepercutit() {
      return sumOf(this.filteredExpectedDocuments, "phase-income", "total");
    },
    totalExpectedVatSuportat() {
      return sumOf(this.filteredExpectedDocuments, "phase-expense", "total_vat");
    },
    totalExpectedVatRepercutit() {
      return sumOf(this.filteredExpectedDocuments, "phase-income", "total_vat");
    },
    totalExpectedVatDifference() {
      return this.totalExpectedVatSuportat - this.totalExpectedVatRepercutit;
    }
  },
  mounted() {
    this.load();
  },
  methods: {
    formatMoney,
    // «97,96 %» (it printed «97.96 %» and «0,00%», issues/104)
    pct(value) {
      const n = Number(value);
      return `${formatNumber(isNaN(n) ? 0 : n, 2)} %`;
    },
    formatPrice(value) {
      const val = (value / 1).toFixed(2).replace(".", ",");
      return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    },
    formatDate(value) {
      return value ? moment(value, "YYYY-MM-DD").format("DD/MM/YYYY") : "—";
    },
    async load() {
      this.isLoading = true;
      try {
        const states = await service({ requiresAuth: true, cached: true }).get("project-states").then(r => r.data);
        const data = await getTreasuryData((Array.isArray(states) ? states : []).map(s => s.id), moment().format("YYYY"));
        this.vat_expected = data.vat_expected || { paid: 0, received: 0 };
        this.vat_expected_by_quarter = data.vat_expected_by_quarter || {};
      } finally {
        this.isLoading = false;
      }
    }
  }
};
</script>
<style scoped>
.vat-forecast {
  position: relative;
}
.vat-forecast .doc-kpis,
.vat-forecast-box {
  margin-bottom: 1rem;
}
.vat-forecast .list-hint {
  margin: .75rem 1.25rem;
  padding: .75rem 1rem;
}
.box-empty {
  padding: 1.5rem 1.25rem;
  color: var(--a-muted);
}
</style>
