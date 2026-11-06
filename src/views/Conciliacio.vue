<template>
  <div>
    <title-bar :title-stack="['Diners', 'Conciliació']" subtitle="Els moviments dels extractes del banc (Norma 43) amb les línies de Tresoreria." />
    <section class="section is-main-section">
      <bank-reconciliation />
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar.vue'
import BankReconciliation from '@/components/BankReconciliation.vue'

// issues/413
export default {
  name: 'ConciliacioView',
  components: {
    TitleBar,
    BankReconciliation
  }
}
</script>
