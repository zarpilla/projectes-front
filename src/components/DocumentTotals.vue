<template>
  <div class="summary has-background-white-ter p-4">
    <div
      class="is-flex is-justify-content-flex-end"
      v-if="totals.hasDiscount"
    >
      <label>Base sense descompte: </label>
      <money-format
        :value="totals.baseWithoutDiscount"
        :locale="'es'"
        :currency-code="'EUR'"
        :subunits-value="false"
        :hide-subunits="false"
      >
      </money-format>
    </div>
    <div
      class="is-flex is-justify-content-flex-end"
      v-if="totals.hasDiscount"
    >
      <label>Descompte: </label>
      <money-format
        :value="totals.discount"
        :locale="'es'"
        :currency-code="'EUR'"
        :subunits-value="false"
        :hide-subunits="false"
      >
      </money-format>
    </div>
    <div class="is-flex is-justify-content-flex-end">
      <label>Base: </label>
      <money-format
        :value="totals.base"
        :locale="'es'"
        :currency-code="'EUR'"
        :subunits-value="false"
        :hide-subunits="false"
      >
      </money-format>
    </div>
    <div class="is-flex is-justify-content-flex-end">
      <label>IVA: </label>
      <money-format
        :value="totals.vat"
        :locale="'es'"
        :currency-code="'EUR'"
        :subunits-value="false"
        :hide-subunits="false"
      >
      </money-format>
    </div>
    <div class="is-flex is-justify-content-flex-end">
      <label>IRPF: </label>
      <money-format
        :value="totals.irpf"
        :locale="'es'"
        :currency-code="'EUR'"
        :subunits-value="false"
        :hide-subunits="false"
      >
      </money-format>
    </div>
    <div
      class="is-flex is-justify-content-flex-end has-text-weight-bold mt-5"
    >
      <label>Total </label>
      <money-format
        :value="totals.total"
        :locale="'es'"
        :currency-code="'EUR'"
        :subunits-value="false"
        :hide-subunits="false"
      >
      </money-format>
    </div>
  </div>
</template>

<script>
import MoneyFormat from "@/components/MoneyFormat.vue";
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
        baseWithoutDiscount,
        discount: baseWithoutDiscount - base
      };
    }
  }
};
</script>
