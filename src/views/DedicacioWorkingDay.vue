<template>
  <div v-if="!isLoading">
    <title-bar :title-stack="titleStack" :subtitle="subtitle" />
    <section class="section is-main-section">      
      <dedication-working-day :key="1" @summary="summary = $event" />
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
      isLoading: false,
      summary: null
    }
  },
  computed: {
    ...mapState(useMainStore, ['userName']),
    titleStack () {
      return ['Persones']
    },
    subtitle () {
      const base = 'Jornada laboral, salari i cost hora per períodes'
      return this.summary
        ? `${base} · ${this.summary.people} persones, ${this.summary.active} amb jornada activa avui`
        : base
    }
  },
  mounted () {
    this.isLoading = false
  }
}
</script>
