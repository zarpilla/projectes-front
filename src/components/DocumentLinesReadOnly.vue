<template>
  <!-- Lines of a document whose data can't change any more (issued invoice):
       a plain table instead of the disabled inputs of DocumentLines -->
  <div class="lines-readonly">
    <p class="lines-summary">{{ summary }}</p>
    <div class="table-container">
      <table class="table is-fullwidth">
        <thead>
          <tr>
            <th v-if="isDiet">Data</th>
            <th>Concepte</th>
            <th class="has-text-right">Quantitat</th>
            <th class="has-text-right">Preu</th>
            <th class="has-text-right">Dte.</th>
            <th class="has-text-right">IVA</th>
            <th class="has-text-right">IRPF</th>
            <th class="has-text-right">Import</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(line, i) in rows" :key="line.id || i">
            <td v-if="isDiet">{{ line.date }}</td>
            <td class="concept">{{ line.concept }}</td>
            <td class="has-text-right">{{ line.quantity }}</td>
            <td class="has-text-right num">{{ line.price }}</td>
            <td class="has-text-right" :class="{ 'is-none': !line.discount }">{{ line.discount || "—" }}</td>
            <td class="has-text-right">{{ line.vat }}</td>
            <td class="has-text-right" :class="{ 'is-none': !line.irpf }">{{ line.irpf || "—" }}</td>
            <td class="has-text-right num has-text-weight-bold">{{ line.amount }}</td>
          </tr>
          <tr v-if="!rows.length">
            <td :colspan="isDiet ? 8 : 7" class="has-text-muted">Sense línies</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import moment from "moment";
import { lineBase } from "@/domain/documentTotals.js";
import { formatMoney, formatNumber } from "@/helpers/format-number";

const percent = value => (Number(value) ? `${formatNumber(Number(value), 2)} %` : "");

export default {
  name: "DocumentLinesReadOnly",
  props: {
    lines: {
      type: Array,
      default: () => []
    },
    isDiet: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    rows() {
      return this.lines.map(line => ({
        id: line.id,
        date: line.date ? moment(line.date).format("DD/MM/YYYY") : "",
        concept: line.concept,
        quantity: formatNumber(Number(line.quantity) || 0, 3),
        price: formatMoney(Number(line.base) || 0),
        discount: percent(line.discount),
        vat: percent(line.vat) || "0 %",
        irpf: percent(line.irpf),
        amount: formatMoney(lineBase(line) || 0)
      }));
    },
    summary() {
      const n = this.lines.length;
      const rates = [...new Set(this.lines.map(l => Number(l.vat) || 0))].sort((a, b) => a - b);
      const vat = rates.map(r => `${formatNumber(r, 2)} %`);
      const vatText = vat.length > 1 ? `${vat.slice(0, -1).join(", ")} i ${vat[vat.length - 1]}` : vat[0];
      return `${n} ${n === 1 ? "línia" : "línies"}${n ? ` · IVA ${vatText}` : ""}`;
    }
  }
};
</script>

<style scoped>
.lines-summary {
  margin: -.25rem 0 .75rem;
  font-size: .8125rem;
  color: var(--a-muted);
  text-align: right;
}
.table td,
.table th {
  white-space: nowrap;
}
.table td.concept {
  white-space: normal;
  min-width: 12rem;
}
.table td.num {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.table td.is-none {
  color: var(--a-muted);
}
</style>
