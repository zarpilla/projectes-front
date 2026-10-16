<template>
  <div v-if="!isLoading">
    <title-bar :title-stack="titleStack" subtitle="On s'entreguen les comandes: botigues, restaurants, cooperatives de consum…" />
    <section class="section is-main-section">
      <contacts-table v-if="!isLoading" />
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar.vue'
import ContactsTable from '@/components/ContactsTable.vue'
import CardComponent from '@/components/CardComponent.vue'
import { mapState } from 'pinia'
import { useMainStore } from '@/stores/main.js'

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
      treasuryData: [],
      userContacts: false
    }
  },
  computed: {
    ...mapState(useMainStore, ['userName']),
    titleStack () {
      return [!this.userContacts ? 'Clientes' : 'Rutes i punts', ...(this.userContacts ? ['Punts d\'entrega'] : [])]
    }
  },
  mounted () {    
    // read router meta data    
    this.userContacts = this.$route.meta && this.$route.meta.userContacts ? true : false;
  },
}
</script>
