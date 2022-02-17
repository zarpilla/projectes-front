<template>
  <div v-if="!isLoading">
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section">      
      <dedication-working-day :key="1" />
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar'
import CardComponent from '@/components/CardComponent'
import DedicationWorkingDay from '@/components/DedicationWorkingDay'
import service from '@/service/index'
import { mapState } from 'vuex'

export default {
  name: 'DedicationWorkingDayView',
  components: {
    CardComponent,
    TitleBar,
    DedicationWorkingDay
  },
  data () {
    return {
      isLoading: false      
    }
  },
  computed: {
    ...mapState(['userName']),
    titleStack () {
      return ['Dedicació', 'Jornades']
    }
  },
  mounted () {
    this.isLoading = false
  }
}
</script>
