<template>
  <!-- IRPF (issues/348): what is paid to Hisenda, per quarter and document by
       document. «Salda» (issues/419): the documents ticked are settled on a
       date; one left out, or entered later, stays pending and goes into the
       next declaration. The same layout as IVA (issues/418). -->
  <div class="irpf-page tax-page">
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
      {{ earlier.count === 1 ? "té" : "tenen" }} l'IRPF pendent de saldar ({{ money(earlier.amount) }}).
      <a href="#" @click.prevent="goToYear(earlier.years[0])">Veure {{ earlier.years[0] }}</a>
    </p>

    <div class="doc-kpis">
      <div class="doc-kpi">
        <span>IRPF de l'any</span>
        <b>{{ money(totals.total) }}</b>
        <small>{{ data.rows.length }} {{ data.rows.length === 1 ? "document" : "documents" }}</small>
      </div>
      <div class="doc-kpi">
        <span>Saldat</span>
        <b>{{ money(totals.paid) }}</b>
        <small>pagat a Hisenda amb «Salda»</small>
      </div>
      <div class="doc-kpi">
        <span>Pendent de saldar</span>
        <b :class="totals.pending ? 'has-text-danger' : ''">{{ money(totals.pending) }}</b>
        <small v-if="totals.late" class="has-text-danger">{{ money(totals.late) }} fora de termini: a la propera declaració</small>
        <small v-else>{{ totals.pending_count || 0 }} {{ totals.pending_count === 1 ? "document" : "documents" }}</small>
      </div>
      <div class="doc-kpi">
        <span>Proper pagament</span>
        <b>{{ totals.next ? money(totals.next.amount) : "—" }}</b>
        <small>{{ totals.next ? date(totals.next.date) : "res pendent" }}</small>
      </div>
    </div>

    <section class="a-box list-box irpf-quarters">
      <header class="box-head">
        <h2>Per trimestre</h2>
        <span class="box-hint">Es paga el dia 20 del mes següent al trimestre (model 111). Tria un o més trimestres per veure'n el detall.</span>
      </header>
      <p v-if="!data.quarters.length" class="box-empty">No hi ha IRPF aquest any.</p>
      <div v-else class="table-wrap">
        <table class="table is-fullwidth irpf-table tax-quarters">
          <thead>
            <tr>
              <th scope="col">Trimestre</th>
              <th scope="col" class="has-text-right">Nòmines</th>
              <th scope="col" class="has-text-right">Factures i despeses</th>
              <th scope="col" class="has-text-right">Total</th>
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
              <th scope="row">T{{ q.quarter }} {{ q.year }}</th>
              <td class="has-text-right">{{ money(q.payrolls) }} <small class="has-text-muted">({{ q.payrolls_count }})</small></td>
              <td class="has-text-right">{{ money(q.documents) }} <small class="has-text-muted">({{ q.documents_count }})</small></td>
              <td class="has-text-right"><b>{{ money(q.total) }}</b></td>
              <td class="has-text-right">{{ q.pending ? money(q.pending) : "—" }}</td>
              <td>{{ date(q.deadline) }}</td>
              <td><span class="tag is-light" :class="statusOf(q).tag">{{ statusOf(q).label }}</span></td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="is-total">
              <th scope="row">Total</th>
              <td class="has-text-right">{{ money(quarterSum('payrolls')) }}</td>
              <td class="has-text-right">{{ money(quarterSum('documents')) }}</td>
              <td class="has-text-right"><b>{{ money(totals.total) }}</b></td>
              <td class="has-text-right">{{ money(totals.pending) }}</td>
              <td colspan="2"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>

    <div class="segmented irpf-kinds" role="tablist" aria-label="Origen">
      <button
        v-for="k in kindFilters"
        :key="String(k.id)"
        type="button"
        role="tab"
        :class="{ 'is-on': kind === k.id }"
        :aria-selected="kind === k.id ? 'true' : 'false'"
        @click="kind = k.id"
      >
        {{ k.label }}<span class="count">{{ countOf(k.id) }}</span>
      </button>
    </div>

    <settle-bar
      :count="checkedRows.length"
      :figures="checkedFigures"
      :outside="checkedOutside"
      :pending-in-view="pendingInView.length"
      :loading="settling"
      @settle="settle"
      @check-view="checkView"
      @clear="checkedRows = []"
    />

    <section class="a-box list-box">
      <header class="box-head">
        <h2>Detall{{ quarters.length ? ` del ${quartersLabel(quarters)}` : "" }}</h2>
        <span class="box-hint">Cada nòmina, factura i despesa rebuda amb retenció d'IRPF. Marca les pendents per saldar-les.</span>
      </header>
      <b-table
        v-model:checked-rows="checkedRows"
        :data="tableRows"
        :paginated="false"
        :striped="false"
        :checkable="true"
        :header-checkable="false"
        :is-row-checkable="isCheckable"
        :custom-is-checked="sameRow"
        custom-row-key="key"
        default-sort="date"
        class="irpf-documents"
      >
        <b-table-column sortable searchable label="Tipus" field="typeLabel" v-slot="props">
          {{ props.row.typeLabel }}
        </b-table-column>
        <b-table-column sortable searchable label="Document" field="code" v-slot="props">
          <router-link :to="props.row.to">{{ props.row.code }}</router-link>
        </b-table-column>
        <b-table-column sortable searchable label="Contacte / persona" field="contact" v-slot="props">
          {{ props.row.contact || "—" }}
        </b-table-column>
        <b-table-column sortable label="Data" field="date" v-slot="props">
          {{ date(props.row.date) }}
        </b-table-column>
        <b-table-column sortable label="Trim." field="quarter" v-slot="props">
          T{{ props.row.quarter }}
        </b-table-column>
        <b-table-column sortable numeric label="Base" field="base" v-slot="props">
          {{ money(props.row.base) }}
        </b-table-column>
        <b-table-column sortable numeric label="%" field="pct" v-slot="props">
          {{ props.row.pct === null ? "—" : pct(props.row.pct) }}
        </b-table-column>
        <b-table-column sortable numeric label="IRPF" field="irpf" v-slot="props">
          <b>{{ money(props.row.irpf) }}</b>
        </b-table-column>
        <b-table-column sortable label="Pagament" field="payment_date" v-slot="props">
          {{ date(props.row.payment_date) }}
        </b-table-column>
        <b-table-column sortable label="Estat" field="paid" v-slot="props">
          <span v-if="props.row.paid" class="tag is-success is-light">Saldat</span>
          <span v-else-if="props.row.late" class="tag is-danger is-light" :title="`Termini ${date(props.row.deadline)}: va a la propera declaració`">Pendent, fora de termini</span>
          <span v-else class="tag is-warning is-light">Pendent</span>
        </b-table-column>
        <template #empty>
          <p class="box-empty">No hi ha documents amb IRPF.</p>
        </template>
      </b-table>
      <dl v-if="tableRows.length" class="irpf-totals tax-totals">
        <div><dt>Documents de la llista</dt><dd>{{ rowsTotals.count }}</dd></div>
        <div><dt>Base</dt><dd>{{ money(rowsTotals.base) }}</dd></div>
        <div class="is-total"><dt>IRPF</dt><dd>{{ money(rowsTotals.irpf) }}</dd></div>
      </dl>
    </section>
  </div>
