<template>
  <div v-if="!isLoading">
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section">
      <deposits-table v-if="!isLoading" />
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar'
import DepositsTable from '@/components/DepositsTable'
import CardComponent from '@/components/CardComponent'
import { mapState } from 'vuex'

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
    ...mapState(['userName']),
    titleStack () {
      return ['Dipòsits']
    }
  },
  mounted () {    
    // read router meta data    
  },
}
</script>
