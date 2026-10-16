<template>
  <div v-if="!isLoading">
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section">
      <div class="filter-bar">
        <label class="filter-select">
          <span>Any</span>
          <b-select v-model="filters.year" required>
            <option v-for="(year, index) in years" :key="index" :value="year">{{ year.year }}</option>
          </b-select>
        </label>
      </div>
      <quotes-table :year="filters.year" />
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar.vue'
import QuotesTable from '@/components/QuotesTable.vue'
import service from '@/service/index'
import { mapState } from 'pinia'
import { useMainStore } from '@/stores/main.js'
import moment from 'moment'

export default {
  name: 'DedicacioSaldo',
  components: {
    TitleBar,
    QuotesTable
    // DedicationSaldo
  },
  data () {
    return {
      isLoading: false,
      filters: {
        year: null
      },
      years: [],
      treasury: [],
      treasuryData: []
    }
  },
  computed: {
    ...mapState(useMainStore, ['userName']),
    titleStack () {
      return ['Diners', 'Pressupostos']
    }
  },
  mounted () {
    this.isLoading = true
    service({ requiresAuth: true, cached: true }).get('years?_sort=year:DESC').then((r) => {
      this.years = r.data
      this.filters.year = this.years.find(y => y.year.toString() === moment().format('YYYY'))
      this.isLoading = false
    })
  }
}
</script>
