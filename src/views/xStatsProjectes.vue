<template>
  <div v-if="!isLoading">
    <title-bar :title-stack="titleStack" />
    <!-- <hero-bar>
      Dedicació
      <router-link slot="right" to="/" class="button">
        Dashboard
      </router-link>
    </hero-bar> -->
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
                @select="(option) => (filters.user = option ? option.id : null)"
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
                @select="
                  (option) => (filters.project = option ? option.id : null)
                "
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
                trap-focus
              >
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
                trap-focus
              >
              </b-datepicker>
            </b-field>
            <b-field label="Últimes">
              <b-checkbox v-model="filters.lastUpdated"> </b-checkbox>
            </b-field>
          </b-field>
        </form>
      </card-component>

      <div id="project-stats"></div>
      <pre>
      {{ pivotData }}
      </pre>
      <!-- <pre>
      {{ activities }}
      </pre> -->
      <dedication-widget
        :user="filters.user"
        :date1="filters.date1"
        :date2="filters.date2"
        :project="filters.project"
        :last="filters.lastUpdated"
      />
    </section>
  </div>
</template>

<script>
import mapValues from 'lodash/mapValues'
import TitleBar from '@/components/TitleBar'
import CardComponent from '@/components/CardComponent'
// import HeroBar from '@/components/HeroBar'
import DedicationWidget from '@/components/DedicationWidget'
import service from '@/service/index'
import moment from 'moment'
import configProject from '@/service/configStatsProject'
// import jQuery from 'jquery'

export default {
  name: 'xStatsProjectes',
  components: {
    // HeroBar,
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
      projectNameSearch: '',
      scopes: [],
      states: [],
      leaders: [],
      contacts: [],
      pivotData: []
    }
  },
  computed: {
    titleStack () {
      return ['Projectes', 'Dedicació']
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
  async mounted () {
    this.isLoading = true
    this.filters.date1 = moment().add(-1, 'month').toDate()
    this.filters.date2 = moment().toDate()
    service({ requiresAuth: true }).get('projects?project_state=1').then((r) => {
      this.projects = r.data
      this.projectsList = JSON.parse(JSON.stringify(r.data))
      this.projectsList.unshift({ id: 0, name: 'Tots' })
    })
    service({ requiresAuth: true }).get('users').then((r) => {
      this.users = r.data
      this.usersList = JSON.parse(JSON.stringify(r.data))
      this.usersList.unshift({ id: 0, username: 'Totes' })
    })

    this.scopes = (await service({ requiresAuth: true }).get('project-scopes')).data
    this.states = (await service({ requiresAuth: true }).get('project-states')).data
    this.leaders = (await service({ requiresAuth: true }).get('users')).data
    this.contacts = (await service({ requiresAuth: true }).get('contacts')).data

    // await this.addScript('/vendor/jquery/jquery.js')

    const interval = setInterval(async () => {
      if (window.jQuery) {
        clearInterval(interval)
        // await this.addScript('/vendor/jquery/jquery.js')
        await this.addScript('/vendor/kendo/kendo.all.min.js')
        await this.addStyle('/vendor/kendo/kendo.common.min.css')
        await this.addStyle('/vendor/kendo/kendo.custom.css')
        await this.addStyle('/vendor/kendo/custom.css')

        this.getActivities()
        this.isLoading = false
      }
    }, 100)

    // setInterval(async () => {
    //   console.log('kendoPivotGrid', kendoPivotGrid)
    // }, 300)
  },
  methods: {
    getActivities () {
      const from = moment(this.date1).format('YYYY-MM-DD')
      const to = moment(this.date2).format('YYYY-MM-DD')
      let query = `activities?_where[date_gte]=${from}&[date_lte]=${to}`
      // if (this.last) {
      //   query = `activities?_where[updated_at_gte]=${moment().add(-7, 'days').format('YYYY-MM-DD')}`
      // }
      if (this.user) {
        query = `${query}&[users_permissions_user.id]=${this.user}`
      }
      if (this.project) {
        query = `${query}&[project.id]=${this.project}`
      }
      service({ requiresAuth: true }).get(query).then((r) => {
        // console.log('r.data', r.data)
        const activities = r.data.map(a => {
          return {
            user: a.users_permissions_user ? a.users_permissions_user.username : '-',
            dedication_type: a.dedication_type ? a.dedication_type.name : '-',
            activity_type: a.activity_type ? a.activity_type.name : '-',
            project: a.project ? a.project.name : '-',
            project_state: a.project && a.project.project_state ? this.states.find(l => l.id === a.project.project_state).name : '-',
            project_leader: a.project && a.project.leader ? this.leaders.find(l => l.id === a.project.leader).username : '-',
            project_scope: a.project && a.project.project_scope ? this.scopes.find(s => s.id === a.project.project_scope).name : '-',
            project_client: a.project && a.project.client ? this.contacts.find(c => c.id === a.project.client).name : '-',
            date: a.date,
            total_estimated_hours: a.project ? a.project.total_estimated_hours : 0,
            hours: a.hours,
            balance: a.balance ? a.balance : 0,
            count: 1
          }
        })
        console.log('this.scopes', this.scopes)
        console.log('activities', activities)
        this.activities = r.data
        this.pivotData = Object.freeze(activities)
        configProject.dataSource.data = activities
        window.jQuery('#project-stats').kendoPivotGrid(configProject)
        this.isLoading = false
      })
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
    },
    async addScript (src) {
      return new Promise((resolve, reject) => {
        const head = document.head || document.getElementsByTagName('head')[0]
        const script = document.createElement('script')
        script.src = src
        script.addEventListener('load', resolve)
        script.addEventListener('error', (e) => reject(e))
        script.addEventListener('abort', (e) => reject(e))
        head.appendChild(script)
      })
    },
    async addStyle (src) {
      return new Promise((resolve, reject) => {
        const head = document.head || document.getElementsByTagName('head')[0]
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = src
        link.addEventListener('load', resolve)
        link.addEventListener('error', (e) => reject(e))
        link.addEventListener('abort', (e) => reject(e))
        head.appendChild(link)
      })
    }
  }
}
</script>
