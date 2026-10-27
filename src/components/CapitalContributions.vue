<template>
  <!-- A contact's contributions to the capital (date, amount, comment), edited in
       place; saved with the form that holds it (domain/capitalContributions.js). -->
  <div class="capital">
    <table v-if="rows.length" class="table is-fullwidth is-narrow capital-table">
      <thead>
        <tr>
          <th class="capital-date">Data</th>
          <th class="capital-amount has-text-right">Import (€)</th>
          <th>Comentari</th>
          <th class="capital-actions"><span class="is-sr-only">Treu</span></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, k) in rows" :key="row.id || `new-${k}`">
          <td><date-field :model-value="row.date" size="is-small" label="Data de l'aportació" @update:model-value="set(k, 'date', $event)" /></td>
          <td>
            <b-input
              :model-value="row.amount === null || row.amount === undefined ? '' : String(row.amount)"
              size="is-small"
              inputmode="decimal"
              class="capital-input"
              :class="{ 'is-danger': contributionError(row) }"
              aria-label="Import de l'aportació"
              @update:model-value="set(k, 'amount', $event)"
            />
          </td>
          <td><b-input :model-value="row.comment || ''" size="is-small" aria-label="Comentari de l'aportació" @update:model-value="set(k, 'comment', $event)" /></td>
          <td class="has-text-right">
            <b-button size="is-small" icon-left="close" :aria-label="'Treu l\'aportació'" @click="remove(k)" />
          </td>
        </tr>
      </tbody>
      <tfoot v-if="rows.length > 1">
        <tr>
          <th>Total</th>
          <th class="has-text-right num">{{ money(total) }}</th>
          <th colspan="2" />
        </tr>
      </tfoot>
    </table>
    <p v-else class="capital-empty">Cap aportació.</p>
    <b-button size="is-small" icon-left="plus" @click="add">Afegeix una aportació</b-button>
  </div>
</template>

<script>
import moment from "moment";
import DateField from "@/components/DateField.vue";
import { formatMoney } from "@/helpers/format-number";
import { contributionError, contributionsTotal } from "@/domain/capitalContributions";

export default {
  name: "CapitalContributions",
  components: { DateField },
  props: {
    modelValue: { type: Array, default: () => [] }
  },
  emits: ["update:modelValue"],
  computed: {
    rows() {
      return this.modelValue || [];
    },
    total() {
      return contributionsTotal(this.rows);
    }
  },
  methods: {
    contributionError,
    money(value) {
      return formatMoney(value);
    },
    set(k, field, value) {
      this.$emit("update:modelValue", this.rows.map((r, i) => (i === k ? { ...r, [field]: value } : r)));
    },
    add() {
      this.$emit("update:modelValue", [...this.rows, { date: moment().format("YYYY-MM-DD"), amount: "", comment: "" }]);
    },
    remove(k) {
      this.$emit("update:modelValue", this.rows.filter((_, i) => i !== k));
    }
  }
};
</script>

<style scoped>
.capital-table {
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}
.capital-date {
  width: 11rem;
}
.capital-amount {
  width: 9rem;
}
.capital-input :deep(input) {
  text-align: right;
}
.capital-actions {
  width: 1%;
}
.capital-empty {
  color: var(--a-muted);
  margin-bottom: 0.5rem;
}
.num {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
</style>
