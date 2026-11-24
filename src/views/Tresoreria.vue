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
      <bank-reconciliation v-if="tab === 'conciliacio'" ref="reconciliation" />
      <tresoreria-table v-else ref="table" />
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
  // issues/422: the checks of «Accions» not sent yet are lost when leaving;
  // issues/455: so are the movements accepted in «Conciliació» not validated
  beforeRouteLeave (to, from, next) {
    this.confirmLeave(next)
  },
  methods: {
    confirmLeave (next) {
      const table = this.$refs.table
      if (table && table.confirmLeaveChecks) return table.confirmLeaveChecks(ok => (ok ? next() : next(false)))
      const recon = this.$refs.reconciliation
      if (recon && recon.confirmLeaveQueue) return recon.confirmLeaveQueue(ok => (ok ? next() : next(false)))
      next()
    },
    selectTab (id) {
      if (id === this.tab) return
      this.confirmLeave(ok => {
        if (ok !== false) this.showTab(id)
      })
    },
    showTab (id) {
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
