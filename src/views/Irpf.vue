<template>
  <div>
    <title-bar :title-stack="['Diners', 'IRPF']" subtitle="Les retencions d'IRPF que es paguen a Hisenda (model 111): de les nòmines i de les factures i despeses rebudes, per trimestre i per document." />
    <section class="section is-main-section">
      <irpf-table />
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar.vue'
import IrpfTable from '@/components/IrpfTable.vue'

// issues/348
export default {
  name: 'IrpfView',
  components: {
    TitleBar,
    IrpfTable
  }
}
</script>
