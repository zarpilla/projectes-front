<template>
  <div v-if="scopes.length" class="toggle-group" role="group" aria-label="Àmbit">
    <span class="toggle-label">Àmbit</span>
    <button
      type="button"
      class="chip-toggle"
      :class="{ 'is-on': !modelValue.length }"
      :aria-pressed="!modelValue.length ? 'true' : 'false'"
      @click="set([])"
    >
      Tots
    </button>
    <button
      v-for="scope in options"
      :key="scope.id"
      type="button"
      class="chip-toggle"
      :class="{ 'is-on': modelValue.includes(scope.id) }"
      :aria-pressed="modelValue.includes(scope.id) ? 'true' : 'false'"
      @click="toggle(scope.id)"
    >
      {{ scope.name }}
    </button>
  </div>
</template>

<script>
import service from '@/service/index'

// Àmbit filter of the dedication Gantts (issues/410): no chip on = every
// àmbit; 0 = «Sense àmbit» (projects without one and hours without a project).
// The choice is kept in localStorage under storageKey.
export const NO_SCOPE = 0

export function readStoredScopes (key) {
  try {
    const v = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(v) ? v.filter(n => Number.isInteger(n)) : []
  } catch (e) {
    return []
  }
}

export default {
  name: 'ScopeToggles',
  props: {
    modelValue: { type: Array, default: () => [] },
    storageKey: { type: String, default: '' }
  },
  emits: ['update:modelValue'],
  data () {
    return { scopes: [] }
  },
  computed: {
    options () {
      return [...this.scopes, { id: NO_SCOPE, name: 'Sense àmbit' }]
    }
  },
  async mounted () {
    try {
      const { data } = await service({ requiresAuth: true, cached: true }).get('project-scopes?_limit=-1&_sort=code:ASC')
      this.scopes = (data || []).filter(s => !s.disabled)
    } catch (e) {
      this.scopes = []
    }
    // drop stored àmbits that no longer exist
    const known = new Set(this.options.map(s => s.id))
    const kept = this.modelValue.filter(id => known.has(id))
    if (kept.length !== this.modelValue.length) this.set(kept)
  },
  methods: {
    toggle (id) {
      this.set(this.modelValue.includes(id) ? this.modelValue.filter(s => s !== id) : [...this.modelValue, id])
    },
    set (ids) {
      if (this.storageKey) {
        try {
          localStorage.setItem(this.storageKey, JSON.stringify(ids))
        } catch (e) { /* private mode */ }
      }
      this.$emit('update:modelValue', ids)
    }
  }
}
</script>
