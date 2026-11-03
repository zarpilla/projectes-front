<template>
  <!-- a box of the VAT return (Models 303 i 390): its amount and number;
       a link to its documents when it is `pickable` and has an amount -->
  <span class="box-value" :class="{ 'is-on': on === box }">
    <button v-if="pickable && value" type="button" class="box-link" :title="'Documents de la casella ' + box" @click="$emit('pick', box)">{{ text }}</button>
    <span v-else>{{ text }}</span>
    <small class="box-number">[{{ box }}]</small>
  </span>
</template>

<script>
import { formatMoney } from "@/helpers/format-number";

export default {
  name: "VatBoxValue",
  props: {
    box: { type: String, required: true },
    value: { type: Number, default: null },
    on: { type: String, default: null },
    pct: { type: Boolean, default: false },
    pickable: { type: Boolean, default: false }
  },
  emits: ["pick"],
  computed: {
    text() {
      if (this.value === undefined || this.value === null) return "—";
      return this.pct ? `${this.value} %` : formatMoney(this.value);
    }
  }
};
</script>
<style scoped>
.box-value {
  white-space: nowrap;
}
.box-number {
  margin-left: .375rem;
  font-size: .75rem;
  color: var(--a-muted);
}
.box-link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--a-accent);
  font: inherit;
  cursor: pointer;
  text-decoration: underline dotted;
}
.is-on .box-link {
  font-weight: 800;
  text-decoration: underline;
}
</style>
