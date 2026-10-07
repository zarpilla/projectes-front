<template>
  <div v-if="!isLoading">
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section">
      <incidences-table v-if="!isLoading" />
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar.vue'
import IncidencesTable from '@/components/IncidencesTable.vue'
import CardComponent from '@/components/CardComponent.vue'
import { mapState } from 'pinia'
import { useMainStore } from '@/stores/main.js'

export default {
  name: 'IncidencesView',
  components: {
    CardComponent,
    TitleBar,
    IncidencesTable
  },
  data () {
    return {
      isLoading: false
    }
  },
  computed: {
    ...mapState(useMainStore, ['userName']),
    titleStack () {
      return ['Incidències']
    }
  },
  mounted () {    
    // read router meta data    
  },
}
</script>
