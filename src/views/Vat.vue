<template>
  <div>
    <title-bar :title-stack="titleStack" :subtitle="subtitle" />
    <section class="section is-main-section">
      <!-- «Models 303 i 390» (Beta, 2026-11-03): ?pestanya=models -->
      <div class="segmented vat-tabs" role="tablist" aria-label="Vista">
        <button
          v-for="t in tabs"
          :key="t.id"
          type="button"
          role="tab"
          :class="{ 'is-on': tab === t.id }"
          :aria-selected="tab === t.id ? 'true' : 'false'"
          @click="selectTab(t.id)"
        >
          {{ t.label }}<span v-if="t.beta" class="tab-beta" title="En proves">Beta</span>
        </button>
      </div>
      <vat-models-table v-if="tab === 'models'" />
      <vat-table v-else />
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar.vue'
import VatTable from '@/components/VatTable.vue'
import VatModelsTable from '@/components/VatModelsTable.vue'

export const VAT_TABS = [
  { id: 'saldo', label: 'Saldo i documents' },
  { id: 'models', label: 'Models 303 i 390', beta: true }
]

export default {
  name: 'VatView',
  components: {
    TitleBar,
    VatTable,
    VatModelsTable
  },
  data () {
    return {
      tabs: VAT_TABS
    }
  },
  computed: {
    tab () {
      const query = (this.$route && this.$route.query) || {}
      return query.pestanya === 'models' ? 'models' : 'saldo'
    },
    titleStack () {
      return this.tab === 'models' ? ['Diners', 'IVA', 'Models 303 i 390 (Beta)'] : ['Diners', 'IVA']
    },
    subtitle () {
      return this.tab === 'models'
        ? "Les caselles de l'autoliquidació d'IVA (303) de cada trimestre i el resum de l'any (390), a partir de les factures emeses i rebudes. En proves."
        : "L'IVA de les factures i documents de l'any, per trimestre i document per document: el saldat amb Hisenda, el pendent de saldar i el previst als projectes."
    }
  },
  methods: {
    selectTab (id) {
      if (id === this.tab) return
      const query = { ...this.$route.query }
      if (id === 'models') query.pestanya = 'models'
      else delete query.pestanya
      this.$router.replace({ query })
    }
  }
}
</script>
<style scoped>
.vat-tabs {
  margin-bottom: 1rem;
}
.tab-beta {
  margin-left: .375rem;
  padding: 0 .375rem;
  border-radius: 999px;
  background: var(--a-chip);
  color: var(--a-muted);
  font-size: .625rem;
  font-weight: 800;
  line-height: 1.125rem;
  text-transform: uppercase;
  letter-spacing: .04em;
}
</style>
