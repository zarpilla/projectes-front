<template>
  <div v-if="!isLoading">
    <title-bar :title-stack="titleStack" :subtitle="subtitle" />
    <section class="section is-main-section">
      <form class="filter-bar" role="search" aria-label="Filtres" @submit.prevent="submit2">
        <label class="filter-select">
          <span>Persona</span>
          <b-autocomplete
            v-model="userNameSearch"
            placeholder="Totes"
            :keep-first="false"
            :open-on-focus="true"
            :data="filteredUsers"
            field="username"
            :clearable="true"
            @select="option => (filters.user = option ? option.id : null)"
          />
        </label>
        <label class="filter-select">
          <span>Projecte</span>
          <b-autocomplete
            v-model="projectNameSearch"
            placeholder="Tots"
            :keep-first="false"
            :open-on-focus="true"
            :data="filteredProjects"
            field="name"
            :clearable="true"
            @select="option => (filters.project = option ? option.id : null)"
          />
        </label>
        <label class="filter-select">
          <span>Des de</span>
          <b-datepicker
            v-model="filters.date1"
            :show-week-number="false"
            :locale="'ca-ES'"
            :first-day-of-week="1"
            :disabled="filters.lastUpdated"
            :editable="true"
            trap-focus
          />
        </label>
        <label class="filter-select">
          <span>Fins a</span>
          <b-datepicker
            v-model="filters.date2"
            :show-week-number="false"
            :locale="'ca-ES'"
            :first-day-of-week="1"
            :disabled="filters.lastUpdated"
            :editable="true"
            trap-focus
          />
        </label>
        <b-checkbox v-model="filters.lastUpdated">Últimes</b-checkbox>
      </form>
      <dedication-widget :user="filters.user" :date1="filters.date1" :date2="filters.date2" :project="filters.project" :last="filters.lastUpdated" />
    </section>
  </div>
</template>

<script>
import mapValues from 'lodash/mapValues'
import TitleBar from '@/components/TitleBar.vue'
import CardComponent from '@/components/CardComponent.vue'
import DedicationWidget from '@/components/DedicationWidget.vue'
import service from '@/service/index'
import moment from 'moment'
import { mapState } from 'pinia'
import { useMainStore } from '@/stores/main.js'

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
    ...mapState(useMainStore, ['userName']),
    titleStack () {
      return ['Informes', 'Dedicació']
    },
    subtitle () {
      return 'On van les hores: per persona, projecte i tipus de dedicació en el període triat.'
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
    
    service({ requiresAuth: true, cached: true }).get('users').then((r) => {
      this.users = r.data.filter(u => !u.hidden)
      this.usersList = JSON.parse(JSON.stringify(r.data.filter(u => u.username !== 'app')))
      this.usersList.unshift({ id: 0, username: 'Totes' })
      const user = this.users.find(u => u.username.toLowerCase() === this.userName.toLowerCase())
      if (user && user.id) {
        this.userNameSearch = user.username
        this.filters.user = user.id
      }


      this.filters.date1 = moment().clone().startOf('month').toDate()
      this.filters.date2 = moment().clone().endOf('month').toDate()    
      service({ requiresAuth: true }).get('dedication-types').then((r) => {
        for (var i in r.data) {
          this.dedicationTypes[r.data[i].id] = r.data[i].name
        }
        this.isLoading1 = false
      })
      service({ requiresAuth: true }).get('activity-types/basic?_limit=-1').then((r) => {
        for (var i in r.data) {
          this.activityTypes[r.data[i].id] = r.data[i].name
        }
        this.isLoading2 = false
      })

      service({ requiresAuth: true }).get('projects/basic?_limit=-1').then((r) => {
        this.projects = r.data.filter(p => p.project_state !== 2)
        this.projectsList = JSON.parse(JSON.stringify(r.data.filter(p => p.project_state !== 2)))
        this.projectsList.unshift({ id: 0, name: 'Tots' })
      })
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
