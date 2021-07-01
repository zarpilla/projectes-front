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
            <b-field label="Projecte">
              <b-autocomplete
                v-model="projectNameSearch"
                placeholder="Projecte"
                :keep-first="false"
                :open-on-focus="true"
                :data="filteredProjects"
                field="name"
                @select="option => (filters.project = option ? option.id : null)"
                :clearable="true"
              >
              </b-autocomplete>
            </b-field>
            <b-field label="Inici">
              <b-datepicker
                v-model="filters.date1"
                :show-week-number="false"
                :locale="'ca-ES'"
                :first-day-of-week="1"
                icon="calendar-today"
                :disabled="filters.lastUpdated"
                trap-focus>
              </b-datepicker>
            </b-field>
            <b-field label="Final">
              <b-datepicker
                v-model="filters.date2"
                :show-week-number="false"
                :locale="'ca-ES'"
                :first-day-of-week="1"
                icon="calendar-today"
                :disabled="filters.lastUpdated"
                trap-focus>
              </b-datepicker>
            </b-field>
            <b-field label="Últimes">
              <b-checkbox
                v-model="filters.lastUpdated">
              </b-checkbox>
            </b-field>
          </b-field>
        </form>
      </card-component>
      <dedication-widget :user="filters.user" :date1="filters.date1" :date2="filters.date2" :project="filters.project" :last="filters.lastUpdated" />
    </section>
  </div>
</template>

<script>
import mapValues from 'lodash/mapValues'
import TitleBar from '@/components/TitleBar'
import CardComponent from '@/components/CardComponent'
import DedicationWidget from '@/components/DedicationWidget'
import service from '@/service/index'
import moment from 'moment'
import { mapState } from 'vuex'

export default {
  name: 'DedicacioCharts',
  components: {
    CardComponent,
    TitleBar,
    DedicationWidget
  },
  data () {
    return {
      isModalActive: false,
      isLoading: false,
      filters: {
        date1: null,
        date2: null,
        user: null,
        project: null,
        lastUpdated: false
      },
      projects: [],
      projectsList: [],
      dedicationTypes: {},
      activityTypes: {},
      users: [],
      usersList: [],
      modalObjectName: '',
      userNameSearch: '',
      projectNameSearch: ''
    }
  },
  computed: {
    ...mapState(['userName']),
    titleStack () {
      return ['Projectes', 'Gràfiques']
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
  },
  mounted () {
    this.isLoading = true
    this.filters.date1 = moment().clone().startOf('month').toDate()
    this.filters.date2 = moment().clone().endOf('month').toDate()
    service({ requiresAuth: true }).get('projects?_limit=-1').then((r) => {
      this.projects = r.data.filter(p => p.project_state !== 2)
      this.projectsList = JSON.parse(JSON.stringify(r.data.filter(p => p.project_state !== 2)))
      this.projectsList.unshift({ id: 0, name: 'Tots' })
    })
    service({ requiresAuth: true }).get('dedication-types').then((r) => {
      for (var i in r.data) {
        this.dedicationTypes[r.data[i].id] = r.data[i].name
      }
      this.isLoading1 = false
    })
    service({ requiresAuth: true }).get('activity-types').then((r) => {
      for (var i in r.data) {
        this.activityTypes[r.data[i].id] = r.data[i].name
      }
      this.isLoading2 = false
    })
    service({ requiresAuth: true }).get('users').then((r) => {
      this.users = r.data.filter(u => u.username !== 'app')
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
    submit () {},
    submit2 () {},
    reset () {
      this.form = mapValues(this.form, (item) => {
        if (item && typeof item === 'object') {
          return []
        }
        return null
      })

      this.$buefy.snackbar.open({
        message: 'Reset successfully',
        queue: false
      })
    }
  }
}
</script>
