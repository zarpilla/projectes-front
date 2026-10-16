<template>
  <div v-if="!isLoading">
    <!-- the title bar is in OrdersInvoiceTable: its actions need the selection -->
    <orders-invoice-table v-if="!isLoading" />
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar.vue'
import OrdersInvoiceTable from '@/components/OrdersInvoiceTable.vue'
import CardComponent from '@/components/CardComponent.vue'
import service from '@/service/index'
import { mapState } from 'pinia'
import { useMainStore } from '@/stores/main.js'
import moment from 'moment'

export default {
  name: 'DedicacioSaldo',
  components: {
    CardComponent,
    TitleBar,
    OrdersInvoiceTable
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
      return ['Facturar comandes']
    }
  },
  mounted () {    
    // read router meta data    
  },
}
</script>
