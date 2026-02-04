<template>
  <div v-if="!isLoading">
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section">
      <incidences-table v-if="!isLoading" />
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar'
import IncidencesTable from '@/components/IncidencesTable'
import CardComponent from '@/components/CardComponent'
import { mapState } from 'vuex'

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
    ...mapState(['userName']),
    titleStack () {
      return ['Incidències']
    }
  },
  mounted () {    
    // read router meta data    
  },
}
</script>
