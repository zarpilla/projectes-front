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
      <dedication-saldo :user="filters.user" :year="filters.year ? filters.year.year : null" />
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar.vue'
import CardComponent from '@/components/CardComponent.vue'
import DedicationSaldo from '@/components/DedicationSaldo.vue'
import service from '@/service/index'
import { findCurrentUser } from '@/domain/currentUser'
import { defaultYear } from '@/domain/years'
import { mapState } from 'pinia'
import { useMainStore } from '@/stores/main.js'
// import moment from 'moment'

export default {
  name: 'DedicacioSaldo',
  components: {
    CardComponent,
    TitleBar,
    DedicationSaldo
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
      return ['Informes', 'Saldo d\'hores']
    },
    subtitle () {
      return 'Hores fetes respecte a la jornada de cada dia, i el saldo acumulat de l\'any.'
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
      this.filters.year = defaultYear(this.years)
    })

    service({ requiresAuth: true, cached: true }).get('users').then((r) => {
      this.users = r.data.filter(u => !u.hidden)
      this.usersList = JSON.parse(JSON.stringify(r.data.filter(u => u.username !== 'app')))
      this.usersList.unshift({ id: 0, username: 'Totes' })
      const user = findCurrentUser(r.data)
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
