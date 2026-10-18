<template>
  <div class="price-hour">
    <b-loading :is-full-page="true" v-model="isLoading" :can-cancel="false"></b-loading>

    <!-- Redesign A: figures, how it is computed, price distribution, overhead
         projects and the table per project. Figures: domain/pricePerHour. -->
    <div class="doc-kpis">
      <div class="doc-kpi">
        <span>Preu hora</span>
        <b>{{ money(result.totals.price) }}/h</b>
        <small>Mitjana de la cooperativa, amb un {{ marginText }} % de marge</small>
      </div>
      <div class="doc-kpi">
        <span>Despeses directes</span>
        <b>{{ money(result.totals.direct) }}</b>
        <small>{{ withExpenses.length }} projectes · inclou el cost laboral</small>
      </div>
      <div class="doc-kpi">
        <span>Despeses indirectes</span>
        <b>{{ money(result.totals.indirect) }}</b>
        <small>{{ result.overhead.length }} {{ result.overhead.length === 1 ? "projecte d'estructura" : "projectes d'estructura" }} · {{ percent(result.totals.overheadRate) }} sobre les directes</small>
      </div>
      <div class="doc-kpi">
        <span>Hores productives</span>
        <b>{{ number(result.totals.hours) }} h</b>
        <small>Hores {{ dataType === "Previsió" ? "previstes" : "fetes" }} als projectes</small>
      </div>
    </div>

    <div class="notification is-info how-box">
      <p><b>Com es calcula.</b> Preu hora = (despeses directes + despeses indirectes) × (1 + marge) ÷ hores productives</p>
      <p class="how-numbers">({{ money(result.totals.direct) }} + {{ money(result.totals.indirect) }}) × {{ number(1 + (Number(margin) || 0) / 100, 2) }} ÷ {{ number(result.totals.hours) }} h = <b>{{ money(result.totals.price) }}/h</b></p>
      <p class="how-note">Les indirectes (projectes marcats com a despeses d'estructura) es reparteixen entre projectes segons el seu pes en despeses directes.</p>
    </div>

    <div class="report-columns">
      <section class="report-box">
        <header class="report-box-head">
          <div>
            <h2>Distribució del preu hora</h2>
            <span class="has-text-muted">{{ priced.length }} projectes amb hores</span>
          </div>
        </header>
        <ul class="band-list">
          <li v-for="b in bands" :key="b.label">
            <span>{{ b.label }}</span>
            <span class="band-bar"><i :style="{ width: (b.count / maxBand * 100) + '%' }"></i></span>
            <b>{{ b.count }}</b>
          </li>
        </ul>
        <p v-if="withoutHours.length" class="report-note">
          {{ withoutHours.length }} projectes tenen despeses però cap hora {{ dataType === "Previsió" ? "prevista" : "feta" }} i no tenen preu hora.
        </p>
      </section>

      <section class="report-box">
        <header class="report-box-head">
          <div>
            <h2>Despeses d'estructura</h2>
            <span class="has-text-muted">D'on surten les indirectes</span>
          </div>
        </header>
        <table class="table is-fullwidth overhead-table">
          <tbody>
            <tr v-for="o in result.overhead" :key="o.id">
              <td>{{ o.name }}</td>
              <td class="has-text-right">{{ money(o.amount) }}</td>
            </tr>
            <tr v-if="!result.overhead.length">
              <td colspan="2" class="has-text-muted">Cap projecte marcat com a despeses d'estructura.</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <th>Total indirectes</th>
              <th class="has-text-right">{{ money(result.totals.indirect) }}</th>
            </tr>
          </tfoot>
        </table>
      </section>
    </div>

    <section class="report-box">
      <header class="report-box-head">
        <div>
          <h2>Per projecte</h2>
          <span class="has-text-muted">Ordenats per despeses directes</span>
        </div>
        <b-checkbox v-model="hideEmpty">Amaga els {{ withoutExpenses.length }} projectes sense despeses</b-checkbox>
      </header>
      <div class="table-wrap">
        <table class="table is-fullwidth price-table">
          <thead>
            <tr>
              <th>Projecte</th>
              <th class="has-text-right">Despeses directes</th>
              <th class="has-text-right">% indirectes</th>
              <th class="has-text-right">Despeses indirectes</th>
              <th class="has-text-right">Hores productives</th>
              <th class="has-text-right">Preu hora</th>
              <th class="price-bar-col"><span class="is-sr-only">Escala</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in shownRows" :key="r.id">
              <td>
                <router-link :to="{ name: 'project.edit', params: { id: r.id } }" class="doc-title">{{ r.name }}</router-link>
                <div v-if="r.scope || r.state" class="doc-subline">{{ [r.scope, r.state].filter(Boolean).join(" · ") }}</div>
              </td>
              <td class="has-text-right is-nowrap">{{ money(r.direct) }}</td>
              <td class="has-text-right is-nowrap">{{ percent(r.share, 2) }}</td>
              <td class="has-text-right is-nowrap">{{ money(r.indirect) }}</td>
              <td class="has-text-right is-nowrap">{{ number(r.hours) }} h</td>
              <td class="has-text-right is-nowrap">
                <template v-if="r.price !== null">{{ money(r.price) }}</template>
                <span v-if="!r.hours" class="tag is-warning">Sense hores</span>
                <span v-else-if="r.hours < FEW_HOURS" class="tag is-warning">Poques hores</span>
              </td>
              <td class="price-bar-col">
                <span v-if="r.price !== null" class="price-bar" :title="money(r.price) + '/h'">
                  <i :class="{ 'is-above': r.price > result.totals.price }" :style="{ width: Math.min(100, Math.max(0, r.price) / SCALE * 100) + '%' }"></i>
                </span>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <th>Total · {{ result.rows.length }} projectes</th>
              <th class="has-text-right is-nowrap">{{ money(result.totals.direct) }}</th>
              <th class="has-text-right">100 %</th>
              <th class="has-text-right is-nowrap">{{ money(result.totals.indirect) }}</th>
              <th class="has-text-right is-nowrap">{{ number(result.totals.hours) }} h</th>
              <th class="has-text-right is-nowrap">{{ money(result.totals.price) }}</th>
              <th></th>
            </tr>
          </tfoot>
        </table>
      </div>
      <div v-if="sortedRows.length > shownRows.length" class="report-more">
        <span class="has-text-muted">Mostrant {{ shownRows.length }} de {{ sortedRows.length }} projectes</span>
        <b-button size="is-small" @click="showAll = true">Mostra'ls tots</b-button>
      </div>
      <p class="report-note">La barra compara cada preu amb una escala fins a {{ SCALE }} €/h; en taronja, els preus per sobre de la mitjana ({{ money(result.totals.price) }}/h).</p>
    </section>
  </div>
</template>

<script>
import service from "@/service/index";
import sortBy from "lodash/sortBy";
import omit from "lodash/omit";
import moment from "moment";
import { mapState } from "pinia"
import { useMainStore } from "@/stores/main.js";
import { format } from "@/helpers/excelFormatter";
import _ from "lodash";
import { pricePerHour, priceBands } from "@/domain/pricePerHour";
import { fiscalPivotRows } from "@/domain/years";
import { formatNumber, formatMoney } from "@/helpers/format-number";

moment.locale("ca");

// rows of the table before "Mostra'ls tots"
const ROW_LIMIT = 20;

export default {
  name: "ProjectesPivot",
  components: {},
  props: {
    // ids of the project states to include
    projectStates: {
      type: Array,
      default: () => []
    },
    year: {
      type: [String, Number],
      default: null
    },
    dataType: {
      type: String,
      default: null
    },
    margin: {
      type: Number,
      default: 0
    },
    // first month of the fiscal year (Configuració general), 1 = calendar year
    startMonth: {
      type: Number,
      default: 1
    }
  },
  computed: {
    ...mapState(useMainStore, ["userName", "user"]),
    total_expense() {
      return this.dataType === "Previsió"
        ? 'total_expense_esti' : 'total_expense_real';
    },
    expense_vat() {
      return this.dataType === "Previsió"
        ? 'expense_esti_vat' : 'expense_real_vat';
    },
    total_hours() {
      return this.dataType === "Previsió"
        ? 'total_estimated_hours' : 'total_real_hours';
    },
    pivotDataGroupped() {
      return _(this.pivotData)
        .groupBy("id")
        .map((rows, id) => ({
          id: id,
          project_name: rows[0].project_name,
          project_scope: rows[0].project_scope,
          project_state: rows[0].project_state,
          structural_expenses: rows[0].structural_expenses,
          esti:
            (_.sumBy(rows, "income_esti") || 0) +
            (_.sumBy(rows, "expense_esti") || 0) +
            (_.sumBy(rows, "total_estimated_hours_price") || 0),
          real:
            (_.sumBy(rows, "income_real") || 0) +
            (_.sumBy(rows, "expense_real") || 0) +
            (_.sumBy(rows, "total_real_hours_price") || 0),
          income_esti: _.sumBy(rows, "income_esti") || 0,
          income_real: _.sumBy(rows, "income_real") || 0,
          total_expense_esti:
            (_.sumBy(rows, "expense_esti") || 0) +
            (_.sumBy(rows, "total_estimated_hours_price") || 0),
          total_expense_real:
            (_.sumBy(rows, "expense_real") || 0) +
            (_.sumBy(rows, "total_real_hours_price") || 0),
          expense_esti: _.sumBy(rows, "expense_esti") || 0,
          expense_esti_vat: _.sumBy(rows, "expense_esti_vat") || 0,
          expense_real: _.sumBy(rows, "expense_real") || 0,
          expense_real_vat: _.sumBy(rows, "expense_real_vat") || 0,
          total_estimated_hours_price:
            _.sumBy(rows, "total_estimated_hours_price") || 0,
          total_real_hours_price: _.sumBy(rows, "total_real_hours_price") || 0,
          total_estimated_hours: _.sumBy(rows, "total_estimated_hours") || 0,
          total_real_hours: _.sumBy(rows, "total_real_hours") || 0
        }))
        .value();
    },
    // pivotDataYearGroupped() {
    //   return _(
    //     this.pivotData.map(p => {
    //       return { ...p, py: `${p.id}.${p.year}` };
    //     })
    //   )
    //     .groupBy("py")
    //     .map((rows, py) => ({
    //       id: py.split(".")[0],
    //       year: py.split(".")[1],          
    //       project_name: rows[0].project_name,
    //       structural_expenses: rows[0].structural_expenses,
    //       esti:
    //         (_.sumBy(rows, "income_esti") || 0) +
    //         (_.sumBy(rows, "expense_esti") || 0) +
    //         (_.sumBy(rows, "total_estimated_hours_price") || 0),
    //       real:
    //         (_.sumBy(rows, "income_real") || 0) +
    //         (_.sumBy(rows, "expense_real") || 0) +
    //         (_.sumBy(rows, "total_real_hours_price") || 0),
    //       income_esti: _.sumBy(rows, "income_esti") || 0,
    //       income_real: _.sumBy(rows, "income_real") || 0,
    //       total_expense_esti:
    //         (_.sumBy(rows, "expense_esti") || 0) +
    //         (_.sumBy(rows, "total_estimated_hours_price") || 0),
    //       total_expense_real:
    //         (_.sumBy(rows, "expense_real") || 0) +
    //         (_.sumBy(rows, "total_real_hours_price") || 0),
    //       expense_esti: _.sumBy(rows, "expense_esti") || 0,
    //       expense_esti_vat: _.sumBy(rows, "expense_esti_vat") || 0,
    //       expense_real: _.sumBy(rows, "expense_real") || 0,
    //       expense_real_vat: _.sumBy(rows, "expense_real_vat") || 0,
    //       total_estimated_hours_price:
    //         _.sumBy(rows, "total_estimated_hours_price") || 0,
    //       total_real_hours_price: _.sumBy(rows, "total_real_hours_price") || 0,
    //       total_estimated_hours: _.sumBy(rows, "total_estimated_hours") || 0,
    //       total_real_hours: _.sumBy(rows, "total_real_hours") || 0
    //     }))
    //     .value();
    // },
    result() {
      return pricePerHour(
        this.pivotDataGroupped,
        { expense: this.total_expense, vat: this.expense_vat, hours: this.total_hours },
        this.margin
      );
    },
    marginText() {
      return formatNumber(Number(this.margin) || 0, 2);
    },
    withExpenses() {
      return this.result.rows.filter(r => Math.abs(r.direct) > 0.004);
    },
    withoutExpenses() {
      return this.result.rows.filter(r => !(Math.abs(r.direct) > 0.004));
    },
    priced() {
      return this.result.rows.filter(r => r.price !== null);
    },
    withoutHours() {
      return this.withExpenses.filter(r => !r.hours);
    },
    bands() {
      return priceBands(this.result.rows);
    },
    maxBand() {
      return Math.max(1, ...this.bands.map(b => b.count));
    },
    sortedRows() {
      const rows = this.hideEmpty ? this.withExpenses : this.result.rows;
      return [...rows].sort((a, b) => b.direct - a.direct);
    },
    shownRows() {
      return this.showAll ? this.sortedRows : this.sortedRows.slice(0, ROW_LIMIT);
    },
    IncomeTotal() {
      return _.sumBy(
        this.pivotDataGroupped.filter(p => p.structural_expenses !== true),
        p => p[this.total_expense] + p[this.expense_vat]
      );
    },
    StructuralTotal() {
      return _.sumBy(
        this.pivotDataGroupped.filter(p => p.structural_expenses),
        p => p[this.total_expense] + p[this.expense_vat]
      );
    },
    ExpenseTotal() {
      return _.sumBy(
        this.pivotDataGroupped.filter(p => p.structural_expenses !== true || p.structural_expenses === null),
        p => p[this.total_expense] + p[this.expense_vat]
      );
    },
    EstimatedHoursTotal() {
      return _.sumBy(this.pivotDataGroupped.filter(p => p.structural_expenses !== true || p.structural_expenses === null), p => p[this.total_hours]);
    },

    excelFields1() {
      const fields = {
        id: "id",
        project_name: "project_name",
        project_scope: "project_scope",
        project_state: "project_state",
        project_type: "project_type",
        project_leader: "project_leader",
        mother: "mother",
        type: "type",
        date: "date",
        year: "year",
        month: "month",
        paid: "paid",
        row_type: "row_type",
        income_esti: {
          field: "income_esti",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        income_real: {
          field: "income_real",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        expense_esti: {
          field: "expense_esti",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        expense_esti_vat: {
          field: "expense_esti_vat",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        expense_real: {
          field: "expense_real",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        expense_real_vat: {
          field: "expense_real_vat",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        total_estimated_hours_price: {
          field: "total_estimated_hours_price",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        total_real_hours_price: {
          field: "total_real_hours_price",
          callback: value => {
            return this.excelFormat(value);
          }
        }
      };
      if (this.dataType === "Previsió") {
        delete fields.income_real;
        delete fields.expense_real;
        delete fields.total_real_hours_price;
      } else if (this.dataType === "Execució") {
        delete fields.income_esti;
        delete fields.expense_esti;
        delete fields.total_estimated_hours_price;
      }
      return fields;
    },
    excelFields2() {
      const fields = {
        id: "id",
        project_name: "project_name",
        year: "year",
        "Resultat prev": {
          field: "esti",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Resultat exec": {
          field: "real",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Ingressos prev": {
          field: "income_esti",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Ingressos exec": {
          field: "income_real",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Despeses tot prev": {
          field: "total_expense_esti",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Despeses tot exec": {
          field: "total_expense_real",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Despeses prev": {
          field: "expense_esti",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Despeses prev iva": {
          field: "expense_esti_vat",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Despeses exec": {
          field: "expense_real",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Despeses exec iva": {
          field: "expense_real_vat",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Hores prev": {
          field: "total_estimated_hours_price",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Hores exec": {
          field: "total_real_hours_price",
          callback: value => {
            return this.excelFormat(value);
          }
        }
      };

      if (this.dataType === "Previsió") {
        delete fields["Resultat exec"];
        delete fields["Ingressos exec"];
        delete fields["Despeses tot exec"];
        delete fields["Despeses exec"];
        delete fields["Hores exec"];
      } else if (this.dataType === "Execució") {
        delete fields["Resultat prev"];
        delete fields["Ingressos prev"];
        delete fields["Despeses tot prev"];
        delete fields["Despeses prev"];
        delete fields["Hores prev"];
      }
      return fields;
    },
    excelFields3() {
      const fields = {
        id: "id",
        project_name: "project_name",
        "Resultat prev": {
          field: "esti",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Resultat exec": {
          field: "real",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Ingressos prev": {
          field: "income_esti",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Ingressos exec": {
          field: "income_real",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Despeses tot prev": {
          field: "total_expense_esti",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Despeses tot exec": {
          field: "total_expense_real",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Despeses prev": {
          field: "expense_esti",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Despeses exec": {
          field: "expense_real",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Hores prev": {
          field: "total_estimated_hours_price",
          callback: value => {
            return this.excelFormat(value);
          }
        },
        "Hores exec": {
          field: "total_real_hours_price",
          callback: value => {
            return this.excelFormat(value);
          }
        }
      };

      if (this.dataType === "Previsió") {
        delete fields["Resultat exec"];
        delete fields["Ingressos exec"];
        delete fields["Despeses tot exec"];
        delete fields["Despeses exec"];
        delete fields["Hores exec"];
      } else if (this.dataType === "Execució") {
        delete fields["Resultat prev"];
        delete fields["Ingressos prev"];
        delete fields["Despeses tot prev"];
        delete fields["Despeses prev"];
        delete fields["Hores prev"];
      }
      return fields;
    }
  },
  data() {
    return {
      isLoading: false,
      projects: [],
      projectsList: [],
      dedicationTypes: {},
      activityTypes: {},
      users: [],
      usersList: [],
      modalObjectName: "",
      userNameSearch: "",
      scopes: [],
      states: [],
      leaders: [],
      contacts: [],
      pivotData: [],
      hideEmpty: true,
      showAll: false,
      SCALE: 150,
      FEW_HOURS: 50
    };
  },
  watch: {
    projectStates: {
      handler() {
        this.getActivities();
      },
      deep: true
    },
    year: function(newVal, oldVal) {
      this.getActivities();
    },
    // dataType: function(newVal, oldVal) {
    //   this.getActivities();
    // }
  },
  mounted() {
    this.getActivities();
  },
  methods: {
    money(value) {
      return value === null || value === undefined || !Number.isFinite(value) ? "—" : formatMoney(value);
    },
    number(value, decimals = 2) {
      return formatNumber(Number(value) || 0, decimals, decimals);
    },
    percent(share, decimals = 1) {
      return formatNumber((Number(share) || 0) * 100, decimals, decimals) + " %";
    },
    async getActivities() {
      this.isLoading = true;
      if (!this.projectStates.length) {
        this.pivotData = [];
        this.isLoading = false;
        return;
      }
      const query = `projects/economic-detail?_where[project_state_in]=${this.projectStates.join(",")}&_limit=-1`;
      const yearQ = this.year !== "Tots" ? `&_where[year_eq]=${this.year}` : "";
      const { data } = await service({ requiresAuth: true }).get(query + yearQ);
      const data2 = data.map(c => {
        return omit(c, ["document"]);
      });
      this.pivotData = Object.freeze(fiscalPivotRows(sortBy(data2, ["project_name"]), this.startMonth));
      this.isLoading = false;
    },
    excelFormat(value) {
      return format(this.user, value);
    }
  },
};
</script>
<style>
.card-body {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--a-line-soft);
}
.is-activity {
  cursor: pointer;
}
.is-total {
  background: var(--a-chip);
  text-transform: capitalize;
}
.auxiliar {
  color: var(--a-muted);
}
.projects-bars {
  margin-bottom: 2rem;
}
.projects-bars progress {
  margin-top: 1rem;
}
.view-button {
  margin-left: 0.5rem;
}
.export-button {
  margin-top: 1rem;
}
</style>
<style scoped>
.how-box p + p {
  margin-top: .25rem;
}
.how-numbers {
  font-variant-numeric: tabular-nums;
}
.how-note {
  font-size: .8125rem;
  opacity: .85;
}
.report-columns {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  align-items: start;
  margin-bottom: 1rem;
}
.report-box {
  background: var(--a-surface);
  border: 1px solid var(--a-line);
  border-radius: 12px;
  overflow: hidden;
}
.report-box-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: .875rem 1.25rem;
  border-bottom: 1px solid var(--a-line);
}
.report-box-head h2 {
  font-size: 1rem;
  font-weight: 800;
}
.report-box-head span {
  font-size: .8125rem;
}
.band-list {
  padding: .75rem 1.25rem;
}
.band-list li {
  display: grid;
  grid-template-columns: 7rem minmax(0, 1fr) 2rem;
  align-items: center;
  gap: .75rem;
  padding: .25rem 0;
  font-size: .8125rem;
}
.band-list b {
  text-align: right;
}
.band-bar,
.price-bar {
  display: block;
  height: .5rem;
  border-radius: 999px;
  background: var(--a-chip);
  overflow: hidden;
}
.band-bar i,
.price-bar i {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: var(--a-accent);
}
.price-bar i.is-above {
  background: #D9480F;
}
.report-note {
  padding: .625rem 1.25rem .875rem;
  font-size: .8125rem;
  color: var(--a-muted);
  border-top: 1px solid var(--a-line-soft);
}
.overhead-table td,
.overhead-table th {
  font-size: .8125rem;
}
.overhead-table td:first-child,
.overhead-table th:first-child {
  padding-left: 1.25rem;
}
.overhead-table td:last-child,
.overhead-table th:last-child {
  padding-right: 1.25rem;
  white-space: nowrap;
}
.table-wrap {
  overflow-x: auto;
}
.price-table {
  font-variant-numeric: tabular-nums;
}
.price-table td:first-child {
  min-width: 16rem;
  max-width: 22rem;
}
.price-table td:first-child,
.price-table th:first-child {
  padding-left: 1.25rem;
}
.price-bar-col {
  width: 6rem;
  padding-right: 1.25rem !important;
}
.price-table .tag {
  margin-left: .375rem;
  font-size: .6875rem;
}
.report-more {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: .75rem 1.25rem;
  border-top: 1px solid var(--a-line-soft);
  font-size: .8125rem;
}
@media screen and (max-width: 1023px) {
  .report-columns {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
