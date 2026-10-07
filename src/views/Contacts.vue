<template>
  <div v-if="!isLoading">
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section">
      <contacts-table v-if="!isLoading" />
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar.vue'
import ContactsTable from '@/components/ContactsTable.vue'
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
    ...mapState(useMainStore, ['userName']),
    titleStack () {
      return ['Contactes']
    }
  },
  mounted () {    
    // read router meta data    
  },
}
</script>