</template>

<script>
import moment from "moment";
import service from "@/service/index";
import { startLoad } from "@/domain/latestLoad.js";
import { formatMoney, formatNumber } from "@/helpers/format-number";
import { KIND_FILTERS, filterIrpfRows, irpfRowsTotals, kindLabel } from "@/domain/irpf.js";
import {
  STATUS_FILTERS, QUARTER_STATUS, IRPF_KINDS, quartersFromQuery, quartersLabel, toggleQuarter,
  filterByQuartersAndStatus, isCheckable, isSettled, sameRow, settlePayload, irpfTotals
} from "@/domain/taxSettle.js";
import QuarterToggle from "@/components/QuarterToggle.vue";
import SettleBar from "@/components/SettleBar.vue";

const EMPTY = {
  rows: [],
  quarters: [],
  totals: { total: 0, paid: 0, pending: 0, pending_count: 0, late: 0, next: null },
  earlier_pending: { count: 0, amount: 0, years: [] }
};

export default {
  name: "IrpfTable",
  components: { QuarterToggle, SettleBar },
  data() {
    const current = moment().year();
    // from Tresoreria's IRPF lines: «?any=2026&trimestre=3» (or «3,4»)
    const query = (this.$route && this.$route.query) || {};
    const queryYear = Number(query.any);
    const years = [current + 1, current, current - 1, current - 2, current - 3, current - 4];
    if (Number.isInteger(queryYear) && queryYear > 1900 && !years.includes(queryYear)) years.push(queryYear);
    return {
      isLoading: false,
      settling: false,
      year: years.includes(queryYear) ? queryYear : current,
      years,
      quarters: quartersFromQuery(query.trimestre),
      status: null,
      statusFilters: STATUS_FILTERS,
      kind: null,
      kindFilters: KIND_FILTERS,
      data: EMPTY,
      rows: [],
      checkedRows: []
    };
  },
  computed: {
    totals() {
      return this.data.totals;
    },
    earlier() {
      return this.data.earlier_pending || EMPTY.earlier_pending;
    },
    tableRows() {
      return filterIrpfRows(filterByQuartersAndStatus(this.rows, { quarters: this.quarters, status: this.status }), { kind: this.kind });
    },
    rowsTotals() {
      return irpfRowsTotals(this.tableRows);
    },
    pendingInView() {
      return this.tableRows.filter(isCheckable);
    },
    // the sum of what is ticked, not of what the filter shows (issues/418)
    checkedTotals() {
      return irpfTotals(this.checkedRows);
    },
    checkedFigures() {
      return [
        { label: "Base", value: this.money(this.checkedTotals.base) },
        { label: "IRPF a saldar", value: this.money(this.checkedTotals.irpf), total: true }
      ];
    },
    checkedOutside() {
      const shown = new Set(this.tableRows.map(r => r.key));
      return this.checkedRows.filter(r => !shown.has(r.key)).length;
    }
  },
  watch: {
    year() {
      this.quarters = [];
      this.checkedRows = [];
      this.load();
    },
    "$route.query"(query) {
      const year = Number(query && query.any);
      if (this.years.includes(year) && year !== this.year) this.year = year;
      this.$nextTick(() => { this.quarters = quartersFromQuery(query && query.trimestre); });
    }
  },
  mounted() {
    this.load();
  },
  methods: {
    isCheckable,
    sameRow,
    quartersLabel,
    money(value) {
      return formatMoney(value);
    },
    pct(value) {
      return formatNumber(value, 2) + " %";
    },
    date(value) {
      return value ? moment(value, "YYYY-MM-DD").format("DD/MM/YYYY") : "—";
    },
    statusOf(quarter) {
      return QUARTER_STATUS[quarter.status] || (quarter.paid ? QUARTER_STATUS.settled : QUARTER_STATUS.pending);
    },
    goToYear(year) {
      if (!this.years.includes(year)) this.years.push(year);
      this.year = year;
    },
    toggle(quarter) {
      this.quarters = toggleQuarter(this.quarters, quarter);
    },
    quarterSum(field) {
      return Math.round(this.data.quarters.reduce((s, q) => s + q[field], 0) * 100) / 100;
    },
    countOf(kind) {
      return filterIrpfRows(filterByQuartersAndStatus(this.rows, { quarters: this.quarters, status: this.status }), { kind }).length;
    },
    checkView() {
      const have = new Set(this.checkedRows.map(r => r.key));
      this.checkedRows = [...this.checkedRows, ...this.pendingInView.filter(r => !have.has(r.key))];
    },
    async settle(date) {
      const rows = this.checkedRows.filter(r => !isSettled(r));
      if (!rows.length) return;
      this.settling = true;
      try {
        const answer = (await service({ requiresAuth: true }).post("treasuries/irpf/settle", {
          ...settlePayload(rows, IRPF_KINDS),
          irpf_paid_date: moment(date).format("YYYY-MM-DD")
        })).data;
        this.$buefy.snackbar.open({
          message: `IRPF saldat: ${answer.count} ${answer.count === 1 ? "document" : "documents"}, ${this.money(answer.total)}`,
          queue: false
        });
        this.checkedRows = [];
        await this.load();
      } catch (err) {
        console.error(err);
        this.$buefy.snackbar.open({ message: "No s'ha pogut saldar l'IRPF", type: "is-danger", queue: false });
      } finally {
        this.settling = false;
      }
    },
    async load() {
      const isStale = startLoad(this);
      this.isLoading = true;
      try {
        const answer = (await service({ requiresAuth: true }).get(`treasuries/irpf?year=${this.year}`)).data;
        if (isStale()) return;
        this.data = answer && answer.rows ? { ...EMPTY, ...answer } : EMPTY;
        // labelled once: the same objects stay ticked whatever the filter
        this.rows = this.data.rows.map(r => ({ ...r, typeLabel: kindLabel(r) }));
      } finally {
        if (!isStale()) this.isLoading = false;
      }
    }
  }
};
</script>
<style scoped>
.irpf-page .doc-kpis {
  margin-bottom: 1rem;
}
.irpf-quarters {
  margin-bottom: 1rem;
}
.irpf-kinds {
  margin-bottom: .75rem;
}
.tax-earlier {
  margin-bottom: 1rem;
  padding: .75rem 1rem;
}
.irpf-table {
  margin: 0;
  font-variant-numeric: tabular-nums;
}
.irpf-table td,
.irpf-table th {
  white-space: nowrap;
  vertical-align: middle;
}
.irpf-table tr > :first-child {
  padding-left: 1.25rem;
}
.irpf-table tr > :last-child {
  padding-right: 1.25rem;
}
.irpf-table .is-clickable {
  cursor: pointer;
}
.irpf-table .is-selected-quarter {
  background: var(--a-chip);
}
.box-empty {
  padding: 1.5rem 1.25rem;
  color: var(--a-muted);
}
/* amounts and percentages on one line */
.irpf-documents :deep(td.has-text-right) {
  white-space: nowrap;
}
.irpf-totals {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: .5rem 2rem;
  margin: 0;
  padding: .875rem 1.25rem;
  border-top: 1px solid var(--a-line);
  font-variant-numeric: tabular-nums;
}
.irpf-totals dt {
  font-size: .8125rem;
  color: var(--a-muted);
}
.irpf-totals dd {
  margin: 0;
  font-weight: 700;
  text-align: right;
}
.irpf-totals .is-total dd {
  font-weight: 800;
  font-size: 1.0625rem;
}
</style>
