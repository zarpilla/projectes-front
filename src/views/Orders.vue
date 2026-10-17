<template>
  <div v-if="!isLoading">
    <!-- the title bar is in OrdersTable: its actions need the table -->
    <orders-table v-if="!isLoading" />
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar.vue'
import OrdersTable from '@/components/OrdersTable.vue'
import CardComponent from '@/components/CardComponent.vue'
import { mapState } from 'pinia'
import { useMainStore } from '@/stores/main.js'

export default {
  name: 'DedicacioSaldo',
  components: {
    CardComponent,
    TitleBar,
    OrdersTable
    // DedicationSaldo
  },
  data () {
    return {
      isLoading: false,
      filters: {
        year: null
      },
      years: [],
      treasury: [],
      treasuryData: []
    }
  },
  computed: {
    ...mapState(useMainStore, ['userName']),
    titleStack () {
      return ['Logística', 'Comandes']
    }
  },
  mounted () {    
    // read router meta data    
  },
}
</script>
