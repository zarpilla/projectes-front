<template>
  <div v-if="!isLoading">
    <title-bar :title-stack="titleStack" :subtitle="subtitle">
      <b-button icon-left="file-pdf-box" :disabled="!filters.user" @click="$refs.log && $refs.log.generatePDF()">
        Descarrega PDF
      </b-button>
    </title-bar>
    <section class="section is-main-section">
      <form class="filter-bar" role="search" aria-label="Filtres" @submit.prevent>
        <label v-if="canPickPerson" class="filter-select filter-person">
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
        <div class="month-nav">
          <button type="button" class="button" :disabled="!canMove(-1)" aria-label="Període anterior" @click="move(-1)">
            <b-icon icon="chevron-left" />
          </button>
          <span class="month-nav-label">{{ periodLabel }}</span>
          <button type="button" class="button" :disabled="!canMove(1)" aria-label="Període següent" @click="move(1)">
            <b-icon icon="chevron-right" />
          </button>
        </div>
        <div class="segmented" role="group" aria-label="Abast">
          <button type="button" :class="{ 'is-on': !wholeYear }" @click="setWholeYear(false)">Mes</button>
          <button type="button" :class="{ 'is-on': wholeYear }" @click="setWholeYear(true)">Any sencer</button>
        </div>
      </form>
      <p v-if="!filters.user" class="notification is-info">Tria una persona per veure el seu registre.</p>
      <jornada-diaria
        ref="log"
        :months="months"
        :user="filters.user"
        :year="filters.year ? filters.year.year : null"
        :month="filters.month ? filters.month.month : null"
        @summary="summary = $event"
      />
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar.vue'
import CardComponent from '@/components/CardComponent.vue'
import JornadaDiaria from '@/components/JornadaDiaria.vue'
import service from '@/service/index'
import { findCurrentUser, currentUserId } from '@/domain/currentUser'
import { canPickPerson, storedPermissions } from '@/domain/routeAccess'
import { mapState } from 'pinia'
import { useMainStore } from '@/stores/main.js'
import moment from 'moment'
// import moment from 'moment'

export default {
  name: 'Jornada',
  components: {
    CardComponent,
    TitleBar,
    JornadaDiaria
  },
  data () {
    return {
      isLoading: false,
      canPickPerson: canPickPerson(storedPermissions()),
      filters: {
        user: null,
        year: null,
        month: null
      },
      users: [],
      usersList: [],
      userNameSearch: '',
      years: [],
      months: [],
      summary: null,
      lastMonth: null
    }
  },
  computed: {
    ...mapState(useMainStore, ['userName']),
    titleStack () {
      return ['Projectes', 'Registre de jornades']
    },
    wholeYear () {
      return !this.filters.month || this.filters.month.month === null
    },
    periodLabel () {
      if (!this.filters.year) return ''
      return this.wholeYear
        ? String(this.filters.year.year)
        : moment({ year: this.filters.year.year, month: this.filters.month.month - 1 }).format('MMMM YYYY')
    },
    subtitle () {
      const parts = []
      if (this.summary && this.summary.person) parts.push(this.summary.person)
      parts.push(this.periodLabel)
      if (this.summary) parts.push(`${this.summary.slots} ${this.summary.slots === 1 ? 'tram' : 'trams'} en ${this.summary.days} ${this.summary.days === 1 ? 'dia' : 'dies'}`)
      return parts.filter(Boolean).join(' · ')
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
      this.years = r.data      
      this.filters.year = this.years.find(y => y.year.toString() === moment().format('YYYY').toString()) || this.years[0]
    })

    service({ requiresAuth: true, cached: true }).get('months?_sort=month:ASC').then((r) => {
      this.months = [{ month: null, month_number: null, name: '-- Tots --' }, ...r.data]
      // Match on the integer `month` (what JornadaDiaria receives) rather than
      // the zero-padded `month_number` string, which must match exactly.
      this.filters.month = this.months.find(m => m.month !== null && Number(m.month) === moment().month() + 1)
    })

    service({ requiresAuth: true, cached: true }).get('users').then((r) => {
      this.users = r.data.filter(u => !u.hidden)
      this.usersList = JSON.parse(JSON.stringify(r.data.filter(u => u.username !== 'app')))
      this.usersList.unshift({ id: 0, username: 'Totes' })
      const user = findCurrentUser(r.data)
      if (user && user.id) {
        this.userNameSearch = user.username
        this.filters.user = user.id
      } else if (!this.canPickPerson) {
        this.filters.user = currentUserId()
      }
    })

    this.isLoading = false
  },
  methods: {
    monthObject (number) {
      return this.months.find(m => m.month !== null && Number(m.month) === number)
    },
    yearObject (year) {
      return this.years.find(y => Number(y.year) === year)
    },
    // previous / next month, or year with "Any sencer"
    target (step) {
      if (!this.filters.year) return null
      if (this.wholeYear) {
        const year = this.yearObject(Number(this.filters.year.year) + step)
        return year ? { year, month: this.filters.month } : null
      }
      const d = moment({ year: this.filters.year.year, month: this.filters.month.month - 1 }).add(step, 'month')
      const year = this.yearObject(d.year())
      const month = this.monthObject(d.month() + 1)
      return year && month ? { year, month } : null
    },
    canMove (step) {
      return !!this.target(step)
    },
    move (step) {
      const t = this.target(step)
      if (t) {
        this.filters.year = t.year
        this.filters.month = t.month
      }
    },
    setWholeYear (whole) {
      if (whole === this.wholeYear) return
      if (whole) {
        this.lastMonth = this.filters.month
        this.filters.month = this.months.find(m => m.month === null)
      } else {
        this.filters.month = this.lastMonth || this.monthObject(moment().month() + 1)
      }
    }
  }
}
</script>
<style scoped>
.filter-person {
  min-width: 18rem;
}
.filter-person :deep(.autocomplete) {
  flex: 1;
}
.filter-person :deep(.input) {
  border: 0;
  box-shadow: none;
  font-weight: 700;
}
.month-nav {
  display: inline-flex;
  align-items: center;
  gap: .5rem;
}
.month-nav-label {
  min-width: 8.5rem;
  text-align: center;
  font-weight: 800;
}
.month-nav-label:first-letter {
  text-transform: uppercase;
}
</style>
