<template>
  <div v-if="!isLoading">
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section">
      <card-component title="Filtres">
        <form @submit.prevent="submit2">
          <b-field horizontal>
            <b-field label="Persona">
              <b-autocomplete
                v-model="userNameSearch"
                placeholder="Persona"
                :keep-first="false"
                :open-on-focus="true"
                :data="filteredUsers"
                field="username"
                @select="option => (filters.user = option ? option.id : null)"
                :clearable="true"
              >
              </b-autocomplete>
            </b-field>
            <b-field label="Període">
              <b-select
              class="mr-2"
                v-model="filters.year"
                required
              >
                <option
                  v-for="(year, index) in years"
                  :key="index"
                  :value="year"
                >
                  {{ year.year }}
                </option>
              </b-select>
            
              <b-select
                v-model="filters.month"
                required
              >
                <option
                  v-for="(month, index) in months"
                  :key="index"
                  :value="month"
                >
                  {{ month.name }}
                </option>
              </b-select>
            </b-field>
          </b-field>
        </form>
      </card-component>
      <jornada-diaria :months="months" :user="filters.user" :year="filters.year ? filters.year.year : null" :month="filters.month ? filters.month.month : null" />
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar'
import CardComponent from '@/components/CardComponent'
import JornadaDiaria from '@/components/JornadaDiaria'
import service from '@/service/index'
import { mapState } from 'vuex'
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
      filters: {
        user: null,
        year: null,
        month: null
      },
      users: [],
      usersList: [],
      userNameSearch: '',
      years: [],
      months: []
    }
  },
  computed: {
    ...mapState(['userName']),
    titleStack () {
      return ['Projectes', 'Registre Jornades']
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
      this.filters.year = this.years[0]
    })

    service({ requiresAuth: true, cached: true }).get('months?_sort=month:ASC').then((r) => {
      // console.log('r.data', r.data)
      this.months = r.data      
      this.filters.month = this.months.find(m => m.month_number === moment().format('MM'))
      console.log('this.filters.month', this.filters.month)
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
