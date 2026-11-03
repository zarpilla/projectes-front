<template>
  <!-- Models 303 i 390 (Beta): the boxes of the AEAT VAT return per quarter
       and for the year, and the documents behind each box -->
  <div class="vat-models-page">
    <b-loading :is-full-page="true" v-model="isLoading" :can-cancel="false" />

    <div class="notification is-warning is-light beta-notice" role="note">
      <b>En proves (Beta).</b> Les xifres són orientatives, per contrastar-les amb la gestoria abans de presentar el model.
      ESSTrapis no presenta res a Hisenda.
    </div>

    <form class="filter-bar" role="search" aria-label="Filtres" @submit.prevent>
      <label class="filter-select">
        <span>Any</span>
        <b-select v-model="year" aria-label="Any">
          <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
        </b-select>
      </label>
      <div class="segmented vat-periods" role="tablist" aria-label="Període">
        <button
          v-for="p in periods"
          :key="String(p.id)"
          type="button"
          role="tab"
          :class="{ 'is-on': quarter === p.id }"
          :aria-selected="quarter === p.id ? 'true' : 'false'"
          @click="selectPeriod(p.id)"
        >
          {{ p.label }}
        </button>
      </div>
    </form>

    <div class="doc-kpis">
      <div class="doc-kpi">
        <span>{{ quarter ? `Resultat del T${quarter}` : "Resultat de l'any" }}</span>
        <b :class="boxes['71'] > 0 ? 'has-text-danger' : ''">{{ money(boxes['71']) }}</b>
        <small>{{ boxes['71'] > 0 ? "a ingressar" : boxes['71'] < 0 ? (quarter === 4 || !quarter ? "a compensar o retornar" : "a compensar") : "sense activitat" }}</small>
      </div>
      <div class="doc-kpi">
        <span>IVA meritat</span>
        <b>{{ money(boxes['27']) }}</b>
        <small>casella 27</small>
      </div>
      <div class="doc-kpi">
        <span>IVA deduïble</span>
        <b>{{ money(boxes['45']) }}</b>
        <small>casella 45{{ data.deductible_pct < 100 ? ` · prorrata ${data.deductible_pct} %` : "" }}</small>
      </div>
      <div class="doc-kpi">
        <span>{{ quarter ? "Termini" : "Model 390" }}</span>
        <b>{{ quarter ? date(deadline) : `30/01/${year + 1}` }}</b>
        <small>{{ quarter ? "per presentar el 303" : "resum anual" }}</small>
      </div>
    </div>

    <section v-if="issues.length" class="a-box list-box vat-issues">
      <header class="box-head">
        <h2>Per revisar</h2>
        <span class="box-hint">No són a cap casella: cal saber de quina operació es tracta. Tria'n una per veure els documents.</span>
      </header>
      <ul>
        <li v-for="i in issues" :key="i.code">
          <button type="button" class="vat-issue" :class="{ 'is-on': issue === i.code }" @click="selectIssue(i.code)">
            <b>{{ i.label }}</b>
            <span>{{ i.count }} {{ i.count === 1 ? "línia" : "línies" }} · base {{ money(i.base) }}</span>
            <small>{{ i.areas.map(a => `${a.label}: ${a.count}`).join(" · ") }}</small>
          </button>
          <p class="vat-issue-text">{{ i.text }}</p>
        </li>
      </ul>
    </section>

    <div class="vat-form">
      <section class="a-box list-box">
        <header class="box-head">
          <h2>IVA meritat</h2>
          <span class="box-hint">Factures emeses (sense esborranys) i ingressos</span>
        </header>
        <div class="table-wrap">
          <table class="table is-fullwidth vat-boxes">
            <thead>
              <tr><th scope="col"></th><th scope="col" class="has-text-right">Base</th><th scope="col" class="has-text-right">Quota</th></tr>
            </thead>
            <tbody>
              <tr v-for="r in accrued" :key="r.base" :class="{ 'is-missing': r.missing }">
                <th scope="row">{{ r.label }}<small v-if="r.missing" class="not-computed">no calculat</small></th>
                <td class="has-text-right"><box-value :box="r.base" :value="boxes[r.base]" :on="box" pickable @pick="selectBox" /></td>
                <td class="has-text-right"><box-value :box="r.vat" :value="boxes[r.vat]" :on="box" pickable @pick="selectBox" /></td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="is-total"><th scope="row">Total quota meritada</th><td></td><td class="has-text-right"><box-value box="27" :value="boxes['27']" /></td></tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section class="a-box list-box">
        <header class="box-head">
          <h2>IVA deduïble</h2>
          <span class="box-hint">Factures rebudes; les despeses (tiquets, dietes…) no compten</span>
        </header>
        <div class="table-wrap">
          <table class="table is-fullwidth vat-boxes">
            <thead>
              <tr><th scope="col"></th><th scope="col" class="has-text-right">Base</th><th scope="col" class="has-text-right">Quota</th></tr>
            </thead>
            <tbody>
              <tr v-for="r in deductible" :key="r.vat" :class="{ 'is-missing': r.missing }">
                <th scope="row">{{ r.label }}<small v-if="r.missing" class="not-computed">no calculat</small></th>
                <td class="has-text-right"><box-value v-if="r.base" :box="r.base" :value="boxes[r.base]" :on="box" pickable @pick="selectBox" /></td>
                <td class="has-text-right"><box-value :box="r.vat" :value="boxes[r.vat]" :on="box" pickable @pick="selectBox" /></td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="is-total"><th scope="row">Total a deduir</th><td></td><td class="has-text-right"><box-value box="45" :value="boxes['45']" /></td></tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section class="a-box list-box">
        <header class="box-head">
          <h2>{{ quarter ? "Resultat" : "Resultat (suma dels trimestres)" }}</h2>
        </header>
        <div class="table-wrap">
          <table class="table is-fullwidth vat-boxes">
            <tbody>
              <tr v-for="r in resultRows" :key="r.box" :class="{ 'is-total': r.total }">
                <th scope="row">{{ r.label }}</th>
                <td class="has-text-right"><box-value :box="r.box" :value="boxes[r.box]" :pct="r.pct" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-if="!quarter" class="a-box list-box">
        <header class="box-head">
          <h2>Volum d'operacions (390)</h2>
        </header>
        <div class="table-wrap">
          <table class="table is-fullwidth vat-boxes">
            <tbody>
              <tr>
                <th scope="row">Operacions en règim general</th>
                <td class="has-text-right"><box-value box="80" :value="boxes['80']" /></td>
              </tr>
              <tr class="is-missing">
                <th scope="row">Exemptes, no subjectes, intracomunitàries i exportacions<small class="not-computed">sense classificar</small></th>
                <td class="has-text-right">{{ money(boxes.unclassified_base) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <section class="a-box list-box">
      <header class="box-head">
        <h2>Detall{{ detailTitle }}</h2>
        <button v-if="box || issue" type="button" class="button is-small is-text" @click="clearDetail">Mostra-ho tot</button>
        <span v-else class="box-hint">Una fila per document i tipus d'IVA. Tria una casella per veure'n els documents.</span>
      </header>
      <b-table :data="tableRows" :paginated="tableRows.length > 50" :per-page="50" :striped="false" default-sort="date" class="vat-documents">
        <b-table-column sortable searchable label="Tipus" field="typeLabel" v-slot="props">
          {{ props.row.typeLabel }}
        </b-table-column>
        <b-table-column sortable searchable label="Document" field="code" v-slot="props">
          <router-link :to="props.row.to">{{ props.row.code || props.row.id }}</router-link>
        </b-table-column>
        <b-table-column sortable searchable label="Contacte" field="contact" v-slot="props">
          {{ props.row.contact || "—" }}
        </b-table-column>
        <b-table-column sortable searchable label="País" field="areaLabel" v-slot="props">
          <span :title="props.row.country">{{ props.row.areaLabel }}</span>
        </b-table-column>
        <b-table-column sortable label="Data" field="date" v-slot="props">
          {{ date(props.row.date) }}
        </b-table-column>
        <b-table-column sortable numeric label="% IVA" field="rate" v-slot="props">
          {{ props.row.rate }} %
        </b-table-column>
        <b-table-column sortable numeric label="Base" field="base" v-slot="props">
          {{ money(props.row.base) }}
        </b-table-column>
        <b-table-column sortable numeric label="IVA" field="vat" v-slot="props">
          {{ money(props.row.vat) }}
        </b-table-column>
        <b-table-column sortable numeric label="Al model" field="returnVat" v-slot="props">
          <b>{{ money(props.row.returnVat) }}</b>
          <small v-if="props.row.base_box && props.row.side === 'received' && props.row.deductible_pct < 100" class="has-text-muted"> ({{ props.row.deductible_pct }} %)</small>
        </b-table-column>
        <b-table-column sortable label="Caselles" field="boxesLabel" v-slot="props">
          <span v-if="props.row.boxesLabel">{{ props.row.boxesLabel }}</span>
          <span v-else-if="props.row.issue" class="tag is-warning is-light">Per revisar</span>
          <span v-else class="tag is-light">Fora del 303</span>
        </b-table-column>
        <template #empty>
          <p class="box-empty">No hi ha documents.</p>
        </template>
      </b-table>
      <dl v-if="tableRows.length" class="vat-totals">
        <div><dt>Files</dt><dd>{{ rowsTotals.count }}</dd></div>
        <div><dt>Base</dt><dd>{{ money(rowsTotals.base) }}</dd></div>
        <div class="is-total"><dt>IVA al model</dt><dd>{{ money(rowsTotals.vat) }}</dd></div>
      </dl>
    </section>

    <section v-if="data.notes && data.notes.length" class="a-box list-box vat-notes">
      <header class="box-head"><h2>Com es calcula</h2></header>
      <ul>
        <li v-for="n in data.notes" :key="n.code">
          {{ n.text }}
          <span v-if="n.count" class="has-text-muted">({{ n.count }} {{ n.count === 1 ? "document" : "documents" }}, IVA {{ money(n.vat) }})</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<script>
import moment from "moment";
import service from "@/service/index";
import { startLoad } from "@/domain/latestLoad.js";
import { formatMoney } from "@/helpers/format-number";
import VatBoxValue from "@/components/VatBoxValue.vue";
import {
  ACCRUED, DEDUCTIBLE, RESULT, AREA_LABELS, KIND_LABELS, ISSUE_LABELS,
  periodBoxes, filterVatRows, periodIssues, rowVat, vatRowsTotals
} from "@/domain/vatModels.js";

const EMPTY = { quarters: [], annual: {}, issues: [], notes: [], rows: [], deductible_pct: 100 };

export default {
  name: "VatModelsTable",
  components: { BoxValue: VatBoxValue },
  data() {
    const current = moment().year();
    return {
      isLoading: false,
      year: current,
      years: [current + 1, current, current - 1, current - 2, current - 3],
      // the quarter now, or the year for 390
      quarter: moment().quarter(),
      box: null,
      issue: null,
      periods: [
        { id: 1, label: "T1" }, { id: 2, label: "T2" }, { id: 3, label: "T3" }, { id: 4, label: "T4" },
        { id: null, label: "Any (390)" }
      ],
      accrued: ACCRUED,
      deductible: DEDUCTIBLE,
      data: EMPTY
    };
  },
  computed: {
    boxes() {
      return periodBoxes(this.data, this.quarter);
    },
    resultRows() {
      // the year sums the results; the compensations are a quarter's
      return this.quarter ? RESULT : RESULT.filter(r => !["110", "78", "87", "69"].includes(r.box));
    },
    deadline() {
      const q = this.data.quarters.find(x => x.quarter === this.quarter);
      return q ? q.deadline : null;
    },
    issues() {
      return periodIssues(this.data, this.data.rows, this.quarter);
    },
    detailTitle() {
      const period = this.quarter ? ` del T${this.quarter}` : ` de l'any`;
      if (this.box) return `${period} · casella ${this.box}`;
      if (this.issue) return `${period} · ${ISSUE_LABELS[this.issue]}`;
      return period;
    },
    tableRows() {
      return filterVatRows(this.data.rows, { quarter: this.quarter, box: this.box, issue: this.issue }).map(r => ({
        ...r,
        typeLabel: KIND_LABELS[r.kind] || r.kind,
        areaLabel: AREA_LABELS[r.area] || r.area,
        returnVat: r.base_box ? rowVat(r) : 0,
        boxesLabel: r.base_box ? `${r.base_box} / ${r.vat_box}` : ""
      }));
    },
    rowsTotals() {
      return vatRowsTotals(this.tableRows.filter(r => r.base_box));
    }
  },
  watch: {
    year() {
      this.clearDetail();
      this.load();
    }
  },
  mounted() {
    this.load();
  },
  methods: {
    money(value) {
      return formatMoney(value || 0);
    },
    date(value) {
      return value ? moment(value, "YYYY-MM-DD").format("DD/MM/YYYY") : "—";
    },
    selectPeriod(id) {
      this.quarter = id;
      this.clearDetail();
    },
    selectBox(box) {
      this.issue = null;
      this.box = this.box === box ? null : box;
    },
    selectIssue(code) {
      this.box = null;
      this.issue = this.issue === code ? null : code;
    },
    clearDetail() {
      this.box = null;
      this.issue = null;
    },
    async load() {
      const isStale = startLoad(this);
      this.isLoading = true;
      try {
        const answer = (await service({ requiresAuth: true }).get(`treasuries/vat-models?year=${this.year}`)).data;
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
.beta-notice {
  margin-bottom: 1rem;
}
.vat-models-page .doc-kpis {
  margin-bottom: 1rem;
}
.vat-periods {
  align-self: flex-end;
}
.vat-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 28rem), 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}
.vat-form .a-box {
  margin: 0;
}
.vat-boxes {
  margin: 0;
  font-variant-numeric: tabular-nums;
}
.vat-boxes th,
.vat-boxes td {
  vertical-align: middle;
}
.vat-boxes tbody th {
  font-weight: 500;
}
.vat-boxes tr > :first-child {
  padding-left: 1.25rem;
}
.vat-boxes tr > :last-child {
  padding-right: 1.25rem;
  white-space: nowrap;
}
.vat-boxes .is-missing th,
.vat-boxes .is-missing td {
  color: var(--a-muted);
}
.vat-boxes .is-total th,
.vat-boxes .is-total td {
  font-weight: 800;
}
.not-computed {
  margin-left: .5rem;
  font-size: .75rem;
  font-style: italic;
}
.vat-issues,
.vat-notes {
  margin-bottom: 1rem;
}
.vat-issues ul,
.vat-notes ul {
  margin: 0;
  padding: .75rem 1.25rem 1rem;
}
.vat-issues li + li {
  margin-top: .75rem;
}
.vat-issue {
  display: flex;
  flex-wrap: wrap;
  gap: .25rem 1rem;
  align-items: baseline;
  width: 100%;
  padding: .5rem .75rem;
  border: 1px solid var(--a-line);
  border-radius: 8px;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.vat-issue.is-on {
  background: var(--a-chip);
}
.vat-issue small {
  color: var(--a-muted);
}
.vat-issue-text {
  margin: .25rem 0 0 .75rem;
  font-size: .8125rem;
  color: var(--a-muted);
}
.vat-notes li {
  list-style: disc;
  margin-left: 1rem;
  font-size: .875rem;
}
.box-empty {
  padding: 1.5rem 1.25rem;
  color: var(--a-muted);
}
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
</style>
