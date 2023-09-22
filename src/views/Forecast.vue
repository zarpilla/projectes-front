<template>
  <div>
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section">
      <previsio-table />
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar'
import PrevisioTable from '@/components/PrevisioTable'
import { mapState } from 'vuex'

export default {
  name: 'DedicacioSaldo',
  components: {
    TitleBar,
    PrevisioTable
  },
  data () {
    return {
      isLoading: true,      
    }
  },
  computed: {
    ...mapState(['userName']),
    titleStack () {
      return ['Previsió Econòmica']
    },
  }  
}
</script>
