<template>
  <!-- IVA › «Saldo i documents» (issues/418), laid out like IRPF: a year, one
       or several quarters, the documents settled («Salda») or pending, and
       the sum of the documents ticked to settle, whatever the filter shows.
       The forecast is the «Previst» view (VatForecast.vue). -->
  <div class="vat-page tax-page">
    <b-loading :is-full-page="true" v-model="isLoading" :can-cancel="false" />

    <form class="filter-bar" role="search" aria-label="Filtres" @submit.prevent>
      <label class="filter-select">
        <span>Any</span>
        <b-select v-model="year" aria-label="Any">
          <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
        </b-select>
      </label>
      <quarter-toggle v-model="quarters" />
      <label class="filter-select">
        <span>Estat</span>
        <b-select v-model="status" aria-label="Estat">
          <option v-for="s in statusFilters" :key="String(s.id)" :value="s.id">{{ s.label }}</option>
        </b-select>
      </label>
    </form>

    <p v-if="earlier.count" class="notification is-warning is-light tax-earlier">
      {{ earlier.count }} {{ earlier.count === 1 ? "document" : "documents" }} de {{ earlier.years.join(", ") }}
      {{ earlier.count === 1 ? "té" : "tenen" }} l'IVA pendent de saldar (saldo {{ formatMoney(earlier.balance) }}).
      <a href="#" @click.prevent="goToYear(earlier.years[0])">Veure {{ earlier.years[0] }}</a>
    </p>

    <div class="doc-kpis">
      <div class="doc-kpi">
        <span>IVA repercutit</span>
        <b>{{ formatMoney(totals.received) }}</b>
        <small>de factures emeses i ingressos</small>
      </div>
      <div class="doc-kpi">
        <span>IVA suportat</span>
        <b>{{ formatMoney(totals.paid) }}</b>
        <small>{{ formatMoney(totals.deductible_paid) }} deduïble</small>
      </div>
      <div class="doc-kpi">
        <span>Saldo de l'any</span>
        <b :class="totals.balance < 0 ? 'has-text-danger' : ''">{{ formatMoney(totals.balance) }}</b>
        <small>{{ totals.balance < 0 ? "a pagar a Hisenda" : "a favor" }}</small>
      </div>
      <div class="doc-kpi">
        <span>Pendent de saldar</span>
        <b :class="totals.pending_balance < 0 ? 'has-text-danger' : ''">{{ formatMoney(totals.pending_balance) }}</b>
        <small>{{ totals.pending_count }} {{ totals.pending_count === 1 ? "document" : "documents" }}</small>
      </div>
    </div>

    <section class="a-box list-box vat-quarters">
      <header class="box-head">
        <h2>Per trimestre</h2>
        <span class="box-hint">Model 303: el dia 20 del mes següent al trimestre (el 30 de gener pel T4). Tria un o més trimestres per veure'n els documents.</span>
      </header>
      <p v-if="!data.quarters.length" class="box-empty">No hi ha documents amb IVA aquest any.</p>
      <div v-else class="table-wrap">
        <table class="table is-fullwidth vat-quarter-table tax-quarters">
          <thead>
            <tr>
              <th scope="col">Trimestre</th>
              <th scope="col" class="has-text-right">Repercutit</th>
              <th scope="col" class="has-text-right">Suportat</th>
              <th scope="col" class="has-text-right">Deduïble</th>
              <th scope="col" class="has-text-right">Saldo</th>
              <th scope="col" class="has-text-right">Pendent</th>
              <th scope="col">Termini</th>
              <th scope="col">Estat</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="q in data.quarters"
              :key="q.quarter"
              class="is-clickable"
              :class="{ 'is-selected-quarter': quarters.includes(q.quarter) }"
              :aria-selected="quarters.includes(q.quarter) ? 'true' : 'false'"
              @click="toggle(q.quarter)"
            >
              <th scope="row">T{{ q.quarter }} {{ q.year }} <small class="has-text-muted">({{ q.count }})</small></th>
              <td class="has-text-right">{{ formatMoney(q.received) }}</td>
              <td class="has-text-right">{{ formatMoney(q.paid) }}</td>
              <td class="has-text-right">{{ formatMoney(q.deductible_paid) }}</td>
              <td class="has-text-right" :class="q.balance < 0 ? 'has-text-danger' : ''"><b>{{ formatMoney(q.balance) }}</b></td>
              <td class="has-text-right">{{ q.pending_count ? formatMoney(q.pending_balance) : "—" }}</td>
              <td>{{ formatDate(q.payment_date) }}</td>
              <td><span class="tag is-light" :class="statusOf(q).tag">{{ statusOf(q).label }}</span></td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="is-total">
              <th scope="row">Total</th>
              <td class="has-text-right">{{ formatMoney(totals.received) }}</td>
              <td class="has-text-right">{{ formatMoney(totals.paid) }}</td>
              <td class="has-text-right">{{ formatMoney(totals.deductible_paid) }}</td>
              <td class="has-text-right"><b>{{ formatMoney(totals.balance) }}</b></td>
              <td class="has-text-right">{{ formatMoney(totals.pending_balance) }}</td>
              <td colspan="2"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>

    <div class="segmented vat-views" role="tablist" aria-label="Vista">
      <button
        v-for="v in views"
        :key="String(v.id)"
        type="button"
        role="tab"
        :class="{ 'is-on': view === v.id }"
        :aria-selected="view === v.id ? 'true' : 'false'"
        @click="view = v.id"
      >
        {{ v.label }}<span v-if="v.count !== undefined" class="count">{{ v.count }}</span>
      </button>
    </div>

    <vat-forecast v-if="view === 'forecast'" :me="me" />
    <template v-else>
      <!-- «Salda» books the balance as one «IVA Saldat» movement: only with a
           deductible % in Configuració, as the API (pay-vat-ids) -->
      <settle-bar
        v-if="hasDeductible"
        :count="checkedRows.length"
        :figures="checkedFigures"
        :outside="checkedOutside"
        :pending-in-view="pendingInView.length"
        :loading="payingVat"
        @settle="payVatIds"
        @check-view="checkView"
        @clear="checkedRows = []"
      />

      <section class="a-box list-box">
        <header class="box-head">
          <h2>Documents{{ quarters.length ? ` del ${quartersLabel(quarters)}` : "" }}</h2>
          <span class="box-hint">Factures i documents emesos o rebuts amb IVA, cobrats o no.{{ hasDeductible ? " Marca els pendents per saldar-los." : "" }}</span>
        </header>
        <b-table
          v-model:checked-rows="checkedRows"
          :loading="isLoading"
          :paginated="false"
          :striped="false"
          :data="tableRows"
          :checkable="hasDeductible"
          :header-checkable="false"
          :is-row-checkable="isCheckable"
          :custom-is-checked="sameRow"
          custom-row-key="key"
          default-sort="date"
          class="vat-documents"
        >
          <b-table-column sortable searchable label="Tipus" field="typeLabel" v-slot="props">
            {{ props.row.typeLabel }}
          </b-table-column>
          <b-table-column sortable searchable label="Document" field="code" v-slot="props">
            <router-link :to="props.row.to">{{ props.row.code }}</router-link>
          </b-table-column>
          <b-table-column sortable searchable label="Contacte" field="contact" v-slot="props">
            {{ props.row.contact || "—" }}
          </b-table-column>
          <b-table-column sortable label="Data" field="date" v-slot="props">
            {{ formatDate(props.row.date) }}
          </b-table-column>
          <b-table-column sortable label="Trim." field="quarter" v-slot="props">
            T{{ props.row.quarter }}
          </b-table-column>
          <b-table-column sortable numeric label="Base" field="base" v-slot="props">
            {{ formatMoney(props.row.base) }}
          </b-table-column>
          <b-table-column sortable numeric label="IVA" field="vat" v-slot="props">
            {{ formatMoney(props.row.vat) }}
          </b-table-column>
          <!-- only supported VAT is deductible (issues/209) -->
          <b-table-column sortable numeric label="% deduïble" field="deductible_pct" v-slot="props">
            <template v-if="props.row.supported">{{ pct(props.row.deductible_pct) }}</template>
            <span v-else class="has-text-grey-light">—</span>
          </b-table-column>
          <b-table-column sortable numeric label="Saldo" field="balance" v-slot="props">
            <b :class="props.row.balance < 0 ? 'has-text-danger' : ''">{{ formatMoney(props.row.balance) }}</b>
          </b-table-column>
          <b-table-column sortable label="Estat" field="settled" v-slot="props">
            <span v-if="props.row.settled" class="tag is-success is-light">Saldat {{ formatDate(props.row.settled_date) }}</span>
            <span v-else class="tag is-warning is-light">Pendent</span>
          </b-table-column>
          <template #empty>
            <p class="box-empty">No hi ha documents amb IVA.</p>
          </template>
        </b-table>
        <dl v-if="tableRows.length" class="tax-totals vat-totals">
          <div><dt>Documents de la llista</dt><dd>{{ listTotals.count }}</dd></div>
          <div><dt>IVA repercutit</dt><dd>{{ formatMoney(listTotals.received) }}</dd></div>
          <div><dt>IVA suportat deduïble</dt><dd>{{ formatMoney(listTotals.deductible_paid) }}</dd></div>
          <div class="is-total"><dt>Saldo</dt><dd>{{ formatMoney(listTotals.balance) }}</dd></div>
        </dl>
      </section>
    </template>
  </div>
