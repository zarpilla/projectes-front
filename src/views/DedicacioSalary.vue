<template>
  <div v-if="!isLoading">
    <title-bar :title-stack="titleStack" subtitle="Nòmines i bestretes de cada persona: hores fetes, saldo i salari mes a mes." />
    <section class="section is-main-section">
      <form class="filter-bar" role="search" aria-label="Filtres" @submit.prevent>
        <b-autocomplete
          v-model="userNameSearch"
          class="filter-grow"
          placeholder="Persona"
          aria-label="Persona"
          icon="account"
          :keep-first="false"
          :open-on-focus="true"
          :data="filteredUsers"
          field="username"
          :clearable="true"
          @select="option => (filters.user = option ? option.id : null)"
        />
        <label class="filter-select">
          <span>Any</span>
          <b-select v-model="filters.year" required>
            <option v-for="(year, index) in years" :key="index" :value="year">{{ year.year }}</option>
          </b-select>
        </label>
        <!-- a month and no person: everyone's bestretes of that month (issues/347) -->
        <label class="filter-select">
          <span>Mes</span>
          <b-select v-model="filters.month" aria-label="Mes">
            <option :value="null">Tots</option>
            <option v-for="(name, index) in monthNames" :key="index" :value="index + 1">{{ name }}</option>
          </b-select>
        </label>
      </form>
      <div v-if="!filters.user && !filters.month" class="card empty-choice">
        <p><b>Tria una persona</b> per veure les seves nòmines i bestretes de l'any, o <b>un mes</b> per veure les de totes les persones.</p>
      </div>
      <dedication-salary-month
        v-if="!filters.user && filters.month"
        :year="filters.year ? filters.year.year : null"
        :month="filters.month"
      />
      <dedication-salary v-if="filters.user" :user="filters.user" :year="filters.year ? filters.year.year : null" />
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar.vue'
import DedicationSalary from '@/components/DedicationSalary.vue'
import DedicationSalaryMonth from '@/components/DedicationSalaryMonth.vue'
import { monthFromQuery, yearFromQuery } from '@/domain/monthPayrolls.js'
import service from '@/service/index'
import { findCurrentUser } from '@/domain/currentUser'
import { defaultYear } from '@/domain/years'
import { mapState } from 'pinia'
import { useMainStore } from '@/stores/main.js'

export default {
  name: 'DedicacioSalary',
  components: {
    TitleBar,
    DedicationSalary,
    DedicationSalaryMonth
  },
  data () {
    return {
      isLoading: false,
      filters: {
        user: null,
        year: null,
        month: null
      },
      monthNames: ['Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny', 'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre'],
      users: [],
      usersList: [],
      userNameSearch: '',
      years: []
    }
  },
  computed: {
    ...mapState(useMainStore, ['userName']),
    titleStack () {
      return ['Diners', 'Bestretes']
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
    // from Tresoreria's grouped payroll lines: «?any=2026&mes=3», for everyone
    const queryMonth = monthFromQuery(this.$route.query)
    const queryYear = yearFromQuery(this.$route.query)
    this.filters.month = queryMonth

    service({ requiresAuth: true, cached: true }).get('years?_sort=year:DESC').then((r) => {
      this.years = r.data
      this.filters.year = (queryYear && this.years.find(y => Number(y.year) === queryYear)) || defaultYear(this.years)
    })

    service({ requiresAuth: true, cached: true }).get('users').then((r) => {
      this.users = r.data.filter(u => !u.hidden)
      this.usersList = JSON.parse(JSON.stringify(r.data.filter(u => u.username !== 'app')))
      this.usersList.unshift({ id: 0, username: 'Totes' })
      const user = findCurrentUser(r.data)
      if (user && user.id && !queryMonth) {
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
<style scoped>
.empty-choice {
  padding: 2rem 1.5rem;
  text-align: center;
  color: var(--a-muted);
}
.empty-choice b {
  color: var(--a-fg);
}
</style>
