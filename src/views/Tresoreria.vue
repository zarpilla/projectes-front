<template>
  <div v-if="!isLoading">
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section">

      <tresoreria-table />
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar'
import TresoreriaTable from '@/components/TresoreriaTable'
// import CardComponent from '@/components/CardComponent'
// import DedicationSaldo from '@/components/DedicationSaldo'
// import service from '@/service/index'
import { mapState } from 'vuex'
// import moment from 'moment'
// import sortBy from 'lodash/sortBy'

export default {
  name: 'DedicacioSaldo',
  components: {
    // CardComponent,
    TitleBar,
    TresoreriaTable
    // DedicationSaldo
  },
  data () {
    return {
      isLoading: false,
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
      return ['Facturació', 'Tresoreria']
    },
    filteredUsers () {
      return this.users.filter(option => {
        return (
          option.username
            .toString()
            .toLowerCase()
            .indexOf(this.userNameSearch.toLowerCase()) >= 0
        )
      })
    },
    filteredProjects () {
      return this.projects.filter(option => {
        return (
          option.name
            .toString()
            .toLowerCase()
            .indexOf(this.projectNameSearch.toLowerCase()) >= 0
        )
      })
    }
  }
}
</script>
