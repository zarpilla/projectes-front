<template>
  <div v-if="!isLoading">
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section">
      <card-component>
        <form @submit.prevent="submit2">
          <b-field horizontal>
            <b-field label="Any">
              <b-select
                v-model="filters.year"
                required
              >
                <option
                  v-for="(year, index) in years"
                  :key="index"
                  :value="year"
                >
                  {{ year.year }}
                </option>
              </b-select>
            </b-field>
          </b-field>
        </form>
      </card-component>

      <quotes-table :year="filters.year" />
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar.vue'
import QuotesTable from '@/components/QuotesTable.vue'
import CardComponent from '@/components/CardComponent.vue'
import service from '@/service/index'
import { mapState } from 'pinia'
import { useMainStore } from '@/stores/main.js'
import moment from 'moment'

export default {
  name: 'DedicacioSaldo',
  components: {
    CardComponent,
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
      return ['Facturació', 'Ingressos']
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
