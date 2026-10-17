<template>
  <div v-if="!isLoading">
    <!-- the title bar is in TransfersTable (its scan buttons) -->
    <transfers-table v-if="!isLoading" />
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar.vue'
import TransfersTable from '@/components/TransfersTable.vue'
import CardComponent from '@/components/CardComponent.vue'
import { mapState } from 'pinia'
import { useMainStore } from '@/stores/main.js'

export default {
  name: 'TransfersView',
  components: {
    CardComponent,
    TitleBar,
    TransfersTable
  },
  data () {
    return {
      isLoading: false
    }
  },
  computed: {
    ...mapState(useMainStore, ['userName']),
    titleStack () {
      return ['Logística', 'Transferències']
    }
  },
  mounted () {    
    // read router meta data    
  },
}
</script>
