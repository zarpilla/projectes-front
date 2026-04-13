<template>
  <div v-if="!isLoading">
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section">
      <order-operations-table v-if="!isLoading" />
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar'
import OrderOperationsTable from '@/components/OrderOperationsTable'
import CardComponent from '@/components/CardComponent'
import { mapState } from 'vuex'

export default {
  name: 'OrderOperationsView',
  components: {
    CardComponent,
    TitleBar,
    OrderOperationsTable
  },
  data () {
    return {
      isLoading: false
    }
  },
  computed: {
    ...mapState(['userName']),
    titleStack () {
      return ['Operacions']
    }
  },
  mounted () {    
    // Component will handle data loading
  },
}
</script>
