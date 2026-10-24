<template>
  <!-- Redesign A: the balance to settle, then one view at a time (documents pending,
       quarters executed / expected, expected documents) -->
  <div class="vat-page">
    <b-loading :is-full-page="true" v-model="isLoading" :can-cancel="false" />

    <template v-if="hasDeductible">
      <div class="doc-kpis">
        <div class="doc-kpi">
          <span>Saldo executat</span>
          <b :class="vat.deductible_vat < 0 ? 'has-text-danger' : ''">{{ formatMoney(vat.deductible_vat) }}</b>
          <small>{{ vat.deductible_vat < 0 ? "a pagar a Hisenda" : "a favor" }}</small>
        </div>
        <div class="doc-kpi">
          <span>IVA suportat</span>
          <b>{{ formatMoney(vat.paid) }}</b>
          <small>deduïble al {{ pct(vat.deductible_vat_pct) }}</small>
        </div>
        <div class="doc-kpi">
          <span>IVA repercutit</span>
          <b>{{ formatMoney(vat.received) }}</b>
          <small>de factures emeses i ingressos</small>
        </div>
        <div class="doc-kpi">
          <span>Saldo previst</span>
          <b>{{ formatMoney(expectedBalance) }}</b>
          <small>dels documents previstos als projectes</small>
        </div>
      </div>

      <section class="a-box vat-settle-box">
        <header class="box-head">
          <h2>IVA pendent de saldar</h2>
          <div class="vat-settle">
            <b-datepicker
              v-model="vat_paid_date"
              aria-label="Data de pagament"
              placeholder="Data de pagament"
              icon="calendar-today"
              :locale="'ca-ES'"
              :first-day-of-week="1"
            />
            <b-button
              type="is-primary"
              :loading="payingVat"
              :disabled="!canSettle"
              @click="payVatIds"
            >
              Salda {{ checkedRows.length ? `${checkedRows.length} ${checkedRows.length === 1 ? "document" : "documents"}` : "" }}
            </b-button>
          </div>
        </header>
        <p class="box-hint"><b>Executat:</b> IVA de factures i documents emesos o rebuts (cobrats o no), encara pendent de saldar amb Hisenda. <b>Previst:</b> IVA estimat de les despeses i els ingressos previstos als projectes (factures encara no emeses ni rebudes).</p>
        <p class="box-hint">Marca els documents a «Documents pendents» i tria la data del pagament per saldar-los.</p>
        <div class="table-wrap">
          <table class="table vat-pending">
            <thead>
              <tr>
                <th scope="col"></th>
                <th scope="col" class="has-text-right">Suportat</th>
                <th scope="col" class="has-text-right">Repercutit</th>
                <th scope="col" class="has-text-right">Deduïble</th>
                <th scope="col" class="has-text-right">Saldo</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Executat</th>
                <td class="has-text-right">{{ formatMoney(vat.paid) }}</td>
                <td class="has-text-right">{{ formatMoney(vat.received) }}</td>
                <td class="has-text-right">{{ pct(vat.deductible_vat_pct) }}</td>
                <td class="has-text-right vat-balance">{{ formatMoney(vat.deductible_vat) }}</td>
              </tr>
              <tr>
                <th scope="row">Previst</th>
                <td class="has-text-right">{{ formatMoney(vat_expected.paid) }}</td>
                <td class="has-text-right">{{ formatMoney(vat_expected.received) }}</td>
                <td class="has-text-right">{{ pct(expectedTotals.deductiblePct) }}</td>
                <td class="has-text-right vat-balance">{{ formatMoney(expectedBalance) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>

    <div class="segmented vat-views" role="tablist" aria-label="Vista">
      <button
        v-for="v in views"
        :key="v.id"
        type="button"
        role="tab"
        :class="{ 'is-on': vatView === v.id }"
        :aria-selected="vatView === v.id ? 'true' : 'false'"
        @click="vatView = v.id"
      >
        {{ v.label }}<span v-if="v.count !== undefined" class="count">{{ v.count }}</span>
      </button>
    </div>

    <section v-show="vatView === 'documents'" class="a-box list-box">
      <p class="box-hint list-hint">Factures i documents emesos o rebuts amb l'IVA pendent de saldar amb Hisenda, cobrats o no: és l'apartat «Executat».</p>
      <b-table
        :loading="isLoading"
        :paginated="false"
        :striped="false"
        :data="documentsWithSearchableFields"
        v-model:checked-rows="checkedRows"
        :checkable="true"
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

        <b-table-column sortable searchable label="Emissió" field="date" v-slot="props">
          {{ formatDate(props.row.date) }}
        </b-table-column>
        <b-table-column sortable searchable label="Any" field="year" v-slot="props">
          {{ props.row.year }}
        </b-table-column>
        <b-table-column sortable searchable label="Trimestre" field="quarter" v-slot="props">
          {{ props.row.quarter }}
        </b-table-column>
        <b-table-column sortable searchable label="Base" numeric field="base" v-slot="props" class="has-text-right">
          {{ formatPrice(props.row.base) }} €
        </b-table-column>
        <b-table-column sortable searchable label="IVA" numeric field="total_vat" v-slot="props" class="has-text-right">
          {{ formatPrice(props.row.total_vat) }} €
        </b-table-column>
        <!-- only supported VAT is deductible (issues/209) -->
        <b-table-column sortable searchable label="Deduïble" numeric field="theoretical_deductible_vat_pct" v-slot="props" class="has-text-right">
          <template v-if="props.row.supported">{{ pct(props.row.theoretical_deductible_vat_pct) }}</template>
          <span v-else class="has-text-grey-light">—</span>
        </b-table-column>
      </b-table>
      <dl v-if="filteredDocuments.length > 0" class="vat-totals">
        <div><dt>Base suportada</dt><dd>{{ formatPrice(totalBaseSuportat) }} €</dd></div>
        <div><dt>Base repercutida</dt><dd>{{ formatPrice(totalBaseRepercutit) }} €</dd></div>
        <div><dt>IVA suportat</dt><dd>{{ formatPrice(totalVatSuportat) }} €</dd></div>
        <div><dt>IVA repercutit</dt><dd>{{ formatPrice(totalVatRepercutit) }} €</dd></div>
        <div class="is-total"><dt>IVA</dt><dd>{{ formatPrice(totalVatDifference) }} €</dd></div>
      </dl>
    </section>

    <section v-show="vatView === 'executed-quarters'" class="a-box list-box">
      <p class="box-hint list-hint">IVA executat per trimestre amb càlcul acumulat: el saldo negatiu (a pagar) d'un trimestre passa al següent, i només es crea un pagament a Tresoreria quan el saldo acumulat és negatiu. Un saldo a favor surt com «(es traspassa)» i descompta del trimestre següent.</p>
      <p v-if="!executedVatQuarters.length" class="box-empty">No hi ha IVA executat pendent.</p>
      <b-table
        v-else
        :data="executedVatQuarters"
        :striped="true"
      >
        <b-table-column label="Any" field="year" v-slot="props">
          {{ props.row.year }}
        </b-table-column>
        <b-table-column label="Trimestre" field="quarter" v-slot="props">
          T{{ props.row.quarter }}
        </b-table-column>
        <b-table-column label="IVA repercutit" numeric v-slot="props" class="has-text-right">
          {{ formatPrice(props.row.received) }} €
        </b-table-column>
        <b-table-column label="IVA suportat" numeric v-slot="props" class="has-text-right">
          {{ formatPrice(props.row.paid) }} €
        </b-table-column>
        <b-table-column label="% deduïble" numeric v-slot="props" class="has-text-right">
          {{ pct(props.row.deductible_pct) }}
        </b-table-column>
        <b-table-column label="IVA deduïble" numeric v-slot="props" class="has-text-right">
          {{ formatPrice(props.row.deductible_paid) }} €
        </b-table-column>
        <b-table-column label="Saldo del trimestre" numeric v-slot="props" class="has-text-right">
          <span :class="props.row.quarterBalance < 0 ? 'has-text-danger' : 'has-text-success'">
            {{ formatPrice(props.row.quarterBalance) }} €
          </span>
        </b-table-column>
        <b-table-column label="Saldo acumulat" numeric v-slot="props" class="has-text-right">
          <span :class="props.row.cumulativeBalance < 0 ? 'has-text-danger has-text-weight-bold' : 'has-text-success'">
            {{ formatPrice(props.row.cumulativeBalance) }} €
          </span>
        </b-table-column>
        <b-table-column label="A pagar" numeric v-slot="props" class="has-text-right">
          <span v-if="props.row.willCreateEntry" class="has-text-weight-bold has-text-danger">
            {{ formatPrice(props.row.paymentAmount) }} €
          </span>
          <span v-else class="has-text-grey-light">
            (es traspassa)
          </span>
        </b-table-column>
        <b-table-column label="Data de pagament" field="paymentDate" v-slot="props">
          <span v-if="props.row.willCreateEntry" class="has-text-weight-bold">
            {{ props.row.paymentDate }}
          </span>
          <span v-else class="has-text-grey-light">-</span>
        </b-table-column>
      </b-table>
    </section>

    <section v-show="vatView === 'expected-quarters'" class="a-box list-box">
      <p class="box-hint list-hint">IVA previst per trimestre, de les despeses i els ingressos futurs dels projectes, amb el mateix càlcul acumulat.</p>
      <p v-if="outdatedExpectedDocuments.length" class="notification is-warning is-light list-hint">
        {{ outdatedExpectedDocuments.length }} {{ outdatedExpectedDocuments.length === 1 ? "línia prevista té" : "línies previstes tenen" }} una data anterior al trimestre actual i no compten a la previsió:
        {{ outdatedExpectedDocuments.slice(0, 5).map(d => `${d.project_name} · ${d.concept} (${formatDate(d.date)})`).join(", ") }}{{ outdatedExpectedDocuments.length > 5 ? "…" : "" }}.
        Corregeix-ne la data al projecte.
      </p>
      <p v-if="!expectedVatQuarters.length" class="box-empty">No hi ha IVA previst.</p>
      <b-table
        v-else
        :data="expectedVatQuarters"
        :striped="true"
      >
        <b-table-column label="Any" field="year" v-slot="props">
          {{ props.row.year }}
        </b-table-column>
        <b-table-column label="Trimestre" field="quarter" v-slot="props">
          T{{ props.row.quarter }}
        </b-table-column>
        <b-table-column label="IVA repercutit" numeric v-slot="props" class="has-text-right">
          {{ formatPrice(props.row.received) }} €
        </b-table-column>
        <b-table-column label="IVA suportat" numeric v-slot="props" class="has-text-right">
          {{ formatPrice(props.row.paid) }} €
        </b-table-column>
        <b-table-column label="% deduïble" numeric v-slot="props" class="has-text-right">
          {{ pct(props.row.deductible_pct) }}
        </b-table-column>
        <b-table-column label="IVA deduïble" numeric v-slot="props" class="has-text-right">
          {{ formatPrice(props.row.deductible_paid) }} €
        </b-table-column>
        <b-table-column label="Saldo del trimestre" numeric v-slot="props" class="has-text-right">
          <span :class="props.row.quarterBalance < 0 ? 'has-text-danger' : 'has-text-success'">
            {{ formatPrice(props.row.quarterBalance) }} €
          </span>
        </b-table-column>
        <b-table-column label="Saldo acumulat" numeric v-slot="props" class="has-text-right">
          <span :class="props.row.cumulativeBalance < 0 ? 'has-text-danger has-text-weight-bold' : 'has-text-success'">
            {{ formatPrice(props.row.cumulativeBalance) }} €
          </span>
        </b-table-column>
        <b-table-column label="A pagar" numeric v-slot="props" class="has-text-right">
          <span v-if="props.row.willCreateEntry" class="has-text-weight-bold has-text-danger">
            {{ formatPrice(props.row.paymentAmount) }} €
          </span>
          <span v-else class="has-text-grey-light">
            (es traspassa)
          </span>
        </b-table-column>
        <b-table-column label="Data de pagament" field="paymentDate" v-slot="props">
          <span v-if="props.row.willCreateEntry" class="has-text-weight-bold">
            {{ props.row.paymentDate }}
          </span>
          <span v-else class="has-text-grey-light">-</span>
        </b-table-column>
      </b-table>
    </section>

    <section v-show="vatView === 'expected-documents'" class="a-box list-box">
      <p class="box-hint list-hint">Despeses i ingressos definits als projectes però encara sense factura: és l'apartat «Previst».</p>
      <b-table
        :loading="isLoading"
        :paginated="false"
        :striped="false"
        :data="expectedDocumentsWithSearchableFields"
        ref="expectedDocumentsTable"
      >
        <b-table-column sortable searchable label="Projecte" field="project_name" v-slot="props">
          <router-link :to="`/project/${props.row.project_id}`">
            {{ props.row.project_name }}
          </router-link>
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
        <b-table-column sortable searchable label="Base" numeric field="total" v-slot="props" class="has-text-right">
          {{ formatPrice(props.row.total) }} €
        </b-table-column>
        <b-table-column sortable searchable label="% IVA" numeric field="vat_pct" v-slot="props" class="has-text-right">
          {{ pct(props.row.vat_pct) }}
        </b-table-column>
        <b-table-column sortable searchable label="IVA" numeric field="total_vat" v-slot="props" class="has-text-right">
          {{ formatPrice(props.row.total_vat) }} €
        </b-table-column>
      </b-table>
      <dl v-if="filteredExpectedDocuments.length > 0" class="vat-totals">
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
// import ModalBox from '@/components/ModalBox.vue'
import service from "@/service/index";
import moment from "moment";
import _ from "lodash";
import ModalBoxInvoicing from "./ModalBoxInvoicing.vue";
import CardComponent from "./CardComponent.vue";
import { mapState } from "pinia"
import { useMainStore } from "@/stores/main.js";
import MoneyFormat from "@/components/MoneyFormat.vue";
import { formatMoney, formatNumber } from "@/helpers/format-number";
import TreasuryAnnotationInput from "@/components/TreasuryAnnotationInput.vue";
import { loadKendo, waitForJQuery } from "@/helpers/addScript";
import getTreasuryData from "@/service/treasury";
import { format } from "@/helpers/excelFormatter";
import PivotViews from '@/components/PivotViews.vue'
import pivotViewsMixin from '@/mixins/pivotViewsMixin.js'
import { expectedVatQuarterRows, expectedVatTotals, vatPaymentDate } from '@/domain/expectedVat'

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
      vat_expected_by_quarter: {},
      vat_by_quarter: {},
      me: null,
      payingVat: false,
      view: "startOfYear",
      projectStates: [],
      selectedProjectStates: [],
      selectedYear: null,
      pivotIdentifier: 'tresoreria-pivot',
      checkedRows: [],
      vat_paid_date: new Date(),
      vatView: "documents",
    };
  },
  async mounted() {
    this.stopJQueryWait = waitForJQuery(async () => {
      await loadKendo();
      this.isLoading = false;
      this.vat_paid_date = moment().toDate();
      this.getInitialData();
    });
  },
  beforeUnmount() {
    this.stopJQueryWait();
  },
  computed: {
    // «Salda» needs ticked documents, whatever the balance (issues/340)
    canSettle() {
      return !this.payingVat && this.checkedRows.length > 0;
    },
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
    views() {
      return [
        { id: "documents", label: "Documents pendents", count: this.filteredDocuments.length },
        { id: "executed-quarters", label: "Trimestres executats", count: this.executedVatQuarters.length },
        { id: "expected-quarters", label: "Trimestres previstos", count: this.expectedVatQuarters.length },
        { id: "expected-documents", label: "Documents previstos", count: this.filteredExpectedDocuments.length }
      ];
    },
    ...mapState(useMainStore, ["userName", "user"]),
    treasuryDataDesc() {
      const treasuryDataOfYear = this.treasuryData.filter(d => String(d.datef || '').slice(0, 4) == this.selectedYear) // issues/136
      return _.reverse(treasuryDataOfYear)
    },
    documentsWithSearchableFields() {
      if (!this.vat || !this.vat.documents) return [];
      
      return this.vat.documents.map(doc => {
        const typeLabel = this.getTypeLabel(doc.type);
        const year = moment(doc.date, 'YYYY-MM-DD').format("YYYY");
        const quarter = `T${moment(doc.date, 'YYYY-MM-DD').format("Q")}`;
        // issues/209: `total` is the document total with VAT
        const base = doc.total_base != null ? doc.total_base : (doc.total || 0) - (doc.total_vat || 0);
        const supported = doc.type === 'received-invoices' || doc.type === 'received-expenses';

        return {
          ...doc,
          typeLabel,
          year,
          quarter,
          base,
          supported
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
          return sum + (doc.base || 0);
        }
        return sum;
      }, 0);
    },
    totalBaseRepercutit() {
      return this.filteredDocuments.reduce((sum, doc) => {
        if (doc.type === 'emitted-invoices' || doc.type === 'received-incomes') {
          return sum + (doc.base || 0);
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
    // lines dated before the current quarter: listed apart, not forecast (issues/072)
    outdatedExpectedDocuments() {
      return ((this.vat_expected && this.vat_expected.documents) || []).filter(doc => doc.outdated);
    },
    expectedDocumentsWithSearchableFields() {
      if (!this.vat_expected || !this.vat_expected.documents) return [];
      
      return this.vat_expected.documents.filter(doc => !doc.outdated).map(doc => {
        const typeLabel = doc.type === 'phase-expense' ? 'Despesa prevista' : 'Ingrés previst';
        const year = moment(doc.date, 'YYYY-MM-DD').format("YYYY");
        const quarter = `T${moment(doc.date, 'YYYY-MM-DD').format("Q")}`;
        const contactName = doc.type === 'phase-expense' ? doc.provider : doc.client;
        
        return {
          ...doc,
          typeLabel,
          year,
          quarter,
          contactName
        };
      });
    },
    filteredExpectedDocuments() {
      if (this.$refs.expectedDocumentsTable && this.$refs.expectedDocumentsTable.visibleData) {
        return this.$refs.expectedDocumentsTable.visibleData;
      }
      return this.expectedDocumentsWithSearchableFields || [];
    },
    totalExpectedBaseSuportat() {
      return this.filteredExpectedDocuments.reduce((sum, doc) => {
        if (doc.type === 'phase-expense') {
          return sum + (doc.total || 0);
        }
        return sum;
      }, 0);
    },
    totalExpectedBaseRepercutit() {
      return this.filteredExpectedDocuments.reduce((sum, doc) => {
        if (doc.type === 'phase-income') {
          return sum + (doc.total || 0);
        }
        return sum;
      }, 0);
    },
    totalExpectedVatSuportat() {
      return this.filteredExpectedDocuments.reduce((sum, doc) => {
        if (doc.type === 'phase-expense') {
          return sum + (doc.total_vat || 0);
        }
        return sum;
      }, 0);
    },
    totalExpectedVatRepercutit() {
      return this.filteredExpectedDocuments.reduce((sum, doc) => {
        if (doc.type === 'phase-income') {
          return sum + (doc.total_vat || 0);
        }
        return sum;
      }, 0);
    },
    totalExpectedVatDifference() {
      return this.totalExpectedVatSuportat - this.totalExpectedVatRepercutit;
    },
    executedVatQuarters() {
      if (!this.vat_by_quarter || Object.keys(this.vat_by_quarter).length === 0) return [];
      
      // Sort quarters chronologically (same logic as backend)
      const sortedQuarters = Object.keys(this.vat_by_quarter)
        .map(key => ({ key, ...this.vat_by_quarter[key] }))
        .sort((a, b) => {
          if (a.year !== b.year) return a.year - b.year;
          return a.quarter - b.quarter;
        });
      
      let cumulativeBalance = 0;
      const result = [];
      
      for (let qData of sortedQuarters) {
        const quarterBalance = qData.deductible_vat;
        cumulativeBalance += quarterBalance;
        
        // the quarter's model 303 deadline (issues/337)
        const paymentDate = vatPaymentDate(qData.year, qData.quarter);
        
        // Calculate average deductible percentage
        const avgDeductiblePct = qData.deductible_vat_pct_n > 0 
          ? (qData.deductible_vat_pct_sum / qData.deductible_vat_pct_n * 100).toFixed(2)
          : 0;
        
        result.push({
          year: qData.year,
          quarter: qData.quarter,
          received: qData.received,
          paid: qData.paid,
          deductible_paid: qData.deductible_paid,
          deductible_vat: qData.deductible_vat,
          deductible_pct: avgDeductiblePct,
          quarterBalance: quarterBalance,
          cumulativeBalance: cumulativeBalance,
          paymentAmount: cumulativeBalance < 0 ? cumulativeBalance : 0,
          paymentDate: paymentDate.format('DD/MM/YYYY'),
          willCreateEntry: cumulativeBalance < 0
        });
        
        // Reset cumulative balance after payment (same as backend)
        if (cumulativeBalance < 0) {
          cumulativeBalance = 0;
        }
      }
      
      return result;
    },
    expectedVatQuarters() {
      if (!this.vat_expected_by_quarter || !this.me || !this.me.options) return [];
      return expectedVatQuarterRows(this.vat_expected_by_quarter, this.me.options.deductible_vat_pct);
    },
  },
  methods: {
    // «97,96 %» (it printed «97.96 %» and «0,00%», issues/104)
    pct(value) {
      const n = Number(value);
      return `${formatNumber(isNaN(n) ? 0 : n, 2)} %`;
    },
    formatMoney,
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
      this.vat_expected_by_quarter = treasuryData.vat_expected_by_quarter || {};
      this.vat_by_quarter = treasuryData.vat_by_quarter || {};
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
      return value ? moment(value, "YYYY-MM-DD").format("DD/MM/YYYY") : "—";
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
.vat-settle-box {
  margin-bottom: 1rem;
}
.vat-settle-box .box-hint {
  max-width: 60rem;
  margin-bottom: .375rem;
}
.vat-views {
  margin-bottom: .75rem;
}
.vat-page .list-box .list-hint {
  padding: .875rem 1.25rem 0;
  margin-bottom: .75rem;
  max-width: 64rem;
}
.vat-page .list-box .notification.list-hint {
  margin: .75rem 1.25rem;
  padding: .75rem 1rem;
}
.vat-page .list-box .box-empty {
  padding: 1.5rem 1rem;
}
/* totals under the document tables */
.vat-totals {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: .5rem 2rem;
  margin: 0;
  padding: .875rem 1.25rem;
  border-top: 1px solid var(--a-line);
  font-variant-numeric: tabular-nums;
}
.vat-totals dt {
  font-size: .8125rem;
  color: var(--a-muted);
}
.vat-totals dd {
  margin: 0;
  font-weight: 700;
  text-align: right;
}
.vat-totals .is-total dd {
  font-weight: 800;
  font-size: 1.0625rem;
}
.vat-pending {
  width: 100%;
  margin-top: .75rem;
}
.vat-pending tbody th {
  font-weight: 800;
}
.vat-pending td {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.vat-pending .vat-balance {
  font-weight: 800;
}
.vat-settle {
  display: flex;
  align-items: center;
  gap: .5rem;
}
.vat-settle .datepicker {
  width: 10rem;
}

.treasury-table.b-table .table th,
.treasury-table.b-table td {
  min-width: 150px;
}
</style>