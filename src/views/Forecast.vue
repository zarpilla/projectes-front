<template>
  <div>
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section">
      <previsio-table />
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar.vue'
import PrevisioTable from '@/components/PrevisioTable.vue'
import { mapState } from 'pinia'
import { useMainStore } from '@/stores/main.js'

export default {
  name: 'DedicacioSaldo',
  components: {
    TitleBar,
    PrevisioTable
  },
  data () {
    return {
      isLoading: true,      
    }
  },
  computed: {
    ...mapState(useMainStore, ['userName']),
    titleStack () {
      return ['Previsió Econòmica']
    },
  }  
}
</script>
