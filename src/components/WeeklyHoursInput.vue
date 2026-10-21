<template>
  <div class="weekly-hours-input">
    <b-checkbox :model-value="enabled" @update:model-value="toggle">
      Les hores no es reparteixen igual de dilluns a divendres
    </b-checkbox>
    <div v-if="enabled" class="weekly-hours-days">
      <label v-for="(name, i) in DAY_NAMES" :key="name" class="weekly-hours-day">
        <span class="weekly-hours-day-name">{{ name }}</span>
        <input
          class="input is-small"
          :class="{ 'is-danger': !isNumber(days[i]) }"
          inputmode="decimal"
          :name="`hoursperday-${i}`"
          :value="days[i]"
          @input="setDay(i, $event.target.value)"
        />
      </label>
    </div>
    <p v-if="enabled" class="weekly-hours-total" :class="{ 'has-text-danger': !matches }">
      Total setmana: {{ formatHours(total) }} h
      <template v-if="matches"> · coincideix amb {{ formatHours(hours) }} h/dia × 5</template>
      <template v-else-if="hasHours">
        · ha de sumar {{ formatHours(expected) }} h ({{ formatHours(hours) }} h/dia × 5)
      </template>
    </p>
  </div>
</template>

<script>
// «Distribució setmanal» of a working-day period. The value saved is the same
// text as before: seven numbers, Monday first, comma separated, decimal dot
// («8,8,0,8,8,0,0»), or "" when the hours are the same Monday to Friday.
export const DAY_NAMES = ["Dl", "Dt", "Dc", "Dj", "Dv", "Ds", "Dg"];

// the stored text as seven fields, with a decimal comma on screen
export function splitDays(value) {
  const parts = value ? String(value).split(",") : [];
  return DAY_NAMES.map((_, i) => (parts[i] === undefined ? "" : parts[i].trim().replace(".", ",")));
}

// seven fields as the stored text: decimal dot, an empty day is 0
export function joinDays(days) {
  return days.map(d => {
    const text = String(d === undefined || d === null ? "" : d).trim().replace(",", ".");
    return text === "" ? "0" : text;
  }).join(",");
}

// a working week with the daily hours Monday to Friday
export function defaultDays(hours) {
  const n = Number(String(hours === undefined || hours === null ? "" : hours).replace(",", "."));
  const day = n > 0 ? String(n).replace(".", ",") : "0";
  return [day, day, day, day, day, "0", "0"];
}

export default {
  name: "WeeklyHoursInput",
  emits: ["update:modelValue"],
  props: {
    modelValue: { type: String, default: "" },
    // Hores of the period (h/dia), the week has to add up to 5 times it
    hours: { type: [Number, String], default: null },
  },
  data() {
    return { DAY_NAMES, days: splitDays(this.modelValue), open: !!this.modelValue };
  },
  computed: {
    enabled() {
      return this.open || !!this.modelValue;
    },
    total() {
      return this.days.reduce((acc, d) => acc + (this.isNumber(d) ? this.toNumber(d) : 0), 0);
    },
    hasHours() {
      return this.hours !== null && this.hours !== undefined && this.hours !== "";
    },
    expected() {
      return this.toNumber(this.hours) * 5;
    },
    matches() {
      return this.days.every(d => this.isNumber(d)) &&
        Math.round(this.total * 100) === Math.round(this.expected * 100);
    },
  },
  watch: {
    // the modal reuses the component when another period is opened
    modelValue(value) {
      if (value !== joinDays(this.days)) {
        this.days = splitDays(value);
      }
      if (value) {
        this.open = true;
      }
    },
  },
  methods: {
    toNumber(text) {
      return Number(String(text === undefined || text === null ? "" : text).trim().replace(",", "."));
    },
    isNumber(text) {
      const t = String(text === undefined || text === null ? "" : text).trim();
      return t === "" || (/^\d+([.,]\d+)?$/.test(t) && Number.isFinite(this.toNumber(t)));
    },
    formatHours(n) {
      return String(Math.round(Number(n) * 100) / 100).replace(".", ",");
    },
    setDay(i, value) {
      this.days.splice(i, 1, value);
      this.$emit("update:modelValue", joinDays(this.days));
    },
    toggle(on) {
      this.open = on;
      if (on) {
        this.days = defaultDays(this.hours);
        this.$emit("update:modelValue", joinDays(this.days));
      } else {
        this.days = splitDays("");
        this.$emit("update:modelValue", "");
      }
    },
  },
};
</script>

<style>
.weekly-hours-days {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
.weekly-hours-day {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 3.5rem;
}
.weekly-hours-day .input {
  text-align: center;
}
.weekly-hours-day-name {
  font-size: 0.75rem;
  font-weight: 600;
}
.weekly-hours-total {
  font-size: 0.75rem;
  margin-top: 0.25rem;
}
</style>
