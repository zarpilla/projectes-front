<template>
  <div>
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section">
      <vat-table />
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar.vue'
import VatTable from '@/components/VatTable.vue'
import { mapState } from 'pinia'
import { useMainStore } from '@/stores/main.js'

export default {
  name: 'VatView',
  components: {
    TitleBar,
    VatTable
  },
  data () {
    return {
      isLoading: true,
      filters: {
        user: null,
        year: null
      },
      users: [],
      usersList: [],
      userNameSearch: '',
      years: [],
      projects: [],
      treasury: [],
      treasuryData: []
    }
  },
  computed: {
    ...mapState(useMainStore, ['userName']),
    titleStack () {
      return ['IVA']
    }
  }  
}
</script>
