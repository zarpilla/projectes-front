<template>
  <div v-if="!isLoading">
    <!-- the title bar is in OrderOperationsTable (its subtitle needs the day) -->
    <order-operations-table v-if="!isLoading" />
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar.vue'
import OrderOperationsTable from '@/components/OrderOperationsTable.vue'
import CardComponent from '@/components/CardComponent.vue'
import { mapState } from 'pinia'
import { useMainStore } from '@/stores/main.js'

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
    ...mapState(useMainStore, ['userName']),
    titleStack () {
      return ['Logística', 'Operacions']
    }
  },
  mounted () {    
    // Component will handle data loading
  },
}
</script>
