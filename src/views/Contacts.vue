<template>
  <div v-if="!isLoading">
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section">
      <contacts-table :year="filters.year" />
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar'
import ContactsTable from '@/components/ContactsTable'
import CardComponent from '@/components/CardComponent'
import service from '@/service/index'
import { mapState } from 'vuex'
import moment from 'moment'

export default {
  name: 'DedicacioSaldo',
  components: {
    CardComponent,
    TitleBar,
    ContactsTable
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
      return ['Contactes']
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
