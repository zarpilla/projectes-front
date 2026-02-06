<template>
  <div v-if="!isLoading">
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section">
      <transfers-table v-if="!isLoading" />
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar'
import TransfersTable from '@/components/TransfersTable'
import CardComponent from '@/components/CardComponent'
import { mapState } from 'vuex'

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
    ...mapState(['userName']),
    titleStack () {
      return ['Transferències']
    }
  },
  mounted () {    
    // read router meta data    
  },
}
</script>
