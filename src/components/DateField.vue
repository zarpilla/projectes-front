<template>
  <!-- A date as 'YYYY-MM-DD' (or null) with the app's date picker: Catalan, Monday
       first, shown as dd/mm/aaaa whatever the browser's language (the native date
       input showed mm/dd/yyyy in English browsers) -->
  <b-datepicker
    :model-value="dateValue"
    :locale="'ca-ES'"
    :first-day-of-week="1"
    :show-week-number="false"
    :placeholder="placeholder"
    :size="size"
    :min-date="toDate(min)"
    :max-date="toDate(max)"
    :editable="true"
    :append-to-body="appendToBody"
    :icon="icon"
    :date-formatter="format"
    :date-parser="parse"
    :aria-label="label"
    trap-focus
    class="date-field"
    @update:model-value="onInput"
  />
</template>

<script>
import moment from "moment";

export default {
  name: "DateField",
  props: {
    modelValue: { type: String, default: null },
    placeholder: { type: String, default: "dd/mm/aaaa" },
    label: { type: String, default: null },
    size: { type: String, default: null },
    min: { type: String, default: null },
    max: { type: String, default: null },
    icon: { type: String, default: "calendar-today" },
    // inside tables and modals the calendar would be cut by their scroll
    appendToBody: { type: Boolean, default: true }
  },
  emits: ["update:modelValue", "change"],
  computed: {
    dateValue() {
      return this.toDate(this.modelValue);
    }
  },
  methods: {
    format(date) {
      return moment(date).format("DD/MM/YYYY");
    },
    // what is typed: 6/11/2026, 06-11-26…
    parse(text) {
      const m = moment(text, ["DD/MM/YYYY", "D/M/YYYY", "DD/MM/YY", "D/M/YY", "DD-MM-YYYY", "D-M-YYYY"], true);
      return m.isValid() ? m.toDate() : null;
    },
    toDate(value) {
      return value ? moment(value, "YYYY-MM-DD").toDate() : null;
    },
    onInput(date) {
      const value = date ? moment(date).format("YYYY-MM-DD") : null;
      if (value === this.modelValue) return;
      this.$emit("update:modelValue", value);
      this.$emit("change", value);
    }
  }
};
</script>
