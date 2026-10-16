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
        <div class="segmented" role="group" aria-label="Període">
          <button
            v-for="p in presets"
            :key="p.id"
            type="button"
            :class="{ 'is-on': presetOn(p) }"
            :aria-pressed="presetOn(p) ? 'true' : 'false'"
            @click="setPreset(p)"
          >{{ p.label }}</button>
        </div>
        <b-checkbox v-model="filters.lastUpdated">Només hores modificades els últims 7 dies</b-checkbox>
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
    // quick periods, all ending at the end of the current month, quarter, half or year
    presets () {
      const now = moment()
      const span = (from, to) => ({ from: from.format('YYYY-MM-DD'), to: to.format('YYYY-MM-DD') })
      const half = now.month() < 6 ? 0 : 6
      return [
        { id: 'month', label: 'Aquest mes', ...span(now.clone().startOf('month'), now.clone().endOf('month')) },
        { id: 'quarter', label: 'Trimestre', ...span(now.clone().startOf('quarter'), now.clone().endOf('quarter')) },
        { id: 'half', label: 'Semestre', ...span(now.clone().month(half).startOf('month'), now.clone().month(half + 5).endOf('month')) },
        { id: 'year', label: 'Any', ...span(now.clone().startOf('year'), now.clone().endOf('year')) }
      ]
    },
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
    presetOn (p) {
      return !this.filters.lastUpdated && this.filters.date1 && this.filters.date2 &&
        moment(this.filters.date1).format('YYYY-MM-DD') === p.from && moment(this.filters.date2).format('YYYY-MM-DD') === p.to
    },
    setPreset (p) {
      this.filters.lastUpdated = false
      this.filters.date1 = moment(p.from).toDate()
      this.filters.date2 = moment(p.to).toDate()
    },
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
