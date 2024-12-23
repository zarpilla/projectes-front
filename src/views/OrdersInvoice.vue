<template>
  <div v-if="!isLoading">
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section">
      <orders-invoice-table v-if="!isLoading" />
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar'
import OrdersInvoiceTable from '@/components/OrdersInvoiceTable'
import CardComponent from '@/components/CardComponent'
import service from '@/service/index'
import { mapState } from 'vuex'
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
    ...mapState(['userName']),
    titleStack () {
      return ['Facturar comandes']
    }
  },
  mounted () {    
    // read router meta data    
  },
}
</script>
