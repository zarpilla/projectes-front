<template>
  <div v-if="!isLoading">
    <title-bar :title-stack="titleStack" :subtitle="subtitle" />
    <section class="section is-main-section">
      <form class="filter-bar" role="search" aria-label="Filtres" @submit.prevent>
        <label class="filter-select">
          <span>Persona</span>
          <b-autocomplete
            v-model="userNameSearch"
            placeholder="Tria una persona"
            :keep-first="false"
            :open-on-focus="true"
            :data="filteredUsers"
            field="username"
            :clearable="true"
            @select="option => (filters.user = option ? option.id : null)"
          />
        </label>
        <label class="filter-select">
          <span>Any</span>
          <b-select v-model="filters.year" aria-label="Any">
            <option v-for="(year, index) in years" :key="index" :value="year">{{ year.year }}</option>
          </b-select>
        </label>
      </form>
      <p v-if="!filters.user" class="notification is-info">Tria una persona per veure-ho.</p>
      <dedication-summary :user="filters.user" :year="filters.year ? filters.year.year : null" />
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar.vue'
import CardComponent from '@/components/CardComponent.vue'
import DedicationSummary from '@/components/DedicationSummary.vue'
import service from '@/service/index'
import { mapState } from 'pinia'
import { useMainStore } from '@/stores/main.js'

export default {
  name: 'DedicacioSaldo',
  components: {
    CardComponent,
    TitleBar,
    DedicationSummary
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
      years: []
    }
  },
  computed: {
    ...mapState(useMainStore, ['userName']),
    titleStack () {
      return ['Informes', 'Hores anuals']
    },
    subtitle () {
      return 'Resum de l\'any d\'una persona: jornada, hores fetes, festius i vacances, mes a mes.'
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
    }
  },
  mounted () {
    this.isLoading = true

    service({ requiresAuth: true, cached: true }).get('years?_sort=year:DESC').then((r) => {
      // console.log('r.data', r.data)
      this.years = r.data
      this.filters.year = this.years[0]
    })

    service({ requiresAuth: true, cached: true }).get('users').then((r) => {
      this.users = r.data.filter(u => !u.hidden)
      this.usersList = JSON.parse(JSON.stringify(r.data.filter(u => u.username !== 'app')))
      this.usersList.unshift({ id: 0, username: 'Totes' })
      const user = this.users.find(u => u.username.toLowerCase() === this.userName.toLowerCase())
      if (user && user.id) {
        this.userNameSearch = user.username
        this.filters.user = user.id
      }
    })

    this.isLoading = false
  },
  methods: {
  }
}
</script>
