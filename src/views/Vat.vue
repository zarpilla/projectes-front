<template>
  <div>
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section">
      <vat-table />
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar'
import VatTable from '@/components/VatTable'
import { mapState } from 'vuex'

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
    ...mapState(['userName']),
    titleStack () {
      return ['IVA']
    }
  }  
}
</script>
