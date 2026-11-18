<template>
  <!-- «Plantilla sencera»: everyone's payrolls summed per month (issues/449);
       a month opens the per-person list of that month -->
  <div class="salary-team">
    <div class="doc-kpis">
      <div class="doc-kpi">
        <span>Net de l'any</span>
        <b>{{ money(totals.net) }}</b>
      </div>
      <div class="doc-kpi">
        <span>IRPF + SS + Altres</span>
        <b>{{ money(totals.irpf + totals.ss + totals.other) }}</b>
      </div>
      <div class="doc-kpi">
        <span>Cost total de l'any</span>
        <b>{{ money(totals.total) }}</b>
      </div>
    </div>
    <section class="a-box list-box">
      <b-loading :is-full-page="false" v-model="isLoading" :can-cancel="false"></b-loading>
      <header class="box-head">
        <h2>Bestretes de la plantilla per mes</h2>
        <span class="box-hint">La suma de les nòmines de totes les persones. Tria un mes per veure-les una per una.</span>
      </header>
      <div class="table-wrap">
        <table class="table is-fullwidth is-hoverable salary-team-table">
          <thead>
            <tr>
              <th scope="col">Mes</th>
              <th scope="col" class="has-text-right">Nòmines</th>
              <th scope="col" class="has-text-right">Net</th>
              <th scope="col" class="has-text-right">IRPF</th>
              <th scope="col" class="has-text-right">SS</th>
              <th scope="col" class="has-text-right">Altres</th>
              <th scope="col" class="has-text-right">Total</th>
              <th scope="col">Estat</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in months"
              :key="row.month"
              class="month-row"
              tabindex="0"
              :title="`Mostra les nòmines de ${monthNames[row.month - 1].toLowerCase()}`"
              @click="$emit('month', row.month)"
              @keydown.enter="$emit('month', row.month)"
            >
              <th scope="row" class="month-name">{{ monthNames[row.month - 1] }}</th>
              <td class="has-text-right">{{ row.count || "—" }}</td>
              <td class="has-text-right">{{ money(row.net) }}</td>
              <td class="has-text-right">{{ money(row.irpf) }}</td>
              <td class="has-text-right">{{ money(row.ss) }}</td>
              <td class="has-text-right">{{ money(row.other) }}</td>
              <td class="has-text-right">{{ money(row.total) }}</td>
              <td>
                <span v-if="!row.count" class="tag">Sense nòmines</span>
                <span v-else-if="row.paid === row.count" class="tag is-success is-light">Pagades</span>
                <span v-else class="tag is-warning is-light">{{ row.count - row.paid }} per pagar</span>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="is-total">
              <th scope="row">Total</th>
              <td class="has-text-right">{{ totals.count }}</td>
              <td class="has-text-right">{{ money(totals.net) }}</td>
              <td class="has-text-right">{{ money(totals.irpf) }}</td>
              <td class="has-text-right">{{ money(totals.ss) }}</td>
              <td class="has-text-right">{{ money(totals.other) }}</td>
              <td class="has-text-right">{{ money(totals.total) }}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  </div>
</template>

<script>
import service from "@/service/index";
import { startLoad } from "@/domain/latestLoad.js";
import { teamPayrollMonths, teamPayrollTotals } from "@/domain/teamPayrolls.js";
import { formatMoney } from "@/helpers/format-number";

export default {
  name: "DedicationSalaryTeam",
  props: {
    year: { type: Number, default: null }
  },
  emits: ["month"],
  data() {
    return {
      isLoading: false,
      months: teamPayrollMonths([], null),
      monthNames: ["Gener", "Febrer", "Març", "Abril", "Maig", "Juny", "Juliol", "Agost", "Setembre", "Octubre", "Novembre", "Desembre"]
    };
  },
  computed: {
    totals() {
      return teamPayrollTotals(this.months);
    }
  },
  watch: {
    year() { this.load(); }
  },
  mounted() {
    this.load();
  },
  methods: {
    money(value) {
      return formatMoney(value);
    },
    // one request for the whole year: no per-person hours (issues/449)
    async load() {
      const isStale = startLoad(this);
      if (!this.year) {
        this.months = teamPayrollMonths([], null);
        return;
      }
      this.isLoading = true;
      try {
        const payrolls = (
          await service({ requiresAuth: true }).get(`payrolls?_limit=-1&_where[year.year]=${this.year}`)
        ).data;
        if (isStale()) return;
        this.months = teamPayrollMonths(payrolls, this.year);
      } finally {
        if (!isStale()) this.isLoading = false;
      }
    }
  }
};
</script>
<style scoped>
.salary-team .doc-kpis {
  margin-bottom: 1rem;
}
.list-box {
  position: relative;
}
.salary-team-table {
  margin: 0;
  font-variant-numeric: tabular-nums;
}
.salary-team-table td,
.salary-team-table th {
  vertical-align: middle;
  white-space: nowrap;
}
.salary-team-table tr > :first-child {
  padding-left: 1.25rem;
}
.salary-team-table tr > :last-child {
  padding-right: 1.25rem;
}
.month-row {
  cursor: pointer;
}
.month-name {
  font-weight: 700;
}
</style>
