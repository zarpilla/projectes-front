<template>
  <!-- one or several quarters, or the whole year (issues/418): each click adds
       or takes out a quarter -->
  <div class="segmented quarter-toggle" role="group" aria-label="Trimestres">
    <button
      type="button"
      :class="{ 'is-on': !modelValue.length }"
      :aria-pressed="!modelValue.length ? 'true' : 'false'"
      @click="$emit('update:modelValue', [])"
    >
      Tot l'any
    </button>
    <button
      v-for="q in quarters"
      :key="q"
      type="button"
      :class="{ 'is-on': modelValue.includes(q) }"
      :aria-pressed="modelValue.includes(q) ? 'true' : 'false'"
      :title="`Afegeix o treu el T${q}`"
      @click="$emit('update:modelValue', toggle(q))"
    >
      T{{ q }}
    </button>
  </div>
</template>

<script>
import { QUARTERS, toggleQuarter } from '@/domain/taxSettle.js'

export default {
  name: 'QuarterToggle',
  props: {
    modelValue: { type: Array, default: () => [] }
  },
  emits: ['update:modelValue'],
  data () {
    return { quarters: QUARTERS }
  },
  methods: {
    toggle (q) {
      return toggleQuarter(this.modelValue, q)
    }
  }
}
</script>
