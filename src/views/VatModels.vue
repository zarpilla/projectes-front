<template>
  <div>
    <title-bar :title-stack="['Informes', 'Models 303 i 390 (Beta)']" subtitle="Les caselles de l'autoliquidació d'IVA (303) de cada trimestre i el resum de l'any (390), a partir de les factures emeses i rebudes. En proves." />
    <section class="section is-main-section">
      <vat-models-table />
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar.vue'
import VatModelsTable from '@/components/VatModelsTable.vue'

export default {
  name: 'VatModelsView',
  components: {
    TitleBar,
    VatModelsTable
  }
}
</script>
