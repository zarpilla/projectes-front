<template>
  <!-- IRPF (issues/348): like IVA without settling — what is paid to Hisenda,
       per quarter and document by document -->
  <div class="irpf-page">
    <b-loading :is-full-page="true" v-model="isLoading" :can-cancel="false" />

    <form class="filter-bar" role="search" aria-label="Filtres" @submit.prevent>
      <label class="filter-select">
        <span>Any</span>
        <b-select v-model="year" aria-label="Any">
          <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
        </b-select>
      </label>
      <label class="filter-select">
        <span>Trimestre</span>
        <b-select v-model="quarter" aria-label="Trimestre">
          <option :value="null">Tots</option>
          <option v-for="q in [1, 2, 3, 4]" :key="q" :value="q">T{{ q }}</option>
        </b-select>
      </label>
    </form>

    <div class="doc-kpis">
      <div class="doc-kpi">
        <span>IRPF de l'any</span>
        <b>{{ money(totals.total) }}</b>
        <small>{{ data.rows.length }} {{ data.rows.length === 1 ? "document" : "documents" }}</small>
      </div>
      <div class="doc-kpi">
        <span>Pagat</span>
        <b>{{ money(totals.paid) }}</b>
        <small>nòmines pagades i factures amb la data passada</small>
      </div>
      <div class="doc-kpi">
        <span>Pendent</span>
        <b :class="totals.pending ? 'has-text-danger' : ''">{{ money(totals.pending) }}</b>
        <small v-if="totals.overdue" class="has-text-danger">{{ money(totals.overdue) }} endarrerit (nòmines sense pagar)</small>
        <small v-else>a pagar a Hisenda</small>
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
        <span class="box-hint">Es paga el dia 20 del mes següent al trimestre (model 111). Tria un trimestre per veure'n el detall.</span>
      </header>
      <p v-if="!data.quarters.length" class="box-empty">No hi ha IRPF aquest any.</p>
      <div v-else class="table-wrap">
        <table class="table is-fullwidth irpf-table">
          <thead>
            <tr>
              <th scope="col">Trimestre</th>
              <th scope="col" class="has-text-right">Nòmines</th>
              <th scope="col" class="has-text-right">Factures i despeses</th>
              <th scope="col" class="has-text-right">Total</th>
              <th scope="col">Data de pagament</th>
              <th scope="col">Estat</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="q in data.quarters"
              :key="q.quarter"
              class="is-clickable"
              :class="{ 'is-selected-quarter': quarter === q.quarter }"
              @click="quarter = quarter === q.quarter ? null : q.quarter"
            >
              <th scope="row">T{{ q.quarter }} {{ q.year }}</th>
              <td class="has-text-right">{{ money(q.payrolls) }} <small class="has-text-muted">({{ q.payrolls_count }})</small></td>
              <td class="has-text-right">{{ money(q.documents) }} <small class="has-text-muted">({{ q.documents_count }})</small></td>
              <td class="has-text-right"><b>{{ money(q.total) }}</b></td>
              <td>{{ q.payment_dates.map(date).join(", ") }}</td>
              <td>
                <span v-if="q.paid" class="tag is-success is-light">Pagat</span>
                <span v-else class="tag is-warning is-light">Pendent</span>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="is-total">
              <th scope="row">Total</th>
              <td class="has-text-right">{{ money(quarterSum('payrolls')) }}</td>
              <td class="has-text-right">{{ money(quarterSum('documents')) }}</td>
              <td class="has-text-right"><b>{{ money(totals.total) }}</b></td>
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

    <section class="a-box list-box">
      <header class="box-head">
        <h2>Detall{{ quarter ? ` del T${quarter}` : "" }}</h2>
        <span class="box-hint">Cada nòmina, factura i despesa rebuda amb retenció d'IRPF</span>
      </header>
      <b-table :data="tableRows" :paginated="false" :striped="false" default-sort="date" class="irpf-documents">
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
          <span v-if="props.row.paid" class="tag is-success is-light">Pagat</span>
          <span v-else class="tag is-warning is-light">Pendent</span>
        </b-table-column>
        <template #empty>
          <p class="box-empty">No hi ha documents amb IRPF.</p>
        </template>
      </b-table>
      <dl v-if="tableRows.length" class="irpf-totals">
        <div><dt>Documents</dt><dd>{{ rowsTotals.count }}</dd></div>
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

const EMPTY = { rows: [], quarters: [], totals: { total: 0, paid: 0, pending: 0, next: null } };

export default {
  name: "IrpfTable",
  data() {
    const current = moment().year();
    // from Tresoreria's IRPF lines: «?any=2026&trimestre=3»
    const query = (this.$route && this.$route.query) || {};
    const queryYear = Number(query.any);
    const queryQuarter = Number(query.trimestre);
    const years = [current + 1, current, current - 1, current - 2, current - 3, current - 4];
    if (Number.isInteger(queryYear) && queryYear > 1900 && !years.includes(queryYear)) years.push(queryYear);
    return {
      isLoading: false,
      year: years.includes(queryYear) ? queryYear : current,
      years,
      quarter: [1, 2, 3, 4].includes(queryQuarter) ? queryQuarter : null,
      kind: null,
      kindFilters: KIND_FILTERS,
      data: EMPTY
    };
  },
  computed: {
    totals() {
      return this.data.totals;
    },
    tableRows() {
      return filterIrpfRows(this.data.rows, { quarter: this.quarter, kind: this.kind })
        .map(r => ({ ...r, typeLabel: kindLabel(r) }));
    },
    rowsTotals() {
      return irpfRowsTotals(this.tableRows);
    }
  },
  watch: {
    year() {
      this.quarter = null;
      this.load();
    },
    "$route.query"(query) {
      const year = Number(query && query.any);
      const quarter = Number(query && query.trimestre);
      if (this.years.includes(year) && year !== this.year) this.year = year;
      this.$nextTick(() => { this.quarter = [1, 2, 3, 4].includes(quarter) ? quarter : null; });
    }
  },
  mounted() {
    this.load();
  },
  methods: {
    money(value) {
      return formatMoney(value);
    },
    pct(value) {
      return formatNumber(value, 2) + " %";
    },
    date(value) {
      return value ? moment(value, "YYYY-MM-DD").format("DD/MM/YYYY") : "—";
    },
    quarterSum(field) {
      return Math.round(this.data.quarters.reduce((s, q) => s + q[field], 0) * 100) / 100;
    },
    countOf(kind) {
      return filterIrpfRows(this.data.rows, { quarter: this.quarter, kind }).length;
    },
    async load() {
      const isStale = startLoad(this);
      this.isLoading = true;
      try {
        const answer = (await service({ requiresAuth: true }).get(`treasuries/irpf?year=${this.year}`)).data;
        if (isStale()) return;
        this.data = answer && answer.rows ? answer : EMPTY;
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
