<template>
  <div>
    <title-bar :title-stack="titleStack" subtitle="L'IVA pendent de saldar amb Hisenda: el ja executat, el previst als projectes i el detall per trimestre i per document." />
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
      return ['Diners', 'IVA']
    }
  }  
}
</script>
