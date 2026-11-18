<template>
  <div v-if="!isLoading">
    <title-bar :title-stack="titleStack" subtitle="Nòmines i bestretes de cada persona: hores fetes, saldo i salari mes a mes." />
    <section class="section is-main-section">
      <form class="filter-bar" role="search" aria-label="Filtres" @submit.prevent>
        <!-- one person, or the sum of everyone (issues/449) -->
        <div class="segmented" role="group" aria-label="Vista">
          <button type="button" :class="{ 'is-on': !team }" @click="setTeam(false)">Individual</button>
          <button type="button" :class="{ 'is-on': team }" @click="setTeam(true)">Plantilla sencera</button>
        </div>
        <b-autocomplete
          v-if="!team"
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
          @select="selectUser"
        />
        <label class="filter-select">
          <span>Any</span>
          <b-select v-model="filters.year" required>
            <option v-for="(year, index) in years" :key="index" :value="year">{{ year.year }}</option>
          </b-select>
        </label>
        <label class="filter-select">
          <span>Mes</span>
          <b-select v-model="filters.month" aria-label="Mes">
            <option :value="null">Tots</option>
            <option v-for="(name, index) in monthNames" :key="index" :value="index + 1">{{ name }}</option>
          </b-select>
        </label>
      </form>
      <template v-if="team">
        <!-- a month: everyone's payrolls of that month (issues/347) -->
        <dedication-salary-month
          v-if="filters.month"
          :year="selectedYear"
          :month="filters.month"
        />
        <dedication-salary-team
          v-else
          :year="selectedYear"
          @month="month => (filters.month = month)"
        />
      </template>
      <template v-else>
        <div v-if="!filters.user" class="card empty-choice">
          <p><b>Tria una persona</b> per veure les seves nòmines i bestretes de l'any, o <b>Plantilla sencera</b> per veure les de totes les persones.</p>
        </div>
        <dedication-salary v-else :user="filters.user" :year="selectedYear" :month="filters.month" />
      </template>
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar.vue'
import DedicationSalary from '@/components/DedicationSalary.vue'
import DedicationSalaryMonth from '@/components/DedicationSalaryMonth.vue'
import DedicationSalaryTeam from '@/components/DedicationSalaryTeam.vue'
import { usersWithWorkingDay } from '@/domain/teamPayrolls.js'
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
    DedicationSalaryMonth,
    DedicationSalaryTeam
  },
  data () {
    return {
      isLoading: false,
      team: false,
      filters: {
        user: null,
        year: null,
        month: null
      },
      monthNames: ['Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny', 'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre'],
      allUsers: [],
      dedications: [],
      userNameSearch: '',
      years: []
    }
  },
  computed: {
    ...mapState(useMainStore, ['userName']),
    titleStack () {
      return ['Diners', 'Bestretes']
    },
    selectedYear () {
      return this.filters.year ? this.filters.year.year : null
    },
    // only the people with a working day in the year (issues/449)
    users () {
      return usersWithWorkingDay(this.allUsers, this.dedications, this.selectedYear)
    },
    // «Totes» first: the whole staff, as «Plantilla sencera»
    filteredUsers () {
      const search = (this.userNameSearch || '').toLowerCase()
      const matches = this.users.filter(option => option.username.toString().toLowerCase().indexOf(search) >= 0)
      return 'totes'.indexOf(search) >= 0 ? [{ id: 0, username: 'Totes' }, ...matches] : matches
    }
  },
  mounted () {
    this.isLoading = true
    // from Tresoreria's grouped payroll lines: «?any=2026&mes=3», for everyone
    const queryMonth = monthFromQuery(this.$route.query)
    const queryYear = yearFromQuery(this.$route.query)
    this.filters.month = queryMonth

    this.team = !!queryMonth

    // the years, the people and their working days: light requests, no hours,
    // whatever the number of people (issues/449)
    Promise.all([
      service({ requiresAuth: true, cached: true }).get('years?_sort=year:DESC'),
      service({ requiresAuth: true, cached: true }).get('users'),
      service({ requiresAuth: true }).get('daily-dedications?_limit=-1')
    ]).then(([years, users, dedications]) => {
      this.years = years.data
      this.filters.year = (queryYear && this.years.find(y => Number(y.year) === queryYear)) || defaultYear(this.years)
      this.allUsers = users.data
      this.dedications = dedications.data
      const user = findCurrentUser(users.data)
      if (!queryMonth && user && user.id && this.users.some(u => u.id === user.id)) {
        this.userNameSearch = user.username
        this.filters.user = user.id
      }
    })

    this.isLoading = false
  },
  methods: {
    setTeam (team) {
      this.team = team
    },
    selectUser (option) {
      if (option && option.id === 0) {
        // «Totes»: the whole staff
        this.$nextTick(() => { this.userNameSearch = '' })
        this.filters.user = null
        this.team = true
        return
      }
      this.filters.user = option ? option.id : null
    }
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
