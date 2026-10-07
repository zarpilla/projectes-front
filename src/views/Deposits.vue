<template>
  <div v-if="!isLoading">
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section">
      <deposits-table v-if="!isLoading" />
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar.vue'
import DepositsTable from '@/components/DepositsTable.vue'
import CardComponent from '@/components/CardComponent.vue'
import { mapState } from 'pinia'
import { useMainStore } from '@/stores/main.js'

export default {
  name: 'DepositsView',
  components: {
    CardComponent,
    TitleBar,
    DepositsTable
  },
  data () {
    return {
      isLoading: false
    }
  },
  computed: {
    ...mapState(useMainStore, ['userName']),
    titleStack () {
      return ['Dipòsits']
    }
  },
  mounted () {    
    // read router meta data    
  },
}
</script>
