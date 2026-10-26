<template>
  <!-- Bestretes of a month for everyone (issues/347) -->
  <section class="a-box list-box">
    <b-loading :is-full-page="false" v-model="isLoading" :can-cancel="false"></b-loading>
    <header class="box-head">
      <h2>Bestretes · {{ monthLabel }}</h2>
      <span class="box-hint">Les nòmines de totes les persones del mes</span>
    </header>
    <div v-if="!isLoading && !rows.length" class="empty-month">
      Cap persona té nòmina aquest mes. Les pots crear a Persones › «Crear bestretes» o triant una persona.
    </div>
    <div v-else class="table-wrap">
      <table class="table is-fullwidth salary-month-table">
        <thead>
          <tr>
            <th scope="col">Persona</th>
            <th scope="col" class="has-text-right">Net</th>
            <th scope="col" class="has-text-right">IRPF</th>
            <th scope="col" class="has-text-right">SS</th>
            <th scope="col" class="has-text-right">Altres</th>
            <th scope="col" class="has-text-right">Total</th>
            <th scope="col">Compte bancari</th>
            <th scope="col">Data pagament</th>
            <th scope="col">Nòmina</th>
            <th scope="col"><span class="is-sr-only">Accions</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id">
            <th scope="row">{{ row.person }}</th>
            <td class="has-text-right">{{ money(row.net) }}</td>
            <td class="has-text-right">{{ money(row.irpf) }}</td>
            <td class="has-text-right">{{ money(row.ss) }}</td>
            <td class="has-text-right">{{ money(row.other) }}</td>
            <td class="has-text-right">{{ money(row.total) }}</td>
            <!-- none of its own: Tresoreria pays it from the payroll account of the settings -->
            <td>
              <span v-if="row.bankAccount">{{ row.bankAccount }}</span>
              <span v-else class="has-text-muted" title="La nòmina no té compte: Tresoreria fa servir el compte de nòmines de la configuració">Compte de nòmines</span>
            </td>
            <td>{{ date(row.netDate) }}</td>
            <td>
              <span v-if="row.paid" class="tag is-success is-light">Pagada</span>
              <span v-else class="tag is-warning is-light">Per pagar</span>
            </td>
            <td>
              <div class="row-actions">
                <b-button
                  v-if="!row.paid"
                  size="is-small"
                  type="is-primary"
                  @click="pay(row)"
                >Paga</b-button>
                <b-button
                  size="is-small"
                  icon-left="eye"
                  title="Mostra la nòmina"
                  aria-label="Mostra la nòmina"
                  @click="view(row)"
                />
              </div>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="is-total">
            <th scope="row">Total ({{ rows.length }})</th>
            <td class="has-text-right">{{ money(totals.net) }}</td>
            <td class="has-text-right">{{ money(totals.irpf) }}</td>
            <td class="has-text-right">{{ money(totals.ss) }}</td>
            <td class="has-text-right">{{ money(totals.other) }}</td>
            <td class="has-text-right">{{ money(totals.total) }}</td>
            <td colspan="4"></td>
          </tr>
        </tfoot>
      </table>
    </div>
  </section>
</template>

<script>
import moment from "moment";
import service from "@/service/index";
import { startLoad } from "@/domain/latestLoad.js";
import { monthPayrollRows, monthPayrollTotals } from "@/domain/monthPayrolls.js";
import { formatMoney } from "@/helpers/format-number";

const MONTHS = ["gener", "febrer", "març", "abril", "maig", "juny", "juliol", "agost", "setembre", "octubre", "novembre", "desembre"];

export default {
  name: "DedicationSalaryMonth",
  props: {
    year: { type: Number, default: null },
    month: { type: Number, default: null }
  },
  data() {
    return { isLoading: false, rows: [] };
  },
  computed: {
    totals() {
      return monthPayrollTotals(this.rows);
    },
    monthLabel() {
      return `${MONTHS[this.month - 1] || ""} ${this.year || ""}`.trim();
    }
  },
  watch: {
    year() { this.load(); },
    month() { this.load(); }
  },
  mounted() {
    this.load();
  },
  methods: {
    money(value) {
      return formatMoney(value);
    },
    date(value) {
      return value ? moment(value, "YYYY-MM-DD").format("DD/MM/YYYY") : "—";
    },
    async load() {
      const isStale = startLoad(this);
      if (!this.year || !this.month) {
        this.rows = [];
        return;
      }
      this.isLoading = true;
      try {
        const payrolls = (
          await service({ requiresAuth: true }).get(
            `payrolls?_limit=-1&_where[year.year]=${this.year}&_where[month.month]=${this.month}`
          )
        ).data;
        if (isStale()) return;
        this.rows = monthPayrollRows(payrolls, this.year, this.month);
      } finally {
        if (!isStale()) this.isLoading = false;
      }
    },
    view(row) {
      const routeData = this.$router.resolve({
        name: "document.edit",
        params: { id: row.id, type: "payrolls" }
      });
      window.open(routeData.href, "_blank");
    },
    // as in a person's table: paid on the day it was emitted
    async pay(row) {
      await service({ requiresAuth: true }).put(`payrolls/${row.id}`, {
        paid: true,
        paid_date: row.emitted
      });
      await this.load();
    }
  }
};
</script>
<style scoped>
.list-box {
  position: relative;
}
.salary-month-table {
  margin: 0;
  font-variant-numeric: tabular-nums;
}
.salary-month-table td,
.salary-month-table th {
  vertical-align: middle;
  white-space: nowrap;
}
.salary-month-table tr > :first-child {
  padding-left: 1.25rem;
}
.salary-month-table tr > :last-child {
  padding-right: 1.25rem;
}
.row-actions {
  display: flex;
  justify-content: flex-end;
  gap: .375rem;
}
.empty-month {
  padding: 2rem 1.5rem;
  text-align: center;
  color: var(--a-muted);
}
</style>
