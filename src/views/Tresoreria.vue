<template>
  <div>
    <title-bar :title-stack="titleStack" :subtitle="subtitle" />
    <section class="section is-main-section">
      <!-- «Conciliació» (issues/413): ?pestanya=conciliacio -->
      <div class="segmented treasury-tabs" role="tablist" aria-label="Vista">
        <button
          v-for="t in tabs"
          :key="t.id"
          type="button"
          role="tab"
          :class="{ 'is-on': tab === t.id }"
          :aria-selected="tab === t.id ? 'true' : 'false'"
          @click="selectTab(t.id)"
        >
          {{ t.label }}
        </button>
      </div>
      <bank-reconciliation v-if="tab === 'conciliacio'" />
      <tresoreria-table v-else />
    </section>
  </div>
</template>

<script>
import { defineAsyncComponent } from 'vue'
import TitleBar from '@/components/TitleBar.vue'
import TresoreriaTable from '@/components/TresoreriaTable.vue'

export const TREASURY_TABS = [
  { id: 'previsio', label: 'Previsió i moviments' },
  { id: 'conciliacio', label: 'Conciliació' }
]

export default {
  name: 'TresoreriaView',
  components: {
    TitleBar,
    TresoreriaTable,
    BankReconciliation: defineAsyncComponent(() => import('@/components/BankReconciliation.vue'))
  },
  data () {
    return {
      tabs: TREASURY_TABS
    }
  },
  computed: {
    tab () {
      const query = (this.$route && this.$route.query) || {}
      return query.pestanya === 'conciliacio' ? 'conciliacio' : 'previsio'
    },
    titleStack () {
      return this.tab === 'conciliacio' ? ['Diners', 'Tresoreria', 'Conciliació'] : ['Diners', 'Tresoreria']
    },
    subtitle () {
      return this.tab === 'conciliacio'
        ? 'Els moviments dels extractes del banc (Norma 43) amb les línies de Tresoreria.'
        : 'Saldo, previsió per mesos i moviments dels comptes bancaris.'
    }
  },
  methods: {
    selectTab (id) {
      if (id === this.tab) return
      const query = { ...this.$route.query }
      if (id === 'conciliacio') query.pestanya = 'conciliacio'
      else delete query.pestanya
      this.$router.replace({ query })
    }
  }
}
</script>
<style scoped>
.treasury-tabs {
  margin-bottom: 1rem;
}
</style>
