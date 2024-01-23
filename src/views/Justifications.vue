<template>
  <div v-if="!isLoading">
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section">
      <card-component title="Filtres">
        <form @submit.prevent="submit2">
          <b-field horizontal>
            <b-field label="Any">
              <b-select
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
            </b-field>
          </b-field>
        </form>
      </card-component>
      <justification :project="filters.project" :year="filters.year ? filters.year.year : null" />
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar'
import CardComponent from '@/components/CardComponent'
import Justification from '@/components/Justification'
import service from '@/service/index'
import { mapState } from 'vuex'

export default {
  name: 'Justifications',
  components: {
    CardComponent,
    TitleBar,
    Justification
  },
  data () {
    return {
      isLoading: false,
      filters: {
        project: null,
        year: null
      },
      projects: [],
      usersList: [],
      projectSearch: '',
      years: []
    }
  },
  computed: {
    ...mapState(['userName']),
    titleStack () {
      return ['Justificacions de projectes subvencionables']
    },
    filteredProjects() {
      return this.projects.filter((option) => {
        return (
          option.name
            .toString()
            .toLowerCase()
            .indexOf(this.projectSearch.toLowerCase()) >= 0
        );
      });
    },
  },
  mounted () {
    this.isLoading = true

    service({ requiresAuth: true, cached: true }).get('years?_sort=year:DESC').then((r) => {
      // console.log('r.data', r.data)
      this.years = r.data
      this.filters.year = this.years[0]
    })

    service({ requiresAuth: true }).get('projects/basic?_sort=name&_limit=-1').then((r) => {
      // console.log('r.data', r.data)
      this.projects = r.data
    })

    service({ requiresAuth: true, cached: true }).get('users').then((r) => {
      this.users = r.data.filter(u => !u.hidden)
      // this.usersList = JSON.parse(JSON.stringify(r.data.filter(u => u.hidden !== true)))
      // this.usersList.unshift({ id: 0, username: 'Totes' })
      // const user = this.users.find(u => u.username.toLowerCase() === this.userName.toLowerCase())
      // if (user && user.id) {
      //   this.userNameSearch = user.username
      //   this.filters.user = user.id
      // }
    })

    this.isLoading = false
  },
  methods: {
  }
}
</script>
