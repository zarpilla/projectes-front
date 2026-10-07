<template>
  <div v-if="!isLoading">
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section">      
      <dedication-working-day :key="1" />
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar.vue'
import CardComponent from '@/components/CardComponent.vue'
import DedicationWorkingDay from '@/components/DedicationWorkingDay.vue'
import service from '@/service/index'
import { mapState } from 'pinia'
import { useMainStore } from '@/stores/main.js'

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
    ...mapState(useMainStore, ['userName']),
    titleStack () {
      return ['Persones', 'Jornades']
    }
  },
  mounted () {
    this.isLoading = false
  }
}
</script>
