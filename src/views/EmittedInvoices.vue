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

      <emitted-invoices-table :year="filters.year" />
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar'
import EmittedInvoicesTable from '@/components/EmittedInvoicesTable'
import CardComponent from '@/components/CardComponent'
// import DedicationSaldo from '@/components/DedicationSaldo'
import service from '@/service/index'
import { mapState } from 'vuex'
import moment from 'moment'

export default {
  name: 'DedicacioSaldo',
  components: {
    CardComponent,
    TitleBar,
    EmittedInvoicesTable
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
    ...mapState(['userName']),
    titleStack () {
      return ['Facturació', 'Factures emeses']
    }
  },
  mounted () {
    this.isLoading = true
    service({ requiresAuth: true }).get('years?_sort=year:DESC').then((r) => {
      this.years = r.data
      this.filters.year = this.years.find(y => y.year.toString() === moment().format('YYYY'))
      this.isLoading = false
    })
  }
}
</script>
