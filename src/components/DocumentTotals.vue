<template>
  <!-- Redesign A: base, VAT and IRPF per rate, and the total -->
  <div class="summary doc-totals">
    <div v-if="totals.hasDiscount" class="t-row">
      <span class="t-label">Base sense descompte </span>
      <span>{{ money(totals.baseWithoutDiscount) }}</span>
    </div>
    <div v-if="totals.hasDiscount" class="t-row">
      <span class="t-label">Descompte </span>
      <span>{{ money(totals.discount) }}</span>
    </div>
    <div class="t-row">
      <span class="t-label">Base imposable </span>
      <span>{{ money(totals.base) }}</span>
    </div>
    <div v-for="g in totals.vatRates" :key="'vat' + g.rate" class="t-row">
      <span class="t-label">IVA {{ rate(g.rate) }} <small v-if="totals.vatRates.length > 1">sobre {{ money(g.base) }}</small> </span>
      <span>{{ money(g.amount) }}</span>
    </div>
    <div v-for="g in totals.irpfRates" :key="'irpf' + g.rate" class="t-row">
      <span class="t-label">IRPF {{ rate(g.rate) }} <small>sobre {{ money(g.base) }}</small> </span>
      <span>{{ money(-g.amount) }}</span>
    </div>
    <div class="t-row is-total">
      <label>Total </label>
      <span>{{ money(totals.total) }}</span>
    </div>
  </div>
</template>

<script>
import MoneyFormat from "@/components/MoneyFormat.vue";
import { formatMoney, formatNumber } from "@/helpers/format-number";
import * as documentTotals from "@/domain/documentTotals.js";

// The totals block under a document's lines (DocumentForm)
export default {
  name: "DocumentTotals",
  components: { MoneyFormat },
  props: {
    lines: { type: Array, required: true }
  },
  computed: {
    totals() {
      const base = documentTotals.totalBase(this.lines);
      const vat = documentTotals.totalVat(this.lines);
      const irpf = documentTotals.totalIrpf(this.lines);
      const baseWithoutDiscount = documentTotals.totalBaseWithoutDiscount(this.lines);
      return {
        base,
        vat,
        irpf,
        total: base + vat + irpf,
        hasDiscount: documentTotals.hasDiscount(this.lines),
        vatRates: documentTotals.byRate(this.lines, "vat"),
        irpfRates: documentTotals.byRate(this.lines, "irpf").filter(g => g.rate),
        baseWithoutDiscount,
        discount: baseWithoutDiscount - base
      };
    }
  },
  methods: {
    money(value) {
      return formatMoney(value);
    },
    rate(value) {
      return formatNumber(value, 2) + " %";
    }
  }
};
</script>

<style scoped>
.doc-totals {
  margin-left: auto;
  max-width: 26rem;
  padding: 1rem 1.25rem;
  font-variant-numeric: tabular-nums;
}
.t-row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: .1875rem 0;
  font-size: .9375rem;
}
.t-row span:last-child {
  font-weight: 700;
}
.t-label small {
  font-size: .75rem;
  color: var(--a-muted);
}
.t-row.is-total {
  margin-top: .5rem;
  padding-top: .625rem;
  border-top: 1px solid var(--a-line);
  font-size: 1.375rem;
  font-weight: 800;
}
.t-row.is-total span:last-child {
  font-weight: 800;
}
</style>
