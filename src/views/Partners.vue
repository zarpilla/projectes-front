<template>
  <div v-if="!isLoading">
    <title-bar :title-stack="titleStack" subtitle="Les productores que fan comandes de logística, i la seva aportació a la cooperativa." />
    <section class="section is-main-section">
      <users-table v-if="!isLoading" />
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar.vue'
import UsersTable from '@/components/UsersTable.vue'
import CardComponent from '@/components/CardComponent.vue'
import { mapState } from 'pinia'
import { useMainStore } from '@/stores/main.js'

export default {
  name: 'Partners',
  components: {
    CardComponent,
    TitleBar,
    UsersTable
  },
  data () {
    return {            
    }
  },
  computed: {
    ...mapState(useMainStore, ['userName']),
    titleStack () {
      return ['Rutes i punts', 'Sòcies']
    }
  },
  mounted () {    
    // read router meta data    
  },
}
</script>