</template>

<script>
import moment from "moment";
import service from "@/service/index";
import { startLoad } from "@/domain/latestLoad.js";
import { formatMoney, formatNumber } from "@/helpers/format-number";
import {
  STATUS_FILTERS, QUARTER_STATUS, VAT_KINDS, VAT_SIDE_FILTERS, quartersFromQuery, quartersLabel, toggleQuarter,
  filterByQuartersAndStatus, filterVatSide, isCheckable, isSettled, sameRow, settlePayload, vatTotals, vatKindLabel
} from "@/domain/taxSettle.js";
import QuarterToggle from "@/components/QuarterToggle.vue";
import SettleBar from "@/components/SettleBar.vue";
import VatForecast from "@/components/VatForecast.vue";

const EMPTY = {
  rows: [],
  quarters: [],
  totals: { count: 0, received: 0, paid: 0, deductible_paid: 0, balance: 0, pending_count: 0, pending_balance: 0 },
  earlier_pending: { count: 0, balance: 0, years: [] }
};

export default {
  name: "VATTable",
  components: { QuarterToggle, SettleBar, VatForecast },
  data() {
    const current = moment().year();
    const query = (this.$route && this.$route.query) || {};
    const queryYear = Number(query.any);
    const years = [current + 1, current, current - 1, current - 2, current - 3, current - 4];
    if (Number.isInteger(queryYear) && queryYear > 1900 && !years.includes(queryYear)) years.push(queryYear);
    return {
      isLoading: false,
      payingVat: false,
      me: null,
      year: years.includes(queryYear) ? queryYear : current,
      years,
      quarters: quartersFromQuery(query.trimestre),
      status: null,
      statusFilters: STATUS_FILTERS,
      // null (Tot), charged, supported, or forecast
      view: null,
      data: EMPTY,
      rows: [],
      checkedRows: []
    };
  },
  computed: {
    // «Salda» needs ticked documents, whatever the balance (issues/340)
    canSettle() {
      return !this.payingVat && this.checkedRows.length > 0;
    },
    hasDeductible() {
      return !!(this.me && this.me.options && this.me.options.deductible_vat_pct > 0);
    },
    totals() {
      return this.data.totals;
    },
    earlier() {
      return this.data.earlier_pending || EMPTY.earlier_pending;
    },
    filtered() {
      return filterByQuartersAndStatus(this.rows, { quarters: this.quarters, status: this.status });
    },
    views() {
      return [
        ...VAT_SIDE_FILTERS.map(f => ({ ...f, count: filterVatSide(this.filtered, f.id).length })),
        { id: "forecast", label: "Previst" }
      ];
    },
    tableRows() {
      return filterVatSide(this.filtered, this.view === "forecast" ? null : this.view);
    },
    listTotals() {
      return vatTotals(this.tableRows);
    },
    pendingInView() {
      return this.tableRows.filter(isCheckable);
    },
    // the sum of what is ticked, not of what the filter shows (issues/418)
    checkedTotals() {
      return vatTotals(this.checkedRows);
    },
    checkedFigures() {
      const t = this.checkedTotals;
      return [
        { label: "Repercutit", value: formatMoney(t.received) },
        { label: "Suportat deduïble", value: formatMoney(t.deductible_paid) },
        { label: t.balance < 0 ? "Saldo a pagar" : "Saldo a favor", value: formatMoney(t.balance), total: true }
      ];
    },
    checkedOutside() {
      const shown = new Set(this.tableRows.map(r => r.key));
      return this.checkedRows.filter(r => !shown.has(r.key)).length;
    },
    payVatPayload() {
      return settlePayload(this.checkedRows, VAT_KINDS);
    }
  },
  watch: {
    year() {
      this.quarters = [];
      this.checkedRows = [];
      this.load();
    }
  },
  mounted() {
    this.loadMe();
    this.load();
  },
  methods: {
    isCheckable,
    sameRow,
    quartersLabel,
    formatMoney,
    // «97,96 %» (it printed «97.96 %» and «0,00%», issues/104)
    pct(value) {
      const n = Number(value);
      return `${formatNumber(isNaN(n) ? 0 : n, 2)} %`;
    },
    formatDate(value) {
      return value ? moment(value, "YYYY-MM-DD").format("DD/MM/YYYY") : "—";
    },
    statusOf(quarter) {
      return QUARTER_STATUS[quarter.status] || QUARTER_STATUS.pending;
    },
    toggle(quarter) {
      this.quarters = toggleQuarter(this.quarters, quarter);
    },
    goToYear(year) {
      if (!this.years.includes(year)) this.years.push(year);
      this.year = year;
    },
    checkView() {
      const have = new Set(this.checkedRows.map(r => r.key));
      this.checkedRows = [...this.checkedRows, ...this.pendingInView.filter(r => !have.has(r.key))];
    },
    async loadMe() {
      this.me = (await service({ requiresAuth: true }).get("me")).data;
    },
    async load() {
      const isStale = startLoad(this);
      this.isLoading = true;
      try {
        const answer = (await service({ requiresAuth: true }).get(`treasuries/vat?year=${this.year}`)).data;
        if (isStale()) return;
        this.data = answer && answer.rows ? { ...EMPTY, ...answer } : EMPTY;
        // labelled once: the same objects stay ticked whatever the filter
        this.rows = this.data.rows.map(r => ({ ...r, typeLabel: vatKindLabel(r) }));
      } finally {
        if (!isStale()) this.isLoading = false;
      }
    },
    async payVatIds(date) {
      if (!this.canSettle) return;
      const count = this.checkedRows.filter(r => !isSettled(r)).length;
      this.payingVat = true;
      try {
        await service({ requiresAuth: true }).post("emitted-invoices/pay-vat-ids", {
          ...this.payVatPayload,
          vat_paid_date: moment(date).format("YYYY-MM-DD")
        });
        this.$buefy.snackbar.open({ message: `IVA saldat: ${count} ${count === 1 ? "document" : "documents"}`, queue: false });
        this.checkedRows = [];
        await this.load();
      } catch (err) {
        console.error(err);
        this.$buefy.snackbar.open({ message: "No s'ha pogut saldar l'IVA", type: "is-danger", queue: false });
      } finally {
        this.payingVat = false;
      }
    }
  }
};
</script>
<style>
.vat-page .doc-kpis,
.vat-quarters {
  margin-bottom: 1rem;
}
.vat-views {
  margin-bottom: .75rem;
}
.tax-earlier {
  margin-bottom: 1rem;
  padding: .75rem 1rem;
}
.vat-page .box-empty {
  padding: 1.5rem 1.25rem;
  color: var(--a-muted);
}
.vat-quarter-table {
  margin: 0;
  font-variant-numeric: tabular-nums;
}
.vat-quarter-table td,
.vat-quarter-table th {
  white-space: nowrap;
  vertical-align: middle;
}
.vat-quarter-table tr > :first-child {
  padding-left: 1.25rem;
}
.vat-quarter-table tr > :last-child {
  padding-right: 1.25rem;
}
.vat-quarter-table .is-clickable {
  cursor: pointer;
}
.vat-quarter-table .is-selected-quarter {
  background: var(--a-chip);
}
/* amounts and percentages on one line */
.vat-documents td.has-text-right {
  white-space: nowrap;
}
/* totals under the document tables */
.tax-totals {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: .5rem 2rem;
  margin: 0;
  padding: .875rem 1.25rem;
  border-top: 1px solid var(--a-line);
  font-variant-numeric: tabular-nums;
}
.tax-totals dt {
  font-size: .8125rem;
  color: var(--a-muted);
}
.tax-totals dd {
  margin: 0;
  font-weight: 700;
  text-align: right;
}
.tax-totals .is-total dd {
  font-weight: 800;
  font-size: 1.0625rem;
}
</style>
